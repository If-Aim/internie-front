import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getExternalActivity } from "../../../../../../api/ea";
import type { AssignmentResponse, AssignmentSystemForm, ExternalActivityResponse, } from "../../../../../../api/ea"; 
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./assignment.css";

type AssignmentStatus = "upcoming" | "ongoing" | "completed" ;
type AssignmentFilterStatus = AssignmentStatus;

type AssignmentViewModel = {
    id: number;
    name: string;
    systemForm: AssignmentSystemForm;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    totalCount: number;
    submittedCount: number;
    status: AssignmentStatus;
};
const assignmentStatuses: AssignmentFilterStatus[] = ["upcoming", "ongoing", "completed"];
const ASSIGNMENT_STATUS_LABELS: Record<AssignmentFilterStatus, string> = {
    upcoming: "upcoming",
    ongoing: "ongoing",
    completed: "completed",
};

function getSubmittedCount(assignment: AssignmentResponse): number {
    return (assignment.participants ?? []).filter((participant) => (
        participant.status === "SUBMITTED" || participant.status === "LATE_SUBMITTED"
    )).length;
}

function toAssignmentViewModel(assignment: AssignmentResponse): AssignmentViewModel {
    return {
        id: assignment.assignmentId,
        name: assignment.name,
        systemForm: assignment.systemForm,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        totalCount: assignment.participants?.length ?? 0,
        submittedCount: getSubmittedCount(assignment),
        status: getAssignmentStatus(assignment),
    };
}

function getSystemFormLabel(value: AssignmentSystemForm): string {
    if (value === "INDIVIDUAL") return "개인";
    return "팀";
}

function isSubmittedStatus(status: string): boolean {
    return status === "SUBMITTED" || status === "LATE_SUBMITTED";
}

function parseApiDateTime(date: string, time?: string | null): Date {
    const safeTime = time ? time.slice(0, 8) : "00:00:00";

    return new Date(`${date}T${safeTime}`);
}

function parseDeadlineAt(deadlineAt?: string | null, endDate?: string, endTime?: string | null): Date | null {
    if (deadlineAt) {
        return new Date(deadlineAt);
    }

    if (!endDate) return null;

    return parseApiDateTime(endDate, endTime ?? "23:59:59");
}

function getAssignmentStatus(assignment: AssignmentResponse): AssignmentStatus {
    const now = new Date();
    const startAt = parseApiDateTime(assignment.startDate, assignment.startTime);
    const deadlineAt = parseDeadlineAt(assignment.deadlineAt, assignment.endDate, assignment.endTime);
    const participants = assignment.participants ?? [];
    const totalCount = participants.length;
    const submittedCount = participants.filter((participant) => isSubmittedStatus(participant.status)).length;
    const completed = totalCount > 0 && submittedCount >= totalCount;

    if (now.getTime() < startAt.getTime()) {
        return "upcoming";
    }

    if (completed) {
        return "completed";
    }

    if (deadlineAt && now.getTime() > deadlineAt.getTime()) {
        return "completed";
    }

    return "ongoing";
}
function formatDate(value: string): string {
    return value.replaceAll("-", ".");
}

function formatTime(value?: string | null): string {
    if (!value) return "";

    return value.slice(0, 5);
}

function formatPeriod(assignment: AssignmentViewModel): string {
    const start = `${formatDate(assignment.startDate)}${assignment.startTime ? ` ${formatTime(assignment.startTime)}` : ""}`;
    const end = `${formatDate(assignment.endDate)}${assignment.endTime ? ` ${formatTime(assignment.endTime)}` : ""}`;

    return `${start} - ${end}`;
}

function getStatusDotClass(status: AssignmentStatus): string {
    return `eca-assignment-status-dot eca-assignment-status-dot--${status}`;
}

