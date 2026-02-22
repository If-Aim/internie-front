// src/pages/admin/desktop/jump/dashboard/dashboard.tsx
import React from "react";
import { ApiError, type JumpAdminStudent, type JumpAdminStudentCalendarResponse, getJumpAdminStudents, getJumpAdminStudentCalendar, } from "../../../../../api/client"; 
import "./dashboard.css";
import "../jumpAdmin.css"

type WeekDay = {
    y: number;
    m: number;
    d: number;
    ymd: string; 
    labelKo: string; 
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function toYmd(y: number, m: number, d: number) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
}

function startOfWeekMonday(date: Date) {
    const d = new Date(date);
    const jsDow = d.getDay(); // 0 Sun - 6 Sat
    const mondayOffset = (jsDow + 6) % 7; // Mon=0
    d.setDate(d.getDate() - mondayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function getWeekDays(base: Date): WeekDay[] {
    const ko = ["월", "화", "수", "목", "금", "토", "일"];
    const start = startOfWeekMonday(base);

    return Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(start, i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return {
            y,
            m,
            d: day,
            ymd: toYmd(y, m, day),
            labelKo: ko[i],
        };
    });
}

function isToday(ymd: string) {
    const now = new Date();
    const today =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0");

    return ymd === today;
}

function getWeekLabel(weekStartMonday: Date) {
    const y = weekStartMonday.getFullYear();
    const m = weekStartMonday.getMonth() + 1;

    const first = new Date(y, m - 1, 1);
    const firstMon = startOfWeekMonday(first);
    const diffDays = Math.floor((weekStartMonday.getTime() - firstMon.getTime()) / (1000 * 60 * 60 * 24));
    const weekNo = Math.floor(diffDays / 7) + 1;

    return `${y}년 ${m}월 ${weekNo}주차`;
}

function displaySchoolName(u: JumpAdminStudent) {
    const schoolName = (u.school?.name ?? "").trim();
    return schoolName || "-";
}

function getOrgName(u: JumpAdminStudent) {
    return (u.jumpOrganization?.name ?? "").trim();
}

export default function JumpAdminDashboardPage(): React.ReactElement {
    const [students, setStudents] = React.useState<JumpAdminStudent[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [selectedOrg, setSelectedOrg] = React.useState<string>("");

    const [weekAnchor, setWeekAnchor] = React.useState<Date>(() => new Date());
    const [open, setOpen] = React.useState(false);

    const weekStart = React.useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);
    const weekDays = React.useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

    const [calCache, setCalCache] = React.useState<Record<string, JumpAdminStudentCalendarResponse>>({});
    const orgRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const list = await getJumpAdminStudents();
                if (!mounted) return;
                setStudents(list);
                setSelectedOrg("");
            } catch (e) {
                if (!mounted) return;
                console.error(e);
                setStudents([]);
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
        for (const s of students) {
            const org = getOrgName(s);
            if (org) set.add(org);
        }
        return Array.from(set);
    }, [students]);

    const visibleStudents = React.useMemo(() => {
        const org = selectedOrg.trim();
        if (!org) return students;
        return students.filter((s) => getOrgName(s) === org);
    }, [students, selectedOrg]);

    const monthsToLoad = React.useMemo(() => {
        const pairs = new Set<string>();
        for (const wd of weekDays) {
            pairs.add(`${wd.y}-${wd.m}`);
        }
        return Array.from(pairs).map((k) => {
            const [y, m] = k.split("-").map(Number);
            return { y, m };
        });
    }, [weekDays]);

    React.useEffect(() => {
        if (visibleStudents.length === 0) return;

        let mounted = true;

        (async () => {
            const nextCache: Record<string, JumpAdminStudentCalendarResponse> = {};

            for (const k of Object.keys(calCache)) nextCache[k] = calCache[k];

            try {
                const tasks: Array<Promise<void>> = [];

                for (const s of visibleStudents) {
                    for (const ym of monthsToLoad) {
                        const key = `${s.userId}-${ym.y}-${ym.m}`;
                        if (nextCache[key]) continue;

                        tasks.push(
                            (async () => {
                                try {
                                    const res = await getJumpAdminStudentCalendar(s.userId, ym.y, ym.m);
                                    nextCache[key] = res;
                                } catch (e) {
                                    if (!(e instanceof ApiError)) console.error(e);
                                    nextCache[key] = {
                                        year: ym.y,
                                        month: ym.m,
                                        totalRecordedDays: 0,
                                        dailyStatuses: [],
                                    };
                                }
                            })()
                        );
                    }
                }

                await Promise.all(tasks);

                if (!mounted) return;
                setCalCache(nextCache);
            } finally {
            }
        })();

        return () => {
            mounted = false;
        };
    }, [visibleStudents, monthsToLoad]); 

    React.useEffect(() => {
        if (!open) return;

        function onDocMouseDown(e: MouseEvent) {
            const el = orgRef.current;
            if (!el) return;

            if (e.target instanceof Node && !el.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", onDocMouseDown);

        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
        };
    }, [open]);

    function findDailyEventCount(studentId: number, ymd: string) {
        const [yStr, mStr] = ymd.split("-"); 
        const key = `${studentId}-${Number(yStr)}-${Number(mStr)}`;
        const cal = calCache[key];
        if (!cal) return 0;

        const ds = (cal.dailyStatuses ?? []).find((it) => it.date === ymd);
        return ds ? (ds.eventDayIds ?? []).length : 0;
    }

    const kpi = React.useMemo(() => {
        const totalParticipants = visibleStudents.length;

        let weekRecordedCount = 0;
        for (const s of visibleStudents) {
            for (const wd of weekDays) {
                weekRecordedCount += findDailyEventCount(s.userId, wd.ymd);
            }
        }

        let weekNotRecordedCells = 0;
        for (const s of visibleStudents) {
            for (const wd of weekDays) {
                if (findDailyEventCount(s.userId, wd.ymd) === 0) weekNotRecordedCells += 1;
            }
        }

        const y = weekAnchor.getFullYear();
        const m = weekAnchor.getMonth() + 1;
        let monthRecordedCount = 0;
        for (const s of visibleStudents) {
            const key = `${s.userId}-${y}-${m}`;
            const cal = calCache[key];
            if (!cal) continue;

            for (const ds of cal.dailyStatuses ?? []) {
                monthRecordedCount += (ds.eventDayIds ?? []).length;
            }
        }

        return {
            totalParticipants,
            monthRecordedCount,
            weekRecordedCount,
            weekNotRecordedCells,
        };
    }, [visibleStudents, weekDays, calCache, weekAnchor]);

    function goPrevWeek() {
        setWeekAnchor((prev) => addDays(prev, -7));
    }

    function goNextWeek() {
        setWeekAnchor((prev) => addDays(prev, 7));
    }

    return (
        <div className="jump-dashboard">
            <div className="jump-dashboard-head">
                <div className="jump-dashboard-title">
                    <div className="jump-dashboard-title-badge"><img src="/jump-logo.png"></img></div>
                    <div className="jump-dashboard-title-main">2026 상생지락 ALTogether</div>
                </div>

                <div className="jump-dashboard-kpis">
                    <button type="button" className="jump-dashboard-kpi">
                        <div className="jump-dashboard-kpi-label">전체 참여자 수</div>
                        <div className="jump-dashboard-kpi-value">{kpi.totalParticipants}명</div>
                    </button>

                    <button type="button" className="jump-dashboard-kpi">
                        <div className="jump-dashboard-kpi-label">이번 달 기록 현황</div>
                        <div className="jump-dashboard-kpi-value">{kpi.monthRecordedCount}건</div>
                    </button>

                    <button type="button" className="jump-dashboard-kpi">
                        <div className="jump-dashboard-kpi-label">이번 주 기록 현황</div>
                        <div className="jump-dashboard-kpi-value">{kpi.weekRecordedCount}건</div>
                    </button>

                    <button type="button" className="jump-dashboard-kpi">
                        <div className="jump-dashboard-kpi-label">이번 주 미기록 현황</div>
                        <div className="jump-dashboard-kpi-value">{kpi.weekNotRecordedCells}건</div>
                    </button>
                </div>
            </div>

            <div className="jump-dashboard-week-card">
                <div className="jump-dashboard-week-head">
                    <div className="jump-dashboard-week-left">
                        <div className="jump-dashboard-week-label">{getWeekLabel(weekStart)}</div>
                        <div className="jump-dashboard-week-nav">
                            <button type="button" className="jump-dashboard-week-navbtn" onClick={goPrevWeek} aria-label="prev week">
                                <img src="/chevron-left.svg" alt="" />
                            </button>
                            <button type="button" className="jump-dashboard-week-navbtn" onClick={goNextWeek} aria-label="next week">
                                <img className="next-week" src="/chevron-right.svg" alt="" />
                            </button>
                        </div>
                    </div>

                    <div className="jump-dashboard-week-right">
                        <div ref={orgRef} className={`jump-dashboard-org ${open ? "is-open" : ""}`}>
                            <button type="button" className={`jump-dashboard-org-trigger ${!selectedOrg ? "is-all" : ""}`} onClick={() => setOpen((prev) => !prev)} >
                                <img className="jump-users-org-filter" src={!selectedOrg ? "/mynaui_filterr_6b.svg" : "/mynaui_filte.svg"} alt="" />
                                <span className="jump-dashboard-org-text">{selectedOrg || "전체"}</span>
                                <img className="org-arrow" src={!selectedOrg ? "/chevron-right-6b.svg" : "/chevron-right.svg"} alt="" />
                            </button>

                            {open && (
                                <div className="jump-dashboard-org-menu">
                                    <button className="jump-dashboard-org-item" onClick={() => { setSelectedOrg(""); setOpen(false); }} >
                                        전체
                                    </button>

                                    {orgOptions.map((org) => (
                                        <button key={org} className="jump-dashboard-org-item" onClick={() => { setSelectedOrg(org); setOpen(false); }} >
                                            {org}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="jump-dashboard-week-grid">
                    <div className="jump-dashboard-week-grid-head">
                        <div className="jump-dashboard-week-grid-spacer" />
                        <div className="jump-dashboard-week-days">
                            {weekDays.map((d) => (
                                <div
                                    key={d.ymd}
                                    className={
                                        isToday(d.ymd)
                                            ? "jump-dashboard-week-day jump-dashboard-week-day--today"
                                            : "jump-dashboard-week-day"
                                    }
                                >
                                    {d.labelKo}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="jump-dashboard-week-rows">
                        {loading ? (
                            <div className="jump-dashboard-loading">로딩 중...</div>
                        ) : visibleStudents.length === 0 ? (
                            <div className="jump-dashboard-loading">표시할 참가자가 없습니다.</div>
                        ) : (
                            visibleStudents.map((s) => (
                                <div key={s.userId} className="jump-dashboard-week-row">
                                    <div className="jump-dashboard-student">
                                        <div className="jump-dashboard-student-name">{s.name}</div>
                                        <div className="jump-dashboard-student-school">{displaySchoolName(s)}</div>
                                    </div>

                                    <div className="jump-dashboard-cells">
                                        {weekDays.map((d) => {
                                            const cnt = findDailyEventCount(s.userId, d.ymd);
                                            const has = cnt > 0;

                                            return (
                                                <div
                                                    key={`${s.userId}-${d.ymd}`}
                                                    className={has ? "jump-dashboard-cell jump-dashboard-cell--on" : "jump-dashboard-cell"}
                                                    title={has ? `${d.ymd} (${cnt}건)` : d.ymd}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}