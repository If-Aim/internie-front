import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ApiError } from "../../../../../../api/client";
import { getMyExternalActivityAssignments } from "../../../../../../api/ea";
import type { AssignmentParticipantStatus, StudentAssignmentResponse, StudentAssignmentTeam } from "../../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import type { EcaStudentOutletContext } from "../../ecaStudentLayout";
import "./assignment.css";

type AssignmentStatus = "before" | "submitted" | "lateSubmitted" | "missing";
type AssignmentFilterStatus = AssignmentStatus;

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

const assignmentStatuses: AssignmentFilterStatus[] = ["before", "submitted", "lateSubmitted", "missing"];

const ASSIGNMENT_STATUS_LABELS: Record<AssignmentFilterStatus, string> = {
    before: "제출 전",
    submitted: "제출 완료",
    lateSubmitted: "지각 제출",
    missing: "미제출",
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

function getAssignmentFormLabel(assignment: StudentAssignmentViewModel): string {
    if (!assignment.isTeamAssignment) return "개인";

    return assignment.myTeam?.name ? `팀 · ${assignment.myTeam.name}` : "팀";
}

function formatPeriod(assignment: StudentAssignmentViewModel): string {
    const start = formatServerKstDateAndTimeCompactForUser(assignment.startDate, assignment.startTime, "00:00:00");
    const end = formatServerKstDateAndTimeCompactForUser(assignment.endDate, assignment.endTime, "23:59:59");

    return `${start} - ${end}`;
}

function getStatusDotClass(status: AssignmentStatus): string {
    return `eca-student-assignment-status-dot eca-student-assignment-status-dot--${status}`;
}

export default function EcaStudentAssignment(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { activities } = useOutletContext<EcaStudentOutletContext>();

    const currentActivityId = externalActivityId ? Number(externalActivityId) : null;
    const currentActivity = activities.find((activity) => activity.externalActivityId === currentActivityId);
    const activityName = currentActivity?.name ?? "";

    const [assignments, setAssignments] = React.useState<StudentAssignmentViewModel[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selectedStatuses, setSelectedStatuses] = React.useState<AssignmentFilterStatus[]>(assignmentStatuses);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [keyword, setKeyword] = React.useState("");
    const toolbarRef = React.useRef<HTMLDivElement | null>(null);
    const listScrollRef = React.useRef<HTMLDivElement | null>(null);
    const [listScrollable, setListScrollable] = React.useState(false);

    React.useEffect(() => {
        async function fetchAssignments(): Promise<void> {
            if (!externalActivityId) {
                window.alert("대외활동 정보를 찾을 수 없습니다.");
                navigate("/student", { replace: true });
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getMyExternalActivityAssignments(externalActivityId);
                setAssignments(data.map(toStudentAssignmentViewModel));
            } catch (e) {
                console.error(e);
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

                    if (e.status === 400) {
                        window.alert(e.message || "대외활동 정보를 불러올 수 없습니다.");
                        navigate("/student", { replace: true });
                        return;
                    }
                }

                window.alert("대외활동 정보를 불러오지 못했습니다.");
                navigate("/student", { replace: true });
            } finally {
                setLoading(false);
            }
        }

        fetchAssignments();
    }, [externalActivityId, navigate]);

    React.useEffect(() => {
        if (!filterOpen && !searchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!toolbarRef.current) return;
            if (toolbarRef.current.contains(e.target as Node)) return;

            setFilterOpen(false);
            setSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [filterOpen, searchOpen]);

    const summaryCounts = React.useMemo(() => {
        return {
            completed: assignments.filter((assignment) => assignment.status === "submitted" || assignment.status === "lateSubmitted").length,
            before: assignments.filter((assignment) => assignment.status === "before").length,
            missing: assignments.filter((assignment) => assignment.status === "missing").length,
        };
    }, [assignments]);

    function getAssignmentRowClass(status: AssignmentStatus): string {
        return "eca-student-assignment-row" + (status === "missing" ? " is-missing" : "");
    }

    function getAssignmentPeriodClass(status: AssignmentStatus): string {
        return "eca-student-assignment-period" + (status === "missing" ? " is-missing" : "");
    }

    const filteredAssignments = assignments.filter((assignment) => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        const matchesKeyword = !normalizedKeyword || assignment.name.toLowerCase().includes(normalizedKeyword);
        const matchesStatus = selectedStatuses.includes(assignment.status);

        return matchesKeyword && matchesStatus;
    });

    React.useLayoutEffect(() => {
        const list = listScrollRef.current;

        if (!list) return;

        const update = () => {
            setListScrollable(list.scrollHeight > list.clientHeight);
        };

        update();

        const frameId = window.requestAnimationFrame(update);
        const observer = new ResizeObserver(update);

        observer.observe(list);

        return () => {
            window.cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, [filteredAssignments.length, loading, error]);

    function toggleStatus(status: AssignmentFilterStatus): void {
        setSelectedStatuses((prev) => {
            const next = prev.includes(status)
                ? prev.filter((item) => item !== status)
                : [...prev, status];

            return assignmentStatuses.filter((item) => next.includes(item));
        });
    }

    function resetSearchKeyword(): void {
        setKeyword("");
    }

    function moveToAssignmentDetail(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    return (
        <div className="eca-student-assignment-page">
            <header className="eca-student-assignment-head">
                <h1>{activityName} 과제 현황</h1>
            </header>

            <div className="eca-student-assignment-summary">
                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--submitted" />
                    <strong>완료된 과제</strong>
                    <span>{summaryCounts.completed}</span>
                </article>

                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--before" />
                    <strong>제출 전 과제</strong>
                    <span>{summaryCounts.before}</span>
                </article>

                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--missing" />
                    <strong>미제출 과제</strong>
                    <span>{summaryCounts.missing}</span>
                </article>
            </div>

            <section className="eca-student-assignment-list-card">
                <div className="eca-student-assignment-list-top">
                    <h2>List ({filteredAssignments.length})</h2>

                    <div className="eca-student-assignment-actions" ref={toolbarRef}>
                        <div className="eca-student-assignment-toolbar-item">
                            <button type="button" className="eca-student-assignment-icon-button" aria-label="필터" onClick={() => { setFilterOpen((prev) => !prev); setSearchOpen(false); }}>
                                <img src={selectedStatuses.length === assignmentStatuses.length ? "/icons/mynaui_filter_a0.svg" : "/icons/mynaui_filter_dot_a0.svg"} alt="" />
                            </button>

                            {filterOpen ? (
                                <div className="eca-student-assignment-filter-popover">
                                    {assignmentStatuses.map((status) => (
                                        <button type="button" key={status} className="eca-student-assignment-filter-option" onClick={() => toggleStatus(status)}>
                                            <img
                                                className="eca-student-assignment-filter-radio"
                                                src={
                                                    selectedStatuses.length === assignmentStatuses.length
                                                        ? "/icons/filter_selected_all.svg"
                                                        : selectedStatuses.includes(status)
                                                            ? "/icons/filter_selected_one.svg"
                                                            : "/icons/filter_selected_none.svg"
                                                }
                                                alt=""
                                            />
                                            <span>{ASSIGNMENT_STATUS_LABELS[status]}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="eca-student-assignment-search-wrap">
                            <button type="button" className="eca-student-assignment-icon-button" aria-label="검색" onClick={() => { setSearchOpen((prev) => !prev); setFilterOpen(false); }}>
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>

                            {searchOpen ? (
                                <div className="eca-student-assignment-search-popover">
                                    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="과제명 검색" autoFocus />
                                    <button type="button" onClick={resetSearchKeyword}>
                                        초기화
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="eca-student-assignment-table-head">
                    <span className="eca-student-assignment-table-head-title">과제명</span>
                    <span>방식</span>
                    <span>기간</span>
                    <span className="eca-student-assignment-table-head-status">
                        <span className="eca-student-assignment-table-head-badge-slot" />
                        <span className="eca-student-assignment-table-head-dot-slot">상태</span>
                    </span>
                </div>

                <div className={"eca-student-assignment-list-scroll" + (listScrollable ? " is-scrollable" : "")} ref={listScrollRef}>
                    {loading ? (
                        <p className="eca-student-assignment-empty">과제 목록을 불러오는 중입니다.</p>
                    ) : error ? (
                        <p className="eca-student-assignment-empty">{error}</p>
                    ) : assignments.length === 0 ? (
                        <p className="eca-student-assignment-empty">배정된 과제가 없습니다.</p>
                    ) : filteredAssignments.length === 0 ? (
                        <p className="eca-student-assignment-empty">검색 결과가 없습니다.</p>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <button type="button" className={getAssignmentRowClass(assignment.status)} key={assignment.id} onClick={() => moveToAssignmentDetail(assignment.id)}>
                                <span className="eca-student-assignment-name">{assignment.name}</span>
                                <span>{getAssignmentFormLabel(assignment)}</span>
                                <span className={getAssignmentPeriodClass(assignment.status)}>{formatPeriod(assignment)}</span>
                                <span className="eca-student-assignment-state-cell">
                                    <span className="eca-student-assignment-badge-slot">
                                        {assignment.status === "missing" ? <em className="eca-student-assignment-missing-badge">기한 초과</em> : null}
                                    </span>
                                    <span className="eca-student-assignment-dot-slot">
                                        <i className={getStatusDotClass(assignment.status)} />
                                    </span>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}