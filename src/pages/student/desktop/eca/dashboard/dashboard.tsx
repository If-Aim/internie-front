import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMyExternalActivityAssignments } from "../../../../../api/ea";
import type { StudentAssignmentResponse } from "../../../../../api/ea";
import "./dashboard.css";

const ASSIGNMENT_PAGE_SIZE = 3;

type StudentAssignmentStatus = "BEFORE" | "SUBMITTED" | "LATE_SUBMITTED" | "MISSING";

type StudentAssignmentSummary = {
    assignmentId: number;
    name: string;
    dDay: string;
    status: StudentAssignmentStatus;
};

type AttendanceSummary = {
    id: number;
    date: string;
    activityName: string;
    statusLabel: string;
    status: "present" | "late" | "absent";
};

type PersonSummary = {
    id: number;
    name: string;
    description: string;
};

const attendances: AttendanceSummary[] = [
    { id: 1, date: "4월 11일 (토)", activityName: "활동 A", statusLabel: "출석", status: "present" },
    { id: 2, date: "4월 7일 (토)", activityName: "활동 B", statusLabel: "지각", status: "late" },
    { id: 3, date: "3월 28일 (토)", activityName: "활동 C", statusLabel: "결석", status: "absent" },
];

const managers: PersonSummary[] = [
    { id: 1, name: "담당자명", description: "" },
    { id: 2, name: "담당자명", description: "" },
    { id: 3, name: "담당자명", description: "" },
];

const teams: PersonSummary[] = [
    { id: 1, name: "김유진", description: "이화여자대학교 교육공학과" },
    { id: 2, name: "이윤정", description: "이화여자대학교 디자인학부" },
    { id: 3, name: "김규린", description: "이화여자대학교 컴퓨터공학과" },
];

function getDday(deadlineAt?: string | null): string {
    if (!deadlineAt) return "-";

    const today = new Date();
    const deadline = new Date(deadlineAt);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
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

function toStudentAssignmentSummary(assignment: StudentAssignmentResponse): StudentAssignmentSummary {
    return {
        assignmentId: assignment.assignmentId,
        name: assignment.name,
        dDay: getDday(assignment.deadlineAt),
        status: getAssignmentStatus(assignment.status),
    };
}

export default function EcaStudentDashboard(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [assignments, setAssignments] = React.useState<StudentAssignmentSummary[]>([]);
    const [assignmentLoading, setAssignmentLoading] = React.useState(false);
    const [assignmentError, setAssignmentError] = React.useState("");
    const [assignmentPage, setAssignmentPage] = React.useState(0);
    const [attendancePage, setAttendancePage] = React.useState(0);

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
                setAssignments(data.map(toStudentAssignmentSummary));
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

    const completedAssignmentCount = assignments.filter((assignment) => (
        assignment.status === "SUBMITTED" || assignment.status === "LATE_SUBMITTED"
    )).length;

    const assignmentProgressRate = assignments.length === 0
        ? 0
        : Math.round((completedAssignmentCount / assignments.length) * 100);

    const remainingAssignmentCount = assignments.length - completedAssignmentCount;
    const assignmentPageCount = Math.max(1, Math.ceil(assignments.length / ASSIGNMENT_PAGE_SIZE));
    const visibleAssignments = assignments.slice(
        assignmentPage * ASSIGNMENT_PAGE_SIZE,
        assignmentPage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );
    const canMovePrevAssignmentPage = assignmentPage > 0;
    const canMoveNextAssignmentPage = assignmentPage < assignmentPageCount - 1;

    const visibleAttendances = attendances.slice(
        attendancePage * ASSIGNMENT_PAGE_SIZE,
        attendancePage * ASSIGNMENT_PAGE_SIZE + ASSIGNMENT_PAGE_SIZE
    );
    const canMovePrevAttendancePage = attendancePage > 0;
    const canMoveNextAttendancePage = attendancePage < Math.ceil(attendances.length / ASSIGNMENT_PAGE_SIZE) - 1;

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
        setAttendancePage((prev) => Math.min(Math.ceil(attendances.length / ASSIGNMENT_PAGE_SIZE) - 1, prev + 1));
    }

    function openAssignmentSubmit(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    return (
        <div className="eca-student-dashboard-page">
            <h1>ESG 서포터즈</h1>

            <section className="eca-student-dashboard-summary-grid">
                <article className="eca-student-dashboard-summary-card">
                    <div className="eca-student-dashboard-summary-top">
                        <span>활동 진행률</span>
                        <em>ongoing</em>
                    </div>
                    <strong>{assignmentProgressRate}%</strong>
                </article>

                <article className="eca-student-dashboard-summary-card">
                    <span>출석률</span>
                    <strong>90%</strong>
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
                                    <span>›</span>
                                </button>
                                <button type="button" aria-label="다음" onClick={moveNextAssignmentPage} disabled={!canMoveNextAssignmentPage}>
                                    <span>›</span>
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
                                        <em className={`is-${assignment.status.toLowerCase().replace("_", "-")}`}>
                                            {getAssignmentStatusLabel(assignment.status)}
                                        </em>
                                        <i>›</i>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="eca-student-dashboard-panel-left">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>나의 출석</h2>

                            <div className="eca-student-dashboard-panel-actions">
                                <button type="button" aria-label="이전" className="is-prev" onClick={movePrevAttendancePage} disabled={!canMovePrevAttendancePage}>
                                    <span>›</span>
                                </button>
                                <button type="button" aria-label="다음" onClick={moveNextAttendancePage} disabled={!canMoveNextAttendancePage}>
                                    <span>›</span>
                                </button>
                            </div>
                        </div>

                        <div className="eca-student-dashboard-list-left">
                            {visibleAttendances.map((attendance) => (
                                <button type="button" className="eca-student-dashboard-attendance-row" key={attendance.id}>
                                    <strong>{attendance.date}</strong>
                                    <span>{attendance.activityName}</span>
                                    <em className={`is-${attendance.status}`}>
                                        {attendance.statusLabel}
                                    </em>
                                    <i>›</i>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="eca-student-dashboard-right-column">
                    <section className="eca-student-dashboard-side-panel">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>담당자(3)</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label="담당자 검색">⌕</button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {managers.map((manager) => (
                                <div className="eca-student-dashboard-person-row" key={manager.id}>
                                    <span className="eca-student-dashboard-avatar" />
                                    <strong>{manager.name}</strong>
                                    <button type="button">▷</button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="eca-student-dashboard-side-panel">
                        <div className="eca-student-dashboard-panel-head">
                            <h2>My 팀(6)</h2>
                            <button type="button" className="eca-student-dashboard-search-button" aria-label="팀 검색">⌕</button>
                        </div>

                        <div className="eca-student-dashboard-list-right">
                            {teams.map((team) => (
                                <div className="eca-student-dashboard-person-row" key={team.id}>
                                    <span className="eca-student-dashboard-avatar" />
                                    <span className="eca-student-dashboard-person-info">
                                        <strong>{team.name}</strong>
                                        <small>{team.description}</small>
                                    </span>
                                    <button type="button">▷</button>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}