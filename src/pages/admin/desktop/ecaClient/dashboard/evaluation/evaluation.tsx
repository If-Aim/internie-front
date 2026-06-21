import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getExternalActivityEvaluationOverview } from "../../../../../../api/ea";
import type { ExternalActivityEvaluationOverviewResponse, ExternalActivityEvaluationOverviewRow } from "../../../../../../api/ea";
import "./evaluation.css";


type EvaluationLocationState = {
    fromEvaluationDetail?: boolean;
};

function formatNumber(value?: number | null): string {
    if (value === null || value === undefined) return "-";

    return String(value);
}

function getSubmittedRatio(row: ExternalActivityEvaluationOverviewRow): string {
    return `${row.submittedAssignmentCount}/${row.totalAssignmentCount}`;
}

function getGradedRatio(row: ExternalActivityEvaluationOverviewRow): string {
    return `${row.evaluatedAssignmentCount}/${row.submittedCount}`;
}

function getCriterionScore(row: ExternalActivityEvaluationOverviewRow, criterionId: number): string {
    const score = row.scores.find((item) => item.criterionId === criterionId);

    return formatNumber(score?.score);
}

function getTargetId(row: ExternalActivityEvaluationOverviewRow): number | null {
    if (row.participantType === "TEAM") return row.teamId ?? null;

    return row.userId ?? null;
}

