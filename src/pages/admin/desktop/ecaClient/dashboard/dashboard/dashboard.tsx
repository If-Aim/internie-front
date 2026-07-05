import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../../../../../api/client";
import { createExternalActivityNotice, createExternalActivityStudentInvite, deleteExternalActivity, deleteExternalActivityNotice, getAttendanceEventDetail, getAttendanceEvents, getExternalActivity, getExternalActivityAssignments, getExternalActivityNotices, getExternalActivityStudentInvites, getExternalActivityTeams, updateExternalActivityNotice, downloadExternalActivityNoticeFile} from "../../../../../../api/ea";
import type { AssignmentResponse, AttendanceEventDetailResponse, AttendanceEventResponse, ExternalActivityNoticeResponse, ExternalActivityParticipant, ExternalActivityResponse, ExternalActivityStudentInviteResponse, TeamResponse, } from "../../../../../../api/ea"; 
import { formatServerKstDateTimeDateLabelForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import AdminStudentProfileModal from "../AdminStudentProfileModal";
import type { AdminStudentProfile } from "../AdminStudentProfileModal";
import { getFileIconByExtension } from "../../../../../student/desktop/eca/dashboard/assignment/fileIcons";
import "./dashboard.css";

type ActivityStatus = "upcoming" | "ongoing" | "completed" | "delayed";
const ASSIGNMENT_PAGE_SIZE = 3;
const ATTENDANCE_PAGE_SIZE = 3;
const DASHBOARD_T = "ecaAdmin.dashboardPage";

interface AssignmentSummary {
    id: number;
    title: string;
    deadlineText: string;
    submittedCount: number;
    totalCount: number;
}

interface AttendanceSummary {
    id: number;
    date: string;
    eventTypeText: string;
    presentCount: number;
    totalCount: number;
    progress: AttendanceEventResponse["progress"];
    uploadWindowStart: string;
    uploadWindowEnd: string;
    sortTime: number;
}

interface Participant {
    id: number;
    name: string;
    school: string;
    nickname?: string | null;
    linkedinUrl?: string | null;
    profileImage?: string | null;
    status?: "active" | "default";
}

type StudentProfileSource = {
    name?: string | null;
    nickname?: string | null;
    userNickname?: string | null;
    linkedinUrl?: string | null;
    userLinkedinUrl?: string | null;
    profileImage?: string | null;
};

function getStudentNickname(source: StudentProfileSource): string | null {
    const nickname = source.nickname?.trim() || source.userNickname?.trim() || "";

    return nickname || null;
}

function getStudentLinkedinUrl(source: StudentProfileSource): string | null {
    const linkedinUrl = source.linkedinUrl?.trim() || source.userLinkedinUrl?.trim() || "";

    return linkedinUrl || null;
}

interface TeamAssignmentSummary {
    id: number;
    name: string;
}

interface TeamSummary {
    id: number;
    name: string;
    leaderName: string;
    memberText: string;
    memberCount: number;
    memberNames: string[];
    primaryAssignment: TeamAssignmentSummary | null;
    extraAssignments: TeamAssignmentSummary[];
}

type NoticeModalMode = "create" | "detail" | "edit";

const NEW_NOTICE_PERIOD_MS = 10 * 60 * 1000;

function parseNoticeDateTime(value: string): Date | null {
    const serverDate = parseServerKstDateTime(value);

    if (serverDate) return serverDate;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getNoticeTime(value: string): number {
    return parseNoticeDateTime(value)?.getTime() ?? 0;
}

function sortNotices(notices: ExternalActivityNoticeResponse[]): ExternalActivityNoticeResponse[] {
    return [...notices].sort((a, b) => getNoticeTime(b.createdAt) - getNoticeTime(a.createdAt));
}

function formatNoticeDate(value: string, locale: string): string {
    const date = parseNoticeDateTime(value);

    if (!date) return "-";

    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

function getFileExtension(fileName?: string | null): string {
    if (!fileName) return "";

    const lastDotIndex = fileName.lastIndexOf(".");

    if (
        lastDotIndex === -1 ||
        lastDotIndex === fileName.length - 1
    ) {
        return "";
    }

    return fileName.slice(lastDotIndex + 1);
}

function formatFileSize(sizeBytes?: number | null): string {
    if (sizeBytes === null || sizeBytes === undefined) {
        return "";
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    const sizeKb = sizeBytes / 1024;

    if (sizeKb < 1024) {
        return `${formatFileSizeNumber(sizeKb)} KB`;
    }

    const sizeMb = sizeKb / 1024;

    if (sizeMb < 1024) {
        return `${formatFileSizeNumber(sizeMb)} MB`;
    }

    const sizeGb = sizeMb / 1024;

    return `${formatFileSizeNumber(sizeGb)} GB`;
}

function formatFileSizeNumber(value: number): string {
    if (value >= 100) {
        return Math.round(value).toString();
    }

    return value.toFixed(1);
}

function isNoticeNew(value: string, now: Date): boolean {
    const date = parseNoticeDateTime(value);

    if (!date) return false;

    const elapsed = now.getTime() - date.getTime();

    return elapsed >= 0 && elapsed <= NEW_NOTICE_PERIOD_MS;
}

function parseApiDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function getTodayDateOnly(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCalculatedActivityStatus(activity: ExternalActivityResponse | null): ActivityStatus {
    if (!activity) return "upcoming";

    if (activity.progressStatus === "COMPLETED") {
        return "completed";
    }

    const today = getTodayDateOnly();
    const startDate = parseApiDate(activity.startDate);
    const endDate = parseApiDate(activity.endDate);

    if (today.getTime() < startDate.getTime()) {
        return "upcoming";
    }

    if (today.getTime() <= endDate.getTime()) {
        return "ongoing";
    }

    return "delayed";
}

function getActivityStatusLabel(status: ActivityStatus): ActivityStatus {
    return status;
}

function parseAssignmentDate(value?: string | null): Date | null {
    if (!value) return null;

    if (!value.includes("T")) {
        const [year, month, day] = value.split("-").map(Number);
        const dateOnly = new Date(year, month - 1, day);

        return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
    }

    return parseServerKstDateTime(value);
}

function formatAssignmentDeadline(deadlineAt?: string | null, endDate?: string | null): string {
    const date = deadlineAt ? parseServerKstDateTime(deadlineAt) : parseAssignmentDate(endDate);

    if (!date) return "-";

    return `~${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date)}`;
}

function getSubmittedAssignmentCount(assignment: AssignmentResponse): number {
    return (assignment.participants ?? []).filter((participant) => (
        participant.status === "SUBMITTED" || participant.status === "LATE_SUBMITTED"
    )).length;
}

function toAssignmentSummary(assignment: AssignmentResponse): AssignmentSummary {
    return {
        id: assignment.assignmentId,
        title: assignment.name,
        deadlineText: formatAssignmentDeadline(assignment.deadlineAt, assignment.endDate),
        submittedCount: getSubmittedAssignmentCount(assignment),
        totalCount: assignment.participants?.length ?? 0,
    };
}

function formatAttendanceEventDate(value?: string | null): string {
    return formatServerKstDateTimeDateLabelForUser(value);
}

function getAttendanceEventTypeText(type: AttendanceEventResponse["type"], startText: string, endText: string): string {
    if (type === "CLASS_START") return startText;

    return endText;
}

function getComputedDashboardAttendanceProgress(item: Pick<AttendanceSummary, "progress" | "uploadWindowStart" | "uploadWindowEnd">, now: Date): AttendanceEventResponse["progress"] {
    const start = parseServerKstDateTime(item.uploadWindowStart);
    const end = parseServerKstDateTime(item.uploadWindowEnd);

    if (!start || !end) return item.progress;

    if (now.getTime() < start.getTime()) return "SCHEDULED";
    if (now.getTime() > end.getTime()) return "CLOSED";

    return "OPEN";
}

function getAttendanceSortTime(event: AttendanceEventResponse): number {
    const start = parseServerKstDateTime(event.uploadWindowStart);

    if (start) return start.getTime();

    const fallbackDate = new Date(`${event.eventDate}T00:00:00`);

    return Number.isNaN(fallbackDate.getTime()) ? 0 : fallbackDate.getTime();
}

function toAttendanceSummary(
    event: AttendanceEventResponse,
    detail: AttendanceEventDetailResponse | null,
    totalParticipantCount: number,
    startText: string,
    endText: string
): AttendanceSummary {
    const presentCount = detail?.records.filter((record) => record.status === "PRESENT").length ?? 0;

    return {
        id: event.eventId,
        date: formatAttendanceEventDate(event.scoreReferenceAt),
        eventTypeText: getAttendanceEventTypeText(event.type, startText, endText),
        presentCount,
        totalCount: totalParticipantCount,
        progress: event.progress,
        uploadWindowStart: event.uploadWindowStart,
        uploadWindowEnd: event.uploadWindowEnd,
        sortTime: getAttendanceSortTime(event),
    };
}

// function buildStudentInviteUrl(token: string): string {
//     return `${window.location.origin}/invite/external-activity/${encodeURIComponent(token)}`;
// }

// function getStudentInviteStatusLabel(status: ExternalActivityStudentInviteResponse["status"]): string {
//     if (status === "ACTIVE") return "사용 가능";
//     return "비활성화";
// }

// function formatInviteCreatedAt(value?: string | null): string {
//     if (!value) return "-";

//     const date = new Date(value);

//     if (Number.isNaN(date.getTime())) return value;

//     return date.toLocaleString("ko-KR", {
//         year: "numeric",
//         month: "2-digit",
//         day: "2-digit",
//         hour: "2-digit",
//         minute: "2-digit",
//     });
// }

function toTeamSummaries(
    activity: ExternalActivityResponse,
    teams: TeamResponse[],
    text: {
        leaderNotAssigned: string;
        noTeamMembers: string;
        andMorePerson: (count: number) => string;
    }
): TeamSummary[] {
    const teamAssignmentMap = new Map<number, TeamAssignmentSummary[]>();

    (activity.assignments ?? []).forEach((assignment) => {
        (assignment.participants ?? []).forEach((participant) => {
            if (participant.participantType !== "TEAM") return;
            if (typeof participant.teamId !== "number") return;

            const currentAssignments = teamAssignmentMap.get(participant.teamId) ?? [];
            const alreadyAdded = currentAssignments.some((item) => item.id === assignment.assignmentId);

            if (alreadyAdded) return;

            currentAssignments.push({
                id: assignment.assignmentId,
                name: assignment.name,
            });

            teamAssignmentMap.set(participant.teamId, currentAssignments);
        });
    });

    return teams
        .filter((team) => teamAssignmentMap.has(team.teamId))
        .map((team) => {
            const assignments = [...(teamAssignmentMap.get(team.teamId) ?? [])]
                .sort((a, b) => a.id - b.id);

            const leader = team.members.find((member) => member.role === "LEADER");
            const leaderName = leader?.userName ?? text.leaderNotAssigned;
            const memberCount = team.members.length;
            const memberNames = team.members.map((member) => member.userName);

            const memberText = memberCount === 0
                ? text.noTeamMembers
                : memberCount === 1
                    ? leaderName
                    : `${leaderName} ${text.andMorePerson(memberCount - 1)}`;

            return {
                id: team.teamId,
                name: team.name,
                leaderName,
                memberText,
                memberCount,
                memberNames,
                primaryAssignment: assignments[0] ?? null,
                extraAssignments: assignments.slice(1),
            };
        });
}

export default function EcaDashboardExActivity(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const {
        organization,
        organizationLoading,
        refreshManagedActivities,
    } = useOutletContext<EcaClientAdminOutletContext>();
    const [activity, setActivity] = React.useState<ExternalActivityResponse | null>(null);
    const [activityLoading, setActivityLoading] = React.useState(false);
    const [/*activityError*/, setActivityError] = React.useState("");
    const [deletingActivity, setDeletingActivity] = React.useState(false);

    const [dashboardMenuOpen, setDashboardMenuOpen] = React.useState(false);
    const dashboardMenuRef = React.useRef<HTMLDivElement | null>(null);

    const [assignments, setAssignments] = React.useState<AssignmentSummary[]>([]);
    const [assignmentLoading, setAssignmentLoading] = React.useState(false);
    const [assignmentError, setAssignmentError] = React.useState("");
    const [assignmentPage, setAssignmentPage] = React.useState(0);

    const [attendancePage, setAttendancePage] = React.useState(0);
    const [now, setNow] = React.useState(new Date());
    const [attendances, setAttendances] = React.useState<AttendanceSummary[]>([]);
    const [attendanceLoading, setAttendanceLoading] = React.useState(false);
    const [attendanceError, setAttendanceError] = React.useState("");
    
    const [participantInviteOpen, setParticipantInviteOpen] = React.useState(false);
    const [studentInvites, setStudentInvites] = React.useState<ExternalActivityStudentInviteResponse[]>([]);
    const [studentInviteLoading, setStudentInviteLoading] = React.useState(false);
    const [studentInviteCreating, setStudentInviteCreating] = React.useState(false);
    // const [studentInviteDisablingId, setStudentInviteDisablingId] = React.useState<number | null>(null);

    const [participants, setParticipants] = React.useState<Participant[]>([]);
    const [participantLoading, setParticipantLoading] = React.useState(false);
    const [/*participantError*/, setParticipantError] = React.useState("");
    const [dashboardTeams, setDashboardTeams] = React.useState<TeamSummary[]>([]);
    const [participantSearchOpen, setParticipantSearchOpen] = React.useState(false);
    const [participantSearchKeyword, setParticipantSearchKeyword] = React.useState("");
    const [selectedStudentProfile, setSelectedStudentProfile] = React.useState<AdminStudentProfile | null>(null);
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [teamSearchOpen, setTeamSearchOpen] = React.useState(false);
    const [teamSearchKeyword, /*setTeamSearchKeyword*/] = React.useState("");
    const teamSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [notices, setNotices] = React.useState<ExternalActivityNoticeResponse[]>([]);
    const [noticeLoading, setNoticeLoading] = React.useState(false);
    const [noticeError, setNoticeError] = React.useState("");
    const [noticeModalMode, setNoticeModalMode] = React.useState<NoticeModalMode | null>(null);
    const [selectedNotice, setSelectedNotice] = React.useState<ExternalActivityNoticeResponse | null>(null);
    const [noticeTitle, setNoticeTitle] = React.useState("");
    const [noticeContent, setNoticeContent] = React.useState("");
    const [noticeNewFiles, setNoticeNewFiles] = React.useState<File[]>([]);
    const [noticeKeepFileIds, setNoticeKeepFileIds] = React.useState<string[]>([]);
    const noticeFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [noticeSaving, setNoticeSaving] = React.useState(false);
    const [noticeDeleting, setNoticeDeleting] = React.useState(false);
    const [noticeSearchOpen, setNoticeSearchOpen] = React.useState(false);
    const [noticeSearchKeyword, setNoticeSearchKeyword] = React.useState("");
    const noticeSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const participantListRef = React.useRef<HTMLDivElement | null>(null);
    const teamListRef = React.useRef<HTMLDivElement | null>(null);
    const teamAssignmentMoreButtonRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());
    const [participantListScrollable, setParticipantListScrollable] = React.useState(false);
    const [/*teamListScrollable*/, setTeamListScrollable] = React.useState(false);
    const [openTeamAssignmentMoreId, setOpenTeamAssignmentMoreId] = React.useState<number | null>(null);
    const [/*teamAssignmentPopoverPosition*/, setTeamAssignmentPopoverPosition] = React.useState<{
        top: number;
        left: number;
    } | null>(null);

    React.useEffect(() => {
        async function fetchActivity(): Promise<void> {
            if (organizationLoading) return;

            if (!organization?.organizationId || !externalActivityId) {
                setActivityError(t(`${DASHBOARD_T}.programNotFound`));
                setAssignmentError(t(`${DASHBOARD_T}.assignmentLoadFailed`));
                setAttendanceError(t(`${DASHBOARD_T}.attendanceLoadFailed`));
                setParticipantError(t(`${DASHBOARD_T}.participantLoadFailed`));
                return;
            }

            setActivityLoading(true);
            setAttendanceLoading(true);
            setParticipantLoading(true);
            setAssignmentLoading(true);
            setActivityError("");
            setAttendanceError("");
            setParticipantError("");
            setAssignmentError("");

            try {
                const [activityData, teamData, assignmentData, attendanceEventData] = await Promise.all([
                    getExternalActivity(organization.organizationId, externalActivityId),
                    getExternalActivityTeams(externalActivityId),
                    getExternalActivityAssignments(externalActivityId),
                    getAttendanceEvents(externalActivityId),
                ]);

                const nextParticipants: Participant[] = (activityData.participants ?? [])
                    .flatMap((participant) => {
                        if (typeof participant.userId !== "number") {
                            return [];
                        }

                        const profileSource = participant as ExternalActivityParticipant & StudentProfileSource;

                        return [{
                            id: participant.userId,
                            name: participant.name?.trim() || t(`${DASHBOARD_T}.noName`),
                            school: participant.schoolName ?? t(`${DASHBOARD_T}.emptyValue`),
                            nickname: getStudentNickname(profileSource),
                            linkedinUrl: getStudentLinkedinUrl(profileSource),
                            profileImage: participant.profileImage ?? null,
                            status: "default" as const,
                        }];
                    });

                const attendanceDetailData = await Promise.all(
                    attendanceEventData.map((event) => (
                        getAttendanceEventDetail(event.eventId).catch(() => null)
                    ))
                );

                const nextAttendances = attendanceEventData.map((event, index) => (
                    toAttendanceSummary(
                        event,
                        attendanceDetailData[index],
                        nextParticipants.length,
                        t(`${DASHBOARD_T}.attendanceStart`),
                        t(`${DASHBOARD_T}.attendanceEnd`)
                    )
                ));

                setActivity(activityData);
                setParticipants(nextParticipants);
                setAssignments(assignmentData.map(toAssignmentSummary));
                setAttendances(nextAttendances);
                setDashboardTeams(toTeamSummaries(
                    { ...activityData, assignments: assignmentData },
                    teamData,
                    {
                        leaderNotAssigned: t(`${DASHBOARD_T}.leaderNotAssigned`),
                        noTeamMembers: t(`${DASHBOARD_T}.noTeamMembers`),
                        andMorePerson: (count) => t(`${DASHBOARD_T}.andMorePerson`, { count }),
                    }
                ));
                setAssignmentPage(0);
                setAttendancePage(0);
            } catch (e) {
                console.error(e);

                setActivity(null);
                setParticipants([]);
                setAssignments([]);
                setAttendances([]);
                setDashboardTeams([]);

                if (e instanceof ApiError) {
                    if (e.status === 404 || e.code === "EXTERNAL_ACTIVITY_NOT_FOUND") {
                        window.alert(t(`${DASHBOARD_T}.activityDeletedOrNotFound`));
                        navigate("/program-admin/home", { replace: true });
                        return;
                    }

                    if (e.status === 403 || e.code === "FORBIDDEN") {
                        window.alert(t(`${DASHBOARD_T}.accessDenied`));
                        navigate("/program-admin/home", { replace: true });
                        return;
                    }

                    if (e.status === 400) {
                        window.alert(e.message || t(`${DASHBOARD_T}.cannotLoadInfo`));
                        navigate("/program-admin/home", { replace: true });
                        return;
                    }
                }

                window.alert(t(`${DASHBOARD_T}.infoLoadFailed`));
                navigate("/program-admin/home", { replace: true });
            } finally {
                setActivityLoading(false);
                setAttendanceLoading(false);
                setParticipantLoading(false);
                setAssignmentLoading(false);
            }
        }

        fetchActivity();
    }, [organization?.organizationId, organizationLoading, externalActivityId, navigate, t, i18n.language]);

    const loadNotices = React.useCallback(async (): Promise<void> => {
        if (!externalActivityId) return;

        setNoticeLoading(true);
        setNoticeError("");

        try {
            const data = await getExternalActivityNotices(externalActivityId);

            setNotices(sortNotices(data));
        } catch (error) {
            console.error(error);
            setNotices([]);
            setNoticeError(t(`${DASHBOARD_T}.noticeLoadFailed`, {
                defaultValue: "공지사항을 불러오지 못했습니다.",
            }));
        } finally {
            setNoticeLoading(false);
        }
    }, [externalActivityId, t]);

    React.useEffect(() => {
        void loadNotices();
    }, [loadNotices]);

    React.useEffect(() => { // 대시보드 수정 모달 바깥 클릭 감지
        if (!dashboardMenuOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!dashboardMenuRef.current) return;
            if (dashboardMenuRef.current.contains(e.target as Node)) return;

            setDashboardMenuOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [dashboardMenuOpen]);

    React.useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    React.useEffect(() => { // 참가자 검색 모달 바깥 클릭 감지
        if (!participantSearchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!participantSearchWrapRef.current) return;
            if (participantSearchWrapRef.current.contains(e.target as Node)) return;

            setParticipantSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [participantSearchOpen]);

    React.useEffect(() => { // 팀 검색 모달 바깥 클릭 감지
        if (!teamSearchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!teamSearchWrapRef.current) return;
            if (teamSearchWrapRef.current.contains(e.target as Node)) return;

            setTeamSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [teamSearchOpen]);

    React.useEffect(() => { // 곰지 검색 모달 바깥 클릭 감지
        if (!noticeSearchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!noticeSearchWrapRef.current) return;
            if (noticeSearchWrapRef.current.contains(e.target as Node)) return;

            setNoticeSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [noticeSearchOpen]);

    React.useEffect(() => {
        if (openTeamAssignmentMoreId === null) return;

        function handleMouseDown(e: MouseEvent): void {
            const target = e.target as HTMLElement;

            if (
                target.closest(".eca-admin-dashboard-team-assignment-more-wrap") ||
                target.closest(".eca-admin-dashboard-team-assignment-popover")
            ) {
                return;
            }

            setOpenTeamAssignmentMoreId(null);
            setTeamAssignmentPopoverPosition(null);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [openTeamAssignmentMoreId]);

    React.useEffect(() => {
        if (openTeamAssignmentMoreId === null) return;

        const openedTeamId = openTeamAssignmentMoreId;

        function handlePopoverPositionChange(): void {
            window.requestAnimationFrame(() => {
                updateTeamAssignmentPopoverPosition(openedTeamId);
            });
        }

        window.addEventListener("resize", handlePopoverPositionChange);
        window.addEventListener("scroll", handlePopoverPositionChange, true);
        window.visualViewport?.addEventListener("resize", handlePopoverPositionChange);

        return () => {
            window.removeEventListener("resize", handlePopoverPositionChange);
            window.removeEventListener("scroll", handlePopoverPositionChange, true);
            window.visualViewport?.removeEventListener("resize", handlePopoverPositionChange);
        };
    }, [openTeamAssignmentMoreId]);

    const completedAssignmentCount = assignments.filter((assignment) => (
        assignment.totalCount > 0 && assignment.submittedCount >= assignment.totalCount
    )).length;

    const assignmentProgressRate = assignments.length === 0
        ? 0
        : Math.round((completedAssignmentCount / assignments.length) * 100);

    const assignmentPageCount = Math.max(1, Math.ceil(assignments.length / ASSIGNMENT_PAGE_SIZE));
    const visibleAssignments = assignments.slice(
        assignmentPage * ASSIGNMENT_PAGE_SIZE,
        assignmentPage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );
    const canMovePrevAssignmentPage = assignmentPage > 0;
    const canMoveNextAssignmentPage = assignmentPage < assignmentPageCount - 1;

    const orderedAttendances = [...attendances].sort((a, b) => {
    const aOpen = getComputedDashboardAttendanceProgress(a, now) === "OPEN";
    const bOpen = getComputedDashboardAttendanceProgress(b, now) === "OPEN";
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return b.sortTime - a.sortTime;
    });

    const attendancePageCount = Math.max(1, Math.ceil(orderedAttendances.length / ATTENDANCE_PAGE_SIZE));
    const visibleAttendances = orderedAttendances.slice(
        attendancePage * ATTENDANCE_PAGE_SIZE,
        attendancePage * ATTENDANCE_PAGE_SIZE + ATTENDANCE_PAGE_SIZE
    );
    const canMovePrevAttendancePage = attendancePage > 0;
    const canMoveNextAttendancePage = attendancePage < attendancePageCount - 1;

    // async function loadStudentInvites(): Promise<void> { // 초대코드 목록 조회
    //     if (!externalActivityId) return;

    //     setStudentInviteLoading(true);

    //     try {
    //         const data = await getExternalActivityStudentInvites(externalActivityId);
    //         setStudentInvites(data);
    //     } catch (error) {
    //         console.error(error);
    //         setStudentInvites([]);
    //         window.alert("참가자 초대코드 목록을 불러오지 못했습니다.");
    //     } finally {
    //         setStudentInviteLoading(false);
    //     }
    // }

    function openStudentProfile(participant: Participant): void {
        setSelectedStudentProfile({
            name: participant.name,
            nickname: participant.nickname ?? null,
            linkedinUrl: participant.linkedinUrl ?? null,
            profileImage: participant.profileImage ?? null,
        });
    }

    async function openParticipantInviteModal(): Promise<void> {
        if (!externalActivityId) return;

        setParticipantInviteOpen(true);
        setStudentInviteLoading(true);

        try {
            const data = await getExternalActivityStudentInvites(externalActivityId);

            if (data.length > 0) {
                setStudentInvites(data);
                return;
            }

            const created = await createExternalActivityStudentInvite(externalActivityId);
            setStudentInvites([created]);
        } catch (error) {
            console.error(error);
            setStudentInvites([]);
            window.alert(t(`${DASHBOARD_T}.inviteLoadFailed`));
        } finally {
            setStudentInviteLoading(false);
        }
    }

    async function handleCreateStudentInvite(): Promise<void> {
        if (!externalActivityId || studentInviteCreating) return;

        setStudentInviteCreating(true);

        try {
            const created = await createExternalActivityStudentInvite(externalActivityId);

            setStudentInvites((prev) => [created, ...prev]);

            try {
                await navigator.clipboard.writeText(created.code);
                window.alert(t(`${DASHBOARD_T}.inviteCreatedAndCopied`));
            } catch {
                window.alert(t(`${DASHBOARD_T}.inviteCreated`));
            }
        } catch (error) {
            console.error(error);

            if (error instanceof ApiError) {
                window.alert(error.message || t(`${DASHBOARD_T}.inviteCreateFailed`));
                return;
            }

            window.alert(t(`${DASHBOARD_T}.inviteCreateFailed`));
        } finally {
            setStudentInviteCreating(false);
        }
    }

    async function handleCopyStudentInvite(invite: ExternalActivityStudentInviteResponse): Promise<void> {
        try {
            await navigator.clipboard.writeText(invite.code);
            window.alert(t(`${DASHBOARD_T}.inviteCopyDone`));
        } catch (error) {
            console.error(error);
            window.alert(t(`${DASHBOARD_T}.inviteCopyFailed`));
        }
    }
    
    // async function handleDisableStudentInvite(invite: ExternalActivityStudentInviteResponse): Promise<void> {
    //     if (!externalActivityId || invite.status !== "ACTIVE" || studentInviteDisablingId !== null) return;

    //     const confirmed = window.confirm("이 참가자 초대코드를 비활성화하시겠습니까?");

    //     if (!confirmed) return;

    //     setStudentInviteDisablingId(invite.externalActivityStudentInviteId);

    //     try {
    //         await disableExternalActivityStudentInvite(
    //             externalActivityId,
    //             invite.externalActivityStudentInviteId
    //         );

    //         setStudentInvites((prev) => prev.map((item) => (
    //             item.externalActivityStudentInviteId === invite.externalActivityStudentInviteId
    //                 ? { ...item, status: "DISABLED" }
    //                 : item
    //         )));
    //     } catch (error) {
    //         console.error(error);

    //         if (error instanceof ApiError) {
    //             window.alert(error.message || "참가자 초대코드 비활성화에 실패했습니다.");
    //             return;
    //         }

    //         window.alert("참가자 초대코드 비활성화에 실패했습니다.");
    //     } finally {
    //         setStudentInviteDisablingId(null);
    //     }
    // }

    function closeNoticeModal(): void {
        if (noticeSaving || noticeDeleting) return;

        setNoticeModalMode(null);
        setSelectedNotice(null);
        setNoticeTitle("");
        setNoticeContent("");
        setNoticeNewFiles([]);
        setNoticeKeepFileIds([]);
    }

    function openCreateNoticeModal(): void {
        setSelectedNotice(null);
        setNoticeTitle("");
        setNoticeContent("");
        setNoticeNewFiles([]);
        setNoticeKeepFileIds([]);
        setNoticeModalMode("create");
    }

    function openNoticeDetail(notice: ExternalActivityNoticeResponse): void {
        setSelectedNotice(notice);
        setNoticeModalMode("detail");
    }

    function openNoticeEdit(): void {
        if (!selectedNotice) return;

        setNoticeTitle(selectedNotice.title);
        setNoticeContent(selectedNotice.content);
        setNoticeNewFiles([]);
        setNoticeKeepFileIds(
            (selectedNotice.files ?? []).map((file) => file.fileId)
        );
        setNoticeModalMode("edit");
    }

    function handleNoticeFileChange(
        e: React.ChangeEvent<HTMLInputElement>
    ): void {
        const selectedFiles = Array.from(e.target.files ?? []);

        if (selectedFiles.length === 0) return;

        setNoticeNewFiles((prev) => {
            const fileMap = new Map<string, File>();

            [...prev, ...selectedFiles].forEach((file) => {
                const key = `${file.name}-${file.size}-${file.lastModified}`;

                fileMap.set(key, file);
            });

            return Array.from(fileMap.values());
        });

        e.target.value = "";
    }

    function removeNoticeNewFile(targetFile: File): void {
        setNoticeNewFiles((prev) => prev.filter((file) => (
            file !== targetFile
        )));
    }

    function removeNoticeExistingFile(fileId: string): void {
        setNoticeKeepFileIds((prev) => prev.filter((keepFileId) => (
            keepFileId !== fileId
        )));
    }

    async function handleSaveNotice(): Promise<void> {
        if (!externalActivityId || noticeSaving) return;

        const title = noticeTitle.trim();
        const content = noticeContent.trim();

        if (!title) {
            window.alert(t(`${DASHBOARD_T}.noticeTitleRequired`, {
                defaultValue: "공지 제목을 입력해주세요.",
            }));
            return;
        }

        if (!content) {
            window.alert(t(`${DASHBOARD_T}.noticeContentRequired`, {
                defaultValue: "공지 내용을 입력해주세요.",
            }));
            return;
        }

        setNoticeSaving(true);

        try {
            if (noticeModalMode === "edit" && selectedNotice) {
                const updatedNotice = await updateExternalActivityNotice(
                    externalActivityId,
                    selectedNotice.noticeId,
                    {
                        title,
                        content,
                        files: noticeNewFiles,
                        keepFileIds: noticeKeepFileIds,
                    }
                );

                setNotices((prev) => prev.map((notice) => (
                    notice.noticeId === updatedNotice.noticeId
                        ? updatedNotice
                        : notice
                )));

                setSelectedNotice(updatedNotice);
            } else {
                const createdNotice = await createExternalActivityNotice(externalActivityId, {
                    title,
                    content,
                    files: noticeNewFiles,
                });

                setNotices((prev) => sortNotices([createdNotice, ...prev]));
            }

            setNoticeModalMode(null);
            setSelectedNotice(null);
            setNoticeTitle("");
            setNoticeContent("");
            setNoticeNewFiles([]);
            setNoticeKeepFileIds([]);
        } catch (error) {
            console.error(error);
            window.alert(t(`${DASHBOARD_T}.noticeSaveFailed`, {
                defaultValue: "공지사항 저장에 실패했습니다.",
            }));
        } finally {
            setNoticeSaving(false);
        }
    }

    async function handleDeleteNotice(): Promise<void> {
        if (!externalActivityId || !selectedNotice || noticeDeleting) return;

        const confirmed = window.confirm(t(`${DASHBOARD_T}.confirmDeleteNotice`, {
            defaultValue: "이 공지사항을 삭제하시겠습니까?",
        }));

        if (!confirmed) return;

        setNoticeDeleting(true);

        try {
            await deleteExternalActivityNotice(externalActivityId, selectedNotice.noticeId);

            setNotices((prev) => prev.filter((notice) => (
                notice.noticeId !== selectedNotice.noticeId
            )));
            setNoticeModalMode(null);
            setSelectedNotice(null);
        } catch (error) {
            console.error(error);
            window.alert(t(`${DASHBOARD_T}.noticeDeleteFailed`, {
                defaultValue: "공지사항 삭제에 실패했습니다.",
            }));
        } finally {
            setNoticeDeleting(false);
        }
    }

    async function handleDeleteActivity(): Promise<void> {
        if (!organization?.organizationId || !externalActivityId || deletingActivity) {
            return;
        }

        const confirmed = window.confirm(t(`${DASHBOARD_T}.confirmDeleteActivity`));

        if (!confirmed) {
            return;
        }

        setDeletingActivity(true);
        setDashboardMenuOpen(false);

        try {
            await deleteExternalActivity(organization.organizationId, externalActivityId);
            await refreshManagedActivities();
            navigate("/program-admin/home");
        } catch (error) {
            console.error(error);
            window.alert(t(`${DASHBOARD_T}.activityDeleteFailed`));
        } finally {
            setDeletingActivity(false);
        }
    }

    function moveToEditActivity(): void {
        if (!externalActivityId) return;

        setDashboardMenuOpen(false);
        navigate(`/program-admin/activities/${externalActivityId}/edit`);
    }

    function createAssignment(): void {
        if (!externalActivityId) return;

        navigate(`/program-admin/activities/${externalActivityId}/assignment/new`);
    }
    function openAssignmentDetail(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/program-admin/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    function openAttendanceDetail(eventId: number): void {
        if (!externalActivityId) return;

        navigate(`/program-admin/activities/${externalActivityId}/attendance/${eventId}`);
    }

    function movePrevAssignmentPage(): void {
        setAssignmentPage((prev) => Math.max(0, prev - 1));
    }

    function moveNextAssignmentPage(): void {
        setAssignmentPage((prev) => Math.min(assignmentPageCount - 1, prev + 1));
    }

    function movePrevAttendancePage(): void {
        setAttendancePage((prev) => Math.max(0, prev - 1));
    }

    function moveNextAttendancePage(): void {
        setAttendancePage((prev) => Math.min(attendancePageCount - 1, prev + 1));
    }

    const isReadOnly = activity?.manageableByMe === false;
    const activityStatus = getCalculatedActivityStatus(activity);
    const filteredParticipants = participants.filter((participant) => {
        const keyword = participantSearchKeyword.trim().toLowerCase();

        if (!keyword) return true;

        return (
            participant.name.toLowerCase().includes(keyword) ||
            participant.school.toLowerCase().includes(keyword)
        );
    });
   
    const filteredTeams = dashboardTeams.filter((team) => {
        const keyword = teamSearchKeyword.trim().toLowerCase();

        if (!keyword) return true;

        return (
            team.name.toLowerCase().includes(keyword) ||
            team.leaderName.toLowerCase().includes(keyword) ||
            team.memberNames.some((memberName) => memberName.toLowerCase().includes(keyword)) ||
            team.primaryAssignment?.name.toLowerCase().includes(keyword) ||
            team.extraAssignments.some((assignment) => assignment.name.toLowerCase().includes(keyword))
        );
    });

    const filteredNotices = notices.filter((notice) => {
        const keyword = noticeSearchKeyword.trim().toLowerCase();

        if (!keyword) return true;

        return (
            notice.title.toLowerCase().includes(keyword) ||
            notice.content.toLowerCase().includes(keyword)
        );
    });

    const noticeLocale = i18n.resolvedLanguage?.startsWith("ko")
        ? "ko-KR"
        : "en-US";
        
    function updateRightListScrollableState(): void {
        const participantList = participantListRef.current;
        const teamList = teamListRef.current;

        setParticipantListScrollable(
            participantList ? participantList.scrollHeight > 210 : false
        );

        setTeamListScrollable(
            teamList ? teamList.scrollHeight > 210 : false
        );
    }

    function updateTeamAssignmentPopoverPosition(teamId: number): void {
        const button = teamAssignmentMoreButtonRefs.current.get(teamId);

        if (!button) {
            setOpenTeamAssignmentMoreId(null);
            setTeamAssignmentPopoverPosition(null);
            return;
        }

        const moreWrap = button.closest(".eca-admin-dashboard-team-assignment-more-wrap");

        if (!(moreWrap instanceof HTMLElement)) {
            setOpenTeamAssignmentMoreId(null);
            setTeamAssignmentPopoverPosition(null);
            return;
        }

        const buttonRect = button.getBoundingClientRect();
        const wrapRect = moreWrap.getBoundingClientRect();

        setTeamAssignmentPopoverPosition({
            top: buttonRect.bottom + 4,
            left: wrapRect.left + 5,
        });
    }
 
    // function toggleTeamAssignmentPopover(teamId: number): void {
    //     if (openTeamAssignmentMoreId === teamId) {
    //         setOpenTeamAssignmentMoreId(null);
    //         setTeamAssignmentPopoverPosition(null);
    //         return;
    //     }

    //     setOpenTeamAssignmentMoreId(teamId);
    //     updateTeamAssignmentPopoverPosition(teamId);
    // }

    React.useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            updateRightListScrollableState();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [filteredParticipants.length, filteredTeams.length, participantSearchKeyword, teamSearchKeyword]);

    return (
        <div className="eca-admin-dashboard-detail-page">
            <div className="eca-admin-dashboard-detail-head">
                <h1>{activityLoading ? "" : activity?.name ?? t(`${DASHBOARD_T}.activityFallback`)}</h1>
                {!isReadOnly ? (
                    <div className="eca-admin-dashboard-menu-wrap" ref={dashboardMenuRef}>
                        <button type="button" className="eca-admin-dashboard-more-button" aria-label={t(`${DASHBOARD_T}.more`)} onClick={() => setDashboardMenuOpen((prev) => !prev)} >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12C4 12.2652 4.10536 12.5196 4.29289 12.7071C4.48043 12.8946 4.73478 13 5 13C5.26522 13 5.51957 12.8946 5.70711 12.7071C5.89464 12.5196 6 12.2652 6 12C6 11.7348 5.89464 11.4804 5.70711 11.2929C5.51957 11.1054 5.26522 11 5 11C4.73478 11 4.48043 11.1054 4.29289 11.2929C4.10536 11.4804 4 11.7348 4 12ZM11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12ZM18 12C18 12.2652 18.1054 12.5196 18.2929 12.7071C18.4804 12.8946 18.7348 13 19 13C19.2652 13 19.5196 12.8946 19.7071 12.7071C19.8946 12.5196 20 12.2652 20 12C20 11.7348 19.8946 11.4804 19.7071 11.2929C19.5196 11.1054 19.2652 11 19 11C18.7348 11 18.4804 11.1054 18.2929 11.2929C18.1054 11.4804 18 11.7348 18 12Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {dashboardMenuOpen ? (
                            <div className="eca-admin-dashboard-menu">
                                <button type="button" onClick={handleDeleteActivity} disabled={deletingActivity}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#808080"/>
                                    </svg>
                                    <span>{deletingActivity ? t(`${DASHBOARD_T}.deleteInProgress`) : t(`${DASHBOARD_T}.deleteAction`)}</span>
                                </button>

                                <button type="button" onClick={moveToEditActivity}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10.5 2.82843L14.5 6.82843M1 16.3284H5L15.5 5.82843C15.7626 5.56578 15.971 5.25398 16.1131 4.91082C16.2553 4.56766 16.3284 4.19986 16.3284 3.82843C16.3284 3.45699 16.2553 3.0892 16.1131 2.74604C15.971 2.40287 15.7626 2.09107 15.5 1.82843C15.2374 1.56578 14.9256 1.35744 14.5824 1.2153C14.2392 1.07316 13.8714 1 13.5 1C13.1286 1 12.7608 1.07316 12.4176 1.2153C12.0744 1.35744 11.7626 1.56578 11.5 1.82843L1 12.3284V16.3284Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>{t(`${DASHBOARD_T}.editAction`)}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <section className="eca-admin-dashboard-summary-grid">
                <article className="eca-admin-dashboard-summary-card">
                    <div className="eca-admin-dashboard-summary-top">
                        <span>{t(`${DASHBOARD_T}.classProgress`)}</span>
                        <span className={`eca-admin-dashboard-status-badge eca-admin-dashboard-status--${activityStatus}`}>
                            {t(`${DASHBOARD_T}.status.${getActivityStatusLabel(activityStatus)}`)}
                        </span>
                    </div>
                    <strong>{assignmentProgressRate}%</strong>
                </article>

                <article className="eca-admin-dashboard-summary-card">
                    <span>{t(`${DASHBOARD_T}.assignmentSubmission`)}</span>
                    <strong>{assignmentProgressRate}%</strong>
                </article>

                <article className="eca-admin-dashboard-summary-card">
                    <span>{t(`${DASHBOARD_T}.totalParticipants`)}</span>
                    <strong>{t(`${DASHBOARD_T}.personCount`, { count: participants.length })}</strong>
                </article>
            </section>

            <div className="eca-admin-dashboard-main-grid">
                <div className="eca-admin-dashboard-left-column">
                    <section className="eca-admin-dashboard-panel-left">
                        <div className="eca-admin-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.assignmentPanelTitle`, { completed: completedAssignmentCount, total: assignments.length })}</h2>
                            <div className="eca-admin-dashboard-panel-actions">
                                {!isReadOnly ? (
                                    <button type="button" aria-label={t(`${DASHBOARD_T}.createAssignmentAria`)} className="eca-admin-dashboard-assignment-create" onClick={createAssignment}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M11 13H6C5.71667 13 5.47934 12.904 5.288 12.712C5.09667 12.52 5.00067 12.2827 5 12C4.99934 11.7173 5.09534 11.48 5.288 11.288C5.48067 11.096 5.718 11 6 11H11V6C11 5.71667 11.096 5.47934 11.288 5.288C11.48 5.09667 11.7173 5.00067 12 5C12.2827 4.99934 12.5203 5.09534 12.713 5.288C12.9057 5.48067 13.0013 5.718 13 6V11H18C18.2833 11 18.521 11.096 18.713 11.288C18.905 11.48 19.0007 11.7173 19 12C18.9993 12.2827 18.9033 12.5203 18.712 12.713C18.5207 12.9057 18.2833 13.0013 18 13H13V18C13 18.2833 12.904 18.521 12.712 18.713C12.52 18.905 12.2827 19.0007 12 19C11.7173 18.9993 11.48 18.9033 11.288 18.712C11.096 18.5207 11 18.2833 11 18V13Z" fill="#808080" />
                                        </svg>
                                    </button>
                                ) : null}
                                <button type="button" aria-label={t(`${DASHBOARD_T}.prev`)} className="eca-admin-dashboard-assignment-prev" onClick={movePrevAssignmentPage} disabled={!canMovePrevAssignmentPage} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button type="button" aria-label={t(`${DASHBOARD_T}.next`)} onClick={moveNextAssignmentPage} disabled={!canMoveNextAssignmentPage} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="eca-admin-dashboard-list-left">
                            {assignmentLoading ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.assignmentLoading`)}</p>
                            ) : assignmentError ? (
                                <p className="eca-admin-dashboard-empty">{assignmentError}</p>
                            ) : assignments.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noAssignments`)}</p>
                            ) : (
                                visibleAssignments.map((item) => {
                                    const isCompleted = item.totalCount > 0 && item.submittedCount >= item.totalCount;

                                    return (
                                        <button type="button" className="eca-admin-dashboard-assignment-row" key={item.id} onClick={() => openAssignmentDetail(item.id)}>
                                            <span className="eca-admin-dashboard-assignment-title">{item.title}</span>
                                            <span className="eca-admin-dashboard-assignment-deadline">{item.deadlineText}</span>
                                            <span className={"eca-admin-dashboard-count-badge" + (isCompleted ? "" : " eca-admin-dashboard-count-badge--danger")}>
                                                {item.submittedCount}/{item.totalCount}
                                            </span>
                                            <span className="eca-admin-dashboard-row-arrow">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="eca-admin-dashboard-panel-left">
                        <div className="eca-admin-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.attendancePanelTitle`)}</h2>
                            <div className="eca-admin-dashboard-panel-actions">
                                <button type="button" aria-label={t(`${DASHBOARD_T}.prev`)} className="eca-admin-dashboard-assignment-prev" onClick={movePrevAttendancePage} disabled={!canMovePrevAttendancePage} > 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button type="button" aria-label={t(`${DASHBOARD_T}.next`)} onClick={moveNextAttendancePage} disabled={!canMoveNextAttendancePage} > 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="eca-admin-dashboard-list-left">
                            {attendanceLoading ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.attendanceLoading`)}</p>
                            ) : attendanceError ? (
                                <p className="eca-admin-dashboard-empty">{attendanceError}</p>
                            ) : attendances.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noAttendanceEvents`)}</p>
                            ) : (
                                visibleAttendances.map((item) => (
                                    <button type="button" className="eca-admin-dashboard-attendance-row" key={item.id} onClick={() => openAttendanceDetail(item.id)}>
                                        <strong>{item.date}</strong>
                                        <span>{item.eventTypeText}</span>
                                        <span>
                                            <b>{item.presentCount}</b> / {item.totalCount}
                                        </span>
                                        <span className="eca-admin-dashboard-row-arrow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <aside className="eca-admin-dashboard-right-column">
                    <section className={"eca-admin-dashboard-panel-right eca-admin-dashboard-side-panel"  + (participantListScrollable ? " is-scrollable" : "")}>
                        <div className="eca-admin-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.participantsTitle`, { count: filteredParticipants.length })}</h2>

                            <div className="eca-admin-dashboard-panel-actions">
                                {!isReadOnly ? (
                                    <button type="button" aria-label={t(`${DASHBOARD_T}.addParticipantAria`)} className="eca-admin-dashboard-participant-add" onClick={() => void openParticipantInviteModal()}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M11 13H6C5.71667 13 5.47934 12.904 5.288 12.712C5.09667 12.52 5.00067 12.2827 5 12C4.99934 11.7173 5.09534 11.48 5.288 11.288C5.48067 11.096 5.718 11 6 11H11V6C11 5.71667 11.096 5.47934 11.288 5.288C11.48 5.09667 11.7173 5.00067 12 5C12.2827 4.99934 12.5203 5.09534 12.713 5.288C12.9057 5.48067 13.0013 5.718 13 6V11H18C18.2833 11 18.521 11.096 18.713 11.288C18.905 11.48 19.0007 11.7173 19 12C18.9993 12.2827 18.9033 12.5203 18.712 12.713C18.5207 12.9057 18.2833 13.0013 18 13H13V18C13 18.2833 12.904 18.521 12.712 18.713C12.52 18.905 12.2827 19.0007 12 19C11.7173 18.9993 11.48 18.9033 11.288 18.712C11.096 18.5207 11 18.2833 11 18V13Z" fill="#808080" />
                                        </svg>
                                    </button>
                                ) : null}

                                <div className="eca-admin-dashboard-search-wrap" ref={participantSearchWrapRef}>
                                    <button type="button" className="eca-admin-dashboard-participant-search" aria-label={t(`${DASHBOARD_T}.searchParticipantAria`)} onClick={() => setParticipantSearchOpen((prev) => !prev)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                        </svg>
                                    </button>

                                    {participantSearchOpen ? (
                                        <div className="eca-admin-dashboard-search-popover">
                                            <input
                                                className="eca-admin-dashboard-search-input"
                                                value={participantSearchKeyword}
                                                onChange={(e) => setParticipantSearchKeyword(e.target.value)}
                                                autoFocus
                                            />
                                            <button type="button" className="eca-admin-dashboard-search-reset" onClick={() => setParticipantSearchKeyword("")} >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="eca-admin-dashboard-list-right"  ref={participantListRef}>
                            {participantLoading ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.participantLoading`)}</p>
                            ) : participants.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noParticipants`)}</p>
                            ) : filteredParticipants.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noSearchResults`)}</p>
                            ) : (
                                filteredParticipants.map((item) => (
                                    <div
                                        className="eca-admin-dashboard-person-row"
                                        key={item.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openStudentProfile(item)}
                                        onKeyDown={(event) => {
                                            if (event.key !== "Enter" && event.key !== " ") return;

                                            event.preventDefault();
                                            openStudentProfile(item);
                                        }}
                                    >
                                        <span className="eca-admin-dashboard-avatar-wrap">
                                            <img
                                                className="eca-admin-dashboard-avatar"
                                                src={item.profileImage || "/internie_mascot_normal.png"}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                }}
                                            />
                                            {item.status === "active" ? <span className="eca-admin-dashboard-active-dot" /> : null}
                                        </span>
                                        <span className="eca-admin-dashboard-person-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.school}</span>
                                        </span>
                                        {/* <button type="button" className="eca-admin-dashboard-send-message" onClick={(event) => event.stopPropagation()}>
                                            <img src="/icons/send_message_a0.svg" className="eca-admin-dashboard-send-icon" alt="" />
                                        </button> */}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* <section className={"eca-admin-dashboard-panel-right eca-admin-dashboard-side-panel" + (teamListScrollable ? " is-scrollable" : "")}>
                        <div className="eca-admin-dashboard-panel-head">
                            <h2>{t(`${DASHBOARD_T}.teamsTitle`, { count: filteredTeams.length })}</h2>

                            <div className="eca-admin-dashboard-search-wrap" ref={teamSearchWrapRef}>
                                <button type="button" className="eca-admin-dashboard-search-button" aria-label={t(`${DASHBOARD_T}.searchTeamAria`)} onClick={() => setTeamSearchOpen((prev) => !prev)} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                    </svg>
                                </button>

                                {teamSearchOpen ? (
                                    <div className="eca-admin-dashboard-search-popover">
                                        <input
                                            className="eca-admin-dashboard-search-input"
                                            value={teamSearchKeyword}
                                            onChange={(e) => setTeamSearchKeyword(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="button" className="eca-admin-dashboard-search-reset" onClick={() => setTeamSearchKeyword("")} >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-admin-dashboard-list-right" ref={teamListRef}>
                            {dashboardTeams.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noTeams`)}</p>
                            ) : filteredTeams.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">{t(`${DASHBOARD_T}.noSearchResults`)}</p>
                            ) : (
                                filteredTeams.map((item) => (
                                    <div className="eca-admin-dashboard-team-row" key={item.id}>
                                        <span className="eca-admin-dashboard-avatar-wrap">
                                            <img
                                                className="eca-admin-dashboard-avatar"
                                                src="/internie_mascot_normal.png"
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                }}
                                            />
                                        </span>

                                        <span className="eca-admin-dashboard-team-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.memberText}</span>
                                        </span>

                                        <div className="eca-admin-dashboard-team-assignment-area">
                                            {item.primaryAssignment ? (
                                                <span className="eca-admin-dashboard-team-assignment-badge">
                                                    {item.primaryAssignment.name}
                                                </span>
                                            ) : null}

                                            {item.extraAssignments.length > 0 ? (
                                                <div className="eca-admin-dashboard-team-assignment-more-wrap">
                                                    <button
                                                        type="button"
                                                        ref={(node) => {
                                                            if (node) {
                                                                teamAssignmentMoreButtonRefs.current.set(item.id, node);
                                                            } else {
                                                                teamAssignmentMoreButtonRefs.current.delete(item.id);
                                                            }
                                                        }}
                                                        className="eca-admin-dashboard-team-assignment-more-button"
                                                        onClick={() => toggleTeamAssignmentPopover(item.id)}
                                                    >
                                                        <span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M3 5C2.45 5 2 5.45 2 6C2 6.55 2.45 7 3 7C3.55 7 4 6.55 4 6C4 5.45 3.55 5 3 5ZM9 5C8.45 5 8 5.45 8 6C8 6.55 8.45 7 9 7C9.55 7 10 6.55 10 6C10 5.45 9.55 5 9 5ZM6 5C5.45 5 5 5.45 5 6C5 6.55 5.45 7 6 7C6.55 7 7 6.55 7 6C7 5.45 6.55 5 6 5Z" fill="black"/>
                                                            </svg>
                                                        </span>
                                                        <em>{t(`${DASHBOARD_T}.more`)}</em>
                                                    </button>
                                                    {openTeamAssignmentMoreId === item.id && teamAssignmentPopoverPosition ? (
                                                        createPortal(
                                                            <div
                                                                className="eca-admin-dashboard-team-assignment-popover"
                                                                style={{
                                                                    top: teamAssignmentPopoverPosition.top,
                                                                    left: teamAssignmentPopoverPosition.left,
                                                                }}
                                                            >
                                                                {item.extraAssignments.map((assignment) => (
                                                                    <span
                                                                        key={assignment.id}
                                                                        className="eca-admin-dashboard-team-assignment-popover-badge"
                                                                    >
                                                                        {assignment.name}
                                                                    </span>
                                                                ))}
                                                            </div>,
                                                            document.body
                                                        )
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section> */}
                    <section className="eca-admin-dashboard-panel-right eca-admin-dashboard-side-panel eca-admin-dashboard-notice-panel">
                        <div className="eca-admin-dashboard-panel-head">
                            <h2>
                                {t(`${DASHBOARD_T}.noticeTitle`, {
                                    defaultValue: "Notice",
                                })} ({notices.length})
                            </h2>

                            <div className="eca-admin-dashboard-search-wrap" ref={noticeSearchWrapRef}>
                                <div className="eca-admin-dashboard-panel-actions">
                                    {!isReadOnly ? (
                                        <button type="button" className="eca-admin-dashboard-notice-create-button" aria-label={t(`${DASHBOARD_T}.createNoticeAria`, { defaultValue: "공지 작성" })} onClick={openCreateNoticeModal}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M11 13H6C5.71667 13 5.47934 12.904 5.288 12.712C5.09667 12.52 5.00067 12.2827 5 12C4.99934 11.7173 5.09534 11.48 5.288 11.288C5.48067 11.096 5.718 11 6 11H11V6C11 5.71667 11.096 5.47934 11.288 5.288C11.48 5.09667 11.7173 5.00067 12 5C12.2827 4.99934 12.5203 5.09534 12.713 5.288C12.9057 5.48067 13.0013 5.718 13 6V11H18C18.2833 11 18.521 11.096 18.713 11.288C18.905 11.48 19.0007 11.7173 19 12C18.9993 12.2827 18.9033 12.5203 18.712 12.713C18.5207 12.9057 18.2833 13.0013 18 13H13V18C13 18.2833 12.904 18.521 12.712 18.713C12.52 18.905 12.2827 19.0007 12 19C11.7173 18.9993 11.48 18.9033 11.288 18.712C11.096 18.5207 11 18.2833 11 18V13Z" fill="#808080" />
                                            </svg>
                                        </button>
                                    ) : null}

                                    <button type="button" className="eca-admin-dashboard-notice-search-button" aria-label={t(`${DASHBOARD_T}.searchNoticeAria`, { defaultValue: "공지 검색" })} onClick={() => setNoticeSearchOpen((prev) => !prev)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                            <path d="M11.9767 10.5397H11.2199L10.9516 10.281C11.5503 9.58544 11.9879 8.76614 12.233 7.88173C12.4781 6.99732 12.5247 6.06966 12.3695 5.16514C11.9192 2.50183 9.69661 0.37501 7.01413 0.0492806C6.07107 -0.0700265 5.1132 0.0279852 4.21385 0.335816C3.31449 0.643646 2.49746 1.15314 1.8253 1.8253C1.15314 2.49746 0.643646 3.31449 0.335816 4.21385C0.0279852 5.1132 -0.0700265 6.07107 0.0492806 7.01413C0.37501 9.69661 2.50183 11.9192 5.16514 12.3695C6.06966 12.5247 6.99732 12.4781 7.88173 12.233C8.76614 11.9879 9.58544 11.5503 10.281 10.9516L10.5397 11.2199V11.9767L14.6113 16.0483C15.0041 16.4411 15.6459 16.4411 16.0387 16.0483C16.4315 15.6555 16.4315 15.0137 16.0387 14.6209L11.9767 10.5397ZM6.22855 10.5397C3.84306 10.5397 1.91743 8.61404 1.91743 6.22855C1.91743 3.84306 3.84306 1.91743 6.22855 1.91743C8.61404 1.91743 10.5397 3.84306 10.5397 6.22855C10.5397 8.61404 8.61404 10.5397 6.22855 10.5397Z" fill="#A0A0A0"/>
                                        </svg>
                                    </button>
                                </div>

                                {noticeSearchOpen ? (
                                    <div className="eca-admin-dashboard-search-popover">
                                        <input
                                            className="eca-admin-dashboard-search-input"
                                            value={noticeSearchKeyword}
                                            onChange={(e) => setNoticeSearchKeyword(e.target.value)}
                                            autoFocus
                                        />

                                        <button type="button" className="eca-admin-dashboard-search-reset" onClick={() => setNoticeSearchKeyword("")}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-admin-dashboard-notice-list">
                            {noticeLoading ? (
                                <p className="eca-admin-dashboard-empty">
                                    {t(`${DASHBOARD_T}.noticeLoading`, {
                                        defaultValue: "공지사항을 불러오는 중입니다.",
                                    })}
                                </p>
                            ) : noticeError ? (
                                <p className="eca-admin-dashboard-empty">{noticeError}</p>
                            ) : notices.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">
                                    {t(`${DASHBOARD_T}.noNotices`, {
                                        defaultValue: "등록된 공지사항이 없습니다.",
                                    })}
                                </p>
                            ) : filteredNotices.length === 0 ? (
                                <p className="eca-admin-dashboard-empty">
                                    {t(`${DASHBOARD_T}.noSearchResults`)}
                                </p>
                            ) : (
                                filteredNotices.map((notice) => (
                                    <button type="button" className="eca-admin-dashboard-notice-row" key={notice.noticeId} onClick={() => openNoticeDetail(notice)}>
                                        <span className="eca-admin-dashboard-notice-row-text">
                                            <strong>{notice.title}</strong>
                                            <small>{formatNoticeDate(notice.createdAt, noticeLocale)}</small>
                                        </span>

                                        {isNoticeNew(notice.createdAt, now) ? (
                                            <em>New</em>
                                        ) : null}
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                </aside>
            </div>

            {noticeModalMode === "create" || noticeModalMode === "edit" ? (
                createPortal(
                    <div className="eca-admin-dashboard-notice-modal-backdrop" onMouseDown={closeNoticeModal}>
                        <div className="eca-admin-dashboard-notice-form-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                            <div className="eca-admin-dashboard-notice-modal-head">
                                <h3>Notice</h3>

                                <button type="button" onClick={closeNoticeModal} aria-label={t("common.close")} disabled={noticeSaving}>
                                    <img src="/icons/x-01.svg" alt=""/>
                                </button>
                            </div>

                            <form className="eca-admin-dashboard-notice-form" onSubmit={(e) => {
                                e.preventDefault();
                                void handleSaveNotice();
                            }}>
                                <label>
                                    <strong>Title</strong>
                                    <input
                                        type="text"
                                        value={noticeTitle}
                                        onChange={(e) => setNoticeTitle(e.target.value)}
                                        maxLength={200}
                                        placeholder={t(`${DASHBOARD_T}.noticeTitlePlaceholder`, {
                                            defaultValue: "공지 제목을 입력해주세요.",
                                        })}
                                    />
                                </label>

                                <label>
                                    <strong>Content</strong>

                                    <span className="eca-admin-dashboard-notice-textarea-wrap">
                                        <textarea
                                            value={noticeContent}
                                            onChange={(e) => setNoticeContent(e.target.value)}
                                            maxLength={3000}
                                            placeholder={t(`${DASHBOARD_T}.noticeContentPlaceholder`, {
                                                defaultValue: "공지 내용을 입력해주세요.",
                                            })}
                                        />

                                        <small>{noticeContent.length}/3000</small>
                                    </span>
                                </label>

                                <input ref={noticeFileInputRef} type="file" multiple hidden onChange={handleNoticeFileChange}/>
                                <div className="eca-admin-dashboard-notice-file-editor">
                                    <button type="button" className="eca-admin-dashboard-notice-add-file" onClick={() => noticeFileInputRef.current?.click()}>
                                        Add files
                                    </button>

                                    {selectedNotice?.files
                                        ?.filter((file) => noticeKeepFileIds.includes(file.fileId))
                                        .map((file) => (
                                            <span className="eca-admin-dashboard-notice-file-chip" key={file.fileId}>
                                                <span>{file.originalFileName ?? `file-${file.fileId}`}</span>
                                                <button type="button" onClick={() => removeNoticeExistingFile(file.fileId)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M12 4L4 12M12 12L4 4" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}

                                    {noticeNewFiles.map((file) => (
                                        <span className="eca-admin-dashboard-notice-file-chip" key={`${file.name}-${file.size}-${file.lastModified}`}>
                                            <span>{file.name}</span>

                                            <button type="button" onClick={() => removeNoticeNewFile(file)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M12 4L4 12M12 12L4 4" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="eca-admin-dashboard-notice-form-footer">
                                    <button type="submit" disabled={noticeSaving}>
                                        {noticeSaving
                                            ? t(`${DASHBOARD_T}.noticeSaving`, {
                                                defaultValue: "저장 중",
                                            })
                                            : t(`${DASHBOARD_T}.save`, {
                                                defaultValue: "저장",
                                            })}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            ) : null}

            {noticeModalMode === "detail" && selectedNotice ? (
                createPortal(
                    <div className="eca-admin-dashboard-notice-modal-backdrop" onMouseDown={closeNoticeModal}>
                        <div className="eca-admin-dashboard-notice-detail-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                            <div className="eca-admin-dashboard-notice-modal-head">
                                <h3>Notice</h3>

                                <button type="button" onClick={closeNoticeModal} aria-label={t("common.close")}>
                                    <img src="/icons/x-01.svg" alt=""/>
                                </button>
                            </div>

                            <div className="eca-admin-dashboard-notice-detail-body">
                                <h4>{selectedNotice.title}</h4>
                                <time>{formatNoticeDate(selectedNotice.createdAt, noticeLocale)}</time>
                                <p>{selectedNotice.content}</p>
                                {selectedNotice.files?.length > 0 ? (
                                    <div className="eca-admin-dashboard-notice-detail-files">
                                        {selectedNotice.files.map((file) => (
                                            <div className="eca-admin-dashboard-notice-detail-file" key={file.fileId}>
                                                <div className="eca-admin-dashboard-notice-detail-file-wrap"> 
                                                    <span className="eca-admin-dashboard-notice-detail-file-icon">
                                                        {getFileIconByExtension(
                                                            getFileExtension(file.originalFileName)
                                                        )}
                                                    </span>

                                                    <span className="eca-admin-dashboard-notice-detail-file-info">
                                                        <strong>
                                                            {file.originalFileName ?? `file-${file.fileId}`}
                                                        </strong>

                                                        <small>
                                                            {formatFileSize(file.sizeBytes)}
                                                        </small>
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!externalActivityId) return;

                                                        void downloadExternalActivityNoticeFile(
                                                            externalActivityId,
                                                            selectedNotice.noticeId,
                                                            file.fileId,
                                                            file.originalFileName
                                                        );
                                                    }}
                                                    aria-label="Download"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 3V15M12 15L7 10M12 15L17 10M5 19H19" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            {!isReadOnly ? (
                                <div className="eca-admin-dashboard-notice-detail-footer">
                                    <button type="button" onClick={openNoticeEdit}>
                                        {t(`${DASHBOARD_T}.editAction`, {
                                            defaultValue: "수정",
                                        })}
                                    </button>

                                    <button type="button" onClick={() => void handleDeleteNotice()} disabled={noticeDeleting}>
                                        {noticeDeleting
                                            ? t(`${DASHBOARD_T}.noticeDeleting`, {
                                                defaultValue: "삭제 중",
                                            })
                                            : t(`${DASHBOARD_T}.deleteAction`, {
                                                defaultValue: "삭제",
                                            })}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>,
                    document.body
                )
            ) : null}

            {participantInviteOpen ? (
                <div className="eca-admin-dashboard-invite-modal-backdrop" onMouseDown={() => setParticipantInviteOpen(false)}>
                    <div className="eca-admin-dashboard-invite-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="eca-admin-dashboard-invite-modal-head">
                            <div className="eca-admin-dashboard-invite-modal-head-text">
                                <h3>{t(`${DASHBOARD_T}.inviteModalTitle`)}</h3>
                                <p>{t(`${DASHBOARD_T}.inviteModalDesc`)}</p>
                            </div>
                            <button type="button" className="eca-admin-dashboard-invite-modal-close" onClick={() => setParticipantInviteOpen(false)} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-admin-dashboard-invite-codebox">
                            {studentInviteLoading ? (
                                <span className="eca-admin-dashboard-invite-codebox-loading">{t(`${DASHBOARD_T}.inviteCodeLoading`)}</span>
                            ) : studentInvites.length === 0 ? (
                                <button type="button" className="eca-admin-dashboard-invite-codebox-create" onClick={() => void handleCreateStudentInvite()} disabled={studentInviteCreating}>
                                    {studentInviteCreating ? t(`${DASHBOARD_T}.inviteCodeCreating`) : t(`${DASHBOARD_T}.inviteCodeCreate`)}
                                </button>
                            ) : (
                                <>
                                    <strong>{studentInvites[0].code}</strong>
                                    <button type="button" onClick={() => void handleCopyStudentInvite(studentInvites[0])}>
                                        {t(`${DASHBOARD_T}.copy`)}
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="eca-admin-dashboard-invite-modal-footer">
                            <button type="button" className="eca-admin-dashboard-invite-confirm-button" onClick={() => setParticipantInviteOpen(false)}>
                                {t(`${DASHBOARD_T}.confirm`)}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <AdminStudentProfileModal
                student={selectedStudentProfile}
                onClose={() => setSelectedStudentProfile(null)}
            />
        </div>
    );
}