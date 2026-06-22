import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { approveLeaderboardSubmission, createLeaderboardMission, deleteLeaderboardCompletedMission, downloadLeaderboardEvidenceFile, getLeaderboard, getLeaderboardApprovals, getLeaderboardMissions, getLeaderboardStudentCompletedMissions, rejectLeaderboardSubmission, updateLeaderboardMission, } from "../../../../../../api/ea";
import type { LeaderboardEvidenceType, LeaderboardMissionCategory, LeaderboardMissionResponse, LeaderboardRankingResponse, LeaderboardSubmissionResponse, } from "../../../../../../api/ea"; 
import { getFileIconByExtension } from "../../../../../student/desktop/eca/dashboard/assignment/fileIcons";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./leaderboard.css";

type LeaderboardTab = "ranking" | "approvals" | "missions";
type LeaderboardSort = "alphabetical" | "highest" | "lowest";
type ApprovalSort = "alphabetical" | "latest" | "oldest";
type ApprovalFilter = "all" | "pending" | "approved" | "rejected";
type TrendDirection = "up" | "down" | "same";
type MissionCategory = "Elicit" | "Discover" | "Insight" | "Synthesize" | "Own" | "Nurture";
type ApprovalCategory = MissionCategory | "Etc";
type LeaderboardDropdownId = "rankingSort" | "approvalSort" | "missionCategory" | "missionEvidenceType" | null;
type LeaderboardSearchTarget = "ranking" | "approvals" | "missions" | "completedMissions" | null;
type ClosingDetailPanel = "ranking" | "approval" | null;
type ConcreteLeaderboardSearchTarget = Exclude<LeaderboardSearchTarget, null>;
type ConcreteLeaderboardDropdownId = Exclude<LeaderboardDropdownId, null>;
type CustomDropdownOption = {
    value: string;
    label: string;
};
type DropdownMenuPosition = {
    top: number;
    left: number;
    width: number;
    height: number;
};

type RankingRow = {
    id: number;
    studentId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    totalScore: number;
    trendDirection: TrendDirection;
    trendAmount: number;
};

type ApprovalRow = {
    id: number;
    submissionId: number;
    studentId: number;
    name: string;
    nickname: string;
    profileImage?: string | null;
    submittedAt: string;
    submittedAtTime: number;
    category: ApprovalCategory;
    points: number;
    title: string;
    evidenceUrls: string[];
};

type CompletedMission = {
    id: number;
    submissionId: number;
    missionId: number;
    title: string;
    category: string;
    points: number;
    submittedAt: string;
    evidenceUrls: string[];
};

type MissionEvidenceFormat = LeaderboardEvidenceType;

type MissionRule = {
    id: number;
    missionId: number;
    title: string;
    category: MissionCategory;
    apiCategory: LeaderboardMissionCategory;
    points: number;
    maximum: number;
    evidence: string;
    evidenceType: MissionEvidenceFormat;
    description: string;
};

type MissionForm = {
    title: string;
    description: string;
    category: MissionCategory;
    points: string;
    maximum: string;
    evidence: string;
    evidenceType: MissionEvidenceFormat | "";
};

const detailPanelAnimationMs = 220;
const missionCategories: MissionCategory[] = ["Elicit", "Discover", "Insight", "Synthesize", "Own", "Nurture"];

const missionCategoryLabels: Record<MissionCategory, string> = {
    Elicit: "Elicit",
    Discover: "Discover",
    Insight: "Insight",
    Synthesize: "Synthesize",
    Own: "Own",
    Nurture: "Nurture",
};

const evidenceFormatLabels: Record<MissionEvidenceFormat, string> = {
    DOCUMENT: "Document (DOCX, PDF, PPT, etc.)",
    IMAGE: "Image (PNG, JPG, JPEG, etc.)",
    VIDEO: "Video (MP4, MOV, AVI, etc.)",
    LINK: "Link (Google Drive, YouTube, etc.)",
    OTHER: "Others",
};

const evidenceFormats: MissionEvidenceFormat[] = ["DOCUMENT", "IMAGE", "VIDEO", "LINK", "OTHER"];
const rankingSortOptions: CustomDropdownOption[] = [
    { value: "alphabetical", label: "Alphabetical" },
    { value: "highest", label: "Highest" },
    { value: "lowest", label: "Lowest" },
];

const approvalSortOptions: CustomDropdownOption[] = [
    { value: "alphabetical", label: "Alphabetical" },
    { value: "oldest", label: "Oldest" },
    { value: "latest", label: "Newest" },
];

const approvalFilterOptions: CustomDropdownOption[] = [
    { value: "all", label: "전체" },
    { value: "pending", label: "승인 전" },
    { value: "approved", label: "승인 완료" },
    { value: "rejected", label: "반려" },
];

const missionCategoryOptions: CustomDropdownOption[] = missionCategories.map((category) => ({
    value: category,
    label: missionCategoryLabels[category],
}));

const evidenceFormatOptions: CustomDropdownOption[] = evidenceFormats.map((format) => ({
    value: format,
    label: evidenceFormatLabels[format],
}));

function toUiTrendDirection(value?: string | null): TrendDirection {
    if (value === "UP") return "up";
    if (value === "DOWN") return "down";
    return "same";
}
const apiMissionCategoryByUi: Record<MissionCategory, LeaderboardMissionCategory> = {
    Elicit: "ELICIT",
    Discover: "DISCOVER",
    Insight: "INSIGHT",
    Synthesize: "SYNTHESIZE",
    Own: "OWN",
    Nurture: "NURTURE",
};

const uiMissionCategoryByApi: Record<LeaderboardMissionCategory, MissionCategory> = {
    ELICIT: "Elicit",
    DISCOVER: "Discover",
    INSIGHT: "Insight",
    SYNTHESIZE: "Synthesize",
    OWN: "Own",
    NURTURE: "Nurture",
};

function isLeaderboardMissionCategory(value?: string | null): value is LeaderboardMissionCategory {
    return value === "ELICIT" || value === "DISCOVER" || value === "INSIGHT" || value === "SYNTHESIZE" || value === "OWN" || value === "NURTURE";
}

function toApiMissionCategory(category: MissionCategory): LeaderboardMissionCategory {
    return apiMissionCategoryByUi[category];
}

function toUiMissionCategory(category?: string | null): MissionCategory {
    return isLeaderboardMissionCategory(category) ? uiMissionCategoryByApi[category] : "Elicit";
}

function toUiApprovalCategory(category?: string | null): ApprovalCategory {
    return isLeaderboardMissionCategory(category) ? uiMissionCategoryByApi[category] : "Etc";
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function toApiApprovalSort(sortValue: ApprovalSort): "latest" | "oldest" {
    if (sortValue === "oldest") return "oldest";

    return "latest";
}

function toApiApprovalFilter(filter: ApprovalFilter): "pending" | "approved" | "rejected" | undefined {
    if (filter === "all") return undefined;

    return filter;
}

function getApprovalFilterTitle(filter: ApprovalFilter): string {
    if (filter === "pending") return "Pending Approval";
    if (filter === "approved") return "Approved";
    if (filter === "rejected") return "Rejected";

    return "All Approvals";
}

function toDateTimeValue(value?: string | null): number {
    if (!value) return 0;

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;
}

function mapRankingRow(row: LeaderboardRankingResponse): RankingRow {
    return {
        id: row.studentId,
        studentId: row.studentId,
        name: row.studentName,
        nickname: row.studentNickname ?? null,
        profileImage: row.profileImage,
        totalScore: row.totalScore,
        trendDirection: toUiTrendDirection(row.trendDirection),
        trendAmount: row.trendValue ?? 0,
    };
}

type LeaderboardSubmissionRow = LeaderboardSubmissionResponse & {
    studentNickname?: string | null;
    profileImage?: string | null;
    category?: LeaderboardMissionCategory | null;
    score?: number | null;
    approvedPoint?: number | null;
    points?: number | null;
};

function mapApprovalRow(row: LeaderboardSubmissionResponse): ApprovalRow {
    const submission = row as LeaderboardSubmissionRow;
    const evidenceUrl = typeof row.evidenceUrl === "string" && row.evidenceUrl.trim() ? row.evidenceUrl.trim() : "";

    return {
        id: row.submissionId,
        submissionId: row.submissionId,
        studentId: row.studentId,
        name: row.studentName,
        nickname: submission.studentNickname ?? "",
        profileImage: submission.profileImage ?? null,
        submittedAt: formatDateTime(row.submittedAt),
        submittedAtTime: toDateTimeValue(row.submittedAt),
        category: toUiApprovalCategory(submission.category),
        points: Number(submission.score ?? submission.approvedPoint ?? submission.points ?? 0),
        title: row.missionName,
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
    };
}

function mapMissionRule(row: LeaderboardMissionResponse): MissionRule {
    return {
        id: row.missionId,
        missionId: row.missionId,
        title: row.name,
        category: toUiMissionCategory(row.category),
        apiCategory: row.category,
        points: row.points,
        maximum: row.maximumPerStudent,
        evidence: row.evidenceName ?? "",
        evidenceType: row.evidenceType,
        description: row.description ?? "",
    };
}

const defaultProfileImage = "/internie_mascot_normal.png";

function renderProfileImage(profileImage: string | null | undefined, className: string, name: string): React.ReactElement {
    const imageUrl = profileImage?.trim() || defaultProfileImage;

    return (
        <img
            className={className}
            src={imageUrl}
            alt={`${name} profile`}
            onError={(event) => {
                if (event.currentTarget.src.includes(defaultProfileImage)) return;

                event.currentTarget.src = defaultProfileImage;
            }}
        />
    );
}

function getEvidenceFileName(url: string): string {
    try {
        const parsedUrl = new URL(url, window.location.origin);
        const pathName = decodeURIComponent(parsedUrl.pathname);
        const fileName = pathName.split("/").filter(Boolean).pop();

        return fileName || "evidence-file";
    } catch {
        const cleanUrl = decodeURIComponent(url.split("?")[0].split("#")[0]);
        const fileName = cleanUrl.split("/").filter(Boolean).pop();

        return fileName || "evidence-file";
    }
}

function getEvidenceExtension(url: string): string {
    const fileName = getEvidenceFileName(url);
    const extension = fileName.split(".").pop();

    return extension && extension !== fileName ? extension.toLowerCase() : "file";
}

function isImageEvidenceUrl(url: string): boolean {
    const extension = getEvidenceExtension(url);

    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "tiff"].includes(extension);
}

