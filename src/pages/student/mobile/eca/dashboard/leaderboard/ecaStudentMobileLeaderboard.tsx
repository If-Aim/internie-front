import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

const LEADERBOARD_T = "ecaStudent.leaderboardPage";
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
                <button className="iconbtn" aria-label={t(`${LEADERBOARD_T}.aria.back`)} onClick={onBackClick}>
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
    submittedAt?: string | null;
    reviewedAt?: string | null;
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

function formatPlaceLabel(value: number | null | undefined, t: TFunction): string {
    const rank = Number(value ?? 0);

    if (!rank) return "-";

    return t(`${LEADERBOARD_T}.rank.place`, {
        rank: formatNumber(rank),
        rankOrdinal: formatOrdinal(rank),
    });
}

function formatCategory(value: string | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_T}.categoryFallback`);

    return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryLabel(value: LeaderboardMissionCategory | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_T}.categoryFallback`);

    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return t(`${LEADERBOARD_T}.category.${value}`, {
        defaultValue: option?.label ?? formatCategory(value, t),
    });
}

function getLogStatusLabel(status: LeaderboardApprovalStatus, t: TFunction): string {
    return t(`${LEADERBOARD_T}.logStatus.${status}`);
}

function getMissionLogDetailStatusLabel(status: LeaderboardApprovalStatus, t: TFunction): string {
    const fallback: Record<LeaderboardApprovalStatus, string> = { approved: "Approved", rejected: "Rejected", pending: "Pending", all: "All" };
    return t(`${LEADERBOARD_T}.detail.status.${status}`, { defaultValue: fallback[status] });
}

function getMissionLogDetailClassName(status: LeaderboardApprovalStatus): "approved" | "rejected" | "pending" {
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    return "pending";
}

function formatMissionLogDetailDate(value?: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(" at", ",");
}

function renderMissionLogDetailIcon(status: LeaderboardApprovalStatus): React.ReactElement {
    if (status === "rejected") {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 12.9V8.41447M12 16.2248V16.2642M17.6699 20H6.33007C4.7811 20 3.47392 18.9763 3.06265 17.5757C2.88709 16.9778 3.10281 16.3551 3.43276 15.8249L9.10269 5.60102C10.4311 3.46632 13.5689 3.46633 14.8973 5.60103L20.5672 15.8249C20.8972 16.3551 21.1129 16.9778 20.9373 17.5757C20.5261 18.9763 19.2189 20 17.6699 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        );
    }

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6.66673 22.7681H17.3339C19.4133 22.7681 20.4479 21.7134 20.4479 19.6241V10.5037C20.4479 9.20771 20.3073 8.64542 19.5037 7.82171L13.9589 2.18685C13.196 1.40299 12.5729 1.23242 11.438 1.23242H6.66673C4.59759 1.23242 3.55273 2.29699 3.55273 4.38671V19.6241C3.55273 21.7233 4.59759 22.7681 6.66673 22.7681ZM6.74688 21.1511C5.71231 21.1511 5.16973 20.5983 5.16973 19.5941V4.41671C5.16973 3.42242 5.71231 2.84942 6.75716 2.84942H11.2169V8.68571C11.2169 9.95128 11.8597 10.574 13.1052 10.574H18.8309V19.5941C18.8309 20.5983 18.2982 21.1511 17.2537 21.1511H6.74688ZM13.286 9.05685C12.8943 9.05685 12.7332 8.89656 12.7332 8.49456V3.16099L18.5189 9.05728L13.286 9.05685ZM15.6967 13.3361H8.07245C7.71116 13.3361 7.45016 13.6074 7.45016 13.949C7.45016 14.3004 7.71159 14.5717 8.07288 14.5717H15.6967C15.7789 14.573 15.8605 14.5578 15.9366 14.527C16.0128 14.4962 16.0819 14.4504 16.14 14.3923C16.1981 14.3342 16.2439 14.265 16.2748 14.1889C16.3056 14.1127 16.3208 14.0311 16.3194 13.949C16.3194 13.6074 16.0482 13.3361 15.6967 13.3361ZM15.6967 16.8419H8.07245C7.71116 16.8419 7.45016 17.123 7.45016 17.4744C7.45016 17.816 7.71159 18.0774 8.07288 18.0774H15.6967C16.0482 18.0774 16.3194 17.816 16.3194 17.4744C16.3194 17.123 16.0482 16.8419 15.6967 16.8419Z" fill="currentColor"/>
        </svg>
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

