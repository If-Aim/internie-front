import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getStudentLeaderboardCompletedMissions, getMyLeaderboard, getMyLeaderboardMissionLogs, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { LeaderboardApprovalStatus, LeaderboardCompletedMissionResponse, LeaderboardMissionCategory, LeaderboardRankingResponse, StudentExternalActivityDetailResponse, StudentLeaderboardLogResponse, StudentLeaderboardResponse } from "../../../../../../api/ea";
import "./ecaStudentMobileLeaderboard.css";

type RouteParams = {
    externalActivityId?: string;
    activityId?: string;
    ecaId?: string;
};

type EcaMobileShellContext = {
    userName: string;
    userEmail: string;
    userProfileImg: string;
    onRequireAuth: (pathAfterLogin: string, action?: () => void) => void;
};
const DEFAULT_PROFILE_IMAGE = "/internie_mascot_normal.png";

type HeaderProps = {
    mode?: "menu" | "back";
    title?: string;
    userProfileImg: string;
    onMenuClick?: () => void;
    onBackClick?: () => void;
    onProfileClick: () => void;
};

function Header({ mode = "menu", title, userProfileImg, onMenuClick, onBackClick, onProfileClick }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="topbar topbar-main">
            {mode === "back" ? (
                <button className="iconbtn" aria-label="Back" onClick={onBackClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 17L9 12L14 7" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            ) : (
                <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
                    <img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
                </button>
            )}

            <div className="app-title">{title ?? ""}</div>

            <button type="button" className="eca-student-mobile-leaderboard-profile-button" onClick={onProfileClick} aria-label={t("menu.profile")}>
                <img
                    className="eca-student-mobile-leaderboard-profile-img"
                    src={userProfileImg || DEFAULT_PROFILE_IMAGE}
                    alt={t("menu.profile")}
                    onError={(e) => {
                        e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                    }}
                />
            </button>
        </div>
    );
}

type MissionLogCategoryFilter = LeaderboardMissionCategory;

type LeaderboardDetailTarget = {
    type: "me" | "student";
    studentId: number;
    name: string;
    rank: number | null;
    totalScore: number;
};

type DetailMissionLog = {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    status: LeaderboardApprovalStatus;
    score: number;
};

function getAllMissionLogCategories(): MissionLogCategoryFilter[] {
    return LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value);
}

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function formatOrdinal(value?: number | null): string {
    const rank = Number(value ?? 0);

    if (!rank) return "-";

    const suffix = rank % 100 >= 11 && rank % 100 <= 13 ? "th" : rank % 10 === 1 ? "st" : rank % 10 === 2 ? "nd" : rank % 10 === 3 ? "rd" : "th";

    return `${rank}${suffix}`;
}

function formatPlaceLabel(value?: number | null): string {
    const ordinal = formatOrdinal(value);

    return ordinal === "-" ? "-" : `${ordinal} Place`;
}

