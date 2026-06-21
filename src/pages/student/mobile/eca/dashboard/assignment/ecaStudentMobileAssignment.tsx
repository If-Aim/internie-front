import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../../../../../api/client";
import { getMyExternalActivityAssignments, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { AssignmentParticipantStatus, StudentAssignmentResponse, StudentAssignmentTeam, StudentExternalActivityDetailResponse } from "../../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileAssignment.css";

type AssignmentStatus = "before" | "submitted" | "lateSubmitted" | "missing";

type StudentAssignmentViewModel = {
    id: number;
    name: string;
    isTeamAssignment: boolean;
    myTeam?: StudentAssignmentTeam | null;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
    status: AssignmentStatus;
};

function getAssignmentStatus(status: AssignmentParticipantStatus, deadlineAt?: string | null): AssignmentStatus {
    if (status === "SUBMITTED") return "submitted";
    if (status === "LATE_SUBMITTED") return "lateSubmitted";
    if (status === "LATE") return "missing";

    if (status === "NOT_SUBMITTED") {
        if (!deadlineAt) return "before";

        const deadline = parseServerKstDateTime(deadlineAt);

        if (!deadline) return "before";

        return Date.now() > deadline.getTime() ? "missing" : "before";
    }

    return "before";
}

function toStudentAssignmentViewModel(assignment: StudentAssignmentResponse): StudentAssignmentViewModel {
    return {
        id: assignment.assignmentId,
        name: assignment.name,
        isTeamAssignment: assignment.isTeamAssignment,
        myTeam: assignment.myTeam ?? null,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        deadlineAt: assignment.deadlineAt,
        status: getAssignmentStatus(assignment.status, assignment.deadlineAt),
    };
}

function isUnsubmittedAssignment(status: AssignmentStatus): boolean {
    return status === "before" || status === "missing";
}

function getAssignmentDeadlineSortTime(assignment: StudentAssignmentViewModel): number {
    if (!assignment.deadlineAt) return Number.MAX_SAFE_INTEGER;

    const deadline = parseServerKstDateTime(assignment.deadlineAt);

    return deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function compareStudentAssignments(a: StudentAssignmentViewModel, b: StudentAssignmentViewModel): number {
    const unsubmittedA = isUnsubmittedAssignment(a.status);
    const unsubmittedB = isUnsubmittedAssignment(b.status);

    if (unsubmittedA !== unsubmittedB) return unsubmittedA ? -1 : 1;

    const deadlineDiff = getAssignmentDeadlineSortTime(a) - getAssignmentDeadlineSortTime(b);

    if (deadlineDiff !== 0) return deadlineDiff;

    return a.name.localeCompare(b.name, "ko-KR", { numeric: true });
}

// function getAssignmentFormLabel(assignment: StudentAssignmentViewModel): string {
//     if (!assignment.isTeamAssignment) return "개인";

//     const teamName = assignment.myTeam?.name?.trim();

//     return teamName ? `팀 · ${teamName}` : "팀";
// }

function formatMobilePeriod(assignment: StudentAssignmentViewModel): string {
    const start = formatServerKstDateAndTimeCompactForUser(assignment.startDate, assignment.startTime, "00:00:00");
    const end = formatServerKstDateAndTimeCompactForUser(assignment.endDate, assignment.endTime, "23:59:59");

    return `${start} ~ ${end.slice(5)}`;
}

function getAssignmentStatusLabel(status: AssignmentStatus): string {
    if (status === "submitted") return "submitted";
    if (status === "lateSubmitted") return "late";
    if (status === "missing") return "missing";
    return "assigned";
}

function getAssignmentStatusClass(status: AssignmentStatus): string {
    return `eca-mobile-student-assignment-status is-${status}`;
}

type HeaderProps = {
    activityName: string;
    onMenuClick: () => void;
};

function Header({ activityName, onMenuClick }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
                <img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
            </button>

            <div className="app-title">{activityName}</div>

            <div style={{display: "block", width: 24, height: 24}} aria-hidden="true" />
        </div>
    );
}

export default function EcaMobileAssignment(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignments, setAssignments] = React.useState<StudentAssignmentViewModel[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function fetchAssignmentPage(): Promise<void> {
            if (!externalActivityId) {
                window.alert("대외활동 정보를 찾을 수 없습니다.");
                navigate("/student", { replace: true });
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [activityData, assignmentData] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyExternalActivityAssignments(externalActivityId),
                ]);

                setActivity(activityData);
                setAssignments(assignmentData.map(toStudentAssignmentViewModel).sort(compareStudentAssignments));
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignments([]);

                if (e instanceof ApiError) {
                    if (e.status === 404 || e.code === "EXTERNAL_ACTIVITY_NOT_FOUND") {
                        window.alert("삭제되었거나 존재하지 않는 대외활동입니다.");
                        navigate("/student", { replace: true });
                        return;
                    }

                    if (e.status === 403 || e.code === "FORBIDDEN" || e.code === "SUBMISSION_NOT_ALLOWED") {
                        window.alert("접근할 수 없는 대외활동입니다.");
                        navigate("/student", { replace: true });
                        return;
                    }
                }

                setError("과제 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchAssignmentPage();
    }, [externalActivityId, navigate]);

    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function handleFilterClick(): void {
        window.alert("필터 기능은 준비중입니다.");
    }

    function moveToAssignmentDetail(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    return (
        <main className="eca-mobile-student-assignment-page">
            <Header activityName={activity?.name ?? ""} onMenuClick={openMenu} />
            <div className="eca-mobile-student-assignment-main">
                <section className="eca-mobile-student-assignment-title-row">
                    <h2>과제 현황</h2>

                    <button type="button" className="eca-mobile-student-assignment-filter-button" onClick={handleFilterClick} aria-label="필터">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M6.46154 12H17.5385M4 7H20M10.1538 17H13.8462" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </section>

                <section className="eca-mobile-student-assignment-list">
                    {loading ? (
                        <p className="eca-mobile-student-assignment-empty">과제 목록을 불러오는 중입니다.</p>
                    ) : error ? (
                        <p className="eca-mobile-student-assignment-empty">{error}</p>
                    ) : assignments.length === 0 ? (
                        <p className="eca-mobile-student-assignment-empty">배정된 과제가 없습니다.</p>
                    ) : (
                        assignments.map((assignment) => (
                            <button type="button" className="eca-mobile-student-assignment-card" key={assignment.id} onClick={() => moveToAssignmentDetail(assignment.id)}>
                                <span className="eca-mobile-student-assignment-info">
                                    <strong>{assignment.name}</strong>
                                    {/* <span className="eca-mobile-student-assignment-meta">{getAssignmentFormLabel(assignment)}</span> */}
                                    <em>{formatMobilePeriod(assignment)}</em>
                                </span>

                                <span className={getAssignmentStatusClass(assignment.status)}>
                                    {getAssignmentStatusLabel(assignment.status)}
                                </span>

                                <i>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </i>
                            </button>
                        ))
                    )}
                </section>
            </div>
        </main>
    );
}