function isLinkEvidenceUrl(url: string): boolean {
    const extension = getEvidenceExtension(url);

    if (extension !== "file") {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.toLowerCase();

        return (
            host.includes("youtube.com") ||
            host.includes("youtu.be") ||
            host.includes("drive.google.com") ||
            host.includes("docs.google.com") ||
            host.includes("notion.site") ||
            host.includes("figma.com") ||
            host.includes("github.com") ||
            host.includes("linkedin.com") ||
            url.startsWith("http://") ||
            url.startsWith("https://")
        );
    } catch {
        return url.startsWith("http://") || url.startsWith("https://");
    }
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

async function downloadEvidenceFile(externalActivityId: number, submissionId: number, url: string): Promise<void> {
    try {
        await downloadLeaderboardEvidenceFile(
            externalActivityId,
            submissionId,
            getEvidenceFileName(url)
        );
    } catch (error) {
        console.error("downloadEvidenceFile error", error);
        window.alert("파일 다운로드에 실패했습니다.");
    }
}

function getEvidenceClassName(classPrefix: "approval" | "mission-modal", type: "img" | "placeholder" | "file" | "link"): string {
    if (classPrefix === "approval") {
        return `eca-admin-leaderboard-approval-evidence-${type}`;
    }

    return `eca-admin-leaderboard-mission-modal-evidence-${type}`;
}

function renderEvidenceSlot(
    url: string,
    index: number,
    classPrefix: "approval" | "mission-modal",
    externalActivityId: number,
    submissionId: number
): React.ReactElement {
    if (!url) {
        return (
            <span
                className={getEvidenceClassName(classPrefix, "placeholder")}
                aria-hidden="true"
                key={`${classPrefix}-placeholder-${index}`}
            />
        );
    }

    if (isImageEvidenceUrl(url)) {
        return (
            <img
                className={getEvidenceClassName(classPrefix, "img")}
                src={url}
                alt={`${classPrefix} evidence ${index + 1}`}
                key={`${url}-${index}`}
            />
        );
    }

    if (isLinkEvidenceUrl(url)) {
        return (
            <a
                className={getEvidenceClassName(classPrefix, "link")}
                href={url}
                target="_blank"
                rel="noreferrer"
                key={`${url}-${index}`}
                title={url}
            >
                {renderLinkIcon()}
                <span>{getDisplayLinkText(url)}</span>
            </a>
        );
    }

    const extension = getEvidenceExtension(url);
    const fileName = getEvidenceFileName(url);

    return (
        <button
            type="button"
            className={getEvidenceClassName(classPrefix, "file")}
            key={`${url}-${index}`}
            onClick={() => void downloadEvidenceFile(externalActivityId, submissionId, url)}
            title={fileName}
            aria-label={`download ${fileName}`}
        >
            {getFileIconByExtension(extension)}
        </button>
    );
}

function formatScore(score: number): string {
    return String(score);
}

function formatOrdinalPlace(rank: number): string {
    if (rank <= 0) return "-";

    const lastTwoDigits = rank % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${rank}th Place`;

    const lastDigit = rank % 10;

    if (lastDigit === 1) return `${rank}st Place`;
    if (lastDigit === 2) return `${rank}nd Place`;
    if (lastDigit === 3) return `${rank}rd Place`;

    return `${rank}th Place`;
}

function getTabClassName(current: LeaderboardTab, active: LeaderboardTab): string {
    return current === active ? "eca-admin-leaderboard-tab eca-admin-leaderboard-tab--active" : "eca-admin-leaderboard-tab";
}

function getTabsClassName(active: LeaderboardTab): string {
    return `eca-admin-leaderboard-tabs eca-admin-leaderboard-tabs--${active}`;
}

function getCardTrackClassName(active: LeaderboardTab): string {
    return `eca-admin-leaderboard-card-track eca-admin-leaderboard-card-track--${active}`;
}

function getApprovalCategoryClassName(category: ApprovalCategory): string {
    return `eca-admin-leaderboard-approval-category eca-admin-leaderboard-approval-category--${category.toLowerCase()}`;
}

export default function EcaDashboardLeaderboard(): React.ReactElement {
    const { externalActivityId } = useParams();
    const { managedActivities } = useOutletContext<EcaClientAdminOutletContext>();
    const activityId = Number(externalActivityId);
    const activity = managedActivities.find((item) => item.externalActivityId === activityId) ?? null;
    const [activeTab, setActiveTab] = React.useState<LeaderboardTab>("ranking");
    const [sort, setSort] = React.useState<LeaderboardSort>("highest");
    const [approvalSort, setApprovalSort] = React.useState<ApprovalSort>("alphabetical");
    const [approvalFilter, setApprovalFilter] = React.useState<ApprovalFilter>("all");
    const [approvalFilterOpen, setApprovalFilterOpen] = React.useState(false);
    // const [menuOpen, setMenuOpen] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [selectedRankingRow, setSelectedRankingRow] = React.useState<RankingRow | null>(null);
    const [selectedMission, setSelectedMission] = React.useState<CompletedMission | null>(null);
    const [completedMissions, setCompletedMissions] = React.useState<CompletedMission[]>([]);
    const [deleteMissionTarget, setDeleteMissionTarget] = React.useState<CompletedMission | null>(null);
    const [rankingRows, setRankingRows] = React.useState<RankingRow[]>([]);
    const [approvalRows, setApprovalRows] = React.useState<ApprovalRow[]>([]);
    const [selectedApprovalRow, setSelectedApprovalRow] = React.useState<ApprovalRow | null>(null);
    const [missionRules, setMissionRules] = React.useState<MissionRule[]>([]);
    const [/*loading*/, setLoading] = React.useState(false);
    const [/*errorMessage*/, setErrorMessage] = React.useState<string | null>(null);
    const [missionModalOpen, setMissionModalOpen] = React.useState(false);
    const [editingMission, setEditingMission] = React.useState<MissionRule | null>(null);
    const [missionForm, setMissionForm] = React.useState<MissionForm>({
        title: "",
        description: "",
        category: "Elicit",
        points: "",
        maximum: "",
        evidence: "",
        evidenceType: "",
    });
    const [closingDetailPanel, setClosingDetailPanel] = React.useState<ClosingDetailPanel>(null);
    const detailCloseTimerRef = React.useRef<number | null>(null);

    const [openSearch, setOpenSearch] = React.useState<LeaderboardSearchTarget>(null);
    const [rankingSearch, setRankingSearch] = React.useState("");
    const [rankingSearchDraft, setRankingSearchDraft] = React.useState("");
    const [approvalSearch, setApprovalSearch] = React.useState("");
    const [approvalSearchDraft, setApprovalSearchDraft] = React.useState("");
    const [missionSearch, setMissionSearch] = React.useState("");
    const [missionSearchDraft, setMissionSearchDraft] = React.useState("");
    const [completedMissionSearch, setCompletedMissionSearch] = React.useState("");
    const [completedMissionSearchDraft, setCompletedMissionSearchDraft] = React.useState("");

    const [openDropdown, setOpenDropdown] = React.useState<LeaderboardDropdownId>(null);
    const missionModalBackdropRef = React.useRef<HTMLDivElement | null>(null);
    const dropdownButtonRefs = React.useRef<Record<ConcreteLeaderboardDropdownId, HTMLButtonElement | null>>({
        rankingSort: null,
        approvalSort: null,
        missionCategory: null,
        missionEvidenceType: null,
    });
    const [dropdownMenuPosition, setDropdownMenuPosition] = React.useState<DropdownMenuPosition | null>(null);

    // const actionMenuRef = React.useRef<HTMLDivElement | null>(null);
    const rankingListRef = React.useRef<HTMLDivElement | null>(null);
    const missionColumnListRefs = React.useRef<Record<MissionCategory, HTMLDivElement | null>>({
        Elicit: null,
        Discover: null,
        Insight: null,
        Synthesize: null,
        Own: null,
        Nurture: null,
    });
    const [scrollableMissionCategories, setScrollableMissionCategories] = React.useState<Record<MissionCategory, boolean>>({
        Elicit: false,
        Discover: false,
        Insight: false,
        Synthesize: false,
        Own: false,
        Nurture: false,
    });
    const [rankingListScrollable, setRankingListScrollable] = React.useState(false);

    const sortedRankingRows = React.useMemo(() => {
        const keyword = rankingSearch.trim().toLowerCase();
        const copied = rankingRows.filter((row) => !keyword || row.name.toLowerCase().includes(keyword));

        copied.sort((a, b) => {
            if (sort === "alphabetical") return a.name.localeCompare(b.name);
            if (sort === "highest") return b.totalScore - a.totalScore;

            return a.totalScore - b.totalScore;
        });

        return copied;
    }, [rankingRows, sort, rankingSearch]);

    const filteredApprovalRows = React.useMemo(() => {
        const keyword = approvalSearch.trim().toLowerCase();
        const copied = approvalRows.filter((row) => !keyword || row.name.toLowerCase().includes(keyword));

        copied.sort((a, b) => {
            if (approvalSort === "alphabetical") return a.name.localeCompare(b.name);
            if (approvalSort === "oldest") return a.submittedAtTime - b.submittedAtTime;

            return b.submittedAtTime - a.submittedAtTime;
        });

        return copied;
    }, [approvalRows, approvalSearch, approvalSort]);

    const filteredCompletedMissions = React.useMemo(() => {
        const keyword = completedMissionSearch.trim().toLowerCase();

        return completedMissions.filter((mission) => !keyword || mission.title.toLowerCase().includes(keyword));
    }, [completedMissions, completedMissionSearch]);

    const selectedRank = React.useMemo(() => {
        if (!selectedRankingRow) return 0;

        return sortedRankingRows.findIndex((row) => row.id === selectedRankingRow.id) + 1;
    }, [selectedRankingRow, sortedRankingRows]);

    const loadLeaderboardData = React.useCallback(async (): Promise<void> => {
        if (!Number.isFinite(activityId)) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            const [rankingData, approvalsData, missionsData] = await Promise.all([
                getLeaderboard(activityId, { scope: "individual", sort: "score", page: 0, size: 50 }),
                getLeaderboardApprovals(activityId, {
                    ...(toApiApprovalFilter(approvalFilter) ? { status: toApiApprovalFilter(approvalFilter) } : {}),
                    sort: toApiApprovalSort(approvalSort),
                    page: 0,
                    size: 50,
                }),
                getLeaderboardMissions(activityId),
            ]);

            setRankingRows(rankingData.rankings.map(mapRankingRow));
            setApprovalRows(approvalsData.submissions.map(mapApprovalRow));
            setMissionRules(missionsData.missions.map(mapMissionRule));
        } catch (error) {
            console.error("loadLeaderboardData error", error);
            setErrorMessage("리더보드 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [activityId, approvalSort, approvalFilter]);

    React.useEffect(() => {
        loadLeaderboardData();
    }, [loadLeaderboardData]);

    React.useEffect(() => {
        if (!selectedRankingRow || !Number.isFinite(activityId)) {
            setCompletedMissions([]);
            return;
        }

        let alive = true;
        const currentActivityId = activityId;
        const selectedStudentId = selectedRankingRow.studentId;

        async function loadCompletedMissions(): Promise<void> {
            try {
                const data = await getLeaderboardStudentCompletedMissions(currentActivityId, selectedStudentId, { page: 0, size: 100 });

                if (!alive) return;

                setCompletedMissions(data.missions.map((mission) => {
                    const evidenceUrl = typeof mission.evidenceUrl === "string" && mission.evidenceUrl.trim()
                        ? mission.evidenceUrl.trim()
                        : "";

                    return {
                        id: mission.submissionId,
                        submissionId: mission.submissionId,
                        missionId: mission.missionId,
                        title: mission.missionName,
                        category: toUiMissionCategory(mission.category),
                        points: mission.score,
                        submittedAt: formatDateTime(mission.completedAt),
                        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
                    };
                }));
            } catch {
                if (alive) {
                    setCompletedMissions([]);
                }
            }
        }

        loadCompletedMissions();

        return () => {
            alive = false;
        };
    }, [activityId, selectedRankingRow]);

    React.useEffect(() => {
        return () => {
            if (detailCloseTimerRef.current !== null) {
                window.clearTimeout(detailCloseTimerRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        if (!openDropdown) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-admin-leaderboard-custom-dropdown")) return;
            if (target.closest(".eca-admin-leaderboard-custom-dropdown-menu")) return;

            setOpenDropdown(null);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [openDropdown]);

    React.useLayoutEffect(() => {
        if (!openDropdown) {
            setDropdownMenuPosition(null);
            return;
        }

        const currentDropdown = openDropdown;

        function handleUpdate(): void {
            updateDropdownMenuPosition(currentDropdown);
        }

        handleUpdate();

        window.addEventListener("resize", handleUpdate);
        window.addEventListener("scroll", handleUpdate, true);

        return () => {
            window.removeEventListener("resize", handleUpdate);
            window.removeEventListener("scroll", handleUpdate, true);
        };
    }, [openDropdown]);

    React.useEffect(() => {
        if (!openSearch) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-admin-leaderboard-search-wrap")) return;

            setOpenSearch(null);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [openSearch]);

    React.useEffect(() => {
        if (!approvalFilterOpen) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Element)) return;
            if (target.closest(".eca-admin-leaderboard-filter-wrap")) return;

            setApprovalFilterOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [approvalFilterOpen]);

    React.useLayoutEffect(() => {
        function updateScrollable(): void {
            const list = rankingListRef.current;

            if (!list) return;

            setRankingListScrollable(list.scrollHeight > list.clientHeight);
        }

        updateScrollable();

        const list = rankingListRef.current;

        if (!list) return;

        const resizeObserver = new ResizeObserver(updateScrollable);
        resizeObserver.observe(list);

        window.addEventListener("resize", updateScrollable);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateScrollable);
        };
    }, [activeTab, sortedRankingRows.length]);

    React.useLayoutEffect(() => {
        function updateMissionColumnScrollable(): void {
            const nextScrollable = missionCategories.reduce((acc, category) => {
                const list = missionColumnListRefs.current[category];

                acc[category] = !!list && list.scrollHeight > list.clientHeight;

                return acc;
            }, {} as Record<MissionCategory, boolean>);

            setScrollableMissionCategories(nextScrollable);
        }

        updateMissionColumnScrollable();

        const resizeObserver = new ResizeObserver(updateMissionColumnScrollable);

        missionCategories.forEach((category) => {
            const list = missionColumnListRefs.current[category];

            if (list) {
                resizeObserver.observe(list);
            }
        });

        window.addEventListener("resize", updateMissionColumnScrollable);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateMissionColumnScrollable);
        };
    }, [activeTab, missionRules.length]);

    function updateDropdownMenuPosition(id: ConcreteLeaderboardDropdownId): void {
        const button = dropdownButtonRefs.current[id];

        if (!button) return;

        const rect = button.getBoundingClientRect();

        setDropdownMenuPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        });
    }

    // function handleRevise(): void {
    //     setMenuOpen(false);

    //     if (!Number.isFinite(activityId)) return;

    //     navigate(`/program-admin/activities/${activityId}/edit`);
    // }

    // function handleDeleteClick(): void {
    //     setMenuOpen(false);
    //     setDeleteModalOpen(true);
    // }

    function clearDetailCloseTimer(): void {
        if (detailCloseTimerRef.current === null) return;

        window.clearTimeout(detailCloseTimerRef.current);
        detailCloseTimerRef.current = null;
    }

    function closeRankingDetailPanel(): void {
        if (!selectedRankingRow || closingDetailPanel) return;

        clearDetailCloseTimer();
        setOpenSearch(null);
        setClosingDetailPanel("ranking");

        detailCloseTimerRef.current = window.setTimeout(() => {
            setSelectedRankingRow(null);
            setCompletedMissions([]);
            setCompletedMissionSearch("");
            setCompletedMissionSearchDraft("");
            setClosingDetailPanel(null);
            detailCloseTimerRef.current = null;
        }, detailPanelAnimationMs);
    }

    function closeApprovalDetailPanel(): void {
        if (!selectedApprovalRow || closingDetailPanel) return;

        clearDetailCloseTimer();
        setOpenSearch(null);
        setClosingDetailPanel("approval");

        detailCloseTimerRef.current = window.setTimeout(() => {
            setSelectedApprovalRow(null);
            setClosingDetailPanel(null);
            detailCloseTimerRef.current = null;
        }, detailPanelAnimationMs);
    }

    function cancelDetailPanelClosing(): void {
        clearDetailCloseTimer();
        setClosingDetailPanel(null);
    }

    function handleConfirmDelete(): void {
        setDeleteModalOpen(false);
        alert("Delete API 연결 후 삭제 처리하면 됩니다.");
    }

    function getRankingListClassName(): string {
        return rankingListScrollable ? "eca-admin-leaderboard-list" : "eca-admin-leaderboard-list eca-admin-leaderboard-list--not-scrollable";
    }

    async function handleConfirmMissionDelete(): Promise<void> {
        if (!deleteMissionTarget || !selectedRankingRow || !Number.isFinite(activityId)) return;

        try {
            await deleteLeaderboardCompletedMission(activityId, selectedRankingRow.studentId, deleteMissionTarget.submissionId);
            setCompletedMissions((prev) => prev.filter((mission) => mission.id !== deleteMissionTarget.id));
            setSelectedMission((prev) => prev?.id === deleteMissionTarget.id ? null : prev);
            setDeleteMissionTarget(null);
            await loadLeaderboardData();
        } catch {
            alert("완료 미션 삭제에 실패했습니다.");
        }
    }

    async function handleApprovalDecision(id: number, decision: "approve" | "reject"): Promise<void> {
        if (!Number.isFinite(activityId)) return;

        try {
            if (decision === "approve") {
                await approveLeaderboardSubmission(activityId, id, { adjustPoint: null });
            } else {
                const reason = window.prompt("반려 사유를 입력해주세요.")?.trim();

                if (!reason) return;

                await rejectLeaderboardSubmission(activityId, id, { reason });
            }

            setApprovalRows((prev) => prev.filter((row) => row.submissionId !== id));
            setSelectedApprovalRow(null);
            await loadLeaderboardData();
        } catch {
            alert(decision === "approve" ? "승인 처리에 실패했습니다." : "반려 처리에 실패했습니다.");
        }
    }

    async function handleSaveMission(): Promise<void> {
        if (!Number.isFinite(activityId)) return;

        const title = missionForm.title.trim();
        const evidence = missionForm.evidence.trim();
        const points = Number(missionForm.points);
        const maximum = Number(missionForm.maximum);

        if (!title || !evidence || !missionForm.evidenceType || !Number.isFinite(points) || !Number.isFinite(maximum) || points <= 0 || maximum <= 0) {
            alert("필수값을 모두 올바르게 입력해주세요.");
            return;
        }

        const request = {
            name: title,
            description: missionForm.description.trim() || null,
            category: toApiMissionCategory(missionForm.category),
            points,
            maximumPerStudent: maximum,
            evidenceName: evidence,
            evidenceType: missionForm.evidenceType,
            autoReflect: false,
        };

        try {
            if (editingMission) {
                const updated = await updateLeaderboardMission(activityId, editingMission.missionId, request);
                setMissionRules((prev) => prev.map((mission) => mission.missionId === updated.missionId ? mapMissionRule(updated) : mission));
            } else {
                const created = await createLeaderboardMission(activityId, request);
                setMissionRules((prev) => [mapMissionRule(created), ...prev]);
            }

            setOpenDropdown(null);
            setMissionModalOpen(false);
            setEditingMission(null);
            resetMissionForm();
            await loadLeaderboardData();
        } catch {
            alert(editingMission ? "미션 수정에 실패했습니다." : "미션 생성에 실패했습니다.");
        }
    }

    function handleMissionFormChange<K extends keyof MissionForm>(key: K, value: MissionForm[K]): void {
        setMissionForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function resetMissionForm(): void {
        setMissionForm({
            title: "",
            description: "",
            category: "Elicit",
            points: "",
            maximum: "",
            evidence: "",
            evidenceType: "",
        });
    }

    function handleOpenMissionModal(): void {
        setOpenDropdown(null);
        setEditingMission(null);
        resetMissionForm();
        setMissionModalOpen(true);
    }

    function handleOpenMissionEditModal(mission: MissionRule): void {
        setOpenDropdown(null);
        setEditingMission(mission);
        setMissionForm({
            title: mission.title,
            description: mission.description,
            category: mission.category,
            points: String(mission.points),
            maximum: String(mission.maximum),
            evidence: mission.evidence,
            evidenceType: mission.evidenceType,
        });
        setMissionModalOpen(true);
    }

    function handleCloseMissionModal(): void {
        setOpenDropdown(null);
        setMissionModalOpen(false);
        setEditingMission(null);
    }

    function getMissionRulesByCategory(category: MissionCategory): MissionRule[] {
        const keyword = missionSearch.trim().toLowerCase();

        return missionRules.filter((mission) => {
            if (mission.category !== category) return false;
            if (!keyword) return true;

            return mission.title.toLowerCase().includes(keyword);
        });
    }

    function getMissionColumnClassName(category: MissionCategory): string {
        return scrollableMissionCategories[category] ? "eca-admin-leaderboard-mission-column eca-admin-leaderboard-mission-column--scrollable" : "eca-admin-leaderboard-mission-column";
    }

    function setSearchDraftValue(target: ConcreteLeaderboardSearchTarget, value: string): void {
        if (target === "ranking") {
            setRankingSearchDraft(value);
            return;
        }

        if (target === "approvals") {
            setApprovalSearchDraft(value);
            return;
        }

        if (target === "missions") {
            setMissionSearchDraft(value);
            return;
        }

        setCompletedMissionSearchDraft(value);
    }

    function setSearchValue(target: ConcreteLeaderboardSearchTarget, value: string): void {
        if (target === "ranking") {
            setRankingSearch(value);
            return;
        }

        if (target === "approvals") {
            setApprovalSearch(value);
            return;
        }

        if (target === "missions") {
            setMissionSearch(value);
            return;
        }

        setCompletedMissionSearch(value);
    }

    function handleOpenSearch(target: ConcreteLeaderboardSearchTarget): void {
        setOpenDropdown(null);

        if (openSearch === target) {
            setOpenSearch(null);
            return;
        }

        if (target === "ranking") setRankingSearchDraft(rankingSearch);
        if (target === "approvals") setApprovalSearchDraft(approvalSearch);
        if (target === "missions") setMissionSearchDraft(missionSearch);
        if (target === "completedMissions") setCompletedMissionSearchDraft(completedMissionSearch);

        setOpenSearch(target);
    }

    function renderSearchIcon(): React.ReactElement {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15.5 14H14.71L14.43 13.73C15.0549 13.0039 15.5117 12.1487 15.7675 11.2256C16.0234 10.3024 16.072 9.33413 15.91 8.38998C15.44 5.60998 13.12 3.38997 10.32 3.04997C9.33559 2.92544 8.33576 3.02775 7.397 3.34906C6.45824 3.67038 5.60542 4.20219 4.90381 4.90381C4.20219 5.60542 3.67038 6.45824 3.34906 7.397C3.02775 8.33576 2.92544 9.33559 3.04997 10.32C3.38997 13.12 5.60998 15.44 8.38998 15.91C9.33413 16.072 10.3024 16.0234 11.2256 15.7675C12.1487 15.5117 13.0039 15.0549 13.73 14.43L14 14.71V15.5L18.25 19.75C18.66 20.16 19.33 20.16 19.74 19.75C20.15 19.34 20.15 18.67 19.74 18.26L15.5 14ZM9.49997 14C7.00997 14 4.99997 11.99 4.99997 9.49997C4.99997 7.00997 7.00997 4.99997 9.49997 4.99997C11.99 4.99997 14 7.00997 14 9.49997C14 11.99 11.99 14 9.49997 14Z" fill="#A0A0A0"/>
            </svg>
        );
    }

    function renderSearchControl({
        target,
        searchValue,
        draftValue,
        placeholder,
        ariaLabel,
        buttonClassName,
    }: {
        target: ConcreteLeaderboardSearchTarget;
        searchValue: string;
        draftValue: string;
        placeholder: string;
        ariaLabel: string;
        buttonClassName: string;
    }): React.ReactElement {
        const isOpen = openSearch === target;
        const buttonFullClassName = [
            buttonClassName,
            searchValue ? "eca-admin-leaderboard-search-button--active" : "",
        ].filter(Boolean).join(" ");

        return (
            <div className={isOpen ? "eca-admin-leaderboard-search-wrap eca-admin-leaderboard-search-wrap--open" : "eca-admin-leaderboard-search-wrap"}>
                <button type="button" className={buttonFullClassName} aria-label={ariaLabel} onClick={() => handleOpenSearch(target)}>
                    {renderSearchIcon()}
                </button>

                {isOpen ? (
                    <div className="eca-admin-leaderboard-search-popover">
                        <input
                            autoFocus
                            value={draftValue}
                            placeholder={placeholder}
                            onChange={(event) => {
                                const value = event.target.value;

                                setSearchDraftValue(target, value);
                                setSearchValue(target, value.trim());
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setSearchValue(target, draftValue.trim());
                                    setOpenSearch(null);
                                }

                                if (event.key === "Escape") {
                                    setOpenSearch(null);
                                }
                            }}
                        />
                    </div>
                ) : null}
            </div>
        );
    }


    function renderApprovalFilterControl(): React.ReactElement {
        //const selectedOption = approvalFilterOptions.find((option) => option.value === approvalFilter);
        const buttonClassName = [
            "eca-admin-leaderboard-icon-button",
            "eca-admin-leaderboard-icon-button--filter",
            approvalFilter !== "all" ? "eca-admin-leaderboard-icon-button--active" : "",
        ].filter(Boolean).join(" ");

        return (
            <div className={approvalFilterOpen ? "eca-admin-leaderboard-filter-wrap eca-admin-leaderboard-filter-wrap--open" : "eca-admin-leaderboard-filter-wrap"}>
                <button
                    type="button"
                    className={buttonClassName}
                    aria-label="filter approvals"
                    onClick={() => {
                        setOpenDropdown(null);
                        setOpenSearch(null);
                        setApprovalFilterOpen((prev) => !prev);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                {approvalFilterOpen ? (
                    <div className="eca-admin-leaderboard-filter-popover">
                        {approvalFilterOptions.map((option) => {
                            const selected = option.value === approvalFilter;

                            return (
                                <button
                                    type="button"
                                    className={selected ? "eca-admin-leaderboard-filter-option eca-admin-leaderboard-filter-option--selected" : "eca-admin-leaderboard-filter-option"}
                                    key={option.value}
                                    onClick={() => {
                                        setApprovalFilter(option.value as ApprovalFilter);
                                        setSelectedApprovalRow(null);
                                        setApprovalFilterOpen(false);
                                    }}
                                >
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        );
    }
    function renderCustomDropdown({
        id,
        value,
        options,
        onChange,
        ariaLabel,
        className = "",
        placeholder = "Select",
        showCheckbox = false,
    }: {
        id: ConcreteLeaderboardDropdownId;
        value: string;
        options: CustomDropdownOption[];
        onChange: (value: string) => void;
        ariaLabel: string;
        className?: string;
        placeholder?: string;
        showCheckbox?: boolean;
    }): React.ReactElement {
        const isOpen = openDropdown === id;
        const isSubmissionFormatDropdown = id === "missionEvidenceType";
        const selectedOption = options.find((option) => option.value === value);
        const shouldPortal = missionModalOpen && (id === "missionCategory" || id === "missionEvidenceType");
        const dropdownClassName = [
            "eca-admin-leaderboard-custom-dropdown",
            isOpen ? "eca-admin-leaderboard-custom-dropdown--open" : "",
            className,
        ].filter(Boolean).join(" ");
        const menuClassName = [
            "eca-admin-leaderboard-custom-dropdown-menu",
            shouldPortal ? "eca-admin-leaderboard-custom-dropdown-menu--portal" : "",
            isSubmissionFormatDropdown ? "eca-admin-leaderboard-custom-dropdown-menu--submission-format" : "",
        ].filter(Boolean).join(" ");
        const expectedOptionHeight = 48;
        const expectedMenuHeight = dropdownMenuPosition ? dropdownMenuPosition.height + options.length * expectedOptionHeight + 8 : 0;
        const availableMenuHeight = dropdownMenuPosition ? window.innerHeight - dropdownMenuPosition.top - 20 : 0;
        const portalMenuMaxHeight = dropdownMenuPosition ? Math.max(dropdownMenuPosition.height + 96, Math.min(expectedMenuHeight, availableMenuHeight)) : 0;
        const portalLayerStyle = shouldPortal && dropdownMenuPosition ? ({
            top: `${dropdownMenuPosition.top}px`,
            left: `${dropdownMenuPosition.left}px`,
            width: `${dropdownMenuPosition.width}px`,
            "--eca-dropdown-height": `${dropdownMenuPosition.height}px`,
            "--eca-dropdown-menu-max-height": `${portalMenuMaxHeight}px`,
        } as React.CSSProperties) : undefined;
        const menuElement = (
            <div className={menuClassName} role="listbox" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                {options.map((option) => {
                    const selected = option.value === value;

                    return (
                        <button type="button" className={selected ? "eca-admin-leaderboard-custom-dropdown-option eca-admin-leaderboard-custom-dropdown-option--selected" : "eca-admin-leaderboard-custom-dropdown-option"} role="option" aria-selected={selected} key={option.value} onClick={() => { onChange(option.value); setOpenDropdown(null); }}>
                            {showCheckbox ? (
                                <span className={selected ? "eca-admin-leaderboard-custom-dropdown-check eca-admin-leaderboard-custom-dropdown-check--selected" : "eca-admin-leaderboard-custom-dropdown-check"} aria-hidden="true" />
                            ) : null}
                            <span>{option.label}</span>
                        </button>
                    );
                })}
            </div>
        );
        const portalElement = shouldPortal && portalLayerStyle ? (
            <div className="eca-admin-leaderboard-custom-dropdown-portal-layer" style={portalLayerStyle} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                <button type="button" className="eca-admin-leaderboard-custom-dropdown-button eca-admin-leaderboard-custom-dropdown-button--portal" aria-label={ariaLabel} aria-expanded={isOpen} onClick={() => setOpenDropdown(null)}>
                    <span>{selectedOption?.label ?? placeholder}</span>
                    <svg className="eca-admin-leaderboard-dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                {menuElement}
            </div>
        ) : null;

        return (
            <div className={dropdownClassName}>
                <button
                    type="button"
                    ref={(node) => {
                        dropdownButtonRefs.current[id] = node;
                    }}
                    className="eca-admin-leaderboard-custom-dropdown-button"
                    aria-label={ariaLabel}
                    aria-expanded={isOpen}
                    onClick={() => {
                        if (openDropdown === id) {
                            setOpenDropdown(null);
                            return;
                        }

                        updateDropdownMenuPosition(id);
                        setOpenDropdown(id);
                    }}
                >
                    <div>{selectedOption?.label ?? placeholder}</div>
                    <svg className="eca-admin-leaderboard-dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                {isOpen ? (
                    shouldPortal && portalElement
                        ? createPortal(portalElement, missionModalBackdropRef.current ?? document.body)
                        : menuElement
                ) : null}
            </div>
        );
    }

    function renderToolbar(selectElement: React.ReactNode, searchElement: React.ReactNode, filterElement?: React.ReactNode): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-toolbar">
                {selectElement}

                <div className="eca-admin-leaderboard-toolbar-actions">
                    {filterElement}
                    <button type="button" className="eca-admin-leaderboard-icon-button" aria-label="export">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M11.625 15.513C11.5083 15.471 11.4 15.4 11.3 15.3L7.7 11.7C7.5 11.5 7.404 11.2667 7.412 11C7.42 10.7333 7.516 10.5 7.7 10.3C7.9 10.1 8.13767 9.996 8.413 9.988C8.68833 9.98 8.92567 10.0757 9.125 10.275L11 12.15V5C11 4.71667 11.096 4.47934 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99934 12.5203 4.09534 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.15L14.875 10.275C15.075 10.075 15.3127 9.979 15.588 9.987C15.8633 9.995 16.1007 10.0993 16.3 10.3C16.4833 10.5 16.5793 10.7333 16.588 11C16.5967 11.2667 16.5007 11.5 16.3 11.7L12.7 15.3C12.6 15.4 12.4917 15.471 12.375 15.513C12.2583 15.555 12.1333 15.5757 12 15.575C11.8667 15.5743 11.7417 15.5537 11.625 15.513ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#A0A0A0"/>
                        </svg>
                    </button>
                    {searchElement}
                </div>
            </div>
        );
    }

    function renderRankingContent(): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-ranking-content">
                <div className="eca-admin-leaderboard-ranking-title">Students Ranking ({sortedRankingRows.length})</div>
                <div className="eca-admin-leaderboard-table-header">
                    <span>Rank</span>
                    <span>Name</span>
                    <span>Total Score</span>
                </div>

                <div ref={rankingListRef} className={getRankingListClassName()}>
                    {sortedRankingRows.map((row, index) => {
                        const rank = index + 1;
                        const isTopRank = rank <= 3;
                        const trendClassName = row.trendDirection === "up" ? "eca-admin-leaderboard-trend eca-admin-leaderboard-trend--up" : "eca-admin-leaderboard-trend eca-admin-leaderboard-trend--down";

                        return (
                            <button type="button" className={selectedRankingRow?.id === row.id ? "eca-admin-leaderboard-row eca-admin-leaderboard-row--selected" : "eca-admin-leaderboard-row"} key={row.id} onClick={() => { cancelDetailPanelClosing(); setSelectedApprovalRow(null); setSelectedRankingRow(row); }}>
                                <span className={isTopRank ? "eca-admin-leaderboard-rank-badge eca-admin-leaderboard-rank-badge--top" : "eca-admin-leaderboard-rank-badge"}>{rank}</span>
                                {renderProfileImage(row.profileImage, "eca-admin-leaderboard-user-avatar", row.name)}
                                <span className="eca-admin-leaderboard-user-name">{row.name}</span>
                                <span className="eca-admin-leaderboard-score">{formatScore(row.totalScore)}</span>
                                <span className={trendClassName}>
                                    <span aria-hidden="true">{row.trendDirection === "up" ? "▲" : "▼"}</span>
                                    <span>{row.trendAmount}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderApprovalsContent(): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-approvals-content">
                <div className="eca-admin-leaderboard-approvals-title">{getApprovalFilterTitle(approvalFilter)} ({filteredApprovalRows.length})</div>

                <div className="eca-admin-leaderboard-approvals-header">
                    <span>Name</span>
                    <span>Submission Date</span>
                    <span>Category</span>
                    <span>Points</span>
                </div>

                <div className="eca-admin-leaderboard-approvals-list">
                    {filteredApprovalRows.map((row) => (
                        <button
                            type="button"
                            className={selectedApprovalRow?.id === row.id ? "eca-admin-leaderboard-approval-row eca-admin-leaderboard-approval-row--selected" : "eca-admin-leaderboard-approval-row"}
                            key={row.id}
                            onClick={() => {
                                cancelDetailPanelClosing();
                                setSelectedRankingRow(null);
                                setSelectedApprovalRow(row);
                            }}
                        >
                            {renderProfileImage(row.profileImage, "eca-admin-leaderboard-approval-avatar", row.name)}
                            <span className="eca-admin-leaderboard-approval-name">{row.name}</span>
                            <span className="eca-admin-leaderboard-approval-date">{row.submittedAt}</span>
                            <span className={getApprovalCategoryClassName(row.category)}>{row.category}</span>
                            <span className="eca-admin-leaderboard-approval-point">+{row.points}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    function renderRankingSlide(): React.ReactElement {
        return (
            <>
                {renderToolbar(
                    renderCustomDropdown({
                        id: "rankingSort",
                        value: sort,
                        options: rankingSortOptions,
                        onChange: (value) => setSort(value as LeaderboardSort),
                        ariaLabel: "sort ranking",
                        className: "eca-admin-leaderboard-custom-dropdown--sort",
                    }),
                    renderSearchControl({
                        target: "ranking",
                        searchValue: rankingSearch,
                        draftValue: rankingSearchDraft,
                        placeholder: "Enter student name",
                        ariaLabel: "search ranking",
                        buttonClassName: "eca-admin-leaderboard-icon-button",
                    })
                )}
                {renderRankingContent()}
            </>
        );
    }

    function renderApprovalsSlide(): React.ReactElement {
        return (
            <>
                {renderToolbar(
                    renderCustomDropdown({
                        id: "approvalSort",
                        value: approvalSort,
                        options: approvalSortOptions,
                        onChange: (value) => setApprovalSort(value as ApprovalSort),
                        ariaLabel: "sort approvals",
                        className: "eca-admin-leaderboard-custom-dropdown--sort",
                    }),
                    renderSearchControl({
                        target: "approvals",
                        searchValue: approvalSearch,
                        draftValue: approvalSearchDraft,
                        placeholder: "Enter student name",
                        ariaLabel: "search approvals",
                        buttonClassName: "eca-admin-leaderboard-icon-button",
                    }),
                    renderApprovalFilterControl()
                )}
                {renderApprovalsContent()}
            </>
        );
    }

    function renderMissionsSlide(): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-missions-content">
                <div className="eca-admin-leaderboard-missions-top">
                    <h2>Mission Mangement</h2>
                    <div className="eca-admin-leaderboard-missions-actions">
                        {renderSearchControl({
                            target: "missions",
                            searchValue: missionSearch,
                            draftValue: missionSearchDraft,
                            placeholder: "Enter mission name",
                            ariaLabel: "search missions",
                            buttonClassName: "eca-admin-leaderboard-missions-search-button",
                        })}
                        <button type="button" className="eca-admin-leaderboard-missions-add-button" onClick={handleOpenMissionModal}>
                            추가하기
                        </button>
                    </div>
                </div>

                <div className="eca-admin-leaderboard-mission-columns">
                    {missionCategories.map((category) => {
                        const categoryMissions = getMissionRulesByCategory(category);

                        return (
                            <section className={getMissionColumnClassName(category)} key={category}>
                                <h3>{missionCategoryLabels[category]} ({categoryMissions.length})</h3>
                                <div ref={(node) => { missionColumnListRefs.current[category] = node; }} className="eca-admin-leaderboard-mission-column-list">
                                    {categoryMissions.map((mission) => (
                                        <article className="eca-admin-leaderboard-mission-rule-card" key={mission.id}>
                                            <strong>{mission.title}</strong>
                                            <div className="eca-admin-leaderboard-mission-rule-bottom">
                                                <span>+{mission.points}</span>
                                                <button type="button" className="eca-admin-leaderboard-mission-rule-edit-button" aria-label="edit mission" onClick={() => handleOpenMissionEditModal(mission)}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                        <path d="M4 16.5V20H7.5L18.2 9.3L14.7 5.8L4 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                                        <path d="M13.5 7L15.7 4.8C16.4 4.1 17.5 4.1 18.2 4.8L19.2 5.8C19.9 6.5 19.9 7.6 19.2 8.3L17 10.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderStudentDetailPanel(): React.ReactElement | null {
        if (!selectedRankingRow) return null;

        const trendClassName = selectedRankingRow.trendDirection === "up" ? "eca-admin-leaderboard-detail-trend eca-admin-leaderboard-detail-trend--up" : "eca-admin-leaderboard-detail-trend eca-admin-leaderboard-detail-trend--down";
        const panelClassName = closingDetailPanel === "ranking" ? "eca-admin-leaderboard-detail-panel eca-admin-leaderboard-detail-panel--closing" : "eca-admin-leaderboard-detail-panel";

        return (
            <div className="eca-admin-leaderboard-detail-backdrop" role="presentation" onClick={closeRankingDetailPanel}>
                <aside className={panelClassName} aria-label="student detail panel" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-detail-close" aria-label="close student detail" onClick={closeRankingDetailPanel}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div className="eca-admin-leaderboard-detail-profile">
                        {renderProfileImage(selectedRankingRow.profileImage, "eca-admin-leaderboard-detail-avatar", selectedRankingRow.name)}
                        <div className="eca-admin-leaderboard-detail-profile-text">
                            <strong className="eca-admin-leaderboard-detail-name">{selectedRankingRow.name}</strong>
                            <span className="eca-admin-leaderboard-detail-nickname">{selectedRankingRow.nickname || "-"}</span>
                        </div>
                    </div>

                    <section className="eca-admin-leaderboard-detail-score-card">
                        <div className="eca-admin-leaderboard-detail-score-label">Total Points:</div>
                        <div className="eca-admin-leaderboard-detail-score-row">
                            <strong>{selectedRankingRow.totalScore.toLocaleString()}</strong>
                            <span>pt</span>
                        </div>
                        <div className="eca-admin-leaderboard-detail-place-row">
                            <span className="eca-admin-leaderboard-detail-place-row-rank">{formatOrdinalPlace(selectedRank)}</span>
                            <span className={trendClassName}>
                                <span aria-hidden="true">{selectedRankingRow.trendDirection === "up" ? "▲" : "▼"}</span>
                                <span>{selectedRankingRow.trendAmount}</span>
                            </span>
                        </div>
                    </section>

                    <div className="eca-admin-leaderboard-detail-list-header">
                        <h2>Completed Missions ({filteredCompletedMissions.length})</h2>
                        <div className="eca-admin-leaderboard-detail-actions">
                            <button type="button" className="eca-admin-leaderboard-icon-button eca-admin-leaderboard-icon-button--filter" aria-label="filter completed missions">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            {renderSearchControl({
                                target: "completedMissions",
                                searchValue: completedMissionSearch,
                                draftValue: completedMissionSearchDraft,
                                placeholder: "Enter mission name",
                                ariaLabel: "search completed missions",
                                buttonClassName: "eca-admin-leaderboard-icon-button",
                            })}
                        </div>
                    </div>

                    <div className="eca-admin-leaderboard-detail-mission-list">
                        {filteredCompletedMissions.map((mission) => (
                            <article
                                className="eca-admin-leaderboard-detail-mission-card"
                                key={mission.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedMission(mission)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setSelectedMission(mission);
                                    }
                                }}
                            >
                                <div className="eca-admin-leaderboard-detail-mission-main">
                                    <strong>{mission.title}</strong>
                                    <div className="eca-admin-leaderboard-detail-mission-tags">
                                        <span className="eca-admin-leaderboard-detail-category-tag">{mission.category}</span>
                                        <span className="eca-admin-leaderboard-detail-point-tag">+{mission.points}</span>
                                    </div>
                                </div>
                                <div className="eca-admin-leaderboard-detail-mission-side">
                                    <span>{mission.submittedAt}</span>
                                    <button type="button" className="eca-admin-leaderboard-detail-delete-button" aria-label="delete completed mission" onClick={(event) => { event.stopPropagation(); setDeleteMissionTarget(mission);}}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#808080"/>
                                        </svg>
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>

                    <button type="button" className="eca-admin-leaderboard-detail-ok-button" onClick={() => setSelectedRankingRow(null)}>
                        OK
                    </button>
                </aside>
            </div>
        );
    }

    function renderApprovalDetailPanel(): React.ReactElement | null {
        if (!selectedApprovalRow) return null;

        const evidenceSlots = selectedApprovalRow.evidenceUrls.length > 0 ? selectedApprovalRow.evidenceUrls : ["", "", "", ""];
        const panelClassName = closingDetailPanel === "approval" ? "eca-admin-leaderboard-detail-panel eca-admin-leaderboard-detail-panel--approval eca-admin-leaderboard-detail-panel--closing" : "eca-admin-leaderboard-detail-panel eca-admin-leaderboard-detail-panel--approval";

        return (
            <div className="eca-admin-leaderboard-detail-backdrop eca-admin-leaderboard-detail-backdrop--approval" role="presentation" onClick={closeApprovalDetailPanel}>
                <aside className={panelClassName} aria-label="approval detail panel" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-detail-close" aria-label="close approval detail" onClick={() => setSelectedApprovalRow(null)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div className="eca-admin-leaderboard-approval-detail-profile">
                        {renderProfileImage(selectedApprovalRow.profileImage, "eca-admin-leaderboard-detail-avatar", selectedApprovalRow.name)}
                        <div className="eca-admin-leaderboard-detail-profile-text">
                            <strong className="eca-admin-leaderboard-approval-detail-name">{selectedApprovalRow.name}</strong>
                            <span className="eca-admin-leaderboard-detail-nickname">{selectedApprovalRow.nickname}</span>
                        </div>
                    </div>

                    <div className="eca-admin-leaderboard-approval-evidence-list">
                        {evidenceSlots.slice(0, 4).map((url, index) => (
                            renderEvidenceSlot(url, index, "approval", activityId, selectedApprovalRow.submissionId)
                        ))}
                    </div>

                    <div className="eca-admin-leaderboard-approval-detail-info">
                        <div className="eca-admin-leaderboard-approval-detail-info-row">
                            <span>Category</span>
                            <strong className={`eca-admin-leaderboard-approval-detail-category eca-admin-leaderboard-approval-detail-category--${selectedApprovalRow.category.toLowerCase()}`}>{selectedApprovalRow.category}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-approval-detail-info-row">
                            <span>Point</span>
                            <strong className="eca-admin-leaderboard-approval-detail-point">+{selectedApprovalRow.points}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-approval-detail-info-row">
                            <span>Mission</span>
                            <strong>{selectedApprovalRow.title}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-approval-detail-info-row">
                            <span>Submission Time</span>
                            <strong>{selectedApprovalRow.submittedAt}</strong>
                        </div>
                    </div>

                    <div className="eca-admin-leaderboard-approval-detail-actions">
                        <button type="button" className="eca-admin-leaderboard-approval-detail-button eca-admin-leaderboard-approval-detail-button--approve" onClick={() => handleApprovalDecision(selectedApprovalRow.submissionId, "approve")}>
                            Approve
                        </button>
                        <button type="button" className="eca-admin-leaderboard-approval-detail-button eca-admin-leaderboard-approval-detail-button--reject" onClick={() => handleApprovalDecision(selectedApprovalRow.submissionId, "reject")}>
                            Reject
                        </button>
                    </div>
                </aside>
            </div>
        );
    }

    function renderMissionDetailModal(): React.ReactElement | null {
        if (!selectedMission) return null;

        const evidenceSlots = selectedMission.evidenceUrls.length > 0 ? selectedMission.evidenceUrls : ["", ""];

        return (
            <div className="eca-admin-leaderboard-mission-modal-backdrop" role="presentation" onClick={() => setSelectedMission(null)}>
                <section className="eca-admin-leaderboard-mission-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-mission-modal-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-mission-modal-close" aria-label="close mission detail" onClick={() => setSelectedMission(null)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <div className="eca-admin-leaderboard-mission-modal-evidence-list">
                        {evidenceSlots.slice(0, 2).map((url, index) => (
                            renderEvidenceSlot(url, index, "mission-modal", activityId, selectedMission.submissionId)
                        ))}
                    </div>

                    <div className="eca-admin-leaderboard-mission-modal-info" id="eca-admin-leaderboard-mission-modal-title">
                        <div className="eca-admin-leaderboard-mission-modal-info-row">
                            <span>Category</span>
                            <strong className="eca-admin-leaderboard-detail-category-tag eca-admin-leaderboard-mission-modal-category">{selectedMission.category}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-mission-modal-info-row">
                            <span>Point</span>
                            <strong className="eca-admin-leaderboard-detail-point-tag eca-admin-leaderboard-mission-modal-point">+{selectedMission.points}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-mission-modal-info-row">
                            <span>Mission</span>
                            <strong>{selectedMission.title}</strong>
                        </div>
                        <div className="eca-admin-leaderboard-mission-modal-info-row">
                            <span>Submission Time</span>
                            <strong>{selectedMission.submittedAt}</strong>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    function renderMissionDeleteModal(): React.ReactElement | null {
        if (!deleteMissionTarget) return null;

        return (
            <div className="eca-admin-leaderboard-mission-delete-backdrop" role="presentation" onClick={() => setDeleteMissionTarget(null)}>
                <section className="eca-admin-leaderboard-mission-delete-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-mission-delete-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-mission-delete-close" aria-label="close delete modal" onClick={() => setDeleteMissionTarget(null)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M47.6 6.6665C48.9992 6.66687 50.3628 7.10746 51.4977 7.92586C52.6326 8.74427 53.4812 9.899 53.9233 11.2265L55.7333 16.6665H66.6667C67.5507 16.6665 68.3986 17.0177 69.0237 17.6428C69.6488 18.2679 70 19.1158 70 19.9998C70 20.8839 69.6488 21.7317 69.0237 22.3569C68.3986 22.982 67.5507 23.3332 66.6667 23.3332L66.6567 23.5698L63.7667 64.0465C63.5863 66.5685 62.4572 68.9286 60.6068 70.6517C58.7563 72.3748 56.3218 73.3329 53.7933 73.3332H26.2067C23.6782 73.3329 21.2437 72.3748 19.3932 70.6517C17.5428 68.9286 16.4137 66.5685 16.2333 64.0465L13.3433 23.5665L13.3333 23.3332C12.4493 23.3332 11.6014 22.982 10.9763 22.3569C10.3512 21.7317 10 20.8839 10 19.9998C10 19.1158 10.3512 18.2679 10.9763 17.6428C11.6014 17.0177 12.4493 16.6665 13.3333 16.6665H24.2667L26.0767 11.2265C26.519 9.89846 27.3681 8.74334 28.5037 7.92489C29.6392 7.10643 31.0036 6.66617 32.4033 6.6665H47.6ZM30 33.3332C29.1836 33.3333 28.3955 33.633 27.7854 34.1756C27.1753 34.7181 26.7855 35.4657 26.69 36.2765L26.6667 36.6665V56.6665C26.6676 57.5161 26.9929 58.3333 27.5762 58.9511C28.1594 59.5688 28.9565 59.9406 29.8046 59.9904C30.6528 60.0402 31.4879 59.7643 32.1394 59.219C32.791 58.6737 33.2097 57.9002 33.31 57.0565L33.3333 56.6665V36.6665C33.3333 35.7824 32.9821 34.9346 32.357 34.3095C31.7319 33.6844 30.8841 33.3332 30 33.3332ZM50 33.3332C49.1159 33.3332 48.2681 33.6844 47.643 34.3095C47.0179 34.9346 46.6667 35.7824 46.6667 36.6665V56.6665C46.6667 57.5506 47.0179 58.3984 47.643 59.0235C48.2681 59.6486 49.1159 59.9998 50 59.9998C50.8841 59.9998 51.7319 59.6486 52.357 59.0235C52.9821 58.3984 53.3333 57.5506 53.3333 56.6665V36.6665C53.3333 35.7824 52.9821 34.9346 52.357 34.3095C51.7319 33.6844 50.8841 33.3332 50 33.3332ZM47.6 13.3332H32.4L31.29 16.6665H48.71L47.6 13.3332Z" fill="#0166FF"/>
                    </svg>

                    <h2 id="eca-admin-leaderboard-mission-delete-title">Do you really want to delete this?</h2>

                    <div className="eca-admin-leaderboard-mission-delete-actions">
                        <button type="button" className="eca-admin-leaderboard-mission-delete-button" onClick={handleConfirmMissionDelete}>
                            Yes
                        </button>
                        <button type="button" className="eca-admin-leaderboard-mission-delete-button" onClick={() => setDeleteMissionTarget(null)}>
                            No
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    function renderAddMissionModal(): React.ReactElement | null {
        if (!missionModalOpen) return null;

        return (
            <div ref={missionModalBackdropRef} className="eca-admin-leaderboard-add-mission-backdrop" role="presentation" onClick={handleCloseMissionModal}>
                <section className="eca-admin-leaderboard-add-mission-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-add-mission-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-add-mission-close" aria-label="close mission modal" onClick={handleCloseMissionModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <h2 id="eca-admin-leaderboard-add-mission-title">{editingMission ? "Edit Mission" : "Add Mission"}</h2>

                    <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--wide">
                        <span>Mission Name</span>
                        <input value={missionForm.title} onChange={(event) => handleMissionFormChange("title", event.target.value)} placeholder="Enter Mission Name" />
                    </label>

                    <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--wide">
                        <span>Mission Description</span>
                        <input value={missionForm.description} onChange={(event) => handleMissionFormChange("description", event.target.value)} placeholder="Describe the Mission" />
                    </label>

                    <div className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--narrow">
                        <span>Category</span>
                        {renderCustomDropdown({
                            id: "missionCategory",
                            value: missionForm.category,
                            options: missionCategoryOptions,
                            onChange: (value) => handleMissionFormChange("category", value as MissionCategory),
                            ariaLabel: "select mission category",
                            placeholder: "Select Category",
                        })}
                    </div>

                    <div className="eca-admin-leaderboard-add-mission-grid">
                        <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--narrow">
                            <span>Points</span>
                            <input value={missionForm.points} onChange={(event) => handleMissionFormChange("points", event.target.value)} placeholder="Number" inputMode="numeric" />
                        </label>
                        <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--narrow">
                            <span>Maximum Missions per Student</span>
                            <input value={missionForm.maximum} onChange={(event) => handleMissionFormChange("maximum", event.target.value)} placeholder="Number" inputMode="numeric" />
                        </label>
                    </div>

                    <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--wide">
                        <span>Evidence</span>
                        <input value={missionForm.evidence} onChange={(event) => handleMissionFormChange("evidence", event.target.value)} placeholder="Explain what students need to submit as evidence" />
                    </label>

                    <div className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--format">
                        <span>Submission Format</span>
                        {renderCustomDropdown({
                            id: "missionEvidenceType",
                            value: missionForm.evidenceType,
                            options: evidenceFormatOptions,
                            onChange: (value) => handleMissionFormChange("evidenceType", value as MissionEvidenceFormat),
                            ariaLabel: "select submission format",
                            placeholder: "Select a format of evidence",
                            className: "eca-admin-leaderboard-custom-dropdown--submission-format",
                            showCheckbox: true,
                        })}
                    </div>

                    <div className="eca-admin-leaderboard-add-mission-actions">
                        <button type="button" className="eca-admin-leaderboard-add-mission-button eca-admin-leaderboard-add-mission-button--cancel" onClick={handleCloseMissionModal}>
                            Cancel
                        </button>
                        <button type="button" className="eca-admin-leaderboard-add-mission-button eca-admin-leaderboard-add-mission-button--create" onClick={handleSaveMission}>
                            {editingMission ? "Save" : "Create"}
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <section className="eca-admin-leaderboard-page">
            <header className="eca-admin-leaderboard-header">
                <div className="eca-admin-leaderboard-header-row">
                    <h1 className="eca-admin-leaderboard-title">{activity?.name ?? "Class Name"}</h1>

                    {/* <div className="eca-admin-leaderboard-menu-wrap" ref={actionMenuRef}>
                        <button type="button" className="eca-admin-leaderboard-more-button" aria-label="open menu" onClick={() => setMenuOpen((prev) => !prev)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M4 12C4 12.2652 4.10536 12.5196 4.29289 12.7071C4.48043 12.8946 4.73478 13 5 13C5.26522 13 5.51957 12.8946 5.70711 12.7071C5.89464 12.5196 6 12.2652 6 12C6 11.7348 5.89464 11.4804 5.70711 11.2929C5.51957 11.1054 5.26522 11 5 11C4.73478 11 4.48043 11.1054 4.29289 11.2929C4.10536 11.4804 4 11.7348 4 12ZM11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12ZM18 12C18 12.2652 18.1054 12.5196 18.2929 12.7071C18.4804 12.8946 18.7348 13 19 13C19.2652 13 19.5196 12.8946 19.7071 12.7071C19.8946 12.5196 20 12.2652 20 12C20 11.7348 19.8946 11.4804 19.7071 11.2929C19.5196 11.1054 19.2652 11 19 11C18.7348 11 18.4804 11.1054 18.2929 11.2929C18.1054 11.4804 18 11.7348 18 12Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        {menuOpen ? (
                            <div className="eca-admin-leaderboard-action-menu">
                                <button type="button" className="eca-admin-leaderboard-action-menu-item eca-admin-leaderboard-action-menu-item--delete" onClick={handleDeleteClick}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#808080"/>
                                    </svg>
                                    <span>delete</span>
                                </button>
                                <button type="button" className="eca-admin-leaderboard-action-menu-item" onClick={handleRevise}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <path d="M10.5 2.82843L14.5 6.82843M1 16.3284H5L15.5 5.82843C15.7626 5.56578 15.971 5.25398 16.1131 4.91082C16.2553 4.56766 16.3284 4.19986 16.3284 3.82843C16.3284 3.45699 16.2553 3.0892 16.1131 2.74604C15.971 2.40287 15.7626 2.09107 15.5 1.82843C15.2374 1.56578 14.9256 1.35744 14.5824 1.2153C14.2392 1.07316 13.8714 1 13.5 1C13.1286 1 12.7608 1.07316 12.4176 1.2153C12.0744 1.35744 11.7626 1.56578 11.5 1.82843L1 12.3284V16.3284Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>revise</span>
                                </button>
                            </div>
                        ) : null}
                    </div> */}
                </div>

                <nav className={getTabsClassName(activeTab)} aria-label="leaderboard tabs">
                    <button type="button" className={getTabClassName("ranking", activeTab)} onClick={() => { setActiveTab("ranking"); setSelectedApprovalRow(null); }}>Ranking</button>
                    <button type="button" className={getTabClassName("approvals", activeTab)} onClick={() => { setActiveTab("approvals"); setSelectedRankingRow(null); }}>Approvals</button>
                    <button type="button" className={getTabClassName("missions", activeTab)} onClick={() => { setActiveTab("missions"); setSelectedRankingRow(null); setSelectedApprovalRow(null); }}>Missions</button>
                </nav>
            </header>

            <section className="eca-admin-leaderboard-card">
                <div className={getCardTrackClassName(activeTab)}>
                    <div className="eca-admin-leaderboard-card-slide">
                        {renderRankingSlide()}
                    </div>
                    <div className="eca-admin-leaderboard-card-slide">
                        {renderApprovalsSlide()}
                    </div>
                    <div className="eca-admin-leaderboard-card-slide">
                        {renderMissionsSlide()}
                    </div>
                </div>
            </section>

            {deleteModalOpen ? (
                <div className="eca-admin-leaderboard-modal-backdrop" role="presentation">
                    <div className="eca-admin-leaderboard-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-delete-title">
                        <h2 id="eca-admin-leaderboard-delete-title">Do you really want to delete this?</h2>
                        <div className="eca-admin-leaderboard-confirm-actions">
                            <button type="button" className="eca-admin-leaderboard-confirm-button eca-admin-leaderboard-confirm-button--ghost" onClick={() => setDeleteModalOpen(false)}>No</button>
                            <button type="button" className="eca-admin-leaderboard-confirm-button" onClick={handleConfirmDelete}>Yes</button>
                        </div>
                    </div>
                </div>
            ) : null}
            {renderStudentDetailPanel()}
            {renderApprovalDetailPanel()}
            {renderMissionDetailModal()}
            {renderMissionDeleteModal()}
            {renderAddMissionModal()}
        </section>
    );
}