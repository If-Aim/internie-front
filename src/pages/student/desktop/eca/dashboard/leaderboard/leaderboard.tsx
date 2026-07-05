import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useParams } from "react-router-dom";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, downloadMyLeaderboardEvidenceFile, downloadMyLeaderboardEvidenceFileById, getMyLeaderboard, getMyLeaderboardMissionLogs, getMyLeaderboardMissions, getMyLeaderboardSubmissions, getMyParticipatingExternalActivity, getStudentLeaderboardCompletedMissions, submitLeaderboardMission } from "../../../../../../api/ea";
import type { LeaderboardApprovalStatus, LeaderboardCompletedMissionResponse, LeaderboardMissionCategory, LeaderboardMissionResponse, LeaderboardRankingResponse, LeaderboardSubmissionEvidenceResponse, LeaderboardEvidenceType, LeaderboardSubmissionResponse, StudentExternalActivityDetailResponse, StudentLeaderboardLogResponse, StudentLeaderboardResponse } from "../../../../../../api/ea";
import { getFileIconByExtension } from "../assignment/fileIcons";
import "./leaderboard.css";

const LEADERBOARD_T = "ecaStudent.leaderboardPage";
const DEFAULT_PROFILE_IMAGE = "/internie_mascot_normal.png";
const DETAIL_MISSION_CATEGORIES: LeaderboardMissionCategory[] = ["ELICIT", "DISCOVER", "INSIGHT", "SYNTHESIZE", "OWN", "NURTURE"];
const MISSION_CATEGORY_ORDER: Record<LeaderboardMissionCategory, number> = {
    ELICIT: 0,
    DISCOVER: 1,
    INSIGHT: 2,
    SYNTHESIZE: 3,
    OWN: 4,
    NURTURE: 5,
};

type LeaderboardTab = "ranking" | "myQuests";
type QuestModalStep = "select" | "submit" | "complete";
type MissionFilter = "ALL" | "AVAILABLE" | "MAXED_OUT";
type RankingSort = "alphabetical" | "highest" | "lowest";

type CustomDropdownOption = {
    value: string;
    label: string;
};

type RouteParams = {
    externalActivityId?: string;
};

type DetailTarget = {
    type: "me" | "student";
    studentId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    rank: number | null;
    totalScore: number;
    trendDirection?: LeaderboardRankingResponse["trendDirection"] | null;
    trendValue?: number | null;
};

type DetailMissionLog = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    status: LeaderboardApprovalStatus;
    score: number;
    submittedAt?: string | null;
    reviewedAt?: string | null;
};

type StudentMissionDetail = {
    log: DetailMissionLog;
    submission: LeaderboardSubmissionResponse | null;
};

type EvidenceImagePreview = {
    url: string;
    alt: string;
};

type EvidenceSource = {
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
};

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function formatOrdinal(value?: number | null): string {
    const rank = Number(value ?? 0);

    if (!rank) return "-";

    const suffix = rank % 100 >= 11 && rank % 100 <= 13 ? "th" : rank % 10 === 1 ? "st" : rank % 10 === 2 ? "nd" : rank % 10 === 3 ? "rd" : "th";

    return `${rank}${suffix}`;
}

function getText(t: TFunction, key: string, defaultValue: string): string {
    return String(t(key, { defaultValue }));
}

function getProfileImage(value?: string | null): string {
    if (!value) return DEFAULT_PROFILE_IMAGE;
    if (value.toLowerCase().includes("default")) return DEFAULT_PROFILE_IMAGE;

    return value;
}

function getCategoryLabel(value: LeaderboardMissionCategory | null | undefined, t: TFunction): string {
    if (!value) return getText(t, `${LEADERBOARD_T}.categoryFallback`, "Participation");

    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return t(`${LEADERBOARD_T}.category.${value}`, {
        defaultValue: option?.label ?? value,
    });
}

function compareMissionItems(
    a: { mission: LeaderboardMissionResponse; maxedOut: boolean },
    b: { mission: LeaderboardMissionResponse; maxedOut: boolean }
): number {
    if (a.maxedOut !== b.maxedOut) return a.maxedOut ? 1 : -1;

    const categoryDiff = MISSION_CATEGORY_ORDER[a.mission.category] - MISSION_CATEGORY_ORDER[b.mission.category];
    if (categoryDiff !== 0) return categoryDiff;

    const pointDiff = b.mission.points - a.mission.points;
    if (pointDiff !== 0) return pointDiff;

    return a.mission.name.localeCompare(b.mission.name);
}

