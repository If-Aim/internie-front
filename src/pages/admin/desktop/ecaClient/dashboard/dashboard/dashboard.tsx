import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getExternalActivity, deleteExternalActivity, getExternalActivityTeams } from "../../../../../../api/ea";
import type { AssignmentResponse, ExternalActivityResponse, TeamResponse } from "../../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./dashboard.css";

type ActivityStatus = "upcoming" | "ongoing" | "completed" | "delayed";
const ASSIGNMENT_PAGE_SIZE = 3;
const ATTENDANCE_PAGE_SIZE = 3;

interface AssignmentSummary {
    id: number;
    title: string;
    submittedCount: number;
    totalCount: number;
}

interface AttendanceSummary {
    id: number;
    date: string;
    activityName: string;
    attendedCount: number;
    totalCount: number;
}

interface Participant {
    id: number;
    name: string;
    school: string;
    profileImage?: string | null;
    status?: "active" | "default";
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

const attendances: AttendanceSummary[] = [
    { id: 1, date: "4월 11일 (토)", activityName: "활동 A", attendedCount: 10, totalCount: 12 },
    { id: 2, date: "4월 7일 (토)", activityName: "활동 B", attendedCount: 15, totalCount: 15 },
    { id: 3, date: "3월 28일 (토)", activityName: "활동 C", attendedCount: 14, totalCount: 16 },
];

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

function getActivityStatusLabel(status: ActivityStatus): string {
    if (status === "upcoming") return "upcoming";
    if (status === "ongoing") return "ongoing";
    if (status === "completed") return "completed";
    return "delayed";
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
        submittedCount: getSubmittedAssignmentCount(assignment),
        totalCount: assignment.participants?.length ?? 0,
    };
}

