import React from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { downloadSubmissionFile, getAssignment, getMyAssignmentSubmissions, getMyExternalActivityAssignments, getMyParticipatingExternalActivity, getSubmissionEvaluation, submitAssignment, updateAssignmentSubmission } from "../../../../../../api/ea";
import type { AssignmentResponse, AssignmentResultForm, AssignmentSubmissionEvaluationResponse, AssignmentSubmissionResponse, StudentAssignmentResponse, StudentExternalActivityDetailResponse, SubmissionFileResponse } from "../../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, formatServerKstDateTimeDotForUser } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileAssignmentSubmit.css";
import { getFileIconByExtension } from "../../../../desktop/eca/dashboard/assignment/fileIcons";

type UploadFileItem = {
    id: string;
    file: File;
    extension: string;
};

function formatDateTime(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): string {
    return formatServerKstDateAndTimeCompactForUser(date, time, fallbackTime).slice(2);
}

function formatSubmittedAt(value?: string | null): string {
    return formatServerKstDateTimeDotForUser(value);
}

function getLatestSubmittedAt(submission: AssignmentSubmissionResponse): string {
    return submission.updatedAt ?? submission.submittedAt;
}

function isSameNumberArray(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort((prev, next) => prev - next);
    const sortedB = [...b].sort((prev, next) => prev - next);

    return sortedA.every((value, index) => value === sortedB[index]);
}

function getResultFormLabel(value?: AssignmentResultForm | null): string {
    if (value === "WRITING") return "문서";
    if (value === "VIDEO") return "영상";
    if (value === "IMAGE") return "사진";
    if (value === "LINK") return "링크";
    if (value === "ETC") return "기타";
    return value ?? "-";
}

function getStudentAssignmentFormLabel(
    assignment: AssignmentResponse | null,
    studentAssignment: StudentAssignmentResponse | null
): string {
    const isTeamAssignment = studentAssignment?.isTeamAssignment ?? (assignment?.systemForm === "TEAM");

    if (!isTeamAssignment) return "개인";

    const teamName = studentAssignment?.myTeam?.name?.trim();

    return teamName ? `팀 · ${teamName}` : "팀";
}

function getResultFormsLabel(values?: AssignmentResultForm[] | null): string {
    if (!values || values.length === 0) return "-";

    return values.map(getResultFormLabel).join(", ");
}

function getFileExtension(fileName: string): string {
    const extension = fileName.split(".").pop();

    if (!extension || extension === fileName) return "file";

    return extension.toLowerCase();
}

function normalizeExtension(extension: string): string {
    const lower = extension.toLowerCase();

    if (lower === "jpeg") return "jpg";
    if (lower === "pptx") return "ppt";
    if (lower === "docx") return "doc";
    if (lower === "xlsx") return "xls";

    return lower;
}

function isAllowedAssignmentFile(resultForms?: AssignmentResultForm[] | null, extension?: string | null): boolean {
    if (!resultForms || resultForms.length === 0 || !extension) return true;

    const normalizedExtension = normalizeExtension(extension);

    const allowedExtensionsByResultForm: Record<Exclude<AssignmentResultForm, "LINK">, string[]> = {
        WRITING: ["txt", "doc", "pdf", "hwp"],
        IMAGE: ["jpg", "png", "gif", "webp", "svg"],
        VIDEO: ["mp4", "mov", "avi", "mpg"],
        ETC: [],
    };

    return resultForms
        .filter((resultForm): resultForm is Exclude<AssignmentResultForm, "LINK"> => resultForm !== "LINK")
        .some((resultForm) => {
            const allowedExtensions = allowedExtensionsByResultForm[resultForm];

            if (allowedExtensions.length === 0) return true;

            return allowedExtensions.includes(normalizedExtension);
        });
}