function formatCategory(value?: string | null): string {
    if (!value) return "Category";

    return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryLabel(value?: LeaderboardMissionCategory | null): string {
    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return option?.label ?? formatCategory(value);
}

function getLogStatusLabel(status: LeaderboardApprovalStatus): string {
    if (status === "pending") return "Pending";
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";

    return "All";
}

function mapMyLogToDetailLog(log: StudentLeaderboardLogResponse): DetailMissionLog {
    return {
        submissionId: log.submissionId,
        missionId: log.missionId,
        missionName: log.missionName,
        category: log.category,
        status: log.status,
        score: log.score ?? 0,
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
    };
}

function getMyRanking(data: StudentLeaderboardResponse | null): LeaderboardRankingResponse | null {
    if (!data) return null;

    return data.rankings.find((ranking) => ranking.studentId === data.studentId) ?? data.rankings.find((ranking) => ranking.rank === data.myRank && ranking.totalScore === data.myTotalScore) ?? null;
}

function TrendBadge({ direction, value }: { direction?: LeaderboardRankingResponse["trendDirection"] | null; value?: number | null }) {
    if (!direction || direction === "SAME" || !value) {
        return <span className="eca-student-mobile-leaderboard-trend empty" />;
    }

    return (
        <span className={`eca-student-mobile-leaderboard-trend ${direction === "UP" ? "up" : "down"}`}>
            <span className="eca-student-mobile-leaderboard-trend-icon" />
            <span>{value}</span>
        </span>
    );
}

function RankingRow({ ranking, onClick }: { ranking: LeaderboardRankingResponse; onClick: () => void }) {
    const rankClassName = ranking.rank <= 3 ? "top" : "normal";

    return (
        <button type="button" className="eca-student-mobile-leaderboard-ranking-card" onClick={onClick}>
            <div className={`eca-student-mobile-leaderboard-rank-badge ${rankClassName}`}>{ranking.rank}</div>
            <div className="eca-student-mobile-leaderboard-student-name">{ranking.studentName}</div>
            <TrendBadge direction={ranking.trendDirection} value={ranking.trendValue} />
            <div className="eca-student-mobile-leaderboard-score">{formatNumber(ranking.totalScore)}</div>
        </button>
    );
}

function MissionLogRow({ log }: { log: DetailMissionLog }) {
    const isApproved = log.status === "approved";

    return (
        <article className="eca-student-mobile-leaderboard-log-card">
            <div className="eca-student-mobile-leaderboard-log-text">
                <h3>{log.missionName}</h3>
                <p>{getCategoryLabel(log.category)} · {getLogStatusLabel(log.status)}</p>
            </div>
            <div className={`eca-student-mobile-leaderboard-log-point ${isApproved ? "active" : "inactive"}`}>+{formatNumber(log.score)}</div>
            <span className="eca-student-mobile-leaderboard-chevron">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 7L15 12L10 17" stroke="#848484" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </span>
        </article>
    );
}

export default function EcaStudentMobileLeaderboard() {
    const navigate = useNavigate();
    const params = useParams<RouteParams>();
    const { userName, userEmail, userProfileImg, onRequireAuth } = useOutletContext<EcaMobileShellContext>();
    const externalActivityId = params.externalActivityId ?? params.activityId ?? params.ecaId;
    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [leaderboard, setLeaderboard] = React.useState<StudentLeaderboardResponse | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLogLoading, setIsLogLoading] = React.useState(false);
    const [detailTarget, setDetailTarget] = React.useState<LeaderboardDetailTarget | null>(null);
    const [detailLogs, setDetailLogs] = React.useState<DetailMissionLog[]>([]);
    const [selectedMissionLogCategories, setSelectedMissionLogCategories] = React.useState<MissionLogCategoryFilter[]>(getAllMissionLogCategories);
    const [isLogFilterOpen, setIsLogFilterOpen] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");

    const myRanking = getMyRanking(leaderboard);
    const displayName = myRanking?.studentName ?? (userName?.trim() || userEmail?.trim() || "Me");
    const rankings = leaderboard?.rankings ?? [];
    const filteredDetailLogs = React.useMemo(() => {
        if (selectedMissionLogCategories.length === 0) return [];
        if (selectedMissionLogCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length) return detailLogs;

        return detailLogs.filter((log) => selectedMissionLogCategories.includes(log.category));
    }, [detailLogs, selectedMissionLogCategories]);

    React.useEffect(() => {
        let mounted = true;

        async function loadLeaderboard(): Promise<void> {
            if (!externalActivityId) {
                setErrorMessage("대외활동 정보를 찾을 수 없습니다.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setErrorMessage("");

                const [activityResponse, leaderboardResponse] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyLeaderboard(externalActivityId, { page: 0, size: 20 }),
                ]);

                if (!mounted) return;

                setActivity(activityResponse);
                setLeaderboard(leaderboardResponse);
            } catch (error) {
                if (!mounted) return;

                setErrorMessage(error instanceof Error ? error.message : "리더보드 정보를 불러오지 못했습니다.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        void loadLeaderboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId]);

    React.useEffect(() => {
        let mounted = true;

        async function loadLogs(): Promise<void> {
            if (!externalActivityId || !detailTarget) return;

            try {
                setIsLogLoading(true);

                if (detailTarget.type === "me") {
                    const response = await getMyLeaderboardMissionLogs(externalActivityId, {
                        category: null,
                        page: 0,
                        size: 100,
                    });

                    if (!mounted) return;

                    setDetailLogs(response.logs.map(mapMyLogToDetailLog));
                    return;
                }

                const response = await getStudentLeaderboardCompletedMissions(externalActivityId, detailTarget.studentId, {
                    category: null,
                    page: 0,
                    size: 100,
                });

                if (!mounted) return;

                setDetailLogs(response.missions.map(mapCompletedMissionToDetailLog));
            } catch {
                if (!mounted) return;

                setDetailLogs([]);
            } finally {
                if (mounted) setIsLogLoading(false);
            }
        }

        void loadLogs();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, detailTarget]);

    function openRankingDetail(ranking: LeaderboardRankingResponse): void {
        setSelectedMissionLogCategories(getAllMissionLogCategories());
        setDetailLogs([]);

        setDetailTarget({
            type: leaderboard?.studentId === ranking.studentId ? "me" : "student",
            studentId: ranking.studentId,
            name: ranking.studentName,
            rank: ranking.rank,
            totalScore: ranking.totalScore,
        });
    }

    function openMyDetail(): void {
        if (!leaderboard) return;

        setSelectedMissionLogCategories(getAllMissionLogCategories());
        setDetailLogs([]);

        setDetailTarget({
            type: "me",
            studentId: leaderboard.studentId,
            name: displayName,
            rank: leaderboard.myRank ?? myRanking?.rank ?? null,
            totalScore: leaderboard.myTotalScore,
        });
    }

    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function openMyPage(): void {
        onRequireAuth("/student/mypage", () => {
            navigate("/student/mypage");
        });
    }

    function handleBackClick(): void {
        if (detailTarget) {
            setDetailTarget(null);
            setDetailLogs([]);
            setIsLogFilterOpen(false);
            setSelectedMissionLogCategories(getAllMissionLogCategories());
            return;
        }

        navigate(-1);
    }

    function toggleMissionLogCategoryFilter(category: MissionLogCategoryFilter): void {
        setSelectedMissionLogCategories((prev) =>
            prev.includes(category)
                ? prev.filter((item) => item !== category)
                : [...prev, category]
        );
    }

    function selectAllMissionLogCategories(): void {
        setSelectedMissionLogCategories(getAllMissionLogCategories());
    }

    function isAllMissionLogCategorySelected(): boolean {
        return selectedMissionLogCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length;
    }

    function renderMissionLogFilter(): React.ReactElement {
        return (
            <div className="eca-student-mobile-leaderboard-log-filter-wrap">
                <button type="button" className={isAllMissionLogCategorySelected() ? "eca-student-mobile-leaderboard-filter-button" : "eca-student-mobile-leaderboard-filter-button active"} aria-label="Filter" onClick={() => setIsLogFilterOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {!isAllMissionLogCategorySelected() ? <circle cx="20" cy="6" r="3" fill="#0166FF" /> : null}
                    </svg>
                </button>
            </div>
        );
    }

    function renderMissionLogFilterModal(): React.ReactElement | null {
        if (!isLogFilterOpen) return null;

        return (
            <div className="eca-student-mobile-leaderboard-log-filter-modal-backdrop" onClick={() => setIsLogFilterOpen(false)}>
                <div className="eca-student-mobile-leaderboard-log-filter-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={isAllMissionLogCategorySelected() ? "eca-student-mobile-leaderboard-log-filter-modal-option is-selected" : "eca-student-mobile-leaderboard-log-filter-modal-option"} onClick={selectAllMissionLogCategories} aria-pressed={isAllMissionLogCategorySelected()}>
                        All
                    </button>

                    {LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => {
                        const selected = selectedMissionLogCategories.includes(option.value);

                        return (
                            <button
                                type="button"
                                className={selected ? "eca-student-mobile-leaderboard-log-filter-modal-option is-selected" : "eca-student-mobile-leaderboard-log-filter-modal-option"}
                                key={option.value}
                                onClick={() => toggleMissionLogCategoryFilter(option.value)}
                                aria-pressed={selected}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <main className="eca-student-mobile-leaderboard-page">
                <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />
                <div className="eca-student-mobile-leaderboard-main">
                    <div className="eca-student-mobile-leaderboard-state">Loading...</div>
                </div>
            </main>
        );
    }

    if (errorMessage) {
        return (
            <main className="eca-student-mobile-leaderboard-page">
                <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />
                <div className="eca-student-mobile-leaderboard-main">
                    <div className="eca-student-mobile-leaderboard-state">{errorMessage}</div>
                </div>
            </main>
        );
    }

    if (detailTarget) {
        const isMyDetail = detailTarget.type === "me";

        return (
            <main className="eca-student-mobile-leaderboard-page">
                <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />

                <div className="eca-student-mobile-leaderboard-main eca-student-mobile-leaderboard-main--detail">
                    <button type="button" className="eca-student-mobile-leaderboard-back-button" onClick={handleBackClick} aria-label="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <section className="eca-student-mobile-leaderboard-my-point-card">
                        <h1>{isMyDetail ? "My points" : detailTarget.name}</h1>
                        <strong>{formatNumber(detailTarget.totalScore)}</strong>
                        <span>{formatPlaceLabel(detailTarget.rank)}</span>
                    </section>

                    <section className="eca-student-mobile-leaderboard-log-section">
                        <div className="eca-student-mobile-leaderboard-log-title-row">
                            <h2>Mission Log</h2>
                            {renderMissionLogFilter()}
                        </div>

                        <div className="eca-student-mobile-leaderboard-log-list">
                            {isLogLoading ? (
                                <div className="eca-student-mobile-leaderboard-state small">Loading...</div>
                            ) : filteredDetailLogs.length ? (
                                filteredDetailLogs.map((log) => <MissionLogRow key={`${log.submissionId}-${log.missionId}`} log={log} />)
                            ) : (
                                <div className="eca-student-mobile-leaderboard-empty">Mission log is empty.</div>
                            )}
                        </div>
                    </section>

                    {isMyDetail ? (
                        <button type="button" className="eca-student-mobile-leaderboard-get-point-button" onClick={() => { if (!externalActivityId) return; navigate(`/student/activities/${externalActivityId}/leaderboard/missions`); }}>
                            Get Point
                        </button>
                    ) : null}
                </div>
                {renderMissionLogFilterModal()}
            </main>
        );
    }

    return (
        <main className="eca-student-mobile-leaderboard-page">
            <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />

            <div className="eca-student-mobile-leaderboard-main">
                <section className="eca-student-mobile-leaderboard-title">
                    <h1>{activity?.name ?? "Class"}</h1>
                </section>

                <section className="eca-student-mobile-leaderboard-tab-section">
                    <button type="button" className="eca-student-mobile-leaderboard-tab-button">Ranking</button>
                </section>

                <section className="eca-student-mobile-leaderboard-ranking-list">
                    {rankings.length ? rankings.map((ranking) => <RankingRow key={ranking.studentId} ranking={ranking} onClick={() => openRankingDetail(ranking)} />) : <div className="eca-student-mobile-leaderboard-empty">Ranking is empty.</div>}
                </section>
            </div>
            {leaderboard && (
                <button type="button" className="eca-student-mobile-leaderboard-my-floating-card" onClick={openMyDetail}>
                    <span className="eca-student-mobile-leaderboard-my-rank">{leaderboard.myRank ?? myRanking?.rank ?? "-"}</span>
                    <span className="eca-student-mobile-leaderboard-my-name">{displayName}</span>
                    <span className="eca-student-mobile-leaderboard-my-score">{formatNumber(leaderboard.myTotalScore)}</span>
                    <span className="eca-student-mobile-leaderboard-my-arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M10 7L15 12L10 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </span>
                </button>
            )}
        </main>
    );
}