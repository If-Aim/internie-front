import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getMyAttendanceEvents, getMyExternalActivityAssignments, getMyExternalActivityTeams, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { AttendanceEventProgress, AttendanceEventType, AttendanceStatus, MyAttendanceEventResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse, TeamResponse } from "../../../../../../api/ea";
import { getUserDateOnly, getUserTimeZone, parseServerKstDateTime, serverKstDateTimeToUserDateOnly } from "../../../../../../utils/dateTime";
import type { EcaStudentOutletContext } from "../../ecaStudentLayout";
import "./dashboard.css";

const ASSIGNMENT_PAGE_SIZE = 3;
const DASHBOARD_T = "ecaStudent.dashboardPage";
const ASSIGNMENT_T = "ecaStudent.assignmentPage";
const ATTENDANCE_T = "ecaStudent.attendancePage";
const COMMON_T = "common";

type StudentAssignmentStatus = "BEFORE" | "SUBMITTED" | "LATE_SUBMITTED" | "MISSING";

type StudentAssignmentSummary = {
    assignmentId: number;
    name: string;
    dDay: string;
    status: StudentAssignmentStatus;
    deadlineAt?: string | null;
    submittedAt?: string | null;
};

type StudentAttendanceSummary = {
    eventId: number;
    name: string;
    type: AttendanceEventType;
    status: AttendanceStatus;
    progress: AttendanceEventProgress;
    baseAt?: string | null;
};

type PersonSummary = {
    id: number;
    name: string;
    description: string;
    profileImage?: string | null;
    teamId?: number;
};

const ASSIGNMENT_STATUS_KEY_MAP: Record<StudentAssignmentStatus, "assigned" | "submitted" | "late" | "missing"> = {
    BEFORE: "assigned",
    SUBMITTED: "submitted",
    LATE_SUBMITTED: "late",
    MISSING: "missing",
};

function getDday(deadlineAt?: string | null): string {
    if (!deadlineAt) return "-";

    const todayDate = getUserDateOnly();
    const deadlineDate = serverKstDateTimeToUserDateOnly(deadlineAt);

    if (!deadlineDate) return "-";

    const diff = Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return "D-DAY";
    return `D+${Math.abs(diff)}`;
}

function getAssignmentStatus(status: StudentAssignmentResponse["status"]): StudentAssignmentStatus {
    if (status === "SUBMITTED") return "SUBMITTED";
    if (status === "LATE_SUBMITTED") return "LATE_SUBMITTED";
    if (status === "LATE") return "MISSING";
    return "BEFORE";
}

function getAssignmentStatusLabel(status: StudentAssignmentStatus, t: TFunction): string {
    return t(`${ASSIGNMENT_T}.status.${ASSIGNMENT_STATUS_KEY_MAP[status]}`);
}

function isSubmittedAssignment(status: StudentAssignmentStatus): boolean {
    return status === "SUBMITTED" || status === "LATE_SUBMITTED";
}

