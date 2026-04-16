// src/pages/admin/desktop/default/record/reports.tsx
// 보고서 화면(탭)
import React from "react";
import { ApiError, getAdminUsers, getAdminUserCalendar, getAdminEventDayDetail, deleteAdminUserRecord, checkIsCaptain, getAdminUserRecordCount, grantAdminRole, revokeAdminRole } from "../../../../../api/client";
import type { AdminUser, AdminUserCalendarResponse, AdminEventDayDetailResponse, } from "../../../../../api/client";
import { replaceExperienceName } from "../../../../../utils/josa";
import "./reports.css";

type UsersRightView = "USER_DETAIL" | "REPORT_HOME" | "REPORT_DAY" | "REPORT_DETAIL";
type NavDir = "forward" | "back";
type RecordFilter = "ALL" | "RECORDED" | "NOT_RECORDED";
type Option = { value: number; label: string };
type AdminRoleOption = "" | "ROLE_ADMIN" | "ROLE_JUMP_ADMIN" | "ROLE_KAKAO_ADMIN";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeText(v: unknown): string {
    return String(v ?? "").trim();
}

function getDisplayName(user: AdminUser): string {
    return normalizeText(user.name) || normalizeText((user as { nickname?: unknown }).nickname) || "-";
}

function getSchoolName(user: AdminUser): string {
    return normalizeText(user.school?.name) || "-";
}

function normalizeRoleSet(user: AdminUser): string[] {
    const raw = (user as { roleSet?: unknown; roles?: unknown }).roleSet ?? (user as { roles?: unknown }).roles;

    if (raw instanceof Set) {
        return Array.from(raw).map((v) => normalizeText(v)).filter(Boolean);
    }

    if (Array.isArray(raw)) {
        return raw.map((v) => normalizeText(v)).filter(Boolean);
    }

    if (typeof raw === "string") {
        return raw.split(",").map((v) => normalizeText(v)).filter(Boolean);
    }

    return [];
}

function hasRole(user: AdminUser, role: string): boolean {
    return normalizeRoleSet(user).includes(role);
}

function formatRoleChip(role: string): string {
    if (role === "ROLE_ADMIN") return "인터니 관리자";
    if (role === "ROLE_JUMP_ADMIN") return "JUMP 관리자";
    if (role === "ROLE_KAKAO_ADMIN") return "소셜벤처창업 관리자";
    if (role === "ROLE_JUMP_STUDENT") return "JUMP 상생지락";
    if (role === "ROLE_KAKAO_STUDENT") return "소셜벤처창업";
    if (role === "ROLE_ESG_STUDENT") return "용산";
    if (role === "ROLE_STUDENT") return "학생";
    return role.replace(/^ROLE_/, "");
}

function getAdminRoleChips(user: AdminUser): AdminRoleOption[] {
    return normalizeRoleSet(user).filter((role): role is AdminRoleOption => {
        return role === "ROLE_ADMIN" || role === "ROLE_JUMP_ADMIN" || role === "ROLE_KAKAO_ADMIN";
    });
}

function getStudentRoleChips(user: AdminUser): string[] {
    return normalizeRoleSet(user).filter((role) => {
        return role === "ROLE_JUMP_STUDENT" || role === "ROLE_KAKAO_STUDENT" || role === "ROLE_ESG_STUDENT";
    });
}

function getAdminRoleLabel(role: AdminRoleOption): string {
    if (role === "ROLE_ADMIN") return "인터니 관리자";
    if (role === "ROLE_JUMP_ADMIN") return "JUMP 관리자";
    if (role === "ROLE_KAKAO_ADMIN") return "소셜벤처창업 관리자";
    return "관리자가 아님";
}

function getRecordFilterLabel(value: RecordFilter): string {
    if (value === "RECORDED") return "기록";
    if (value === "NOT_RECORDED") return "미기록";
    return "전체";
}