function getAssignmentFileWarning(resultForms?: AssignmentResultForm[] | null, extension?: string | null): string {
    if (isAllowedAssignmentFile(resultForms, extension)) return "";

    return "과제 형식을 확인해주세요!";
}

function isValidHttpUrl(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) return false;

    try {
        const url = new URL(trimmedValue);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function getEvaluationTotalScore(evaluation?: AssignmentSubmissionEvaluationResponse | null): number {
    return evaluation?.criteria.reduce((total, item) => total + item.score, 0) ?? 0;
}

function getEvaluationTotalMaxScore(evaluation?: AssignmentSubmissionEvaluationResponse | null): number {
    return evaluation?.criteria.reduce((total, item) => total + item.maxScore, 0) ?? 0;
}

function isEvaluationCompleted(submission?: AssignmentSubmissionResponse | null, evaluation?: AssignmentSubmissionEvaluationResponse | null): boolean {
    return submission?.status === "REVIEWED" || !!evaluation?.evaluationId || !!evaluation?.evaluatedAt;
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

export default function EcaMobileAssignmentSubmit(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId, assignmentId } = useParams<{ externalActivityId?: string; assignmentId?: string }>();

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [mySubmission, setMySubmission] = React.useState<AssignmentSubmissionResponse | null>(null);
    const [existingFiles, setExistingFiles] = React.useState<SubmissionFileResponse[]>([]);
    const [existingLinks, setExistingLinks] = React.useState<SubmissionFileResponse[]>([]);
    const [initialExistingFileIds, setInitialExistingFileIds] = React.useState<number[]>([]);
    const [initialExistingLinkIds, setInitialExistingLinkIds] = React.useState<number[]>([]);
    const [files, setFiles] = React.useState<UploadFileItem[]>([]);
    
    const [linkUrl, setLinkUrl] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [submitResultModalOpen, setSubmitResultModalOpen] = React.useState(false);
    const [submitResult, setSubmitResult] = React.useState<"success" | "fail">("success");

    const [evaluation, setEvaluation] = React.useState<AssignmentSubmissionEvaluationResponse | null>(null);
    const [studentAssignment, setStudentAssignment] = React.useState<StudentAssignmentResponse | null>(null);

    async function fetchMySubmission(targetAssignmentId: string): Promise<void> {
        const data = await getMyAssignmentSubmissions(targetAssignmentId);
        const latestSubmission = data[0] ?? null;
        const nextFiles = latestSubmission?.files?.filter((file) => file.submitType !== "LINK") ?? [];
        const nextLinks = latestSubmission?.files?.filter((file) => file.submitType === "LINK") ?? [];

        setMySubmission(latestSubmission);
        setExistingFiles(nextFiles);
        setExistingLinks(nextLinks);
        setInitialExistingFileIds(nextFiles.map((file) => file.submissionFileId));
        setInitialExistingLinkIds(nextLinks.map((file) => file.submissionFileId));
        setLinkUrl("");

        if (!latestSubmission) {
            setEvaluation(null);
            return;
        }

        try {
            const evaluationData = await getSubmissionEvaluation(latestSubmission.submissionId);
            setEvaluation(evaluationData);
        } catch (e) {
            console.error(e);
            setEvaluation(null);
        }
    }

    React.useEffect(() => {
        async function fetchPageData(): Promise<void> {
            if (!externalActivityId || !assignmentId) {
                setError("과제 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [activityData, assignmentData, assignmentListData] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getAssignment(assignmentId),
                    getMyExternalActivityAssignments(externalActivityId),
                ]);

                const matchedStudentAssignment = assignmentListData.find((item) => String(item.assignmentId) === String(assignmentId)) ?? null;

                setActivity(activityData);
                setAssignment(assignmentData);
                setStudentAssignment(matchedStudentAssignment);
                await fetchMySubmission(assignmentId);
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignment(null);
                setStudentAssignment(null);
                setMySubmission(null);
                setExistingFiles([]);
                setExistingLinks([]);
                setFiles([]);
                setLinkUrl("");
                setEvaluation(null);
                setError("과제 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchPageData();
    }, [externalActivityId, assignmentId]);

    const resultForms = assignment?.resultForms ?? [];
    const acceptsLink = resultForms.includes("LINK");
    const acceptsFile = resultForms.some((form) => form !== "LINK");
    const trimmedLinkUrl = linkUrl.trim();
    const hasAnyLink = existingLinks.length > 0 || trimmedLinkUrl.length > 0;
    const hasInvalidLink = trimmedLinkUrl.length > 0 && !isValidHttpUrl(trimmedLinkUrl);
    const hasInvalidFileType = files.some((item) => !isAllowedAssignmentFile(assignment?.resultForms, item.extension));
    const hasAnyFile = existingFiles.length > 0 || files.length > 0;
    const hasRequiredSubmission = (acceptsFile && hasAnyFile) || (acceptsLink && hasAnyLink);
    const currentExistingFileIds = existingFiles.map((file) => file.submissionFileId);
    const currentExistingLinkIds = existingLinks.map((file) => file.submissionFileId);
    const hasFileChange = files.length > 0 || !isSameNumberArray(initialExistingFileIds, currentExistingFileIds);
    const hasLinkChange = trimmedLinkUrl.length > 0 || !isSameNumberArray(initialExistingLinkIds, currentExistingLinkIds);
    const hasSubmissionChange = !mySubmission || hasFileChange || hasLinkChange;

    const evaluationCompleted = isEvaluationCompleted(mySubmission, evaluation);
    const evaluationTotalScore = getEvaluationTotalScore(evaluation);
    const evaluationTotalMaxScore = getEvaluationTotalMaxScore(evaluation);
    
    const submitDisabled = evaluationCompleted || !hasRequiredSubmission || !hasSubmissionChange || hasInvalidFileType || hasInvalidLink || submitting || loading || !!error;


    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function moveBack(): void {
        navigate(-1);
    }

    function openFilePicker(): void {
        if (evaluationCompleted) return;

        fileInputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        if (evaluationCompleted) {
            e.target.value = "";
            return;
        }

        const selectedFiles = Array.from(e.target.files ?? []);

        if (selectedFiles.length === 0) return;

        const validFiles = selectedFiles.filter((file) => file.size > 0);

        if (validFiles.length === 0) {
            window.alert("비어 있는 파일은 제출할 수 없습니다.");
            e.target.value = "";
            return;
        }

        const nextFiles = validFiles.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            file,
            extension: getFileExtension(file.name),
        }));

        setFiles((prev) => {
            const prevIds = new Set(prev.map((item) => item.id));
            const filtered = nextFiles.filter((item) => !prevIds.has(item.id));

            return [...prev, ...filtered];
        });

        e.target.value = "";
    }

    function removeFile(fileId: string): void {
        if (evaluationCompleted) return;

        setFiles((prev) => prev.filter((item) => item.id !== fileId));
    }

    function removeExistingFile(fileId: number): void {
        if (evaluationCompleted) return;

        setExistingFiles((prev) => prev.filter((file) => file.submissionFileId !== fileId));
    }

    function removeExistingLink(fileId: number): void {
        if (evaluationCompleted) return;

        setExistingLinks((prev) => prev.filter((file) => file.submissionFileId !== fileId));
    }

    async function handleDownloadExistingFile(file: SubmissionFileResponse): Promise<void> {
        try {
            await downloadSubmissionFile(file);
        } catch (e) {
            console.error(e);
            window.alert("파일 다운로드에 실패했습니다.");
        }
    }

    async function handleSubmit(): Promise<void> {
        if (!assignmentId || submitting || evaluationCompleted) return;

        if (!hasRequiredSubmission) {
            window.alert(acceptsLink && !acceptsFile ? "제출할 링크를 입력해주세요." : "제출할 파일 또는 링크를 입력해주세요.");
            return;
        }

        if (!hasRequiredSubmission) {
            window.alert(acceptsLink && !acceptsFile ? "제출할 링크를 입력해주세요." : "제출할 파일 또는 링크를 입력해주세요.");
            return;
        }

        if (hasInvalidLink) {
            window.alert("http 또는 https로 시작하는 링크를 입력해주세요.");
            return;
        }

        if (hasInvalidFileType) {
            window.alert("과제 형식에 맞지 않는 파일이 포함되어 있습니다.");
            return;
        }

        const uploadFiles = files.map((item) => item.file).filter((file): file is File => file instanceof File && file.size > 0);
        const keepFileIds = [
            ...existingFiles.map((file) => file.submissionFileId),
            ...existingLinks.map((file) => file.submissionFileId),
        ];
        const nextUrls = trimmedLinkUrl ? [trimmedLinkUrl] : [];

        setSubmitting(true);

        try {
            if (mySubmission) {
                await updateAssignmentSubmission(mySubmission.submissionId, {
                    files: uploadFiles,
                    keepFileIds,
                    urls: nextUrls,
                });
            } else {
                await submitAssignment(assignmentId, {
                    files: uploadFiles,
                    urls: nextUrls,
                });
            }

            await fetchMySubmission(assignmentId);
            setFiles([]);
            setLinkUrl("");
            setSubmitResult("success");
            setSubmitResultModalOpen(true);
        } catch (e) {
            console.error(e);
            setSubmitResult("fail");
            setSubmitResultModalOpen(true);
        } finally {
            setSubmitting(false);
        }
    }

    function closeSubmitResultModal(): void {
        setSubmitResultModalOpen(false);
    }

    return (
        <>
            <main className="eca-mobile-student-assignment-submit-page">
                <Header activityName={activity?.name ?? ""} onMenuClick={openMenu} />
                <div className="eca-mobile-student-assignment-submit-main">
                    <section className="eca-mobile-student-assignment-submit-title-row">
                        <button type="button" onClick={moveBack} aria-label="뒤로가기">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M14 17L9 12L14 7" stroke="#848484" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        <h2>{assignment?.name ?? ""}</h2>
                    </section>

                    {loading ? (
                        <p className="eca-mobile-student-assignment-submit-empty">과제 정보를 불러오는 중입니다.</p>
                    ) : error ? (
                        <p className="eca-mobile-student-assignment-submit-empty">{error}</p>
                    ) : (
                        <>
                            <section className="eca-mobile-student-assignment-submit-card">
                                <h3>과제 정보</h3>

                                <div className="eca-mobile-student-assignment-submit-field is-full">
                                    <span>과제명</span>
                                    <input value={assignment?.name ?? ""} readOnly />
                                </div>

                                <div className="eca-mobile-student-assignment-submit-period">
                                    <span>과제 수행 기간</span>

                                    <div>
                                        <input value={formatDateTime(assignment?.startDate, assignment?.startTime)} readOnly />
                                        <em>-</em>
                                        <input value={formatDateTime(assignment?.endDate, assignment?.endTime, "23:59:59")} readOnly />
                                    </div>
                                </div>

                                <div className="eca-mobile-student-assignment-submit-grid">
                                    <label>
                                        <span>팀/개인</span>
                                        <input value={getStudentAssignmentFormLabel(assignment, studentAssignment)} readOnly />
                                    </label>

                                    <label>
                                        <span>과제 형태</span>
                                        <input value={getResultFormsLabel(assignment?.resultForms)} readOnly />
                                    </label>
                                </div>
                            </section>

                            <section className="eca-mobile-student-assignment-submit-card">
                                <h3>과제 업로드</h3>

                                {acceptsFile ? (
                                    <>
                                        <button type="button" className="eca-mobile-student-assignment-upload-box" onClick={openFilePicker} disabled={evaluationCompleted}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z" fill="#808080"/>
                                                <path d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z" fill="#808080"/>
                                            </svg>
                                            <span>파일을 업로드해주세요</span>
                                        </button>

                                        <input ref={fileInputRef} type="file" multiple className="eca-mobile-student-assignment-file-input" onChange={handleFileChange} disabled={evaluationCompleted} />
                                    </>
                                ) : null}

                                {acceptsLink ? (
                                    <div className={acceptsFile ? "eca-mobile-student-assignment-link-area" : "eca-mobile-student-assignment-link-area is-only"}>
                                        <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="링크를 붙여주세요" className={hasInvalidLink ? "is-invalid" : ""} disabled={evaluationCompleted} />

                                        {existingLinks.map((link) => (
                                            <div className="eca-mobile-student-assignment-link-item" key={link.submissionFileId}>
                                                {link.url ? (
                                                    <a href={link.url} target="_blank" rel="noreferrer">{link.url}</a>
                                                ) : (
                                                    <span>링크 정보 없음</span>
                                                )}

                                                {!evaluationCompleted ? (
                                                    <button type="button" onClick={() => removeExistingLink(link.submissionFileId)} aria-label="링크 삭제">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                            <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                        </svg>
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}

                                        {hasInvalidLink ? (
                                            <small>http 또는 https로 시작하는 링크를 입력해주세요.</small>
                                        ) : null}
                                    </div>
                                ) : null}

                                {mySubmission ? (
                                    <div className="eca-mobile-student-assignment-submitted-bar">
                                        <span>제출된 과제</span>
                                        <em>마지막 수정 일시:</em>
                                        <strong>{formatSubmittedAt(getLatestSubmittedAt(mySubmission))}</strong>
                                    </div>
                                ) : null}

                                {evaluationCompleted ? (
                                    <div className="eca-mobile-student-assignment-evaluated-bar">
                                        평가가 완료되어 과제를 수정하거나 재제출할 수 없습니다.
                                    </div>
                                ) : null}

                                {existingFiles.length > 0 ? (
                                    <div className="eca-mobile-student-assignment-file-list">
                                        {existingFiles.map((file) => {
                                            const fileName = file.originalFileName ?? `submission-file-${file.submissionFileId}`;
                                            const extension = getFileExtension(fileName);
                                            const warning = getAssignmentFileWarning(assignment?.resultForms, extension);

                                            return (
                                                <div className="eca-mobile-student-assignment-file-item" key={file.submissionFileId}>
                                                    <div className="eca-mobile-student-assignment-file-main">
                                                        <span className="eca-student-assignment-file-icon">
                                                            {getFileIconByExtension(extension)}
                                                        </span>

                                                        <span className="eca-mobile-student-assignment-file-name-wrap">
                                                            <strong>{fileName}</strong>
                                                            {warning ? <em>{warning}</em> : null}
                                                        </span>
                                                    </div>

                                                    <div className="eca-mobile-student-assignment-file-actions">
                                                        <button type="button" className="eca-mobile-student-assignment-file-action-button" onClick={() => handleDownloadExistingFile(file)} aria-label="파일 다운로드">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                <path d="M12 15.5C11.8667 15.5 11.7417 15.475 11.625 15.425C11.5083 15.375 11.4 15.3 11.3 15.2L7.7 11.6C7.5 11.4 7.404 11.1667 7.412 10.9C7.42 10.6333 7.516 10.4 7.7 10.2C7.9 10 8.13767 9.896 8.413 9.888C8.68833 9.88 8.92567 9.97567 9.125 10.175L11 12.05V5C11 4.71667 11.096 4.47933 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99933 12.5203 4.09533 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.05L14.875 10.175C15.075 9.975 15.3127 9.879 15.588 9.887C15.8633 9.895 16.1007 9.99933 16.3 10.2C16.4833 10.4 16.5793 10.6333 16.588 10.9C16.5967 11.1667 16.5007 11.4 16.3 11.6L12.7 15.2C12.6 15.3 12.4917 15.375 12.375 15.425C12.2583 15.475 12.1333 15.5 12 15.5ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#808080"/>
                                                            </svg>
                                                        </button>

                                                        {!evaluationCompleted ? (
                                                            <button type="button" className="eca-mobile-student-assignment-file-action-button" onClick={() => removeExistingFile(file.submissionFileId)} aria-label="파일 삭제">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                                </svg>
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}

                                {files.length > 0 ? (
                                    <div className="eca-mobile-student-assignment-file-list">
                                        {files.map((item) => {
                                            const warning = getAssignmentFileWarning(assignment?.resultForms, item.extension);

                                            return (
                                                <div className="eca-mobile-student-assignment-file-item" key={item.id}>
                                                    <div className="eca-mobile-student-assignment-file-main">
                                                        <span className="eca-student-assignment-file-icon">
                                                            {getFileIconByExtension(item.extension)}
                                                        </span>
                                                        <span>
                                                            <strong>{item.file.name}</strong>
                                                            {warning ? <em>{warning}</em> : null}
                                                        </span>
                                                    </div>

                                                    {!evaluationCompleted ? (
                                                        <button type="button" className="eca-mobile-student-assignment-file-remove" onClick={() => removeFile(item.id)} aria-label="파일 삭제">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                            </svg>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </section>

                            <div className="eca-mobile-student-assignment-submit-button-row">
                                <button type="button" disabled={submitDisabled} onClick={handleSubmit}>
                                    {evaluationCompleted ? "평가 완료" : submitting ? "저장 중" : mySubmission ? "수정하기" : "제출하기"}
                                </button>
                            </div>
                            {evaluationCompleted && evaluation ? (
                                <>
                                    <section className="eca-mobile-student-assignment-submit-card eca-mobile-student-assignment-evaluation-card">
                                        <h3>평가</h3>

                                        <div className="eca-mobile-student-assignment-evaluation-row is-total">
                                            <span>총점</span>
                                            <strong>{evaluationTotalScore}/{evaluationTotalMaxScore}</strong>
                                        </div>

                                        {evaluation.criteria.map((criterion) => (
                                            <div className="eca-mobile-student-assignment-evaluation-row" key={criterion.criterionId}>
                                                <span>{criterion.name}</span>
                                                <strong>{criterion.score}/{criterion.maxScore}</strong>
                                            </div>
                                        ))}
                                    </section>

                                    <section className="eca-mobile-student-assignment-submit-card eca-mobile-student-assignment-feedback-card">
                                        <h3>피드백</h3>
                                        <p>{evaluation.feedback?.trim() || "등록된 피드백이 없습니다."}</p>
                                    </section>
                                </>
                            ) : null}
                        </>
                    )}
                </div>
            </main>

            {submitResultModalOpen ? createPortal(
                <div className="eca-mobile-student-assignment-submit-modal-backdrop">
                    <div className="eca-mobile-student-assignment-submit-modal">
                        <span>
                            {submitResult === "success" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                                    <path d="M35.3337 45.9998L28.167 38.8332C27.5559 38.2221 26.7781 37.9165 25.8337 37.9165C24.8892 37.9165 24.1114 38.2221 23.5003 38.8332C22.8892 39.4443 22.5837 40.2221 22.5837 41.1665C22.5837 42.111 22.8892 42.8887 23.5003 43.4998L33.0003 52.9998C33.667 53.6665 34.4448 53.9998 35.3337 53.9998C36.2226 53.9998 37.0003 53.6665 37.667 52.9998L56.5003 34.1665C57.1114 33.5554 57.417 32.7776 57.417 31.8332C57.417 30.8887 57.1114 30.111 56.5003 29.4998C55.8892 28.8887 55.1114 28.5832 54.167 28.5832C53.2225 28.5832 52.4448 28.8887 51.8337 29.4998L35.3337 45.9998ZM40.0003 73.3332C35.3892 73.3332 31.0559 72.4576 27.0003 70.7065C22.9448 68.9554 19.417 66.581 16.417 63.5832C13.417 60.5854 11.0426 57.0576 9.29366 52.9998C7.54477 48.9421 6.66922 44.6087 6.667 39.9998C6.66477 35.3909 7.54033 31.0576 9.29366 26.9998C11.047 22.9421 13.4214 19.4143 16.417 16.4165C19.4126 13.4187 22.9403 11.0443 27.0003 9.29317C31.0603 7.54206 35.3937 6.6665 40.0003 6.6665C44.607 6.6665 48.9403 7.54206 53.0003 9.29317C57.0603 11.0443 60.5881 13.4187 63.5837 16.4165C66.5792 19.4143 68.9548 22.9421 70.7103 26.9998C72.4659 31.0576 73.3403 35.3909 73.3337 39.9998C73.327 44.6087 72.4514 48.9421 70.707 52.9998C68.9626 57.0576 66.5881 60.5854 63.5837 63.5832C60.5792 66.581 57.0514 68.9565 53.0003 70.7098C48.9492 72.4632 44.6159 73.3376 40.0003 73.3332Z" fill="#0166FF"/>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                                    <path d="M56.6665 11.1333C61.7338 14.0589 65.9418 18.2669 68.8674 23.3342C71.793 28.4016 73.3332 34.1498 73.3332 40.001C73.3331 45.8523 71.7929 51.6004 68.8672 56.6678C65.9415 61.7351 61.7335 65.943 56.6661 68.8685C51.5988 71.7941 45.8506 73.3342 39.9993 73.3342C34.1481 73.3341 28.3999 71.7937 23.3326 68.868C18.2653 65.9423 14.0575 61.7342 11.132 56.6668C8.20644 51.5994 6.66636 45.8512 6.6665 40L6.68317 38.92C6.86985 33.1633 8.545 27.5532 11.5453 22.6366C14.5456 17.72 18.7687 13.6648 23.8028 10.8662C28.8369 8.06768 34.5103 6.62129 40.2699 6.66809C46.0294 6.7149 51.6785 8.25329 56.6665 11.1333ZM39.9998 50C39.1158 50 38.2679 50.3512 37.6428 50.9763C37.0177 51.6014 36.6665 52.4492 36.6665 53.3333V53.3666C36.6665 54.2507 37.0177 55.0985 37.6428 55.7237C38.2679 56.3488 39.1158 56.7 39.9998 56.7C40.8839 56.7 41.7317 56.3488 42.3569 55.7237C42.982 55.0985 43.3332 54.2507 43.3332 53.3666V53.3333C43.3332 52.4492 42.982 51.6014 42.3569 50.9763C41.7317 50.3512 40.8839 50 39.9998 50ZM39.9998 26.6666C39.1158 26.6666 38.2679 27.0178 37.6428 27.6429C37.0177 28.2681 36.6665 29.1159 36.6665 30V43.3333C36.6665 44.2174 37.0177 45.0652 37.6428 45.6903C38.2679 46.3154 39.1158 46.6666 39.9998 46.6666C40.8839 46.6666 41.7317 46.3154 42.3569 45.6903C42.982 45.0652 43.3332 44.2174 43.3332 43.3333V30C43.3332 29.1159 42.982 28.2681 42.3569 27.6429C41.7317 27.0178 40.8839 26.6666 39.9998 26.6666Z" fill="#0166FF"/>
                                </svg>
                            )}
                        </span>

                        <strong>{submitResult === "success" ? "제출 완료" : "제출 실패"}</strong>

                        <button type="button" onClick={closeSubmitResultModal}>
                            {submitResult === "success" ? "확인" : "다시 시도"}
                        </button>
                    </div>
                </div>,
                document.body
            ) : null}
        </>
    );
}