export default function EcaEvaluationPage(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const locationState = location.state as EvaluationLocationState | null;
    const enterFromDetail = locationState?.fromEvaluationDetail === true;

    const [overview, setOverview] = React.useState<ExternalActivityEvaluationOverviewResponse | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<number | null>(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const dropdownRef = React.useRef<HTMLDivElement | null>(null);
    const isAllView = selectedAssignmentId === null;

    React.useEffect(() => {
        if (!dropdownOpen) return;

        function handleMouseDown(event: MouseEvent): void {
            if (dropdownRef.current?.contains(event.target as Node)) return;

            setDropdownOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [dropdownOpen]);

    React.useEffect(() => {
        async function fetchOverview(): Promise<void> {
            if (!externalActivityId) {
                setError("평가 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getExternalActivityEvaluationOverview(externalActivityId, selectedAssignmentId);

                setOverview(data);
            } catch (e) {
                console.error(e);
                setOverview(null);
                setError("평가 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchOverview();
    }, [externalActivityId, selectedAssignmentId]);

    function getSelectedAssignmentName(): string {
        if (!overview || selectedAssignmentId === null) return "All";

        return overview.assignments.find((item) => item.assignmentId === selectedAssignmentId)?.assignmentName ?? "Assignment Name";
    }

    function selectAssignment(assignmentId: number | null): void {
        setSelectedAssignmentId(assignmentId);
        setDropdownOpen(false);
    }

    function moveRow(row: ExternalActivityEvaluationOverviewRow): void {
        if (!externalActivityId) return;

        if (isAllView) {
            const targetId = getTargetId(row);

            if (!targetId) return;

            navigate(`/program-admin/activities/${externalActivityId}/evaluation/students/${row.participantType}/${targetId}`, {
                state: {
                    evaluationDetailEntryDirection: "forward",
                    participantName: row.participantName,
                    profileImage: row.profileImage ?? null,
                    participantType: row.participantType,
                    userId: row.userId ?? null,
                    teamId: row.teamId ?? null,
                },
            });
            return;
        }

        if (!selectedAssignmentId || !row.selectedSubmissionId) return;

        navigate(`/program-admin/activities/${externalActivityId}/assignment/${selectedAssignmentId}/evaluation/${row.participantId}`, {
            state: {
                evaluationDetailEntryDirection: "forward",
            },
        });
    }

    return (
        <div className={"eca-admin-evaluation-page" + (enterFromDetail ? " is-enter-back" : "")}>
            <header className="eca-admin-evaluation-head">
                  <h1>Evaluation</h1>
            </header>

            {loading ? (
                <p className="eca-admin-evaluation-empty">평가 정보를 불러오는 중입니다.</p>
            ) : error ? (
                <p className="eca-admin-evaluation-empty">{error}</p>
            ) : overview ? (
                <>
                    <section className="eca-admin-evaluation-summary-grid">
                        <article className="eca-admin-evaluation-summary-card">
                            <span>Assignment</span>
                            <strong>{overview.summary.totalAssignmentCount}</strong>
                        </article>

                        <article className="eca-admin-evaluation-summary-card">
                            <span>To Grade</span>
                            <strong>{overview.summary.toGradeSubmissionCount}</strong>
                        </article>

                        <article className="eca-admin-evaluation-summary-card">
                            <span>Average Score</span>
                            <strong>{formatNumber(overview.summary.averageStudentTotalScore)}</strong>
                        </article>
                    </section>

                    <section className="eca-admin-evaluation-list-card">
                        <div className="eca-admin-evaluation-list-title">
                            List ({overview.rows.length})
                        </div>

                        <div className="eca-admin-evaluation-dropdown-wrap" ref={dropdownRef}>
                            <button type="button" className="eca-admin-evaluation-dropdown-button" onClick={() => setDropdownOpen((prev) => !prev)}>
                                <span>{getSelectedAssignmentName()}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>

                            {dropdownOpen ? (
                                <div className="eca-admin-evaluation-dropdown-menu">
                                    <button type="button" className={selectedAssignmentId === null ? "is-active" : ""} onClick={() => selectAssignment(null)}>
                                        All
                                    </button>

                                    {overview.assignments.map((assignment) => (
                                        <button type="button" key={assignment.assignmentId} className={selectedAssignmentId === assignment.assignmentId ? "is-active" : ""} onClick={() => selectAssignment(assignment.assignmentId)}>
                                            {assignment.assignmentName}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {isAllView ? (
                            <div className="eca-admin-evaluation-table-head eca-admin-evaluation-table-head--all">
                                <span>Name</span>
                                <span>Submitted</span>
                                <span>Graded</span>
                                <span>Total Score</span>
                                <span />
                            </div>
                        ) : (
                            <div className="eca-admin-evaluation-table-head eca-admin-evaluation-table-head--assignment">
                                <span>Name</span>
                                {overview.criteria.map((criterion) => (
                                    <span key={criterion.criterionId}>{criterion.name}</span>
                                ))}
                                <span>Total Score</span>
                                <span />
                            </div>
                        )}

                        <div className="eca-admin-evaluation-row-list">
                            {overview.rows.length === 0 ? (
                                <p className="eca-admin-evaluation-empty is-card">표시할 평가 정보가 없습니다.</p>
                            ) : (
                                overview.rows.map((row) => {
                                    const disabled = !isAllView && !row.selectedSubmissionId;

                                    return (
                                        <button
                                            type="button"
                                            key={`${row.participantType}-${row.participantId}-${row.userId ?? row.teamId ?? "none"}`}
                                            className={isAllView ? "eca-admin-evaluation-row eca-admin-evaluation-row--all" : "eca-admin-evaluation-row eca-admin-evaluation-row--assignment"}
                                            onClick={() => moveRow(row)}
                                            disabled={disabled}
                                        >
                                            <span className="eca-admin-evaluation-profile-cell">
                                                <span className="eca-admin-evaluation-avatar">
                                                    {row.profileImage ? <img src={row.profileImage} alt="" /> : null}
                                                </span>
                                                <strong>{row.participantName}</strong>
                                            </span>

                                            {isAllView ? (
                                                <>
                                                    <span>{getSubmittedRatio(row)}</span>
                                                    <span>{getGradedRatio(row)}</span>
                                                    <b>{formatNumber(row.totalScore)}</b>
                                                </>
                                            ) : (
                                                <>
                                                    {overview.criteria.map((criterion) => (
                                                        <span key={criterion.criterionId}>
                                                            {getCriterionScore(row, criterion.criterionId)}
                                                        </span>
                                                    ))}
                                                    <b>{formatNumber(row.totalScore)}</b>
                                                </>
                                            )}

                                            <span className="eca-admin-evaluation-arrow">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </>
            ) : null}
        </div>
    );
}