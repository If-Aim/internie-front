import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import { LEADERBOARD_MISSION_CATEGORY_OPTIONS, getMyLeaderboardMissionLogs, getMyLeaderboardMissions, submitLeaderboardMission } from "../../../../../../api/ea";
import type { LeaderboardEvidenceType, LeaderboardMissionCategory, LeaderboardMissionResponse, StudentLeaderboardLogResponse } from "../../../../../../api/ea";
import { getFileExtension, getFileKey, isValidHttpUrl } from "../../../../../../utils/file";
import { getFileIconByExtension } from "../../../../desktop/eca/dashboard/assignment/fileIcons";
import "./ecaStudentMobileLeaderboard.css";

const LEADERBOARD_MISSION_T = "ecaStudent.leaderboardMissionPage";
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
    const { t } = useTranslation();
    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label={t(`${LEADERBOARD_MISSION_T}.aria.back`)} onClick={onBackClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            <div className="app-title">{title}</div>

            <div style={{ display: "block", width: 24, height: 24 }} aria-hidden="true" />
        </div>
    );
}

type MissionStep = "select" | "submit" | "complete";
type MissionFilter = "ALL" | "AVAILABLE" | "MAXED_OUT";
type MissionCategoryFilter = LeaderboardMissionCategory;

function formatNumber(value?: number | null): string {
    return Number(value ?? 0).toLocaleString("en-US");
}

function getCategoryLabel(value: LeaderboardMissionCategory | null | undefined, t: TFunction): string {
    if (!value) return t(`${LEADERBOARD_MISSION_T}.categoryFallback`);

    const option = LEADERBOARD_MISSION_CATEGORY_OPTIONS.find((item) => item.value === value);

    return t(`${LEADERBOARD_MISSION_T}.category.${value}`, {
        defaultValue: option?.label ?? t(`${LEADERBOARD_MISSION_T}.categoryFallback`),
    });
}

function getMissionEvidenceTypes(mission: Pick<LeaderboardMissionResponse, "evidenceTypes" | "evidenceType">): LeaderboardEvidenceType[] {
    if (mission.evidenceTypes?.length) return mission.evidenceTypes;

    return mission.evidenceType ? [mission.evidenceType] : [];
}

