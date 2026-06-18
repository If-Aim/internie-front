import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { downloadSubmissionFile, getAssignmentSubmissions, getExternalActivity, getSubmissionFilePreview } from "../../../../../../api/ea";
import type { AssignmentParticipantResponse, AssignmentResponse, AssignmentSubmissionResponse, ExternalActivityResponse, SubmissionFilePreviewResponse, SubmissionFileResponse } from "../../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./assignmentEvaluation.css";

type SubmissionStatus = "SUBMITTED" | "LATE_SUBMITTED" | "NOT_SUBMITTED" | "LATE";

type CriterionKey = "Participation" | "Intent" | "Content";

type Criterion = {
    key: CriterionKey;
    label: string;
};

type PreviewFile = SubmissionFileResponse;

const CRITERIA: Criterion[] = [
    { key: "Participation", label: "Participation" },
    { key: "Intent", label: "Intent" },
    { key: "Content", label: "Content" },
];

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

export default function EcaAssignmentEvaluationPage(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId, assignmentId, participantId } = useParams<{ externalActivityId?: string; assignmentId?: string; participantId?: string }>();
    const { organization, organizationLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [participant, setParticipant] = React.useState<AssignmentParticipantResponse | null>(null);
    const [submission, setSubmission] = React.useState<AssignmentSubmissionResponse | null>(null);
    const [preview, setPreview] = React.useState<SubmissionFilePreviewResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [previewError, setPreviewError] = React.useState("");
    const [criterionIndex, setCriterionIndex] = React.useState(0);
    const [scores, setScores] = React.useState<Record<CriterionKey, number>>({
        Participation: 0,
        Intent: 0,
        Content: 0,
    });
    const [feedback, setFeedback] = React.useState("");

    const currentCriterion = CRITERIA[criterionIndex];
    const currentScore = scores[currentCriterion.key];
    const files = submission?.files ?? [];
    const previewFile = getSubmittedFile(files);
    const previewLink = getSubmittedLink(files);
    const previewFileId = previewFile?.submissionFileId ?? null;
    const previewFileName = previewFile?.originalFileName ?? "";
    const previewFileContentType = previewFile?.contentType ?? "";
    const status = participant?.status as SubmissionStatus | undefined;

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
                }
            } catch (e) {
                console.error(e);
                setAssignment(null);
                setParticipant(null);
                setSubmission(null);
                setPreview(null);
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

    function moveBack(): void {
        navigate(`/program-admin/activities/${externalActivityId}/assignment/${assignmentId}`);
    }

    function movePrevCriterion(): void {
        setCriterionIndex((prev) => Math.max(prev - 1, 0));
    }

    function moveNextCriterion(): void {
        setCriterionIndex((prev) => Math.min(prev + 1, CRITERIA.length - 1));
    }

    function updateScore(score: number): void {
        setScores((prev) => ({
            ...prev,
            [currentCriterion.key]: score,
        }));
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

    function handleSave(): void {
        window.alert("평가 저장 API가 아직 없어 임시 저장 동작만 처리했습니다.");
    }

    function renderPreviewContent(): React.ReactElement {
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

        if (previewLink?.url) {
            return (
                <div className="eca-admin-assignment-evaluation-file-box">
                    <strong>제출 링크</strong>
                    <a href={previewLink.url} target="_blank" rel="noreferrer">{previewLink.url}</a>
                </div>
            );
        }

        return <p className="eca-admin-assignment-evaluation-empty">표시할 제출 자료가 없습니다.</p>;
    }

    if (loading) {
        return (
            <div className="eca-admin-assignment-evaluation-page">
                <p className="eca-admin-assignment-evaluation-empty">평가 정보를 불러오는 중입니다.</p>
            </div>
        );
    }

    if (error || !assignment || !participant) {
        return (
            <div className="eca-admin-assignment-evaluation-page">
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
        <div className="eca-admin-assignment-evaluation-page">
            <header className="eca-admin-assignment-evaluation-head">
                <button type="button" className="eca-admin-assignment-evaluation-back-button" onClick={moveBack} aria-label="뒤로가기">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <h1>{assignment.name}</h1>

                {status === "LATE_SUBMITTED" ? (
                    <span className="eca-admin-assignment-evaluation-late-badge">지각 제출</span>
                ) : null}
            </header>

            <div className="eca-admin-assignment-evaluation-meta">
                <strong>{getParticipantName(participant)}</strong>
                <span>{getTeamLabel(participant, assignment)}</span>
                <strong>Evaluation</strong>
            </div>

            <section className="eca-admin-assignment-evaluation-layout">
                <article className="eca-admin-assignment-evaluation-preview-card">
                    {renderPreviewContent()}
                </article>

                <aside className="eca-admin-assignment-evaluation-panel">
                    <div className="eca-admin-assignment-evaluation-criteria-head">
                        <h2>Criteria</h2>
                        <span>{criterionIndex + 1}/{CRITERIA.length}</span>
                    </div>

                    <div className="eca-admin-assignment-evaluation-criteria-row">
                        <strong>{currentCriterion.label}</strong>

                        <div className="eca-admin-assignment-evaluation-step-buttons">
                            <button type="button" onClick={movePrevCriterion} disabled={criterionIndex === 0} aria-label="이전 기준">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                    <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button type="button" onClick={moveNextCriterion} disabled={criterionIndex === CRITERIA.length - 1} aria-label="다음 기준">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                    <path d="M8 5L13 10L8 15" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="eca-admin-assignment-evaluation-score-list">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                            <button
                                type="button"
                                key={score}
                                className={"eca-admin-assignment-evaluation-score-dot" + (score <= currentScore ? " is-selected" : "")}
                                onClick={() => updateScore(score)}
                                aria-label={`${score}점`}
                            />
                        ))}
                    </div>

                    <div className="eca-admin-assignment-evaluation-score-labels">
                        <span>1</span>
                        <span>10</span>
                    </div>

                    <label className="eca-admin-assignment-evaluation-feedback">
                        <strong>Feedback</strong>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="텍스트를 입력하세요..." />
                    </label>

                    <button type="button" className="eca-admin-assignment-evaluation-save-button" onClick={handleSave}>
                        save
                    </button>
                </aside>
            </section>
        </div>
    );
}