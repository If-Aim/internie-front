import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getMyLeaderboardMissionLogs, getMyLeaderboardMissions, submitLeaderboardMission } from "../../../../../../api/ea";
import type { LeaderboardMissionCategory, LeaderboardMissionResponse, StudentLeaderboardLogResponse } from "../../../../../../api/ea";
import "./ecaStudentMobileLeaderboard.css";

type RouteParams = {
    externalActivityId?: string;
    activityId?: string;
    ecaId?: string;
};

type HeaderProps = {
    title: string;
    onBackClick: () => void;
};

function Header({ title, onBackClick }: HeaderProps): React.ReactElement {
    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label="Back" onClick={onBackClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            <div className="app-title">{title}</div>

            <div style={{ display: "block", width: 36, height: 36 }} aria-hidden="true" />
        </div>
    );
}

type MissionStep = "select" | "submit" | "complete";
type MissionFilter = "ALL" | "AVAILABLE" | "MAXED_OUT";

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function getCategoryLabel(value?: LeaderboardMissionCategory | null): string {
    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return option?.label ?? "Category";
}

function getEvidenceTypeLabel(value: LeaderboardMissionResponse["evidenceType"]): string {
    if (value === "IMAGE") return "Photo";
    if (value === "DOCUMENT") return "Document";
    if (value === "VIDEO") return "Video";
    if (value === "LINK") return "Link";

    return "Other";
}

