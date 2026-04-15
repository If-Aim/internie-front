// src/pages/admin/desktop/client/dashboard/dashboard.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, type ClientAdminStudent, type ClientAdminStudentCalendarResponse, type ClientType, getClientAdminStudents, getClientAdminStudentCalendar, getClientAdminStudentRecordCount } from "../../../../../api/client"; 
import "./dashboard.css";
import "../clientAdmin.css"

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

function getWeekLabelByDate(baseDate: Date) {
    const normalized = new Date(baseDate);
    normalized.setHours(0, 0, 0, 0);

    const y = normalized.getFullYear();
    const m = normalized.getMonth() + 1;

    const firstDay = new Date(y, m - 1, 1);
    firstDay.setHours(0, 0, 0, 0);

    const firstWeekStart = startOfWeekMonday(firstDay);
    const currentWeekStart = startOfWeekMonday(normalized);

    const msDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor(
        (currentWeekStart.getTime() - firstWeekStart.getTime()) / msDay
    );

    const weekNo = Math.floor(diffDays / 7) + 1;

    return `${y}년 ${m}월 ${weekNo}주차`;
}

function getOrgName(u: ClientAdminStudent) {
    return (u.jumpOrganization?.name ?? "").trim();
}

function getAssignmentFilterLabel(value: "ALL" | "COMPLETED" | "INCOMPLETE") {
    if (value === "COMPLETED") return "과제 완료";
    if (value === "INCOMPLETE") return "과제 미완료";
    return "전체";
}

function getClientConfig(clientType: ClientType | null) { // client별 title, logo분기
    switch (clientType) {
        case "kakao":
            return {
                title: "소셜벤처창업",
                logo: "/logos/kakaoventure-logo.png",
            };
        case "jump":
        default:
            return {
                title: "2026 상생지락 ALTogether",
                logo: "/logos/jump-logo.png",
            };
    }
}

