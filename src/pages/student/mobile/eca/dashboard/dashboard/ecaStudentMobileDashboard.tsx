import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMyAttendanceEvents, getMyExternalActivityAssignments, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { MyAttendanceEventResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse } from "../../../../../../api/ea";
import { getUserDateOnly, serverKstDateTimeToUserDateOnly } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileDashboard.css";

type MobileScheduleItem = {
    id: number;
    title: string;
    date: string;
    type: "activity" | "assignment" | "attendance";
    completed: boolean;
};

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

function formatToday(): string {
    const date = getUserDateOnly();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    return `${month}월 ${day}일, ${weekdays[date.getDay()]}`;
}

function formatDate(value?: string | null): string {
    if (!value) return "-";

    if (value.includes("T")) {
        const userDate = serverKstDateTimeToUserDateOnly(value);

        return userDate ? formatDateOnlyDot(userDate) : value;
    }

    const date = parseDateOnlyLocal(value);

    return date ? formatDateOnlyDot(date) : value;
}

function getDateProgressRate(startDate?: string | null, endDate?: string | null): number {
    const start = parseDateOnlyLocal(startDate);
    const end = parseDateOnlyLocal(endDate);

    if (!start || !end) return 0;

    const today = getUserDateOnly();
    const todayDate = today.getTime();
    const startDateOnly = start.getTime();
    const endDateOnly = end.getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (endDateOnly < startDateOnly) return 0;
    if (todayDate < startDateOnly) return 0;
    if (todayDate > endDateOnly) return 100;

    const totalDays = Math.floor((endDateOnly - startDateOnly) / oneDay) + 1;
    const elapsedDays = Math.floor((todayDate - startDateOnly) / oneDay) + 1;

    return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
}

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

function getAttendanceRate(events: MyAttendanceEventResponse[]): number {
    const closedEvents = events.filter((event) => event.progress === "CLOSED");

    if (closedEvents.length === 0) {
        return 0;
    }

    const totalScore = closedEvents.reduce((sum, event) => sum + event.score, 0);

    return Math.round((totalScore / closedEvents.length) * 100);
}

function formatAttendanceScheduleTitle(event: MyAttendanceEventResponse): string {
    const value = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
    const baseDate = serverKstDateTimeToUserDateOnly(value);

    if (!baseDate) {
        return `${event.name} ${event.type === "CLASS_START" ? "Start" : "End"}`;
    }

    const month = baseDate.getMonth() + 1;
    const day = baseDate.getDate();

    return `${month}월 ${day}일 출석 ${event.type === "CLASS_START" ? "Start" : "End"}`;
}

function toScheduleItems(assignments: StudentAssignmentResponse[], attendanceEvents: MyAttendanceEventResponse[]): MobileScheduleItem[] {
    const assignmentItems = assignments.map((assignment) => ({
        id: assignment.assignmentId,
        title: assignment.name,
        date: formatDate(assignment.deadlineAt),
        type: "assignment" as const,
        completed: isCompletedAssignment(assignment),
    }));

    const attendanceItems = attendanceEvents.map((event) => ({
        id: event.eventId,
        title: formatAttendanceScheduleTitle(event),
        date: formatDate(event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart),
        type: "attendance" as const,
        completed: isCompletedAttendance(event),
    }));

    return [...assignmentItems, ...attendanceItems];
}

type HeaderProps = {
	onMenuClick: () => void;
};

function Header({ onMenuClick }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
                <img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
            </button>

            <div className="app-title"></div>

            <div className="eca-mobile-student-dashboard-top-actions">
                <button type="button" className="eca-mobile-student-dashboard-icon-button" aria-label="알림">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                {/* <span className="eca-mobile-student-dashboard-profile" /> */}
            </div>
        </div>
    );
}

export default function EcaMobileDashboard(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignments, setAssignments] = React.useState<StudentAssignmentResponse[]>([]);
    const [attendanceEvents, setAttendanceEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function fetchDashboard(): Promise<void> {
            if (!externalActivityId) {
                setError("대외활동 정보를 찾을 수 없습니다.");
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
                setError("대시보드 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [externalActivityId]);

    const progressRate = getDateProgressRate(activity?.startDate, activity?.endDate);
    const completedAssignmentCount = assignments.filter(isCompletedAssignment).length;
    const assignmentRate = assignments.length === 0 ? 0 : Math.round((completedAssignmentCount / assignments.length) * 100);
    const attendanceRate = getAttendanceRate(attendanceEvents);
    const scheduleItems = toScheduleItems(assignments, attendanceEvents);

    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function openAssignmentList(): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment`);
    }

    function openAttendanceList(): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance`);
    }

    function openAttendanceSubmit(eventId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance/${eventId}`);
    }

    function openAssignmentSubmit(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    return (
        <main className="eca-mobile-student-dashboard-page">
            <Header onMenuClick={openMenu} />
            <div className="eca-mobile-student-dashboard-main">
                <section className="eca-mobile-student-dashboard-title">
                    <span>{formatToday()}</span>
                    <h1>{activity?.name ?? "대외활동"}</h1>
                </section>

                {loading ? (
                    <p className="eca-mobile-student-dashboard-empty">대시보드 정보를 불러오는 중입니다.</p>
                ) : error ? (
                    <p className="eca-mobile-student-dashboard-empty">{error}</p>
                ) : (
                    <>
                        <section className="eca-mobile-student-dashboard-progress-card">
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
                        </section>

                        <section className="eca-mobile-student-dashboard-schedule">
                            <h2>전체 일정</h2>

                            <div className="eca-mobile-student-dashboard-schedule-list">
                                {scheduleItems.length === 0 ? (
                                    <p className="eca-mobile-student-dashboard-empty">등록된 일정이 없습니다.</p>
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
        </main>
    );
}