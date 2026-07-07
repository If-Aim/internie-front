import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ApiError } from "../../../../../../api/client";
import { getMyExternalActivityAssignments } from "../../../../../../api/ea";
import type { AssignmentParticipantStatus, StudentAssignmentResponse, StudentAssignmentTeam } from "../../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import type { EcaStudentOutletContext } from "../../ecaStudentLayout";
import "./assignment.css";

type AssignmentStatus = "notSubmitted" | "submitted" | "lateSubmitted";
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
    isOverdue: boolean;
};

const assignmentStatuses: AssignmentFilterStatus[] = ["notSubmitted", "submitted", "lateSubmitted"];

const ASSIGNMENT_T = "ecaStudent.assignmentPage";
const ASSIGNMENT_STATUS_KEYS: Record<AssignmentFilterStatus, string> = {
    notSubmitted: "notSubmitted",
    submitted: "submitted",
    lateSubmitted: "lateSubmitted",
};

function getAssignmentStatus(status: AssignmentParticipantStatus): AssignmentStatus {
    if (status === "SUBMITTED") return "submitted";
    if (status === "LATE_SUBMITTED") return "lateSubmitted";

    return "notSubmitted";
}

function isOverdueNotSubmitted(status: AssignmentParticipantStatus, deadlineAt?: string | null): boolean {
    if (status === "SUBMITTED" || status === "LATE_SUBMITTED") return false;
    if (!deadlineAt) return false;

    const deadline = parseServerKstDateTime(deadlineAt);

    if (!deadline) return false;

    return Date.now() > deadline.getTime();
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
        status: getAssignmentStatus(assignment.status),
        isOverdue: isOverdueNotSubmitted(assignment.status, assignment.deadlineAt),
    };
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
    const { t } = useTranslation();
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
                window.alert(t(`${ASSIGNMENT_T}.error.activityNotFound`));
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
                        window.alert(t(`${ASSIGNMENT_T}.error.activityDeletedOrNotFound`));
                        navigate("/student", { replace: true });
                        return;
                    }

                    if (e.status === 403 || e.code === "FORBIDDEN" || e.code === "SUBMISSION_NOT_ALLOWED") {
                        window.alert(t(`${ASSIGNMENT_T}.error.accessDenied`));
                        navigate("/student", { replace: true });
                        return;
                    }

                    if (e.status === 400) {
                        window.alert(e.message || t(`${ASSIGNMENT_T}.error.assignmentLoadFailed`));
                        navigate("/student", { replace: true });
                        return;
                    }
                }

                window.alert(t(`${ASSIGNMENT_T}.error.assignmentLoadFailed`));
                navigate("/student", { replace: true });
            } finally {
                setLoading(false);
            }
        }

        fetchAssignments();
    }, [externalActivityId, navigate, t]);

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
            notSubmitted: assignments.filter((assignment) => assignment.status === "notSubmitted").length,
            submitted: assignments.filter((assignment) => assignment.status === "submitted").length,
            lateSubmitted: assignments.filter((assignment) => assignment.status === "lateSubmitted").length,
            overdue: assignments.filter((assignment) => assignment.isOverdue).length,
        };
    }, [assignments]);

    function getAssignmentRowClass(isOverdue: boolean): string {
        return "eca-student-assignment-row" + (isOverdue ? " is-missing" : "");
    }

    function getAssignmentPeriodClass(isOverdue: boolean): string {
        return "eca-student-assignment-period" + (isOverdue ? " is-missing" : "");
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

    function getAssignmentFormLabel(assignment: StudentAssignmentViewModel): string {
        if (!assignment.isTeamAssignment) return t(`${ASSIGNMENT_T}.assignmentForm.individual`);

        return assignment.myTeam?.name
            ? t(`${ASSIGNMENT_T}.assignmentForm.teamWithName`, { teamName: assignment.myTeam.name })
            : t(`${ASSIGNMENT_T}.assignmentForm.team`);
    }

    return (
        <div className="eca-student-assignment-page">
            <header className="eca-student-assignment-head">
                <h1>{activityName ? `${activityName} ${t(`${ASSIGNMENT_T}.title`)}` : t(`${ASSIGNMENT_T}.title`)}</h1>
            </header>

            <div className="eca-student-assignment-summary">
                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--before" />
                    <strong>{t(`${ASSIGNMENT_T}.summary.notSubmitted`)}</strong>
                    <span>{summaryCounts.notSubmitted}</span>
                </article>
                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--submitted" />
                    <strong>{t(`${ASSIGNMENT_T}.summary.submitted`)}</strong>
                    <span>{summaryCounts.submitted}</span>
                </article>
                <article className="eca-student-assignment-summary-card">
                    <i className="eca-student-assignment-summary-dot eca-student-assignment-summary-dot--missing" />
                    <strong>{t(`${ASSIGNMENT_T}.summary.lateSubmitted`)}</strong>
                    <span>{summaryCounts.lateSubmitted}</span>
                </article>
            </div>

            <section className="eca-student-assignment-list-card">
                <div className="eca-student-assignment-list-top">
                    <h2>{t(`${ASSIGNMENT_T}.listTitle`, { count: filteredAssignments.length })}</h2>

                    <div className="eca-student-assignment-actions" ref={toolbarRef}>
                        <div className="eca-student-assignment-toolbar-item">
                            <button type="button" className="eca-student-assignment-icon-button" aria-label={t(`${ASSIGNMENT_T}.filter`)} onClick={() => { setFilterOpen((prev) => !prev); setSearchOpen(false); }}>
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
                                            <span>{t(`${ASSIGNMENT_T}.status.${ASSIGNMENT_STATUS_KEYS[status]}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="eca-student-assignment-search-wrap">
                            <button type="button" className="eca-student-assignment-icon-button" aria-label={t("common.search")} onClick={() => { setSearchOpen((prev) => !prev); setFilterOpen(false); }}>
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>

                            {searchOpen ? (
                                <div className="eca-student-assignment-search-popover">
                                    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t(`${ASSIGNMENT_T}.searchPlaceholder`)} autoFocus />
                                    <button type="button" onClick={resetSearchKeyword}>
                                        {t("ecaStudent.reset")}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="eca-student-assignment-table-head">
                    <span className="eca-student-assignment-table-head-title">{t(`${ASSIGNMENT_T}.assignmentName`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.teamOrIndividual`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.assignmentPeriod`)}</span>
                    <span>{t(`${ASSIGNMENT_T}.tableStatus`)}</span>
                </div>

                <div className={"eca-student-assignment-list-scroll" + (listScrollable ? " is-scrollable" : "")} ref={listScrollRef}>
                    {loading ? (
                        <p className="eca-student-assignment-empty">{t(`${ASSIGNMENT_T}.loading`)}</p>
                    ) : error ? (
                        <p className="eca-student-assignment-empty">{error}</p>
                    ) : assignments.length === 0 ? (
                        <p className="eca-student-assignment-empty">{t(`${ASSIGNMENT_T}.empty`)}</p>
                    ) : filteredAssignments.length === 0 ? (
                        <p className="eca-student-assignment-empty">{t(`${ASSIGNMENT_T}.noSearchResults`)}</p>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <button type="button" className={getAssignmentRowClass(assignment.isOverdue)} key={assignment.id} onClick={() => moveToAssignmentDetail(assignment.id)}>
                                <span className="eca-student-assignment-name">{assignment.name}</span>
                                <span>{getAssignmentFormLabel(assignment)}</span>
                                <span className={getAssignmentPeriodClass(assignment.isOverdue)}>{formatPeriod(assignment)}</span>
                                <span className="eca-student-assignment-state-cell">
                                    <span className={getStatusDotClass(assignment.status)}>
                                        {t(`${ASSIGNMENT_T}.status.${ASSIGNMENT_STATUS_KEYS[assignment.status]}`)}
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