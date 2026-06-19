import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { downloadSubmissionFile, getAssignment, getMyAssignmentSubmissions, getMyExternalActivityAssignments, getSubmissionFilePreview, getSubmissionFilePreviewBlob, submitAssignment, updateAssignmentSubmission } from "../../../../../../api/ea";
import type { AssignmentResponse, AssignmentResultForm, AssignmentSubmissionResponse, StudentAssignmentResponse, SubmissionFilePreviewResponse, SubmissionFileResponse } from "../../../../../../api/ea";
import { formatServerKstDateAndTimeCompactForUser, formatServerKstDateTimeYYDotForUser } from "../../../../../../utils/dateTime";
import type { EcaStudentOutletContext } from "../../ecaStudentLayout";
import { getFileIconByExtension } from "./fileIcons";
import "./assignmentSubmit.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type UploadFileItem = {
    id: string;
    file: File;
    extension: string;
};

type PreviewModalOrientation = "landscape" | "portrait";

type PreviewModalState = {
    file: SubmissionFileResponse;
    preview: SubmissionFilePreviewResponse;
    blobUrl: string;
    orientation: PreviewModalOrientation;
};

function formatDateTime(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): string {
    return formatServerKstDateAndTimeCompactForUser(date, time, fallbackTime).slice(2);
}

function formatSubmittedAt(value?: string | null): string {
    return formatServerKstDateTimeYYDotForUser(value);
}

function getLatestSubmittedAt(submission: AssignmentSubmissionResponse): string {
    return submission.updatedAt ?? submission.submittedAt;
}

