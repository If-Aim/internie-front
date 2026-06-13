import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { createExternalActivity, downloadExternalActivityPlan, getExternalActivity, getExternalActivityManagers, updateExternalActivity, type ExternalActivityManager, type ExternalActivityParticipant, } from "../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../ecaHome";
import "./createEca.css"; 
import "././../ecaCalendar.css";

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DEFAULT_MANAGER_PROFILE_IMAGE = "/internie_mascot_normal.png";

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

function toSelectableParticipant(participant: ExternalActivityParticipant): SelectableParticipant | null {
    if (typeof participant.userId !== "number") return null;

    return {
        userId: participant.userId,
        name: participant.name ?? "이름 없음",
        schoolName: participant.schoolName ?? "-",
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
}: {
    mode: "range" | "startOnly" | "endOnly";
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onClose: () => void;
    resetKey: number;
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
    const monthLabel = cursor.toLocaleString("en-US", { month: "long" });
    const title = `${monthLabel} ${cursor.getFullYear()}`;

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
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="이전 달">
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="다음 달">
                            <img className="icon" src="/icons/Next (Stroke).svg" alt="" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="eca-cal-body">
                <div className="eca-cal-week">
                    {WEEK_LABELS.map((w) => (
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
                    window.alert("해당 대외활동의 관리 권한이 없습니다.");
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
                    .map(toSelectableParticipant)
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
                setSubmitError(
                    isEditMode
                        ? "대외활동 정보를 불러오지 못했습니다."
                        : "초기 데이터를 불러오지 못했습니다."
                );
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
        if (selectedManagerIds.length === 0) return "담당자를 선택하세요";

        const selectedManagers = managers.filter((manager) => selectedManagerIds.includes(manager.userId));

        if (selectedManagers.length === 0) return "담당자를 선택하세요";
        if (selectedManagers.length === 1) return selectedManagers[0].name;

        return `${selectedManagers[0].name} 외 ${selectedManagers.length - 1}명`;
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
        if (participantUserIds.length === 0) return "참여자를 선택하세요";

        const selectedParticipants = participants.filter((participant) =>
            participantUserIds.includes(participant.userId)
        );

        if (selectedParticipants.length === 0) return "참여자를 선택하세요";
        if (selectedParticipants.length === 1) return selectedParticipants[0].name;

        return `${selectedParticipants[0].name} 외 ${selectedParticipants.length - 1}명`;
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
            window.alert("PDF, DOC, DOCX, HWP, HWPX, PPT, PPTX 파일만 업로드할 수 있습니다.");
            e.target.value = "";
            setPlanFile(null);
            return;
        }

        if (file.size > maxFileSize) {
            window.alert("활동 계획서는 20MB 이하 파일만 업로드할 수 있습니다.");
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
            window.alert("활동 계획서 다운로드에 실패했습니다.");
        }
    }

    async function handleSubmit(): Promise<void> {
        if (!activityName.trim()) {
            setSubmitError("대외활동명을 입력해주세요.");
            return;
        }

        if (!startDate || !endDate) {
            setSubmitError("활동 기간을 선택해주세요.");
            return;
        }

        if (selectedManagerIds.length === 0) {
            setSubmitError("담당자를 선택해주세요.");
            return;
        }

        if (!organization?.organizationId) {
            setSubmitError("기관 정보를 불러오지 못했습니다.");
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
            setSubmitError(
                isEditMode
                    ? "대외활동 수정에 실패했습니다."
                    : "대외활동 생성에 실패했습니다."
            );
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


    return (
        <>
            <div className="eca-create-page">
                <section className="eca-create-header">
                    <h1>{organization?.organizationName ?? ""}</h1>
                    <div className="eca-create-title-row">
                        <h2>{isEditMode ? "대외활동 수정" : "대외활동 생성"}</h2>
                        <button type="button" className="eca-create-temp-button" disabled>임시저장</button>
                    </div>
                </section>

                <section className="eca-create-card">
                    <div className="eca-create-form">
                        <label className="eca-create-field">
                            <span>대외활동명<b>*</b></span>
                            <input
                                type="text"
                                value={activityName}
                                onChange={(e) => setActivityName(e.target.value)}
                                placeholder="내용을 입력하세요"
                            />
                        </label>

                        <div className="eca-create-field">
                            <span>활동 기간<b>*</b></span>
                            <div className="eca-create-date-row" ref={calendarWrapRef}>
                                <div className="eca-create-date-input-wrap">
                                    <button type="button" className={"eca-create-date-button" + (startDate ? " is-filled" : "")} onClick={() => setDatePickerTarget((prev) => prev === "start" ? null : "start")}>
                                        <span>{startDate ?? "시작일"}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "start" ? (
                                        <div className="eca-create-calendar-popover">
                                            <CalendarRange
                                                mode="startOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
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
                                        <span>{endDate ?? "종료일"}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "end" ? (
                                        <div className="eca-create-calendar-popover eca-create-calendar-popover--end">
                                            <CalendarRange
                                                mode="endOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
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
                                <span>참여자 명단<b>*</b></span>

                                <button
                                    type="button"
                                    className={"eca-create-participant-box" + (participantUserIds.length > 0 ? " is-filled" : "")}
                                    onClick={() => setParticipantModalOpen(true)}
                                >
                                    <span className="eca-create-participant-placeholder">
                                        {getSelectedParticipantText()}
                                    </span>

                                    <span className="eca-create-participant-head">
                                        <span className="eca-create-participant-button-text">
                                            편집
                                        </span>
                                    </span>
                                </button>
                            </div>
                        ) : null}
            
                        <div className="eca-create-field eca-create-field--manager">
                            <span>담당자 지정<b>*</b></span>

                            <button type="button" className={"eca-create-manager-box" + (selectedManagerIds.length > 0 ? " is-filled" : "")} onClick={() => setManagerModalOpen(true)}>
                                <span className="eca-create-manager-placeholder">
                                    {getSelectedManagerText()}
                                </span>

                                <span className="eca-create-manager-head">
                                    <span className="eca-create-manager-button-text">
                                        {selectedManagerIds.length > 0 ? "편집" : "선택"}
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="eca-create-field">
                            <span>활동 계획서</span>

                            <input
                                ref={planFileInputRef}
                                type="file"
                                className="eca-create-file-input"
                                onChange={handlePlanFileChange}
                                accept=".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx"
                            />

                            <div className="eca-create-plan-actions">
                                <button
                                    type="button"
                                    className={"eca-create-upload-button" + (planFile || existingPlanUrl ? " is-filled" : "")}
                                    onClick={() => planFileInputRef.current?.click()}
                                >
                                    {planFile
                                        ? planFile.name
                                        : existingPlanOriginalFileName
                                            ? existingPlanOriginalFileName
                                            : "업로드 하기"}
                                </button>

                                {isEditMode && existingPlanUrl ? (
                                    <button
                                        type="button"
                                        className="eca-create-plan-download-button"
                                        onClick={handleDownloadExistingPlan}
                                    >
                                        다운로드
                                    </button>
                                ) : null}
                            </div>

                            {isEditMode && existingPlanUrl && existingPlanSizeBytes !== null ? (
                                <small className="eca-create-plan-meta">
                                    기존 파일 · {Math.ceil(existingPlanSizeBytes / 1024)}KB
                                </small>
                            ) : null}
                        </div>
                    </div>

                    <div className="eca-create-bottom">
                        {submitError ? (
                            <p className="eca-create-submit-error">{submitError}</p>
                        ) : null}
                        <button type="button" onClick={handleSubmit} className="eca-create-save-button" disabled={submitting}>
                            {submitting ? "저장 중" : "저장"}
                        </button>
                    </div>
                </section>
            </div>

            {managerModalOpen ? (
                <div className="eca-manager-modal-backdrop" onMouseDown={closeManagerModal}>
                    <div className="eca-manager-modal" onMouseDown={handleManagerModalMouseDown}>
                        <div className="eca-manager-modal-header">
                            <h3>담당자 지정</h3>

                            <button type="button" className="eca-manager-modal-close" onClick={closeManagerModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-manager-modal-body">
                            <strong className="eca-manager-modal-title">담당자를 선택하세요</strong>

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
                                    placeholder="@ 담당자A"
                                />

                                {managerDropdownOpen ? (
                                    <div className="eca-manager-dropdown">
                                        <div className="eca-manager-dropdown-top">
                                            <span>{selectedManagerIds.length}명 / {managers.length}명</span>

                                            <div className="eca-manager-dropdown-actions">
                                                <button type="button" onClick={clearManagers}>초기화</button>
                                                <button type="button" onClick={selectAllManagers}>전체선택</button>
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
                                                <p className="eca-manager-empty">검색 결과가 없습니다.</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-manager-modal-footer">
                            <button type="button" className="eca-manager-confirm-button" onClick={closeManagerModal}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {participantModalOpen ? (
                <div className="eca-manager-modal-backdrop" onMouseDown={closeParticipantModal}>
                    <div className="eca-manager-modal" onMouseDown={handleParticipantModalMouseDown}>
                        <div className="eca-manager-modal-header">
                            <h3>참여자 명단</h3>

                            <button type="button" className="eca-manager-modal-close" onClick={closeParticipantModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-manager-modal-body">
                            <strong className="eca-manager-modal-title">참여자를 선택하세요</strong>

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
                                    placeholder="@ 참여자A"
                                />

                                {participantDropdownOpen ? (
                                    <div className="eca-manager-dropdown">
                                        <div className="eca-manager-dropdown-top">
                                            <span>{participantUserIds.length}명 / {participants.length}명</span>

                                            <div className="eca-manager-dropdown-actions">
                                                <button type="button" onClick={clearParticipants}>초기화</button>
                                                <button type="button" onClick={selectAllParticipants}>전체선택</button>
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
                                                        <small>{participant.email ?? "-"}</small>
                                                    </label>
                                                );
                                            })}

                                            {filteredParticipants.length === 0 ? (
                                                <p className="eca-manager-empty">검색 결과가 없습니다.</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-manager-modal-footer">
                            <button type="button" className="eca-manager-confirm-button" onClick={closeParticipantModal}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </>
    );
}