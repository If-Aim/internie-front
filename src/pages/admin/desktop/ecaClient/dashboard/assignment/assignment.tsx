import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getExternalActivity } from "../../../../../../api/ea";
import type { AssignmentResponse, AssignmentSystemForm, ExternalActivityResponse, } from "../../../../../../api/ea"; 
import { formatServerKstDateAndTimeCompactForUser, parseServerKstDateAndTime, parseServerKstDateTime } from "../../../../../../utils/dateTime";
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
const ASSIGNMENT_T = "ecaAdmin.assignmentPage";
const assignmentStatuses: AssignmentFilterStatus[] = ["upcoming", "ongoing", "completed"];

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

function getSystemFormLabel(value: AssignmentSystemForm, t: (key: string) => string): string {
    if (value === "INDIVIDUAL") return t(`${ASSIGNMENT_T}.systemForm.individual`);
    return t(`${ASSIGNMENT_T}.systemForm.team`);
}

function isSubmittedStatus(status: string): boolean {
    return status === "SUBMITTED" || status === "LATE_SUBMITTED";
}

function parseApiDateTime(date: string, time?: string | null): Date {
    return parseServerKstDateAndTime(date, time, "00:00:00") ?? new Date(`${date}T${time || "00:00:00"}`);
}

function parseDeadlineAt(deadlineAt?: string | null, endDate?: string, endTime?: string | null): Date | null {
    if (deadlineAt) {
        return parseServerKstDateTime(deadlineAt);
    }

    if (!endDate) return null;

    return parseServerKstDateAndTime(endDate, endTime, "23:59:59");
}