function getResultFormLabel(value?: AssignmentResultForm | null): string {
    if (value === "WRITING") return "문서";
    if (value === "VIDEO") return "영상";
    if (value === "IMAGE") return "사진";
    if (value === "LINK") return "링크";
    if (value === "ETC") return "기타";
    return value ?? "-";
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

function isPreviewableSubmittedFile(file?: SubmissionFileResponse | null): boolean {
    if (!file || file.submitType === "LINK") return false;

    const fileName = file.originalFileName ?? "";
    const extension = normalizeExtension(getFileExtension(fileName));
    const contentType = (file.contentType ?? "").toLowerCase();

    return contentType === "application/pdf" || contentType.startsWith("image/") || ["pdf", "jpg", "png", "gif", "webp"].includes(extension);
}

function isPdfPreview(preview?: SubmissionFilePreviewResponse | null): boolean {
    return (preview?.contentType ?? "").toLowerCase() === "application/pdf";
}

function isImagePreview(preview?: SubmissionFilePreviewResponse | null): boolean {
    return (preview?.contentType ?? "").toLowerCase().startsWith("image/");
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

function isSameNumberArray(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort((prev, next) => prev - next);
    const sortedB = [...b].sort((prev, next) => prev - next);

    return sortedA.every((value, index) => value === sortedB[index]);
}

function getAssignmentFileWarning(resultForms?: AssignmentResultForm[] | null, extension?: string | null): string {
    if (isAllowedAssignmentFile(resultForms, extension)) return "";

    const warningLabels = resultForms
        ?.filter((resultForm) => resultForm !== "ETC" && resultForm !== "LINK")
        .map((resultForm) => {
            if (resultForm === "WRITING") return "문서(txt, doc, pdf, hwp)";
            if (resultForm === "IMAGE") return "이미지(jpg, png, gif, webp, svg)";
            if (resultForm === "VIDEO") return "영상(mp4, mov, avi, mpg)";
            return "";
        })
        .filter(Boolean) ?? [];

    if (warningLabels.length === 0) return "";

    return `선택한 과제 산출물에 맞는 파일 형식을 권장합니다: ${warningLabels.join(", ")}`;
}

function getStudentAssignmentFormLabel(
    assignment: AssignmentResponse | null,
    studentAssignment: StudentAssignmentResponse | null
): string {
    const isTeamAssignment = studentAssignment?.isTeamAssignment ?? assignment?.systemForm === "TEAM";

    if (!isTeamAssignment) return "개인";

    const teamName = studentAssignment?.myTeam?.name?.trim();

    return teamName ? `팀 · ${teamName}` : "팀";
}

type PdfPreviewProps = {
    fileUrl: string;
    onOrientationChange: (orientation: PreviewModalOrientation) => void;
};

function PdfPreview({ fileUrl, onOrientationChange }: PdfPreviewProps): React.ReactElement {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        let cancelled = false;

        if (containerRef.current === null) return;

        const targetContainer = containerRef.current;

        targetContainer.innerHTML = "";
        setLoading(true);
        setError("");

        async function renderPdf(): Promise<void> {
            try {
                const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
                const pdf = await loadingTask.promise;
                const firstPage = await pdf.getPage(1);
                const firstViewport = firstPage.getViewport({ scale: 1 });
                const orientation: PreviewModalOrientation = firstViewport.width >= firstViewport.height ? "landscape" : "portrait";
                const maxPageWidth = Math.min(window.innerWidth * (orientation === "landscape" ? 0.72 : 0.52), orientation === "landscape" ? 1120 : 720);
                const maxPageHeight = Math.min(window.innerHeight * 0.78, orientation === "landscape" ? 760 : 900);

                if (cancelled) return;

                onOrientationChange(orientation);

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = Math.min(maxPageWidth / baseViewport.width, maxPageHeight / baseViewport.height);
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    const outputScale = window.devicePixelRatio || 1;

                    if (!context || cancelled) return;

                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${viewport.width}px`;
                    canvas.style.height = `${viewport.height}px`;

                    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
                    targetContainer.appendChild(canvas);

                    await page.render({
                        canvas,
                        canvasContext: context,
                        viewport,
                    }).promise;
                }

                if (!cancelled) {
                    setLoading(false);
                }
            } catch (e) {
                console.error(e);

                if (!cancelled) {
                    setLoading(false);
                    setError("PDF 미리보기를 불러오지 못했습니다.");
                }
            }
        }

        renderPdf();

        return () => {
            cancelled = true;
            targetContainer.innerHTML = "";
        };
    }, [fileUrl, onOrientationChange]);

    return (
        <div className="eca-student-assignment-preview-pdf-wrap">
            {loading ? <p className="eca-student-assignment-preview-message">PDF를 불러오는 중입니다.</p> : null}
            {error ? <p className="eca-student-assignment-preview-message">{error}</p> : null}
            <div ref={containerRef} className="eca-student-assignment-preview-pdf-pages" />
        </div>
    );
}

export default function EcaStudentAssignmentSubmit(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId, assignmentId } = useParams<{
        externalActivityId?: string;
        assignmentId?: string;
    }>();
    const { activities } = useOutletContext<EcaStudentOutletContext>();

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const currentActivityId = externalActivityId ? Number(externalActivityId) : null;
    const currentActivity = activities.find((activity) => activity.externalActivityId === currentActivityId);
    const activityName = currentActivity?.name ?? "";

    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [mySubmission, setMySubmission] = React.useState<AssignmentSubmissionResponse | null>(null);
    const [existingFiles, setExistingFiles] = React.useState<SubmissionFileResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [files, setFiles] = React.useState<UploadFileItem[]>([]);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [initialExistingFileIds, setInitialExistingFileIds] = React.useState<number[]>([]);
    const [initialExistingLinkIds, setInitialExistingLinkIds] = React.useState<number[]>([]);
    const [existingLinks, setExistingLinks] = React.useState<SubmissionFileResponse[]>([]);
    const [submitResultModalOpen, setSubmitResultModalOpen] = React.useState(false);
    const [submitResult, setSubmitResult] = React.useState<"success" | "fail">("success");
    const [submitActionType, setSubmitActionType] = React.useState<"create" | "update">("create");

    const [previewModal, setPreviewModal] = React.useState<PreviewModalState | null>(null);
    const [previewModalLoading, setPreviewModalLoading] = React.useState(false);
    const [/*previewModalError*/, setPreviewModalError] = React.useState("");

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
    }

    React.useEffect(() => {
        async function fetchAssignment(): Promise<void> {
            if (!assignmentId) {
                setError("과제 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [assignmentData, assignmentListData] = await Promise.all([
                    getAssignment(assignmentId),
                    externalActivityId ? getMyExternalActivityAssignments(externalActivityId) : Promise.resolve([]),
                ]);

                const matchedStudentAssignment = assignmentListData.find((item) => String(item.assignmentId) === String(assignmentId)) ?? null;

                setAssignment(assignmentData);
                setStudentAssignment(matchedStudentAssignment);
                await fetchMySubmission(assignmentId);
            } catch (e) {
                console.error(e);
                setAssignment(null);
                setMySubmission(null);
                setStudentAssignment(null);
                setExistingFiles([]);
                setExistingLinks([]);
                setLinkUrl("");
                setError("과제 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchAssignment();
    }, [assignmentId, externalActivityId]);

    React.useEffect(() => {
        return () => {
            if (previewModal?.blobUrl) {
                window.URL.revokeObjectURL(previewModal.blobUrl);
            }
        };
    }, [previewModal?.blobUrl]);

    function moveBack(): void {
        navigate(-1);
    }

    function openFilePicker(): void {
        fileInputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const selectedFiles = Array.from(e.target.files ?? []);

        if (selectedFiles.length === 0) return;

        const validFiles = selectedFiles.filter((file) => file.size > 0);
        const hasEmptyFile = selectedFiles.length !== validFiles.length;

        if (hasEmptyFile) {
            window.alert("비어 있는 파일은 제출할 수 없습니다. 내용을 입력한 뒤 다시 업로드해주세요.");
        }

        if (validFiles.length === 0) {
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
        setFiles((prev) => prev.filter((item) => item.id !== fileId));
    }

    function removeExistingFile(fileId: number): void {
        setExistingFiles((prev) => prev.filter((file) => file.submissionFileId !== fileId));
    }

    function removeExistingLink(fileId: number): void {
        setExistingLinks((prev) => prev.filter((file) => file.submissionFileId !== fileId));
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

    async function handleDownloadExistingFile(file: SubmissionFileResponse): Promise<void> {
        try {
            await downloadSubmissionFile(file);
        } catch (e) {
            console.error(e);
            window.alert("파일 다운로드에 실패했습니다.");
        }
    }

    const handlePreviewOrientationChange = React.useCallback((orientation: PreviewModalOrientation): void => {
        setPreviewModal((prev) => prev ? { ...prev, orientation } : prev);
    }, []);

    async function openPreviewModal(file: SubmissionFileResponse): Promise<void> {
        if (!isPreviewableSubmittedFile(file)) {
            window.alert("미리보기를 지원하지 않는 파일입니다. 다운로드해서 확인해주세요.");
            return;
        }

        setPreviewModalLoading(true);
        setPreviewModalError("");

        try {
            const preview = await getSubmissionFilePreview(file.submissionFileId);
            const blob = await getSubmissionFilePreviewBlob(file.submissionFileId);
            const blobUrl = window.URL.createObjectURL(blob);
            const orientation: PreviewModalOrientation = isImagePreview(preview) ? "landscape" : "portrait";

            setPreviewModal({
                file,
                preview,
                blobUrl,
                orientation,
            });
        } catch (e) {
            console.error(e);
            setPreviewModal(null);
            setPreviewModalError("미리보기를 불러오지 못했습니다.");
            window.alert("미리보기를 불러오지 못했습니다.");
        } finally {
            setPreviewModalLoading(false);
        }
    }

    function closePreviewModal(): void {
        setPreviewModal(null);
        setPreviewModalError("");
    }

    async function handleSubmit(): Promise<void> {
        if (!assignmentId || submitting) return;

        const uploadFiles = files
            .map((item) => item.file)
            .filter((file): file is File => file instanceof File && file.size > 0);

        const keepFileIds = [
            ...existingFiles.map((file) => file.submissionFileId),
            ...existingLinks.map((file) => file.submissionFileId),
        ];

        const nextUrls = trimmedLinkUrl ? [trimmedLinkUrl] : [];
        const hasAnyFile = existingFiles.length > 0 || uploadFiles.length > 0;
        const hasAnyLink = existingLinks.length > 0 || nextUrls.length > 0;
        const hasRequiredSubmission = (acceptsFile && hasAnyFile) || (acceptsLink && hasAnyLink);

        if (!hasRequiredSubmission) {
            window.alert(acceptsLink && !acceptsFile ? "제출할 링크를 입력해주세요." : "제출할 파일 또는 링크를 입력해주세요.");
            return;
        }

        if (hasInvalidLink) {
            window.alert("http 또는 https로 시작하는 올바른 링크를 입력해주세요.");
            return;
        }

        if (hasInvalidFileType) {
            window.alert("과제 형식에 맞지 않는 파일이 포함되어 있습니다.");
            return;
        }

        const nextActionType = mySubmission ? "update" : "create";
        setSubmitActionType(nextActionType);
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
    const submitDisabled = !hasRequiredSubmission || !hasSubmissionChange || hasInvalidFileType || hasInvalidLink || submitting || loading || !!error;

    return (
        <>
            <div className="eca-student-assignment-submit-page">
                <header className="eca-student-assignment-submit-head">
                    <button type="button" className="eca-student-assignment-submit-back" onClick={moveBack} aria-label="뒤로가기">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <h1>{activityName}</h1>
                    <strong>{assignment?.name ?? "Assignment"}</strong>
                </header>

                {loading ? (
                    <p className="eca-student-assignment-submit-empty">과제 정보를 불러오는 중입니다.</p>
                ) : error ? (
                    <p className="eca-student-assignment-submit-empty">{error}</p>
                ) : (
                    <>
                        <section className="eca-student-assignment-submit-card">
                            <h2>과제 정보</h2>

                            <div className="eca-student-assignment-submit-form">
                                <label className="is-full">
                                    <span>과제명</span>
                                    <input value={assignment?.name ?? ""} readOnly />
                                </label>

                                <div className="eca-student-assignment-submit-period">
                                    <label>
                                        <span>과제 수행 기간</span>
                                        <input value={formatDateTime(assignment?.startDate, assignment?.startTime)} readOnly />
                                    </label>

                                    <em>~</em>

                                    <label>
                                        <span>&nbsp;</span>
                                        <input value={formatDateTime(assignment?.endDate, assignment?.endTime, "23:59:59")} readOnly />
                                    </label>
                                </div>

                                <label>
                                    <span>과제 방식</span>
                                    <input value={getStudentAssignmentFormLabel(assignment, studentAssignment)} readOnly />
                                </label>

                                <label>
                                    <span>과제 형태</span>
                                    <input value={getResultFormsLabel(assignment?.resultForms)} readOnly />
                                </label>
                            </div>
                        </section>

                        <section className="eca-student-assignment-upload-card">
                            <h2>과제 업로드</h2>

                            {acceptsFile ? (
                                <>
                                    <button type="button" className="eca-student-assignment-upload-box" onClick={openFilePicker}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M16.0003 2.6665C14.4571 2.66618 12.9467 3.11224 11.6512 3.9509C10.3557 4.78956 9.33044 5.98502 8.69899 7.39317C8.60917 7.59505 8.51716 7.79595 8.42299 7.99584L8.39633 7.99717C8.31099 7.99984 8.19499 7.99984 8.00033 7.99984C6.58584 7.99984 5.22928 8.56174 4.22909 9.56193C3.2289 10.5621 2.66699 11.9187 2.66699 13.3332C2.66699 14.7477 3.2289 16.1042 4.22909 17.1044C5.22928 18.1046 6.58584 18.6665 8.00033 18.6665H8.22966L10.8963 15.9998H8.00033C7.29308 15.9998 6.6148 15.7189 6.11471 15.2188C5.61461 14.7187 5.33366 14.0404 5.33366 13.3332C5.33366 12.6259 5.61461 11.9476 6.11471 11.4476C6.6148 10.9475 7.29308 10.6665 8.00033 10.6665H8.08566C8.36299 10.6665 8.68566 10.6678 8.95233 10.6132C9.28427 10.5564 9.60157 10.434 9.88566 10.2532C10.207 10.0452 10.4283 9.7865 10.5963 9.5505C10.6993 9.39849 10.7889 9.2379 10.8643 9.0705C10.9354 8.92206 11.0225 8.73184 11.1257 8.49984L11.131 8.4865C11.5515 7.54672 12.2351 6.74871 13.0991 6.18877C13.9631 5.62883 14.9707 5.33089 16.0003 5.33089C17.0299 5.33089 18.0375 5.62883 18.9015 6.18877C19.7656 6.74871 20.4491 7.54672 20.8697 8.4865L20.8763 8.49984C20.9785 8.73095 21.0652 8.92117 21.1363 9.0705C21.1977 9.19984 21.2883 9.38784 21.4043 9.5505C21.5723 9.78517 21.7923 10.0452 22.115 10.2545C22.4377 10.4625 22.7643 10.5572 23.0483 10.6145C23.315 10.6678 23.6377 10.6678 23.915 10.6678L24.0003 10.6665C24.7076 10.6665 25.3858 10.9475 25.8859 11.4476C26.386 11.9476 26.667 12.6259 26.667 13.3332C26.667 14.0404 26.386 14.7187 25.8859 15.2188C25.3858 15.7189 24.7076 15.9998 24.0003 15.9998H21.1043L23.771 18.6665H24.0003C25.4148 18.6665 26.7714 18.1046 27.7716 17.1044C28.7718 16.1042 29.3337 14.7477 29.3337 13.3332C29.3337 11.9187 28.7718 10.5621 27.7716 9.56193C26.7714 8.56174 25.4148 7.99984 24.0003 7.99984C23.8057 7.99984 23.6897 7.99984 23.6043 7.99717H23.5777L23.5443 7.9265C23.4618 7.74947 23.3809 7.57169 23.3017 7.39317C22.6702 5.98502 21.6449 4.78956 20.3495 3.9509C19.054 3.11224 17.5436 2.66618 16.0003 2.6665Z" fill="#808080"/>
                                            <path d="M15.9996 16.0001L15.057 15.0574L15.9996 14.1147L16.9423 15.0574L15.9996 16.0001ZM17.333 28.0001C17.333 28.3537 17.1925 28.6928 16.9424 28.9429C16.6924 29.1929 16.3533 29.3334 15.9996 29.3334C15.646 29.3334 15.3069 29.1929 15.0568 28.9429C14.8068 28.6928 14.6663 28.3537 14.6663 28.0001H17.333ZM9.72363 20.3907L15.057 15.0574L16.9423 16.9427L11.609 22.2761L9.72363 20.3907ZM16.9423 15.0574L22.2756 20.3907L20.3903 22.2761L15.057 16.9427L16.9423 15.0574ZM17.333 16.0001V28.0001H14.6663V16.0001H17.333Z" fill="#808080"/>
                                        </svg>
                                        <span>파일을 업로드해주세요</span>
                                    </button>

                                    <input ref={fileInputRef} type="file" multiple className="eca-student-assignment-file-input" onChange={handleFileChange} />
                                </>
                            ) : null}
                            {acceptsLink ? (
                                <div className={acceptsFile ? "eca-student-assignment-link-area" : "eca-student-assignment-link-area is-only"}>
                                    <input
                                        type="url"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="링크를 붙여주세요"
                                        className={hasInvalidLink ? "is-invalid" : ""}
                                    />

                                    {existingLinks.length > 0 ? (
                                        <div className="eca-student-assignment-link-list">
                                            {existingLinks.map((link) => (
                                                <div className="eca-student-assignment-link-item" key={link.submissionFileId}>
                                                    {link.url ? (
                                                        <a href={link.url} target="_blank" rel="noreferrer">
                                                            {link.url}
                                                        </a>
                                                    ) : (
                                                        <span>링크 정보 없음</span>
                                                    )}

                                                    <button type="button" onClick={() => removeExistingLink(link.submissionFileId)} aria-label="링크 삭제">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                            <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {hasInvalidLink ? (
                                        <small className="eca-student-assignment-link-warning">
                                            http 또는 https로 시작하는 링크를 입력해주세요.
                                        </small>
                                    ) : null}
                                </div>
                            ) : null}

                            {mySubmission ? (
                                <div className="eca-student-assignment-submitted-info">
                                    <span>제출된 과제</span>
                                    <strong>
                                        마지막 수정 일시: {formatSubmittedAt(getLatestSubmittedAt(mySubmission))}
                                    </strong>
                                </div>
                            ) : null}

                            {existingFiles.length > 0 ? (
                                <div className="eca-student-assignment-file-list">
                                    {existingFiles.map((file) => {
                                        const fileName = file.originalFileName ?? `submission-file-${file.submissionFileId}`;
                                        const extension = getFileExtension(fileName);

                                        return (
                                            <div className="eca-student-assignment-file-item" key={file.submissionFileId}>
                                                <div className="eca-student-assignment-file-main">
                                                    <button
                                                        type="button"
                                                        className="eca-student-assignment-file-icon"
                                                        onClick={() => openPreviewModal(file)}
                                                        disabled={previewModalLoading}
                                                        aria-label={`${fileName} 미리보기`}
                                                        title="미리보기"
                                                    >
                                                        {getFileIconByExtension(extension)}
                                                    </button>

                                                    <div className="eca-student-assignment-file-name-wrap">
                                                        <strong>{fileName}</strong>

                                                        <div className="eca-student-assignment-file-actions">
                                                            <button type="button" className="eca-student-assignment-file-action-button" onClick={() => handleDownloadExistingFile(file)} aria-label="파일 다운로드">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                    <path d="M12 15.5C11.8667 15.5 11.7417 15.475 11.625 15.425C11.5083 15.375 11.4 15.3 11.3 15.2L7.7 11.6C7.5 11.4 7.404 11.1667 7.412 10.9C7.42 10.6333 7.516 10.4 7.7 10.2C7.9 10 8.13767 9.896 8.413 9.888C8.68833 9.88 8.92567 9.97567 9.125 10.175L11 12.05V5C11 4.71667 11.096 4.47933 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99933 12.5203 4.09533 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.05L14.875 10.175C15.075 9.975 15.3127 9.879 15.588 9.887C15.8633 9.895 16.1007 9.99933 16.3 10.2C16.4833 10.4 16.5793 10.6333 16.588 10.9C16.5967 11.1667 16.5007 11.4 16.3 11.6L12.7 15.2C12.6 15.3 12.4917 15.375 12.375 15.425C12.2583 15.475 12.1333 15.5 12 15.5ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#808080"/>
                                                                </svg>
                                                            </button>

                                                            <button type="button" className="eca-student-assignment-file-action-button" onClick={() => removeExistingFile(file.submissionFileId)} aria-label="파일 삭제">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            {files.length > 0 ? (
                                <div className="eca-student-assignment-file-list">
                                    {files.map((item) => {
                                        const warningMessage = getAssignmentFileWarning(assignment?.resultForms, item.extension);

                                        return (
                                            <div className={warningMessage ? "eca-student-assignment-file-item has-warning" : "eca-student-assignment-file-item"} key={item.id}>
                                                <div className="eca-student-assignment-file-main">
                                                    <span className="eca-student-assignment-file-icon">
                                                        {getFileIconByExtension(item.extension)}
                                                    </span>

                                                    <div className="eca-student-assignment-file-name-wrap">
                                                        <strong>{item.file.name}</strong>

                                                        <button type="button" onClick={() => removeFile(item.id)} aria-label="파일 삭제">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                {warningMessage ? (
                                                    <small className="eca-student-assignment-file-warning">
                                                        {warningMessage}
                                                    </small>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>

                        <div className="eca-student-assignment-submit-bottom">
                            <button type="button" disabled={submitDisabled} onClick={handleSubmit}>
                                {submitting ? "저장 중" : mySubmission ? "수정하기" : "제출하기"}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {previewModal ? createPortal(
                <div className="eca-student-assignment-preview-backdrop" onClick={closePreviewModal}>
                    <button type="button" className="eca-student-assignment-preview-close" onClick={closePreviewModal} aria-label="미리보기 닫기">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M8 8L24 24M24 8L8 24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div
                        className={"eca-student-assignment-preview-modal " + (previewModal.orientation === "landscape" ? "is-landscape" : "is-portrait")}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isPdfPreview(previewModal.preview) ? (
                            <PdfPreview fileUrl={previewModal.blobUrl} onOrientationChange={handlePreviewOrientationChange} />
                        ) : isImagePreview(previewModal.preview) ? (
                            <img className="eca-student-assignment-preview-image" src={previewModal.blobUrl} alt={previewModal.preview.originalFileName ?? "제출 이미지"} />
                        ) : (
                            <div className="eca-student-assignment-preview-fallback">
                                <strong>{previewModal.preview.originalFileName ?? "제출 파일"}</strong>
                                <span>미리보기를 지원하지 않는 파일입니다.</span>
                                <button type="button" onClick={() => handleDownloadExistingFile(previewModal.file)}>
                                    다운로드
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            ) : null}

            {submitResultModalOpen ? createPortal(
                <div className="eca-student-assignment-submit-modal-backdrop">
                    <div className="eca-student-assignment-submit-modal">
                        <span className={submitResult === "success" ? "eca-student-assignment-submit-modal-icon" : "eca-student-assignment-submit-modal-icon is-fail"}>
                            {submitResult === "success" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : (
                                <img src="/icons/notify-01-blue.svg"/>
                            )}
                        </span>

                        <strong>
                            {submitResult === "success"
                                ? submitActionType === "update" ? "수정 완료" : "제출 완료"
                                : submitActionType === "update" ? "수정 실패" : "제출 실패"}
                        </strong>

                        <button type="button" onClick={closeSubmitResultModal}>
                            확인
                        </button>
                    </div>
                </div>,
                document.body
            ) : null}
        </>
    );
}