import React from "react";
import { useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getExternalActivityEvaluationTargetDetail } from "../../../../../../api/ea";
import type { EvaluationTargetType, ExternalActivityEvaluationTargetAssignmentRow, ExternalActivityEvaluationTargetDetailResponse } from "../../../../../../api/ea";
import "./evaluation.css";

type SortType = "assignmentOrder" | "scoreDesc" | "scoreAsc";
type EvaluationDetailLocationState = {
    evaluationDetailEntryDirection?: "forward";
    participantName?: string;
    profileImage?: string | null;
    participantType?: "USER" | "TEAM";
    userId?: number | null;
    teamId?: number | null;
    studentNumber?: string | null;
    linkedinUrl?: string | null;
};

const DEFAULT_PROFILE_IMAGE = "/internie-mascot.png";
const EVALUATION_T = "ecaAdmin.evaluationPage";

// const CRITERION_TRANSLATION_KEY_MAP: Record<string, string> = {
//     participation: "participation",
//     intent: "intent",
//     content: "content",
// };

// function getCriterionDisplayName(name: string, t: TFunction): string {
//     const key = CRITERION_TRANSLATION_KEY_MAP[name.trim().toLowerCase()];

//     return key ? t(`${EVALUATION_T}.criteria.${key}`) : name;
// }

function formatNumber(value?: number | null): string {
    if (value === null || value === undefined) return "-";

    return String(value);
}

function getCriterionScore(row: ExternalActivityEvaluationTargetAssignmentRow, criterionName: string): string {
    const score = row.scores.find((item) => item.criterionName === criterionName);

    return formatNumber(score?.score);
}

function isValidTargetType(value?: string): value is EvaluationTargetType {
    return value === "USER" || value === "TEAM";
}

function getSafeExternalUrl(value?: string | null): string {
    const trimmed = value?.trim() ?? "";

    if (!trimmed) return "";

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(normalized);

        if (url.protocol !== "http:" && url.protocol !== "https:") return "";

        return url.toString();
    } catch {
        return "";
    }
}

function getSortLabel(sortType: SortType, t: TFunction): string {
    if (sortType === "scoreDesc") return t(`${EVALUATION_T}.scoreDesc`);
    if (sortType === "scoreAsc") return t(`${EVALUATION_T}.scoreAsc`);

    return t(`${EVALUATION_T}.assignmentOrder`);
}