function formatPeriod(assignment: AssignmentViewModel): string {
    const start = formatServerKstDateAndTimeCompactForUser(assignment.startDate, assignment.startTime, "00:00:00");
    const end = formatServerKstDateAndTimeCompactForUser(assignment.endDate, assignment.endTime, "23:59:59");

    return `${start} - ${end}`;
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

function getStatusDotClass(status: AssignmentStatus): string {
    return `eca-admin-assignment-status-dot eca-admin-assignment-status-dot--${status}`;
}

export default function EcaDashboardAssignment(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { organization, organizationLoading } = useOutletContext<EcaClientAdminOutletContext>();

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
            if (organizationLoading) return;

            if (!organization?.organizationId || !externalActivityId) {
                setError(t(`${ASSIGNMENT_T}.programNotFound`));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getExternalActivity(organization.organizationId, externalActivityId);
                setActivity(data);
                setAssignments((data.assignments ?? []).map(toAssignmentViewModel));
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignments([]);
                setError(t(`${ASSIGNMENT_T}.assignmentLoadFailed`));
            } finally {
                setLoading(false);
            }
        }

        fetchAssignments();
    }, [organization?.organizationId, organizationLoading, externalActivityId, t, i18n.language]);

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
    const inProgressCount = assignments.filter((assignment) => assignment.status === "ongoing").length;
    const completedCount = assignments.filter((assignment) => assignment.status === "completed").length;
    
    const isReadOnly = activity?.manageableByMe === false;
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

        navigate(`/program-admin/activities/${externalActivityId}/assignment/new`);
    }

    function moveToAssignmentDetail(assignmentId: number): void {
        if (!externalActivityId) return;

        navigate(`/program-admin/activities/${externalActivityId}/assignment/${assignmentId}`, {
            state: {
                assignmentDetailEntryDirection: "forward",
            },
        });
    }

    return (
        <div className="eca-admin-assignment-page">
            <header className="eca-admin-assignment-head">
                <h1>{t(`${ASSIGNMENT_T}.assignmentListPageTitle`, { name: activity?.name ?? "" })}</h1>
            </header>

            <section className="eca-admin-assignment-summary-grid">
                <article className="eca-admin-assignment-summary-card">
                    <div className="eca-admin-assignment-summary-label">
                        <i className={getStatusDotClass("completed")} />
                        <span>{t(`${ASSIGNMENT_T}.assignmentSummary.completed`)}</span>
                    </div>
                    <strong>{completedCount}</strong>
                </article>

                <article className="eca-admin-assignment-summary-card">
                    <div className="eca-admin-assignment-summary-label">
                        <i className={getStatusDotClass("ongoing")} />
                        <span>{t(`${ASSIGNMENT_T}.assignmentSummary.inProgress`)}</span>
                    </div>
                    <strong>{inProgressCount}</strong>
                </article>

                <article className="eca-admin-assignment-summary-card">
                    <div className="eca-admin-assignment-summary-label">
                        <i className={getStatusDotClass("upcoming")} />
                        <span>{t(`${ASSIGNMENT_T}.assignmentSummary.upcoming`)}</span>
                    </div>
                    <strong>{upcomingCount}</strong>
                </article>
            </section>

            <section className="eca-admin-assignment-list-card">
                <div className="eca-admin-assignment-list-top">
                    <h2>{t(`${ASSIGNMENT_T}.assignmentListTitle`, { count: filteredAssignments.length })}</h2>

                    <div className="eca-admin-assignment-actions" ref={toolbarRef}>
                        <div className="eca-admin-assignment-toolbar-item">
                            <button type="button" className="eca-admin-assignment-icon-button" aria-label={t("common.filter")} onClick={() => { setFilterOpen((prev) => !prev); setSearchOpen(false); }} >
                                <img src={selectedStatuses.length === assignmentStatuses.length ? "/icons/mynaui_filter_a0.svg" : "/icons/mynaui_filter_dot_a0.svg"} alt="" />
                            </button>

                            {filterOpen ? (
                                <div className="eca-admin-assignment-filter-popover">
                                    {assignmentStatuses.map((status) => (
                                        <button type="button" key={status} className="eca-admin-assignment-filter-option" onClick={() => toggleStatus(status)} > 
                                            <img
                                                className="eca-admin-assignment-filter-radio"
                                                src={
                                                    selectedStatuses.length === assignmentStatuses.length
                                                        ? "/icons/filter_selected_all.svg"
                                                        : selectedStatuses.includes(status)
                                                            ? "/icons/filter_selected_one.svg"
                                                            : "/icons/filter_selected_none.svg"
                                                }
                                                alt=""
                                            />
                                            <span>{t(`${ASSIGNMENT_T}.assignmentStatus.${status}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        
                        {!isReadOnly ? (
                            <button type="button" className="eca-admin-assignment-icon-button" aria-label={t(`${ASSIGNMENT_T}.createAssignmentAria`)} onClick={moveToCreateAssignment} >
                                <img src="/icons/plus-01-a0.svg" alt="" />
                            </button>
                        ) : null}

                        <div className="eca-admin-assignment-search-wrap">
                            <button type="button" className="eca-admin-assignment-icon-button" aria-label={t("common.search")} onClick={() => { setSearchOpen((prev) => !prev); setFilterOpen(false); }}>
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>

                            {searchOpen ? (
                                <div className="eca-admin-assignment-search-popover">
                                    <input
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder={t(`${ASSIGNMENT_T}.assignmentSearchPlaceholder`)}
                                        autoFocus
                                    />
                                    <button type="button" onClick={resetSearchKeyword}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M13.3337 2.66669L2.66699 13.3334M13.3337 13.3334L2.66699 2.66669" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="eca-admin-assignment-table-head">
                    <span className="eca-admin-assignment-table-head-title">{t(`${ASSIGNMENT_T}.tableAssignmentName`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.tableSystemForm`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.assignmentPeriodColumn`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.tableSubmission`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.tableStatus`)}</span>
                </div>

                <div className={"eca-admin-assignment-list-scroll" + (listScrollable ? " is-scrollable" : "")} ref={listScrollRef} >
                    {loading ? (
                        <p className="eca-admin-assignment-empty">{t(`${ASSIGNMENT_T}.assignmentLoading`)}</p>
                    ) : error ? (
                        <p className="eca-admin-assignment-empty">{error}</p>
                    ) : assignments.length === 0 ? (
                        <p className="eca-admin-assignment-empty">{t(`${ASSIGNMENT_T}.noAssignments`)}</p>
                    ) : filteredAssignments.length === 0 ? (
                        <p className="eca-admin-assignment-empty">{t(`${ASSIGNMENT_T}.noSearchResults`)}</p>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <button type="button" className="eca-admin-assignment-row" key={assignment.id} onClick={() => moveToAssignmentDetail(assignment.id)} >
                                <span className="eca-admin-assignment-name">{assignment.name}</span>
                                <span>{getSystemFormLabel(assignment.systemForm, t)}</span>
                                <span className="eca-admin-assignment-period">{formatPeriod(assignment)}</span>
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