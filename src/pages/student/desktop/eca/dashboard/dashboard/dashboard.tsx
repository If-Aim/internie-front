import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getMyExternalActivityAssignments, getMyExternalActivityTeams, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { StudentAssignmentResponse, StudentExternalActivityDetailResponse, TeamResponse } from "../../../../../../api/ea";
import { getUserDateOnly, parseServerKstDateTime, serverKstDateTimeToUserDateOnly } from "../../../../../../utils/dateTime";
import type { EcaStudentOutletContext } from "../../ecaStudentLayout";
import "./dashboard.css";

const ASSIGNMENT_PAGE_SIZE = 3;

type StudentAssignmentStatus = "BEFORE" | "SUBMITTED" | "LATE_SUBMITTED" | "MISSING";

type StudentAssignmentSummary = {
    assignmentId: number;
    name: string;
    dDay: string;
    status: StudentAssignmentStatus;
    deadlineAt?: string | null;
    submittedAt?: string | null;
};

type PersonSummary = {
    id: number;
    name: string;
    description: string;
    profileImage?: string | null;
    teamId?: number;
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

function getAssignmentStatusLabel(status: StudentAssignmentStatus): string {
    if (status === "SUBMITTED") return "제출 완료";
    if (status === "LATE_SUBMITTED") return "지각 제출";
    if (status === "MISSING") return "미제출";
    return "제출 전";
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

function toTeamMemberSummaries(teams: TeamResponse[], myUserId?: number | null): PersonSummary[] {
    return teams.flatMap((team) => (
        team.members
            .filter((member) => member.userId !== myUserId)
            .map((member) => ({
                id: member.userId,
                name: member.userName,
                description: `${team.name} · ${member.role === "LEADER" ? "팀장" : "팀원"}`,
                profileImage: member.profileImage,
                teamId: team.teamId,
            }))
    ));
}

export default function EcaStudentDashboard(): React.ReactElement {
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
    // const [attendancePage, setAttendancePage] = React.useState(0);

    React.useEffect(() => {
        async function fetchAssignments(): Promise<void> {
            if (!externalActivityId) {
                setAssignmentError("대외활동 정보를 찾을 수 없습니다.");
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
                setAssignmentError("과제 목록을 불러오지 못했습니다.");
            } finally {
                setAssignmentLoading(false);
            }
        }

        fetchAssignments();
    }, [externalActivityId]);

    React.useEffect(() => {
        async function fetchDashboardData(): Promise<void> {
            if (!externalActivityId) {
                setDashboardError("대외활동 정보를 찾을 수 없습니다.");
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
                setDashboardError("대시보드 정보를 불러오지 못했습니다.");
            } finally {
                setDashboardLoading(false);
            }
        }

        fetchDashboardData();
    }, [externalActivityId, me?.userId]);

    const completedAssignmentCount = assignments.filter((assignment) => (
        assignment.status === "SUBMITTED" || assignment.status === "LATE_SUBMITTED"
    )).length;

    const remainingAssignmentCount = assignments.length - completedAssignmentCount;
    const assignmentPageCount = Math.max(1, Math.ceil(assignments.length / ASSIGNMENT_PAGE_SIZE));
    const visibleAssignments = assignments.slice(
        assignmentPage * ASSIGNMENT_PAGE_SIZE,
        assignmentPage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );
    const canMovePrevAssignmentPage = assignmentPage > 0;
    const canMoveNextAssignmentPage = assignmentPage < assignmentPageCount - 1;
    const fallbackActivity = activities.find((activity) => String(activity.externalActivityId) === String(externalActivityId)) ?? null;
    const activityTitle = activityDetail?.name ?? fallbackActivity?.name ?? "대외활동";
    const progressStatusLabel = getProgressStatusLabel(activityDetail?.progressStatus ?? fallbackActivity?.progressStatus);
    const activityProgressRate = getDateProgressRate(
        activityDetail?.startDate ?? fallbackActivity?.startDate,
        activityDetail?.endDate ?? fallbackActivity?.endDate
    );
    const managers = toManagerSummary(activityDetail);
    const teamMembers = toTeamMemberSummaries(myTeams, me?.userId);

    // const visibleAttendances = attendances.slice(
    //     attendancePage * ASSIGNMENT_PAGE_SIZE,
    //     attendancePage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    // );
    // const canMovePrevAttendancePage = attendancePage > 0;
    // const canMoveNextAttendancePage = attendancePage < Math.ceil(attendances.length / ASSIGNMENT_PAGE_SIZE) - 1;

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

    // function movePrevAttendancePage(): void {
    //     setAttendancePage((prev) => Math.max(0, prev - 1));
    // }

    // function moveNextAttendancePage(): void {
    //     setAttendancePage((prev) => Math.min(Math.ceil(attendances.length / ASSIGNMENT_PAGE_SIZE) - 1, prev + 1));
    // }

    return (
        <div className="eca-student-dashboard-page">
            <h1>{activityTitle}</h1>

            <section className="eca-student-dashboard-summary-grid">
                <article className="eca-student-dashboard-summary-card">
                    <div className="eca-student-dashboard-summary-top">
                        <span>활동 진행률</span>
                        <em className={`is-${progressStatusLabel}`}>{progressStatusLabel}</em>
                    </div>
                    <strong>{activityProgressRate}%</strong>
                </article>

                <article className="eca-student-dashboard-summary-card">
                    <span>출석률</span>
                    <strong className="eca-student-dashboard-preparing-text">준비중</strong>
                </article>

                <article className="eca-student-dashboard-summary-card">
                    <span>남은 과제 수</span>
                    <strong>{remainingAssignmentCount}개</strong>
                </article>
            </section>

            <div className="eca-student-dashboard-main-grid">
                <div className="eca-student-dashboard-left-column">
                    <section className="eca-student-dashboard-panel-left">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>나의 과제</h2>

                            <div className="eca-student-dashboard-panel-actions">
                                <button type="button" aria-label="이전" className="is-prev" onClick={movePrevAssignmentPage} disabled={!canMovePrevAssignmentPage}>
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                                <button type="button" aria-label="다음" onClick={moveNextAssignmentPage} disabled={!canMoveNextAssignmentPage}>
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
                                <p className="eca-student-dashboard-empty">과제 목록을 불러오는 중입니다.</p>
                            ) : assignmentError ? (
                                <p className="eca-student-dashboard-empty">{assignmentError}</p>
                            ) : assignments.length === 0 ? (
                                <p className="eca-student-dashboard-empty">등록된 과제가 없습니다.</p>
                            ) : (
                                visibleAssignments.map((assignment) => (
                                    <button type="button" className="eca-student-dashboard-assignment-row" key={assignment.assignmentId} onClick={() => openAssignmentSubmit(assignment.assignmentId)}>
                                        <strong>{assignment.name}</strong>
                                        <span>{assignment.dDay}</span>
                                        <span className="eca-student-dashboard-assignment-action">
                                            <em className={`is-${assignment.status.toLowerCase().replace("_", "-")}`}>
                                                {getAssignmentStatusLabel(assignment.status)}
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
                            <h2>나의 출석</h2>
                        </div>

                        <div className="eca-student-dashboard-list-left">
                            <p className="eca-student-dashboard-empty">서비스 준비중입니다.</p>
                        </div>
                    </section>
                </div>

                <aside className="eca-student-dashboard-right-column">
                    <section className="eca-student-dashboard-side-panel">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>담당자({managers.length})</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label="담당자 검색">
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                    <path d="M11.9767 10.5397H11.2199L10.9516 10.281C11.5503 9.58544 11.9879 8.76614 12.233 7.88173C12.4781 6.99732 12.5247 6.06966 12.3695 5.16514C11.9192 2.50183 9.69661 0.37501 7.01413 0.0492806C6.07107 -0.0700265 5.1132 0.0279852 4.21385 0.335816C3.31449 0.643646 2.49746 1.15314 1.8253 1.8253C1.15314 2.49746 0.643646 3.31449 0.335816 4.21385C0.0279852 5.1132 -0.0700265 6.07107 0.0492806 7.01413C0.37501 9.69661 2.50183 11.9192 5.16514 12.3695C6.06966 12.5247 6.99732 12.4781 7.88173 12.233C8.76614 11.9879 9.58544 11.5503 10.281 10.9516L10.5397 11.2199V11.9767L14.6113 16.0483C15.0041 16.4411 15.6459 16.4411 16.0387 16.0483C16.4315 15.6555 16.4315 15.0137 16.0387 14.6209L11.9767 10.5397ZM6.22855 10.5397C3.84306 10.5397 1.91743 8.61404 1.91743 6.22855C1.91743 3.84306 3.84306 1.91743 6.22855 1.91743C8.61404 1.91743 10.5397 3.84306 10.5397 6.22855C10.5397 8.61404 8.61404 10.5397 6.22855 10.5397Z" fill="#A0A0A0"/>
                                </svg>
                            </button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {dashboardLoading ? (
                                <p className="eca-student-dashboard-empty">담당자 정보를 불러오는 중입니다.</p>
                            ) : dashboardError ? (
                                <p className="eca-student-dashboard-empty">{dashboardError}</p>
                            ) : managers.length === 0 ? (
                                <p className="eca-student-dashboard-empty">등록된 담당자가 없습니다.</p>
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
                                        <button type="button" className="eca-student-dashboard-send-message" aria-label="메시지 보내기">
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
                            <h2>My 팀({teamMembers.length})</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label="팀 검색">
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                    <path d="M11.9767 10.5397H11.2199L10.9516 10.281C11.5503 9.58544 11.9879 8.76614 12.233 7.88173C12.4781 6.99732 12.5247 6.06966 12.3695 5.16514C11.9192 2.50183 9.69661 0.37501 7.01413 0.0492806C6.07107 -0.0700265 5.1132 0.0279852 4.21385 0.335816C3.31449 0.643646 2.49746 1.15314 1.8253 1.8253C1.15314 2.49746 0.643646 3.31449 0.335816 4.21385C0.0279852 5.1132 -0.0700265 6.07107 0.0492806 7.01413C0.37501 9.69661 2.50183 11.9192 5.16514 12.3695C6.06966 12.5247 6.99732 12.4781 7.88173 12.233C8.76614 11.9879 9.58544 11.5503 10.281 10.9516L10.5397 11.2199V11.9767L14.6113 16.0483C15.0041 16.4411 15.6459 16.4411 16.0387 16.0483C16.4315 15.6555 16.4315 15.0137 16.0387 14.6209L11.9767 10.5397ZM6.22855 10.5397C3.84306 10.5397 1.91743 8.61404 1.91743 6.22855C1.91743 3.84306 3.84306 1.91743 6.22855 1.91743C8.61404 1.91743 10.5397 3.84306 10.5397 6.22855C10.5397 8.61404 8.61404 10.5397 6.22855 10.5397Z" fill="#A0A0A0"/>
                                </svg>
                            </button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {dashboardLoading ? (
                                <p className="eca-student-dashboard-empty">팀 정보를 불러오는 중입니다.</p>
                            ) : dashboardError ? (
                                <p className="eca-student-dashboard-empty">{dashboardError}</p>
                            ) : myTeams.length === 0 ? (
                                <p className="eca-student-dashboard-empty">소속된 팀이 없습니다.</p>
                            ) : teamMembers.length === 0 ? (
                                <p className="eca-student-dashboard-empty">팀원이 없습니다.</p>
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
                                        <button type="button" className="eca-student-dashboard-send-message" aria-label="메시지 보내기">
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