import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getMyAttendanceEvents, getMyExternalActivityAssignments, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { MyAttendanceEventResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse } from "../../../../../../api/ea";
import { getUserDateOnly, serverKstDateTimeToUserDateOnly } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileDashboard.css";

type ScheduleTypeFilter = "assignment" | "attendance";
type ScheduleSortDirection = "asc" | "desc";

type MobileScheduleItem = {
    id: number;
    title: string;
    date: string;
    sortTime: number;
    type: ScheduleTypeFilter;
    completed: boolean;
};

type StudentMobileShellContext = {
    userName: string;
    userEmail: string;
    userProfileImg: string;
    onRequireAuth: (pathAfterLogin: string, action?: () => void) => void;
};

const DASHBOARD_T = "ecaStudent.dashboardPage";
const DEFAULT_PROFILE_IMAGE = "/internie_mascot_normal.png";
const SCHEDULE_FILTER_VALUES: ScheduleTypeFilter[] = ["attendance", "assignment"];

function getScheduleFilterOptions(t: TFunction): { value: ScheduleTypeFilter; label: string }[] {
    return SCHEDULE_FILTER_VALUES.map((value) => ({
        value,
        label: t(`${DASHBOARD_T}.scheduleType.${value}`),
    }));
}

function formatDateOnlyDot(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}.`;
}

function parseDateOnlyLocal(value?: string | null): Date | null {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatToday(t: TFunction, language: string): string {
    const date = getUserDateOnly();

    if (language.toLowerCase().startsWith("en")) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    const weekday = t(`${DASHBOARD_T}.weekday.${date.getDay()}`);

    return t(`${DASHBOARD_T}.todayFormat`, {
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday,
    });
}

function formatDate(value?: string | null, language?: string): string {
    if (!value) return "-";

    const formatTargetDate = (date: Date): string => {
        if (language?.toLowerCase().startsWith("en")) {
            return new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
            }).format(date);
        }

        return formatDateOnlyDot(date);
    };

    if (value.includes("T")) {
        const userDate = serverKstDateTimeToUserDateOnly(value);

        return userDate ? formatTargetDate(userDate) : value;
    }

    const date = parseDateOnlyLocal(value);

    return date ? formatTargetDate(date) : value;
}

function getScheduleSortTime(value?: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;

    if (value.includes("T")) {
        const userDate = serverKstDateTimeToUserDateOnly(value);

        return userDate ? userDate.getTime() : Number.MAX_SAFE_INTEGER;
    }

    const date = parseDateOnlyLocal(value);

    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

// function getDateProgressRate(startDate?: string | null, endDate?: string | null): number {
//     const start = parseDateOnlyLocal(startDate);
//     const end = parseDateOnlyLocal(endDate);

//     if (!start || !end) return 0;

//     const today = getUserDateOnly();
//     const todayDate = today.getTime();
//     const startDateOnly = start.getTime();
//     const endDateOnly = end.getTime();
//     const oneDay = 1000 * 60 * 60 * 24;

//     if (endDateOnly < startDateOnly) return 0;
//     if (todayDate < startDateOnly) return 0;
//     if (todayDate > endDateOnly) return 100;

//     const totalDays = Math.floor((endDateOnly - startDateOnly) / oneDay) + 1;
//     const elapsedDays = Math.floor((todayDate - startDateOnly) / oneDay) + 1;

//     return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
// }

function isCompletedAssignment(assignment: StudentAssignmentResponse): boolean {
    return assignment.status === "SUBMITTED" || assignment.status === "LATE_SUBMITTED";
}

function isCompletedAttendance(event: MyAttendanceEventResponse): boolean {
    return event.status === "PRESENT"
        || event.status === "LATE"
        || event.status === "VERY_LATE"
        || event.status === "EARLY_LEAVE"
        || event.status === "VERY_EARLY_LEAVE";
}

// function getAttendanceRate(events: MyAttendanceEventResponse[]): number {
//     const closedEvents = events.filter((event) => event.progress === "CLOSED");

//     if (closedEvents.length === 0) {
//         return 0;
//     }

//     const totalScore = closedEvents.reduce((sum, event) => sum + event.score, 0);

//     return Math.round((totalScore / closedEvents.length) * 100);
// }

function formatAttendanceScheduleTitle(event: MyAttendanceEventResponse, t: TFunction): string {
    const value = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
    const baseDate = serverKstDateTimeToUserDateOnly(value);
    const typeText = t(`${DASHBOARD_T}.attendanceType.${event.type}`);

    if (!baseDate) {
        return t(`${DASHBOARD_T}.attendanceNameWithType`, {
            name: event.name,
            type: typeText,
        });
    }

    return t(`${DASHBOARD_T}.attendanceScheduleTitle`, {
        month: baseDate.getMonth() + 1,
        day: baseDate.getDate(),
        type: typeText,
    });
}

function toScheduleItems(assignments: StudentAssignmentResponse[], attendanceEvents: MyAttendanceEventResponse[], t: TFunction, language: string): MobileScheduleItem[] {
    const assignmentItems = assignments.map((assignment) => {
        const scheduleDate = assignment.deadlineAt;

        return {
            id: assignment.assignmentId,
            title: assignment.name,
            date: formatDate(scheduleDate, language),
            sortTime: getScheduleSortTime(scheduleDate),
            type: "assignment" as const,
            completed: isCompletedAssignment(assignment),
        };
    });

    const attendanceItems = attendanceEvents.map((event) => {
        const scheduleDate = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;

        return {
            id: event.eventId,
            title: formatAttendanceScheduleTitle(event, t),
            date: formatDate(scheduleDate, language),
            sortTime: getScheduleSortTime(scheduleDate),
            type: "attendance" as const,
            completed: isCompletedAttendance(event),
        };
    });

    return [...assignmentItems, ...attendanceItems];
}

type HeaderProps = {
    onMenuClick: () => void;
    onNotificationClick: () => void;
    onProfileClick: () => void;
    userProfileImg: string;
};

function Header({ onMenuClick, onNotificationClick, onProfileClick, userProfileImg }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
                <img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
            </button>

            <div className="app-title"></div>

            <div className="eca-mobile-student-dashboard-top-actions">
                <button type="button" className="eca-mobile-student-dashboard-icon-button" aria-label={t(`${DASHBOARD_T}.aria.notification`)} onClick={onNotificationClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9.33333 20.0909C10.041 20.6562 10.9755 21 12 21C13.0245 21 13.959 20.6562 14.6667 20.0909M4.50763 17.1818C4.08602 17.1818 3.85054 16.5194 4.10557 16.1514C4.69736 15.2975 5.26855 14.0451 5.26855 12.537L5.29296 10.3517C5.29296 6.29145 8.29581 3 12 3C15.7588 3 18.8058 6.33993 18.8058 10.4599L18.7814 12.537C18.7814 14.0555 19.3329 15.3147 19.9006 16.169C20.1458 16.5379 19.9097 17.1818 19.4933 17.1818H4.50763Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <button type="button" className="eca-mobile-student-dashboard-profile-button" onClick={onProfileClick} aria-label={t("menu.settings")}>
                    <img
                        className="eca-mobile-student-dashboard-profile"
                        src={userProfileImg || DEFAULT_PROFILE_IMAGE}
                        alt={t("menu.profile")}
                        onError={(e) => {
                            e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                        }}
                    />
                </button>
            </div>
        </div>
    );
}

export default function EcaMobileDashboard(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { userProfileImg, onRequireAuth } = useOutletContext<StudentMobileShellContext>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignments, setAssignments] = React.useState<StudentAssignmentResponse[]>([]);
    const [attendanceEvents, setAttendanceEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const [selectedScheduleTypes, setSelectedScheduleTypes] = React.useState<ScheduleTypeFilter[]>(["attendance", "assignment"]);
    const [scheduleSortDirection, setScheduleSortDirection] = React.useState<ScheduleSortDirection>("asc");
    const [scheduleFilterOpen, setScheduleFilterOpen] = React.useState(false);

    React.useEffect(() => {
        async function fetchDashboard(): Promise<void> {
            if (!externalActivityId) {
                setError(t(`${DASHBOARD_T}.error.activityNotFound`));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [activityData, assignmentData, attendanceData] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyExternalActivityAssignments(externalActivityId),
                    getMyAttendanceEvents(externalActivityId),
                ]);

                setActivity(activityData);
                setAssignments(assignmentData);
                setAttendanceEvents(attendanceData);
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignments([]);
                setAttendanceEvents([]);
                setError(t(`${DASHBOARD_T}.error.dashboardLoadFailed`));
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [externalActivityId, t]);

    // const progressRate = getDateProgressRate(activity?.startDate, activity?.endDate);
    // const completedAssignmentCount = assignments.filter(isCompletedAssignment).length;
    // const assignmentRate = assignments.length === 0 ? 0 : Math.round((completedAssignmentCount / assignments.length) * 100);
    // const attendanceRate = getAttendanceRate(attendanceEvents);
    const scheduleFilterOptions = React.useMemo(() => getScheduleFilterOptions(t), [t]);
    const scheduleLanguage = i18n.resolvedLanguage ?? i18n.language;

    const scheduleItems = React.useMemo(() => {
        return toScheduleItems(assignments, attendanceEvents, t, scheduleLanguage)
            .filter((item) => selectedScheduleTypes.includes(item.type))
            .sort((a, b) => scheduleSortDirection === "asc" ? a.sortTime - b.sortTime : b.sortTime - a.sortTime);
    }, [assignments, attendanceEvents, selectedScheduleTypes, scheduleSortDirection, t, scheduleLanguage]);
    
    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function openNotification(): void {
        if (!externalActivityId) return;

        onRequireAuth(`/student/activities/${externalActivityId}/notification`, () => {
            navigate(`/student/activities/${externalActivityId}/notification`);
        });
    }

    function openMyPage(): void {
        onRequireAuth("/student/mypage", () => {
            navigate("/student/mypage");
        });
    }

    // function openAssignmentList(): void {
    //     if (!externalActivityId) return;

    //     navigate(`/student/activities/${externalActivityId}/assignment`);
    // }

    // function openAttendanceList(): void {
    //     if (!externalActivityId) return;

    //     navigate(`/student/activities/${externalActivityId}/attendance`);
    // }

    function openAttendanceSubmit(eventId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance/${eventId}`);
    }

    function openAssignmentSubmit(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }
    
    function toggleScheduleTypeFilter(type: ScheduleTypeFilter): void {
        setSelectedScheduleTypes((prev) =>
            prev.includes(type)
                ? prev.filter((item) => item !== type)
                : [...prev, type]
        );
    }

    function toggleScheduleSortDirection(): void {
        setScheduleSortDirection((prev) => prev === "asc" ? "desc" : "asc");
    }

    function getScheduleFilterLabel(): string {
        if (selectedScheduleTypes.length === scheduleFilterOptions.length) return t(`${DASHBOARD_T}.filter.allTypes`);
        if (selectedScheduleTypes.length === 0) return t(`${DASHBOARD_T}.filter.noTypes`);

        return scheduleFilterOptions
            .filter((option) => selectedScheduleTypes.includes(option.value))
            .map((option) => option.label)
            .join(", ");
    }

    return (
        <main className="eca-mobile-student-dashboard-page">
            <Header onMenuClick={openMenu} onNotificationClick={openNotification} onProfileClick={openMyPage} userProfileImg={userProfileImg} />
            <div className="eca-mobile-student-dashboard-main">
                <section className="eca-mobile-student-dashboard-title">
                    <span>{formatToday(t, i18n.resolvedLanguage ?? i18n.language)}</span>
                    <h1>{activity?.name ?? t(`${DASHBOARD_T}.activityFallback`)}</h1>
                </section>

                {loading ? (
                    <p className="eca-mobile-student-dashboard-empty">{t(`${DASHBOARD_T}.loading`)}</p>
                ) : error ? (
                    <p className="eca-mobile-student-dashboard-empty">{error}</p>
                ) : (
                    <>
                        {/* <section className="eca-mobile-student-dashboard-progress-card">
                            <span>활동 진행률</span>
                            <strong>{progressRate}%</strong>
                            <div className="eca-mobile-student-dashboard-progress-track">
                                <div style={{ width: `${progressRate}%` }} />
                            </div>
                        </section>

                        <section className="eca-mobile-student-dashboard-metric-card" onClick={openAssignmentList}>
                            <div>
                                <span>나의 과제</span>
                                <strong>{assignmentRate}%</strong>
                            </div>
                            <em>{assignments.length}개</em>
                            <i>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M8 5L13 10L8 15" stroke="#A0A0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </i>
                        </section>

                        <section className="eca-mobile-student-dashboard-metric-card" onClick={openAttendanceList}>
                            <div>
                                <span>나의 출석</span>
                                <strong>{attendanceRate}%</strong>
                            </div>
                            <em className="is-primary">{attendanceEvents.length}개</em>
                            <i>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M8 5L13 10L8 15" stroke="#A0A0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </i>
                        </section> */}

                        <section className="eca-mobile-student-dashboard-schedule">
                            <div className="eca-mobile-student-dashboard-schedule-head">
                                <h2>{t(`${DASHBOARD_T}.scheduleTitle`)}</h2>

                                <div className="eca-mobile-student-dashboard-schedule-actions">
                                    <div className="eca-mobile-student-dashboard-schedule-filter-wrap">
                                        <button type="button" className="eca-mobile-student-dashboard-schedule-action-button" onClick={() => setScheduleFilterOpen(true)} aria-label={getScheduleFilterLabel()}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M22.125 7.875H1.875C1.57663 7.875 1.29048 7.75647 1.0795 7.5455C0.868526 7.33452 0.75 7.04837 0.75 6.75C0.75 6.45163 0.868526 6.16548 1.0795 5.9545C1.29048 5.74353 1.57663 5.625 1.875 5.625H22.125C22.4234 5.625 22.7095 5.74353 22.9205 5.9545C23.1315 6.16548 23.25 6.45163 23.25 6.75C23.25 7.04837 23.1315 7.33452 22.9205 7.5455C22.7095 7.75647 22.4234 7.875 22.125 7.875ZM18.375 13.125H5.625C5.32663 13.125 5.04048 13.0065 4.8295 12.7955C4.61853 12.5845 4.5 12.2984 4.5 12C4.5 11.7016 4.61853 11.4155 4.8295 11.2045C5.04048 10.9935 5.32663 10.875 5.625 10.875H18.375C18.6734 10.875 18.9595 10.9935 19.1705 11.2045C19.3815 11.4155 19.5 11.7016 19.5 12C19.5 12.2984 19.3815 12.5845 19.1705 12.7955C18.9595 13.0065 18.6734 13.125 18.375 13.125ZM13.875 18.375H10.125C9.82663 18.375 9.54048 18.2565 9.3295 18.0455C9.11853 17.8345 9 17.5484 9 17.25C9 16.9516 9.11853 16.6655 9.3295 16.4545C9.54048 16.2435 9.82663 16.125 10.125 16.125H13.875C14.1734 16.125 14.4595 16.2435 14.6705 16.4545C14.8815 16.6655 15 16.9516 15 17.25C15 17.5484 14.8815 17.8345 14.6705 18.0455C14.4595 18.2565 14.1734 18.375 13.875 18.375Z" fill="black"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <button type="button" className="eca-mobile-student-dashboard-schedule-action-button" onClick={toggleScheduleSortDirection} aria-label={scheduleSortDirection === "asc" ? t(`${DASHBOARD_T}.sort.asc`) : t(`${DASHBOARD_T}.sort.desc`)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 6.375L17.625 3L14.25 6.375M17.625 3L17.625 21M3 17.625L6.375 21L9.75 17.625M6.375 21L6.375 3" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="eca-mobile-student-dashboard-schedule-list">
                                {scheduleItems.length === 0 ? (
                                    <p className="eca-mobile-student-dashboard-empty">{t(`${DASHBOARD_T}.emptySchedule`)}</p>
                                ) : (
                                    scheduleItems.map((item) => (
                                        <button type="button" className="eca-mobile-student-dashboard-schedule-item" key={`${item.type}-${item.id}`} onClick={() => { if (item.type === "assignment") { openAssignmentSubmit(item.id); return; }  if (item.type === "attendance") { openAttendanceSubmit(item.id); } }}> 
                                            <span className={item.completed ? "eca-mobile-student-dashboard-schedule-icon is-completed" : "eca-mobile-student-dashboard-schedule-icon"}>
                                                {item.completed ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                                                        <path d="M25 13C25 19.6274 19.6274 25 13 25C6.37258 25 1 19.6274 1 13C1 6.37258 6.37258 1 13 1C14.8827 1 16.6642 1.43358 18.25 2.20635M22.75 5.5L12.25 16L9.25 13" stroke="#0166FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                                        <path d="M3.20157 11.2221L3.20144 24.5879C3.20142 25.6925 4.09686 26.5879 5.20143 26.5879L26.7997 26.588C27.9043 26.588 28.7997 25.6926 28.7997 24.588L28.8002 10.3498C28.8002 9.79754 28.3525 9.3498 27.8002 9.3498H16.1118L12.4251 5.41162H4.20057C3.64814 5.41162 3.20036 5.85813 3.20054 6.41057C3.20095 7.65588 3.20158 9.79409 3.20157 11.2221Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </span>

                                            <span className="eca-mobile-student-dashboard-schedule-text">
                                                <strong>{item.title}</strong>
                                                <em>{item.date}</em>
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
            {scheduleFilterOpen ? (
                <div className="eca-mobile-student-dashboard-filter-modal-backdrop" onClick={() => setScheduleFilterOpen(false)}>
                    <div className="eca-mobile-student-dashboard-filter-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        {scheduleFilterOptions.map((option) => {
                            const selected = selectedScheduleTypes.includes(option.value);

                            return (
                                <button type="button" key={option.value} className={selected ? "eca-mobile-student-dashboard-filter-modal-option is-selected" : "eca-mobile-student-dashboard-filter-modal-option"} onClick={() => toggleScheduleTypeFilter(option.value)} aria-pressed={selected}>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </main>
    );
}