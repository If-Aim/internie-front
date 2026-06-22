import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { downloadSubmissionFile, getAssignmentSubmissions, getExternalActivity, getSubmissionEvaluation, getSubmissionFilePreview, saveSubmissionEvaluation } from "../../../../../../api/ea";
import type { AssignmentEvaluationItemResponse, AssignmentParticipantResponse, AssignmentResponse, AssignmentSubmissionEvaluationResponse, AssignmentSubmissionResponse, ExternalActivityResponse, SubmissionFilePreviewResponse, SubmissionFileResponse } from "../../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./assignmentEvaluation.css";

type PreviewFile = SubmissionFileResponse;

function getParticipantName(participant: AssignmentParticipantResponse): string {
    if (participant.participantType === "TEAM") return participant.teamName?.trim() || "팀 이름 없음";

    return participant.userName?.trim() || "이름 없음";
}

function getTeamLabel(participant: AssignmentParticipantResponse, assignment: AssignmentResponse | null): string {
    if (participant.participantType === "TEAM") return participant.teamName?.trim() || "Team";

    if (assignment?.systemForm === "TEAM") return "Team";

    return "";
}

function getFileName(file?: SubmissionFileResponse | null): string {
    if (!file) return "제출 파일 없음";

    return file.originalFileName ?? `submission-file-${file.submissionFileId}`;
}

function isImageContentType(contentType?: string | null): boolean {
    return (contentType ?? "").toLowerCase().startsWith("image/");
}

function isPdfContentType(contentType?: string | null): boolean {
    return (contentType ?? "").toLowerCase() === "application/pdf";
}

function isPreviewableFileCandidate(file?: SubmissionFileResponse | null): boolean {
    if (!file || file.submitType === "LINK") return false;

    const name = getFileName(file).toLowerCase();
    const type = (file.contentType ?? "").toLowerCase();

    return type === "application/pdf" || type.startsWith("image/") || name.endsWith(".pdf") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".webp");
}

function getSubmittedFile(files: SubmissionFileResponse[]): PreviewFile | null {
    const fileItems = files.filter((file) => file.submitType !== "LINK");
    const previewableFile = fileItems.find((file) => isPreviewableFileCandidate(file));

    return previewableFile ?? fileItems[0] ?? null;
}

function getSubmittedLink(files: SubmissionFileResponse[]): SubmissionFileResponse | null {
    return files.find((file) => file.submitType === "LINK") ?? null;
}

function getSubmittedLinkUrl(file?: SubmissionFileResponse | null): string {
    if (!file) return "";

    const linkFile = file as SubmissionFileResponse & {
        url?: string | null;
        fileUrl?: string | null;
    };

    return (linkFile.url ?? linkFile.fileUrl ?? "").trim();
}

function getExternalLinkHref(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;

    return `https://${url}`;
}

function toScoreMap(criteria: AssignmentEvaluationItemResponse[]): Record<number, number> {
    return criteria.reduce<Record<number, number>>((acc, criterion) => {
        acc[criterion.criterionId] = criterion.score;
        return acc;
     }, {});
}

function hasSavedEvaluation(evaluation: AssignmentSubmissionEvaluationResponse): boolean {
    return Boolean((evaluation as AssignmentSubmissionEvaluationResponse & { evaluatedAt?: string | null }).evaluatedAt);
}