function toTeamSummaries(activity: ExternalActivityResponse, teams: TeamResponse[]): TeamSummary[] {
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
            const leaderName = leader?.userName ?? "팀장 미지정";
            const memberCount = team.members.length;
            const memberNames = team.members.map((member) => member.userName);

            const memberText = memberCount === 0
                ? "팀원 없음"
                : memberCount === 1
                    ? leaderName
                    : `${leaderName} 외 ${memberCount - 1}명`;

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
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const {
        center,
        centerLoading,
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

    const [participants, setParticipants] = React.useState<Participant[]>([]);
    const [participantLoading, setParticipantLoading] = React.useState(false);
    const [/*participantError*/, setParticipantError] = React.useState("");
    const [dashboardTeams, setDashboardTeams] = React.useState<TeamSummary[]>([]);
    const [participantSearchOpen, setParticipantSearchOpen] = React.useState(false);
    const [participantSearchKeyword, setParticipantSearchKeyword] = React.useState("");
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [teamSearchOpen, setTeamSearchOpen] = React.useState(false);
    const [teamSearchKeyword, setTeamSearchKeyword] = React.useState("");
    const teamSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const participantListRef = React.useRef<HTMLDivElement | null>(null);
    const teamListRef = React.useRef<HTMLDivElement | null>(null);
    const teamAssignmentMoreButtonRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());
    const [participantListScrollable, setParticipantListScrollable] = React.useState(false);
    const [teamListScrollable, setTeamListScrollable] = React.useState(false);
    const [openTeamAssignmentMoreId, setOpenTeamAssignmentMoreId] = React.useState<number | null>(null);
    const [teamAssignmentPopoverPosition, setTeamAssignmentPopoverPosition] = React.useState<{
        top: number;
        left: number;
    } | null>(null);

    React.useEffect(() => {
        async function fetchActivity(): Promise<void> {
            if (centerLoading) return;

            if (!center?.centerId || !externalActivityId) {
                setActivityError("대외활동 정보를 찾을 수 없습니다.");
                setAssignmentError("과제 목록을 불러오지 못했습니다.");
                setParticipantError("참여자 목록을 불러오지 못했습니다.");
                return;
            }

            setActivityLoading(true);
            setParticipantLoading(true);
            setAssignmentLoading(true);
            setActivityError("");
            setParticipantError("");
            setAssignmentError("");

            try {
                const [activityData, teamData] = await Promise.all([
                    getExternalActivity(center.centerId, externalActivityId),
                    getExternalActivityTeams(externalActivityId),
                ]);

                const nextParticipants: Participant[] = (activityData.participants ?? [])
                    .flatMap((participant) => {
                        if (typeof participant.userId !== "number") {
                            return [];
                        }

                        return [{
                            id: participant.userId,
                            name: participant.name ?? "이름 없음",
                            school: participant.schoolName ?? "-",
                            profileImage: participant.profileImage ?? null,
                            status: "default" as const,
                        }];
                    });

                setActivity(activityData);
                setParticipants(nextParticipants);
                setAssignments((activityData.assignments ?? []).map(toAssignmentSummary));
                setDashboardTeams(toTeamSummaries(activityData, teamData));
                setAssignmentPage(0);
            } catch (e) {
                console.error(e);
                setActivity(null);
                setParticipants([]);
                setAssignments([]);
                setDashboardTeams([]);
                setActivityError("대외활동 정보를 불러오지 못했습니다.");
                setParticipantError("참여자 목록을 불러오지 못했습니다.");
                setAssignmentError("과제 목록을 불러오지 못했습니다.");
            } finally {
                setActivityLoading(false);
                setParticipantLoading(false);
                setAssignmentLoading(false);
            }
        }

        fetchActivity();
    }, [center?.centerId, centerLoading, externalActivityId]);

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

    React.useEffect(() => {
        if (openTeamAssignmentMoreId === null) return;

        function handleMouseDown(e: MouseEvent): void {
            const target = e.target as HTMLElement;

            if (
                target.closest(".eca-dashboard-team-assignment-more-wrap") ||
                target.closest(".eca-dashboard-team-assignment-popover")
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

    const attendancePageCount = Math.max(1, Math.ceil(attendances.length / ATTENDANCE_PAGE_SIZE));
    // const visibleAttendances = attendances.slice(
    //     attendancePage * ATTENDANCE_PAGE_SIZE,
    //     attendancePage * ATTENDANCE_PAGE_SIZE + ATTENDANCE_PAGE_SIZE
    // );
    const canMovePrevAttendancePage = attendancePage > 0;
    const canMoveNextAttendancePage = attendancePage < attendancePageCount - 1;

    async function handleDeleteActivity(): Promise<void> {
        if (!center?.centerId || !externalActivityId || deletingActivity) {
            return;
        }

        const confirmed = window.confirm("이 대외활동을 삭제하시겠습니까?");

        if (!confirmed) {
            return;
        }

        setDeletingActivity(true);
        setDashboardMenuOpen(false);

        try {
            await deleteExternalActivity(center.centerId, externalActivityId);
            await refreshManagedActivities();
            navigate("/eca-admin/home");
        } catch (error) {
            console.error(error);
            window.alert("대외활동 삭제에 실패했습니다.");
        } finally {
            setDeletingActivity(false);
        }
    }

    function moveToEditActivity(): void {
        if (!externalActivityId) return;

        setDashboardMenuOpen(false);
        navigate(`/eca-admin/activities/${externalActivityId}/edit`);
    }

    function createAssignment(): void {
        if (!externalActivityId) return;

        navigate(`/eca-admin/activities/${externalActivityId}/assignment/new`);
    }
    function openAssignmentDetail(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/eca-admin/activities/${externalActivityId}/assignment/${assignmentId}`);
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

        const moreWrap = button.closest(".eca-dashboard-team-assignment-more-wrap");

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
 
    function toggleTeamAssignmentPopover(teamId: number): void {
        if (openTeamAssignmentMoreId === teamId) {
            setOpenTeamAssignmentMoreId(null);
            setTeamAssignmentPopoverPosition(null);
            return;
        }

        setOpenTeamAssignmentMoreId(teamId);
        updateTeamAssignmentPopoverPosition(teamId);
    }

    React.useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            updateRightListScrollableState();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [filteredParticipants.length, filteredTeams.length, participantSearchKeyword, teamSearchKeyword]);

    return (
        <div className="eca-dashboard-detail-page">
            <div className="eca-dashboard-detail-head">
                <h1>{activityLoading ? "" : activity?.name ?? "대외활동"}</h1>
                {!isReadOnly ? (
                    <div className="eca-dashboard-menu-wrap" ref={dashboardMenuRef}>
                        <button
                            type="button"
                            className="eca-dashboard-more-button"
                            aria-label="더보기"
                            onClick={() => setDashboardMenuOpen((prev) => !prev)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12C4 12.2652 4.10536 12.5196 4.29289 12.7071C4.48043 12.8946 4.73478 13 5 13C5.26522 13 5.51957 12.8946 5.70711 12.7071C5.89464 12.5196 6 12.2652 6 12C6 11.7348 5.89464 11.4804 5.70711 11.2929C5.51957 11.1054 5.26522 11 5 11C4.73478 11 4.48043 11.1054 4.29289 11.2929C4.10536 11.4804 4 11.7348 4 12ZM11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12ZM18 12C18 12.2652 18.1054 12.5196 18.2929 12.7071C18.4804 12.8946 18.7348 13 19 13C19.2652 13 19.5196 12.8946 19.7071 12.7071C19.8946 12.5196 20 12.2652 20 12C20 11.7348 19.8946 11.4804 19.7071 11.2929C19.5196 11.1054 19.2652 11 19 11C18.7348 11 18.4804 11.1054 18.2929 11.2929C18.1054 11.4804 18 11.7348 18 12Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {dashboardMenuOpen ? (
                            <div className="eca-dashboard-menu">
                                <button type="button" onClick={handleDeleteActivity} disabled={deletingActivity}>
                                    <span>{deletingActivity ? "삭제 중" : "삭제하기"}</span>
                                </button>

                                <button type="button" onClick={moveToEditActivity}>
                                    <span>수정하기</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <section className="eca-dashboard-summary-grid">
                <article className="eca-dashboard-summary-card">
                    <div className="eca-dashboard-summary-top">
                        <span>활동 진행률</span>
                        <span className={`eca-dashboard-status-badge eca-dashboard-status--${activityStatus}`}>
                            {getActivityStatusLabel(activityStatus)}
                        </span>
                    </div>
                    <strong>{assignmentProgressRate}%</strong>
                </article>

                <article className="eca-dashboard-summary-card">
                    <span>활동 수료율</span>
                    <strong>{assignmentProgressRate}%</strong>
                </article>

                <article className="eca-dashboard-summary-card">
                    <span>전체 참여자 수</span>
                    <strong>{participants.length}명</strong>
                </article>
            </section>

            <div className="eca-dashboard-main-grid">
                <div className="eca-dashboard-left-column">
                    <section className="eca-dashboard-panel-left">
                        <div className="eca-dashboard-panel-head">
                            <h2>과제 현황({completedAssignmentCount}/{assignments.length})</h2>
                            <div className="eca-dashboard-panel-actions">
                                {!isReadOnly ? (
                                    <button type="button" aria-label="과제생성" className="eca-dashboard-assignment-create" onClick={createAssignment}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M11 13H6C5.71667 13 5.47934 12.904 5.288 12.712C5.09667 12.52 5.00067 12.2827 5 12C4.99934 11.7173 5.09534 11.48 5.288 11.288C5.48067 11.096 5.718 11 6 11H11V6C11 5.71667 11.096 5.47934 11.288 5.288C11.48 5.09667 11.7173 5.00067 12 5C12.2827 4.99934 12.5203 5.09534 12.713 5.288C12.9057 5.48067 13.0013 5.718 13 6V11H18C18.2833 11 18.521 11.096 18.713 11.288C18.905 11.48 19.0007 11.7173 19 12C18.9993 12.2827 18.9033 12.5203 18.712 12.713C18.5207 12.9057 18.2833 13.0013 18 13H13V18C13 18.2833 12.904 18.521 12.712 18.713C12.52 18.905 12.2827 19.0007 12 19C11.7173 18.9993 11.48 18.9033 11.288 18.712C11.096 18.5207 11 18.2833 11 18V13Z" fill="#808080" />
                                        </svg>
                                    </button>
                                ) : null}
                                <button type="button" aria-label="이전" className="eca-dashboard-assignment-prev" onClick={movePrevAssignmentPage} disabled={!canMovePrevAssignmentPage} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button type="button" aria-label="다음" onClick={moveNextAssignmentPage} disabled={!canMoveNextAssignmentPage} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="eca-dashboard-list-left">
                            {assignmentLoading ? (
                                <p className="eca-dashboard-empty">과제 목록을 불러오는 중입니다.</p>
                            ) : assignmentError ? (
                                <p className="eca-dashboard-empty">{assignmentError}</p>
                            ) : assignments.length === 0 ? (
                                <p className="eca-dashboard-empty">등록된 과제가 없습니다.</p>
                            ) : (
                                visibleAssignments.map((item) => (
                                    <button type="button" className="eca-dashboard-assignment-row" key={item.id} onClick={() => openAssignmentDetail(item.id)}>
                                        <span>{item.title}</span>
                                        {false ? ( // TODO: 평가 미완 과제 갯수 표시로 수정
                                            <span className="eca-dashboard-count-badge">
                                                {item.submittedCount}개
                                            </span>
                                        ) : null}
                                        <span className="eca-dashboard-row-arrow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="eca-dashboard-panel-left">
                        <div className="eca-dashboard-panel-head">
                            <h2>출석 현황</h2>
                            <div className="eca-dashboard-panel-actions">
                                <button type="button" aria-label="이전" className="eca-dashboard-assignment-prev" onClick={movePrevAttendancePage} disabled={!canMovePrevAttendancePage} > 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button type="button" aria-label="다음" onClick={moveNextAttendancePage} disabled={!canMoveNextAttendancePage} > 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="eca-dashboard-list-left">
                            {/* {visibleAttendances.map((item) => (
                                <button type="button" className="eca-dashboard-attendance-row" key={item.id}>
                                    <strong>{item.date}</strong>
                                    <span>{item.activityName}</span>
                                    <span>
                                        <b>{item.attendedCount}명</b> / {item.totalCount}명
                                    </span>
                                    <span className="eca-dashboard-row-arrow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </button>
                            ))} */}
                            <div className="eca-dashboard-attendance-empty">
                                준비중입니다.
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="eca-dashboard-right-column">
                    <section className={"eca-dashboard-panel-right eca-dashboard-side-panel"  + (participantListScrollable ? " is-scrollable" : "")}>
                        <div className="eca-dashboard-panel-head">
                            <h2>참여자({filteredParticipants.length})</h2>

                            <div className="eca-dashboard-search-wrap" ref={participantSearchWrapRef}>
                                <button type="button" className="eca-dashboard-search-button" aria-label="참여자 검색" onClick={() => setParticipantSearchOpen((prev) => !prev)} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                    </svg>
                                </button>

                                {participantSearchOpen ? (
                                    <div className="eca-dashboard-search-popover">
                                        <input
                                            className="eca-dashboard-search-input"
                                            value={participantSearchKeyword}
                                            onChange={(e) => setParticipantSearchKeyword(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="button" className="eca-dashboard-search-reset" onClick={() => setParticipantSearchKeyword("")} >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-dashboard-list-right"  ref={participantListRef}>
                            {participantLoading ? (
                                <p className="eca-dashboard-empty">참여자 목록을 불러오는 중입니다.</p>
                            ) : participants.length === 0 ? (
                                <p className="eca-dashboard-empty">참여자가 없습니다.</p>
                            ) : filteredParticipants.length === 0 ? (
                                <p className="eca-dashboard-empty">검색 결과가 없습니다.</p>
                            ) : (
                                filteredParticipants.map((item) => (
                                    <div className="eca-dashboard-person-row" key={item.id}>
                                        <span className="eca-dashboard-avatar-wrap">
                                            <img
                                                className="eca-dashboard-avatar"
                                                src={item.profileImage || "/internie_mascot_normal.png"}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                }}
                                            />
                                            {item.status === "active" ? <span className="eca-dashboard-active-dot" /> : null}
                                        </span>
                                        <span className="eca-dashboard-person-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.school}</span>
                                        </span>
                                        <button type="button" className="eca-dashboard-send-message"><img src="/icons/send_message_a0.svg" className="eca-dashboard-send-icon" /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className={"eca-dashboard-panel-right eca-dashboard-side-panel" + (teamListScrollable ? " is-scrollable" : "")}>
                        <div className="eca-dashboard-panel-head">
                            <h2>팀({filteredTeams.length})</h2>

                            <div className="eca-dashboard-search-wrap" ref={teamSearchWrapRef}>
                                <button type="button" className="eca-dashboard-search-button" aria-label="팀 검색" onClick={() => setTeamSearchOpen((prev) => !prev)} >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                    </svg>
                                </button>

                                {teamSearchOpen ? (
                                    <div className="eca-dashboard-search-popover">
                                        <input
                                            className="eca-dashboard-search-input"
                                            value={teamSearchKeyword}
                                            onChange={(e) => setTeamSearchKeyword(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="button" className="eca-dashboard-search-reset" onClick={() => setTeamSearchKeyword("")} >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-dashboard-list-right" ref={teamListRef}>
                            {dashboardTeams.length === 0 ? (
                                <p className="eca-dashboard-empty">팀이 없습니다.</p>
                            ) : filteredTeams.length === 0 ? (
                                <p className="eca-dashboard-empty">검색 결과가 없습니다.</p>
                            ) : (
                                filteredTeams.map((item) => (
                                    <div className="eca-dashboard-team-row" key={item.id}>
                                        <span className="eca-dashboard-avatar" />

                                        <span className="eca-dashboard-team-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.memberText}</span>
                                        </span>

                                        <div className="eca-dashboard-team-assignment-area">
                                            {item.primaryAssignment ? (
                                                <span className="eca-dashboard-team-assignment-badge">
                                                    {item.primaryAssignment.name}
                                                </span>
                                            ) : null}

                                            {item.extraAssignments.length > 0 ? (
                                                <div className="eca-dashboard-team-assignment-more-wrap">
                                                    <button
                                                        type="button"
                                                        ref={(node) => {
                                                            if (node) {
                                                                teamAssignmentMoreButtonRefs.current.set(item.id, node);
                                                            } else {
                                                                teamAssignmentMoreButtonRefs.current.delete(item.id);
                                                            }
                                                        }}
                                                        className="eca-dashboard-team-assignment-more-button"
                                                        onClick={() => toggleTeamAssignmentPopover(item.id)}
                                                    >
                                                        <span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M3 5C2.45 5 2 5.45 2 6C2 6.55 2.45 7 3 7C3.55 7 4 6.55 4 6C4 5.45 3.55 5 3 5ZM9 5C8.45 5 8 5.45 8 6C8 6.55 8.45 7 9 7C9.55 7 10 6.55 10 6C10 5.45 9.55 5 9 5ZM6 5C5.45 5 5 5.45 5 6C5 6.55 5.45 7 6 7C6.55 7 7 6.55 7 6C7 5.45 6.55 5 6 5Z" fill="black"/>
                                                            </svg>
                                                        </span>
                                                        <em>더보기</em>
                                                    </button>
                                                    {openTeamAssignmentMoreId === item.id && teamAssignmentPopoverPosition ? (
                                                        createPortal(
                                                            <div
                                                                className="eca-dashboard-team-assignment-popover"
                                                                style={{
                                                                    top: teamAssignmentPopoverPosition.top,
                                                                    left: teamAssignmentPopoverPosition.left,
                                                                }}
                                                            >
                                                                {item.extraAssignments.map((assignment) => (
                                                                    <span
                                                                        key={assignment.id}
                                                                        className="eca-dashboard-team-assignment-popover-badge"
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
                    </section>
                </aside>
            </div>
        </div>
    );
}