function MissionLogRow({ log, onClick }: { log: DetailMissionLog; onClick: () => void }) {
    const { t } = useTranslation();
    const isApproved = log.status === "approved";

    return (
        <button type="button" className="eca-student-mobile-leaderboard-log-card" onClick={onClick}>
            <div className="eca-student-mobile-leaderboard-log-text">
                <h3>{log.missionName}</h3>
                <p>{getCategoryLabel(log.category, t)} · {getLogStatusLabel(log.status, t)}</p>
            </div>
            <div className={`eca-student-mobile-leaderboard-log-point ${isApproved ? "active" : "inactive"}`}>+{formatNumber(log.score)}</div>
            <span className="eca-student-mobile-leaderboard-chevron">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 7L15 12L10 17" stroke="#848484" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </span>
        </button>
    );
}

export default function EcaStudentMobileLeaderboard() {
    const { t } = useTranslation();
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
    const [selectedMissionLog, setSelectedMissionLog] = React.useState<DetailMissionLog | null>(null);
    const [errorMessage, setErrorMessage] = React.useState("");

    const myRanking = getMyRanking(leaderboard);
    const displayName = myRanking?.studentName ?? (userName?.trim() || userEmail?.trim() || t(`${LEADERBOARD_T}.me`));
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
                setErrorMessage(t(`${LEADERBOARD_T}.error.activityNotFound`));
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
                setErrorMessage(error instanceof Error ? error.message : t(`${LEADERBOARD_T}.error.leaderboardLoadFailed`));
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        void loadLeaderboard();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

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

        setSelectedMissionLog(null);
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

    function goToLeaderboardMissions(): void {
        if (!externalActivityId) return;
        navigate(`/student/activities/${externalActivityId}/leaderboard/missions`);
    }

    function openMissionLogDetail(log: DetailMissionLog): void {
        setIsLogFilterOpen(false);
        setSelectedMissionLog(log);
    }

    function closeMissionLogDetail(): void {
        setSelectedMissionLog(null);
    }

    function handleMissionLogDetailButtonClick(log: DetailMissionLog): void {
        setSelectedMissionLog(null);
        if (log.status === "rejected") goToLeaderboardMissions();
    }

    function handleBackClick(): void {
        if (detailTarget) {
            setSelectedMissionLog(null);
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
                <button type="button" className={isAllMissionLogCategorySelected() ? "eca-student-mobile-leaderboard-filter-button" : "eca-student-mobile-leaderboard-filter-button active"} aria-label={t(`${LEADERBOARD_T}.filter.label`)} onClick={() => setIsLogFilterOpen(true)}>
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
                        {t(`${LEADERBOARD_T}.filter.all`)}
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
                                {getCategoryLabel(option.value, t)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderMissionLogDetailModal(): React.ReactElement | null {
        if (!selectedMissionLog) return null;

        const statusClassName = getMissionLogDetailClassName(selectedMissionLog.status);
        const isRejected = selectedMissionLog.status === "rejected";
        const displayDate = formatMissionLogDetailDate(selectedMissionLog.reviewedAt ?? selectedMissionLog.submittedAt);
        const actionLabel = isRejected ? t(`${LEADERBOARD_T}.detail.retry`, { defaultValue: "Retry" }) : t(`${LEADERBOARD_T}.detail.ok`, { defaultValue: "OK" });

        return (
            <div className={`eca-student-mobile-leaderboard-log-detail-modal eca-student-mobile-leaderboard-log-detail-modal--${statusClassName}`} role="dialog" aria-modal="true" aria-label={t(`${LEADERBOARD_T}.detail.title`, { defaultValue: "Mission request detail" })}>
                <button type="button" className="eca-student-mobile-leaderboard-log-detail-back-button" onClick={closeMissionLogDetail} aria-label={t(`${LEADERBOARD_T}.aria.back`)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <section className="eca-student-mobile-leaderboard-log-detail-card">
                    <div className="eca-student-mobile-leaderboard-log-detail-card-top">
                        <span className="eca-student-mobile-leaderboard-log-detail-icon">{renderMissionLogDetailIcon(selectedMissionLog.status)}</span>
                        <div className="eca-student-mobile-leaderboard-log-detail-text">
                            <h2>{selectedMissionLog.missionName}</h2>
                            <p>{displayDate}</p>
                        </div>
                        <span className="eca-student-mobile-leaderboard-log-detail-point">+{formatNumber(selectedMissionLog.score)}</span>
                    </div>
                    <div className="eca-student-mobile-leaderboard-log-detail-status">{getMissionLogDetailStatusLabel(selectedMissionLog.status, t)}</div>
                </section>

                <button type="button" className="eca-student-mobile-leaderboard-log-detail-action-button" onClick={() => handleMissionLogDetailButtonClick(selectedMissionLog)}>
                    {actionLabel}
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <main className="eca-student-mobile-leaderboard-page">
                <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />
                <div className="eca-student-mobile-leaderboard-main">
                    <div className="eca-student-mobile-leaderboard-state">{t(`${LEADERBOARD_T}.loading`)}</div>
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
                    <button type="button" className="eca-student-mobile-leaderboard-back-button" onClick={handleBackClick} aria-label={t(`${LEADERBOARD_T}.aria.back`)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <section className="eca-student-mobile-leaderboard-my-point-card">
                        <h1>{isMyDetail ? "My points" : detailTarget.name}</h1>
                        <strong>{formatNumber(detailTarget.totalScore)}</strong>
                        <span>{formatPlaceLabel(detailTarget.rank, t)}</span>
                    </section>

                    <section className="eca-student-mobile-leaderboard-log-section">
                        <div className="eca-student-mobile-leaderboard-log-title-row">
                            <h2>{t(`${LEADERBOARD_T}.missionLog`)}</h2>
                            {renderMissionLogFilter()}
                        </div>

                        <div className="eca-student-mobile-leaderboard-log-list">
                            {isLogLoading ? (
                                <div className="eca-student-mobile-leaderboard-state small">{t(`${LEADERBOARD_T}.loading`)}</div>
                            ) : filteredDetailLogs.length ? (
                                filteredDetailLogs.map((log) => <MissionLogRow key={`${log.submissionId}-${log.missionId}`} log={log} onClick={() => openMissionLogDetail(log)} />)
                            ) : (
                                <div className="eca-student-mobile-leaderboard-empty">{t(`${LEADERBOARD_T}.missionLogEmpty`)}</div>
                            )}
                        </div>
                    </section>

                    {isMyDetail ? (
                        <button type="button" className="eca-student-mobile-leaderboard-get-point-button" onClick={goToLeaderboardMissions}>
                            {t(`${LEADERBOARD_T}.getPoint`)}
                        </button>
                    ) : null}
                </div>
                {renderMissionLogFilterModal()}
                {renderMissionLogDetailModal()}
            </main>
        );
    }

    return (
        <main className="eca-student-mobile-leaderboard-page">
            <Header onMenuClick={openMenu} onProfileClick={openMyPage} userProfileImg={userProfileImg} />

            <div className="eca-student-mobile-leaderboard-main">
                <section className="eca-student-mobile-leaderboard-title">
                    <h1>{activity?.name ?? t(`${LEADERBOARD_T}.activityFallback`)}</h1>
                </section>

                <section className="eca-student-mobile-leaderboard-tab-section">
                    <button type="button" className="eca-student-mobile-leaderboard-tab-button">{t(`${LEADERBOARD_T}.ranking`)}</button>
                </section>

                <section className="eca-student-mobile-leaderboard-ranking-list">
                    {rankings.length ? rankings.map((ranking) => <RankingRow key={ranking.studentId} ranking={ranking} onClick={() => openRankingDetail(ranking)} />) : <div className="eca-student-mobile-leaderboard-empty">{t(`${LEADERBOARD_T}.rankingEmpty`)}</div>}
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