function getAcceptByEvidenceType(value: LeaderboardMissionResponse["evidenceType"]): string | undefined {
    if (value === "IMAGE") return "image/*";
    if (value === "VIDEO") return "video/*";
    if (value === "DOCUMENT") return ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

    return undefined;
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

function buildMissionUsedCount(logs: StudentLeaderboardLogResponse[]): Map<number, number> {
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

export default function EcaStudentMobileLeaderboardMission(): React.ReactElement {
    const navigate = useNavigate();
    const params = useParams<RouteParams>();
    const externalActivityId = params.externalActivityId ?? params.activityId ?? params.ecaId;
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [step, setStep] = React.useState<MissionStep>("select");
    const [filter, setFilter] = React.useState<MissionFilter>("ALL");
    const [missions, setMissions] = React.useState<LeaderboardMissionResponse[]>([]);
    const [logs, setLogs] = React.useState<StudentLeaderboardLogResponse[]>([]);
    const [selectedMission, setSelectedMission] = React.useState<LeaderboardMissionResponse | null>(null);
    const [evidenceFile, setEvidenceFile] = React.useState<File | null>(null);
    const [evidenceUrl, setEvidenceUrl] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");

    const usedCountMap = React.useMemo(() => buildMissionUsedCount(logs), [logs]);

    const missionItems = React.useMemo(() => {
        return missions.map((mission) => ({
            mission,
            maxedOut: isMissionMaxedOut(mission, usedCountMap),
        }));
    }, [missions, usedCountMap]);

    const filteredMissionItems = React.useMemo(() => {
        if (filter === "AVAILABLE") return missionItems.filter((item) => !item.maxedOut);
        if (filter === "MAXED_OUT") return missionItems.filter((item) => item.maxedOut);

        return missionItems;
    }, [missionItems, filter]);

    const availableCount = missionItems.filter((item) => !item.maxedOut).length;
    const maxedOutCount = missionItems.filter((item) => item.maxedOut).length;

    React.useEffect(() => {
        let mounted = true;

        async function loadMissions(): Promise<void> {
            if (!externalActivityId) {
                setErrorMessage("대외활동 정보를 찾을 수 없습니다.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setErrorMessage("");

                const [missionResponse, logResponse] = await Promise.all([
                    getMyLeaderboardMissions(externalActivityId),
                    getMyLeaderboardMissionLogs(externalActivityId, { page: 0, size: 1000 }),
                ]);

                if (!mounted) return;

                setMissions(missionResponse.missions);
                setLogs(logResponse.logs);
            } catch (error) {
                if (!mounted) return;

                setErrorMessage(error instanceof Error ? error.message : "미션 목록을 불러오지 못했습니다.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadMissions();

        return () => {
            mounted = false;
        };
    }, [externalActivityId]);

    function handleBackClick(): void {
        if (step === "complete") {
            navigate(`/student/activities/${externalActivityId}/leaderboard`);
            return;
        }

        if (step === "submit") {
            setStep("select");
            return;
        }

        navigate(-1);
    }

    function handleNextClick(): void {
        if (!selectedMission) return;

        setEvidenceFile(null);
        setEvidenceUrl("");
        setStep("submit");
    }

    async function handleSubmit(): Promise<void> {
        if (!externalActivityId || !selectedMission || submitting) return;

        const acceptsLink = selectedMission.evidenceType === "LINK";
        const acceptsFile = selectedMission.evidenceType !== "LINK";
        const trimmedEvidenceUrl = evidenceUrl.trim();

        if (acceptsFile && !evidenceFile) {
            alert("파일을 제출해주세요.");
            return;
        }

        if (acceptsLink && !trimmedEvidenceUrl) {
            alert("링크를 입력해주세요.");
            return;
        }

        if (acceptsLink && !isValidHttpUrl(trimmedEvidenceUrl)) {
            alert("http 또는 https로 시작하는 링크를 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);

            await submitLeaderboardMission(externalActivityId, selectedMission.missionId, {
                file: acceptsFile ? evidenceFile : null,
                evidenceUrl: acceptsLink ? trimmedEvidenceUrl : null,
            });

            setStep("complete");
        } catch {
            alert("미션 제출에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    function renderProgress(): React.ReactElement {
        const currentStep = step === "select" ? 1 : 2;

        return (
            <div className="eca-student-mobile-leaderboard-mission-progress">
                {[1, 2].map((item) => (
                    <span key={item} className={item <= currentStep ? "active" : ""} />
                ))}
            </div>
        );
    }

    function renderSelectStep(): React.ReactElement {
        return (
            <>
                <section className="eca-student-mobile-leaderboard-mission-select-header">
                    <h1>Select a Mission</h1>
                </section>

                <div className="eca-student-mobile-leaderboard-mission-filter-tabs">
                    <button type="button" className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All ({missionItems.length})</button>
                    <button type="button" className={filter === "AVAILABLE" ? "active" : ""} onClick={() => setFilter("AVAILABLE")}>Available ({availableCount})</button>
                    <button type="button" className={filter === "MAXED_OUT" ? "active" : ""} onClick={() => setFilter("MAXED_OUT")}>Maxed Out ({maxedOutCount})</button>
                </div>

                <section className="eca-student-mobile-leaderboard-mission-list">
                    {filteredMissionItems.map(({ mission, maxedOut }) => {
                        const selected = selectedMission?.missionId === mission.missionId;

                        return (
                            <button
                                type="button"
                                className={selected ? "eca-student-mobile-leaderboard-mission-card selected" : "eca-student-mobile-leaderboard-mission-card"}
                                key={mission.missionId}
                                disabled={maxedOut}
                                onClick={() => setSelectedMission(mission)}
                            >
                                <span className="eca-student-mobile-leaderboard-mission-radio" />
                                <span className="eca-student-mobile-leaderboard-mission-info">
                                    <strong>{mission.name}</strong>
                                    <em>{getCategoryLabel(mission.category)}</em>
                                </span>
                                <span className={maxedOut ? "eca-student-mobile-leaderboard-mission-point disabled" : "eca-student-mobile-leaderboard-mission-point"}>+{formatNumber(mission.points)}</span>
                            </button>
                        );
                    })}
                </section>

                <button type="button" className="eca-student-mobile-leaderboard-mission-next-button" disabled={!selectedMission} onClick={handleNextClick}>
                    Next
                </button>
            </>
        );
    }
    
    function renderSubmitStep(): React.ReactElement | null {
        if (!selectedMission) return null;

        const acceptsLink = selectedMission.evidenceType === "LINK";
        const acceptsFile = selectedMission.evidenceType !== "LINK";
        const trimmedEvidenceUrl = evidenceUrl.trim();
        const hasInvalidLink = acceptsLink && trimmedEvidenceUrl.length > 0 && !isValidHttpUrl(trimmedEvidenceUrl);
        const submitDisabled = submitting || (acceptsFile && !evidenceFile) || (acceptsLink && (!trimmedEvidenceUrl || hasInvalidLink));

        return (
            <>
                <section className="eca-student-mobile-leaderboard-mission-upload-title">
                    <h1>Upload Evidence</h1>
                </section>

                <section className="eca-student-mobile-leaderboard-mission-submit-card">
                    <h2>Mission Information</h2>

                    <div className="eca-student-mobile-leaderboard-mission-info-field">
                        <span>Mission Name</span>
                        <input value={selectedMission.name} readOnly />
                    </div>

                    <div className="eca-student-mobile-leaderboard-mission-info-field">
                        <span>Evidence</span>
                        <input value={selectedMission.evidenceName || "-"} readOnly />
                    </div>

                    <div className="eca-student-mobile-leaderboard-mission-info-grid">
                        <label>
                            <span>Submission Format</span>
                            <input value={getEvidenceTypeLabel(selectedMission.evidenceType)} readOnly />
                        </label>
                    </div>
                </section>

                <section className="eca-student-mobile-leaderboard-mission-submit-card">
                    <h2>Submission</h2>

                    {acceptsFile ? (
                        <>
                            <label className="eca-student-mobile-leaderboard-mission-file-label">File</label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={getAcceptByEvidenceType(selectedMission.evidenceType)}
                                hidden
                                onChange={(event) => {
                                    setEvidenceFile(event.target.files?.[0] ?? null);
                                }}
                            />

                            <button type="button" className="eca-student-mobile-leaderboard-mission-upload-box" onClick={() => fileInputRef.current?.click()}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z" fill="#808080"/>
                                    <path d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z" fill="#808080"/>
                                </svg>
                                <span>{evidenceFile ? evidenceFile.name : "파일을 업로드해주세요"}</span>
                            </button>
                        </>
                    ) : null}

                    {acceptsLink ? (
                        <div className="eca-student-mobile-leaderboard-mission-link-area">
                            <label className="eca-student-mobile-leaderboard-mission-link-label">Link</label>
                            <input className={hasInvalidLink ? "eca-student-mobile-leaderboard-mission-link-input is-invalid" : "eca-student-mobile-leaderboard-mission-link-input"} value={evidenceUrl} placeholder="링크를 붙여주세요" onChange={(event) => setEvidenceUrl(event.target.value)} />
                            {hasInvalidLink ? <small>http 또는 https로 시작하는 링크를 입력해주세요.</small> : null}
                        </div>
                    ) : null}
                </section>

                <div className="eca-student-mobile-leaderboard-mission-submit-button-row">
                    <button type="button" disabled={submitDisabled} onClick={handleSubmit}>
                        {submitting ? "저장 중" : "제출하기"}
                    </button>
                </div>
            </>
        );
    }

    function renderCompleteStep(): React.ReactElement {
        return (
            <section className="eca-student-mobile-leaderboard-mission-complete">
                <div className="eca-student-mobile-leaderboard-mission-complete-icon">✓</div>
                <h1>Completed!</h1>
                <p>Scores will be updated after admin approval</p>
                <button type="button" onClick={() => navigate(`/student/activities/${externalActivityId}/leaderboard`)}>
                    Save
                </button>
            </section>
        );
    }

    if (loading) {
        return (
            <main className="eca-student-mobile-leaderboard-mission-page">
                <div className="eca-student-mobile-leaderboard-state">Loading...</div>
            </main>
        );
    }

    if (errorMessage) {
        return (
            <main className="eca-student-mobile-leaderboard-mission-page">
                <div className="eca-student-mobile-leaderboard-state">{errorMessage}</div>
            </main>
        );
    }

    return (
        <main className="eca-student-mobile-leaderboard-mission-page">
            <Header title="Get Point" onBackClick={handleBackClick} />

            <div className="eca-student-mobile-leaderboard-mission-main">
                {renderProgress()}

                {step === "select" ? renderSelectStep() : null}
                {step === "submit" ? renderSubmitStep() : null}
                {step === "complete" ? renderCompleteStep() : null}
            </div>
        </main>
    );
}