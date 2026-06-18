import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { deleteAssignment, downloadSubmissionFile, downloadAssignmentSubmissionsZip, downloadSubmissionZip, getAssignmentSubmissions, getExternalActivity } from "../../../../../../api/ea";
import type { AssignmentParticipantResponse, AssignmentResponse, AssignmentSubmissionResponse, ExternalActivityResponse, SubmissionFileResponse } from "../../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./assignmentDetail.css";
import { useTranslation } from "react-i18next";
import i18n from "../../../../../../i18n";

type SubmissionStatus = "SUBMITTED" | "LATE_SUBMITTED" | "NOT_SUBMITTED" | "LATE";
type EvaluatedStatus = "BEFORE" | "DONE";
type SubmitFilter = "EVALUATED" | "BEFORE_EVALUATION" | "LATE_SUBMITTED";

const SUBMIT_FILTERS: SubmitFilter[] = ["EVALUATED", "BEFORE_EVALUATION", "LATE_SUBMITTED"];

const SUBMIT_FILTER_LABELS: Record<SubmitFilter, string> = {
    EVALUATED: "ecaAdmin.submitFilter.evaluated",
    BEFORE_EVALUATION: "ecaAdmin.submitFilter.beforeEvaluation",
    LATE_SUBMITTED: "ecaAdmin.submitFilter.lateSubmitted",
};

type SubmissionRow = {
    id: number;
    participantId: number;
    submissionId?: number | null;
    participantName: string;
    profileImage?: string | null;
    submittedAt: string;
    fileName: string;
    files: SubmissionFileResponse[];
    status: SubmissionStatus;
    evaluationStatus: EvaluatedStatus;
};

function isSubmittedStatus(status: string): boolean {
    return status === "SUBMITTED" || status === "LATE_SUBMITTED";
}

function isMissingStatus(status: string): boolean {
    return status === "NOT_SUBMITTED" || status === "LATE";
}

// function formatDate(value: string): string {
//     return value.replaceAll("-", ".");
// }

// function formatTime(value?: string | null): string {
//     if (!value) return "";

//     return value.slice(0, 5);
// }

// function formatPeriod(assignment: AssignmentResponse): string {
//     const start = `${formatDate(assignment.startDate)} ${formatTime(assignment.startTime)}`;
//     const end = `${formatDate(assignment.endDate)} ${formatTime(assignment.endTime)}`;

//     return `${start} - ${end}`;
// }

function getSubmissionRate(assignment: AssignmentResponse): number {
    const participants = assignment.participants ?? [];
    if (participants.length === 0) return 0;

    const submittedCount = participants.filter((participant) => isSubmittedStatus(participant.status)).length;

    return Math.round((submittedCount / participants.length) * 100);
}

function toSubmissionRow(
    participant: AssignmentParticipantResponse,
    activity: ExternalActivityResponse | null,
    submissions: AssignmentSubmissionResponse[]
): SubmissionRow {
    const matchedParticipant = (activity?.participants ?? []).find((item) => item.userId === participant.userId);
    const matchedSubmission = submissions.find((submission) => submission.participantId === participant.assignmentParticipantId);
    const files = matchedSubmission?.files ?? [];

    return {
        id: participant.assignmentParticipantId,
        participantId: participant.assignmentParticipantId,
        submissionId: matchedSubmission?.submissionId ?? null,
        participantName: participant.userName ?? participant.teamName ?? i18n.t("ecaAdmin.noName"),
        profileImage: matchedParticipant?.profileImage ?? null,
        submittedAt: matchedSubmission ? formatSubmittedAt(matchedSubmission.submittedAt) : "-",
        fileName: matchedSubmission ? getSubmissionFileName(files) : "-",
        files,
        status: participant.status as SubmissionStatus,
        evaluationStatus: "BEFORE",
    };
}

function getSubmissionStatusLabel(status: SubmissionStatus): string {
    if (status === "LATE_SUBMITTED") return i18n.t("ecaAdmin.submitFilter.lateSubmitted");
    if (status === "SUBMITTED") return i18n.t("ecaAdmin.submitFilter.submitted");
    if (status === "LATE") return i18n.t("ecaAdmin.submitFilter.notSubmitted");
    return i18n.t("ecaAdmin.submitFilter.notSubmitted");
}

