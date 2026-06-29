import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useParams } from "react-router-dom";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getMyLeaderboard, getMyLeaderboardMissionLogs, getMyLeaderboardMissions, getMyParticipatingExternalActivity, getStudentLeaderboardCompletedMissions } from "../../../../../../api/ea";
import type { LeaderboardApprovalStatus, LeaderboardCompletedMissionResponse, LeaderboardMissionCategory, LeaderboardMissionResponse, LeaderboardRankingResponse, StudentExternalActivityDetailResponse, StudentLeaderboardLogResponse, StudentLeaderboardResponse } from "../../../../../../api/ea";
import "./leaderboard.css";

const LEADERBOARD_T = "ecaStudent.leaderboardPage";
const DEFAULT_PROFILE_IMAGE = "/internie_mascot_normal.png";

type LeaderboardTab = "ranking" | "myQuests";
type QuestModalStep = "select" | "submit";
type MissionFilter = "ALL" | "AVAILABLE" | "MAXED_OUT";

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

function formatMissionDate(value?: string | null): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
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

function TrendBadge({ direction, value }: { direction?: LeaderboardRankingResponse["trendDirection"] | null; value?: number | null }): React.ReactElement {
    if (!direction || direction === "SAME" || !value) {
        return <span className="eca-student-leaderboard-trend is-empty" />;
    }

    return (
        <span className={direction === "UP" ? "eca-student-leaderboard-trend is-up" : "eca-student-leaderboard-trend is-down"}>
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
                {isMe ? <em>(me)</em> : null}
            </span>
            <span className="eca-student-leaderboard-score">{formatNumber(ranking.totalScore)}</span>
            <TrendBadge direction={ranking.trendDirection} value={ranking.trendValue} />
        </button>
    );
}