function formatLastUpdated(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${month}/${day} ${hour}:${minute}`;
}

function formatSubmissionDetailDate(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function getEvidenceFileName(url: string): string {
    try {
        const parsedUrl = new URL(url, window.location.origin);
        const fileName = decodeURIComponent(parsedUrl.pathname).split("/").filter(Boolean).pop();

        return fileName || "evidence-file";
    } catch {
        const cleanUrl = decodeURIComponent(url.split("?")[0].split("#")[0]);
        const fileName = cleanUrl.split("/").filter(Boolean).pop();

        return fileName || "evidence-file";
    }
}

function getEvidenceDisplayFileName(evidence: LeaderboardSubmissionEvidenceResponse): string {
    const rawFileName = evidence.originalFileName?.trim() || getEvidenceFileName(evidence.evidenceUrl);
    const fileName = rawFileName.split(/[\\/]/).filter(Boolean).pop() || rawFileName;

    return fileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[-_]/i, "").replace(/^[0-9a-f]{32}[-_]/i, "").replace(/^\d{13,}[-_]/, "");
}

function getEvidenceExtension(value: string): string {
    const fileName = getEvidenceFileName(value);
    const extension = fileName.split(".").pop();

    return extension && extension !== fileName ? extension.toLowerCase() : "file";
}

function isImageEvidenceUrl(url: string): boolean {
    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "tiff"].includes(getEvidenceExtension(url));
}

function isLinkEvidenceUrl(url: string): boolean {
    const extension = getEvidenceExtension(url);

    if (extension !== "file") return false;

    return url.startsWith("http://") || url.startsWith("https://");
}

function isImageEvidence(evidence: LeaderboardSubmissionEvidenceResponse): boolean {
    if (evidence.contentType?.startsWith("image/")) return true;

    return isImageEvidenceUrl(evidence.evidenceUrl);
}

function normalizeEvidenceItem(evidence: LeaderboardSubmissionEvidenceResponse): LeaderboardSubmissionEvidenceResponse {
    const url = evidence.evidenceUrl.trim();
    const submitType = evidence.submitType ?? (isLinkEvidenceUrl(url) ? "LINK" : "FILE");

    return { ...evidence, evidenceUrl: url, submitType, originalFileName: evidence.originalFileName ?? (submitType === "FILE" ? getEvidenceFileName(url) : null) };
}

function getEvidenceItems(source?: EvidenceSource | null): LeaderboardSubmissionEvidenceResponse[] {
    const evidences = source?.evidences?.filter((evidence) => evidence.evidenceUrl?.trim()).map(normalizeEvidenceItem) ?? [];

    if (evidences.length > 0) return evidences;

    const legacyUrl = source?.evidenceUrl?.trim();

    if (!legacyUrl) return [];

    return [normalizeEvidenceItem({ evidenceId: null, submitType: null, evidenceUrl: legacyUrl, originalFileName: null, contentType: null, sizeBytes: null })];
}

function getDisplayLinkText(url: string): string {
    try {
        const parsedUrl = new URL(url);

        return parsedUrl.hostname.replace(/^www\./, "");
    } catch {
        return "Link";
    }
}

function renderLinkIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10 13.5L14 9.5M8.5 10.5L7.25 11.75C5.86929 13.1307 5.86929 15.3693 7.25 16.75C8.63071 18.1307 10.8693 18.1307 12.25 16.75L13.5 15.5M15.5 13.5L16.75 12.25C18.1307 10.8693 18.1307 8.63071 16.75 7.25C15.3693 5.86929 13.1307 5.86929 11.75 7.25L10.5 8.5" stroke="#3873FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function renderSearchIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.5 14H14.71L14.43 13.73C15.0549 13.0039 15.5117 12.1487 15.7675 11.2256C16.0234 10.3024 16.072 9.33413 15.91 8.38998C15.44 5.60998 13.12 3.38997 10.32 3.04997C9.33559 2.92544 8.33576 3.02775 7.397 3.34906C6.45824 3.67038 5.60542 4.20219 4.90381 4.90381C4.20219 5.60542 3.67038 6.45824 3.34906 7.397C3.02775 8.33576 2.92544 9.33559 3.04997 10.32C3.38997 13.12 5.60998 15.44 8.38998 15.91C9.33413 16.072 10.3024 16.0234 11.2256 15.7675C12.1487 15.5117 13.0039 15.0549 13.73 14.43L14 14.71V15.5L18.25 19.75C18.66 20.16 19.33 20.16 19.74 19.75C20.15 19.34 20.15 18.67 19.74 18.26L15.5 14ZM9.49997 14C7.00997 14 4.99997 11.99 4.99997 9.49997C4.99997 7.00997 7.00997 4.99997 9.49997 4.99997C11.99 4.99997 14 7.00997 14 9.49997C14 11.99 11.99 14 9.49997 14Z" fill="#A0A0A0"/>
        </svg>
    );
}

function getDetailMissionCategoryFilterIcon(category: LeaderboardMissionCategory, selectedCategories: LeaderboardMissionCategory[]): string {
    if (selectedCategories.length === DETAIL_MISSION_CATEGORIES.length) return "/icons/filter_selected_all.svg";

    return selectedCategories.includes(category) ? "/icons/filter_selected_one.svg" : "/icons/filter_selected_none.svg";
}

function renderStudentMissionEvidenceSlot(evidence: LeaderboardSubmissionEvidenceResponse, index: number, submissionId: number, downloading: boolean, onFileDownload: (submissionId: number, evidence: LeaderboardSubmissionEvidenceResponse, index: number) => void, onImageClick: (evidence: LeaderboardSubmissionEvidenceResponse, index: number) => void): React.ReactElement {
    const url = evidence.evidenceUrl;
    const submitType = evidence.submitType ?? (isLinkEvidenceUrl(url) ? "LINK" : "FILE");

    if (submitType === "LINK") {
        return (
            <a className="eca-student-leaderboard-mission-modal-evidence-link" href={url} target="_blank" rel="noreferrer" key={`${url}-${index}`} title={url}>
                {renderLinkIcon()}
                <span>{getDisplayLinkText(url)}</span>
            </a>
        );
    }

    if (isImageEvidence(evidence)) {
        return (
            <button type="button" className="eca-student-leaderboard-mission-modal-evidence-img-button" key={`${url}-${index}`} onClick={() => onImageClick(evidence, index)} aria-label="open evidence image preview">
                <img className="eca-student-leaderboard-mission-modal-evidence-img" src={url} alt={getEvidenceDisplayFileName(evidence)} />
            </button>
        );
    }

    const extension = getEvidenceExtension(evidence.originalFileName || url);
    const displayFileName = getEvidenceDisplayFileName(evidence);

    return (
        <button type="button" className={downloading ? "eca-student-leaderboard-mission-modal-evidence-file is-downloading" : "eca-student-leaderboard-mission-modal-evidence-file"} key={`${url}-${index}`} disabled={downloading} onClick={() => onFileDownload(submissionId, evidence, index)} title={displayFileName} aria-label={`download ${displayFileName}`}>
            {getFileIconByExtension(extension)}
        </button>
    );
}

function mapMyLogToDetailLog(log: StudentLeaderboardLogResponse): DetailMissionLog {
    return {
        submissionId: log.submissionId,
        missionId: log.missionId,
        missionName: log.missionName,
        category: log.category,
        status: log.status,
        score: log.score ?? 0,
        submittedAt: log.submittedAt ?? null,
        reviewedAt: log.reviewedAt ?? null,
    };
}

function mapCompletedMissionToDetailLog(log: LeaderboardCompletedMissionResponse): DetailMissionLog {
    return {
        submissionId: log.submissionId,
        missionId: log.missionId,
        missionName: log.missionName,
        category: log.category,
        status: "approved",
        score: log.score,
        submittedAt: null,
        reviewedAt: log.completedAt ?? null,
    };
}

function buildMissionUsedCount(logs: DetailMissionLog[]): Map<number, number> {
    const map = new Map<number, number>();

    logs.forEach((log) => {
        if (log.status === "rejected") return;

        map.set(log.missionId, (map.get(log.missionId) ?? 0) + 1);
    });

    return map;
}

function isMissionMaxedOut(mission: LeaderboardMissionResponse, usedCountMap: Map<number, number>): boolean {
    return (usedCountMap.get(mission.missionId) ?? 0) >= mission.maximumPerStudent;
}

function getMyRanking(data: StudentLeaderboardResponse | null): LeaderboardRankingResponse | null {
    if (!data) return null;

    return data.rankings.find((ranking) => ranking.studentId === data.studentId) ?? data.rankings.find((ranking) => ranking.rank === data.myRank && ranking.totalScore === data.myTotalScore) ?? null;
}

function TrendBadge({ direction, value, className = "eca-student-leaderboard-trend", emptyText = "" }: { direction?: LeaderboardRankingResponse["trendDirection"] | null; value?: number | null; className?: string; emptyText?: string }): React.ReactElement {
    if (!direction || direction === "SAME" || !value) {
        return <span className={`${className} is-empty`}>{emptyText}</span>;
    }

    return (
        <span className={`${className} ${direction === "UP" ? "is-up" : "is-down"}`}>
            {direction === "UP" ? "▲" : "▼"} {formatNumber(value)}
        </span>
    );
}

function RankingRow({ ranking, selected, isMe, onClick }: { ranking: LeaderboardRankingResponse; selected: boolean; isMe: boolean; onClick: () => void }): React.ReactElement {
    return (
        <button type="button" className={selected ? "eca-student-leaderboard-ranking-row is-selected" : "eca-student-leaderboard-ranking-row"} onClick={onClick}>
            <span className={ranking.rank <= 3 ? "eca-student-leaderboard-rank-badge is-top" : "eca-student-leaderboard-rank-badge"}>{ranking.rank}</span>
            <span className="eca-student-leaderboard-profile">
                <img src={getProfileImage(ranking.profileImage)} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_PROFILE_IMAGE; }} />
            </span>
            <span className="eca-student-leaderboard-name">
                {ranking.studentName}
                {isMe ? <em> (me)</em> : null}
            </span>
            <span className="eca-student-leaderboard-score">{formatNumber(ranking.totalScore)}</span>
            <TrendBadge direction={ranking.trendDirection} value={ranking.trendValue} />
        </button>
    );
}

function MissionLogRow({ log, t, onClick }: { log: DetailMissionLog; t: TFunction; onClick?: () => void }): React.ReactElement {
    const content = (
        <>
            <div className="eca-student-leaderboard-detail-mission-main">
                <strong>{log.missionName}</strong>
                <div className="eca-student-leaderboard-detail-mission-tags">
                    <span className="eca-student-leaderboard-detail-category-tag">{getCategoryLabel(log.category, t)}</span>
                    <span className="eca-student-leaderboard-detail-point-tag">+{formatNumber(log.score)}</span>
                </div>
            </div>
            <div className="eca-student-leaderboard-detail-mission-side">
                <span>{formatSubmissionDetailDate(log.reviewedAt ?? log.submittedAt)}</span>
            </div>
        </>
    );

    if (onClick) {
        return <button type="button" className="eca-student-leaderboard-detail-mission-card" onClick={onClick}>{content}</button>;
    }

    return <article className="eca-student-leaderboard-detail-mission-card">{content}</article>;
}

function getFileExtension(fileName: string): string {
    const extension = fileName.split(".").pop();

    if (!extension || extension === fileName) return "file";

    return extension.toLowerCase();
}

function getEvidenceFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
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

function getMissionEvidenceTypes(mission: Pick<LeaderboardMissionResponse, "evidenceTypes" | "evidenceType">): LeaderboardEvidenceType[] {
    if (mission.evidenceTypes?.length) return mission.evidenceTypes;

    return mission.evidenceType ? [mission.evidenceType] : [];
}

function getEvidenceTypesLabel(types: LeaderboardEvidenceType[], t: TFunction): string {
    if (types.length === 0) return "-";

    return types.map((type) => t(`${LEADERBOARD_T}.evidenceType.${type}`, { defaultValue: type })).join(" + ");
}

function missionAcceptsLink(mission: LeaderboardMissionResponse): boolean {
    return getMissionEvidenceTypes(mission).includes("LINK");
}

function missionAcceptsFile(mission: LeaderboardMissionResponse): boolean {
    return getMissionEvidenceTypes(mission).some((type) => type !== "LINK");
}

function getAcceptByEvidenceTypes(types: LeaderboardEvidenceType[]): string | undefined {
    const fileTypes = types.filter((type) => type !== "LINK");

    if (fileTypes.length === 0) return undefined;
    if (fileTypes.includes("OTHER")) return undefined;

    const accepts = new Set<string>();

    fileTypes.forEach((type) => {
        if (type === "IMAGE") accepts.add("image/*");
        if (type === "VIDEO") accepts.add("video/*");
        if (type === "DOCUMENT") [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"].forEach((value) => accepts.add(value));
    });

    return Array.from(accepts).join(",");
}

async function downloadStudentLeaderboardEvidenceFile(externalActivityId: string | undefined, submissionId: number, evidence: LeaderboardSubmissionEvidenceResponse): Promise<void> {
    try {
        if (!externalActivityId) {
            window.alert("Activity not found.");
            return;
        }

        const fileName = evidence.originalFileName?.trim() || getEvidenceFileName(evidence.evidenceUrl);

        if (evidence.evidenceId) {
            await downloadMyLeaderboardEvidenceFileById(externalActivityId, submissionId, evidence.evidenceId, fileName);
            return;
        }

        await downloadMyLeaderboardEvidenceFile(externalActivityId, submissionId, fileName);
    } catch (error) {
        console.error("downloadStudentLeaderboardEvidenceFile error", error);
        window.alert("Failed to download file.");
    }
}

function getEvidenceDownloadKey(submissionId: number, evidence: LeaderboardSubmissionEvidenceResponse, index: number): string {
    return `${submissionId}-${evidence.evidenceId ?? evidence.evidenceUrl}-${index}`;
}

export default function EcaStudentLeaderboard(): React.ReactElement {
    const { t } = useTranslation();
    const { externalActivityId } = useParams<RouteParams>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [activeTab, setActiveTab] = React.useState<LeaderboardTab>("ranking");

    const [myQuestLogs, setMyQuestLogs] = React.useState<DetailMissionLog[]>([]);
    const [myQuestLogsLoading, setMyQuestLogsLoading] = React.useState(false);

    const [missions, setMissions] = React.useState<LeaderboardMissionResponse[]>([]);
    const [missionsLoading, setMissionsLoading] = React.useState(false);
    const [questModalOpen, setQuestModalOpen] = React.useState(false);
    const [questModalStep, setQuestModalStep] = React.useState<QuestModalStep>("select");
    const [missionFilter, setMissionFilter] = React.useState<MissionFilter>("ALL");
    const [missionSearchText, setMissionSearchText] = React.useState("");
    const [selectedMission, setSelectedMission] = React.useState<LeaderboardMissionResponse | null>(null);
    const [questSearchOpen, setQuestSearchOpen] = React.useState(false);
    const questSearchWrapRef = React.useRef<HTMLDivElement | null>(null);
    
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);
    const [evidenceUrlText, setEvidenceUrlText] = React.useState("");
    const [evidenceDragging, setEvidenceDragging] = React.useState(false);
    const [questSubmitting, setQuestSubmitting] = React.useState(false);

    const [leaderboard, setLeaderboard] = React.useState<StudentLeaderboardResponse | null>(null);
    const [selectedTarget, setSelectedTarget] = React.useState<DetailTarget | null>(null);
    const [detailLogs, setDetailLogs] = React.useState<DetailMissionLog[]>([]);
    const detailPanelRef = React.useRef<HTMLElement | null>(null);
    const [detailMissionFilterOpen, setDetailMissionFilterOpen] = React.useState(false);
    const [selectedDetailMissionCategories, setSelectedDetailMissionCategories] = React.useState<LeaderboardMissionCategory[]>([...DETAIL_MISSION_CATEGORIES]);
    const [detailMissionSearchOpen, setDetailMissionSearchOpen] = React.useState(false);
    const [detailMissionSearch, setDetailMissionSearch] = React.useState("");
    const [detailMissionSearchDraft, setDetailMissionSearchDraft] = React.useState("");

    const [searchText, setSearchText] = React.useState("");
    const [searchOpen, setSearchOpen] = React.useState(false);
    const searchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const [rankingSort, setRankingSort] = React.useState<RankingSort>("highest");
    const [rankingSortOpen, setRankingSortOpen] = React.useState(false);
    const rankingListRef = React.useRef<HTMLDivElement | null>(null);
    const [rankingListScrollable, setRankingListScrollable] = React.useState(false);

    const [loading, setLoading] = React.useState(true);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");

    const [selectedMissionDetail, setSelectedMissionDetail] = React.useState<StudentMissionDetail | null>(null);
    const [missionDetailLoading, setMissionDetailLoading] = React.useState(false);
    const [missionDetailError, setMissionDetailError] = React.useState("");
    const [missionEvidenceImagePreview, setMissionEvidenceImagePreview] = React.useState<EvidenceImagePreview | null>(null);

    const [downloadingEvidenceKey, setDownloadingEvidenceKey] = React.useState<string | null>(null);

    const rankingSortOptions = React.useMemo<CustomDropdownOption[]>(() => [
        { value: "alphabetical", label: getText(t, `${LEADERBOARD_T}.sort.alphabetical`, "Alphabetical") },
        { value: "highest", label: getText(t, `${LEADERBOARD_T}.sort.highest`, "Highest") },
        { value: "lowest", label: getText(t, `${LEADERBOARD_T}.sort.lowest`, "Lowest") },
    ], [t]);

    const selectedRankingSortOption = rankingSortOptions.find((option) => option.value === rankingSort);

    const rankings = React.useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const rows = leaderboard?.rankings ?? [];
        const copied = rows.filter((ranking) => !keyword || ranking.studentName.toLowerCase().includes(keyword));

        copied.sort((a, b) => {
            if (rankingSort === "alphabetical") return a.studentName.localeCompare(b.studentName);
            if (rankingSort === "lowest") return b.rank - a.rank;

            return a.rank - b.rank;
        });

        return copied;
    }, [leaderboard, searchText, rankingSort]);

    const filteredDetailLogs = React.useMemo(() => {
        const keyword = detailMissionSearch.trim().toLowerCase();
        const allCategorySelected = selectedDetailMissionCategories.length === DETAIL_MISSION_CATEGORIES.length;

        return detailLogs.filter((log) => {
            if (!allCategorySelected && !selectedDetailMissionCategories.includes(log.category)) return false;
            if (!keyword) return true;

            return log.missionName.toLowerCase().includes(keyword);
        });
    }, [detailLogs, detailMissionSearch, selectedDetailMissionCategories]);

    const myRanking = getMyRanking(leaderboard);

    const myPointTarget = myRanking
        ? {
            rank: myRanking.rank,
            totalScore: myRanking.totalScore,
            trendDirection: myRanking.trendDirection,
            trendValue: myRanking.trendValue,
        }
        : {
            rank: leaderboard?.myRank ?? null,
            totalScore: leaderboard?.myTotalScore ?? 0,
            trendDirection: leaderboard?.myTrendDirection ?? null,
            trendValue: leaderboard?.myTrendValue ?? null,
        };

    const missionUsedCountMap = React.useMemo(() => buildMissionUsedCount(myQuestLogs), [myQuestLogs]);

    const missionItems = React.useMemo(() => {
        return missions.map((mission) => ({
            mission,
            maxedOut: isMissionMaxedOut(mission, missionUsedCountMap),
        }));
    }, [missions, missionUsedCountMap]);

    const filteredMissionItems = React.useMemo(() => {
        const keyword = missionSearchText.trim().toLowerCase();

        return missionItems
            .filter((item) => {
                if (missionFilter === "AVAILABLE") return !item.maxedOut;
                if (missionFilter === "MAXED_OUT") return item.maxedOut;

                return true;
            })
            .filter((item) => {
                if (!keyword) return true;

                return item.mission.name.toLowerCase().includes(keyword);
            })
            .sort(compareMissionItems);
    }, [missionItems, missionFilter, missionSearchText]);

    const availableMissionCount = missionItems.filter((item) => !item.maxedOut).length;
    const maxedOutMissionCount = missionItems.filter((item) => item.maxedOut).length;

    React.useEffect(() => {
        let mounted = true;

        async function loadLeaderboard(): Promise<void> {
            if (!externalActivityId) {
                setErrorMessage(getText(t, `${LEADERBOARD_T}.error.activityNotFound`, "Activity not found."));
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setErrorMessage("");

                const [activityResponse, leaderboardResponse] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyLeaderboard(externalActivityId, { page: 0, size: 30 }),
                ]);

                if (!mounted) return;

                setActivity(activityResponse);
                setLeaderboard(leaderboardResponse);
            } catch (error) {
                if (!mounted) return;

                setErrorMessage(error instanceof Error ? error.message : getText(t, `${LEADERBOARD_T}.error.leaderboardLoadFailed`, "Failed to load leaderboard."));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadLeaderboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

    React.useEffect(() => {
        let mounted = true;

        async function loadDetailLogs(): Promise<void> {
            if (!externalActivityId || !selectedTarget) return;

            try {
                setDetailLoading(true);

                if (selectedTarget.type === "me") {
                    const response = await getMyLeaderboardMissionLogs(externalActivityId, { category: null, page: 0, size: 100 });

                    if (!mounted) return;

                    setDetailLogs(response.logs.map(mapMyLogToDetailLog));
                    return;
                }

                const response = await getStudentLeaderboardCompletedMissions(externalActivityId, selectedTarget.studentId, { category: null, page: 0, size: 100 });

                if (!mounted) return;

                setDetailLogs(response.missions.map(mapCompletedMissionToDetailLog));
            } catch {
                if (!mounted) return;

                setDetailLogs([]);
            } finally {
                if (mounted) setDetailLoading(false);
            }
        }

        void loadDetailLogs();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, selectedTarget]);

    React.useEffect(() => {
        let mounted = true;

        async function loadMyQuestLogs(): Promise<void> {
            if (!externalActivityId || activeTab !== "myQuests") return;

            try {
                setMyQuestLogsLoading(true);

                const response = await getMyLeaderboardMissionLogs(externalActivityId, {
                    category: null,
                    page: 0,
                    size: 100,
                });

                if (!mounted) return;

                setMyQuestLogs(response.logs.map(mapMyLogToDetailLog));
            } catch {
                if (!mounted) return;

                setMyQuestLogs([]);
            } finally {
                if (mounted) setMyQuestLogsLoading(false);
            }
        }

        void loadMyQuestLogs();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, activeTab]);

    React.useEffect(() => {
        let mounted = true;

        async function loadMissions(): Promise<void> {
            if (!externalActivityId || !questModalOpen) return;

            try {
                setMissionsLoading(true);

                const response = await getMyLeaderboardMissions(externalActivityId);

                if (!mounted) return;

                setMissions(response.missions);
            } catch {
                if (!mounted) return;

                setMissions([]);
            } finally {
                if (mounted) setMissionsLoading(false);
            }
        }

        void loadMissions();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, questModalOpen]);

    React.useEffect(() => {
        if (!searchOpen) return;

        function handleMouseDown(event: MouseEvent): void {
            if (!searchWrapRef.current) return;
            if (searchWrapRef.current.contains(event.target as Node)) return;

            setSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [searchOpen]);

    React.useEffect(() => {
        if (!rankingSortOpen) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-student-leaderboard-custom-dropdown")) return;

            setRankingSortOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [rankingSortOpen]);

    React.useEffect(() => {
        if (!questSearchOpen) return;

        function handleMouseDown(event: MouseEvent): void {
            if (!questSearchWrapRef.current) return;
            if (questSearchWrapRef.current.contains(event.target as Node)) return;

            setQuestSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [questSearchOpen]);

    React.useEffect(() => {
        if (!detailMissionFilterOpen) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-student-leaderboard-completed-filter-wrap")) return;

            setDetailMissionFilterOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [detailMissionFilterOpen]);

    React.useEffect(() => {
        if (!detailMissionSearchOpen) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-student-leaderboard-detail-search-wrap")) return;

            setDetailMissionSearchOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [detailMissionSearchOpen]);

    React.useLayoutEffect(() => {
        function updateRankingListScrollable(): void {
            const list = rankingListRef.current;

            if (!list) return;

            setRankingListScrollable(list.scrollHeight > list.clientHeight);
        }

        updateRankingListScrollable();

        const list = rankingListRef.current;

        if (!list) return;

        const resizeObserver = new ResizeObserver(updateRankingListScrollable);
        resizeObserver.observe(list);

        window.addEventListener("resize", updateRankingListScrollable);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateRankingListScrollable);
        };
    }, [activeTab, rankings.length, loading]);

    React.useEffect(() => {
        if (!selectedTarget) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (detailPanelRef.current?.contains(target)) return;
            if (target.closest(".eca-student-leaderboard-mission-modal-backdrop")) return;
            if (target.closest(".eca-student-leaderboard-evidence-preview-backdrop")) return;

            closeDetailPanel();
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [selectedTarget]);


    function resetDetailMissionControls(): void {
        setDetailMissionFilterOpen(false);
        setSelectedDetailMissionCategories([...DETAIL_MISSION_CATEGORIES]);
        setDetailMissionSearchOpen(false);
        setDetailMissionSearch("");
        setDetailMissionSearchDraft("");
    }

    function toggleDetailMissionCategory(category: LeaderboardMissionCategory): void {
        setSelectedDetailMissionCategories((prev) => {
            if (prev.length === DETAIL_MISSION_CATEGORIES.length) return [category];

            const next = prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category];

            return next.length > 0 ? next : [...DETAIL_MISSION_CATEGORIES];
        });
    }

    function openDetailMissionSearch(): void {
        setDetailMissionFilterOpen(false);

        if (detailMissionSearchOpen) {
            setDetailMissionSearchOpen(false);
            return;
        }

        setDetailMissionSearchDraft(detailMissionSearch);
        setDetailMissionSearchOpen(true);
    }

    function renderDetailMissionSearchControl(): React.ReactElement {
        const buttonClassName = detailMissionSearch ? "eca-student-leaderboard-icon-button eca-student-leaderboard-search-button--active" : "eca-student-leaderboard-icon-button";

        return (
            <div className={detailMissionSearchOpen ? "eca-student-leaderboard-detail-search-wrap eca-student-leaderboard-detail-search-wrap--open" : "eca-student-leaderboard-detail-search-wrap"}>
                <button type="button" className={buttonClassName} aria-label="search completed missions" onClick={openDetailMissionSearch}>
                    {renderSearchIcon()}
                </button>

                {detailMissionSearchOpen ? (
                    <div className="eca-student-leaderboard-detail-search-popover">
                        <input
                            autoFocus
                            value={detailMissionSearchDraft}
                            placeholder={getText(t, `${LEADERBOARD_T}.searchMissionPlaceholder`, "Search mission")}
                            onChange={(event) => {
                                const value = event.target.value;

                                setDetailMissionSearchDraft(value);
                                setDetailMissionSearch(value.trim());
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setDetailMissionSearch(detailMissionSearchDraft.trim());
                                    setDetailMissionSearchOpen(false);
                                }

                                if (event.key === "Escape") {
                                    setDetailMissionSearchOpen(false);
                                }
                            }}
                        />
                    </div>
                ) : null}
            </div>
        );
    }

    function openRankingDetail(ranking: LeaderboardRankingResponse): void {
        resetDetailMissionControls();
        setDetailLogs([]);
        setSelectedTarget({
            type: leaderboard?.studentId === ranking.studentId ? "me" : "student",
            studentId: ranking.studentId,
            name: ranking.studentName,
            nickname: ranking.studentNickname,
            profileImage: ranking.profileImage,
            rank: ranking.rank,
            totalScore: ranking.totalScore,
            trendDirection: ranking.trendDirection,
            trendValue: ranking.trendValue,
        });
    }

    function openMyQuests(): void {
        setSelectedTarget(null);
        setActiveTab("myQuests");
    }

    function openQuestModal(): void {
        setQuestModalStep("select");
        setMissionFilter("ALL");
        setMissionSearchText("");
        setQuestSearchOpen(false);
        setSelectedMission(null);
        setEvidenceFiles([]);
        setEvidenceUrlText("");
        setEvidenceDragging(false);
        setQuestSubmitting(false);
        setQuestModalOpen(true);
    }

    function closeDetailPanel(): void {
        setSelectedTarget(null);
        setDetailLogs([]);
        setDetailLoading(false);
        resetDetailMissionControls();
    }

    function closeQuestModal(): void {
        setQuestModalOpen(false);
        setQuestModalStep("select");
        setMissionSearchText("");
        setQuestSearchOpen(false);
        setSelectedMission(null);
        setEvidenceFiles([]);
        setEvidenceUrlText("");
        setEvidenceDragging(false);
        setQuestSubmitting(false);
    }

    async function openMyMissionDetail(log: DetailMissionLog): Promise<void> {
        if (!externalActivityId) return;

        setSelectedMissionDetail({ log, submission: null });
        setMissionDetailError("");
        setMissionDetailLoading(true);

        try {
            const response = await getMyLeaderboardSubmissions(externalActivityId, { status: "all", page: 0, size: 100 });
            const submission = response.submissions.find((item) => item.submissionId === log.submissionId) ?? null;

            setSelectedMissionDetail({ log, submission });

            if (!submission) {
                setMissionDetailError("Submission detail not found.");
            }
        } catch (error) {
            setMissionDetailError(error instanceof Error ? error.message : "Failed to load submission detail.");
        } finally {
            setMissionDetailLoading(false);
        }
    }

    function closeMissionDetailModal(): void {
        setSelectedMissionDetail(null);
        setMissionDetailError("");
        setMissionDetailLoading(false);
    }

    function handleOpenMissionEvidenceImagePreview(evidence: LeaderboardSubmissionEvidenceResponse, index: number): void {
        setMissionEvidenceImagePreview({
            url: evidence.evidenceUrl,
            alt: getEvidenceDisplayFileName(evidence) || `evidence ${index + 1}`,
        });
    }

    function isAllowedEvidenceFile(file: File, evidenceTypes: LeaderboardEvidenceType[]): boolean {
        const fileTypes = evidenceTypes.filter((type) => type !== "LINK");
        const extension = getFileExtension(file.name);

        if (fileTypes.length === 0) return false;
        if (fileTypes.includes("OTHER")) return true;

        return fileTypes.some((type) => {
            if (type === "IMAGE") return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "tiff"].includes(extension);
            if (type === "VIDEO") return file.type.startsWith("video/") || ["mp4", "mov", "avi", "webm", "mkv"].includes(extension);
            if (type === "DOCUMENT") return ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension);
            return false;
        });
    }

    function appendEvidenceFiles(files: File[], evidenceTypes: LeaderboardEvidenceType[]): void {
        if (files.length === 0) return;

        const validFiles = files.filter((file) => isAllowedEvidenceFile(file, evidenceTypes));

        if (validFiles.length === 0) {
            window.alert("지원하지 않는 파일 형식입니다.");
            return;
        }

        if (validFiles.length !== files.length) {
            window.alert("일부 파일은 지원하지 않는 형식이라 제외되었습니다.");
        }

        setEvidenceFiles((prev) => {
            const prevKeys = new Set(prev.map((file) => getEvidenceFileKey(file)));
            const nextFiles = validFiles.filter((file) => !prevKeys.has(getEvidenceFileKey(file)));

            return [...prev, ...nextFiles];
        });
    }

    function handleEvidenceFileInputChange(event: React.ChangeEvent<HTMLInputElement>, evidenceTypes: LeaderboardEvidenceType[]): void {
        appendEvidenceFiles(Array.from(event.target.files ?? []), evidenceTypes);
        event.target.value = "";
    }

    function handleEvidenceDragEnter(event: React.DragEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        if (questSubmitting) return;

        setEvidenceDragging(true);
    }

    function handleEvidenceDragOver(event: React.DragEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        if (questSubmitting) return;

        event.dataTransfer.dropEffect = "copy";
        setEvidenceDragging(true);
    }

    function handleEvidenceDragLeave(event: React.DragEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        const relatedTarget = event.relatedTarget;

        if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

        setEvidenceDragging(false);
    }

    function handleEvidenceDrop(event: React.DragEvent<HTMLButtonElement>, evidenceTypes: LeaderboardEvidenceType[]): void {
        event.preventDefault();
        event.stopPropagation();
        setEvidenceDragging(false);

        if (questSubmitting) return;

        appendEvidenceFiles(Array.from(event.dataTransfer.files), evidenceTypes);
    }

    function removeEvidenceFile(fileKey: string): void {
        setEvidenceFiles((prev) => prev.filter((file) => getEvidenceFileKey(file) !== fileKey));
    }

    async function handleQuestEvidenceSubmit(): Promise<void> {
        if (!externalActivityId || !selectedMission || questSubmitting) return;

        const acceptsLink = missionAcceptsLink(selectedMission);
        const acceptsFile = missionAcceptsFile(selectedMission);
        const evidenceUrls = evidenceUrlText.trim() ? [evidenceUrlText.trim()] : [];

        if (acceptsFile && evidenceFiles.length === 0) {
            window.alert("Please upload a file.");
            return;
        }

        if (acceptsLink && evidenceUrls.length === 0) {
            window.alert("Please enter a link.");
            return;
        }

        if (acceptsLink && evidenceUrls.some((url) => !isValidHttpUrl(url))) {
            window.alert("Please enter a valid link.");
            return;
        }

        try {
            setQuestSubmitting(true);

            await submitLeaderboardMission(externalActivityId, selectedMission.missionId, {
                files: acceptsFile ? evidenceFiles : null,
                evidenceUrls: acceptsLink ? evidenceUrls : null,
            });

            setQuestModalStep("complete");
            setActiveTab("myQuests");
            setMissionSearchText("");
            setQuestSearchOpen(false);
            setEvidenceFiles([]);
            setEvidenceUrlText("");
            setEvidenceDragging(false);

            try {
                const response = await getMyLeaderboardMissionLogs(externalActivityId, { category: null, page: 0, size: 100 });
                setMyQuestLogs(response.logs.map(mapMyLogToDetailLog));
            } catch (refreshError) {
                console.error("refresh my quest logs error", refreshError);
            }
        } catch (error) {
            console.error("handleQuestEvidenceSubmit error", error);
            window.alert("Failed to submit evidence.");
        } finally {
            setQuestSubmitting(false);
        }
    }

    function renderMissionDetailModal(): React.ReactElement | null {
        if (!selectedMissionDetail) return null;

        const evidenceSlots = getEvidenceItems(selectedMissionDetail.submission);
        const submissionId = selectedMissionDetail.submission?.submissionId ?? selectedMissionDetail.log.submissionId;
        const submittedAt = selectedMissionDetail.submission?.submittedAt ?? selectedMissionDetail.log.submittedAt ?? selectedMissionDetail.log.reviewedAt;
        const point = selectedMissionDetail.submission?.points ?? selectedMissionDetail.log.score;
        const category = selectedMissionDetail.submission?.category ?? selectedMissionDetail.log.category;
        const missionName = selectedMissionDetail.submission?.missionName ?? selectedMissionDetail.log.missionName;

        return (
            <div className="eca-student-leaderboard-mission-modal-backdrop" role="presentation" onClick={closeMissionDetailModal}>
                <section className="eca-student-leaderboard-mission-modal" role="dialog" aria-modal="true" aria-labelledby="eca-student-leaderboard-mission-modal-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-student-leaderboard-mission-modal-close" aria-label="close mission detail" onClick={closeMissionDetailModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div className="eca-student-leaderboard-mission-modal-evidence-list">
                        {evidenceSlots.length > 0 ? (
                            evidenceSlots.map((evidence, index) => {
                                const downloadKey = getEvidenceDownloadKey(submissionId, evidence, index);
                                const downloading = downloadingEvidenceKey === downloadKey;

                                return renderStudentMissionEvidenceSlot(evidence, index, submissionId, downloading, handleDownloadMissionEvidence, handleOpenMissionEvidenceImagePreview);
                            })
                        ) : (
                            <span className="eca-student-leaderboard-mission-modal-evidence-placeholder" aria-hidden="true" />
                        )}
                    </div>

                    {missionDetailLoading ? (
                        <p className="eca-student-leaderboard-mission-modal-message">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p>
                    ) : null}

                    {missionDetailError ? (
                        <p className="eca-student-leaderboard-mission-modal-error">{missionDetailError}</p>
                    ) : null}

                    <div className="eca-student-leaderboard-mission-modal-info" id="eca-student-leaderboard-mission-modal-title">
                        <div className="eca-student-leaderboard-mission-modal-info-row">
                            <span>Category</span>
                            <strong className="eca-student-leaderboard-mission-modal-category">{getCategoryLabel(category, t)}</strong>
                        </div>
                        <div className="eca-student-leaderboard-mission-modal-info-row">
                            <span>Point</span>
                            <strong className="eca-student-leaderboard-mission-modal-point">+{formatNumber(point)}</strong>
                        </div>
                        <div className="eca-student-leaderboard-mission-modal-info-row">
                            <span>Mission</span>
                            <strong>{missionName}</strong>
                        </div>
                        <div className="eca-student-leaderboard-mission-modal-info-row">
                            <span>Submission Time</span>
                            <strong>{formatSubmissionDetailDate(submittedAt)}</strong>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    async function handleDownloadMissionEvidence(submissionId: number, evidence: LeaderboardSubmissionEvidenceResponse, index: number): Promise<void> {
        const downloadKey = getEvidenceDownloadKey(submissionId, evidence, index);

        try {
            setDownloadingEvidenceKey(downloadKey);
            await downloadStudentLeaderboardEvidenceFile(externalActivityId, submissionId, evidence);
        } finally {
            setDownloadingEvidenceKey(null);
        }
    }

    function renderMissionEvidenceImagePreviewModal(): React.ReactElement | null {
        if (!missionEvidenceImagePreview) return null;

        return (
            <div className="eca-student-leaderboard-evidence-preview-backdrop" role="presentation" onClick={() => setMissionEvidenceImagePreview(null)}>
                <div className="eca-student-leaderboard-evidence-preview-modal" role="dialog" aria-modal="true" aria-label="evidence image preview" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-student-leaderboard-evidence-preview-close" aria-label="close image preview" onClick={() => setMissionEvidenceImagePreview(null)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                    <img className="eca-student-leaderboard-evidence-preview-img" src={missionEvidenceImagePreview.url} alt={missionEvidenceImagePreview.alt} />
                </div>
            </div>
        );
    }

    if (loading) {
        return <section className="eca-student-leaderboard-page"><p className="eca-student-leaderboard-state">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p></section>;
    }

    if (errorMessage) {
        return <section className="eca-student-leaderboard-page"><p className="eca-student-leaderboard-state">{errorMessage}</p></section>;
    }

    return (
        <section className={downloadingEvidenceKey ? "eca-student-leaderboard-page is-evidence-downloading" : "eca-student-leaderboard-page"}>
            <h1 className="eca-student-leaderboard-title">{activity?.name ?? getText(t, `${LEADERBOARD_T}.activityFallback`, "Class Name")}</h1>

            <nav className="eca-student-leaderboard-tabs">
                <button type="button" className={activeTab === "ranking" ? "is-active" : ""} onClick={() => setActiveTab("ranking")}>
                    {getText(t, `${LEADERBOARD_T}.ranking`, "Ranking")}
                </button>
                <button type="button" className={activeTab === "myQuests" ? "is-active" : ""} onClick={openMyQuests}>
                    {getText(t, `${LEADERBOARD_T}.myQuests`, "My Quests")}
                </button>
            </nav>

            {activeTab === "ranking" ? (
                <section className={activeTab === "ranking" && !rankingListScrollable ? "eca-student-leaderboard-card eca-student-leaderboard-card--ranking-not-scrollable" : "eca-student-leaderboard-card"}>
                    <div className="eca-student-leaderboard-toolbar">
                        <div className={rankingSortOpen ? "eca-student-leaderboard-custom-dropdown eca-student-leaderboard-custom-dropdown--open" : "eca-student-leaderboard-custom-dropdown"}>
                            <button type="button" className="eca-student-leaderboard-select-button" aria-label="select ranking sort" aria-expanded={rankingSortOpen} onClick={() => { setSearchOpen(false); setRankingSortOpen((prev) => !prev); }}>
                                <span>{selectedRankingSortOption?.label ?? getText(t, `${LEADERBOARD_T}.sort.highest`, "Highest")}</span>
                                <svg className="eca-student-leaderboard-dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>

                            {rankingSortOpen ? (
                                <div className="eca-student-leaderboard-custom-dropdown-menu" role="listbox" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                                    {rankingSortOptions.map((option) => {
                                        const selected = option.value === rankingSort;

                                        return (
                                            <button type="button" className={selected ? "eca-student-leaderboard-custom-dropdown-option eca-student-leaderboard-custom-dropdown-option--selected" : "eca-student-leaderboard-custom-dropdown-option"} role="option" aria-selected={selected} key={option.value} onClick={() => { setRankingSort(option.value as RankingSort); setRankingSortOpen(false); }}>
                                                <span>{option.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>

                        <div className="eca-student-leaderboard-tool-actions">
                            <div className="eca-student-leaderboard-search-wrap" ref={searchWrapRef}>
                                <button type="button" className={searchText.trim() ? "eca-student-leaderboard-search-button is-active" : "eca-student-leaderboard-search-button"} aria-label="search" onClick={() => { setRankingSortOpen(false); setSearchOpen((prev) => !prev);}}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.7323 10.3185H10.9909L10.7281 10.0653C11.3146 9.38432 11.7433 8.58221 11.9834 7.71636C12.2235 6.8505 12.2691 5.94231 12.1171 5.05676C11.676 2.44933 9.49872 0.367141 6.87099 0.0482465C5.94717 -0.0685572 5.00885 0.027398 4.12785 0.328769C3.24684 0.630141 2.4465 1.12894 1.78805 1.787C1.1296 2.44506 0.630511 3.24494 0.328962 4.12543C0.0274141 5.00592 -0.0685974 5.94368 0.0482748 6.86696C0.367356 9.49315 2.45077 11.6691 5.05973 12.11C5.94579 12.2619 6.85452 12.2163 7.72088 11.9764C8.58724 11.7364 9.38982 11.308 10.0712 10.7218L10.3246 10.9844V11.7254L14.3131 15.7116C14.6979 16.0961 15.3266 16.0961 15.7114 15.7116C16.0962 15.327 16.0962 14.6986 15.7114 14.3141L11.7323 10.3185ZM6.10144 10.3185C3.76464 10.3185 1.8783 8.43329 1.8783 6.09786C1.8783 3.76243 3.76464 1.8772 6.10144 1.8772C8.43824 1.8772 10.3246 3.76243 10.3246 6.09786C10.3246 8.43329 8.43824 10.3185 6.10144 10.3185Z" fill="#A0A0A0"/>
                                    </svg>
                                </button>

                                {searchOpen ? (
                                    <div className="eca-student-leaderboard-search-popover">
                                        <input className="eca-student-leaderboard-search-popover-input" value={searchText} placeholder={getText(t, `${LEADERBOARD_T}.searchPlaceholder`, "Search student")} onChange={(event) => setSearchText(event.target.value)} autoFocus />
                                        <button type="button" className="eca-student-leaderboard-search-reset" aria-label="clear search" onClick={() => setSearchText("")}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M13.3332 2.66699L2.6665 13.3337M13.3332 13.3337L2.6665 2.66699" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <div className="eca-student-leaderboard-list-title">{getText(t, `${LEADERBOARD_T}.studentsRanking`, "Students Ranking")} ({leaderboard?.totalCount ?? rankings.length})</div>

                    <div className="eca-student-leaderboard-head">
                        <span>{getText(t, `${LEADERBOARD_T}.rank.rank`, "Rank")}</span>
                        <span>{getText(t, `${LEADERBOARD_T}.rank.name`, "Name")}</span>
                        <span>{getText(t, `${LEADERBOARD_T}.rank.totalScore`, "Total Score")}</span>
                    </div>

                    <div className="eca-student-leaderboard-ranking-list" ref={rankingListRef}>
                        {rankings.length > 0 ? (
                            rankings.map((ranking) => (
                                <RankingRow
                                    key={ranking.studentId}
                                    ranking={ranking}
                                    selected={selectedTarget?.studentId === ranking.studentId}
                                    isMe={leaderboard?.studentId === ranking.studentId}
                                    onClick={() => openRankingDetail(ranking)}
                                />
                            ))
                        ) : (
                            <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.rankingEmpty`, "No ranking data.")}</p>
                        )}
                    </div>
                </section>
            ) : (
                <section className="eca-student-leaderboard-card eca-student-leaderboard-my-quests-card">
                    <section className="eca-student-leaderboard-my-points-card">
                        <div>
                            <h2>My Points</h2>
                            <strong>{formatNumber(myPointTarget.totalScore)}<em>pt</em></strong>
                            <p>
                                <b>{formatOrdinal(myPointTarget.rank)} Place</b>
                                <TrendBadge direction={myPointTarget.trendDirection} value={myPointTarget.trendValue} />
                            </p>
                        </div>

                        <button type="button" onClick={openQuestModal}>Get Points</button>
                    </section>

                    <section className="eca-student-leaderboard-my-quests-list-section">
                        <h3>Completed Quests ({myQuestLogs.length})</h3>

                        <div className="eca-student-leaderboard-my-quests-head">
                            <span className="eca-student-leaderboard-my-quests-head-name">Quest Name</span>
                            <span>Category</span>
                            <span>Score</span>
                        </div>

                        <div className="eca-student-leaderboard-my-quests-list">
                            {myQuestLogsLoading ? (
                                <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p>
                            ) : myQuestLogs.length > 0 ? (
                                myQuestLogs.map((log) => (
                                    <button type="button" className="eca-student-leaderboard-my-quest-row is-clickable" key={`${log.submissionId}-${log.missionId}`} onClick={() => void openMyMissionDetail(log)}>
                                        <strong>{log.missionName}</strong>
                                        <span>{getCategoryLabel(log.category, t)}</span>
                                        <em>+{formatNumber(log.score)}</em>
                                    </button>
                                ))
                            ) : (
                                <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.missionLogEmpty`, "No completed quests.")}</p>
                            )}
                        </div>
                    </section>
                </section>
            )}

            <div className="eca-student-leaderboard-update-text">Last updated {formatLastUpdated(leaderboard?.lastUpdate)}</div>

            {selectedTarget ? (
                <div className="eca-student-leaderboard-detail-backdrop" role="presentation" onClick={closeDetailPanel}>
                    <aside className="eca-student-leaderboard-detail-panel" ref={detailPanelRef} aria-label="student detail panel" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="eca-student-leaderboard-detail-close" onClick={closeDetailPanel} aria-label="close student detail">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>

                        <header className="eca-student-leaderboard-detail-profile">
                            <img className="eca-student-leaderboard-detail-avatar" src={getProfileImage(selectedTarget.profileImage)} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_PROFILE_IMAGE; }} />
                            <div className="eca-student-leaderboard-detail-profile-text">
                                <h2 className="eca-student-leaderboard-detail-name">{selectedTarget.name}</h2>
                                <p className="eca-student-leaderboard-detail-nickname">{selectedTarget.nickname || "-"}</p>
                            </div>
                        </header>

                        <section className="eca-student-leaderboard-total-card">
                            <div className="eca-student-leaderboard-detail-score-label">Total Points:</div>
                            <div className="eca-student-leaderboard-detail-score-row">
                                <strong>{formatNumber(selectedTarget.totalScore)}</strong>
                                <span>pt</span>
                            </div>
                            <div className="eca-student-leaderboard-detail-place-row">
                                <span className="eca-student-leaderboard-detail-place-row-rank">{selectedTarget.rank ? `${formatOrdinal(selectedTarget.rank)} Place` : "-"}</span>
                                <TrendBadge direction={selectedTarget.trendDirection} value={selectedTarget.trendValue} className="eca-student-leaderboard-detail-trend" emptyText="-" />
                            </div>
                        </section>

                        <section className="eca-student-leaderboard-detail-missions">
                            <div className="eca-student-leaderboard-detail-list-header">
                                <h3>Completed Missions ({filteredDetailLogs.length})</h3>
                                <div className="eca-student-leaderboard-detail-actions">
                                    <div className="eca-student-leaderboard-completed-filter-wrap">
                                        <button
                                            type="button"
                                            className={selectedDetailMissionCategories.length === DETAIL_MISSION_CATEGORIES.length ? "eca-student-leaderboard-icon-button eca-student-leaderboard-icon-button--filter" : "eca-student-leaderboard-icon-button eca-student-leaderboard-icon-button--filter eca-student-leaderboard-icon-button--active"}
                                            aria-label="filter completed missions by category"
                                            onClick={() => {
                                                setDetailMissionSearchOpen(false);
                                                setDetailMissionFilterOpen((prev) => !prev);
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>

                                        {detailMissionFilterOpen ? (
                                            <div className="eca-student-leaderboard-completed-filter-popover">
                                                {DETAIL_MISSION_CATEGORIES.map((category) => (
                                                    <button type="button" key={category} className="eca-student-leaderboard-completed-filter-option" onClick={() => toggleDetailMissionCategory(category)}>
                                                        <img className="eca-student-leaderboard-completed-filter-radio" src={getDetailMissionCategoryFilterIcon(category, selectedDetailMissionCategories)} alt="" />
                                                        <span>{getCategoryLabel(category, t)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>

                                    {renderDetailMissionSearchControl()}
                                </div>
                            </div>

                            <div className="eca-student-leaderboard-detail-mission-list">
                                {detailLoading ? (
                                    <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p>
                                ) : filteredDetailLogs.length > 0 ? (
                                    filteredDetailLogs.map((log) => (
                                        <MissionLogRow key={`${log.submissionId}-${log.missionId}`} log={log} t={t} onClick={selectedTarget.type === "me" ? () => void openMyMissionDetail(log) : undefined} />
                                    ))
                                ) : (
                                    <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.missionLogEmpty`, "No completed missions.")}</p>
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            ) : null}

            {renderMissionDetailModal()}
            {renderMissionEvidenceImagePreviewModal()}
            
            {questModalOpen ? (
                <div className="eca-student-leaderboard-quest-modal-backdrop">
                    <section className={questModalStep === "complete" ? "eca-student-leaderboard-quest-modal is-complete" : "eca-student-leaderboard-quest-modal"} role="dialog" aria-modal="true">
                        <button type="button" className="eca-student-leaderboard-quest-modal-close" onClick={closeQuestModal} aria-label="close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>
                        {questModalStep !== "complete" ? (
                            <>
                                <div className="eca-student-leaderboard-quest-progress">
                                    <span className="is-active" />
                                    <span className={questModalStep === "submit" ? "is-active" : ""} />
                                </div>

                                <p className="eca-student-leaderboard-quest-step-label">{questModalStep === "select" ? "1/2 단계" : "2/2 단계"}</p>
                            </>
                        ) : null}

                        {questModalStep === "complete" ? (
                            <section className="eca-student-leaderboard-quest-complete">
                                <span className="eca-student-leaderboard-quest-complete-icon" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                                        <circle cx="25" cy="25" r="25" fill="#0166FF"/>
                                        <path d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </span>

                                <h2>Completed!</h2>
                                <p>Scores will be updated after admin approval</p>

                                <button type="button" onClick={closeQuestModal}>Save</button>
                            </section>
                        ) : questModalStep === "select" ? (
                            <>
                                <h2 className="eca-student-leaderboard-quest-modal-title">Select a Quest</h2>

                                <section className="eca-student-leaderboard-quest-select-box">
                                    <div className="eca-student-leaderboard-quest-filter-row">
                                        <button type="button" className={missionFilter === "ALL" ? "is-active" : ""} onClick={() => setMissionFilter("ALL")}>
                                            All ({missionItems.length})
                                        </button>
                                        <button type="button" className={missionFilter === "AVAILABLE" ? "is-active" : ""} onClick={() => setMissionFilter("AVAILABLE")}>
                                            Available ({availableMissionCount})
                                        </button>
                                        <button type="button" className={missionFilter === "MAXED_OUT" ? "is-active" : ""} onClick={() => setMissionFilter("MAXED_OUT")}>
                                            Maxed Out ({maxedOutMissionCount})
                                        </button>

                                        <div className={questSearchOpen ? "eca-student-leaderboard-quest-search-wrap eca-student-leaderboard-quest-search-wrap--open" : "eca-student-leaderboard-quest-search-wrap"} ref={questSearchWrapRef}>
                                            <button type="button" className={missionSearchText.trim() ? "eca-student-leaderboard-quest-search-button is-active" : "eca-student-leaderboard-quest-search-button"} aria-label="search quest" onClick={() => setQuestSearchOpen((prev) => !prev)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                    <path d="M15.5005 14H14.7105L14.4305 13.73C15.0554 13.0039 15.5122 12.1487 15.768 11.2256C16.0239 10.3024 16.0725 9.33413 15.9105 8.38998C15.4405 5.60998 13.1205 3.38997 10.3205 3.04997C9.33608 2.92544 8.33625 3.02775 7.39749 3.34906C6.45872 3.67038 5.60591 4.20219 4.90429 4.90381C4.20268 5.60542 3.67087 6.45824 3.34955 7.397C3.02823 8.33576 2.92593 9.33559 3.05046 10.32C3.39046 13.12 5.61046 15.44 8.39046 15.91C9.33462 16.072 10.3029 16.0234 11.2261 15.7675C12.1492 15.5117 13.0044 15.0549 13.7305 14.43L14.0005 14.71V15.5L18.2505 19.75C18.6605 20.16 19.3305 20.16 19.7405 19.75C20.1505 19.34 20.1505 18.67 19.7405 18.26L15.5005 14ZM9.50046 14C7.01046 14 5.00046 11.99 5.00046 9.49997C5.00046 7.00997 7.01046 4.99997 9.50046 4.99997C11.9905 4.99997 14.0005 7.00997 14.0005 9.49997C14.0005 11.99 11.9905 14 9.50046 14Z" fill="#A0A0A0"/>
                                                </svg>
                                            </button>

                                            {questSearchOpen ? (
                                                <div className="eca-student-leaderboard-quest-search-popover">
                                                    <input
                                                        autoFocus
                                                        value={missionSearchText}
                                                        placeholder="Search"
                                                        onChange={(event) => setMissionSearchText(event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Escape") {
                                                                setQuestSearchOpen(false);
                                                            }

                                                            if (event.key === "Enter") {
                                                                setQuestSearchOpen(false);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="eca-student-leaderboard-quest-list">
                                        {missionsLoading ? (
                                            <p className="eca-student-leaderboard-empty">Loading...</p>
                                        ) : filteredMissionItems.length > 0 ? (
                                            filteredMissionItems.map(({ mission, maxedOut }) => {
                                                const selected = selectedMission?.missionId === mission.missionId;

                                                return (
                                                    <button
                                                        type="button"
                                                        className={selected ? "eca-student-leaderboard-quest-option is-selected" : "eca-student-leaderboard-quest-option"}
                                                        key={mission.missionId}
                                                        disabled={maxedOut}
                                                        onClick={() => setSelectedMission(mission)}
                                                    >
                                                        <span className="eca-student-leaderboard-quest-radio" />
                                                        <strong>{mission.name}</strong>
                                                        <em>{getCategoryLabel(mission.category, t)}</em>
                                                        <b>+{formatNumber(mission.points)}</b>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="eca-student-leaderboard-empty">No quests.</p>
                                        )}
                                    </div>
                                </section>

                                <div className="eca-student-leaderboard-quest-modal-actions">
                                    <button type="button" className="is-secondary" onClick={closeQuestModal}>Back</button>
                                    <button type="button" disabled={!selectedMission} onClick={() => { setEvidenceFiles([]); setEvidenceUrlText(""); setQuestModalStep("submit"); }}>Next</button>
                                </div>
                            </>
                        ) : selectedMission ? (() => {
                            const evidenceTypes = getMissionEvidenceTypes(selectedMission);
                            const acceptsLink = evidenceTypes.includes("LINK");
                            const acceptsFile = evidenceTypes.some((type) => type !== "LINK");
                            const evidenceUrls = evidenceUrlText.trim() ? [evidenceUrlText.trim()] : [];
                            const hasInvalidLink = acceptsLink && evidenceUrls.length > 0 && evidenceUrls.some((url) => !isValidHttpUrl(url));
                            const submitDisabled = questSubmitting || (acceptsFile && evidenceFiles.length === 0) || (acceptsLink && (evidenceUrls.length === 0 || hasInvalidLink));

                            return (
                                <>
                                    <h2 className="eca-student-leaderboard-quest-modal-title">Upload Evidence</h2>

                                    <section className="eca-student-leaderboard-quest-submit-wrap">
                                        <section className="eca-student-leaderboard-quest-submit-card">
                                            <h3>{selectedMission.name}</h3>

                                            <label className="eca-student-leaderboard-quest-info-field">
                                                <span>Evidence</span>
                                                <input value={selectedMission.evidenceName || "-"} readOnly />
                                            </label>

                                            <label className="eca-student-leaderboard-quest-info-field is-short">
                                                <span>Submission Format</span>
                                                <input value={getEvidenceTypesLabel(evidenceTypes, t)} readOnly />
                                            </label>
                                        </section>

                                        <section className="eca-student-leaderboard-quest-submit-card">
                                            <h3>Submission</h3>

                                            {acceptsFile ? (
                                                <>
                                                    <label className="eca-student-leaderboard-quest-file-label">File</label>

                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept={getAcceptByEvidenceTypes(evidenceTypes)}
                                                        multiple
                                                        hidden
                                                        onChange={(event) => handleEvidenceFileInputChange(event, evidenceTypes)}
                                                    />

                                                    <button
                                                        type="button"
                                                        className={evidenceDragging ? "eca-student-leaderboard-quest-upload-box is-dragging" : "eca-student-leaderboard-quest-upload-box"}
                                                        disabled={questSubmitting}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        onDragEnter={handleEvidenceDragEnter}
                                                        onDragOver={handleEvidenceDragOver}
                                                        onDragLeave={handleEvidenceDragLeave}
                                                        onDrop={(event) => handleEvidenceDrop(event, evidenceTypes)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                                            <path fillRule="evenodd" clipRule="evenodd" d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z" fill="#808080"/>
                                                            <path d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z" fill="#808080"/>
                                                        </svg>
                                                        <span>{evidenceDragging ? "Drop files here" : evidenceFiles.length > 0 ? `${evidenceFiles.length} file(s) selected` : "Upload files"}</span>
                                                    </button>

                                                    {evidenceFiles.length > 0 ? (
                                                        <div className="eca-student-leaderboard-quest-file-list">
                                                            {evidenceFiles.map((file) => {
                                                                const fileKey = getEvidenceFileKey(file);
                                                                const extension = getFileExtension(file.name);

                                                                return (
                                                                    <div className="eca-student-leaderboard-quest-file-item" key={fileKey}>
                                                                        <div className="eca-student-leaderboard-quest-file-main">
                                                                            <span className="eca-student-leaderboard-quest-file-icon">{getFileIconByExtension(extension)}</span>
                                                                            <strong>{file.name}</strong>
                                                                        </div>

                                                                        <button type="button" className="eca-student-leaderboard-quest-file-remove" onClick={() => removeEvidenceFile(fileKey)} aria-label={`remove ${file.name}`}>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                                                <path d="M9 3L3 9M9 9L3 3" stroke="#808080" strokeWidth="2" strokeLinecap="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}
                                                </>
                                            ) : null}

                                            {acceptsLink ? (
                                                <div className="eca-student-leaderboard-quest-link-area">
                                                    <label className="eca-student-leaderboard-quest-file-label">Link</label>
                                                    <input
                                                        type="url"
                                                        inputMode="url"
                                                        className={hasInvalidLink ? "eca-student-leaderboard-quest-link-input is-invalid" : "eca-student-leaderboard-quest-link-input"}
                                                        value={evidenceUrlText}
                                                        placeholder="Copy your link here"
                                                        onChange={(event) => setEvidenceUrlText(event.target.value.replace(/\s/g, ""))}
                                                    />
                                                    {hasInvalidLink ? <small>Please enter a valid link.</small> : null}
                                                </div>
                                            ) : null}
                                        </section>
                                    </section>

                                    <div className="eca-student-leaderboard-quest-modal-actions">
                                        <button type="button" className="is-secondary" onClick={() => setQuestModalStep("select")}>Back</button>
                                        <button type="button" disabled={submitDisabled} onClick={() => void handleQuestEvidenceSubmit()}>{questSubmitting ? "Submitting..." : "Submit"}</button>
                                    </div>
                                </>
                            );
                        })() : null}
                    </section>
                </div>
            ) : null}
        </section>
    );
}