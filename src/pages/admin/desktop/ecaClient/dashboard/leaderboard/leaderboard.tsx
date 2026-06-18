import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./leaderboard.css";

type LeaderboardTab = "ranking" | "approvals" | "missions";
type LeaderboardSort = "highest" | "lowest";
type TrendDirection = "up" | "down" | "same";
type ApprovalCategory = "Participation" | "Intent" | "Content";
type MissionCategory = "Participation" | "Intents" | "Contents";

type RankingRow = {
    id: number;
    name: string;
    totalScore: number;
    trendDirection: TrendDirection;
    trendAmount: number;
};

type ApprovalRow = {
    id: number;
    name: string;
    nickname: string;
    submittedAt: string;
    category: ApprovalCategory;
    points: number;
    title: string;
    evidenceUrls: string[];
};

type CompletedMission = {
    id: number;
    title: string;
    category: string;
    points: number;
    submittedAt: string;
    evidenceUrls: string[];
};

type MissionRule = {
    id: number;
    title: string;
    category: MissionCategory;
    points: number;
    maximum: number;
    evidence: string;
    description: string;
};

type MissionForm = {
    title: string;
    description: string;
    category: MissionCategory;
    points: string;
    maximum: string;
    evidence: string;
};

const rankingNames = [
    "Eiza González Reyna",
    "Eiza González Reyna",
    "Eiza González Reyna",
    "Eiza González Reyna",
    "Diego Luna",
    "Salma Hayek Pinault",
    "Salma Hayek Pinault",
    "Gael García Bernal",
];

// Ranking
const rankingScores = [10526, 9000, 8000, 7000, 6000, 500, 500, 500];

const mockRankingRows: RankingRow[] = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    name: rankingNames[index % rankingNames.length],
    totalScore: rankingScores[index] ?? Math.max(100, 500 - ((index - 7) * 20)),
    trendDirection: index === 0 || index === 1 || index === 6 ? "up" : "down",
    trendAmount: index === 0 ? 28 : index === 1 || index === 6 ? 2 : 1,
}));

const mockCompletedMissions: CompletedMission[] = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    title: "Coffee Chat with team members",
    category: "Participation",
    points: 100,
    submittedAt: "July 10, 16:42",
    evidenceUrls: [],
}));

// Approvals
const approvalCategories: ApprovalCategory[] = ["Participation", "Intent", "Content", "Participation"];

const mockApprovalRows: ApprovalRow[] = Array.from({ length: 13 }, (_, index) => ({
    id: index + 1,
    name: "Hernández Hernández, Juan",
    nickname: "Nickname???",
    submittedAt: "July 10, 16:42",
    category: approvalCategories[index % approvalCategories.length],
    points: 100,
    title: "발표 · 데모데이 피칭",
    evidenceUrls: [],
}));

// Missions
const missionCategories: MissionCategory[] = ["Participation", "Intents", "Contents"];

const mockMissionRules: MissionRule[] = [
    ...Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        title: "Coffee Chat with team",
        category: "Participation" as MissionCategory,
        points: 10,
        maximum: 1,
        evidence: "Explain what students need to submit as evidence",
        description: "Complete coffee chat with team members.",
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
        id: index + 101,
        title: index === 0 ? "Interview your customer" : "Coffee Chat with team",
        category: "Intents" as MissionCategory,
        points: 10,
        maximum: 1,
        evidence: "Explain what students need to submit as evidence",
        description: "Complete the mission.",
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
        id: index + 201,
        title: index === 0 ? "Interview your customer" : "Coffee Chat with team",
        category: "Contents" as MissionCategory,
        points: 10,
        maximum: 1,
        evidence: "Explain what students need to submit as evidence",
        description: "Complete the mission.",
    })),
];