function buildYearOptions(centerYear: number, span: number): number[] {
	const years: number[] = [];
	for (let y = centerYear - span; y <= centerYear + span; y += 1) years.push(y);
	return years;
}

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number): string {
    return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function firstDow(year: number, month: number): number {
    return new Date(year, month - 1, 1).getDay();
}

function getTodayYmd(): string {
    const now = new Date();
    return toYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isFutureYmd(ymd: string): boolean {
    if (!ymd) return false;
    return ymd > getTodayYmd();
}

type CalCell = { ymd: string; day: number; inMonth: boolean; };

function buildMonthGrid(year: number, month: number): CalCell[] {
    const dim = daysInMonth(year, month);
    const startDow = firstDow(year, month);
    const cells: CalCell[] = [];

    for (let i = 0; i < startDow; i += 1) {
        cells.push({ ymd: "", day: 0, inMonth: false });
    }

    for (let d = 1; d <= dim; d += 1) {
        cells.push({
            ymd: toYmd(year, month, d),
            day: d,
            inMonth: true,
        });
    }

    while (cells.length % 7 !== 0) {
        cells.push({ ymd: "", day: 0, inMonth: false });
    }

    return cells;
}

function formatKoMonthDay(ymd: string): string {
    const parts = normalizeText(ymd).split("-");
    if (parts.length < 3) return ymd;

    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (Number.isNaN(month) || Number.isNaN(day)) return ymd;
    return `${month}월 ${day}일`;
}

function matchQuery(user: AdminUser, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const name = getDisplayName(user).toLowerCase();
    const school = getSchoolName(user).toLowerCase();
    const roles = normalizeRoleSet(user).map((role) => formatRoleLabel(role).toLowerCase());

    return name.includes(q) || school.includes(q) || roles.some((role) => role.includes(q));
}

function startOfWeekMonday(date: Date): Date {
    const next = new Date(date);
    const day = next.getDay();
    const mondayOffset = (day + 6) % 7;
    next.setDate(next.getDate() - mondayOffset);
    next.setHours(0, 0, 0, 0);
    return next;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function getWeekYmdsFromToday(): string[] {
    const start = startOfWeekMonday(new Date());
    const result: string[] = [];

    for (let i = 0; i < 7; i += 1) {
        const date = addDays(start, i);
        result.push(toYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    return result;
}

function formatRoleLabel(role: string): string {
    const value = normalizeText(role);
    if (!value) return "-";

    return value
        .replace(/^ROLE_/, "")
        .split("_")
        .filter(Boolean)
        .join(" ");
}

function getPrimaryRoleLabel(user: AdminUser): string {
    const roles = normalizeRoleSet(user);
    if (roles.length === 0) return "-";
    return formatRoleLabel(roles[0]);
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
}): React.ReactElement {
    const { value, options, onChange, ariaLabel } = props;

    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    useOutsideClose(rootRef, open, () => setOpen(false));

    const selected = options.find((item) => item.value === value) ?? null;

    return (
        <div ref={rootRef} className={`admin-report-dd ${open ? "is-open" : ""}`}>
            <button
                type="button"
                className="admin-report-dd-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="admin-report-dd-text">{selected ? selected.label : "-"}</span>
                <img className="admin-report-dd-arrow" src="/icons/chevron-right-6b.svg" alt="" />
            </button>

            {open && (
                <div className="admin-report-dd-menu" role="listbox" aria-label={ariaLabel}>
                    {options.map((item) => {
                        const isSelected = item.value === value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                className={`admin-report-dd-item ${isSelected ? "is-selected" : ""}`}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onChange(item.value);
                                    setOpen(false);
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function AdminReportsPage(): React.ReactElement {
    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const [query, setQuery] = React.useState<string>("");
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const [isCaptain, setIsCaptain] = React.useState<boolean>(false);

    const [calendarLoading, setCalendarLoading] = React.useState<boolean>(false);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [calendar, setCalendar] = React.useState<AdminUserCalendarResponse | null>(null);
    const [userCalCache, setUserCalCache] = React.useState<Record<string, AdminUserCalendarResponse>>({});

    const [totalRecordCountMap, setTotalRecordCountMap] = React.useState<Record<number, number>>({});
    const [totalRecordCountLoading, setTotalRecordCountLoading] = React.useState<boolean>(false);
    const [totalRecordCountError, setTotalRecordCountError] = React.useState<string | null>(null);

    const [selectedRecordFilter, setSelectedRecordFilter] = React.useState<RecordFilter>("ALL");
	const [roleFilter, setRoleFilter] = React.useState<string>("");
	
	const [recordOpen, setRecordOpen] = React.useState<boolean>(false);
	const [roleFilterOpen, setRoleFilterOpen] = React.useState<boolean>(false);
	const [adminRoleOpen, setAdminRoleOpen] = React.useState<boolean>(false);

	const recordRef = React.useRef<HTMLDivElement | null>(null);
	const roleFilterRef = React.useRef<HTMLDivElement | null>(null);
	const adminRoleRef = React.useRef<HTMLDivElement | null>(null);

    const [rightView, setRightView] = React.useState<UsersRightView>("USER_DETAIL");
    const [navDir, setNavDir] = React.useState<NavDir>("forward");

    const [selectedYmd, setSelectedYmd] = React.useState<string>("");
    const [selectedEventDayId, setSelectedEventDayId] = React.useState<number | null>(null);
    const [qIndex, setQIndex] = React.useState<number>(0);
    const [qDir, setQDir] = React.useState<NavDir>("forward");

    const [deleteLoadingId, setDeleteLoadingId] = React.useState<number | null>(null);
    const [eventDayCache, setEventDayCache] = React.useState<Record<number, AdminEventDayDetailResponse | null | undefined>>({});

    const [calYear, setCalYear] = React.useState<number>(() => new Date().getFullYear());
    const [calMonth, setCalMonth] = React.useState<number>(() => new Date().getMonth() + 1);

	const [roleConfirmOpen, setRoleConfirmOpen] = React.useState<boolean>(false);
	const [roleSubmitting, setRoleSubmitting] = React.useState<boolean>(false);
	const [roleConfirmMode, setRoleConfirmMode] = React.useState<"grant" | "revoke">("grant");
    const [pendingAdminRole, setPendingAdminRole] = React.useState<AdminRoleOption>("");
    const [revokingAdminRole, setRevokingAdminRole] = React.useState<AdminRoleOption>("");
	const [adminRoleError, setAdminRoleError] = React.useState<string | null>(null);

	const selected = React.useMemo(() => {
		if (selectedId == null) return null;
		return users.find((user) => user.userId === selectedId) ?? null;
	}, [users, selectedId]);

	const selectedTotalRecordCount = selected ? totalRecordCountMap[selected.userId] : undefined;
	const monthOptions: Option[] = React.useMemo(() => {
		return MONTH_LABELS.map((label, idx) => ({
			value: idx + 1,
			label,
		}));
	}, []);

	const yearOptions: Option[] = React.useMemo(() => {
		return buildYearOptions(new Date().getFullYear(), 2).map((year) => ({
			value: year,
			label: String(year),
		}));
	}, []);

	const roleFilterOptions = React.useMemo(() => {
		const set = new Set<string>();

		for (const user of users) {
			for (const role of normalizeRoleSet(user)) {
				if (role === "ROLE_STUDENT" || role === "ROLE_JUMP_STUDENT"  || role === "ROLE_KAKAO_STUDENT" || role === "ROLE_ESG_STUDENT" || role === "ROLE_ADMIN" || role === "ROLE_JUMP_ADMIN" || role === "ROLE_KAKAO_ADMIN" ) {
					set.add(role);
				}
			}
		}

		return Array.from(set);
	}, [users]);

	const filtered = React.useMemo(() => {
		const byRole = users.filter((user) => {
			if (!roleFilter) return true;
			return hasRole(user, roleFilter);
		});

		const byRecord = byRole.filter((user) => {
			if (selectedRecordFilter === "ALL") return true;

			const count = totalRecordCountMap[user.userId] ?? 0;
			const hasAnyRecord = count > 0;

			if (selectedRecordFilter === "RECORDED") return hasAnyRecord;
			if (selectedRecordFilter === "NOT_RECORDED") return !hasAnyRecord;
			return true;
		});

		return byRecord.filter((user) => matchQuery(user, query));
	}, [users, roleFilter, selectedRecordFilter, totalRecordCountMap, query]);

	function handleSelectAdminRole(nextRole: AdminRoleOption) {
        if (!selected) return;
        if (!nextRole) return;

        if (hasRole(selected, nextRole)) {
            setAdminRoleOpen(false);
            return;
        }

        setPendingAdminRole(nextRole);
        setRoleConfirmMode("grant");
        setRoleConfirmOpen(true);
        setAdminRoleOpen(false);
        setAdminRoleError(null);
    }

    function handleClickRevokeAdminRole(role: AdminRoleOption) {
        if (!selected) return;

        setRevokingAdminRole(role);
        setRoleConfirmMode("revoke");
        setRoleConfirmOpen(true);
        setAdminRoleOpen(false);
        setAdminRoleError(null);
    }

	async function handleConfirmAdminRole() {
        if (!selected) return;

        try {
            setRoleSubmitting(true);
            setAdminRoleError(null);

            let updatedUser = selected;

            if (roleConfirmMode === "revoke") {
                if (revokingAdminRole) {
                    updatedUser = await revokeAdminRole(selected.userId, { role: revokingAdminRole });
                }
            } else {
                const nextRole = pendingAdminRole;

                if (nextRole && !hasRole(updatedUser, nextRole)) {
                    updatedUser = await grantAdminRole(selected.userId, { role: nextRole });
                }
            }

            setUsers((prev) =>
                prev.map((user) => {
                    if (user.userId !== selected.userId) return user;
                    return updatedUser;
                })
            );

            setRoleConfirmOpen(false);
            setPendingAdminRole("");
            setRevokingAdminRole("");
        } catch (e) {
            setAdminRoleError("관리자 역할 변경에 실패했습니다.");
        } finally {
            setRoleSubmitting(false);
        }
    }

	React.useEffect(() => { // Captain 여부 로드
		let mounted = true;

		(async () => {
			try {
				const captain = await checkIsCaptain();
				if (!mounted) return;
				setIsCaptain(captain);
			} catch (e) {
				console.error(e);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const list = await getAdminUsers();
                if (!mounted) return;

                setUsers(Array.isArray(list) ? list : []);
                setSelectedId((prev) => {
                    if (prev == null) return list[0]?.userId ?? null;
                    return list.some((user) => user.userId === prev) ? prev : list[0]?.userId ?? null;
                });
            } catch (e) {
                if (!mounted) return;

                if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                    setErrorMsg("관리자 권한이 필요합니다.");
                } else {
                    setErrorMsg("사용자 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (users.length === 0) {
            setUserCalCache({});
            return;
        }

        let mounted = true;

        (async () => {
            const nextCache: Record<string, AdminUserCalendarResponse> = { ...userCalCache };

            try {
                const tasks = users.map(async (user) => {
                    const key = `${user.userId}-${calYear}-${calMonth}`;
                    if (nextCache[key]) return;

                    try {
                        const res = await getAdminUserCalendar(user.userId, calYear, calMonth);
                        nextCache[key] = res;
                    } catch {
                        nextCache[key] = {
                            year: calYear,
                            month: calMonth,
                            totalRecordedDays: 0,
                            dailyStatuses: [],
                        };
                    }
                });

                await Promise.all(tasks);

                if (!mounted) return;
                setUserCalCache(nextCache);
            } finally {
                // no-op
            }
        })();

        return () => {
            mounted = false;
        };
    }, [users, calYear, calMonth]);

    React.useEffect(() => {
        let mounted = true;

        if (!selected) {
            setCalendar(null);
            setCalendarError(null);
            setCalendarLoading(false);
            return () => {
                mounted = false;
            };
        }

        const cacheKey = `${selected.userId}-${calYear}-${calMonth}`;
        const cached = userCalCache[cacheKey];

        if (cached) {
            setCalendar(cached);
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

                const data = await getAdminUserCalendar(selected.userId, calYear, calMonth);
                if (!mounted) return;

                setCalendar(data);
                setUserCalCache((prev) => ({
                    ...prev,
                    [cacheKey]: data,
                }));
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
    }, [selected?.userId, calYear, calMonth, userCalCache]);

    React.useEffect(() => {
        if (users.length === 0) return;

        let mounted = true;

        (async () => {
            try {
                setTotalRecordCountLoading(true);

                const results = await Promise.all(
                    users.map(async (user) => {
                        try {
                            const res = await getAdminUserRecordCount(user.userId);
                            return [user.userId, res.totalRecordCount ?? 0] as const;
                        } catch {
                            return [user.userId, 0] as const;
                        }
                    })
                );

                if (!mounted) return;

                const map: Record<number, number> = {};
                for (const [id, count] of results) map[id] = count;
                setTotalRecordCountMap(map);
            } finally {
                if (mounted) setTotalRecordCountLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [users]);

    React.useEffect(() => {
        if (!selected) {
            setTotalRecordCountError(null);
            setTotalRecordCountLoading(false);
            return;
        }

        const cached = totalRecordCountMap[selected.userId];
        if (cached !== undefined) {
            setTotalRecordCountError(null);
            setTotalRecordCountLoading(false);
            return;
        }

        let mounted = true;

        (async () => {
            try {
                setTotalRecordCountLoading(true);
                setTotalRecordCountError(null);

                const res = await getAdminUserRecordCount(selected.userId);
                if (!mounted) return;

                setTotalRecordCountMap((prev) => ({
                    ...prev,
                    [selected.userId]: res.totalRecordCount ?? 0,
                }));
            } catch (e) {
                if (!mounted) return;

                setTotalRecordCountError("전체 기록 수를 불러오지 못했습니다.");
                if (!(e instanceof ApiError)) console.error(e);
            } finally {
                if (mounted) setTotalRecordCountLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [selected?.userId, totalRecordCountMap]);

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

	React.useEffect(() => { // 바깥 클릭 닫힘 처리 
		function onDocMouseDown(e: MouseEvent) {
			if (!(e.target instanceof Node)) return;

			if (recordOpen && recordRef.current && !recordRef.current.contains(e.target)) {
				setRecordOpen(false);
			}

			if (roleFilterOpen && roleFilterRef.current && !roleFilterRef.current.contains(e.target)) {
				setRoleFilterOpen(false);
			}

			if (adminRoleOpen && adminRoleRef.current && !adminRoleRef.current.contains(e.target)) {
				setAdminRoleOpen(false);
			}
		}

		if (!recordOpen && !roleFilterOpen && !adminRoleOpen) return;

		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [recordOpen, roleFilterOpen, adminRoleOpen]);

    function getEventDayIdsByYmd(ymd: string): number[] {
        if (!calendar || !ymd) return [];
        const found = (calendar.dailyStatuses ?? []).find((item) => item.date === ymd);
        return found?.eventDayIds ?? [];
    }

    function hasRecordOnDay(ymd: string): boolean {
        return getEventDayIdsByYmd(ymd).length > 0;
    }

    function getWeekRecordCount(): number {
        if (!calendar) return 0;

        const weekYmds = getWeekYmdsFromToday();
        let sum = 0;

        for (const ymd of weekYmds) {
            const found = (calendar.dailyStatuses ?? []).find((item) => item.date === ymd);
            sum += (found?.eventDayIds ?? []).length;
        }

        return sum;
    }

    function getRecordTitleFromCache(eventDayId: number): string {
        const detail = eventDayCache[eventDayId];
        if (!detail) return "";
        return normalizeText(detail.eventDayTitle) || normalizeText(detail.eventTitle) || "";
    }

    async function prefetchEventDayDetails(eventDayIds: number[]) {
        const targets = eventDayIds.filter((id) => eventDayCache[id] === undefined);
        if (targets.length === 0) return;

        const results = await Promise.all(
            targets.map(async (id) => {
                try {
                    const detail = await getAdminEventDayDetail(id);
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

    function handleClickRecordView() {
        if (!selected) return;

        setNavDir("forward");
        setRightView("REPORT_HOME");
        setSelectedYmd("");
        setSelectedEventDayId(null);
        setQIndex(0);
    }

    function handleBackToUserDetail() {
        setNavDir("back");
        setRightView("USER_DETAIL");
        setSelectedYmd("");
        setSelectedEventDayId(null);
        setQIndex(0);
    }

    function handleSelectDay(ymd: string) {
        setSelectedYmd(ymd);
        setSelectedEventDayId(null);
        setQIndex(0);

        setNavDir("forward");
        setRightView("REPORT_DAY");

        const ids = getEventDayIdsByYmd(ymd);
        void prefetchEventDayDetails(ids);
    }

    async function handleOpenRecord(eventDayId: number) {
        setSelectedEventDayId(eventDayId);
        setQIndex(0);
        setQDir("forward");

        setNavDir("forward");
        setRightView("REPORT_DETAIL");

        if (eventDayCache[eventDayId] !== undefined) return;

        try {
            const detail = await getAdminEventDayDetail(eventDayId);
            setEventDayCache((prev) => ({ ...prev, [eventDayId]: detail }));
        } catch {
            setEventDayCache((prev) => ({ ...prev, [eventDayId]: null }));
        }
    }

    async function handleDeleteRecord(eventDayId: number) {
        if (!selected) return;
        if (!isCaptain) return;

        const ok = window.confirm("이 기록을 삭제하시겠습니까?");
        if (!ok) return;

        setDeleteLoadingId(eventDayId);

        try {
            await deleteAdminUserRecord(selected.userId, eventDayId);

            const refreshedCalendar = await getAdminUserCalendar(selected.userId, calYear, calMonth);
            setCalendar(refreshedCalendar);
            setUserCalCache((prev) => ({
                ...prev,
                [`${selected.userId}-${calYear}-${calMonth}`]: refreshedCalendar,
            }));

            const countRes = await getAdminUserRecordCount(selected.userId);
            setTotalRecordCountMap((prev) => ({
                ...prev,
                [selected.userId]: countRes.totalRecordCount ?? 0,
            }));

            const ids = (refreshedCalendar.dailyStatuses ?? []).find((d) => d.date === selectedYmd)?.eventDayIds ?? [];

            if (ids.length === 0) {
                setSelectedEventDayId(null);
                setQIndex(0);
                setRightView("REPORT_DAY");
            }

            await prefetchEventDayDetails(ids);
        } catch (e) {
            console.error(e);

            if (e instanceof ApiError && e.status === 403) {
                alert("CAPTAIN 권한이 필요합니다.");
            } else {
                alert("기록 삭제에 실패했습니다.");
            }
        } finally {
            setDeleteLoadingId(null);
        }
    }


    const recordCountText = React.useMemo(() => {
        if (!selected) return "-";
        if (selectedTotalRecordCount !== undefined) return `${selectedTotalRecordCount}건`;
        if (totalRecordCountError) return "-";
        if (totalRecordCountLoading) return "불러오는 중...";
        return "-";
    }, [selected, selectedTotalRecordCount, totalRecordCountError, totalRecordCountLoading]);

	function renderCalendar(): React.ReactNode {
		if (!selected) {
			return (
				<div className="admin-report-calendar-empty">
					사용자를 선택하면 달력이 표시됩니다.
				</div>
			);
		}

		const cells = buildMonthGrid(calYear, calMonth);

		return (
			<div className="admin-report-calendar">
				<div className="admin-report-calendar-head">
					<div className="admin-report-calendar-selects">
						<DropdownSelect
							value={calMonth}
							options={monthOptions}
							ariaLabel="month"
							onChange={(month) => {
								setSelectedYmd("");
								setSelectedEventDayId(null);
								setQIndex(0);
								setCalMonth(month);
							}}
						/>

						<DropdownSelect
							value={calYear}
							options={yearOptions}
							ariaLabel="year"
							onChange={(year) => {
								setSelectedYmd("");
								setSelectedEventDayId(null);
								setQIndex(0);
								setCalYear(year);
							}}
						/>
					</div>
				</div>

				{calendarLoading ? (
					<div className="admin-report-calendar-state">불러오는 중...</div>
				) : calendarError ? (
					<div className="admin-report-calendar-state">{calendarError}</div>
				) : (
					<>
						<div className="admin-report-calendar-week">
							{WEEK_HEADERS.map((item) => (
								<div key={item} className="admin-report-calendar-weekday">
									{item}
								</div>
							))}
						</div>

						<div className="admin-report-calendar-grid" role="grid">
							{cells.map((cell, idx) => {
								if (!cell.inMonth) {
									return (
										<div
											key={`e-${idx}`}
											className="admin-report-calendar-cell is-empty"
										/>
									);
								}

								const isSelectedDay = cell.ymd === selectedYmd;
								const hasRecord = hasRecordOnDay(cell.ymd);
								const isFuture = isFutureYmd(cell.ymd);

								const className = [
									"admin-report-calendar-cell",
									isSelectedDay ? "is-selected" : "",
									hasRecord ? "has-record" : "",
									isFuture ? "is-future" : "",
								].filter(Boolean).join(" ");

								return (
									<button
										key={cell.ymd}
										type="button"
										className={className}
										onClick={() => {
											if (isFuture) return;
											handleSelectDay(cell.ymd);
										}}
										role="gridcell"
										disabled={isFuture}
										aria-disabled={isFuture}
									>
										{cell.day}
									</button>
								);
							})}
						</div>
					</>
				)}
			</div>
		);
	}

    function renderLeftListMode(): React.ReactNode {
        return (
			
            <div className="admin-report-left-frame">
                <div className="admin-report-filters">
                    <div className="admin-report-filter-row">
                        <div className="admin-report-filter">
                            <div ref={roleFilterRef} className={`admin-report-filter-box ${roleFilterOpen ? "is-open" : ""}`}>
								<button
									type="button"
									className={`admin-report-filter-trigger ${!roleFilter ? "is-all" : ""}`}
									onClick={() => {
										setRoleFilterOpen((prev) => !prev);
										setRecordOpen(false);
									}}
									aria-label="role filter"
								>
									<img className="admin-report-filter-icon" src={!roleFilter ? "/icons/mynaui_filter_6b.svg" : "/icons/mynaui_filter.svg"} alt="" />
									<span className="admin-report-filter-text">{roleFilter ? formatRoleChip(roleFilter) : "전체"}</span>
									<img className="admin-report-filter-arrow" src={!roleFilter ? "/icons/chevron-right-6b.svg" : "/icons/chevron-right.svg"} alt="" />
								</button>

								{roleFilterOpen && (
									<div className="admin-report-filter-menu">
										<button
											type="button"
											className={`admin-report-filter-item ${roleFilter === "" ? "is-selected" : ""}`}
											onClick={() => {
												setRoleFilter("");
												setRoleFilterOpen(false);
											}}
										>
											전체
										</button>

										{roleFilterOptions.map((role) => (
											<button
												key={role}
												type="button"
												className={`admin-report-filter-item ${roleFilter === role ? "is-selected" : ""}`}
												onClick={() => {
													setRoleFilter(role);
													setRoleFilterOpen(false);
												}}
											>
												{formatRoleChip(role)}
											</button>
										))}
									</div>
								)}
							</div>
                        </div>

                        <div className="admin-report-filter">
                            <div ref={recordRef} className={`admin-report-filter-box ${recordOpen ? "is-open" : ""}`}>
                                <button
                                    type="button"
                                    className={`admin-report-filter-trigger ${selectedRecordFilter === "ALL" ? "is-all" : ""}`}
                                    onClick={() => {
                                        setRecordOpen((prev) => !prev);
                                        setRoleFilterOpen(false);
                                    }}
                                    aria-label="record status filter"
                                >
                                    <img className="admin-report-filter-icon" src={selectedRecordFilter === "ALL" ? "/icons/fe_document-6b.svg" : "/icons/fe_document.svg"} alt="" />
                                    <span className="admin-report-filter-text">{getRecordFilterLabel(selectedRecordFilter)}</span>
                                    <img className="admin-report-filter-arrow" src={selectedRecordFilter === "ALL" ? "/icons/chevron-right-6b.svg" : "/icons/chevron-right.svg"} alt="" />
                                </button>

                                {recordOpen && (
                                    <div className="admin-report-filter-menu">
                                        <button
                                            type="button"
                                            className={`admin-report-filter-item ${selectedRecordFilter === "ALL" ? "is-selected" : ""}`}
                                            onClick={() => {
                                                setSelectedRecordFilter("ALL");
                                                setRecordOpen(false);
                                            }}
                                        >
                                            전체
                                        </button>

                                        <button
                                            type="button"
                                            className={`admin-report-filter-item ${selectedRecordFilter === "RECORDED" ? "is-selected" : ""}`}
                                            onClick={() => {
                                                setSelectedRecordFilter("RECORDED");
                                                setRecordOpen(false);
                                            }}
                                        >
                                            기록
                                        </button>

                                        <button
                                            type="button"
                                            className={`admin-report-filter-item ${selectedRecordFilter === "NOT_RECORDED" ? "is-selected" : ""}`}
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

                    <div className={`admin-report-search ${!query.trim() ? "is-empty" : "is-typing"}`}>
                        <img className="admin-report-search-icon" src={!query.trim() ? "/icons/search-6b-01.svg" : "/icons/search-00-01.svg"} alt="" />
                        <input
                            className="admin-report-search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="검색"
                            aria-label="search"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="admin-report-state">불러오는 중...</div>
                ) : errorMsg ? (
                    <div className="admin-report-state">{errorMsg}</div>
                ) : (
                    <div className="admin-report-list" role="list">
                        {filtered.map((user, idx) => {
							const isSelected = user.userId === selectedId;
							const chips = normalizeRoleSet(user).filter((role) => {
                                return role === "ROLE_ADMIN" || role === "ROLE_JUMP_STUDENT" || role === "ROLE_KAKAO_STUDENT" || role === "ROLE_ESG_STUDENT" || role === "ROLE_JUMP_ADMIN" || role === "ROLE_KAKAO_ADMIN";
                            });

							return (
								<button
									key={user.userId}
									type="button"
									className={isSelected ? "admin-report-list-item admin-report-list-item--selected" : "admin-report-list-item"}
									onClick={() => setSelectedId(user.userId)}
								>
									<span className="admin-report-list-badge">{idx + 1}</span>
									<span className="admin-report-list-name">{getDisplayName(user)}</span>

									<span className="admin-report-list-chips">
										{chips.map((role) => (
											<span
												key={role}
												className={[
                                                    "admin-report-chip",
                                                    role === "ROLE_ADMIN" || role === "ROLE_JUMP_ADMIN" || role === "ROLE_KAKAO_ADMIN" ? "is-admin" : "is-student",
                                                    role === "ROLE_JUMP_ADMIN" || role === "ROLE_JUMP_STUDENT" ? "is-jump" : "",
                                                    role === "ROLE_KAKAO_ADMIN" || role === "ROLE_KAKAO_STUDENT" ? "is-kakao" : "",
                                                    role === "ROLE_ADMIN" ? "is-default-admin" : "",
                                                ].filter(Boolean).join(" ")}
											>
												{formatRoleChip(role)}
											</span>
										))}
									</span>
								</button>
							);
						})}
                    </div>
                )}
            </div>
        );
    }

    function getSelectedBadgeNumber(): number | null {
        if (!selected) return null;
        const idx = filtered.findIndex((user) => user.userId === selected.userId);
        if (idx < 0) return null;
        return idx + 1;
    }

    function renderLeftReportMode(): React.ReactNode {
        return (
            <div className="admin-report-left-frame">
                <button type="button" className="admin-report-back-btn" onClick={handleBackToUserDetail}>
                    <img className="admin-report-back-btn-img" src="/icons/chevron-left-6b.svg" alt="" />
                    <span className="admin-report-back-btn-text">뒤로가기</span>
                </button>

                {selected ? (
                    <div className="admin-report-selected-card">
                        <div className="admin-report-selected-left">
                            <div className="admin-report-list-badge admin-report-selected-badge">
                                {getSelectedBadgeNumber() ?? "-"}
                            </div>
                            <div className="admin-report-selected-name">
                                {getDisplayName(selected)}
                            </div>
                        </div>

                        <div className="admin-report-selected-role">
                            {getPrimaryRoleLabel(selected)}
                        </div>
                    </div>
                ) : null}

                <div className="admin-report-calendar-card">
                    {renderCalendar()}
                </div>
            </div>
        );
    }

    function renderReportDay(): React.ReactNode {
        if (!selectedYmd) return null;

        const ids = getEventDayIdsByYmd(selectedYmd);
        const monthDay = formatKoMonthDay(selectedYmd);

        return (
            <div className="admin-report-day">
                <div className="admin-report-day-title">
                    {monthDay}에 <strong>{ids.length}개</strong>의 기록이 있어요
                </div>

                <div className="admin-report-day-list">
                    {ids.map((id, idx) => {
                        const title = getRecordTitleFromCache(id);
                        const label = title || `기록명${idx + 1}`;

                        return (
                            <button
                                key={id}
                                type="button"
                                className="admin-report-day-item"
                                onClick={() => handleOpenRecord(id)}
                            >
                                <span className="admin-report-day-item-text">{label}</span>
                                <img className="admin-report-day-item-arrow" src="/icons/chevron-right.svg" alt="" />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderReportDetail(): React.ReactNode {
        if (!selectedEventDayId) return <div>기록을 선택해주세요.</div>;

        const detail = eventDayCache[selectedEventDayId];

        if (detail === undefined) return <div>불러오는 중...</div>;
        if (detail === null) return <div>기록 상세를 불러오지 못했습니다.</div>;

        const questions: string[] = detail.question?.questionList ?? [];
        const safeIndex = Math.min(Math.max(qIndex, 0), Math.max(questions.length - 1, 0));
        const isFirst = safeIndex <= 0;
        const isLast = safeIndex >= questions.length - 1;

        const experienceName =
            normalizeText(detail.eventDayTitle) ||
            normalizeText(detail.eventTitle) ||
            "";

        const rawQuestion = questions[safeIndex] ?? "";
        const questionText = replaceExperienceName(rawQuestion, experienceName);

        const transcriptions = (detail.transcriptions ?? []) as Array<{ text?: unknown }>;
        const answerText = normalizeText(transcriptions[safeIndex]?.text) || "-";

        const questionKey = `q-${selectedEventDayId}-${safeIndex}`;
        const recordTitle = getRecordTitleFromCache(selectedEventDayId) || "기록";

        return (
            <div className="admin-report-qdetail">
                <div className="admin-report-qdetail-head">
                    <button
                        type="button"
                        className="admin-report-back"
                        onClick={() => {
                            setNavDir("back");
                            setRightView("REPORT_DAY");
                        }}
                        aria-label="back"
                    >
                        <img src="/icons/jump-admin-back.svg" alt="" />
                    </button>

                    <div className="admin-report-qdetail-title">{recordTitle}</div>

                    {isCaptain && (
                        <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={() => void handleDeleteRecord(selectedEventDayId)}
                            disabled={deleteLoadingId === selectedEventDayId}
                        >
                            {deleteLoadingId === selectedEventDayId ? "삭제 중..." : "기록 삭제"}
                        </button>
                    )}
                </div>

                <div className="admin-report-qwrap">
                    <button
                        type="button"
                        onClick={() => {
                            if (isFirst) return;
                            setQDir("back");
                            setQIndex((prev) => Math.max(0, prev - 1));
                        }}
                        className="admin-report-qprev"
                        aria-label="prev question"
                        disabled={isFirst}
                        aria-disabled={isFirst}
                    >
                        <img src="/icons/chevron-left.svg" alt="" />
                    </button>

                    <div key={questionKey} className={`admin-report-qswap admin-report-qswap--${qDir}`}>
                        <div className="admin-report-q">{`Q. ${questionText || "-"}`}</div>
                        <div className="admin-report-a">{answerText}</div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (isLast) return;
                            setQDir("forward");
                            setQIndex((prev) => Math.min(questions.length - 1, prev + 1));
                        }}
                        className="admin-report-qnext"
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

    function renderRightContent(): React.ReactNode {
        if (rightView === "USER_DETAIL") {
			if (!selected) {
				return (
					<div className="admin-report-empty">
						<img src="/internie_mascot_normal.png" alt="" />
						<span className="admin-report-empty-title">사용자를 선택해주세요!</span>
					</div>
				);
			}

            const adminRoleChips = getAdminRoleChips(selected);
            const studentRoleChips = getStudentRoleChips(selected);

			return (
				<div className="admin-report-detail">
					<div className="admin-report-detail-head">
						<div className="admin-report-detail-title">
							<span className="admin-report-name-strong">{getDisplayName(selected)}</span>
							<span className="admin-report-name">님</span>
						</div>
					</div>

					<div className="admin-report-info">
						<div className="admin-report-info-row">
							<div className="admin-report-info-label">기록 수</div>
							<div className="admin-report-info-value">{recordCountText}</div>
						</div>

                        {isCaptain && (
                            <div ref={adminRoleRef} className="admin-report-role-select-wrap">
                                <button
                                    type="button"
                                    className={`admin-report-role-trigger ${adminRoleOpen ? "is-open" : ""}`}
                                    onClick={() => setAdminRoleOpen((prev) => !prev)}
                                >
                                    <span className={adminRoleChips.length === 0 ? "is-empty" : ""}>
                                        {adminRoleChips.length === 0 ? "관리자 권한 추가" : `관리자 권한 ${adminRoleChips.length}개 보유`}
                                    </span>
                                    <img src="/icons/chevron-right-6b.svg" alt="" className={adminRoleOpen ? "is-open" : ""} />
                                </button>

                                {adminRoleOpen && (
                                    <div className="admin-report-role-menu">
                                        <button
                                            type="button"
                                            className={`admin-report-role-item ${hasRole(selected, "ROLE_ADMIN") ? "is-selected" : ""}`}
                                            onClick={() => handleSelectAdminRole("ROLE_ADMIN")}
                                            disabled={hasRole(selected, "ROLE_ADMIN")}
                                        >
                                            인터니 관리자
                                        </button>
                                        <button
                                            type="button"
                                            className={`admin-report-role-item ${hasRole(selected, "ROLE_JUMP_ADMIN") ? "is-selected" : ""}`}
                                            onClick={() => handleSelectAdminRole("ROLE_JUMP_ADMIN")}
                                            disabled={hasRole(selected, "ROLE_ADMIN")}
                                        >
                                            JUMP 관리자
                                        </button>
                                        <button
                                            type="button"
                                            className={`admin-report-role-item ${hasRole(selected, "ROLE_KAKAO_ADMIN") ? "is-selected" : ""}`}
                                            onClick={() => handleSelectAdminRole("ROLE_KAKAO_ADMIN")}
                                            disabled={hasRole(selected, "ROLE_ADMIN")}
                                        >
                                            소셜벤처창업 관리자
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
						
						{adminRoleError && (
							<div className="admin-report-role-error">{adminRoleError}</div>
						)}

                        {adminRoleChips.length > 0 && (
                            <div className="admin-report-admin-role-chips">
                                {adminRoleChips.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        className={`admin-report-role-chip is-admin ${
                                            role === "ROLE_ADMIN" ? "is-default-admin" : ""
                                        } ${
                                            role === "ROLE_JUMP_ADMIN" ? "is-jump" : ""
                                        } ${
                                            role === "ROLE_KAKAO_ADMIN" ? "is-kakao" : ""
                                        }`}
                                        onClick={() => handleClickRevokeAdminRole(role)}
                                    >
                                        {formatRoleChip(role)}
                                    </button>
                                ))}
                            </div>
                        )}
                        
						<div className="admin-report-meta">
							<div className="admin-report-role-chips">
								{studentRoleChips.map((role) => (
									<span key={role} className={`admin-report-role-chip ${role === "ROLE_JUMP_STUDENT" ? "is-jump" : "is-kakao"}`}>
										{formatRoleChip(role)}
									</span>
								))}
							</div>

							<div className="admin-report-meta-texts">
								<div className="admin-report-meta-line">{getSchoolName(selected)}</div>
								<div className="admin-report-meta-line">{normalizeText((selected as { studentNumber?: unknown }).studentNumber) || "-"}</div>
							</div>
						</div>
					</div>

					<button type="button" className="admin-report-record-btn" onClick={handleClickRecordView}>
						기록 보기
					</button>
				</div>
			);
		}

        if (rightView === "REPORT_HOME") {
            const totalCount =
                selected && selectedTotalRecordCount !== undefined
                    ? selectedTotalRecordCount
                    : 0;

            const weekCount =
                selected && calendar && !calendarLoading && !calendarError
                    ? getWeekRecordCount()
                    : 0;

            return (
                <div className="admin-report-home">
                    <button type="button" className="admin-report-kpi-card" disabled={!selected}>
                        <div className="admin-report-kpi-label">전체 기록 수</div>
                        <div className="admin-report-kpi-bottom">
                            <div className="admin-report-kpi-value">
                                {totalRecordCountLoading ? "-" : `${totalCount}건`}
                            </div>
                            
                        </div>
                    </button>

                    <button type="button" className="admin-report-kpi-card" disabled={!selected}>
                        <div className="admin-report-kpi-label">주간 기록 수</div>
                        <div className="admin-report-kpi-bottom">
                            <div className="admin-report-kpi-value">
                                {calendarLoading ? "-" : `${weekCount}건`}
                            </div>
                            
                        </div>
                    </button>
                </div>
            );
        }

        if (rightView === "REPORT_DAY") return renderReportDay();
        if (rightView === "REPORT_DETAIL") return renderReportDetail();

        return null;
    }

    const rightKey = `${rightView}-${selectedYmd}-${selectedEventDayId ?? "none"}`;

    return (
        <div className="admin-report-page">
			{roleConfirmOpen && selected && (
				<div className="admin-report-confirm-dim" role="dialog" aria-modal="true">
					<div className="admin-report-confirm-modal">
						<button
							type="button"
							className="admin-report-confirm-close"
							onClick={() => {
                                if (roleSubmitting) return;
                                setRoleConfirmOpen(false);
                                setPendingAdminRole("");
                                setRevokingAdminRole("");
                            }}
						>
							<img src="/icons/x-01.svg" className="admin-report-confirm-close-icon"></img>
						</button>

						<div className="admin-report-confirm-title">
                            {roleConfirmMode === "revoke"
                                ? `${getDisplayName(selected)}님의 ${getAdminRoleLabel(revokingAdminRole)} 권한을 회수하시겠습니까?`
                                : `${getDisplayName(selected)}님을 ${getAdminRoleLabel(pendingAdminRole)}로 설정하시겠습니까?`}
                        </div>

						<div className="admin-report-confirm-actions">
							<button
								type="button"
								className="admin-report-confirm-btn is-primary"
								onClick={handleConfirmAdminRole}
								disabled={roleSubmitting}
							>
								{roleSubmitting ? "처리 중..." : "확인"}
							</button>

							<button
								type="button"
								className="admin-report-confirm-btn is-gray"
								onClick={() => {
                                    if (roleSubmitting) return;
                                    setRoleConfirmOpen(false);
                                    setPendingAdminRole("");
                                    setRevokingAdminRole("");
                                }}
								disabled={roleSubmitting}
							>
								취소
							</button>
						</div>
					</div>
				</div>
			)}
            <div className="admin-report-section-head">
                <div className="admin-report-section-title-wrap">
                    <div className="admin-report-section-title">Users</div>
                </div>
            </div>

            <div className="admin-report-grid">
                <section className="admin-report-left-card">
                    <div key={rightView !== "USER_DETAIL" ? "report" : "list"} className="admin-report-left-swap">
                        {rightView !== "USER_DETAIL" ? renderLeftReportMode() : renderLeftListMode()}
                    </div>
                </section>

                <section className="admin-report-right-card">
                    <div className={`admin-report-detail-card admin-report-detail-card--${rightView}`}>
                        <div key={rightKey} className={`admin-report-swap admin-report-swap--${navDir}`}>
                            {renderRightContent()}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}