export default function ClientAdminDashboardPage(): React.ReactElement {
    const navigate = useNavigate();
	const params = useParams<{ clientType: string }>();

	function isClientType(value: string | undefined): value is ClientType {
		return value === "jump" || value === "kakao";
	}

	const clientType = isClientType(params.clientType) ? params.clientType : null;

    const [students, setStudents] = React.useState<ClientAdminStudent[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [recordCountMap, setRecordCountMap] = React.useState<Record<number, number>>({});

    const [selectedOrg, setSelectedOrg] = React.useState<string>("");
    const [selectedAssignment, setSelectedAssignment] = React.useState<"ALL" | "COMPLETED" | "INCOMPLETE">("ALL");

    const [weekAnchor, setWeekAnchor] = React.useState<Date>(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    });
    const [open, setOpen] = React.useState(false);

    const weekDays = React.useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

    const [calCache, setCalCache] = React.useState<Record<string, ClientAdminStudentCalendarResponse>>({});
    const orgRef = React.useRef<HTMLDivElement | null>(null);

    const isJump = clientType === "jump";
    const isKakao = clientType === "kakao";

    const config = getClientConfig(clientType);

    React.useEffect(() => {
        if (clientType) return;
        navigate("/student", { replace: true });
    }, [clientType, navigate]);

    if (!clientType) {
        return <div className="client-users-state">잘못된 관리자 경로입니다.</div>;
    }

    React.useEffect(() => {
        if(!clientType) return;
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const list = await getClientAdminStudents(clientType);
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
    }, [clientType]);

    React.useEffect(() => {
        if (!clientType) return;
        if (students.length === 0) {
            setRecordCountMap({});
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const entries = await Promise.all(
                    students.map(async (student) => {
                        try {
                            const res = await getClientAdminStudentRecordCount(clientType, student.userId);
                            return [student.userId, res.totalRecordCount] as const;
                        } catch (e) {
                            if (!(e instanceof ApiError)) console.error(e);
                            return [student.userId, 0] as const;
                        }
                    })
                );

                if (!mounted) return;
                setRecordCountMap(Object.fromEntries(entries));
            } catch (e) {
                if (!mounted) return;
                console.error(e);
                setRecordCountMap({});
            }
        })();

        return () => {
            mounted = false;
        };
    }, [clientType, students]);

    const orgOptions = React.useMemo(() => {
        if (!isJump) return [];

        const set = new Set<string>();
        for (const s of students) {
            const org = getOrgName(s);
            if (org) set.add(org);
        }
        return Array.from(set);
    }, [students, isJump]);

    const visibleStudents = React.useMemo(() => {
        let next = students;

        if (isJump) {
            const org = selectedOrg.trim();
            if (org) {
                next = next.filter((s) => getOrgName(s) === org);
            }
        }

        if (isKakao) {
            if (selectedAssignment === "COMPLETED") {
                next = next.filter((s) => (recordCountMap[s.userId] ?? 0) >= 5);
            } else if (selectedAssignment === "INCOMPLETE") {
                next = next.filter((s) => (recordCountMap[s.userId] ?? 0) < 5);
            }
        }

        return next;
    }, [students, selectedOrg, selectedAssignment, isJump, isKakao, recordCountMap]);

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


    function renderTopFilter() {
        if (!isJump && !isKakao) return null;

        const isOrgMode = isJump;
        const isAll = isOrgMode ? !selectedOrg : selectedAssignment === "ALL";
        const label = isOrgMode ? (selectedOrg || "전체") : getAssignmentFilterLabel(selectedAssignment);

        return (
            <div className="client-dashboard-week-right">
                <div ref={orgRef} className={`client-dashboard-org ${open ? "is-open" : ""}`}>
                    <button
                        type="button"
                        className={`client-dashboard-org-trigger ${isAll ? "is-all" : ""}`}
                        onClick={() => setOpen((prev) => !prev)}
                    >
                        <img
                            className="client-users-org-filter"
                            src={isAll ? "/icons/mynaui_filter_6b.svg" : "/icons/mynaui_filter.svg"}
                            alt=""
                        />
                        <span className={isAll ? "client-dashboard-org-text is-all" : "client-dashboard-org-text is-selected"}>
                            {label}
                        </span>
                        <img
                            className="org-arrow"
                            src={isAll ? "/icons/chevron-right-6b.svg" : "/icons/chevron-right.svg"}
                            alt=""
                        />
                    </button>

                    {open && (
                        <div className="client-dashboard-org-menu">
                            {isOrgMode ? (
                                <>
                                    <button
                                        type="button"
                                        className="client-dashboard-org-item"
                                        onClick={() => {
                                            setSelectedOrg("");
                                            setOpen(false);
                                        }}
                                    >
                                        전체
                                    </button>

                                    {orgOptions.map((org) => (
                                        <button
                                            key={org}
                                            type="button"
                                            className="client-dashboard-org-item"
                                            onClick={() => {
                                                setSelectedOrg(org);
                                                setOpen(false);
                                            }}
                                        >
                                            {org}
                                        </button>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="client-dashboard-org-item"
                                        onClick={() => {
                                            setSelectedAssignment("ALL");
                                            setOpen(false);
                                        }}
                                    >
                                        전체
                                    </button>

                                    <button
                                        type="button"
                                        className="client-dashboard-org-item"
                                        onClick={() => {
                                            setSelectedAssignment("COMPLETED");
                                            setOpen(false);
                                        }}
                                    >
                                        과제 완료
                                    </button>

                                    <button
                                        type="button"
                                        className="client-dashboard-org-item"
                                        onClick={() => {
                                            setSelectedAssignment("INCOMPLETE");
                                            setOpen(false);
                                        }}
                                    >
                                        과제 미완료
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    React.useEffect(() => {
        if(!clientType) return;
        if (visibleStudents.length === 0) return;

        let mounted = true;

        (async () => {
            const nextCache: Record<string, ClientAdminStudentCalendarResponse> = {};

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
                                    const res = await getClientAdminStudentCalendar(clientType, s.userId, ym.y, ym.m);
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
    }, [visibleStudents, monthsToLoad, clientType]); 

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

    React.useEffect(() => {
        if (!isJump) {
            setSelectedOrg("");
            setOpen(false);
        }
    }, [isJump]);

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

        const overFiveRecorededStudents = visibleStudents.filter((s) => {
            return (recordCountMap[s.userId] ?? 0) >= 5;
        }).length;

        return {
            totalParticipants,
            monthRecordedCount,
            weekRecordedCount,
            weekNotRecordedCells,
            overFiveRecorededStudents,
        };
    }, [visibleStudents, weekDays, calCache, weekAnchor, recordCountMap]);

    function goPrevWeek() {
        setWeekAnchor((prev) => addDays(prev, -7));
    }

    function goNextWeek() {
        setWeekAnchor((prev) => addDays(prev, 7));
    }

    return (
        <div className="client-dashboard">
            <div className="client-dashboard-head">
                <div className={`client-dashboard-title ${clientType === "kakao" ? "is-kakao" : ""}`}>
                    <div className="client-dashboard-title-badge"><img src={config.logo}/>{clientType === "kakao" && (<img src="/logos/ewhaWU-ko-logo.png"/>)}</div>
                    <div className="client-dashboard-title-main">{config.title}</div>
                </div>

                <div className="client-dashboard-kpis">
                    <button type="button" className="client-dashboard-kpi">
                        <div className="client-dashboard-kpi-label">전체 참여자 수</div>
                        <div className="client-dashboard-kpi-value">{kpi.totalParticipants}명</div>
                    </button>

                    <button type="button" className="client-dashboard-kpi">
                        <div className="client-dashboard-kpi-label">이번 달 기록 현황</div>
                        <div className="client-dashboard-kpi-value">{kpi.monthRecordedCount}건</div>
                    </button>

                    <button type="button" className="client-dashboard-kpi">
                        <div className="client-dashboard-kpi-label">이번 주 기록 현황</div>
                        <div className="client-dashboard-kpi-value">{kpi.weekRecordedCount}건</div>
                    </button>

                    {isJump && (
                    <button type="button" className="client-dashboard-kpi">
                        <div className="client-dashboard-kpi-label">이번 주 미기록 현황</div>
                        <div className="client-dashboard-kpi-value">{kpi.weekNotRecordedCells}건</div>
                    </button>
                    )}
                    
                    {isKakao && (
                    <button type="button" className="client-dashboard-kpi">
                        <div className="client-dashboard-kpi-label">과제 완료</div>
                        <div className="client-dashboard-kpi-value">{kpi.overFiveRecorededStudents}건</div>
                    </button>
                    )}
                    
                </div>
            </div>

            <div className="client-dashboard-week-card">
                <div className="client-dashboard-week-head">
                    <div className="client-dashboard-week-left">
                        <div className="client-dashboard-week-label">{getWeekLabelByDate(weekAnchor)}</div>
                        <div className="client-dashboard-week-nav">
                            <button type="button" className="client-dashboard-week-navbtn" onClick={goPrevWeek} aria-label="prev week">
                                <img src="/icons/chevron-left.svg" alt="" />
                            </button>
                            <button type="button" className="client-dashboard-week-navbtn" onClick={goNextWeek} aria-label="next week">
                                <img className="next-week" src="/icons/chevron-right.svg" alt="" />
                            </button>
                        </div>
                    </div>
                    {renderTopFilter()}
                </div>

                <div className="client-dashboard-week-grid">
                    <div className="client-dashboard-week-grid-head">
                        <div className="client-dashboard-week-grid-spacer" />
                        <div className="client-dashboard-week-days">
                            {weekDays.map((d) => (
                                <div
                                    key={d.ymd}
                                    className={
                                        isToday(d.ymd)
                                            ? "client-dashboard-week-day client-dashboard-week-day--today"
                                            : "client-dashboard-week-day"
                                    }
                                >
                                    {d.labelKo}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="client-dashboard-week-rows">
                        {loading ? (
                            <div className="client-dashboard-loading">로딩 중...</div>
                        ) : visibleStudents.length === 0 ? (
                            <div className="client-dashboard-loading">표시할 참가자가 없습니다.</div>
                        ) : (
                            visibleStudents.map((s) => (
                                <div key={s.userId} className="client-dashboard-week-row">
                                    <div className="client-dashboard-student">
                                        <div className="client-dashboard-student-name">{s.name}</div>
                                        {isJump&&(<div className="client-dashboard-student-org">{getOrgName(s) || "-"}</div>)}
                                        {isKakao&&(<div className="client-dashboard-student-org">{s.studentNumber || "-"}</div>)}
                                    </div>

                                    <div className="client-dashboard-cells">
                                        {weekDays.map((d) => {
                                            const cnt = findDailyEventCount(s.userId, d.ymd);
                                            const has = cnt > 0;

                                            return (
                                                <div
                                                    key={`${s.userId}-${d.ymd}`}
                                                    className={has ? "client-dashboard-cell client-dashboard-cell--on" : "client-dashboard-cell"}
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