function formatScore(score: number): string {
    return String(score);
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
    const navigate = useNavigate();
    const { externalActivityId } = useParams();
    const { managedActivities } = useOutletContext<EcaClientAdminOutletContext>();
    const activityId = Number(externalActivityId);
    const activity = managedActivities.find((item) => item.externalActivityId === activityId) ?? null;
    const [activeTab, setActiveTab] = React.useState<LeaderboardTab>("ranking");
    const [sort, setSort] = React.useState<LeaderboardSort>("highest");
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [selectedRankingRow, setSelectedRankingRow] = React.useState<RankingRow | null>(null);
    const [selectedMission, setSelectedMission] = React.useState<CompletedMission | null>(null);
    const [completedMissions, setCompletedMissions] = React.useState<CompletedMission[]>(mockCompletedMissions);
    const [deleteMissionTarget, setDeleteMissionTarget] = React.useState<CompletedMission | null>(null);
    
    const [approvalRows, setApprovalRows] = React.useState<ApprovalRow[]>(mockApprovalRows);
    const [selectedApprovalRow, setSelectedApprovalRow] = React.useState<ApprovalRow | null>(null);

    const [missionRules, setMissionRules] = React.useState<MissionRule[]>(mockMissionRules);
    const [missionModalOpen, setMissionModalOpen] = React.useState(false);
    const [missionForm, setMissionForm] = React.useState<MissionForm>({
        title: "",
        description: "",
        category: "Participation",
        points: "",
        maximum: "",
        evidence: "",
    });
    const actionMenuRef = React.useRef<HTMLDivElement | null>(null);
    
    const sortedRankingRows = React.useMemo(() => {
        const copied = [...mockRankingRows];

        copied.sort((a, b) => sort === "highest" ? b.totalScore - a.totalScore : a.totalScore - b.totalScore);

        return copied;
    }, [sort]);

    const selectedRank = React.useMemo(() => {
        if (!selectedRankingRow) return 0;

        return sortedRankingRows.findIndex((row) => row.id === selectedRankingRow.id) + 1;
    }, [selectedRankingRow, sortedRankingRows]);

    React.useEffect(() => {
        if (!menuOpen) return;

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target;

            if (!(target instanceof Node)) return;
            if (actionMenuRef.current?.contains(target)) return;

            setMenuOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [menuOpen]);

    function handleRevise(): void {
        setMenuOpen(false);

        if (!Number.isFinite(activityId)) return;

        navigate(`/program-admin/activities/${activityId}/edit`);
    }

    function handleDeleteClick(): void {
        setMenuOpen(false);
        setDeleteModalOpen(true);
    }

    function handleConfirmDelete(): void {
        setDeleteModalOpen(false);
        alert("Delete API 연결 후 삭제 처리하면 됩니다.");
    }

    function handleConfirmMissionDelete(): void {
        if (!deleteMissionTarget) return;

        setCompletedMissions((prev) => prev.filter((mission) => mission.id !== deleteMissionTarget.id));
        setSelectedMission((prev) => prev?.id === deleteMissionTarget.id ? null : prev);
        setDeleteMissionTarget(null);
    }

    function handleApprovalDecision(id: number): void {
        setApprovalRows((prev) => prev.filter((row) => row.id !== id));
        setSelectedApprovalRow(null);
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
            category: "Participation",
            points: "",
            maximum: "",
            evidence: "",
        });
    }

    function handleOpenMissionModal(): void {
        resetMissionForm();
        setMissionModalOpen(true);
    }

    function handleCloseMissionModal(): void {
        setMissionModalOpen(false);
    }

    function handleCreateMission(): void {
        const title = missionForm.title.trim();
        const description = missionForm.description.trim();
        const evidence = missionForm.evidence.trim();
        const points = Number(missionForm.points);
        const maximum = Number(missionForm.maximum);

        if (!title || !description || !evidence || !Number.isFinite(points) || !Number.isFinite(maximum) || points <= 0 || maximum <= 0) {
            alert("필수값을 모두 올바르게 입력해주세요.");
            return;
        }

        const nextMission: MissionRule = {
            id: Date.now(),
            title,
            category: missionForm.category,
            points,
            maximum,
            evidence,
            description,
        };

        setMissionRules((prev) => [nextMission, ...prev]);
        setMissionModalOpen(false);
        resetMissionForm();
    }

    function getMissionRulesByCategory(category: MissionCategory): MissionRule[] {
        return missionRules.filter((mission) => mission.category === category);
    }

    function renderToolbar(selectElement: React.ReactNode): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-toolbar">
                {selectElement}

                <div className="eca-admin-leaderboard-toolbar-actions">
                    <button type="button" className="eca-admin-leaderboard-icon-button eca-admin-leaderboard-icon-button--filter" aria-label="filter">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 7H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M4 12H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M4 17H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button type="button" className="eca-admin-leaderboard-icon-button" aria-label="export">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 4V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M8 11L12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 20H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button type="button" className="eca-admin-leaderboard-icon-button" aria-label="search">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    function renderRankingContent(): React.ReactElement {
        return (
            <div className="eca-admin-leaderboard-ranking-content">
                <div className="eca-admin-leaderboard-ranking-title">Students Ranking ({mockRankingRows.length})</div>
                <div className="eca-admin-leaderboard-table-header">
                    <span>Rank</span>
                    <span />
                    <span>Name</span>
                    <span>Total Score</span>
                    <span />
                </div>

                <div className="eca-admin-leaderboard-list">
                    {sortedRankingRows.map((row, index) => {
                        const rank = index + 1;
                        const isTopRank = rank <= 3;
                        const trendClassName = row.trendDirection === "up" ? "eca-admin-leaderboard-trend eca-admin-leaderboard-trend--up" : "eca-admin-leaderboard-trend eca-admin-leaderboard-trend--down";

                        return (
                            <button
                                type="button"
                                className={selectedRankingRow?.id === row.id ? "eca-admin-leaderboard-row eca-admin-leaderboard-row--selected" : "eca-admin-leaderboard-row"}
                                key={row.id}
                                onClick={() => setSelectedRankingRow(row)}
                            >
                                <span className={isTopRank ? "eca-admin-leaderboard-rank-badge eca-admin-leaderboard-rank-badge--top" : "eca-admin-leaderboard-rank-badge"}>{rank}</span>
                                <span className="eca-admin-leaderboard-user-avatar" aria-hidden="true" />
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
                <div className="eca-admin-leaderboard-approvals-title">Pending Approval ({approvalRows.length})</div>

                <div className="eca-admin-leaderboard-approvals-header">
                    <span />
                    <span>Name</span>
                    <span>Submission Date</span>
                    <span>Category</span>
                    <span>Points</span>
                </div>

                <div className="eca-admin-leaderboard-approvals-list">
                    {approvalRows.map((row) => (
                        <button
                            type="button"
                            className={selectedApprovalRow?.id === row.id ? "eca-admin-leaderboard-approval-row eca-admin-leaderboard-approval-row--selected" : "eca-admin-leaderboard-approval-row"}
                            key={row.id}
                            onClick={() => {setSelectedRankingRow(null); setSelectedApprovalRow(row);}}
                        >
                            <span className="eca-admin-leaderboard-approval-avatar" aria-hidden="true" />
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
                    <select className="eca-admin-leaderboard-sort-select" value={sort} onChange={(event) => setSort(event.target.value as LeaderboardSort)} aria-label="sort ranking">
                        <option value="highest">Highest</option>
                        <option value="lowest">Lowest</option>
                    </select>
                )}
                {renderRankingContent()}
            </>
        );
    }

    function renderApprovalsSlide(): React.ReactElement {
        return (
            <>
                {renderToolbar(
                    <select className="eca-admin-leaderboard-sort-select" defaultValue="latest" aria-label="sort approvals">
                        <option value="latest">최신순</option>
                        <option value="oldest">오래된순</option>
                    </select>
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
                        <button type="button" className="eca-admin-leaderboard-missions-search-button" aria-label="search missions">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button type="button" className="eca-admin-leaderboard-missions-add-button" onClick={handleOpenMissionModal}>
                            추가하기
                        </button>
                    </div>
                </div>

                <div className="eca-admin-leaderboard-mission-columns">
                    {missionCategories.map((category) => {
                        const categoryMissions = getMissionRulesByCategory(category);

                        return (
                            <section className="eca-admin-leaderboard-mission-column" key={category}>
                                <h3>{category} ({categoryMissions.length})</h3>
                                <div className="eca-admin-leaderboard-mission-column-list">
                                    {categoryMissions.map((mission) => (
                                        <article className="eca-admin-leaderboard-mission-rule-card" key={mission.id}>
                                            <strong>{mission.title}</strong>
                                            <div className="eca-admin-leaderboard-mission-rule-bottom">
                                                <span>+{mission.points}</span>
                                                <button type="button" className="eca-admin-leaderboard-mission-rule-edit-button" aria-label="edit mission">
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

        return (
            <aside className="eca-admin-leaderboard-detail-panel" aria-label="student detail panel">
                <button type="button" className="eca-admin-leaderboard-detail-close" aria-label="close student detail" onClick={() => setSelectedRankingRow(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                <div className="eca-admin-leaderboard-detail-profile">
                    <span className="eca-admin-leaderboard-detail-avatar" aria-hidden="true" />
                    <div className="eca-admin-leaderboard-detail-profile-text">
                        <strong className="eca-admin-leaderboard-detail-name">{selectedRankingRow.name}</strong>
                        <span className="eca-admin-leaderboard-detail-nickname">Nickname???</span>
                    </div>
                </div>

                <section className="eca-admin-leaderboard-detail-score-card">
                    <div className="eca-admin-leaderboard-detail-score-label">Total Points:</div>
                    <div className="eca-admin-leaderboard-detail-score-row">
                        <strong>{selectedRankingRow.totalScore.toLocaleString()}</strong>
                        <span>pt</span>
                    </div>
                    <div className="eca-admin-leaderboard-detail-place-row">
                        <span>{selectedRank > 0 ? `${selectedRank}th Place` : "-"}</span>
                        <span className={trendClassName}>
                            <span aria-hidden="true">{selectedRankingRow.trendDirection === "up" ? "▲" : "▼"}</span>
                            <span>{selectedRankingRow.trendAmount}</span>
                        </span>
                    </div>
                </section>

                <div className="eca-admin-leaderboard-detail-list-header">
                    <h2>Completed Missions ({completedMissions.length})</h2>
                    <div className="eca-admin-leaderboard-detail-actions">
                        <button type="button" className="eca-admin-leaderboard-icon-button eca-admin-leaderboard-icon-button--filter" aria-label="filter completed missions">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 7H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M4 12H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M4 17H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <button type="button" className="eca-admin-leaderboard-icon-button" aria-label="search completed missions">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="eca-admin-leaderboard-detail-mission-list">
                    {completedMissions.map((mission) => (
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
        );
    }

    function renderApprovalDetailPanel(): React.ReactElement | null {
        if (!selectedApprovalRow) return null;

        const evidenceSlots = selectedApprovalRow.evidenceUrls.length > 0 ? selectedApprovalRow.evidenceUrls : ["", "", "", ""];

        return (
            <aside className="eca-admin-leaderboard-detail-panel eca-admin-leaderboard-detail-panel--approval" aria-label="approval detail panel">
                <button type="button" className="eca-admin-leaderboard-detail-close" aria-label="close approval detail" onClick={() => setSelectedApprovalRow(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                <div className="eca-admin-leaderboard-approval-detail-profile">
                    <span className="eca-admin-leaderboard-detail-avatar" aria-hidden="true" />
                    <div className="eca-admin-leaderboard-detail-profile-text">
                        <strong className="eca-admin-leaderboard-approval-detail-name">{selectedApprovalRow.name}</strong>
                        <span className="eca-admin-leaderboard-detail-nickname">{selectedApprovalRow.nickname}</span>
                    </div>
                </div>

                <div className="eca-admin-leaderboard-approval-evidence-list">
                    {evidenceSlots.slice(0, 4).map((url, index) => (
                        url ? (
                            <img className="eca-admin-leaderboard-approval-evidence-img" src={url} alt={`approval evidence ${index + 1}`} key={`${url}-${index}`} />
                        ) : (
                            <span className="eca-admin-leaderboard-approval-evidence-placeholder" aria-hidden="true" key={`approval-placeholder-${index}`} />
                        )
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
                    <button type="button" className="eca-admin-leaderboard-approval-detail-button eca-admin-leaderboard-approval-detail-button--approve" onClick={() => handleApprovalDecision(selectedApprovalRow.id)}>
                        Approve
                    </button>
                    <button type="button" className="eca-admin-leaderboard-approval-detail-button eca-admin-leaderboard-approval-detail-button--reject" onClick={() => handleApprovalDecision(selectedApprovalRow.id)}>
                        Reject
                    </button>
                </div>
            </aside>
        );
    }

    function renderMissionDetailModal(): React.ReactElement | null {
        if (!selectedMission) return null;

        const evidenceSlots = selectedMission.evidenceUrls.length > 0 ? selectedMission.evidenceUrls : ["", ""];

        return (
            <div className="eca-admin-leaderboard-mission-modal-backdrop" role="presentation" onClick={() => setSelectedMission(null)}>
                <section className="eca-admin-leaderboard-mission-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-mission-modal-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-mission-modal-close" aria-label="close mission detail" onClick={() => setSelectedMission(null)}>
                        ×
                    </button>

                    <div className="eca-admin-leaderboard-mission-modal-evidence-list">
                        {evidenceSlots.slice(0, 2).map((url, index) => (
                            url ? (
                                <img className="eca-admin-leaderboard-mission-modal-evidence-img" src={url} alt={`mission evidence ${index + 1}`} key={`${url}-${index}`} />
                            ) : (
                                <span className="eca-admin-leaderboard-mission-modal-evidence-placeholder" aria-hidden="true" key={`placeholder-${index}`} />
                            )
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
            <div className="eca-admin-leaderboard-add-mission-backdrop" role="presentation" onClick={handleCloseMissionModal}>
                <section className="eca-admin-leaderboard-add-mission-modal" role="dialog" aria-modal="true" aria-labelledby="eca-admin-leaderboard-add-mission-title" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="eca-admin-leaderboard-add-mission-close" aria-label="close add mission modal" onClick={handleCloseMissionModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    <h2 id="eca-admin-leaderboard-add-mission-title">Add Mission</h2>

                    <label className="eca-admin-leaderboard-add-mission-field">
                        <span>Mission Name</span>
                        <input value={missionForm.title} onChange={(event) => handleMissionFormChange("title", event.target.value)} placeholder="Enter Mission Name" />
                    </label>

                    <label className="eca-admin-leaderboard-add-mission-field">
                        <span>Mission Description</span>
                        <input value={missionForm.description} onChange={(event) => handleMissionFormChange("description", event.target.value)} placeholder="Describe the Mission" />
                    </label>

                    <label className="eca-admin-leaderboard-add-mission-field eca-admin-leaderboard-add-mission-field--half">
                        <span>Category</span>
                        <select value={missionForm.category} onChange={(event) => handleMissionFormChange("category", event.target.value as MissionCategory)}>
                            <option value="Participation">Participation</option>
                            <option value="Intents">Intents</option>
                            <option value="Contents">Contents</option>
                        </select>
                    </label>

                    <div className="eca-admin-leaderboard-add-mission-grid">
                        <label className="eca-admin-leaderboard-add-mission-field">
                            <span>Points</span>
                            <input value={missionForm.points} onChange={(event) => handleMissionFormChange("points", event.target.value)} placeholder="Number" inputMode="numeric" />
                        </label>
                        <label className="eca-admin-leaderboard-add-mission-field">
                            <span>Maximum Missions per Student</span>
                            <input value={missionForm.maximum} onChange={(event) => handleMissionFormChange("maximum", event.target.value)} placeholder="Number" inputMode="numeric" />
                        </label>
                    </div>

                    <label className="eca-admin-leaderboard-add-mission-field">
                        <span>Evidence</span>
                        <input value={missionForm.evidence} onChange={(event) => handleMissionFormChange("evidence", event.target.value)} placeholder="Explain what students need to submit as evidence" />
                    </label>

                    <div className="eca-admin-leaderboard-add-mission-actions">
                        <button type="button" className="eca-admin-leaderboard-add-mission-button eca-admin-leaderboard-add-mission-button--cancel" onClick={handleCloseMissionModal}>
                            Cancel
                        </button>
                        <button type="button" className="eca-admin-leaderboard-add-mission-button eca-admin-leaderboard-add-mission-button--create" onClick={handleCreateMission}>
                            Create
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

                    <div className="eca-admin-leaderboard-menu-wrap" ref={actionMenuRef}>
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
                    </div>
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

            <div className="eca-admin-leaderboard-last-update">Last update 6/16 09:00</div>

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