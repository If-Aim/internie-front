// src/pages/admin/desktop/jump/analysis/users.tsx
import React from "react";
import { ApiError, getJumpAdminStudents, getJumpAdminStudentCalendar, getJumpAdminEventDayDetail, type JumpAdminStudent, type JumpAdminStudentCalendarResponse, } from "../../../../../api/client"; 
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
                <img className="jump-users-dd-arrow" src="/chevron-right-6b.svg" alt="" />
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

    const [calendarLoading, setCalendarLoading] = React.useState<boolean>(false);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [calendar, setCalendar] = React.useState<JumpAdminStudentCalendarResponse | null>(null);

	const [selectedOrg, setSelectedOrg] = React.useState<string>(""); 
	const [open, setOpen] = React.useState<boolean>(false);
	const orgRef = React.useRef<HTMLDivElement | null>(null);

	const [rightView, setRightView] = React.useState<UsersRightView>("USER_DETAIL");
	const [navDir, setNavDir] = React.useState<NavDir>("forward");

	const [selectedYmd, setSelectedYmd] = React.useState<string>(""); // YYYY-MM-DD
	const [selectedEventDayId, setSelectedEventDayId] = React.useState<number | null>(null);
	const [qIndex, setQIndex] = React.useState<number>(0);
	const [qDir, /*setQDir*/] = React.useState<NavDir>("forward");
	
	const [eventDayCache, setEventDayCache] = React.useState<Record<number, any>>({});

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
		return byOrg.filter((u) => matchQuery(u, query));
	}, [students, selectedOrg, query]);

	React.useEffect(() => { // 필터 바깥쪽 클릭 시 닫힘
		if (!open) return;

		function onDocMouseDown(e: MouseEvent) {
			const el = orgRef.current;
			if (!el) return;

			if (e.target instanceof Node && !el.contains(e.target)) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [open]);

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
        return `${calendar.totalRecordedDays}건`;
    }, [selected, calendarLoading, calendarError, calendar]);

    const unrecordedCountText = "-"; // TODO: 백엔드 준비되면 연결
    const volunteerTimeText = "-"; // TODO: 백엔드 준비되면 연결

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

	/**
	 * 달력 관련 선언
	 */

	// 날짜 선택
	function handleSelectDay(ymd: string) {
		setSelectedYmd(ymd);
		setSelectedEventDayId(null);
		setQIndex(0);

		setNavDir("forward");
		setRightView("REPORT_DAY");
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

		setNavDir("forward");
		setRightView("REPORT_DETAIL");

		if (eventDayCache[eventDayId]) return;

		try {
			const detail = await getJumpAdminEventDayDetail(eventDayId);
			setEventDayCache((prev) => ({
				...prev,
				[eventDayId]: detail,
			}));
		} catch {
			setEventDayCache((prev) => ({
				...prev,
				[eventDayId]: null,
			}));
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
					<div className="jump-users-filter">
						<div ref={orgRef} className={`jump-users-org ${open ? "is-open" : ""}`}>
							<button type="button" className={`jump-users-org-trigger ${!selectedOrg ? "is-all" : ""}`} onClick={() => setOpen((prev) => !prev)} aria-label="organization filter" >
								<img className="jump-users-org-filter" src={selectedOrg ? "/mynaui_filter.svg" : "/mynaui_filter_6b.svg"} alt="" />
								<span className="jump-users-org-text">{selectedOrg || "전체"}</span>
								<img className="jump-users-org-arrow" src={selectedOrg ? "/chevron-right.svg" : "/chevron-right-6b.svg"} alt="" />
							</button>
							{open && (
								<div className="jump-users-org-menu">
									<button type="button" className="jump-users-org-item" onClick={() => { setSelectedOrg(""); setOpen(false); }} >
										전체
									</button>

									{orgOptions.map((org) => (
										<button key={org} type="button" className="jump-users-org-item" onClick={() => { setSelectedOrg(org); setOpen(false); }}>
											{org}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className={`jump-users-search ${!query.trim() ? "is-empty" : "is-typing"}`}>
						<img className="jump-users-search-icon" src={!query.trim() ? "/search-6b-01.svg" : "/search-00-01.svg"} alt="" />
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
					<img className="jump-users-back-btn-img" src="/chevron-left-6b.svg" alt="" />
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
							{normalizeText(selected.name) || "-"} 님
						</div>
						<button type="button" className="jump-users-trash" aria-label="delete">
							<img src="/trash-red-01.svg" alt="" />
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
			return (
				<div>
					<div>KPI 카드 2개</div>
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

	
	function renderReportDay(): React.ReactNode { // 선택한 날짜에 기록 갯수 및 기록명 표시
		if (!selectedYmd) {
			return <div>날짜를 선택해주세요.</div>;
		}

		const ids = getEventDayIdsByYmd(selectedYmd);

		return (
			<div>
				<div>{`${selectedYmd}에 ${ids.length}개의 기록이 있어요`}</div>

				<div>
					{ids.length === 0 ? (
						<div>해당 날짜의 기록이 없습니다.</div>
					) : (
						ids.map((id, idx) => (
							<button
								key={id}
								type="button"
								onClick={() => handleOpenRecord(id)}
							>
								{`기록명${idx + 1}`}
							</button>
						))
					)}
				</div>
			</div>
		);
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
		const qText = qs[qIndex] ?? "";

		const answerText = (d?.transcriptions ?? [])
			.map((t: any) => normalizeText(t.text))
			.filter(Boolean)
			.join("\n");

		const qKey = `q-${selectedEventDayId ?? "none"}-${qIndex}`; // 질문 전환 애니메이션용

		return (
			<div className="jump-report-detail">
				<div className="jump-report-detail-head">
					<button type="button" onClick={() => { setNavDir("back"); setRightView("REPORT_DAY"); }}>
						뒤로
					</button>
					<div>{`기록명`}</div>
				</div>

				<div className="jump-report-qwrap">
					<div key={qKey} className={`jump-report-qswap jump-report-qswap--${qDir}`}>
						<div className="jump-report-q">{`Q. ${qText || "-"}`}</div>
						<div className="jump-report-a">{answerText || "-"}</div>
					</div>
				</div>

				<div className="jump-report-nav">
					{!isFirst && (
						<button type="button" onClick={() => { setNavDir("back"); setQIndex((prev) => Math.max(0, prev - 1)); }} aria-label="prev question" >
							<img src="/chevron-left.svg" alt="" />
						</button>
					)}

					{!isLast && (
						<button type="button" onClick={() => { setNavDir("forward"); setQIndex((prev) => Math.min(qs.length - 1, prev + 1)); }} aria-label="next question" >
							<img src="/chevron-right.svg" alt="" />
						</button>
					)}
				</div>
			</div>
		);
	}

    return (
		<div className="jump-users-page">
			{/* HEAD */}
			<div className="jump-admin-section-head">
				<div className="jump-admin-section-title-wrap">
					<div className="jump-admin-section-title-badge">
						<img src="/jump-logo.png" alt="" />
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
					<div className="jump-users-detail-card">
						<div key={rightKey} className={`jump-users-swap jump-users-swap--${navDir}`}>
							{renderRightContent()}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}