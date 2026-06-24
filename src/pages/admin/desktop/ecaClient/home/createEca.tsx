import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createExternalActivity, downloadExternalActivityPlan, getExternalActivity, getExternalActivityManagers, updateExternalActivity, type ExternalActivityManager, type ExternalActivityParticipant, } from "../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../ecaHome";
import "./createEca.css"; 
import "././../ecaCalendar.css";

const DEFAULT_WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DEFAULT_MANAGER_PROFILE_IMAGE = "/internie_mascot_normal.png";
const ACTIVITY_CREATE_T = "ecaAdmin.activityCreatePage";

type SelectableParticipant = {
    userId: number;
    name: string;
    schoolName: string;
    email?: string | null;
    profileImage?: string | null;
};

function toApiDate(value: string): string {
    return value.replaceAll(".", "-");
}
function stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMonthGrid(cursor: Date): { month: number; days: Date[] } {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDate = new Date(year, month, 1);
    const firstDay = firstDate.getDay();
    const mondayIndex = firstDay === 0 ? 6 : firstDay - 1;
    const startDate = new Date(year, month, 1 - mondayIndex);
    const lastDate = new Date(year, month + 1, 0);
    const lastDay = lastDate.getDay();
    const sundayIndex = lastDay === 0 ? 0 : 7 - lastDay;
    const totalDays = mondayIndex + lastDate.getDate() + sundayIndex;
    const normalizedTotalDays = totalDays <= 35 ? 35 : 42;
    const days = Array.from({ length: normalizedTotalDays }, (_, index) => new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index));

    return { month, days };
}

function toSelectableParticipant(participant: ExternalActivityParticipant, fallbackName: string, fallbackSchoolName: string): SelectableParticipant | null {
    if (typeof participant.userId !== "number") return null;

    return {
        userId: participant.userId,
        name: participant.name ?? fallbackName,
        schoolName: participant.schoolName ?? fallbackSchoolName,
        email: participant.email ?? null,
        profileImage: participant.profileImage ?? null,
    };
}