function getProgressStatusLabel(status?: StudentExternalActivityDetailResponse["progressStatus"]): string {
    if (status === "UPCOMING") return "upcoming";
    if (status === "COMPLETED") return "completed";
    if (status === "DELAYED") return "delayed";
    return "ongoing";
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

function toStudentAssignmentSummary(assignment: StudentAssignmentResponse): StudentAssignmentSummary {
    const status = getAssignmentStatus(assignment.status);
    const submitted = isSubmittedAssignment(status);

    return {
        assignmentId: assignment.assignmentId,
        name: assignment.name,
        dDay: submitted ? "" : getDday(assignment.deadlineAt),
        status,
        deadlineAt: assignment.deadlineAt,
        submittedAt: assignment.submittedAt,
    };
}

function getDeadlineTime(value?: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;

    const date = parseServerKstDateTime(value);

    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function getSubmittedTime(value?: string | null): number {
    if (!value) return 0;

    const date = parseServerKstDateTime(value);

    return date ? date.getTime() : 0;
}

function sortStudentAssignments(assignments: StudentAssignmentSummary[]): StudentAssignmentSummary[] {
    return [...assignments].sort((a, b) => {
        const aSubmitted = isSubmittedAssignment(a.status);
        const bSubmitted = isSubmittedAssignment(b.status);

        if (aSubmitted !== bSubmitted) {
            return aSubmitted ? 1 : -1;
        }

        if (!aSubmitted && !bSubmitted) {
            return getDeadlineTime(a.deadlineAt) - getDeadlineTime(b.deadlineAt);
        }

        return getSubmittedTime(b.submittedAt) - getSubmittedTime(a.submittedAt);
    });
}

function getAttendanceBaseDateTime(event: MyAttendanceEventResponse): string | null {
    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatAttendanceDateLabel(value?: string | null): string {
    if (!value) return "-";

    const date = parseServerKstDateTime(value);

    if (!date) return "-";

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: getUserTimeZone(),
        month: "short",
        day: "numeric",
        weekday: "short",
    }).formatToParts(date);

    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";

    return `${month} ${day}, ${weekday}`;
}

function getAttendanceStatusLabel(status: AttendanceStatus, progress: AttendanceEventProgress, t: TFunction): string {
    if (status !== "NOT_CHECKED") {
        return t(`${ATTENDANCE_T}.status.${status}`);
    }

    if (progress === "OPEN") return t(`${DASHBOARD_T}.attendanceProgress.OPEN`);
    if (progress === "SCHEDULED") return t(`${DASHBOARD_T}.attendanceProgress.SCHEDULED`);

    return t(`${ATTENDANCE_T}.status.NOT_CHECKED`);
}

function getAttendanceTypeLabel(type: AttendanceEventType, t: TFunction): string {
    return t(`${ATTENDANCE_T}.type.${type}`);
}

function getAttendanceStatusClass(status: AttendanceStatus, progress: AttendanceEventProgress): string {
    if (status === "PRESENT") return "present";
    if (status === "ABSENT") return "absent";
    if (status === "LATE" || status === "VERY_LATE" || status === "EARLY_LEAVE" || status === "VERY_EARLY_LEAVE") return "late";
    if (progress === "OPEN") return "open";
    if (progress === "SCHEDULED") return "scheduled";

    return "not-checked";
}

function isAttendanceProgressed(progress: AttendanceEventProgress): boolean {
    return progress !== "SCHEDULED";
}

function isAttendedStatus(status: AttendanceStatus): boolean {
    return status === "PRESENT"
        || status === "LATE"
        || status === "VERY_LATE"
        || status === "EARLY_LEAVE"
        || status === "VERY_EARLY_LEAVE";
}

function toStudentAttendanceSummary(event: MyAttendanceEventResponse): StudentAttendanceSummary {
    return {
        eventId: event.eventId,
        name: event.name,
        type: event.type,
        status: event.status,
        progress: event.progress,
        baseAt: getAttendanceBaseDateTime(event),
    };
}

function getAttendanceTime(value?: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;

    const date = parseServerKstDateTime(value);

    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function getAttendanceProgressSortValue(progress: AttendanceEventProgress): number {
    if (progress === "OPEN") return 0;
    if (progress === "SCHEDULED") return 1;

    return 2;
}

function sortStudentAttendances(attendances: StudentAttendanceSummary[]): StudentAttendanceSummary[] {
    return [...attendances].sort((a, b) => {
        const progressCompare = getAttendanceProgressSortValue(a.progress) - getAttendanceProgressSortValue(b.progress);

        if (progressCompare !== 0) {
            return progressCompare;
        }

        if (a.progress === "CLOSED" && b.progress === "CLOSED") {
            return getAttendanceTime(b.baseAt) - getAttendanceTime(a.baseAt);
        }

        return getAttendanceTime(a.baseAt) - getAttendanceTime(b.baseAt);
    });
}

function getSafeProfileImage(profileImage?: string | null): string {
    if (!profileImage) return "/internie_mascot_normal.png";

    if (profileImage.toLowerCase().includes("default")) {
        return "/internie_mascot_normal.png";
    }

    return profileImage;
}

function findMyTeams(teams: TeamResponse[], myUserId?: number | null): TeamResponse[] {
    if (!myUserId) return [];

    return teams.filter((team) => (
        team.members.some((member) => member.userId === myUserId)
    ));
}

function toManagerSummary(activity: StudentExternalActivityDetailResponse | null): PersonSummary[] {
    return activity?.managers.map((manager) => ({
        id: manager.userId,
        name: manager.name,
        description: "",
        profileImage: manager.profileImage,
    })) ?? [];
}

function toTeamMemberSummaries(teams: TeamResponse[], myUserId: number | null | undefined, t: TFunction): PersonSummary[] {
    return teams.flatMap((team) => (
        team.members
            .filter((member) => member.userId !== myUserId)
            .map((member) => {
                const roleLabel = t(`${DASHBOARD_T}.teamRole.${member.role}`);

                return {
                    id: member.userId,
                    name: member.userName,
                    description: t(`${DASHBOARD_T}.teamMemberDescription`, {
                        teamName: team.name,
                        role: roleLabel,
                    }),
                    profileImage: member.profileImage,
                    teamId: team.teamId,
                };
            })
    ));
}

export default function EcaStudentDashboard(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { me, activities } = useOutletContext<EcaStudentOutletContext>();

    const [assignments, setAssignments] = React.useState<StudentAssignmentSummary[]>([]);
    const [assignmentLoading, setAssignmentLoading] = React.useState(false);
    const [assignmentError, setAssignmentError] = React.useState("");
    const [assignmentPage, setAssignmentPage] = React.useState(0);
    const [activityDetail, setActivityDetail] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [myTeams, setMyTeams] = React.useState<TeamResponse[]>([]);
    const [dashboardLoading, setDashboardLoading] = React.useState(false);
    const [dashboardError, setDashboardError] = React.useState("");
    const [attendances, setAttendances] = React.useState<StudentAttendanceSummary[]>([]);
    const [attendanceLoading, setAttendanceLoading] = React.useState(false);
    const [attendanceError, setAttendanceError] = React.useState("");
    const [attendancePage, setAttendancePage] = React.useState(0);

    React.useEffect(() => {
        async function fetchAssignments(): Promise<void> {
            if (!externalActivityId) {
                setAssignmentError(t(`${DASHBOARD_T}.error.activityNotFound`));
                return;
            }

            setAssignmentLoading(true);
            setAssignmentError("");

            try {
                const data = await getMyExternalActivityAssignments(externalActivityId);
                const sortedAssignments = sortStudentAssignments(data.map(toStudentAssignmentSummary));

                setAssignments(sortedAssignments);
                setAssignmentPage(0);
            } catch (e) {
                console.error(e);
                setAssignments([]);
                setAssignmentError(t(`${ASSIGNMENT_T}.error.assignmentLoadFailed`));
            } finally {
                setAssignmentLoading(false);
            }
        }

        fetchAssignments();
    }, [externalActivityId, t]);

    React.useEffect(() => {
        async function fetchAttendances(): Promise<void> {
            if (!externalActivityId) {
                setAttendanceError(t(`${DASHBOARD_T}.error.activityNotFound`));
                return;
            }

            setAttendanceLoading(true);
            setAttendanceError("");

            try {
                const data = await getMyAttendanceEvents(externalActivityId);
                const sortedAttendances = sortStudentAttendances(data.map(toStudentAttendanceSummary));

                setAttendances(sortedAttendances);
                setAttendancePage(0);
            } catch (e) {
                console.error(e);
                setAttendances([]);
                setAttendanceError(t(`${ATTENDANCE_T}.error.attendanceLoadFailed`));
            } finally {
                setAttendanceLoading(false);
            }
        }

        fetchAttendances();
    }, [externalActivityId, t]);

    React.useEffect(() => {
        async function fetchDashboardData(): Promise<void> {
            if (!externalActivityId) {
                setDashboardError(t(`${DASHBOARD_T}.error.activityNotFound`));
                return;
            }

            setDashboardLoading(true);
            setDashboardError("");

            try {
                const [activityData, teamData] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyExternalActivityTeams(externalActivityId),
                ]);

                setActivityDetail(activityData);
                setMyTeams(findMyTeams(teamData, me?.userId));
            } catch (e) {
                console.error(e);
                setActivityDetail(null);
                setMyTeams([]);
                setDashboardError(t(`${DASHBOARD_T}.error.dashboardLoadFailed`));
            } finally {
                setDashboardLoading(false);
            }
        }

        fetchDashboardData();
    }, [externalActivityId, me?.userId, t]);

    const completedAssignmentCount = assignments.filter((assignment) => (
        assignment.status === "SUBMITTED" || assignment.status === "LATE_SUBMITTED"
    )).length;

    const remainingAssignmentCount = assignments.length - completedAssignmentCount;
    const assignmentPageCount = Math.max(1, Math.ceil(assignments.length / ASSIGNMENT_PAGE_SIZE));
    const visibleAssignments = assignments.slice(
        assignmentPage * ASSIGNMENT_PAGE_SIZE,
        assignmentPage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );

    const progressedAttendances = attendances.filter((attendance) => isAttendanceProgressed(attendance.progress));
    const attendedCount = progressedAttendances.filter((attendance) => isAttendedStatus(attendance.status)).length;
    const attendanceRate = progressedAttendances.length === 0
        ? 0
        : Math.round((attendedCount / progressedAttendances.length) * 100);

    const attendancePageCount = Math.max(1, Math.ceil(attendances.length / ASSIGNMENT_PAGE_SIZE));
    const visibleAttendances = attendances.slice(
        attendancePage * ASSIGNMENT_PAGE_SIZE,
        attendancePage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );
    const canMovePrevAttendancePage = attendancePage > 0;
    const canMoveNextAttendancePage = attendancePage < attendancePageCount - 1;

    const canMovePrevAssignmentPage = assignmentPage > 0;
    const canMoveNextAssignmentPage = assignmentPage < assignmentPageCount - 1;
    const fallbackActivity = activities.find((activity) => String(activity.externalActivityId) === String(externalActivityId)) ?? null;
    const activityTitle = activityDetail?.name ?? fallbackActivity?.name ?? t(`${DASHBOARD_T}.activityFallback`);
    const progressStatusLabel = getProgressStatusLabel(activityDetail?.progressStatus ?? fallbackActivity?.progressStatus);
    const activityProgressRate = getDateProgressRate(
        activityDetail?.startDate ?? fallbackActivity?.startDate,
        activityDetail?.endDate ?? fallbackActivity?.endDate
    );
    const managers = toManagerSummary(activityDetail);
    const teamMembers = toTeamMemberSummaries(myTeams, me?.userId, t);

    function movePrevAssignmentPage(): void {
        setAssignmentPage((prev) => Math.max(0, prev - 1));
    }

    function moveNextAssignmentPage(): void {
        setAssignmentPage((prev) => Math.min(assignmentPageCount - 1, prev + 1));
    }

    function openAssignmentSubmit(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    function movePrevAttendancePage(): void {
        setAttendancePage((prev) => Math.max(0, prev - 1));
    }

    function moveNextAttendancePage(): void {
        setAttendancePage((prev) => Math.min(attendancePageCount - 1, prev + 1));
    }

    function openAttendancePage(): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance`);
    }

    return (
        <div className="eca-student-dashboard-page">
            <h1>{activityTitle}</h1>

            <section className="eca-student-dashboard-summary-grid">
                <article className="eca-student-dashboard-summary-card">
                    <div className="eca-student-dashboard-summary-top">
                        <span>{t(`${DASHBOARD_T}.programProgress`)}</span>
                        <em className={`is-${progressStatusLabel}`}>{t(`ecaStudent.status.${progressStatusLabel}`)}</em>
                    </div>
                    <strong>{activityProgressRate}%</strong>
                </article>

                <article className="eca-student-dashboard-summary-card">
                    <span>{t(`${DASHBOARD_T}.attendanceRate`)}</span>
                    <strong>{attendanceRate}%</strong>
                </article>

                <article className="eca-student-dashboard-summary-card">
                    <span>{t(`${DASHBOARD_T}.remainingAssignments`)}</span>
                    <strong>{t(`${DASHBOARD_T}.assignmentCount`, { count: remainingAssignmentCount })}</strong>
                </article>
            </section>

            <div className="eca-student-dashboard-main-grid">
                <div className="eca-student-dashboard-left-column">
                    <section className="eca-student-dashboard-panel-left">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.myAssignments`)}</h2>

                            <div className="eca-student-dashboard-panel-actions">
                                <button type="button" aria-label={t(`${COMMON_T}.prev`)} className="is-prev" onClick={movePrevAssignmentPage} disabled={!canMovePrevAssignmentPage}>
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                                <button type="button" aria-label={t(`${COMMON_T}.next`)} onClick={moveNextAssignmentPage} disabled={!canMoveNextAssignmentPage}>
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="eca-student-dashboard-list-left">
                            {assignmentLoading ? (
                                <p className="eca-student-dashboard-empty">{t(`${ASSIGNMENT_T}.loading`)}</p>
                            ) : assignmentError ? (
                                <p className="eca-student-dashboard-empty">{assignmentError}</p>
                            ) : assignments.length === 0 ? (
                                <p className="eca-student-dashboard-empty">{t(`${ASSIGNMENT_T}.empty`)}</p>
                            ) : (
                                visibleAssignments.map((assignment) => (
                                    <button type="button" className="eca-student-dashboard-assignment-row" key={assignment.assignmentId} onClick={() => openAssignmentSubmit(assignment.assignmentId)}>
                                        <strong>{assignment.name}</strong>
                                        <span>{assignment.dDay}</span>
                                        <span className="eca-student-dashboard-assignment-action">
                                            <em className={`is-${assignment.status.toLowerCase().replace("_", "-")}`}>
                                                {getAssignmentStatusLabel(assignment.status, t)}
                                            </em>
                                            <i>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </i>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="eca-student-dashboard-panel-left">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.myAttendance`)}</h2>

                            <div className="eca-student-dashboard-panel-actions">
                                <button type="button" aria-label={t(`${COMMON_T}.prev`)} className="is-prev" onClick={movePrevAttendancePage} disabled={!canMovePrevAttendancePage}>
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                                <button type="button" aria-label={t(`${COMMON_T}.next`)} onClick={moveNextAttendancePage} disabled={!canMoveNextAttendancePage}>
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="eca-student-dashboard-list-left">
                            {attendanceLoading ? (
                                <p className="eca-student-dashboard-empty">{t(`${ATTENDANCE_T}.loading`)}</p>
                            ) : attendanceError ? (
                                <p className="eca-student-dashboard-empty">{attendanceError}</p>
                            ) : attendances.length === 0 ? (
                                <p className="eca-student-dashboard-empty">{t(`${ATTENDANCE_T}.empty`)}</p>
                            ) : (
                                visibleAttendances.map((attendance) => (
                                    <button type="button" className="eca-student-dashboard-attendance-row" key={attendance.eventId} onClick={openAttendancePage}>
                                        <strong>{formatAttendanceDateLabel(attendance.baseAt)}</strong>

                                        <span>{getAttendanceTypeLabel(attendance.type, t)}</span>

                                        <span className="eca-student-dashboard-attendance-action">
                                            <em className={`is-${getAttendanceStatusClass(attendance.status, attendance.progress)}`}>
                                                {getAttendanceStatusLabel(attendance.status, attendance.progress, t)}
                                            </em>
                                            <i>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </i>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <aside className="eca-student-dashboard-right-column">
                    <section className="eca-student-dashboard-side-panel">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.managers`, { count: managers.length })}</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label={t(`${DASHBOARD_T}.managerSearchAria`)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                    <path d="M11.9767 10.5397H11.2199L10.9516 10.281C11.5503 9.58544 11.9879 8.76614 12.233 7.88173C12.4781 6.99732 12.5247 6.06966 12.3695 5.16514C11.9192 2.50183 9.69661 0.37501 7.01413 0.0492806C6.07107 -0.0700265 5.1132 0.0279852 4.21385 0.335816C3.31449 0.643646 2.49746 1.15314 1.8253 1.8253C1.15314 2.49746 0.643646 3.31449 0.335816 4.21385C0.0279852 5.1132 -0.0700265 6.07107 0.0492806 7.01413C0.37501 9.69661 2.50183 11.9192 5.16514 12.3695C6.06966 12.5247 6.99732 12.4781 7.88173 12.233C8.76614 11.9879 9.58544 11.5503 10.281 10.9516L10.5397 11.2199V11.9767L14.6113 16.0483C15.0041 16.4411 15.6459 16.4411 16.0387 16.0483C16.4315 15.6555 16.4315 15.0137 16.0387 14.6209L11.9767 10.5397ZM6.22855 10.5397C3.84306 10.5397 1.91743 8.61404 1.91743 6.22855C1.91743 3.84306 3.84306 1.91743 6.22855 1.91743C8.61404 1.91743 10.5397 3.84306 10.5397 6.22855C10.5397 8.61404 8.61404 10.5397 6.22855 10.5397Z" fill="#A0A0A0"/>
                                </svg>
                            </button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {dashboardLoading ? (
                                <p className="eca-student-dashboard-empty">{t(`${DASHBOARD_T}.managerLoading`)}</p>
                            ) : dashboardError ? (
                                <p className="eca-student-dashboard-empty">{dashboardError}</p>
                            ) : managers.length === 0 ? (
                                <p className="eca-student-dashboard-empty">{t(`${DASHBOARD_T}.noManagers`)}</p>
                            ) : (
                                managers.map((manager) => (
                                    <div className="eca-student-dashboard-person-row" key={manager.id}>
                                        <span className="eca-student-dashboard-avatar-wrap">
                                            <img
                                                className="eca-student-dashboard-avatar"
                                                src={getSafeProfileImage(manager.profileImage)}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                }}
                                            />
                                        </span>
                                        <span className="eca-student-dashboard-person-info">
                                            <strong>{manager.name}</strong>
                                        </span>
                                        <button type="button" className="eca-student-dashboard-send-message" aria-label={t(`${DASHBOARD_T}.messageAria`)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                                <path d="M15.2827 6.09522L3.61606 0.261891C3.15564 0.0327317 2.63574 -0.0488505 2.12725 0.0282672C1.61877 0.105385 1.14644 0.337449 0.774668 0.692821C0.402895 1.04819 0.14977 1.50958 0.049803 2.01407C-0.0501637 2.51856 0.00789349 3.0416 0.216059 3.51189L2.21606 7.98689C2.26144 8.09508 2.28481 8.21123 2.28481 8.32856C2.28481 8.44588 2.26144 8.56203 2.21606 8.67022L0.216059 13.1452C0.0466425 13.5258 -0.0249779 13.9427 0.00770662 14.358C0.0403911 14.7733 0.176344 15.1739 0.403211 15.5233C0.630077 15.8727 0.940664 16.1599 1.30674 16.3587C1.67283 16.5576 2.08279 16.6618 2.49939 16.6619C2.88958 16.658 3.27397 16.5669 3.62439 16.3952L15.2911 10.5619C15.7049 10.3537 16.0527 10.0346 16.2958 9.64029C16.5389 9.24593 16.6676 8.7918 16.6676 8.32856C16.6676 7.86531 16.5389 7.41118 16.2958 7.01683C16.0527 6.62247 15.7049 6.3034 15.2911 6.09522H15.2827ZM14.5411 9.07022L2.87439 14.9036C2.72119 14.9771 2.54917 15.0021 2.38138 14.9751C2.21359 14.9481 2.05807 14.8705 1.93565 14.7526C1.81324 14.6347 1.72979 14.4822 1.6965 14.3156C1.66321 14.1489 1.68166 13.9761 1.74939 13.8202L3.74106 9.34522C3.76684 9.28547 3.7891 9.22425 3.80773 9.16189H9.54939C9.77041 9.16189 9.98237 9.07409 10.1386 8.91781C10.2949 8.76153 10.3827 8.54957 10.3827 8.32856C10.3827 8.10754 10.2949 7.89558 10.1386 7.7393C9.98237 7.58302 9.77041 7.49522 9.54939 7.49522H3.80773C3.7891 7.43286 3.76684 7.37165 3.74106 7.31189L1.74939 2.83689C1.68166 2.68103 1.66321 2.50818 1.6965 2.34153C1.72979 2.17488 1.81324 2.02239 1.93565 1.90451C2.05807 1.78663 2.21359 1.709 2.38138 1.68202C2.54917 1.65504 2.72119 1.68 2.87439 1.75356L14.5411 7.58689C14.6776 7.65682 14.7921 7.76307 14.8721 7.89393C14.9521 8.02479 14.9944 8.17519 14.9944 8.32856C14.9944 8.48193 14.9521 8.63233 14.8721 8.76319C14.7921 8.89405 14.6776 9.00029 14.5411 9.07022Z" fill="#A0A0A0"/>
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="eca-student-dashboard-side-panel">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.myTeam`, { count: teamMembers.length })}</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label={t(`${DASHBOARD_T}.teamSearchAria`)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                    <path d="M11.9767 10.5397H11.2199L10.9516 10.281C11.5503 9.58544 11.9879 8.76614 12.233 7.88173C12.4781 6.99732 12.5247 6.06966 12.3695 5.16514C11.9192 2.50183 9.69661 0.37501 7.01413 0.0492806C6.07107 -0.0700265 5.1132 0.0279852 4.21385 0.335816C3.31449 0.643646 2.49746 1.15314 1.8253 1.8253C1.15314 2.49746 0.643646 3.31449 0.335816 4.21385C0.0279852 5.1132 -0.0700265 6.07107 0.0492806 7.01413C0.37501 9.69661 2.50183 11.9192 5.16514 12.3695C6.06966 12.5247 6.99732 12.4781 7.88173 12.233C8.76614 11.9879 9.58544 11.5503 10.281 10.9516L10.5397 11.2199V11.9767L14.6113 16.0483C15.0041 16.4411 15.6459 16.4411 16.0387 16.0483C16.4315 15.6555 16.4315 15.0137 16.0387 14.6209L11.9767 10.5397ZM6.22855 10.5397C3.84306 10.5397 1.91743 8.61404 1.91743 6.22855C1.91743 3.84306 3.84306 1.91743 6.22855 1.91743C8.61404 1.91743 10.5397 3.84306 10.5397 6.22855C10.5397 8.61404 8.61404 10.5397 6.22855 10.5397Z" fill="#A0A0A0"/>
                                </svg>
                            </button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {dashboardLoading ? (
                                <p className="eca-student-dashboard-empty">{t(`${DASHBOARD_T}.teamLoading`)}</p>
                            ) : dashboardError ? (
                                <p className="eca-student-dashboard-empty">{dashboardError}</p>
                            ) : myTeams.length === 0 ? (
                                <p className="eca-student-dashboard-empty">{t(`${DASHBOARD_T}.noTeams`)}</p>
                            ) : teamMembers.length === 0 ? (
                                <p className="eca-student-dashboard-empty">{t(`${DASHBOARD_T}.noTeamMembers`)}</p>
                            ) : (
                                teamMembers.map((member) => (
                                    <div className="eca-student-dashboard-person-row" key={`${member.teamId}-${member.id}`}>
                                        <span className="eca-student-dashboard-avatar-wrap">
                                            <img
                                                className="eca-student-dashboard-avatar"
                                                src={getSafeProfileImage(member.profileImage)}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                }}
                                            />
                                        </span>
                                        <span className="eca-student-dashboard-person-info">
                                            <strong>{member.name}</strong>
                                            <span>{member.description}</span>
                                        </span>
                                        <button type="button" className="eca-student-dashboard-send-message" aria-label={t(`${DASHBOARD_T}.messageAria`)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                                <path d="M15.2827 6.09522L3.61606 0.261891C3.15564 0.0327317 2.63574 -0.0488505 2.12725 0.0282672C1.61877 0.105385 1.14644 0.337449 0.774668 0.692821C0.402895 1.04819 0.14977 1.50958 0.049803 2.01407C-0.0501637 2.51856 0.00789349 3.0416 0.216059 3.51189L2.21606 7.98689C2.26144 8.09508 2.28481 8.21123 2.28481 8.32856C2.28481 8.44588 2.26144 8.56203 2.21606 8.67022L0.216059 13.1452C0.0466425 13.5258 -0.0249779 13.9427 0.00770662 14.358C0.0403911 14.7733 0.176344 15.1739 0.403211 15.5233C0.630077 15.8727 0.940664 16.1599 1.30674 16.3587C1.67283 16.5576 2.08279 16.6618 2.49939 16.6619C2.88958 16.658 3.27397 16.5669 3.62439 16.3952L15.2911 10.5619C15.7049 10.3537 16.0527 10.0346 16.2958 9.64029C16.5389 9.24593 16.6676 8.7918 16.6676 8.32856C16.6676 7.86531 16.5389 7.41118 16.2958 7.01683C16.0527 6.62247 15.7049 6.3034 15.2911 6.09522H15.2827ZM14.5411 9.07022L2.87439 14.9036C2.72119 14.9771 2.54917 15.0021 2.38138 14.9751C2.21359 14.9481 2.05807 14.8705 1.93565 14.7526C1.81324 14.6347 1.72979 14.4822 1.6965 14.3156C1.66321 14.1489 1.68166 13.9761 1.74939 13.8202L3.74106 9.34522C3.76684 9.28547 3.7891 9.22425 3.80773 9.16189H9.54939C9.77041 9.16189 9.98237 9.07409 10.1386 8.91781C10.2949 8.76153 10.3827 8.54957 10.3827 8.32856C10.3827 8.10754 10.2949 7.89558 10.1386 7.7393C9.98237 7.58302 9.77041 7.49522 9.54939 7.49522H3.80773C3.7891 7.43286 3.76684 7.37165 3.74106 7.31189L1.74939 2.83689C1.68166 2.68103 1.66321 2.50818 1.6965 2.34153C1.72979 2.17488 1.81324 2.02239 1.93565 1.90451C2.05807 1.78663 2.21359 1.709 2.38138 1.68202C2.54917 1.65504 2.72119 1.68 2.87439 1.75356L14.5411 7.58689C14.6776 7.65682 14.7921 7.76307 14.8721 7.89393C14.9521 8.02479 14.9944 8.17519 14.9944 8.32856C14.9944 8.48193 14.9521 8.63233 14.8721 8.76319C14.7921 8.89405 14.6776 9.00029 14.5411 9.07022Z" fill="#A0A0A0"/>
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}