export default function EcaDashboardAssignment(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { center, centerLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [activity, setActivity] = React.useState<ExternalActivityResponse | null>(null);
    const [assignments, setAssignments] = React.useState<AssignmentViewModel[]>([]);
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
            if (centerLoading) return;

            if (!center?.centerId || !externalActivityId) {
                setError("대외활동 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getExternalActivity(center.centerId, externalActivityId);
                setActivity(data);
                setAssignments((data.assignments ?? []).map(toAssignmentViewModel));
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignments([]);
                setError("과제 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchAssignments();
    }, [center?.centerId, centerLoading, externalActivityId]);

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

    function updateListScrollableState(): void {
        const list = listScrollRef.current;

        setListScrollable(list ? list.scrollHeight > list.clientHeight : false);
    }

    const upcomingCount = assignments.filter((assignment) => assignment.status === "upcoming").length;
    const ongoingCount = assignments.filter((assignment) => assignment.status === "ongoing").length;
    const completedCount = assignments.filter((assignment) => assignment.status === "completed").length;

    const filteredAssignments = assignments.filter((assignment) => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        const matchesKeyword = !normalizedKeyword || assignment.name.toLowerCase().includes(normalizedKeyword);
        const matchesStatus = selectedStatuses.includes(assignment.status);

        return matchesKeyword && matchesStatus;
    });

    React.useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            updateListScrollableState();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
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

    function moveToCreateAssignment(): void {
        if (!externalActivityId) return;

        navigate(`/eca-admin/activities/${externalActivityId}/assignment/new`);
    }

    return (
        <div className="eca-assignment-page">
            <header className="eca-assignment-head">
                <h1>{activity?.name ?? ""} 과제 현황</h1>
            </header>

            <section className="eca-assignment-summary-grid">
                <article className="eca-assignment-summary-card">
                    <span>완료된 과제</span>
                    <strong>{completedCount}</strong>
                </article>

                <article className="eca-assignment-summary-card">
                    <span>진행 중인 과제</span>
                    <strong>{ongoingCount}</strong>
                </article>

                <article className="eca-assignment-summary-card">
                    <span>진행 예정 과제</span>
                    <strong>{upcomingCount}</strong>
                </article>
            </section>

            <section className="eca-assignment-list-card">
                <div className="eca-assignment-list-top">
                    <h2>List ({filteredAssignments.length})</h2>

                    <div className="eca-assignment-actions" ref={toolbarRef}>
                        <div className="eca-assignment-toolbar-item">
                            <button type="button" className="eca-assignment-icon-button" aria-label="필터" onClick={() => { setFilterOpen((prev) => !prev); setSearchOpen(false); }} >
                                <img src={selectedStatuses.length === assignmentStatuses.length ? "/icons/mynaui_filter_a0.svg" : "/icons/mynaui_filter_dot_a0.svg"} alt="" />
                            </button>

                            {filterOpen ? (
                                <div className="eca-assignment-filter-popover">
                                    {assignmentStatuses.map((status) => (
                                        <button type="button" key={status} className="eca-assignment-filter-option" onClick={() => toggleStatus(status)} > 
                                            <img
                                                className="eca-assignment-filter-radio"
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

                        <button type="button" className="eca-assignment-icon-button" aria-label="과제 생성" onClick={moveToCreateAssignment} >
                            <img src="/icons/plus-01-a0.svg" alt="" />
                        </button>

                        <div className="eca-assignment-search-wrap">
                            <button type="button" className="eca-assignment-icon-button" aria-label="검색" onClick={() => { setSearchOpen((prev) => !prev); setFilterOpen(false); }}>
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>

                            {searchOpen ? (
                                <div className="eca-assignment-search-popover">
                                    <input
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="과제명 검색"
                                        autoFocus
                                    />
                                    <button type="button" onClick={resetSearchKeyword}>
                                        초기화
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="eca-assignment-table-head">
                    <span className="eca-assignment-table-head-title">과제명</span>
                    <span>방식</span>
                    <span>기간</span>
                    <span>제출 현황</span>
                    <span>상태</span>
                </div>

                <div className={"eca-assignment-list-scroll" + (listScrollable ? " is-scrollable" : "")} ref={listScrollRef} >
                    {loading ? (
                        <p className="eca-assignment-empty">과제 목록을 불러오는 중입니다.</p>
                    ) : error ? (
                        <p className="eca-assignment-empty">{error}</p>
                    ) : assignments.length === 0 ? (
                        <p className="eca-assignment-empty">생성된 과제가 없습니다.</p>
                    ) : filteredAssignments.length === 0 ? (
                        <p className="eca-assignment-empty">검색 결과가 없습니다.</p>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <button
                                type="button"
                                className="eca-assignment-row"
                                key={assignment.id}
                                onClick={() => navigate(`/eca-admin/activities/${externalActivityId}/assignment/${assignment.id}`)}
                            >
                                <span className="eca-assignment-name">{assignment.name}</span>
                                <span>{getSystemFormLabel(assignment.systemForm)}</span>
                                <span className="eca-assignment-period">{formatPeriod(assignment)}</span>
                                <span>{assignment.submittedCount}/{assignment.totalCount}</span>
                                <span>
                                    <i className={getStatusDotClass(assignment.status)} />
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}