function CalendarRange({
    mode,
    startDate,
    endDate,
    onChangeStart,
    onChangeEnd,
    onClose,
    resetKey,
    calendarLocale,
    prevMonthLabel,
    nextMonthLabel,
}: {
    mode: "range" | "startOnly" | "endOnly";
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onClose: () => void;
    resetKey: number;
    calendarLocale: string;
    prevMonthLabel: string;
    nextMonthLabel: string;
}): React.ReactElement {
    const s = stripTime(startDate);
    const e = stripTime(endDate);
    const sameDay = isSameDay(s, e);
    const [cursor, setCursor] = React.useState(() => new Date(s.getFullYear(), s.getMonth(), 1));
    const [focus, setFocus] = React.useState<"start" | "end">("start");

    React.useEffect(() => {
        setFocus("start");
    }, [resetKey]);

    React.useEffect(() => {
        setCursor(new Date(s.getFullYear(), s.getMonth(), 1));
    }, [s.getFullYear(), s.getMonth()]);

    React.useEffect(() => {
        if (mode === "range") setFocus("start");
        if (mode === "startOnly") setFocus("start");
        if (mode === "endOnly") setFocus("end");
    }, [mode]);

    const { month, days } = getMonthGrid(cursor);
    const isSixWeeks = days.length === 42;
    const title = new Intl.DateTimeFormat(calendarLocale, { month: "long", year: "numeric" }).format(cursor);

    const inRange = (d: Date): boolean => {
        const x = stripTime(d).getTime();
        return x >= s.getTime() && x <= e.getTime();
    };

    const handlePick = (picked: Date): void => {
        const pickedDate = stripTime(picked);

        if (mode === "startOnly") {
            onChangeStart(pickedDate);
            onClose();
            return;
        }

        if (mode === "endOnly") {
            if (pickedDate.getTime() < s.getTime()) {
                onChangeStart(pickedDate);
                onChangeEnd(pickedDate);
                onClose();
                return;
            }

            onChangeEnd(pickedDate);
            onClose();
            return;
        }

        if (focus === "start") {
            onChangeStart(pickedDate);
            onChangeEnd(pickedDate);
            setFocus("end");
            return;
        }

        if (pickedDate.getTime() < s.getTime()) {
            onChangeStart(pickedDate);
            onChangeEnd(s);
            setFocus("end");
            return;
        }

        onChangeEnd(pickedDate);
        setFocus("start");
    };

    return (
        <div className={"eca-cal" + (isSixWeeks ? " eca-cal--6w" : " eca-cal--5w")}>
            <div className="eca-cal-header">
                <div className="eca-cal-header-bottom">
                    <div className="eca-cal-title">{title}</div>
                    <div className="eca-cal-nav">
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label={prevMonthLabel}>
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label={nextMonthLabel}>
                            <img className="icon" src="/icons/Next (Stroke).svg" alt="" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="eca-cal-body">
                <div className="eca-cal-week">
                    {DEFAULT_WEEK_LABELS.map((w) => (
                        <div key={w} className="eca-cal-weekday">{w}</div>
                    ))}
                </div>

                <div className="eca-cal-grid">
                    {days.map((d) => {
                        const inMonth = d.getMonth() === month;
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

                        if (!inMonth) {
                            return <div key={key} className="eca-cal-cell eca-cal-cell--empty" aria-hidden="true" />;
                        }

                        const day = stripTime(d);
                        const isStart = isSameDay(day, s);
                        const isEnd = isSameDay(day, e);
                        const between = !sameDay && inRange(day);
                        const showRange = !sameDay && (between || isStart || isEnd);

                        return (
                            <div key={key} className={"eca-cal-cell" + (between ? " is-inrange" : "") + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "")}>
                                {showRange && <div className="eca-cal-range" aria-hidden="true" />}
                                <button type="button" className={"eca-cal-day" + ((sameDay && isSameDay(day, s)) ? " is-selected" : "") + (isStart || isEnd ? " is-selected" : "")} onClick={() => handlePick(day)}>
                                    {day.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function EcaActivityCreatePage(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const calendarLocale = i18n.language?.startsWith("ko") ? "ko-KR" : "en-US";

    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { organization, refreshManagedActivities } = useOutletContext<EcaClientAdminOutletContext>();

    const isEditMode = Boolean(externalActivityId);
    const [managers, setManagers] = React.useState<ExternalActivityManager[]>([]);
    const [selectedManagerIds, setSelectedManagerIds] = React.useState<number[]>([]);
    const [participantUserIds, setParticipantUserIds] = React.useState<number[]>([]);
    const [participants, setParticipants] = React.useState<SelectableParticipant[]>([]);
    const [participantModalOpen, setParticipantModalOpen] = React.useState(false);
    const [participantSearch, setParticipantSearch] = React.useState("");
    const [participantDropdownOpen, setParticipantDropdownOpen] = React.useState(false);
    const [participantInputFocused, setParticipantInputFocused] = React.useState(false);
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [existingPlanUrl, setExistingPlanUrl] = React.useState<string | null>(null);
    const [existingPlanOriginalFileName, setExistingPlanOriginalFileName] = React.useState<string | null>(null);
    const [existingPlanSizeBytes, setExistingPlanSizeBytes] = React.useState<number | null>(null);
    const [/*pageLoading*/, setPageLoading] = React.useState(false);

    const [managerModalOpen, setManagerModalOpen] = React.useState(false);
    const [managerSearch, setManagerSearch] = React.useState("");
    const [managerDropdownOpen, setManagerDropdownOpen] = React.useState(false);
    const [managerInputFocused, setManagerInputFocused] = React.useState(false);

    const [activityName, setActivityName] = React.useState("");
    const [startDate, setStartDate] = React.useState<string | null>(null);
    const [endDate, setEndDate] = React.useState<string | null>(null);
    const [datePickerTarget, setDatePickerTarget] = React.useState<"start" | "end" | null>(null);
    const calendarWrapRef = React.useRef<HTMLDivElement | null>(null);
    const managerSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [planFile, setPlanFile] = React.useState<File | null>(null);
    const planFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [submitError, setSubmitError] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        async function fetchInitData(): Promise<void> {
            if (!organization?.organizationId) return;

            setPageLoading(true);
            setSubmitError("");

            try {
                const [managerUsers, activityData] = await Promise.all([
                    getExternalActivityManagers(organization.organizationId),
                    isEditMode && externalActivityId
                        ? getExternalActivity(organization.organizationId, externalActivityId)
                        : Promise.resolve(null),
                ]);

                if (isEditMode && activityData?.manageableByMe === false) {
                    window.alert(t(`${ACTIVITY_CREATE_T}.noManagePermission`));
                    navigate(`/program-admin/activities/${externalActivityId}/dashboard`, { replace: true });
                    return;
                }

                const nextManagers = managerUsers
                    .filter((manager) => typeof manager.userId === "number");

                setManagers(nextManagers);

                if (!activityData) {
                    setParticipantUserIds([]);
                    return;
                }

                const nextParticipants = (activityData.participants ?? [])
                    .map((participant) => toSelectableParticipant(participant, t(`${ACTIVITY_CREATE_T}.noName`), t(`${ACTIVITY_CREATE_T}.emptyValue`)))
                    .filter((participant): participant is SelectableParticipant => participant !== null);

                const nextSelectedParticipantIds = nextParticipants
                    .map((participant) => participant.userId);

                const nextSelectedManagerIds = (activityData.managers ?? [])
                    .map((manager) => manager.userId)
                    .filter((userId): userId is number => typeof userId === "number");

                setParticipants(nextParticipants);
                setActivityName(activityData.name ?? "");
                setStartDate(activityData.startDate.replaceAll("-", "."));
                setEndDate(activityData.endDate.replaceAll("-", "."));
                setParticipantUserIds(nextSelectedParticipantIds);
                setSelectedManagerIds(nextSelectedManagerIds);
                setExistingPlanUrl(activityData.activityPlanUrl ?? null);
                setExistingPlanOriginalFileName(activityData.activityPlanOriginalFileName ?? null);
                setExistingPlanSizeBytes(activityData.activityPlanSizeBytes ?? null);
            } catch (e) {
                console.error(e);
                setSubmitError(isEditMode ? t(`${ACTIVITY_CREATE_T}.activityLoadFailed`) : t(`${ACTIVITY_CREATE_T}.initLoadFailed`));
            } finally {
                setPageLoading(false);
            }
        }

        void fetchInitData();
    }, [organization?.organizationId, externalActivityId, isEditMode, navigate]);

    React.useEffect(() => {
        if (!datePickerTarget) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!calendarWrapRef.current) return;
            if (calendarWrapRef.current.contains(e.target as Node)) return;
            setDatePickerTarget(null);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [datePickerTarget]);


    function toggleManager(id: number): void {
        setSelectedManagerIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
        setManagerSearch("");
    }

    function clearManagers(): void {
        setSelectedManagerIds([]);
        setManagerSearch("");
    }

    function selectAllManagers(): void {
        setSelectedManagerIds(managers.map((manager) => manager.userId));
        setManagerSearch("");
    }

    function getSelectedManagerText(): string {
        if (selectedManagerIds.length === 0) return t(`${ACTIVITY_CREATE_T}.selectAdmin`);

        const selectedManagers = managers.filter((manager) => selectedManagerIds.includes(manager.userId));

        if (selectedManagers.length === 0) return t(`${ACTIVITY_CREATE_T}.selectAdmin`);
        if (selectedManagers.length === 1) return selectedManagers[0].name;

        return `${selectedManagers[0].name} ${t(`${ACTIVITY_CREATE_T}.andMorePerson`, { count: selectedManagers.length - 1 })}`;
    }

    function getSelectedManagerInputValue(): string {
        const selectedManagers = managers.filter((manager) => selectedManagerIds.includes(manager.userId));

        return selectedManagers.map((manager) => `@ ${manager.name}`).join(", ");
    }

    function toggleParticipant(id: number): void {
        setParticipantUserIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );

        setParticipantSearch("");
    }

    function clearParticipants(): void {
        setParticipantUserIds([]);
        setParticipantSearch("");
    }

    function selectAllParticipants(): void {
        setParticipantUserIds(participants.map((participant) => participant.userId));
        setParticipantSearch("");
    }

    function getSelectedParticipantText(): string {
        if (participantUserIds.length === 0) return t(`${ACTIVITY_CREATE_T}.selectParticipant`);

        const selectedParticipants = participants.filter((participant) => participantUserIds.includes(participant.userId));

        if (selectedParticipants.length === 0) return t(`${ACTIVITY_CREATE_T}.selectParticipant`);
        if (selectedParticipants.length === 1) return selectedParticipants[0].name;

        return `${selectedParticipants[0].name} ${t(`${ACTIVITY_CREATE_T}.andMorePerson`, { count: selectedParticipants.length - 1 })}`;
    }

    function getSelectedParticipantInputValue(): string {
        const selectedParticipants = participants.filter((participant) =>
            participantUserIds.includes(participant.userId)
        );

        return selectedParticipants.map((participant) => `@ ${participant.name}`).join(", ");
    }

    function closeParticipantModal(): void {
        setParticipantSearch("");
        setParticipantDropdownOpen(false);
        setParticipantModalOpen(false);
    }

    function handleParticipantModalMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
        e.stopPropagation();

        if (!participantDropdownOpen) return;
        if (participantSearchWrapRef.current?.contains(e.target as Node)) return;

        setParticipantInputFocused(false);
        setParticipantDropdownOpen(false);
    }

    const filteredParticipants = participants.filter((participant) =>
        participant.name.toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
        participant.schoolName.toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
        (participant.email ?? "").toLowerCase().includes(participantSearch.trim().toLowerCase())
    );

    const filteredManagers = managers.filter((manager) =>
        manager.name.toLowerCase().includes(managerSearch.trim().toLowerCase())
    );

    function handlePlanFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0] ?? null;

        if (!file) {
            setPlanFile(null);
            return;
        }

        const allowedExtensions = [".pdf", ".doc", ".docx", ".hwp", ".hwpx", ".ppt", ".pptx"];
        const lowerName = file.name.toLowerCase();
        const isAllowedExtension = allowedExtensions.some((extension) => lowerName.endsWith(extension));
        const maxFileSize = 20 * 1024 * 1024;

        if (!isAllowedExtension) {
            window.alert(t(`${ACTIVITY_CREATE_T}.allowedPlanFileAlert`));
            e.target.value = "";
            setPlanFile(null);
            return;
        }

        if (file.size > maxFileSize) {
            window.alert(t(`${ACTIVITY_CREATE_T}.planFileSizeAlert`));
            e.target.value = "";
            setPlanFile(null);
            return;
        }

        setPlanFile(file);
    }

    async function handleDownloadExistingPlan(): Promise<void> {
        if (!organization?.organizationId || !externalActivityId || !existingPlanUrl) {
            return;
        }

        try {
            await downloadExternalActivityPlan(
                organization.organizationId,
                externalActivityId,
                existingPlanOriginalFileName
            );
        } catch (error) {
            console.error(error);
            window.alert(t(`${ACTIVITY_CREATE_T}.planDownloadFailed`));
        }
    }

    async function handleSubmit(): Promise<void> {
        if (!activityName.trim()) {
            setSubmitError(t(`${ACTIVITY_CREATE_T}.activityNameRequired`));
            return;
        }

        if (!startDate || !endDate) {
            setSubmitError(t(`${ACTIVITY_CREATE_T}.activityPeriodRequired`));
            return;
        }

        if (selectedManagerIds.length === 0) {
            setSubmitError(t(`${ACTIVITY_CREATE_T}.managerRequired`));
            return;
        }

        if (!organization?.organizationId) {
            setSubmitError(t(`${ACTIVITY_CREATE_T}.organizationLoadFailed`));
            return;
        }

        setSubmitting(true);
        setSubmitError("");

        try {
            const baseRequest = {
                name: activityName.trim(),
                description: null,
                startDate: toApiDate(startDate),
                endDate: toApiDate(endDate),
                managerUserIds: selectedManagerIds,
            };

            if (isEditMode && externalActivityId) {
                await updateExternalActivity(
                    organization.organizationId,
                    externalActivityId,
                    {
                        ...baseRequest,
                        participantUserIds,
                    },
                    planFile
                );

                await refreshManagedActivities();
                navigate(`/program-admin/activities/${externalActivityId}/dashboard`);
                return;
            }

            await createExternalActivity(
                organization.organizationId,
                baseRequest,
                planFile
            );

            await refreshManagedActivities();
            navigate("/program-admin/home");
        } catch (error) {
            console.error(error);
            setSubmitError(isEditMode ? t(`${ACTIVITY_CREATE_T}.editFailed`) : t(`${ACTIVITY_CREATE_T}.createFailed`));
        } finally {
            setSubmitting(false);
        }
    }

    function formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}.${month}.${day}`;
    }

    function parseDate(value: string | null, fallback?: string | null): Date {
        const target = value ?? fallback;

        if (!target) return new Date();

        const [year, month, day] = target.split(".").map(Number);

        return new Date(year, month - 1, day);
    }

    function closeManagerModal(): void {
        setManagerSearch("");
        setManagerDropdownOpen(false);
        setManagerModalOpen(false);
    }

    function handleManagerModalMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
        e.stopPropagation();

        if (!managerDropdownOpen) return;
        if (managerSearchWrapRef.current?.contains(e.target as Node)) return;

        setManagerInputFocused(false);
        setManagerDropdownOpen(false);
    }

    function handleBackClick(): void {
        navigate(-1);
    }

    return (
        <>
            <div className="eca-create-page">
                <section className="eca-create-header">
                    <h1>{organization?.organizationName ?? ""}</h1>
                    <div className="eca-create-title-row">
                        <div className="eca-create-title-row-titlebox">
                            <button type="button" onClick={handleBackClick} aria-label="Back">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <h2>{isEditMode ? t(`${ACTIVITY_CREATE_T}.editTitle`) : t(`${ACTIVITY_CREATE_T}.createTitle`)}</h2>
                        </div>
                        {/* <button type="button" className="eca-create-temp-button" disabled>{t(`${ACTIVITY_CREATE_T}.tempSave`)}</button> */}
                    </div>
                </section>

                <section className="eca-create-card">
                    <div className="eca-create-form">
                        <label className="eca-create-field">
                            <span>{t(`${ACTIVITY_CREATE_T}.activityName`)}<b>*</b></span>
                            <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder={t(`${ACTIVITY_CREATE_T}.enterContent`)} />
                        </label>

                        <div className="eca-create-field">
                            <span>{t(`${ACTIVITY_CREATE_T}.programDuration`)}<b>*</b></span>
                            <div className="eca-create-date-row" ref={calendarWrapRef}>
                                <div className="eca-create-date-input-wrap">
                                    <button type="button" className={"eca-create-date-button" + (startDate ? " is-filled" : "")} onClick={() => setDatePickerTarget((prev) => prev === "start" ? null : "start")}>
                                        <span>{startDate ?? t(`${ACTIVITY_CREATE_T}.startDate`)}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "start" ? (
                                        <div className="eca-create-calendar-popover">
                                            <CalendarRange
                                                mode="startOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
                                                calendarLocale={calendarLocale}
                                                prevMonthLabel={t(`${ACTIVITY_CREATE_T}.prevMonth`)}
                                                nextMonthLabel={t(`${ACTIVITY_CREATE_T}.nextMonth`)}
                                                onChangeStart={(date) => {
                                                    const next = formatDate(date);
                                                    setStartDate(next);

                                                    if (endDate && parseDate(endDate).getTime() < date.getTime()) {
                                                        setEndDate(next);
                                                    }

                                                    setDatePickerTarget(null);
                                                }}
                                                onChangeEnd={(date) => setEndDate(formatDate(date))}
                                                onClose={() => setDatePickerTarget(null)}
                                                resetKey={datePickerTarget === "start" ? 1 : 0}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <span className="eca-create-date-separator">~</span>

                                <div className="eca-create-date-input-wrap">
                                    <button type="button" className={"eca-create-date-button" + (endDate ? " is-filled" : "")} onClick={() => setDatePickerTarget((prev) => prev === "end" ? null : "end")}>
                                        <span>{endDate ?? t(`${ACTIVITY_CREATE_T}.endDate`)}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "end" ? (
                                        <div className="eca-create-calendar-popover eca-create-calendar-popover--end">
                                            <CalendarRange
                                                mode="endOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
                                                calendarLocale={calendarLocale}
                                                prevMonthLabel={t(`${ACTIVITY_CREATE_T}.prevMonth`)}
                                                nextMonthLabel={t(`${ACTIVITY_CREATE_T}.nextMonth`)}
                                                onChangeStart={(date) => setStartDate(formatDate(date))}
                                                onChangeEnd={(date) => {
                                                    setEndDate(formatDate(date));
                                                    setDatePickerTarget(null);
                                                }}
                                                onClose={() => setDatePickerTarget(null)}
                                                resetKey={datePickerTarget === "end" ? 1 : 0}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {isEditMode ? (
                            <div className="eca-create-field eca-create-field--participant">
                                <span>{t(`${ACTIVITY_CREATE_T}.participantList`)}<b>*</b></span>

                                <button type="button" className={"eca-create-participant-box" + (participantUserIds.length > 0 ? " is-filled" : "")} onClick={() => setParticipantModalOpen(true)} >
                                    <span className="eca-create-participant-placeholder">
                                        {getSelectedParticipantText()}
                                    </span>

                                    <span className="eca-create-participant-head">
                                        <span className="eca-create-participant-button-text">
                                            {t(`${ACTIVITY_CREATE_T}.edit`)}
                                        </span>
                                    </span>
                                </button>
                            </div>
                        ) : null}
            
                        <div className="eca-create-field eca-create-field--manager">
                            <span>{t(`${ACTIVITY_CREATE_T}.admin`)}<b>*</b></span>

                            <button type="button" className={"eca-create-manager-box" + (selectedManagerIds.length > 0 ? " is-filled" : "")} onClick={() => setManagerModalOpen(true)}>
                                <span className="eca-create-manager-placeholder">
                                    {getSelectedManagerText()}
                                </span>

                                <span className="eca-create-manager-head">
                                    <span className="eca-create-manager-button-text">
                                        {selectedManagerIds.length > 0 ? t(`${ACTIVITY_CREATE_T}.edit`) : t(`${ACTIVITY_CREATE_T}.select`)}
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="eca-create-field">
                            <span>{t(`${ACTIVITY_CREATE_T}.actionPlan`)}</span>

                            <input
                                ref={planFileInputRef}
                                type="file"
                                className="eca-create-file-input"
                                onChange={handlePlanFileChange}
                                accept=".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx"
                            />

                            <div className="eca-create-plan-actions">
                                <button type="button" className={"eca-create-upload-button" + (planFile || existingPlanUrl ? " is-filled" : "")} data-action-label={planFile || existingPlanUrl ? t(`${ACTIVITY_CREATE_T}.edit`) : t(`${ACTIVITY_CREATE_T}.select`)} onClick={() => planFileInputRef.current?.click()}>
                                    {planFile ? planFile.name : existingPlanOriginalFileName ? existingPlanOriginalFileName : t(`${ACTIVITY_CREATE_T}.uploadActionPlan`)}
                                </button>

                                {isEditMode && existingPlanUrl ? (
                                    <button type="button" className="eca-create-plan-download-button" onClick={handleDownloadExistingPlan} >
                                        {t(`${ACTIVITY_CREATE_T}.download`)}
                                    </button>
                                ) : null}
                            </div>

                            {isEditMode && existingPlanUrl && existingPlanSizeBytes !== null ? (
                                <small className="eca-create-plan-meta">
                                    {t(`${ACTIVITY_CREATE_T}.existingFileMeta`, { size: Math.ceil(existingPlanSizeBytes / 1024) })}
                                </small>
                            ) : null}
                        </div>
                    </div>

                    <div className="eca-create-bottom">
                        {submitError ? (
                            <p className="eca-create-submit-error">{submitError}</p>
                        ) : null}
                        <button type="button" onClick={handleSubmit} className="eca-create-save-button" disabled={submitting}>
                            {submitting ? t(`${ACTIVITY_CREATE_T}.saving`) : t(`${ACTIVITY_CREATE_T}.save`)}
                        </button>
                    </div>
                </section>
            </div>

            {managerModalOpen ? (
                <div className="eca-manager-modal-backdrop" onMouseDown={closeManagerModal}>
                    <div className="eca-manager-modal" onMouseDown={handleManagerModalMouseDown}>
                        <div className="eca-manager-modal-header">
                            <h3>{t(`${ACTIVITY_CREATE_T}.managerModalTitle`)}</h3>


                            <button type="button" className="eca-manager-modal-close" onClick={closeManagerModal} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-manager-modal-body">
                            <strong className="eca-manager-modal-title">{t(`${ACTIVITY_CREATE_T}.managerModalGuide`)}</strong>

                            <div className="eca-manager-search-wrap" ref={managerSearchWrapRef}>
                                <input
                                    type="text"
                                    value={managerInputFocused ? managerSearch : getSelectedManagerInputValue()}
                                    onFocus={() => {
                                        setManagerInputFocused(true);
                                        setManagerSearch("");
                                        setManagerDropdownOpen(true);
                                    }}
                                    onBlur={() => {
                                        setManagerInputFocused(false);
                                    }}
                                    onChange={(e) => {
                                        setManagerSearch(e.target.value);
                                        setManagerDropdownOpen(true);
                                    }}
                                    placeholder={t(`${ACTIVITY_CREATE_T}.managerSearchPlaceholder`)}
                                />

                                {managerDropdownOpen ? (
                                    <div className="eca-manager-dropdown">
                                        <div className="eca-manager-dropdown-top">
                                            <span>{t(`${ACTIVITY_CREATE_T}.selectedCount`, { selected: selectedManagerIds.length, total: managers.length })}</span>

                                            <div className="eca-manager-dropdown-actions">
                                                <button type="button" onClick={clearManagers}>{t(`${ACTIVITY_CREATE_T}.reset`)}</button>
                                                <button type="button" onClick={selectAllManagers}>{t(`${ACTIVITY_CREATE_T}.selectAll`)}</button>
                                            </div>
                                        </div>

                                        <div className="eca-manager-dropdown-list">
                                            {filteredManagers.map((manager) => {
                                                const checked = selectedManagerIds.includes(manager.userId);

                                                return (
                                                    <label key={manager.userId} className={"eca-manager-option" + (checked ? " is-selected" : "")}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleManager(manager.userId)} />

                                                        <img
                                                            className="eca-manager-avatar"
                                                            src={manager.profileImage || DEFAULT_MANAGER_PROFILE_IMAGE}
                                                            alt=""
                                                            onError={(e) => {
                                                                e.currentTarget.src = DEFAULT_MANAGER_PROFILE_IMAGE;
                                                            }}
                                                        />

                                                        <strong>{manager.name}</strong>
                                                    </label>
                                                );
                                            })}

                                            {filteredManagers.length === 0 ? (
                                                <p className="eca-manager-empty">{t(`${ACTIVITY_CREATE_T}.noSearchResults`)}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-manager-modal-footer">
                            <button type="button" className="eca-manager-confirm-button" onClick={closeManagerModal}>
                                {t(`${ACTIVITY_CREATE_T}.confirm`)}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {participantModalOpen ? (
                <div className="eca-manager-modal-backdrop" onMouseDown={closeParticipantModal}>
                    <div className="eca-manager-modal" onMouseDown={handleParticipantModalMouseDown}>
                        <div className="eca-manager-modal-header">
                            <h3>{t(`${ACTIVITY_CREATE_T}.participantModalTitle`)}</h3>

                            <button type="button" className="eca-manager-modal-close" onClick={closeParticipantModal} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-manager-modal-body">
                            <strong className="eca-manager-modal-title">{t(`${ACTIVITY_CREATE_T}.participantModalGuide`)}</strong>

                            <div className="eca-manager-search-wrap" ref={participantSearchWrapRef}>
                                <input
                                    type="text"
                                    value={participantInputFocused ? participantSearch : getSelectedParticipantInputValue()}
                                    onFocus={() => {
                                        setParticipantInputFocused(true);
                                        setParticipantSearch("");
                                        setParticipantDropdownOpen(true);
                                    }}
                                    onBlur={() => {
                                        setParticipantInputFocused(false);
                                    }}
                                    onChange={(e) => {
                                        setParticipantSearch(e.target.value);
                                        setParticipantDropdownOpen(true);
                                    }}
                                    placeholder={t(`${ACTIVITY_CREATE_T}.participantSearchPlaceholder`)}
                                />

                                {participantDropdownOpen ? (
                                    <div className="eca-manager-dropdown">
                                        <div className="eca-manager-dropdown-top">
                                            <span>{t(`${ACTIVITY_CREATE_T}.selectedCount`, { selected: participantUserIds.length, total: participants.length })}</span>

                                            <div className="eca-manager-dropdown-actions">
                                                <button type="button" onClick={clearParticipants}>{t(`${ACTIVITY_CREATE_T}.reset`)}</button>
                                                <button type="button" onClick={selectAllParticipants}>{t(`${ACTIVITY_CREATE_T}.selectAll`)}</button>
                                            </div>
                                        </div>

                                        <div className="eca-manager-dropdown-list">
                                            {filteredParticipants.map((participant) => {
                                                const checked = participantUserIds.includes(participant.userId);

                                                return (
                                                    <label key={participant.userId} className={"eca-manager-option" + (checked ? " is-selected" : "")}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleParticipant(participant.userId)} />

                                                        <img
                                                            className="eca-manager-avatar"
                                                            src={participant.profileImage || DEFAULT_MANAGER_PROFILE_IMAGE}
                                                            alt=""
                                                            onError={(e) => {
                                                                e.currentTarget.src = DEFAULT_MANAGER_PROFILE_IMAGE;
                                                            }}
                                                        />

                                                        <strong>{participant.name}</strong>
                                                        <small>{participant.email ?? t(`${ACTIVITY_CREATE_T}.emptyValue`)}</small>
                                                    </label>
                                                );
                                            })}

                                            {filteredParticipants.length === 0 ? (
                                                <p className="eca-manager-empty">{t(`${ACTIVITY_CREATE_T}.noSearchResults`)}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-manager-modal-footer">
                            <button type="button" className="eca-manager-confirm-button" onClick={closeParticipantModal}>
                                {t(`${ACTIVITY_CREATE_T}.confirm`)}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </>
    );
}