export default function EcaAssignmentEvaluationPage(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId, assignmentId, participantId } = useParams<{ externalActivityId?: string; assignmentId?: string; participantId?: string }>();
    const { organization, organizationLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [participant, setParticipant] = React.useState<AssignmentParticipantResponse | null>(null);
    const [submission, setSubmission] = React.useState<AssignmentSubmissionResponse | null>(null);
    const [evaluation, setEvaluation] = React.useState<AssignmentSubmissionEvaluationResponse | null>(null);
    const [preview, setPreview] = React.useState<SubmissionFilePreviewResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");
    const [previewError, setPreviewError] = React.useState("");
    const [criterionIndex, setCriterionIndex] = React.useState(0);
    const [scoreByCriterionId, setScoreByCriterionId] = React.useState<Record<number, number | undefined>>({});
    const [feedback, setFeedback] = React.useState("");
    const [pageLeaving, setPageLeaving] = React.useState(false);
    const [criterionSlideDirection, setCriterionSlideDirection] = React.useState<"prev" | "next">("next");
    const [criterionSlideActive, setCriterionSlideActive] = React.useState(false);
    
    const pageLeaveTimerRef = React.useRef<number | null>(null);

    const criteria = evaluation?.criteria ?? [];
    const currentCriterion = criteria[criterionIndex] ?? null;
    const currentScore = currentCriterion ? scoreByCriterionId[currentCriterion.criterionId] : undefined;
    const files = submission?.files ?? [];
    const previewFile = getSubmittedFile(files);
    const previewLink = getSubmittedLink(files);
    const previewFileId = previewFile?.submissionFileId ?? null;
    const previewFileName = previewFile?.originalFileName ?? "";
    const previewFileContentType = previewFile?.contentType ?? "";
    const lateSubmitted = evaluation?.lateOnSubmission ?? submission?.lateOnSubmission ?? participant?.status === "LATE_SUBMITTED";
    const teamLabel = participant && assignment ? getTeamLabel(participant, assignment) : "";

    React.useEffect(() => {
        async function fetchEvaluationData(): Promise<void> {
            if (organizationLoading) return;

            if (!organization?.organizationId || !externalActivityId || !assignmentId || !participantId) {
                setError("평가 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");
            setPreview(null);
            setPreviewError("");
            setEvaluation(null);
            setScoreByCriterionId({});
            setFeedback("");
            setCriterionSlideActive(false);

            try {
                const activityData: ExternalActivityResponse = await getExternalActivity(organization.organizationId, externalActivityId);
                const foundAssignment = (activityData.assignments ?? []).find((item) => String(item.assignmentId) === assignmentId) ?? null;
                const foundParticipant = (foundAssignment?.participants ?? []).find((item) => String(item.assignmentParticipantId) === participantId) ?? null;
                const submissionData = await getAssignmentSubmissions(assignmentId);
                const foundSubmission = submissionData.find((item) => foundParticipant && item.participantId === foundParticipant.assignmentParticipantId) ?? null;

                setAssignment(foundAssignment);
                setParticipant(foundParticipant);
                setSubmission(foundSubmission);

                if (!foundAssignment || !foundParticipant) {
                    setError("평가 대상을 찾을 수 없습니다.");
                    return;
                }

                if (!foundSubmission) {
                    setEvaluation(null);
                    setScoreByCriterionId({});
                    setFeedback("");
                    return;
                }

                const evaluationData = await getSubmissionEvaluation(foundSubmission.submissionId);

                setEvaluation(evaluationData);
                setScoreByCriterionId(hasSavedEvaluation(evaluationData) ? toScoreMap(evaluationData.criteria) : {});
                setFeedback(evaluationData.feedback ?? "");
                setCriterionIndex(0);
            } catch (e) {
                console.error(e);
                setAssignment(null);
                setParticipant(null);
                setSubmission(null);
                setEvaluation(null);
                setPreview(null);
                setScoreByCriterionId({});
                setFeedback("");
                setError("평가 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchEvaluationData();
    }, [assignmentId, externalActivityId, organization?.organizationId, organizationLoading, participantId]);

    React.useEffect(() => {
        let cancelled = false;

        async function fetchPreview(): Promise<void> {
            setPreview(null);
            setPreviewError("");

            if (!previewFile || !isPreviewableFileCandidate(previewFile)) {
                return;
            }

            setPreviewLoading(true);

            try {
                const previewData = await getSubmissionFilePreview(previewFile.submissionFileId);

                if (!cancelled) {
                    setPreview(previewData);
                }
            } catch (e) {
                console.error(e);

                if (!cancelled) {
                    setPreview(null);
                    setPreviewError("미리보기를 불러오지 못했습니다.");
                }
            } finally {
                if (!cancelled) {
                    setPreviewLoading(false);
                }
            }
        }

        fetchPreview();

        return () => {
            cancelled = true;
        };
    }, [previewFileId, previewFileName, previewFileContentType]);

    React.useEffect(() => {
        return () => {
            if (pageLeaveTimerRef.current !== null) {
                window.clearTimeout(pageLeaveTimerRef.current);
            }
        };
    }, []);

    function moveBack(): void {
        if (!externalActivityId || !assignmentId || pageLeaving) return;

        window.sessionStorage.setItem(`eca-assignment-detail-entry-direction:${externalActivityId}:${assignmentId}`, "back");
        setPageLeaving(true);

        pageLeaveTimerRef.current = window.setTimeout(() => {
            navigate(-1);
        }, 280);
    }

    function movePrevCriterion(): void {
        if (criterionIndex <= 0) return;

        setCriterionSlideDirection("prev");
        setCriterionSlideActive(true);
        setCriterionIndex((prev) => Math.max(prev - 1, 0));
    }

    function moveNextCriterion(): void {
        if (criterionIndex >= criteria.length - 1) return;

        setCriterionSlideDirection("next");
        setCriterionSlideActive(true);
        setCriterionIndex((prev) => Math.min(prev + 1, Math.max(criteria.length - 1, 0)));
    }

    function updateScore(score: number): void {
        if (!currentCriterion) return;

        setScoreByCriterionId((prev) => ({
            ...prev,
            [currentCriterion.criterionId]: score,
        }));
    }

    function hasAllScoresSelected(): boolean {
        return evaluation?.criteria.every((criterion) => typeof scoreByCriterionId[criterion.criterionId] === "number") ?? false;
    }

    async function handleDownloadFile(): Promise<void> {
        if (!previewFile) return;

        try {
            await downloadSubmissionFile(previewFile);
        } catch (e) {
            console.error(e);
            window.alert("파일 다운로드에 실패했습니다.");
        }
    }

    async function handleSave(): Promise<void> {
        if (!submission || !evaluation || saving) return;

        if (!hasAllScoresSelected()) {
            window.alert("모든 평가 기준의 점수를 선택해주세요.");
            return;
        }

        setSaving(true);

        try {
            const saved = await saveSubmissionEvaluation(submission.submissionId, {
                feedback,
                scores: evaluation.criteria.map((criterion) => ({
                    criterionId: criterion.criterionId,
                    score: scoreByCriterionId[criterion.criterionId] as number,
                })),
            });

            setEvaluation(saved);
            setScoreByCriterionId(toScoreMap(saved.criteria));
            setFeedback(saved.feedback ?? "");
            window.alert("평가가 저장되었습니다.");
        } catch (e) {
            console.error(e);
            window.alert("평가 저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }

    function renderSubmittedLink(): React.ReactElement | null {
        const linkUrl = getSubmittedLinkUrl(previewLink);

        if (!linkUrl) return null;

        return (
            <div className="eca-admin-assignment-evaluation-link-box">
                <strong>제출 링크</strong>
                <a href={getExternalLinkHref(linkUrl)} target="_blank" rel="noreferrer">
                    {linkUrl}
                </a>
            </div>
        );
    }

    function renderPreviewContent(): React.ReactElement {
        const submittedLinkUrl = getSubmittedLinkUrl(previewLink);

        if (previewLoading) {
            return <p className="eca-admin-assignment-evaluation-empty">미리보기를 불러오는 중입니다.</p>;
        }

        if (preview?.previewUrl && isImageContentType(preview.contentType)) {
            return <img className="eca-admin-assignment-evaluation-preview-image" src={preview.previewUrl} alt={preview.originalFileName ?? getFileName(previewFile)} />;
        }

        if (preview?.previewUrl && isPdfContentType(preview.contentType)) {
            return <iframe className="eca-admin-assignment-evaluation-preview-frame" src={preview.previewUrl} title={preview.originalFileName ?? getFileName(previewFile)} />;
        }

        if (previewFile) {
            return (
                <div className="eca-admin-assignment-evaluation-file-box">
                    <strong>{getFileName(previewFile)}</strong>
                    <span>{previewError || "이 파일은 미리보기를 지원하지 않습니다."}</span>
                    <button type="button" onClick={handleDownloadFile}>파일 다운로드</button>
                </div>
            );
        }

        if (submittedLinkUrl) {
            return <p className="eca-admin-assignment-evaluation-empty">제출 링크가 아래에 표시됩니다.</p>;
        }

        return <p className="eca-admin-assignment-evaluation-empty">표시할 제출 자료가 없습니다.</p>;
    }

    const pageClassName = `eca-admin-assignment-evaluation-page${pageLeaving ? " is-leaving" : ""}`;
    const criterionSlideClassName = `eca-admin-assignment-evaluation-criterion-slide${criterionSlideActive ? ` is-${criterionSlideDirection}` : ""}`;
    if (loading) {
        return (
            <div className={pageClassName}>
                <p className="eca-admin-assignment-evaluation-empty">평가 정보를 불러오는 중입니다.</p>
            </div>
        );
    }

    if (error || !assignment || !participant) {
        return (
            <div className={pageClassName}>
                <button type="button" className="eca-admin-assignment-evaluation-back-button" onClick={moveBack} aria-label="뒤로가기">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <p className="eca-admin-assignment-evaluation-empty">{error || "평가 정보를 찾을 수 없습니다."}</p>
            </div>
        );
    }

    return (
        <div className={pageClassName}>
            <header className="eca-admin-assignment-evaluation-head">
                <button type="button" className="eca-admin-assignment-evaluation-back-button" onClick={moveBack} aria-label="뒤로가기">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <h1>{assignment.name}</h1>
            </header>
            <section className="eca-admin-assignment-evaluation-layout">
                <div className="eca-admin-assignment-evaluation-column">
                    <div className="eca-admin-assignment-evaluation-preview-title">
                        <strong>{getParticipantName(participant)}</strong>
                        {teamLabel ? <span>{teamLabel}</span> : null}
                    </div>

                    <article className="eca-admin-assignment-evaluation-preview-card">
                        {renderPreviewContent()}
                    </article>
                    {renderSubmittedLink()}
                </div>

                <div className="eca-admin-assignment-evaluation-column">
                    <div className="eca-admin-assignment-evaluation-evaluation-title">
                        <strong>Evaluation</strong>
                        {lateSubmitted ? <span className="eca-admin-assignment-evaluation-late-badge">지각 제출</span> : null}
                    </div>

                    <aside className="eca-admin-assignment-evaluation-panel">
                        <div className="eca-admin-assignment-evaluation-criteria-head">
                            <h2>Criteria</h2>
                            <span>{criteria.length > 0 ? `${criterionIndex + 1}/${criteria.length}` : "0/0"}</span>
                        </div>

                        <div className="eca-admin-assignment-evaluation-criterion-viewport">
                            <div key={currentCriterion?.criterionId ?? criterionIndex} className={criterionSlideClassName}>
                                <div className="eca-admin-assignment-evaluation-criteria-row">
                                    <strong>{currentCriterion?.name ?? "-"}</strong>
                                    <div className="eca-admin-assignment-evaluation-step-buttons">
                                        <button type="button" onClick={movePrevCriterion} disabled={criterionIndex === 0} aria-label="이전 기준">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                                                <circle cx="18" cy="18" r="18" fill="#F6F6F6"/>
                                                <path d="M20 23L15 18L20 13" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        <button type="button" onClick={moveNextCriterion} disabled={criterionIndex >= criteria.length - 1} aria-label="다음 기준">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                                                <circle cx="18" cy="18" r="18" fill="#F6F6F6"/>
                                                <path d="M16 13L21 18L16 23" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="eca-admin-assignment-evaluation-score-list">
                                    {Array.from({ length: currentCriterion?.maxScore ?? 10 }, (_, index) => index + 1).map((score) => (
                                        <button
                                            type="button"
                                            key={score}
                                            className={"eca-admin-assignment-evaluation-score-dot" + (currentScore !== undefined && score <= currentScore ? " is-selected" : "")}
                                            onClick={() => updateScore(score)}
                                            disabled={!currentCriterion}
                                            aria-label={`${score}점`}
                                        />
                                    ))}
                                </div>

                                <div className="eca-admin-assignment-evaluation-score-labels">
                                    <span>1</span>
                                    <span>{currentCriterion?.maxScore ?? 10}</span>
                                </div>
                            </div>
                        </div>

                        <label className="eca-admin-assignment-evaluation-feedback">
                            <strong>Feedback</strong>
                            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="텍스트를 입력하세요..." disabled={!submission || !evaluation || saving} />
                        </label>

                        <button type="button" className="eca-admin-assignment-evaluation-save-button" onClick={handleSave} disabled={!submission || !evaluation || saving}>
                            {saving ? "saving..." : "save"}
                        </button>
                    </aside>
                </div>
            </section>
        </div>
    );
}