function getSubmissionStatusClass(status: SubmissionStatus): string {
    if (status === "LATE_SUBMITTED") return "eca-assignment-detail-submit-badge eca-assignment-detail-submit-badge--late";
    if (status === "SUBMITTED") return "eca-assignment-detail-submit-badge eca-assignment-detail-submit-badge--submitted";

    return "eca-assignment-detail-submit-badge eca-assignment-detail-submit-badge--missing";
}

function formatSubmittedAt(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}.${month}.${day}. ${hour}:${minute}`;
}

function getSubmissionFiles(files: SubmissionFileResponse[]): SubmissionFileResponse[] {
    return files.filter((file) => file.submitType !== "LINK");
}

function getSubmissionLinks(files: SubmissionFileResponse[]): SubmissionFileResponse[] {
    return files.filter((file) => file.submitType === "LINK");
}

function getSubmissionDisplayName(files: SubmissionFileResponse[]): string {
    if (files.length === 0) return "-";

    const fileItems = getSubmissionFiles(files);
    const linkItems = getSubmissionLinks(files);

    if (fileItems.length > 0) {
        const firstName = fileItems[0].originalFileName ?? `submission-file-${fileItems[0].submissionFileId}`;

        if (fileItems.length + linkItems.length === 1) return firstName;

        return `${firstName} ` + i18n.t("ecaAdmin.andMore", { count: fileItems.length + linkItems.length - 1 });
    }

    if (linkItems.length > 0) {
        const firstUrl = linkItems[0].url ?? i18n.t("ecaAdmin.link");

        if (linkItems.length === 1) return firstUrl;

        return `${firstUrl} ` + i18n.t("ecaAdmin.andMore", { count: linkItems.length - 1 });
    }

    return "-";
}
function getSubmissionFileName(files: SubmissionFileResponse[]): string {
    return getSubmissionDisplayName(files);
}

export default function EcaAssignmentDetailPage(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId, assignmentId } = useParams<{ externalActivityId?: string; assignmentId?: string }>();
    const { organization, organizationLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [activity, setActivity] = React.useState<ExternalActivityResponse | null>(null);
    const [assignment, setAssignment] = React.useState<AssignmentResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);

    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const submitListRef = React.useRef<HTMLDivElement | null>(null);
    const missingListRef = React.useRef<HTMLDivElement | null>(null);
    const submitToolbarRef = React.useRef<HTMLDivElement | null>(null);

    const [submitListScrollable, setSubmitListScrollable] = React.useState(false);
    const [missingListScrollable, setMissingListScrollable] = React.useState(false);
    const [submitFilterOpen, setSubmitFilterOpen] = React.useState(false);
    const [submitSearchOpen, setSubmitSearchOpen] = React.useState(false);
    const [submitSearchKeyword, setSubmitSearchKeyword] = React.useState("");
    const [selectedSubmitFilters, setSelectedSubmitFilters] = React.useState<SubmitFilter[]>(SUBMIT_FILTERS);

    const [submissions, setSubmissions] = React.useState<AssignmentSubmissionResponse[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = React.useState(false);

    React.useEffect(() => {
        async function fetchAssignment(): Promise<void> {
            if (organizationLoading) return;

            if (!organization?.organizationId || !externalActivityId || !assignmentId) {
                setError(t("ecaAdmin.assignmentNotFound"));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getExternalActivity(organization.organizationId, externalActivityId);
                const foundAssignment = (data.assignments ?? []).find((item) => String(item.assignmentId) === assignmentId) ?? null;

                setActivity(data);
                setAssignment(foundAssignment);

                if (!foundAssignment) {
                    setSubmissions([]);
                    setError(t("ecaAdmin.assignmentItemNotFound"));
                    return;
                }

                setSubmissionsLoading(true);

                try {
                    const submissionData = await getAssignmentSubmissions(assignmentId);
                    setSubmissions(submissionData);
                } finally {
                    setSubmissionsLoading(false);
                }
            } catch (e) {
                console.error(e);
                setActivity(null);
                setAssignment(null);
                setSubmissions([]);
                setError(t("ecaAdmin.assignmentDetailLoadFailed"));
            } finally {
                setLoading(false);
            }
        }

        fetchAssignment();
    }, [assignmentId, organization?.organizationId, organizationLoading, externalActivityId]);

    React.useEffect(() => {
        if (!menuOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!menuRef.current) return;
            if (menuRef.current.contains(e.target as Node)) return;

            setMenuOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [menuOpen]);

    React.useEffect(() => {
        if (!submitFilterOpen && !submitSearchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!submitToolbarRef.current) return;
            if (submitToolbarRef.current.contains(e.target as Node)) return;

            setSubmitFilterOpen(false);
            setSubmitSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [submitFilterOpen, submitSearchOpen]);

    const rows = React.useMemo(() => {
        return assignment
            ? (assignment.participants ?? []).map((participant) => toSubmissionRow(participant, activity, submissions))
            : [];
    }, [activity, assignment, submissions]);

    const submittedRows = rows.filter((row) => isSubmittedStatus(row.status));
    const missingRows = rows.filter((row) => isMissingStatus(row.status));
    const hasSubmittedParticipant = submittedRows.length > 0;
    const totalCount = rows.length;
    const submittedCount = submittedRows.length;
    const missingCount = missingRows.length;
    const submissionRate = assignment ? getSubmissionRate(assignment) : 0;
    const isReadOnly = activity?.manageableByMe === false;

    const filteredSubmittedRows = submittedRows.filter((row) => {
        const keyword = submitSearchKeyword.trim().toLowerCase();
        const rowFilters = getSubmitRowFilters(row);
        const matchesFilter = rowFilters.some((filter) => selectedSubmitFilters.includes(filter));
        const matchesKeyword = !keyword || (
            row.participantName.toLowerCase().includes(keyword) ||
            row.fileName.toLowerCase().includes(keyword)
        );

        return matchesFilter && matchesKeyword;
    });

    function updateListScrollableState(): void {
        const submitList = submitListRef.current;
        const missingList = missingListRef.current;

        setSubmitListScrollable(
            submitList ? submitList.scrollHeight > submitList.clientHeight : false
        );

        setMissingListScrollable(
            missingList ? missingList.scrollHeight > missingList.clientHeight : false
        );
    }

    React.useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            updateListScrollableState();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [filteredSubmittedRows.length, missingRows.length, loading, error, submitSearchKeyword, selectedSubmitFilters.length]);

    function getSubmitRowFilters(row: SubmissionRow): SubmitFilter[] {
        const filters: SubmitFilter[] = [];

        if (row.evaluationStatus === "DONE") {
            filters.push("EVALUATED");
        }

        if (row.evaluationStatus === "BEFORE") {
            filters.push("BEFORE_EVALUATION");
        }

        if (row.status === "LATE_SUBMITTED") {
            filters.push("LATE_SUBMITTED");
        }

        return filters;
    }

    function toggleSubmitFilter(filter: SubmitFilter): void {
        setSelectedSubmitFilters((prev) => {
            const next = prev.includes(filter)
                ? prev.filter((item) => item !== filter)
                : [...prev, filter];

            return SUBMIT_FILTERS.filter((item) => next.includes(item));
        });
    }

    function resetSubmitSearchKeyword(): void {
        setSubmitSearchKeyword("");
    }

    function moveBack(): void {
        navigate(`/program-admin/activities/${externalActivityId}/assignment`);
    }
 
    async function handleDownloadAllSubmittedFiles(): Promise<void> {
        if (!assignmentId) return;

        if (submittedRows.length === 0) {
            window.alert(t("ecaAdmin.noFilesToDownload"));
            return;
        }

        const downloadName = `${activity?.name ?? t('ecaAdmin.activityFallback')}-${assignment?.name ?? t('ecaAdmin.assignmentFallback')}`;

        try {
            await downloadAssignmentSubmissionsZip(assignmentId, downloadName);
        } catch (e) {
            console.error(e);
            window.alert(t("ecaAdmin.downloadFailed"));
        }
    }

    async function handleDownloadRowFiles(row: SubmissionRow): Promise<void> {
        const fileItems = getSubmissionFiles(row.files);
        const linkItems = getSubmissionLinks(row.files);

        if (fileItems.length === 0 && linkItems.length > 0) {
            const firstLink = linkItems[0].url;

            if (firstLink) {
                window.open(firstLink, "_blank", "noopener,noreferrer");
                return;
            }

            window.alert(t("ecaAdmin.noLinkAvailable"));
            return;
        }

        if (fileItems.length === 0) {
            window.alert(t("ecaAdmin.noFileAvailable"));
            return;
        }

        try {
            if (fileItems.length === 1) {
                await downloadSubmissionFile(fileItems[0]);
                return;
            }

            if (!row.submissionId) {
                window.alert(t("ecaAdmin.submissionNotFound"));
                return;
            }

            await downloadSubmissionZip(
                row.submissionId,
                `${activity?.name ?? t("ecaAdmin.activityFallback")}-${assignment?.name ?? t("ecaAdmin.assignmentFallback")}-${row.participantName}`
            );
        } catch (e) {
            console.error(e);
            window.alert(t("ecaAdmin.downloadFailed"));
        }
    }

    if (loading) {
        return (
            <div className="eca-assignment-detail-page">
                <p className="eca-assignment-detail-empty">{t("ecaAdmin.assignmentDetailLoading")}</p>
            </div>
        );
    }

    async function handleDeleteAssignment(): Promise<void> {
        if (!assignmentId || deleting) return;

        const confirmed = window.confirm(t("ecaAdmin.confirmDeleteAssignment"));

        if (!confirmed) return;

        setDeleting(true);
        setMenuOpen(false);

        try {
            await deleteAssignment(assignmentId);
            navigate(`/program-admin/activities/${externalActivityId}/assignment`, { replace: true });
        } catch (e) {
            console.error(e);
            window.alert(t("ecaAdmin.deleteFailed"));
        } finally {
            setDeleting(false);
        }
    }



    if (error || !assignment) {
        return (
            <div className="eca-assignment-detail-page">
                <button type="button" className="eca-assignment-detail-back-button" onClick={moveBack}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <p className="eca-assignment-detail-empty">{error || t("ecaAdmin.assignmentNotFound")}</p>
            </div>
        );
    }

    return (
        <div className="eca-assignment-detail-page">
            <header className="eca-assignment-detail-head">
                <button type="button" className="eca-assignment-detail-back-button" onClick={moveBack} aria-label={t("ecaAdmin.goBack")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <h1>{activity?.name ?? t("ecaAdmin.activityFallback")}</h1>
                <strong>{assignment.name}</strong>

                {!isReadOnly ? (
                    <div className="eca-assignment-detail-menu-wrap" ref={menuRef}>
                        <button type="button" className="eca-assignment-detail-more-button" onClick={() => setMenuOpen((prev) => !prev)} aria-label={t("ecaAdmin.more")}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12C4 12.2652 4.10536 12.5196 4.29289 12.7071C4.48043 12.8946 4.73478 13 5 13C5.26522 13 5.51957 12.8946 5.70711 12.7071C5.89464 12.5196 6 12.2652 6 12C6 11.7348 5.89464 11.4804 5.70711 11.2929C5.51957 11.1054 5.26522 11 5 11C4.73478 11 4.48043 11.1054 4.29289 11.2929C4.10536 11.4804 4 11.7348 4 12ZM11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12ZM18 12C18 12.2652 18.1054 12.5196 18.2929 12.7071C18.4804 12.8946 18.7348 13 19 13C19.2652 13 19.5196 12.8946 19.7071 12.7071C19.8946 12.5196 20 12.2652 20 12C20 11.7348 19.8946 11.4804 19.7071 11.2929C19.5196 11.1054 19.2652 11 19 11C18.7348 11 18.4804 11.1054 18.2929 11.2929C18.1054 11.4804 18 11.7348 18 12Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        {menuOpen ? (
                            <div className="eca-assignment-detail-menu">
                                <button type="button" onClick={handleDeleteAssignment} disabled={deleting}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#808080"/>
                                    </svg>
                                    <span>{deleting ? t("ecaAdmin.deleting") : t("ecaAdmin.deleteAction")}</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={hasSubmittedParticipant}
                                    onClick={() => {
                                        if (hasSubmittedParticipant) return;

                                        setMenuOpen(false);
                                        navigate(`/program-admin/activities/${externalActivityId}/assignment/${assignmentId}/edit`);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M10.5 2.82843L14.5 6.82843M1 16.3284H5L15.5 5.82843C15.7626 5.56578 15.971 5.25398 16.1131 4.91082C16.2553 4.56766 16.3284 4.19986 16.3284 3.82843C16.3284 3.45699 16.2553 3.0892 16.1131 2.74604C15.971 2.40287 15.7626 2.09107 15.5 1.82843C15.2374 1.56578 14.9256 1.35744 14.5824 1.2153C14.2392 1.07316 13.8714 1 13.5 1C13.1286 1 12.7608 1.07316 12.4176 1.2153C12.0744 1.35744 11.7626 1.56578 11.5 1.82843L1 12.3284V16.3284Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>{t("ecaAdmin.editAction")}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </header>

            <section className="eca-assignment-detail-summary-grid">
                <article className="eca-assignment-detail-summary-card">
                    <span>{t("ecaAdmin.participantCount")}</span>
                    <strong>{t("ecaAdmin.countPerson", { count: totalCount })}</strong>
                </article>

                <article className="eca-assignment-detail-summary-card">
                    <span>{t("ecaAdmin.submitFilter.submitted")}</span>
                    <strong>{t("ecaAdmin.countPerson", { count: submittedCount })}</strong>
                </article>

                <article className="eca-assignment-detail-summary-card">
                    <span>{t("ecaAdmin.submitFilter.notSubmitters")}</span>
                    <strong>{t("ecaAdmin.countPerson", { count: missingCount })}</strong>
                </article>

                <article className="eca-assignment-detail-summary-card">
                    <span>{t("ecaAdmin.participationRate")}</span>
                    <strong>{submissionRate}%</strong>
                </article>
            </section>

            <section className="eca-assignment-detail-main-card">
                <div className="eca-assignment-detail-left">
                    <div className="eca-assignment-detail-section-head">
                        <h2>{t("ecaAdmin.submissionStatus", { count: filteredSubmittedRows.length })}</h2>

                        <div className="eca-assignment-detail-actions" ref={submitToolbarRef}>
                            <div className="eca-assignment-detail-action-wrap">
                                <button
                                    type="button"
                                    aria-label={t("common.filter")}
                                    onClick={() => {
                                        setSubmitFilterOpen((prev) => !prev);
                                        setSubmitSearchOpen(false);
                                    }}
                                >
                                    <img
                                        src={selectedSubmitFilters.length === SUBMIT_FILTERS.length ? "/icons/mynaui_filter_a0.svg" : "/icons/mynaui_filter_dot_a0.svg"}
                                        alt=""
                                    />
                                </button>

                                {submitFilterOpen ? (
                                    <div className="eca-assignment-detail-filter-popover">
                                        {SUBMIT_FILTERS.map((filter) => (
                                            <button
                                                type="button"
                                                key={filter}
                                                className="eca-assignment-detail-filter-option"
                                                onClick={() => toggleSubmitFilter(filter)}
                                            >
                                                <img
                                                    className="eca-assignment-detail-filter-radio"
                                                    src={
                                                        selectedSubmitFilters.length === SUBMIT_FILTERS.length
                                                            ? "/icons/filter_selected_all.svg"
                                                            : selectedSubmitFilters.includes(filter)
                                                                ? "/icons/filter_selected_one.svg"
                                                                : "/icons/filter_selected_none.svg"
                                                    }
                                                    alt=""
                                                />
                                                <span>{t(SUBMIT_FILTER_LABELS[filter])}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <button type="button" aria-label={t("ecaAdmin.download")} onClick={handleDownloadAllSubmittedFiles} disabled={submissionsLoading}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M11.625 15.513C11.5083 15.471 11.4 15.4 11.3 15.3L7.7 11.7C7.5 11.5 7.404 11.2667 7.412 11C7.42 10.7333 7.516 10.5 7.7 10.3C7.9 10.1 8.13767 9.996 8.413 9.988C8.68833 9.98 8.92567 10.0757 9.125 10.275L11 12.15V5C11 4.71667 11.096 4.47934 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99934 12.5203 4.09534 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.15L14.875 10.275C15.075 10.075 15.3127 9.979 15.588 9.987C15.8633 9.995 16.1007 10.0993 16.3 10.3C16.4833 10.5 16.5793 10.7333 16.588 11C16.5967 11.2667 16.5007 11.5 16.3 11.7L12.7 15.3C12.6 15.4 12.4917 15.471 12.375 15.513C12.2583 15.555 12.1333 15.5757 12 15.575C11.8667 15.5743 11.7417 15.5537 11.625 15.513ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#A0A0A0"/>
                                </svg>
                            </button>

                            <div className="eca-assignment-detail-action-wrap">
                                <button
                                    type="button"
                                    aria-label={t("common.search")}
                                    onClick={() => {
                                        setSubmitSearchOpen((prev) => !prev);
                                        setSubmitFilterOpen(false);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M15.5 14.0005H14.71L14.43 13.7305C15.0549 13.0044 15.5117 12.1492 15.7675 11.2261C16.0234 10.3029 16.072 9.33462 15.91 8.39046C15.44 5.61046 13.12 3.39046 10.32 3.05046C9.33559 2.92593 8.33576 3.02823 7.397 3.34955C6.45824 3.67087 5.60542 4.20268 4.90381 4.90429C4.20219 5.60591 3.67038 6.45872 3.34906 7.39749C3.02775 8.33625 2.92544 9.33608 3.04997 10.3205C3.38997 13.1205 5.60998 15.4405 8.38998 15.9105C9.33413 16.0725 10.3024 16.0239 11.2256 15.768C12.1487 15.5122 13.0039 15.0554 13.73 14.4305L14 14.7105V15.5005L18.25 19.7505C18.66 20.1605 19.33 20.1605 19.74 19.7505C20.15 19.3405 20.15 18.6705 19.74 18.2605L15.5 14.0005ZM9.49997 14.0005C7.00997 14.0005 4.99997 11.9905 4.99997 9.50046C4.99997 7.01046 7.00997 5.00046 9.49997 5.00046C11.99 5.00046 14 7.01046 14 9.50046C14 11.9905 11.99 14.0005 9.49997 14.0005Z" fill="#A0A0A0"/>
                                    </svg>
                                </button>

                                {submitSearchOpen ? (
                                    <div className="eca-assignment-detail-search-popover">
                                        <input
                                            value={submitSearchKeyword}
                                            onChange={(e) => setSubmitSearchKeyword(e.target.value)}
                                            placeholder={t("ecaAdmin.nameOrFileSearchPlaceholder")}
                                            autoFocus
                                        />
                                        <button type="button" className="eca-assignment-detail-search-clear" onClick={resetSubmitSearchKeyword}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className={"eca-assignment-detail-submit-list" + (submitListScrollable ? " is-scrollable" : "")} ref={submitListRef} >
                        {submissionsLoading ? (
                            <p className="eca-assignment-detail-empty">{t("ecaAdmin.submissionFilesLoading")}</p>
                        ) : submittedRows.length === 0 ? (
                            <p className="eca-assignment-detail-empty">{t("ecaAdmin.noSubmitters")}</p>
                        ) : filteredSubmittedRows.length === 0 ? (
                            <p className="eca-assignment-detail-empty">{t("ecaAdmin.noSearchResults")}</p>
                        ) : (
                            filteredSubmittedRows.map((row) => (
                                <button type="button" className="eca-assignment-detail-submit-row" key={row.id} onClick={() => handleDownloadRowFiles(row)}>
                                    <span className="eca-assignment-detail-avatar">
                                        <img
                                            src={row.profileImage || "/internie_mascot_normal.png"}
                                            alt=""
                                            onError={(e) => {
                                                e.currentTarget.src = "/internie_mascot_normal.png";
                                            }}
                                        />
                                    </span>
                                    <strong>{row.participantName}</strong>
                                    <span>{row.submittedAt}</span>
                                    <span className="eca-assignment-detail-submission-result">
                                        {getSubmissionFiles(row.files).length > 0 ? (
                                            <em>{getSubmissionFileName(getSubmissionFiles(row.files))}</em>
                                        ) : null}

                                        {getSubmissionLinks(row.files).map((link) => (
                                            <a
                                                key={link.submissionFileId}
                                                href={link.url ?? "#"}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {link.url}
                                            </a>
                                        ))}

                                        {row.files.length === 0 ? "-" : null}
                                    </span>
                                    {row.status === "LATE_SUBMITTED" ? (
                                        <i className={getSubmissionStatusClass(row.status)}>
                                            {getSubmissionStatusLabel(row.status)}
                                        </i>
                                    ) : (
                                        <i className="eca-assignment-detail-submit-badge-placeholder" aria-hidden="true" />
                                    )}
                                    <em className={row.evaluationStatus === "DONE" ? "is-done" : ""}>
                                        {row.evaluationStatus === "DONE" ? t("ecaAdmin.submitFilter.evaluated") : t("ecaAdmin.submitFilter.beforeEvaluation")}
                                    </em>
                                    <div className="eca-assignment-detail-row-arrow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="31" height="36" viewBox="0 0 31 36" fill="none">
                                            <path d="M14 13L19 18L14 23" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <aside className="eca-assignment-detail-right">
                    <div className="eca-assignment-detail-missing-head">
                        <h2>{t("ecaAdmin.nonSubmitterCount", { count: missingRows.length })}</h2>
                        <h2>{t("ecaAdmin.nonSubmitterCount", { count: missingRows.length })}</h2>
                    </div>

                    <div className={"eca-assignment-detail-missing-list" + (missingListScrollable ? " is-scrollable" : "")} ref={missingListRef} >
                        {missingRows.length === 0 ? (
                            <p className="eca-assignment-detail-empty">{t("ecaAdmin.noNonSubmitters")}</p>
                        ) : (
                            missingRows.map((row) => (
                                <div className="eca-assignment-detail-missing-row" key={row.id}>
                                    <span className="eca-assignment-detail-avatar">
                                        <img
                                            src={row.profileImage || "/internie_mascot_normal.png"}
                                            alt=""
                                            onError={(e) => {
                                                e.currentTarget.src = "/internie_mascot_normal.png";
                                            }}
                                        />
                                    </span>
                                    <strong>{row.participantName}</strong>
                                    <button type="button" aria-label={t("ecaAdmin.sendNotification")}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                            <path d="M15.2827 6.09522L3.61606 0.261891C3.15564 0.0327317 2.63574 -0.0488505 2.12725 0.0282672C1.61877 0.105385 1.14644 0.337449 0.774668 0.692821C0.402895 1.04819 0.14977 1.50958 0.049803 2.01407C-0.0501637 2.51856 0.00789349 3.0416 0.216059 3.51189L2.21606 7.98689C2.26144 8.09508 2.28481 8.21123 2.28481 8.32856C2.28481 8.44588 2.26144 8.56203 2.21606 8.67022L0.216059 13.1452C0.0466425 13.5258 -0.0249779 13.9427 0.00770662 14.358C0.0403911 14.7733 0.176344 15.1739 0.403211 15.5233C0.630077 15.8727 0.940664 16.1599 1.30674 16.3587C1.67283 16.5576 2.08279 16.6618 2.49939 16.6619C2.88958 16.658 3.27397 16.5669 3.62439 16.3952L15.2911 10.5619C15.7049 10.3537 16.0527 10.0346 16.2958 9.64029C16.5389 9.24593 16.6676 8.7918 16.6676 8.32856C16.6676 7.86531 16.5389 7.41118 16.2958 7.01683C16.0527 6.62247 15.7049 6.3034 15.2911 6.09522H15.2827ZM14.5411 9.07022L2.87439 14.9036C2.72119 14.9771 2.54917 15.0021 2.38138 14.9751C2.21359 14.9481 2.05807 14.8705 1.93565 14.7526C1.81324 14.6347 1.72979 14.4822 1.6965 14.3156C1.66321 14.1489 1.68166 13.9761 1.74939 13.8202L3.74106 9.34522C3.76684 9.28547 3.7891 9.22425 3.80773 9.16189H9.54939C9.77041 9.16189 9.98237 9.07409 10.1386 8.91781C10.2949 8.76153 10.3827 8.54957 10.3827 8.32856C10.3827 8.10754 10.2949 7.89558 10.1386 7.7393C9.98237 7.58302 9.77041 7.49522 9.54939 7.49522H3.80773C3.7891 7.43286 3.76684 7.37165 3.74106 7.31189L1.74939 2.83689C1.68166 2.68103 1.66321 2.50818 1.6965 2.34153C1.72979 2.17488 1.81324 2.02239 1.93565 1.90451C2.05807 1.78663 2.21359 1.709 2.38138 1.68202C2.54917 1.65504 2.72119 1.68 2.87439 1.75356L14.5411 7.58689C14.6776 7.65682 14.7921 7.76307 14.8721 7.89393C14.9521 8.02479 14.9944 8.17519 14.9944 8.32856C14.9944 8.48193 14.9521 8.63233 14.8721 8.76319C14.7921 8.89405 14.6776 9.00029 14.5411 9.07022Z" fill="#A0A0A0"/>
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </section>

            {/*<p className="eca-assignment-detail-period">기간: {formatPeriod(assignment)}</p>*/}
        </div>
    );
}