function MissionLogRow({ log, t }: { log: DetailMissionLog; t: TFunction }): React.ReactElement {
    return (
        <article className="eca-student-leaderboard-mission-row">
            <div className="eca-student-leaderboard-mission-main">
                <strong>{log.missionName}</strong>
                <div>
                    <span>{getCategoryLabel(log.category, t)}</span>
                    <em>+{formatNumber(log.score)}</em>
                </div>
            </div>
            <time>{formatMissionDate(log.reviewedAt ?? log.submittedAt)}</time>
        </article>
    );
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

    const [leaderboard, setLeaderboard] = React.useState<StudentLeaderboardResponse | null>(null);
    const [selectedTarget, setSelectedTarget] = React.useState<DetailTarget | null>(null);
    const [detailLogs, setDetailLogs] = React.useState<DetailMissionLog[]>([]);
    const [searchText, setSearchText] = React.useState("");
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");

    const rankings = React.useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const rows = leaderboard?.rankings ?? [];

        if (!keyword) return rows;

        return rows.filter((ranking) => ranking.studentName.toLowerCase().includes(keyword));
    }, [leaderboard, searchText]);

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
            });
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

    function openRankingDetail(ranking: LeaderboardRankingResponse): void {
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
        setSelectedMission(null);
        setQuestModalOpen(true);
    }

    function closeQuestModal(): void {
        setQuestModalOpen(false);
        setQuestModalStep("select");
        setSelectedMission(null);
    }

    if (loading) {
        return <section className="eca-student-leaderboard-page"><p className="eca-student-leaderboard-state">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p></section>;
    }

    if (errorMessage) {
        return <section className="eca-student-leaderboard-page"><p className="eca-student-leaderboard-state">{errorMessage}</p></section>;
    }

    return (
        <section className="eca-student-leaderboard-page">
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
                <section className="eca-student-leaderboard-card">
                    <div className="eca-student-leaderboard-toolbar">
                        <button type="button" className="eca-student-leaderboard-select-button">
                            {getText(t, `${LEADERBOARD_T}.sort.highest`, "Highest")}
                            <span>⌄</span>
                        </button>

                        <div className="eca-student-leaderboard-tool-actions">
                            <button type="button" aria-label="download">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 4V15M12 15L7 10M12 15L17 10M5 20H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button type="button" aria-label="search" onClick={() => setSearchOpen((prev) => !prev)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" />
                                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {searchOpen ? (
                        <input className="eca-student-leaderboard-search-input" value={searchText} placeholder={getText(t, `${LEADERBOARD_T}.searchPlaceholder`, "Search student")} onChange={(event) => setSearchText(event.target.value)} />
                    ) : null}

                    <div className="eca-student-leaderboard-list-title">{getText(t, `${LEADERBOARD_T}.studentsRanking`, "Students Ranking")} ({leaderboard?.totalCount ?? rankings.length})</div>

                    <div className="eca-student-leaderboard-head">
                        <span>{getText(t, `${LEADERBOARD_T}.rank.rank`, "Rank")}</span>
                        <span>{getText(t, `${LEADERBOARD_T}.rank.name`, "Name")}</span>
                        <span>{getText(t, `${LEADERBOARD_T}.rank.totalScore`, "Total Score")}</span>
                    </div>

                    <div className="eca-student-leaderboard-ranking-list">
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
                            <span>Quest Name</span>
                            <span>Category</span>
                            <span>Score</span>
                        </div>

                        <div className="eca-student-leaderboard-my-quests-list">
                            {myQuestLogsLoading ? (
                                <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p>
                            ) : myQuestLogs.length > 0 ? (
                                myQuestLogs.map((log) => (
                                    <article className="eca-student-leaderboard-my-quest-row" key={`${log.submissionId}-${log.missionId}`}>
                                        <strong>{log.missionName}</strong>
                                        <span>{getCategoryLabel(log.category, t)}</span>
                                        <em>+{formatNumber(log.score)}</em>
                                    </article>
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
                <aside className="eca-student-leaderboard-detail-panel">
                    <button type="button" className="eca-student-leaderboard-detail-close" onClick={() => setSelectedTarget(null)} aria-label="close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M18 18L6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>

                    <header className="eca-student-leaderboard-detail-profile">
                        <img src={getProfileImage(selectedTarget.profileImage)} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_PROFILE_IMAGE; }} />
                        <div>
                            <h2>{selectedTarget.name}</h2>
                            <p>{selectedTarget.nickname || ""}</p>
                        </div>
                    </header>

                    <section className="eca-student-leaderboard-total-card">
                        <span>Total Points:</span>
                        <strong>{formatNumber(selectedTarget.totalScore)}<em>pt</em></strong>
                        <div>
                            <b>{formatOrdinal(selectedTarget.rank)} Place</b>
                            <TrendBadge direction={selectedTarget.trendDirection} value={selectedTarget.trendValue} />
                        </div>
                    </section>

                    <section className="eca-student-leaderboard-detail-missions">
                        <div className="eca-student-leaderboard-detail-missions-top">
                            <h3>Completed Missions ({detailLogs.length})</h3>
                            <div>
                                <button type="button" aria-label="filter">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        <circle cx="20" cy="6" r="2.5" fill="#0166FF" />
                                    </svg>
                                </button>
                                <button type="button" aria-label="search">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                        <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="eca-student-leaderboard-mission-list">
                            {detailLoading ? (
                                <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.loading`, "Loading...")}</p>
                            ) : detailLogs.length > 0 ? (
                                detailLogs.map((log) => <MissionLogRow key={`${log.submissionId}-${log.missionId}`} log={log} t={t} />)
                            ) : (
                                <p className="eca-student-leaderboard-empty">{getText(t, `${LEADERBOARD_T}.missionLogEmpty`, "No completed missions.")}</p>
                            )}
                        </div>
                    </section>
                </aside>
            ) : null}

            {questModalOpen ? (
                <div className="eca-student-leaderboard-quest-modal-backdrop">
                    <section className="eca-student-leaderboard-quest-modal" role="dialog" aria-modal="true">
                        <button type="button" className="eca-student-leaderboard-quest-modal-close" onClick={closeQuestModal} aria-label="close">
                            ×
                        </button>

                        <div className="eca-student-leaderboard-quest-progress">
                            <span className="is-active" />
                            <span className={questModalStep === "submit" ? "is-active" : ""} />
                        </div>

                        <p className="eca-student-leaderboard-quest-step-label">{questModalStep === "select" ? "1/2 단계" : "2/2 단계"}</p>

                        {questModalStep === "select" ? (
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

                                        <div className="eca-student-leaderboard-quest-search">
                                            <input value={missionSearchText} onChange={(event) => setMissionSearchText(event.target.value)} placeholder="Search" />
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
                                    <button type="button" disabled={!selectedMission} onClick={() => setQuestModalStep("submit")}>Next</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="eca-student-leaderboard-quest-modal-title">Upload Evidence</h2>

                                <section className="eca-student-leaderboard-quest-select-box">
                                    <p className="eca-student-leaderboard-empty">
                                        {selectedMission ? selectedMission.name : "No quest selected."}
                                    </p>
                                </section>

                                <div className="eca-student-leaderboard-quest-modal-actions">
                                    <button type="button" className="is-secondary" onClick={() => setQuestModalStep("select")}>Back</button>
                                    <button type="button">Submit</button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            ) : null}
        </section>
    );
}