export default function EcaEvaluationDetailPage(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const navigationType = useNavigationType();
    const locationState = location.state as EvaluationDetailLocationState | null;
    const enterForward = navigationType !== "POP" && locationState?.evaluationDetailEntryDirection === "forward";
    const enterBack = navigationType === "POP";
    const { externalActivityId, participantType, targetId } = useParams<{
        externalActivityId?: string;
        participantType?: string;
        targetId?: string;
    }>();

    const dropdownRef = React.useRef<HTMLDivElement | null>(null);

    const [detail, setDetail] = React.useState<ExternalActivityEvaluationTargetDetailResponse | null>(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [sortType, setSortType] = React.useState<SortType>("assignmentOrder");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function fetchDetail(): Promise<void> {
            if (!externalActivityId || !isValidTargetType(participantType) || !targetId) {
                setError(t(`${EVALUATION_T}.studentEvaluationNotFound`));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getExternalActivityEvaluationTargetDetail(externalActivityId, participantType, targetId);

                setDetail(data);
            } catch (e) {
                console.error(e);
                setDetail(null);
                setError(t(`${EVALUATION_T}.studentEvaluationLoadFailed`));
            } finally {
                setLoading(false);
            }
        }

        fetchDetail();
    }, [externalActivityId, participantType, targetId, t, i18n.language]);

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

    function moveBack(): void {
        if (!externalActivityId) {
            navigate(-1);
            return;
        }

        navigate(`/program-admin/activities/${externalActivityId}/evaluation`, {
            state: {
                fromEvaluationDetail: true,
            },
        });
    }

    function moveAssignmentEvaluation(row: ExternalActivityEvaluationTargetAssignmentRow): void {
        if (!externalActivityId) return;

        navigate(`/program-admin/activities/${externalActivityId}/assignment/${row.assignmentId}/evaluation/${row.participantId}`);
    }

    function openLinkedin(): void {
        if (!linkedinUrl) return;

        const popup = window.open(linkedinUrl, "_blank", "noopener,noreferrer");

        if (popup) {
            popup.opener = null;
        }
    }

    function selectSortType(nextSortType: SortType): void {
        setSortType(nextSortType);
        setDropdownOpen(false);
    }

    const profileName = detail?.targetName || locationState?.participantName || t(`${EVALUATION_T}.noName`);
    const studentNumber = detail?.studentNumber ?? locationState?.studentNumber ?? "-";
    const studentIdentifierLabel = participantType === "TEAM" ? t(`${EVALUATION_T}.teamId`) : t(`${EVALUATION_T}.studentId`);    const profileImage = detail?.profileImage ?? locationState?.profileImage ?? null;
    const linkedinUrl = getSafeExternalUrl(detail?.linkedinUrl ?? locationState?.linkedinUrl);
    const studentIdentifierValue = participantType === "TEAM" ? targetId ?? "-" : studentNumber;
    const rows = detail?.rows ?? [];

    const sortedRows = React.useMemo(() => {
        const indexedRows = rows.map((row, index) => ({
            row,
            index,
        }));

        indexedRows.sort((a, b) => {
            if (sortType === "scoreDesc") return (b.row.totalScore ?? -1) - (a.row.totalScore ?? -1);
            if (sortType === "scoreAsc") return (a.row.totalScore ?? 999999) - (b.row.totalScore ?? 999999);

            return a.index - b.index;
        });

        return indexedRows.map((item) => item.row);
    }, [rows, sortType]);

    const pageClassName = "eca-admin-evaluation-page" + (enterForward ? " is-enter-forward" : "") + (enterBack ? " is-enter-back" : "");
    
    return (
        <div className={pageClassName}>
            <header className="eca-admin-evaluation-head">
                <button type="button" className="eca-admin-evaluation-back-button" onClick={moveBack} aria-label={t("common.prev")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <h1>{t(`${EVALUATION_T}.title`)}</h1>
            </header>

            {loading ? (
                <p className="eca-admin-evaluation-empty">{t(`${EVALUATION_T}.studentEvaluationLoading`)}</p>
            ) : error ? (
                <p className="eca-admin-evaluation-empty">{error}</p>
            ) : (
                <>
                    <section className="eca-admin-evaluation-profile-card">
                        <span className="eca-admin-evaluation-profile-avatar">
                            <img
                                src={profileImage || DEFAULT_PROFILE_IMAGE}
                                alt=""
                                onError={(event) => {
                                    event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                                }}
                            />
                        </span>

                        <strong>{profileName}</strong>

                        <span className="eca-admin-evaluation-student-id">
                            <span>{studentIdentifierValue}</span>
                            <em>{studentIdentifierLabel}</em>
                        </span>

                        <button type="button" className="eca-admin-evaluation-linkedin-button" onClick={openLinkedin} disabled={!linkedinUrl}>
                            {t(`${EVALUATION_T}.linkedin`)}
                        </button>
                    </section>

                    <section className="eca-admin-evaluation-list-card">
                        <div className="eca-admin-evaluation-list-title">
                            List ({rows.length})
                        </div>

                        <div className="eca-admin-evaluation-dropdown-wrap" ref={dropdownRef}>
                            <button type="button" className="eca-admin-evaluation-dropdown-button" onClick={() => setDropdownOpen((prev) => !prev)}>
                                <span>{getSortLabel(sortType, t)}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>

                            {dropdownOpen ? (
                                <div className="eca-admin-evaluation-dropdown-menu">
                                    <button type="button" className={sortType === "assignmentOrder" ? "is-active" : ""} onClick={() => selectSortType("assignmentOrder")}>
                                        {t(`${EVALUATION_T}.assignmentOrder`)}
                                    </button>
                                    <button type="button" className={sortType === "scoreDesc" ? "is-active" : ""} onClick={() => selectSortType("scoreDesc")}>
                                        {t(`${EVALUATION_T}.scoreDesc`)}
                                    </button>
                                    <button type="button" className={sortType === "scoreAsc" ? "is-active" : ""} onClick={() => selectSortType("scoreAsc")}>
                                        {t(`${EVALUATION_T}.scoreAsc`)}
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="eca-admin-evaluation-table-head eca-admin-evaluation-table-head--student">
                            <span>{t(`${EVALUATION_T}.assignmentTableTitle`)}</span>
                            <span>{t(`${EVALUATION_T}.criteria.participation`)}</span>
                            <span>{t(`${EVALUATION_T}.criteria.intent`)}</span>
                            <span>{t(`${EVALUATION_T}.criteria.content`)}</span>
                            <span>{t(`${EVALUATION_T}.table.totalScore`)}</span>
                            <span />
                        </div>

                        <div className="eca-admin-evaluation-row-list">
                            {rows.length === 0 ? (
                                <p className="eca-admin-evaluation-empty is-card">{t(`${EVALUATION_T}.noSubmittedEvaluationData`)}</p>
                            ) : (
                                sortedRows.map((row) => (
                                    <button type="button" key={`${row.assignmentId}-${row.submissionId}`} className="eca-admin-evaluation-row eca-admin-evaluation-row--student" onClick={() => moveAssignmentEvaluation(row)}>
                                        <strong className="eca-admin-evaluation-assignment-name">{row.assignmentName}</strong>
                                        <span>{getCriterionScore(row, "Participation")}</span>
                                        <span>{getCriterionScore(row, "Intent")}</span>
                                        <span>{getCriterionScore(row, "Content")}</span>
                                        <b>{formatNumber(row.totalScore)}</b>
                                        <span className="eca-admin-evaluation-arrow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}