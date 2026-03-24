// src/pages/admin/desktop/jump/analysis/users.tsx
import React from "react";
import { ApiError, getJumpAdminStudents, getJumpAdminStudentCalendar, getJumpAdminEventDayDetail, deleteJumpAdminStudent} from "../../../../../api/client"; 
import type { JumpAdminStudent, JumpAdminStudentCalendarResponse, JumpAdminEventDayDetailResponse } from "../../../../../api/client"; 
import "./users.css";

type UsersRightView = "USER_DETAIL" | "REPORT_HOME" | "REPORT_DAY" | "REPORT_DETAIL";
type NavDir = "forward" | "back";
type Option = { value: number; label: string };

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildYearOptions(centerYear: number, span: number) {
	const ys: number[] = [];
	for (let y = centerYear - span; y <= centerYear + span; y += 1) ys.push(y);
	return ys;
}

function useOutsideClose<T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    open: boolean,
    onClose: () => void
) {
    React.useEffect(() => {
        if (!open) return;

        function onMouseDown(e: MouseEvent) {
            const el = ref.current;
            if (!el) return;

            if (e.target instanceof Node && !el.contains(e.target)) onClose();
        }

        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [open, onClose, ref]);
}

function DropdownSelect(props: {
    value: number;
    options: Option[];
    onChange: (next: number) => void;
    ariaLabel: string;
}) {
    const { value, options, onChange, ariaLabel } = props;

    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    useOutsideClose(rootRef, open, () => setOpen(false));

    const selected = options.find((o) => o.value === value) ?? null;

    return (
        <div ref={rootRef} className={`jump-users-dd ${open ? "is-open" : ""}`}>
            <button
                type="button"
                className="jump-users-dd-trigger"
                onClick={() => setOpen((p) => !p)}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="jump-users-dd-text">
                    {selected ? selected.label : "-"}
                </span>
                <img className="jump-users-dd-arrow" src="/icons/chevron-right-6b.svg" alt="" />
            </button>

            {open && (
                <div className="jump-users-dd-menu" role="listbox" aria-label={ariaLabel}>
                    {options.map((o) => {
                        const isSelected = o.value === value;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                className={`jump-users-dd-item ${isSelected ? "is-selected" : ""}`}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function normalizeText(v: unknown): string {
    return String(v ?? "").trim();
}

function getOrgName(u: JumpAdminStudent): string {
    const org = u.jumpOrganization?.name;
    return normalizeText(org) || "-";
}

function getRecordFilterLabel(value: "ALL" | "RECORDED" | "NOT_RECORDED"): string {
    if (value === "RECORDED") return "기록";
    if (value === "NOT_RECORDED") return "미기록";
    return "전체";
}

function matchQuery(u: JumpAdminStudent, q: string): boolean {
    const query = q.trim().toLowerCase();
    if (!query) return true;

    const name = normalizeText(u.name).toLowerCase();
    const nick = normalizeText(u.nickname).toLowerCase();
    const org = getOrgName(u).toLowerCase();

    return name.includes(query) || nick.includes(query) || org.includes(query);
}

function getSchoolName(u: JumpAdminStudent): string {
    return normalizeText(u.school?.name) || "-";
}

export default function JumpAdminUsersPage(): React.ReactElement {

    const [students, setStudents] = React.useState<JumpAdminStudent[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const [query, setQuery] = React.useState<string>("");
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

	const [deleteOpen, setDeleteOpen] = React.useState<boolean>(false);
	const [deleteLoading, setDeleteLoading] = React.useState<boolean>(false);
	const [deleteError, setDeleteError] = React.useState<string | null>(null);

    const [calendarLoading, setCalendarLoading] = React.useState<boolean>(false);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [calendar, setCalendar] = React.useState<JumpAdminStudentCalendarResponse | null>(null);

	const [selectedOrg, setSelectedOrg] = React.useState<string>("");
	const [selectedRecordFilter, setSelectedRecordFilter] = React.useState<"ALL" | "RECORDED" | "NOT_RECORDED">("ALL");

	const [orgOpen, setOrgOpen] = React.useState<boolean>(false);
	const [recordOpen, setRecordOpen] = React.useState<boolean>(false);

	const orgRef = React.useRef<HTMLDivElement | null>(null);
	const recordRef = React.useRef<HTMLDivElement | null>(null);

	const [rightView, setRightView] = React.useState<UsersRightView>("USER_DETAIL");
	const [navDir, setNavDir] = React.useState<NavDir>("forward");

	const [selectedYmd, setSelectedYmd] = React.useState<string>(""); // YYYY-MM-DD
	const [selectedEventDayId, setSelectedEventDayId] = React.useState<number | null>(null);
	const [qIndex, setQIndex] = React.useState<number>(0);
	const [qDir, setQDir] = React.useState<NavDir>("forward");
	
	const [eventDayCache, setEventDayCache] = React.useState<Record<number, JumpAdminEventDayDetailResponse | null | undefined>>({});
	

	const selected = React.useMemo(() => {
        if (selectedId == null) return null;
        return students.find((u) => u.userId === selectedId) ?? null;
    }, [students, selectedId]);

	// 달력 렌더
	const listRef = React.useRef<HTMLDivElement | null>(null);
	const rowRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});

	const [/*stripAnim*/, setStripAnim] = React.useState<boolean>(true);

	const isReportMode = rightView !== "USER_DETAIL";

	const [calYear, setCalYear] = React.useState<number>(() => new Date().getFullYear());
	const [calMonth, setCalMonth] = React.useState<number>(() => new Date().getMonth() + 1);
	function pad2(n: number) {
		return String(n).padStart(2, "0");
	}

	function toYmd(y: number, m: number, d: number) {
		return `${y}-${pad2(m)}-${pad2(d)}`;
	}

	function daysInMonth(y: number, m: number) {
		return new Date(y, m, 0).getDate();
	}

	function firstDow(y: number, m: number) {
		return new Date(y, m - 1, 1).getDay();
	}

	function getTodayYmd(): string {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth() + 1;
		const d = now.getDate();
		return toYmd(y, m, d);
	}

	function isFutureYmd(ymd: string): boolean {
		if (!ymd) return false;
		return ymd > getTodayYmd(); 
	}

	type CalCell = {
		ymd: string;
		day: number;
		inMonth: boolean;
	};

	function buildMonthGrid(y: number, m: number): CalCell[] {
		const dim = daysInMonth(y, m);
		const startDow = firstDow(y, m);
		const cells: CalCell[] = [];

		for (let i = 0; i < startDow; i += 1) {
			cells.push({
				ymd: "",
				day: 0,
				inMonth: false,
			});
		}

		for (let d = 1; d <= dim; d += 1) {
			cells.push({
				ymd: toYmd(y, m, d),
				day: d,
				inMonth: true,
			});
		}

		while (cells.length % 7 !== 0) {
			cells.push({
				ymd: "",
				day: 0,
				inMonth: false,
			});
		}

		return cells;
	}

	// 기록 존재?
	function hasRecordOnDay(ymd: string): boolean {
		return getEventDayIdsByYmd(ymd).length > 0;
	}

	// TODO: 기록 필요한데 안한 날짜
	function isMissedRecordDay(_ymd: string): boolean {
		
		return false;
	}

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const list = await getJumpAdminStudents();
                if (!mounted) return;

                setStudents(Array.isArray(list) ? list : []);
                setSelectedId((prev) => {
                    if (prev == null) return null;
                    return list.some((u) => u.userId === prev) ? prev : null;
                });
            } catch (e) {
                if (!mounted) return;

                if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                    setErrorMsg("권한이 없거나 로그인 정보가 만료되었습니다.");
                } else {
                    setErrorMsg("참가자 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const orgOptions = React.useMemo(() => {
		const set = new Set<string>();
		for (const u of students) {
			const org = getOrgName(u);
			if (org && org !== "-") set.add(org);
		}
		return Array.from(set);
	}, [students]);

	const monthOptions: Option[] = React.useMemo(() => {
		return MONTH_LABELS.map((label, idx) => ({
			value: idx + 1,
			label,
		}));
	}, []);

	const yearOptions: Option[] = React.useMemo(() => {
		const nowY = new Date().getFullYear();
		const ys = buildYearOptions(nowY, 2);
		return ys.map((y) => ({
			value: y,
			label: String(y),
		}));
	}, []);

    const filtered = React.useMemo(() => {
		const byOrg = students.filter((u) => {
			if (!selectedOrg.trim()) return true;
			return getOrgName(u) === selectedOrg;
		});

		const byRecord = byOrg.filter((_u) => {
			if (selectedRecordFilter === "ALL") return true;

			// TODO:

			return true;
		});

		return byRecord.filter((u) => matchQuery(u, query));
	}, [students, selectedOrg, selectedRecordFilter, query]);

	React.useEffect(() => {// 필터 바깥쪽 클릭 시 닫힘
		function onDocMouseDown(e: MouseEvent) {
			if (!(e.target instanceof Node)) return;

			const orgEl = orgRef.current;
			const recordEl = recordRef.current;

			if (orgOpen && orgEl && !orgEl.contains(e.target)) {
				setOrgOpen(false);
			}

			if (recordOpen && recordEl && !recordEl.contains(e.target)) {
				setRecordOpen(false);
			}
		}

		if (!orgOpen && !recordOpen) return;

		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [orgOpen, recordOpen]);

    React.useEffect(() => { // calendar 로딩
		let mounted = true;

		if (!selected) {
			setCalendar(null);
			setCalendarError(null);
			setCalendarLoading(false);
			return () => {
				mounted = false;
			};
		}

		(async () => {
			try {
				setCalendarLoading(true);
				setCalendarError(null);

				const data = await getJumpAdminStudentCalendar(selected.userId, calYear, calMonth);
				if (!mounted) return;

				setCalendar(data);
			} catch {
				if (!mounted) return;
				setCalendar(null);
				setCalendarError("기록 수를 불러오지 못했습니다.");
			} finally {
				if (mounted) setCalendarLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [selected?.userId, calYear, calMonth]);

    const recordCountText = React.useMemo(() => {
        if (!selected) return "-";
        if (calendarLoading) return "불러오는 중...";
        if (calendarError) return "-";
        if (!calendar) return "-";
        return `${getTotalEventDayCount()}건`;
    }, [selected, calendarLoading, calendarError, calendar]);

    const unrecordedCountText = "-"; // TODO: 백엔드 준비되면 연결
    const volunteerTimeText = "-"; // TODO: 백엔드 준비되면 연결

	/* ======== 사용자별 기록 수 ========== */
	function startOfWeekMonday(date: Date) {
		const d = new Date(date);
		const jsDow = d.getDay(); 
		const mondayOffset = (jsDow + 6) % 7; 
		d.setDate(d.getDate() - mondayOffset);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function addDays(date: Date, days: number) {
		const d = new Date(date);
		d.setDate(d.getDate() + days);
		return d;
	}

	function getWeekYmdsFromToday(): string[] {
		const start = startOfWeekMonday(new Date());
		const ymds: string[] = [];
		for (let i = 0; i < 7; i += 1) {
			const d = addDays(start, i);
			ymds.push(toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()));
		}
		return ymds;
	}

	function getWeekRecordCount(): number {
		if (!calendar) return 0;

		const weekYmds = getWeekYmdsFromToday();
		let sum = 0;

		for (const ymd of weekYmds) {
			const ds = (calendar.dailyStatuses ?? []).find((it) => it.date === ymd);
			sum += (ds?.eventDayIds ?? []).length;
		}

		return sum;
	}

	function getTotalEventDayCount(): number {
		if (!calendar) return 0;

		return (calendar.dailyStatuses ?? []).reduce((sum, ds) => {
			return sum + (ds?.eventDayIds?.length ?? 0);
		}, 0);
	}
	/* ======== 사용자별 기록 수 end ========== */

	/* ======== 사용자별 기록 상세 조회 ========== */
	function getRecordTitleFromCache(eventDayId: number): string {
		const d = eventDayCache[eventDayId];
		if (!d) return "";
		return normalizeText(d.eventDayTitle) || normalizeText(d.eventTitle) || "";
	}

	async function prefetchEventDayDetails(eventDayIds: number[]) {
		const targets = eventDayIds.filter((id) => eventDayCache[id] === undefined);
		if (targets.length === 0) return;

		const results = await Promise.all(
			targets.map(async (id) => {
				try {
					const detail = await getJumpAdminEventDayDetail(id);
					return [id, detail] as const;
				} catch {
					return [id, null] as const;
				}
			})
		);

		setEventDayCache((prev) => {
			const next = { ...prev };
			for (const [id, value] of results) next[id] = value;
			return next;
		});
	}

	// 기록 보기버튼 클릭 시
    const handleClickRecordView = () => {
		if (!selected) return;

		const container = listRef.current;
		const row = rowRefs.current[selected.userId];

		let shouldAnimate = true;

		// 하단인지 판단
		if (container && row) {
			const c = container.getBoundingClientRect();
			const r = row.getBoundingClientRect();

			const threshold = 60; // 하단 기준

			const isNearBottom = r.bottom >= (c.bottom - threshold);
			shouldAnimate = isNearBottom;
		}

		setStripAnim(shouldAnimate);

		// 리프트모드로 전환
		setNavDir("forward");
		setRightView("REPORT_HOME");

		setSelectedYmd("");
		setSelectedEventDayId(null);
		setQIndex(0);
	};

	React.useEffect(() => {
		if (!selected) {
			setRightView("USER_DETAIL");
			setSelectedYmd("");
			setSelectedEventDayId(null);
			setQIndex(0);
			return;
		}

		setRightView("USER_DETAIL");
		setSelectedYmd("");
		setSelectedEventDayId(null);
		setQIndex(0);
	}, [selected?.userId]);
	
	/* ======== 사용자별 기록 상세 조회 end ========== */

	// 특정일에 기록 존재 여부
	function getEventDayIdsByYmd(ymd: string): number[] {
		if (!calendar || !ymd) return [];
		const ds = (calendar.dailyStatuses ?? []).find((it) => it.date === ymd);
		return ds?.eventDayIds ?? [];
	}


	// 보고서 화면에서 뒤로가기 버튼
	const handleBackToUserDetail = () => {
		setNavDir("back");
		setRightView("USER_DETAIL");

		setSelectedYmd("");
		setSelectedEventDayId(null);
		setQIndex(0);
	};

	// 학생 삭제
	async function handleConfirmDelete() {
		if (!selected) return;

		try {
			setDeleteLoading(true);
			setDeleteError(null);

			await deleteJumpAdminStudent(selected.userId);

			// UI 갱신: 목록에서 제거
			setStudents((prev) => prev.filter((u) => u.userId !== selected.userId));

			// 선택 해제 + 화면 초기화
			setSelectedId(null);
			setRightView("USER_DETAIL");
			setSelectedYmd("");
			setSelectedEventDayId(null);
			setQIndex(0);

			setDeleteOpen(false);
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.status === 401 || e.status === 403) {
					setDeleteError("권한이 없거나 로그인 정보가 만료되었습니다.");
				} else {
					setDeleteError("삭제에 실패했습니다.");
				}
			} else {
				setDeleteError("삭제에 실패했습니다.");
			}
		} finally {
			setDeleteLoading(false);
		}
	}

	/**
	 * 달력 관련 
	 */

	// 날짜 선택
	function handleSelectDay(ymd: string) {
		setSelectedYmd(ymd);
		setSelectedEventDayId(null);
		setQIndex(0);

		setNavDir("forward");
		setRightView("REPORT_DAY");

		const ids = getEventDayIdsByYmd(ymd);
		void prefetchEventDayDetails(ids);
	}

	// 날짜 표시
	function formatKoMonthDay(ymd: string): string {
		const s = (ymd ?? "").trim();
		if (!s) return "";
		const parts = s.split("-");
		if (parts.length < 3) return s;

		const m = Number(parts[1]);
		const d = Number(parts[2]);

		if (Number.isNaN(m) || Number.isNaN(d)) return s;

		return `${m}월 ${d}일`;
	}
	function renderCalendar(): React.ReactNode {
		if (!selected) {
			return (
				<div className="jump-users-calendar-empty">
					학생을 선택하면 달력이 표시됩니다.
				</div>
			);
		}

		const cells = buildMonthGrid(calYear, calMonth);

		return (
			<div className="jump-users-calendar">
				<div className="jump-users-calendar-head">
					<div className="jump-users-calendar-selects">
						<DropdownSelect
							value={calMonth}
							options={monthOptions}
							ariaLabel="month"
							onChange={(m) => {
								setSelectedYmd("");
								setSelectedEventDayId(null);
								setQIndex(0);
								setCalMonth(m);
							}}
						/>

						<DropdownSelect
							value={calYear}
							options={yearOptions}
							ariaLabel="year"
							onChange={(y) => {
								setSelectedYmd("");
								setSelectedEventDayId(null);
								setQIndex(0);
								setCalYear(y);
							}}
						/>
					</div>
				</div>

				{calendarLoading ? (
					<div className="jump-users-calendar-state">불러오는 중...</div>
				) : calendarError ? (
					<div className="jump-users-calendar-state">{calendarError}</div>
				) : (
					<>
						<div className="jump-users-calendar-week">
							{weekHeaders.map((w) => (
								<div key={w} className="jump-users-calendar-weekday">
									{w}
								</div>
							))}
						</div>

						<div className="jump-users-calendar-grid" role="grid">
							{cells.map((c, idx) => {
								if (!c.inMonth) {
									return <div key={`e-${idx}`} className="jump-users-calendar-cell is-empty" />;
								}

								const isSelectedDay = c.ymd === selectedYmd;
								const hasRecord = hasRecordOnDay(c.ymd);
								const missed = isMissedRecordDay(c.ymd);
								const isFuture = isFutureYmd(c.ymd);

								const className = [
									"jump-users-calendar-cell",
									isSelectedDay ? "is-selected" : "",
									hasRecord ? "has-record" : "",
									missed ? "is-missed" : "",
									isFuture ? "is-future" : "",
								]
									.filter(Boolean)
									.join(" ");

								return (
									<button
										key={c.ymd}
										type="button"
										className={className}
										onClick={() => {
											if (isFuture) return;
											handleSelectDay(c.ymd);
										}}
										role="gridcell"
										disabled={isFuture}
										aria-disabled={isFuture}
									>
										{c.day}
									</button>
								);
							})}
						</div>
					</>
				)}
			</div>
		);
	}

	// 기록명 클릭
	async function handleOpenRecord(eventDayId: number) {
		setSelectedEventDayId(eventDayId);
		setQIndex(0);
		setQDir("forward");

		setNavDir("forward");
		setRightView("REPORT_DETAIL");

		// 캐시 체크는 truthy가 아니라 undefined 여부로 해야 합니다.
		if (eventDayCache[eventDayId] !== undefined) return;

		try {
			const detail = await getJumpAdminEventDayDetail(eventDayId);
			setEventDayCache((prev) => ({ ...prev, [eventDayId]: detail }));
		} catch {
			setEventDayCache((prev) => ({ ...prev, [eventDayId]: null }));
		}
	}

	// 왼쪽 카드 분기
	function getSelectedBadgeNumber(): number | null {
		if (!selected) return null;

		const idx = filtered.findIndex((u) => u.userId === selected.userId);
		if (idx < 0) return null;

		return idx + 1;
	}
	function renderLeftListMode(): React.ReactNode {
		return (
			<div className="jump-users-left-frame">
				<div className="jump-users-filters">
					<div className="jump-users-filter-row">
						<div className="jump-users-filter">
							<div ref={orgRef} className={`jump-users-org ${orgOpen ? "is-open" : ""}`}>
								<button
									type="button"
									className={`jump-users-org-trigger ${!selectedOrg ? "is-all" : ""}`}
									onClick={() => {
										setOrgOpen((prev) => !prev);
										setRecordOpen(false);
									}}
									aria-label="organization filter"
								>
									<img className="jump-users-org-filter" src={selectedOrg ? "/icons/mynaui_filter.svg" : "/icons/mynaui_filter_6b.svg"} alt="" />
									<span className="jump-users-org-text">{selectedOrg || "전체"}</span>
									<img className="jump-users-org-arrow" src={selectedOrg ? "/icons/chevron-right.svg" : "/icons/chevron-right-6b.svg"} alt="" />
								</button>

								{orgOpen && (
									<div className="jump-users-org-menu">
										<button
											type="button"
											className={`jump-users-org-item ${selectedOrg === "" ? "is-selected" : ""}`}
											onClick={() => {
												setSelectedOrg("");
												setOrgOpen(false);
											}}
										>
											전체
										</button>

										{orgOptions.map((org) => (
											<button
												key={org}
												type="button"
												className={`jump-users-org-item ${selectedOrg === org ? "is-selected" : ""}`}
												onClick={() => {
													setSelectedOrg(org);
													setOrgOpen(false);
												}}
											>
												{org}
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						<div className="jump-users-filter">
							<div ref={recordRef} className={`jump-users-org ${recordOpen ? "is-open" : ""}`}>
								<button
									type="button"
									className={`jump-users-org-trigger ${selectedRecordFilter === "ALL" ? "is-all" : ""}`}
									onClick={() => {
										setRecordOpen((prev) => !prev);
										setOrgOpen(false);
									}}
									aria-label="record status filter"
								>
									<img className="jump-users-org-filter" src={selectedRecordFilter === "ALL" ? "/icons/fe_document-6b.svg" : "/icons/fe_document.svg"} alt="" />
									<span className="jump-users-org-text">{getRecordFilterLabel(selectedRecordFilter)}</span>
									<img className="jump-users-org-arrow" src={selectedRecordFilter === "ALL" ? "/icons/chevron-right-6b.svg" : "/icons/chevron-right.svg"} alt="" />
								</button>

								{recordOpen && (
									<div className="jump-users-org-menu">
										<button
											type="button"
											className={`jump-users-org-item ${selectedRecordFilter === "ALL" ? "is-selected" : ""}`}
											onClick={() => {
												setSelectedRecordFilter("ALL");
												setRecordOpen(false);
											}}
										>
											전체
										</button>

										<button
											type="button"
											className={`jump-users-org-item ${selectedRecordFilter === "RECORDED" ? "is-selected" : ""}`}
											onClick={() => {
												setSelectedRecordFilter("RECORDED");
												setRecordOpen(false);
											}}
										>
											기록
										</button>

										<button
											type="button"
											className={`jump-users-org-item ${selectedRecordFilter === "NOT_RECORDED" ? "is-selected" : ""}`}
											onClick={() => {
												setSelectedRecordFilter("NOT_RECORDED");
												setRecordOpen(false);
											}}
										>
											미기록
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className={`jump-users-search ${!query.trim() ? "is-empty" : "is-typing"}`}>
						<img className="jump-users-search-icon" src={!query.trim() ? "/icons/search-6b-01.svg" : "/icons/search-00-01.svg"} alt="" />
						<input className="jump-users-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" aria-label="search" />
					</div>
				</div>

				{loading ? (
					<div className="jump-users-state">불러오는 중...</div>
				) : errorMsg ? (
					<div className="jump-users-state">{errorMsg}</div>
				) : (
					<div ref={listRef} className="jump-admin-list" role="list">
						{filtered.map((u, idx) => {
							const isSelected = selectedId === u.userId;
							const displayName = normalizeText(u.name) || normalizeText(u.nickname) || "-";
							const orgName = getOrgName(u);

							return (
								<button
									key={u.userId}
									type="button"
									className={isSelected ? "jump-admin-list-item jump-admin-list-item--selected" : "jump-admin-list-item"}
									onClick={() => setSelectedId(u.userId)}
									role="listitem"
								>
									<div className="jump-admin-badge">{idx + 1}</div>
									<div className="jump-admin-user-name">{displayName}</div>
									<div className="jump-admin-user-org">{orgName}</div>
								</button>
							);
						})}
					</div>
				)}
			</div>
		);
	}
	function renderLeftReportMode(): React.ReactNode {
		return (
			<div className="jump-users-left-frame">
				<button type="button" className="jump-users-back-btn" onClick={handleBackToUserDetail}>
					<img className="jump-users-back-btn-img" src="/icons/chevron-left-6b.svg" alt="" />
					<span className="jump-users-back-btn-text">뒤로가기</span>
				</button>

				{selected ? (
					<div className="jump-users-selected-card">
						<div className="jump-users-selected-left">
							<div className="jump-admin-badge jump-users-selected-badge">
								{getSelectedBadgeNumber() ?? "-"}
							</div>
							<div className="jump-users-selected-name">
								{normalizeText(selected.name) || "-"}
							</div>
						</div>

						<div className="jump-users-selected-org">{getOrgName(selected)}</div>
					</div>
				) : null}

				<div className="jump-users-calendar-card">
					{renderCalendar()}
				</div>
			</div>
		);
	}

	// 오른쪽 카드 분기
	const rightKey = `${rightView}-${selectedYmd}-${selectedEventDayId ?? "none"}`;

	function renderRightContent(): React.ReactNode {
		if (rightView === "USER_DETAIL") {
			if (!selected) {
				return (
					<div className="jump-users-empty">
						<img src="/internie_mascot_normal.png" alt="" />
						<span className="jump-users-empty-title">학생을 선택해주세요!</span>
					</div>
				);
			}

			return (
				<div className="jump-users-detail">
					<div className="jump-users-detail-head">
						<div className="jump-users-detail-title">
							<span className="jump-users-name-strong">
								{normalizeText(selected.name) || "-"}
							</span>
							<span className="jump-users-name">님</span>
						</div>
						<button
							type="button"
							className="jump-users-trash"
							aria-label="delete"
							onClick={() => {
								setDeleteError(null);
								setDeleteOpen(true);
							}}
						>
							<img src="/icons/trash-red-01.svg" alt="" />
						</button>
					</div>

					<div className="jump-users-info">
						<div className="jump-users-info-row">
							<div className="jump-users-info-label">소속</div>
							<div className="jump-users-info-value">{getSchoolName(selected)}</div>
						</div>

						<div className="jump-users-info-row">
							<div className="jump-users-info-label">센터</div>
							<div className="jump-users-info-value">{getOrgName(selected)}</div>
						</div>

						<div className="jump-users-info-row">
							<div className="jump-users-info-label">봉사 일시</div>
							<div className="jump-users-info-value">{volunteerTimeText}</div>
						</div>

						<div className="jump-users-info-row">
							<div className="jump-users-info-label">기록 수</div>
							<div className="jump-users-info-value">{recordCountText}</div>
						</div>

						<div className="jump-users-info-row">
							<div className="jump-users-info-label">미기록 수</div>
							<div className="jump-users-info-value">{unrecordedCountText}</div>
						</div>
					</div>

					<button type="button" className="jump-users-record-btn" onClick={handleClickRecordView}>
						기록 보기
					</button>
				</div>
			);
		}

		if (rightView === "REPORT_HOME") {
			const totalCount =
				selected && calendar && !calendarLoading && !calendarError
					? getTotalEventDayCount()
					: 0;

			const weekCount =
				selected && calendar && !calendarLoading && !calendarError
					? getWeekRecordCount()
					: 0;

			return (
				<div className="jump-users-report-home">
					<button type="button" className="jump-users-kpi-card" disabled={!selected}>
						<div className="jump-users-kpi-label">전체 기록 수</div>
						<div className="jump-users-kpi-bottom">
							<div className="jump-users-kpi-value">
								{calendarLoading ? "-" : `${totalCount}건`}
							</div>
							<img className="jump-users-kpi-arrow" src="/icons/chevron-right.svg" alt="" />
						</div>
					</button>

					<button type="button" className="jump-users-kpi-card" disabled={!selected}>
						<div className="jump-users-kpi-label">주간 기록 수</div>
						<div className="jump-users-kpi-bottom">
							<div className="jump-users-kpi-value">
								{calendarLoading ? "-" : `${weekCount}건`}
							</div>
							<img className="jump-users-kpi-arrow" src="/icons/chevron-right.svg" alt="" />
						</div>
					</button>
				</div>
			);
		}

		if (rightView === "REPORT_DAY") {
			return renderReportDay();
		}

		if (rightView === "REPORT_DETAIL") {
			return renderReportDetail();
		}

		return null;
	}

	// 선택한 날짜에 기록 갯수 및 기록명 표시
	function renderReportDay(): React.ReactNode {
		if (!selectedYmd) {
			return null;
		}

		const ids = getEventDayIdsByYmd(selectedYmd);
		const md = formatKoMonthDay(selectedYmd);

		return (
			<div className="jump-users-report-day">
				<div className="jump-users-report-day-title">
					{md}에 <strong>{ids.length}개</strong>의 기록이 있어요
				</div>

				<div className="jump-users-report-day-list">
					{ids.map((id, idx) => {
						const title = getRecordTitleFromCache(id);
						const label = title || `기록명${idx + 1}`; // 로딩 전/실패 시 fallback

						return (
							<button key={id} type="button" className="jump-users-report-day-item" onClick={() => handleOpenRecord(id)} >
								<span className="jump-users-report-day-item-text">{label}</span>
								<img className="jump-users-report-day-item-arrow" src="/icons/chevron-right.svg" alt="" />
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	function replaceExperienceName(text: string, experienceName: string): string {
		if (!text) return "";

		return text.replace(/\(@experience_name\)/g, experienceName);
	}

	function renderReportDetail(): React.ReactNode { // 기록 상세 화면 렌더
		if (!selectedEventDayId) return <div>기록을 선택해주세요.</div>;

		const d = eventDayCache[selectedEventDayId];

		if (d === undefined) return <div>불러오는 중...</div>;
		if (d === null) return <div>기록 상세를 불러오지 못했습니다.</div>;

		const qs: string[] = d?.question?.questionList ?? [];
		const safeIndex = Math.min(Math.max(qIndex, 0), Math.max(qs.length - 1, 0));
		const isFirst = safeIndex <= 0;
		const isLast = safeIndex >= qs.length - 1;
		
		const experienceName =
			normalizeText(d.eventDayTitle) ||
			normalizeText(d.eventTitle) ||
			"";

		const rawQ = qs[safeIndex] ?? "";
		const qText = replaceExperienceName(rawQ, experienceName);

		const ts = (d?.transcriptions ?? []) as Array<{ text?: unknown }>;
		const rawAnswer = normalizeText(ts[safeIndex]?.text);
		const answerText = rawAnswer ? rawAnswer : "-";
		
		const qKey = `q-${selectedEventDayId ?? "none"}-${safeIndex}`;
		const recordTitle = getRecordTitleFromCache(selectedEventDayId) || "기록";

		return (
			<div className="jump-report-detail">
				<div className="jump-report-detail-head">
					<button
						type="button"
						className="jump-report-back"
						onClick={() => {
							setNavDir("back");
							setRightView("REPORT_DAY");
						}}
						aria-label="back"
					>
						<img src="/icons/jump-admin-back.svg" alt="" />
					</button>

					<div className="jump-report-detail-title">{recordTitle}</div>
				</div>

				<div className="jump-report-qwrap">
					<button
						type="button"
						onClick={() => {
							if (isFirst) return;
							setQDir("back");
							setQIndex((prev) => Math.max(0, prev - 1));
						}}
						className="jump-report-qwrap-prev-btn"
						aria-label="prev question"
						disabled={isFirst}
						aria-disabled={isFirst}
					>
						<img src="/icons/chevron-left.svg" alt="" />
					</button>

					<div key={qKey} className={`jump-report-qswap jump-report-qswap--${qDir}`}>
						<div className="jump-report-q">{`Q. ${qText || "-"}`}</div>
						<div className="jump-report-a">{answerText || "-"}</div>
					</div>

					<button
						type="button"
						onClick={() => {
							if (isLast) return;
							setQDir("forward");
							setQIndex((prev) => Math.min(qs.length - 1, prev + 1));
						}}
						className="jump-report-qwrap-next-btn"
						aria-label="next question"
						disabled={isLast}
						aria-disabled={isLast}
					>
						<img src="/icons/chevron-right.svg" alt="" />
					</button>
				</div>
			</div>
		);
	}

    return (
		<div className="jump-users-page">
			{/* 학생 삭제 모달 */}
			{deleteOpen && (
				<div className="jump-users-modal-dim" role="dialog" aria-modal="true">
					<div className="jump-users-modal">
						<div className="jump-users-modal-title">학생을 삭제하시겠습니까?</div>
						<div className="jump-users-modal-desc">
							삭제 후에는 복구할 수 없습니다.
						</div>

						{deleteError && (
							<div className="jump-users-modal-error">{deleteError}</div>
						)}

						<div className="jump-users-modal-actions">
							<button
								type="button"
								className="jump-users-modal-btn is-cancel"
								onClick={() => {
									if (deleteLoading) return;
									setDeleteOpen(false);
								}}
								disabled={deleteLoading}
							>
								아니오
							</button>

							<button
								type="button"
								className="jump-users-modal-btn is-danger"
								onClick={handleConfirmDelete}
								disabled={deleteLoading}
							>
								{deleteLoading ? "삭제 중..." : "예"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* HEAD */}
			<div className="jump-admin-section-head">
				<div className="jump-admin-section-title-wrap">
					<div className="jump-admin-section-title-badge">
						<img src="/logos/jump-logo.png" alt="" />
					</div>
					<div className="jump-admin-section-title">2026 상생지락 ALTogether</div>
				</div>
			</div>

			{/* GRID */}
			<div className="jump-admin-grid">
				{/* LEFT CARD */}
				<section className="jump-users-left-card">
					<div key={isReportMode ? "report" : "list"} className="jump-users-left-swap">
						{isReportMode ? renderLeftReportMode() : renderLeftListMode()}
					</div>
				</section>

				{/* RIGHT CARD */}
				<section className="jump-users-right-card">
					<div className={`jump-users-detail-card jump-users-detail-card--${rightView}`}>
						<div key={rightKey} className={`jump-users-swap jump-users-swap--${navDir}`}>
							{renderRightContent()}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}