function getEvidenceTypesLabel(types: LeaderboardEvidenceType[], t: TFunction): string {
    if (types.length === 0) return "-";

    return types.map((type) => t(`${LEADERBOARD_MISSION_T}.evidenceType.${type}`, { defaultValue: type })).join(" + ");
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const params = useParams<RouteParams>();
    const externalActivityId = params.externalActivityId ?? params.activityId ?? params.ecaId;
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [step, setStep] = React.useState<MissionStep>("select");
    const [filter, setFilter] = React.useState<MissionFilter>("ALL");
    const [selectedMissionCategories, setSelectedMissionCategories] = React.useState<MissionCategoryFilter[]>(
        () => LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value)
    );
    const [isMissionCategoryFilterOpen, setIsMissionCategoryFilterOpen] = React.useState(false);

    const [missions, setMissions] = React.useState<LeaderboardMissionResponse[]>([]);
    const [logs, setLogs] = React.useState<StudentLeaderboardLogResponse[]>([]);
    const [selectedMission, setSelectedMission] = React.useState<LeaderboardMissionResponse | null>(null);
    const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);
    const [evidenceUrlText, setEvidenceUrlText] = React.useState("");
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
        let nextItems = missionItems;

        if (filter === "AVAILABLE") {
            nextItems = nextItems.filter((item) => !item.maxedOut);
        }

        if (filter === "MAXED_OUT") {
            nextItems = nextItems.filter((item) => item.maxedOut);
        }

        if (selectedMissionCategories.length > 0) {
            nextItems = nextItems.filter((item) => selectedMissionCategories.includes(item.mission.category));
        } else {
            nextItems = [];
        }

        return nextItems;
    }, [missionItems, filter, selectedMissionCategories]);

    const availableCount = missionItems.filter((item) => !item.maxedOut).length;
    const maxedOutCount = missionItems.filter((item) => item.maxedOut).length;

    React.useEffect(() => {
        let mounted = true;

        async function loadMissions(): Promise<void> {
            if (!externalActivityId) {
                setErrorMessage(t(`${LEADERBOARD_MISSION_T}.error.activityNotFound`));
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

                setErrorMessage(error instanceof Error ? error.message : t(`${LEADERBOARD_MISSION_T}.error.missionLoadFailed`));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadMissions();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

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

        setEvidenceFiles([]);
        setEvidenceUrlText("");
        setStep("submit");
    }

    function removeEvidenceFile(fileKey: string): void {
        setEvidenceFiles((prev) => prev.filter((file) => getFileKey(file) !== fileKey));
    }

    async function handleSubmit(): Promise<void> {
        if (!externalActivityId || !selectedMission || submitting) return;

        const acceptsLink = missionAcceptsLink(selectedMission);
        const acceptsFile = missionAcceptsFile(selectedMission);
        const evidenceUrls = evidenceUrlText
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);

        if (acceptsFile && evidenceFiles.length === 0) {
            alert(t(`${LEADERBOARD_MISSION_T}.alert.fileRequired`));
            return;
        }

        if (acceptsLink && evidenceUrls.length === 0) {
            alert(t(`${LEADERBOARD_MISSION_T}.alert.linkRequired`));
            return;
        }

        if (acceptsLink && evidenceUrls.some((url) => !isValidHttpUrl(url))) {
            alert(t(`${LEADERBOARD_MISSION_T}.alert.invalidLink`));
            return;
        }

        try {
            setSubmitting(true);

            await submitLeaderboardMission(externalActivityId, selectedMission.missionId, {
                files: acceptsFile ? evidenceFiles : null,
                evidenceUrls: acceptsLink ? evidenceUrls : null,
            });

            setStep("complete");
        } catch {
            alert(t(`${LEADERBOARD_MISSION_T}.alert.submitFailed`));
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

    function toggleMissionCategoryFilter(category: MissionCategoryFilter): void {
        setSelectedMissionCategories((prev) =>
            prev.includes(category)
                ? prev.filter((item) => item !== category)
                : [...prev, category]
        );
    }

    function selectAllMissionCategories(): void {
        setSelectedMissionCategories(LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => option.value));
    }

    function isAllMissionCategorySelected(): boolean {
        return selectedMissionCategories.length === LEADERBOARD_MISSION_CATEGORY_OPTIONS.length;
    }

    function renderMissionCategoryFilter(): React.ReactElement {
        return (
            <div className="eca-student-mobile-leaderboard-mission-category-filter-wrap">
                <button type="button" className={isAllMissionCategorySelected() ? "eca-student-mobile-leaderboard-filter-button" : "eca-student-mobile-leaderboard-filter-button active"} aria-label={t(`${LEADERBOARD_MISSION_T}.filter.label`)} onClick={() => setIsMissionCategoryFilterOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {!isAllMissionCategorySelected() ? <circle cx="20" cy="6" r="3" fill="#0166FF" /> : null}
                    </svg>
                </button>
            </div>
        );
    }
        
    function renderMissionCategoryFilterModal(): React.ReactElement | null {
        if (!isMissionCategoryFilterOpen) return null;

        return (
            <div className="eca-student-mobile-leaderboard-mission-category-filter-modal-backdrop" onClick={() => setIsMissionCategoryFilterOpen(false)}>
                <div className="eca-student-mobile-leaderboard-mission-category-filter-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={isAllMissionCategorySelected() ? "eca-student-mobile-leaderboard-mission-category-filter-modal-option is-selected" : "eca-student-mobile-leaderboard-mission-category-filter-modal-option"} onClick={selectAllMissionCategories} aria-pressed={isAllMissionCategorySelected()}>
                        {t(`${LEADERBOARD_MISSION_T}.filter.all`)}
                    </button>

                    {LEADERBOARD_MISSION_CATEGORY_OPTIONS.map((option) => {
                        const selected = selectedMissionCategories.includes(option.value);

                        return (
                            <button
                                type="button"
                                className={selected ? "eca-student-mobile-leaderboard-mission-category-filter-modal-option is-selected" : "eca-student-mobile-leaderboard-mission-category-filter-modal-option"}
                                key={option.value}
                                onClick={() => toggleMissionCategoryFilter(option.value)}
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

    function renderSelectStep(): React.ReactElement {
        return (
            <>
                <section className="eca-student-mobile-leaderboard-mission-select-header">
                    <h1>{t(`${LEADERBOARD_MISSION_T}.selectMission`)}</h1>
                    {renderMissionCategoryFilter()}
                </section>

                <div className="eca-student-mobile-leaderboard-mission-filter-tabs">
                    <button type="button" className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>
                        {t(`${LEADERBOARD_MISSION_T}.missionFilter.all`, { missionCount: missionItems.length })}
                    </button>
                    <button type="button" className={filter === "AVAILABLE" ? "active" : ""} onClick={() => setFilter("AVAILABLE")}>
                        {t(`${LEADERBOARD_MISSION_T}.missionFilter.available`, { missionCount: availableCount })}
                    </button>
                    <button type="button" className={filter === "MAXED_OUT" ? "active" : ""} onClick={() => setFilter("MAXED_OUT")}>
                        {t(`${LEADERBOARD_MISSION_T}.missionFilter.maxedOut`, { missionCount: maxedOutCount })}
                    </button>
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
                                    <em>{getCategoryLabel(mission.category, t)}</em>
                                </span>
                                <span className={maxedOut ? "eca-student-mobile-leaderboard-mission-point disabled" : "eca-student-mobile-leaderboard-mission-point"}>+{formatNumber(mission.points)}</span>
                            </button>
                        );
                    })}
                </section>

                <button type="button" className="eca-student-mobile-leaderboard-mission-next-button" disabled={!selectedMission} onClick={handleNextClick}>
                    {t(`${LEADERBOARD_MISSION_T}.next`)}
                </button>
            </>
        );
    }
    
    function renderSubmitStep(): React.ReactElement | null {
        if (!selectedMission) return null;

        const evidenceTypes = getMissionEvidenceTypes(selectedMission);
        const acceptsLink = evidenceTypes.includes("LINK");
        const acceptsFile = evidenceTypes.some((type) => type !== "LINK");
        const evidenceUrls = evidenceUrlText
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);
        const hasInvalidLink = acceptsLink && evidenceUrls.length > 0 && evidenceUrls.some((url) => !isValidHttpUrl(url));
        const submitDisabled = submitting || (acceptsFile && evidenceFiles.length === 0) || (acceptsLink && (evidenceUrls.length === 0 || hasInvalidLink));

        return (
            <>
                <section className="eca-student-mobile-leaderboard-mission-upload-title">
                    <h1>{t(`${LEADERBOARD_MISSION_T}.uploadEvidence`)}</h1>
                </section>

                <div className="eca-student-mobile-leaderboard-mission-submit-section">
                    <section className="eca-student-mobile-leaderboard-mission-submit-card">
                        <h2>{selectedMission.name}</h2>
                        <div className="eca-student-mobile-leaderboard-mission-info-field">
                            <span>{t(`${LEADERBOARD_MISSION_T}.evidence`)}</span>
                            <input value={selectedMission.evidenceName || "-"} readOnly />
                        </div>

                        <div className="eca-student-mobile-leaderboard-mission-info-grid">
                            <label>
                                <span>{t(`${LEADERBOARD_MISSION_T}.submissionFormat`)}</span>
                                <input value={getEvidenceTypesLabel(evidenceTypes, t)} readOnly />
                            </label>
                        </div>
                    </section>

                    <section className="eca-student-mobile-leaderboard-mission-submit-card">
                        <h2>{t(`${LEADERBOARD_MISSION_T}.submission`)}</h2>

                        {acceptsFile ? (
                            <>
                                <label className="eca-student-mobile-leaderboard-mission-file-label">File</label>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={getAcceptByEvidenceTypes(evidenceTypes)}
                                    multiple
                                    hidden
                                    onChange={(event) => {
                                        setEvidenceFiles(Array.from(event.target.files ?? []));
                                    }}
                                />

                                <button type="button" className="eca-student-mobile-leaderboard-mission-upload-box" onClick={() => fileInputRef.current?.click()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M16 2.666C14.457 2.666 12.947 3.112 11.651 3.951C10.356 4.79 9.33 5.985 8.699 7.393C8.609 7.595 8.517 7.796 8.423 7.996H8C6.586 7.996 5.229 8.558 4.229 9.558C3.229 10.558 2.667 11.915 2.667 13.329C2.667 14.744 3.229 16.1 4.229 17.1C5.229 18.101 6.586 18.663 8 18.663H8.23L10.896 15.996H8C7.293 15.996 6.615 15.715 6.115 15.215C5.615 14.715 5.334 14.037 5.334 13.329C5.334 12.622 5.615 11.944 6.115 11.444C6.615 10.944 7.293 10.663 8 10.663H8.086C8.363 10.663 8.686 10.664 8.952 10.61C9.284 10.553 9.602 10.431 9.886 10.25C10.207 10.042 10.428 9.783 10.596 9.547C10.699 9.395 10.789 9.234 10.864 9.067C10.935 8.919 11.023 8.728 11.126 8.496C11.546 7.556 12.23 6.758 13.094 6.198C13.958 5.638 14.966 5.34 15.996 5.34C17.026 5.34 18.034 5.638 18.898 6.198C19.762 6.758 20.445 7.556 20.866 8.496C20.978 8.728 21.065 8.919 21.136 9.067C21.198 9.196 21.288 9.384 21.404 9.547C21.572 9.782 21.792 10.042 22.115 10.251C22.438 10.459 22.764 10.554 23.048 10.611C23.315 10.664 23.638 10.664 23.915 10.664H24C24.708 10.664 25.386 10.944 25.886 11.444C26.386 11.944 26.667 12.622 26.667 13.329C26.667 14.037 26.386 14.715 25.886 15.215C25.386 15.715 24.708 15.996 24 15.996H21.104L23.771 18.663H24C25.415 18.663 26.771 18.101 27.772 17.1C28.772 16.1 29.334 14.744 29.334 13.329C29.334 11.915 28.772 10.558 27.772 9.558C26.771 8.558 25.415 7.996 24 7.996H23.578C23.462 7.746 23.381 7.568 23.302 7.393C22.67 5.985 21.645 4.79 20.349 3.951C19.054 3.112 17.543 2.666 16 2.666Z" fill="#808080"/>
                                        <path d="M16 16L15.057 15.057L16 14.114L16.943 15.057L16 16ZM17.333 28C17.333 28.354 17.193 28.693 16.942 28.943C16.692 29.193 16.353 29.333 16 29.333C15.646 29.333 15.307 29.193 15.057 28.943C14.807 28.693 14.667 28.354 14.667 28H17.333ZM9.724 20.391L15.057 15.057L16.943 16.943L11.609 22.276L9.724 20.391ZM16.943 15.057L22.276 20.391L20.391 22.276L15.057 16.943L16.943 15.057ZM17.333 16V28H14.667V16H17.333Z" fill="#808080"/>
                                    </svg>
                                    <span>
                                        {evidenceFiles.length > 0
                                            ? t(`${LEADERBOARD_MISSION_T}.filesSelected`, { fileCount: evidenceFiles.length })
                                            : t(`${LEADERBOARD_MISSION_T}.fileUploadGuide`)}
                                    </span>
                                </button>
                                {evidenceFiles.length > 0 ? (
                                    <div className="eca-student-mobile-leaderboard-mission-file-list">
                                        {evidenceFiles.map((file) => {
                                            const fileKey = getFileKey(file);
                                            const extension = getFileExtension(file.name);

                                            return (
                                                <div className="eca-student-mobile-leaderboard-mission-file-item" key={fileKey}>
                                                    <div className="eca-student-mobile-leaderboard-mission-file-main">
                                                        <span className="eca-student-mobile-leaderboard-mission-file-icon">
                                                            {getFileIconByExtension(extension)}
                                                        </span>
                                                        <span className="eca-student-mobile-leaderboard-mission-file-name-wrap">
                                                            <strong>{file.name}</strong>
                                                        </span>
                                                    </div>

                                                    <button type="button" className="eca-student-mobile-leaderboard-mission-file-remove" onClick={() => removeEvidenceFile(fileKey)} aria-label={t(`${LEADERBOARD_MISSION_T}.aria.removeFile`)}>
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
                            <div className="eca-student-mobile-leaderboard-mission-link-area">
                                <label className="eca-student-mobile-leaderboard-mission-link-label">{t(`${LEADERBOARD_MISSION_T}.link`)}</label>
                                <textarea
                                    className={hasInvalidLink ? "eca-student-mobile-leaderboard-mission-link-input is-invalid" : "eca-student-mobile-leaderboard-mission-link-input"}
                                    value={evidenceUrlText}
                                    placeholder={t(`${LEADERBOARD_MISSION_T}.linkPlaceholder`)}
                                    onChange={(event) => setEvidenceUrlText(event.target.value)}
                                />
                                {hasInvalidLink ? <small>{t(`${LEADERBOARD_MISSION_T}.alert.invalidLink`)}</small> : null}
                            </div>
                        ) : null}
                        <div className="eca-student-mobile-leaderboard-mission-submit-button-row">
                            <button type="button" disabled={submitDisabled} onClick={handleSubmit}>
                                {submitting ? t(`${LEADERBOARD_MISSION_T}.saving`) : t(`${LEADERBOARD_MISSION_T}.submit`)}
                            </button>
                        </div>
                    </section>
                </div>
                
            </>
        );
    }

    function renderCompleteStep(): React.ReactElement {
        return (
            <section className="eca-student-mobile-leaderboard-mission-complete">
                <div className="eca-student-mobile-leaderboard-mission-complete-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                        <circle cx="25" cy="25" r="25" fill="#0166FF"/>
                        <path d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1>{t(`${LEADERBOARD_MISSION_T}.completed`)}</h1>
                
                <div className="eca-student-mobile-leaderboard-mission-complete-bottom">
                    <p>{t(`${LEADERBOARD_MISSION_T}.approvalNotice`)}</p>
                    <button type="button" onClick={() => navigate(`/student/activities/${externalActivityId}/leaderboard`)}>
                        {t(`${LEADERBOARD_MISSION_T}.save`)}
                    </button>
                </div>
            </section>
        );
    }

    if (loading) {
        return (
            <main className="eca-student-mobile-leaderboard-mission-page">
                <div className="eca-student-mobile-leaderboard-state">{t(`${LEADERBOARD_MISSION_T}.loading`)}</div>
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
            <Header title={t(`${LEADERBOARD_MISSION_T}.title`)} onBackClick={handleBackClick} />

            <div className="eca-student-mobile-leaderboard-mission-main">
                {renderProgress()}

                {step === "select" ? renderSelectStep() : null}
                {step === "submit" ? renderSubmitStep() : null}
                {step === "complete" ? renderCompleteStep() : null}
            </div>
            {renderMissionCategoryFilterModal()}
        </main>
    );
}
