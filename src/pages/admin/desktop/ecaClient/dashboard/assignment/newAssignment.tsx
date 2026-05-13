import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { createAssignment, getExternalActivity, getExternalActivityTeams } from "../../../../../../api/ea";
import type { AssignmentResultForm, AssignmentSystemForm, ExternalActivityParticipant, ExternalActivityResponse, InlineTeamCreateRequest, TeamResponse } from "../../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./newAssignment.css";

type DropdownType = "systemForm" | "resultForm" | null;

type SelectableParticipant = {
    userId: number;
    name: string;
    schoolName: string;
    email?: string | null;
    profileImage?: string | null;
};

type TeamBuildMode = "EXISTING" | "NEW";

type DraftTeam = {
    tempId: string;
    name: string;
    memberUserIds: number[];
    leaderUserId?: number | null;
};

type ExistingAssignmentTeamOption = {
    assignmentId: number;
    assignmentName: string;
    teamIds: number[];
    teamNames: string[];
};

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const SYSTEM_FORM_OPTIONS: { label: string; value: AssignmentSystemForm }[] = [
    { label: "개인", value: "INDIVIDUAL" },
    { label: "팀", value: "TEAM" },
];

const RESULT_FORM_OPTIONS: { label: string; subLabel: string; value: AssignmentResultForm }[] = [
    { label: "문서", subLabel: "DOCX, HWP, PPT 등", value: "WRITING" },
    { label: "이미지", subLabel: "PNG, JPG, JPEG 등", value: "IMAGE" },
    { label: "영상", subLabel: "MP4, MOV, AVI 등", value: "VIDEO" },
    { label: "기타", subLabel: "", value: "ETC" },
];

function formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date: Date | null): string {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}`;
}

function formatTimeForApi(time: string): string {
    return `${time}:00`;
}

function formatDateTimeForApi(date: Date, time: string): string {
    return `${formatDateForApi(date)}T${formatTimeForApi(time)}`;
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

function toExistingAssignmentTeamOptions(activity: ExternalActivityResponse): ExistingAssignmentTeamOption[] {
    return (activity.assignments ?? [])
        .map((assignment) => {
            const teamParticipants = (assignment.participants ?? []).filter((participant) => (
                participant.participantType === "TEAM" &&
                typeof participant.teamId === "number"
            ));

            const uniqueTeams = Array.from(
                new Map(
                    teamParticipants.map((participant) => [
                        participant.teamId as number,
                        participant.teamName ?? `팀 ${participant.teamId}`,
                    ])
                ).entries()
            );

            return {
                assignmentId: assignment.assignmentId,
                assignmentName: assignment.name,
                teamIds: uniqueTeams.map(([teamId]) => teamId),
                teamNames: uniqueTeams.map(([, teamName]) => teamName),
            };
        })
        .filter((option) => option.teamIds.length > 0);
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

function splitTime(value: string): { hour: string; minute: string } {
    const [hour = "09", minute = "00"] = value.split(":");

    return {
        hour: hour.padStart(2, "0"),
        minute: minute.padStart(2, "0"),
    };
}

function joinTime(hour: string, minute: string): string {
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")); /* 1분 단위 */

function CalendarTimeUnitSelect({
    label,
    value,
    options,
    open,
    onToggle,
    onChange,
}: {
    label: string;
    value: string;
    options: string[];
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}): React.ReactElement {
    return (
        <div className="cal-time-unit-select">
            <button type="button" className="cal-time-unit-button" onClick={onToggle}>
                <strong>{value}</strong>
                <span>{label}</span>
            </button>

            {open ? (
                <div className="cal-time-unit-menu">
                    {options.map((option) => (
                        <button type="button" key={option} className={value === option ? "is-selected" : ""} onClick={() => onChange(option)} >
                            {option}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function CalendarRange({
    mode,
    startDate,
    endDate,
    startTime,
    endTime,
    onChangeStart,
    onChangeEnd,
    onChangeStartTime,
    onChangeEndTime,
    onClose,
    resetKey,
    showTime = false,
}: {
    mode: "range" | "startOnly" | "endOnly";
    startDate: Date;
    endDate: Date;
    startTime?: string;
    endTime?: string;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onChangeStartTime?: (time: string) => void;
    onChangeEndTime?: (time: string) => void;
    onClose: () => void;
    resetKey: number;
    showTime?: boolean;
}): React.ReactElement {
    const s = stripTime(startDate);
    const e = stripTime(endDate);
    const sameDay = isSameDay(s, e);
    const [cursor, setCursor] = React.useState(() => new Date(s.getFullYear(), s.getMonth(), 1));
    const [focus, setFocus] = React.useState<"start" | "end">("start");
    const [openTimePicker, setOpenTimePicker] = React.useState<"hour" | "minute" | null>(null);
    const calendarRef = React.useRef<HTMLDivElement | null>(null);

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

    React.useEffect(() => {
        function handleMouseDown(e: MouseEvent): void {
            if (!calendarRef.current) return;
            if (calendarRef.current.contains(e.target as Node)) return;

            if (openTimePicker) {
                setOpenTimePicker(null);
                return;
            }

            onClose();
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [openTimePicker, onClose]);

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

            if (pickedDate.getTime() > e.getTime()) {
                onChangeEnd(pickedDate);
            }

            if (!showTime) {
                onClose();
            }

            return;
        }

        if (mode === "endOnly") {
            if (pickedDate.getTime() < s.getTime()) {
                onChangeStart(pickedDate);
                onChangeEnd(pickedDate);

                if (!showTime) {
                    onClose();
                }

                return;
            }

            onChangeEnd(pickedDate);

            if (!showTime) {
                onClose();
            }

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
    
    const activeTime = mode === "endOnly" ? (endTime ?? "18:00") : (startTime ?? "09:00");
    const activeTimeParts = splitTime(activeTime);
    const timeLabel = mode === "endOnly" ? "마감시간" : "시작시간";

    function updateHour(hour: string): void {
        const nextTime = joinTime(hour, activeTimeParts.minute);

        if (mode === "endOnly") {
            onChangeEndTime?.(nextTime);
        } else {
            onChangeStartTime?.(nextTime);
        }

        setOpenTimePicker(null);
    }

    function updateMinute(minute: string): void {
        const nextTime = joinTime(activeTimeParts.hour, minute);

        if (mode === "endOnly") {
            onChangeEndTime?.(nextTime);
        } else {
            onChangeStartTime?.(nextTime);
        }

        setOpenTimePicker(null);
    }

    return (
        <div ref={calendarRef} className={"cal" + (isSixWeeks ? " cal--6w" : " cal--5w") + (showTime ? " cal--with-time" : "")}>
            <div className="cal-header">
                <div className="cal-header-bottom">
                    <div className="cal-title">{title}</div>
                    <div className="cal-nav">
                        <button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="이전 달">
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="다음 달">
                            <img className="icon" src="/icons/Next (Stroke).svg" alt="" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="cal-body">
                <div className="cal-week">
                    {WEEK_LABELS.map((w) => (
                        <div key={w} className="cal-weekday">{w}</div>
                    ))}
                </div>

                <div className="cal-grid">
                    {days.map((d) => {
                        const inMonth = d.getMonth() === month;
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

                        if (!inMonth) {
                            return <div key={key} className="cal-cell cal-cell--empty" aria-hidden="true" />;
                        }

                        const day = stripTime(d);
                        const isStart = isSameDay(day, s);
                        const isEnd = isSameDay(day, e);
                        const between = !sameDay && inRange(day);
                        const showRange = !sameDay && (between || isStart || isEnd);

                        return (
                            <div key={key} className={"cal-cell" + (between ? " is-inrange" : "") + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "")}>
                                {showRange && <div className="cal-range" aria-hidden="true" />}
                                <button type="button" className={"cal-day" + ((sameDay && isSameDay(day, s)) ? " is-selected" : "") + (isStart || isEnd ? " is-selected" : "")} onClick={() => handlePick(day)}>
                                    {day.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showTime ? (
                <div className="cal-time-panel">
                    <div className="cal-time-icon" aria-label="시간 선택">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10.64 11.76L11.76 10.64L8.8 7.68V4H7.2V8.32L10.64 11.76ZM8 16C6.89333 16 5.85333 15.79 4.88 15.37C3.90667 14.95 3.06 14.38 2.34 13.66C1.62 12.94 1.05 12.0933 0.63 11.12C0.21 10.1467 0 9.10667 0 8C0 6.89333 0.21 5.85333 0.63 4.88C1.05 3.90667 1.62 3.06 2.34 2.34C3.06 1.62 3.90667 1.05 4.88 0.63C5.85333 0.21 6.89333 0 8 0C9.10667 0 10.1467 0.21 11.12 0.63C12.0933 1.05 12.94 1.62 13.66 2.34C14.38 3.06 14.95 3.90667 15.37 4.88C15.79 5.85333 16 6.89333 16 8C16 9.10667 15.79 10.1467 15.37 11.12C14.95 12.0933 14.38 12.94 13.66 13.66C12.94 14.38 12.0933 14.95 11.12 15.37C10.1467 15.79 9.10667 16 8 16ZM8 14.4C9.77333 14.4 11.2833 13.7767 12.53 12.53C13.7767 11.2833 14.4 9.77333 14.4 8C14.4 6.22667 13.7767 4.71667 12.53 3.47C11.2833 2.22333 9.77333 1.6 8 1.6C6.22667 1.6 4.71667 2.22333 3.47 3.47C2.22333 4.71667 1.6 6.22667 1.6 8C1.6 9.77333 2.22333 11.2833 3.47 12.53C4.71667 13.7767 6.22667 14.4 8 14.4Z" fill="#808080"/>
                        </svg>
                    </div>

                     <span className="cal-time-label">{timeLabel}</span>

                    <CalendarTimeUnitSelect
                        label="시"
                        value={activeTimeParts.hour}
                        options={HOUR_OPTIONS}
                        open={openTimePicker === "hour"}
                        onToggle={() => setOpenTimePicker((prev) => (prev === "hour" ? null : "hour"))}
                        onChange={updateHour}
                    />

                    <CalendarTimeUnitSelect
                        label="분"
                        value={activeTimeParts.minute}
                        options={MINUTE_OPTIONS}
                        open={openTimePicker === "minute"}
                        onToggle={() => setOpenTimePicker((prev) => (prev === "minute" ? null : "minute"))}
                        onChange={updateMinute}
                    />
                </div>
            ) : null}
        </div>
    );
}

export default function EcaNewAssignmentPage(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { center, centerLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [/*activity*/, setActivity] = React.useState<ExternalActivityResponse | null>(null);
    const [participants, setParticipants] = React.useState<SelectableParticipant[]>([]);
    const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([]);
    const [name, setName] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>(stripTime(new Date()));
    const [endDate, setEndDate] = React.useState<Date>(stripTime(new Date()));
    const [startTime, setStartTime] = React.useState("09:00");
    const [endTime, setEndTime] = React.useState("18:00");
    const [openDatePicker, setOpenDatePicker] = React.useState<"start" | "end" | null>(null);
    const [calendarResetKey, setCalendarResetKey] = React.useState(0);
    const [systemForm, setSystemForm] = React.useState<AssignmentSystemForm>("INDIVIDUAL");
    const [teamCount, setTeamCount] = React.useState("");
    const [/*existingTeams*/, setExistingTeams] = React.useState<TeamResponse[]>([]);
    const [selectedExistingTeamIds, setSelectedExistingTeamIds] = React.useState<number[]>([]);
    const [teamBuildMode, setTeamBuildMode] = React.useState<TeamBuildMode>("NEW");
    const [draftTeams, setDraftTeams] = React.useState<DraftTeam[]>([]);
    const [teamModeModalOpen, setTeamModeModalOpen] = React.useState(false);
    const [teamCreateModalOpen, setTeamCreateModalOpen] = React.useState(false);
    const [teamMemberDropdownOpen, setTeamMemberDropdownOpen] = React.useState(false);
    const [teamMemberSearch, setTeamMemberSearch] = React.useState("");
    const [currentTeamName, setCurrentTeamName] = React.useState("");
    const [currentTeamMemberIds, setCurrentTeamMemberIds] = React.useState<number[]>([]);
    const [resultForms, setResultForms] = React.useState<AssignmentResultForm[]>([]);
    const [existingAssignmentTeamOptions, setExistingAssignmentTeamOptions] = React.useState<ExistingAssignmentTeamOption[]>([]);
    const [selectedExistingAssignmentId, setSelectedExistingAssignmentId] = React.useState<number | null>(null);
    const [existingTeamSelectModalOpen, setExistingTeamSelectModalOpen] = React.useState(false);
    const [existingTeamListOpen, setExistingTeamListOpen] = React.useState(false);
    const existingTeamListWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [openDropdown, setOpenDropdown] = React.useState<DropdownType>(null);

    const [participantModalOpen, setParticipantModalOpen] = React.useState(false);
    const [participantSearch, setParticipantSearch] = React.useState("");
    const [participantDropdownOpen, setParticipantDropdownOpen] = React.useState(false);
    const [participantInputFocused, setParticipantInputFocused] = React.useState(false);
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");
    const [modalError, setModalError] = React.useState("");

    const cardRef = React.useRef<HTMLFormElement | null>(null);
    
    React.useEffect(() => {
        async function fetchActivity(): Promise<void> {
            
            if (centerLoading) return;

            if (!center?.centerId || !externalActivityId) {
                setError("대외활동 정보를 찾을 수 없습니다.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [data, teamData] = await Promise.all([
                    getExternalActivity(center.centerId, externalActivityId),
                    getExternalActivityTeams(externalActivityId),
                ]);

                const nextParticipants = (data.participants ?? [])
                    .map(toSelectableParticipant)
                    .filter((participant): participant is SelectableParticipant => participant !== null);

                const nextExistingAssignmentTeamOptions = toExistingAssignmentTeamOptions(data);

                setActivity(data);
                setParticipants(nextParticipants);
                setExistingTeams(teamData);
                setExistingAssignmentTeamOptions(nextExistingAssignmentTeamOptions);
                setSelectedExistingAssignmentId(nextExistingAssignmentTeamOptions[0]?.assignmentId ?? null);
                setSelectedExistingTeamIds(nextExistingAssignmentTeamOptions[0]?.teamIds ?? []);
            } catch (e) {
                console.error(e);
                setActivity(null);
                setParticipants([]);
                setExistingTeams([]);
                setExistingAssignmentTeamOptions([]);
                setSelectedExistingAssignmentId(null);
                setSelectedExistingTeamIds([]);
                setError("대외활동 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchActivity();
    }, [center?.centerId, centerLoading, externalActivityId]);

    React.useEffect(() => {
        function handleMouseDown(e: MouseEvent): void {
            if (!cardRef.current) return;
            if (cardRef.current.contains(e.target as Node)) return;

            setOpenDropdown(null);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, []);

    React.useEffect(() => {
        if (systemForm === "INDIVIDUAL") {
            setTeamCount("");
            setDraftTeams([]);
            setTeamModeModalOpen(false);
            setTeamCreateModalOpen(false);
            setTeamMemberDropdownOpen(false);
            setTeamMemberSearch("");
            setCurrentTeamName("");
            setCurrentTeamMemberIds([]);
        }
    }, [systemForm]);

    React.useEffect(() => {
        if (!existingTeamListOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (existingTeamListWrapRef.current?.contains(e.target as Node)) return;

            setExistingTeamListOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [existingTeamListOpen]);

    const selectedSystemFormLabel = SYSTEM_FORM_OPTIONS.find((option) => option.value === systemForm)?.label ?? "개인";
    const selectedResultForms = RESULT_FORM_OPTIONS.filter((option) => resultForms.includes(option.value));
    const selectedParticipantText = selectedUserIds.length === 0 ? "참여자를 선택하세요" : `${selectedUserIds.length}명 선택됨`;
    const canSelectSystemForm = selectedUserIds.length > 0;
    const filteredParticipants = participants.filter((participant) =>
        participant.name.toLowerCase().includes(participantSearch.trim().toLowerCase())
    );

    const requestedTeamCount = Number(teamCount);

    const matchedExistingAssignmentTeamOptions = existingAssignmentTeamOptions.filter((option) => (
        Number.isInteger(requestedTeamCount) &&
        requestedTeamCount > 0 &&
        option.teamIds.length === requestedTeamCount
    ));

    const formValid = React.useMemo(() => {
        if (!name.trim()) return false;
        if (endDate.getTime() < startDate.getTime()) return false;
        if (resultForms.length === 0) return false;

        if (systemForm === "INDIVIDUAL") {
            return selectedUserIds.length > 0;
        }

        if (systemForm === "TEAM") {
            if (teamBuildMode === "EXISTING") {
                return selectedExistingTeamIds.length > 0;
            }

            const count = Number(teamCount);

            if (!Number.isInteger(count) || count < 1) return false;
            if (draftTeams.length !== count) return false;
            if (draftTeams.some((team) => !team.name.trim())) return false;
            if (draftTeams.some((team) => team.memberUserIds.length === 0)) return false;

            return true;
        }

        return false;
    }, [draftTeams, endDate, name, resultForms.length, selectedExistingTeamIds.length, selectedUserIds.length, startDate, systemForm, teamBuildMode, teamCount]);

    function toggleDropdown(type: DropdownType): void {
        if (type === "systemForm" && !canSelectSystemForm) {
            alert("참여자를 먼저 선택해주세요.");
            setOpenDatePicker(null);
            setOpenDropdown(null);
            return;
        }

        setOpenDatePicker(null);
        setOpenDropdown((prev) => (prev === type ? null : type));
    }

    function openCalendar(type: "start" | "end"): void {
        setOpenDropdown(null);
        setCalendarResetKey((prev) => prev + 1);
        setOpenDatePicker((prev) => (prev === type ? null : type));
    }

    function toggleUser(userId: number): void {
        setSelectedUserIds((prev) => (
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        ));
    }

    function selectAllUsers(): void {
        setSelectedUserIds(participants.map((participant) => participant.userId));
    }

    function resetUsers(): void {
        setSelectedUserIds([]);
    }

    function toggleResultForm(value: AssignmentResultForm): void {
        setResultForms((prev) => (
            prev.includes(value)
                ? prev.filter((form) => form !== value)
                : [...prev, value]
        ));
    }

    function handleTeamCountChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const value = e.target.value.replace(/\D/g, "");

        if (!value) {
            setTeamCount("");
            setDraftTeams([]);
            setCurrentTeamName("");
            setCurrentTeamMemberIds([]);
            return;
        }

        const nextCount = Math.max(1, Number(value));

        setTeamCount(String(nextCount));
        setDraftTeams((prev) => prev.slice(0, nextCount));
        setSelectedExistingAssignmentId(null);
        setSelectedExistingTeamIds([]);
    }

    function openParticipantModal(): void {
        setOpenDropdown(null);
        setOpenDatePicker(null);
        setParticipantModalOpen(true);
        setParticipantDropdownOpen(true);
    }

    function closeParticipantModal(): void {
        setParticipantSearch("");
        setParticipantDropdownOpen(false);
        setParticipantInputFocused(false);
        setParticipantModalOpen(false);
    }

    function handleParticipantModalMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
        e.stopPropagation();

        if (!participantDropdownOpen) return;
        if (participantSearchWrapRef.current?.contains(e.target as Node)) return;

        setParticipantInputFocused(false);
        setParticipantDropdownOpen(false);
    }

    function getSelectedParticipantInputValue(): string {
        const selectedParticipants = participants.filter((participant) => selectedUserIds.includes(participant.userId));

        return selectedParticipants.map((participant) => `@ ${participant.name}`).join(", ");
    }

    function getAssignedUserIds(): Set<number> {
        return new Set(draftTeams.flatMap((team) => team.memberUserIds));
    }

    function getCurrentAvailableParticipants(): SelectableParticipant[] {
        const assignedUserIds = getAssignedUserIds();
        const keyword = teamMemberSearch.trim().toLowerCase();

        return participants.filter((participant) => {
            if (!selectedUserIds.includes(participant.userId)) {
                return false;
            }

            if (assignedUserIds.has(participant.userId)) {
                return false;
            }

            if (!keyword) return true;

            return (
                participant.name.toLowerCase().includes(keyword) ||
                participant.schoolName.toLowerCase().includes(keyword) ||
                (participant.email ?? "").toLowerCase().includes(keyword)
            );
        });
    }

    function toggleCurrentTeamMember(userId: number): void {
        setCurrentTeamMemberIds((prev) => (
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        ));
        setModalError("");
    }

    function resetCurrentTeamMembers(): void {
        setCurrentTeamMemberIds([]);
    }

    function selectAllCurrentAvailableMembers(): void {
        setCurrentTeamMemberIds(getCurrentAvailableParticipants().map((participant) => participant.userId));
    }

    function getCurrentTeamMemberInputValue(): string {
        const selectedParticipants = participants.filter((participant) => currentTeamMemberIds.includes(participant.userId));

        if (selectedParticipants.length === 0) return "";
        if (selectedParticipants.length === 1) return `@ ${selectedParticipants[0].name}`;

        return `@ ${selectedParticipants[0].name} 외 ${selectedParticipants.length - 1}명`;
    }

    function addCurrentTeam(): void {
        const maxCount = Number(teamCount);

        if (!Number.isInteger(maxCount) || maxCount < 1) {
            setModalError("팀 개수를 먼저 입력해주세요.");
            return;
        }

        if (draftTeams.length >= maxCount) {
            setModalError("입력한 팀 개수만큼 이미 팀을 생성했습니다.");
            return;
        }

        if (!currentTeamName.trim()) {
            setModalError("팀 이름을 입력해주세요.");
            return;
        }

        if (currentTeamMemberIds.length === 0) {
            setModalError("팀원을 선택해주세요.");
            return;
        }

        setDraftTeams((prev) => [
            ...prev,
            {
                tempId: crypto.randomUUID(),
                name: currentTeamName.trim(),
                memberUserIds: currentTeamMemberIds,
                leaderUserId: currentTeamMemberIds[0] ?? null,
            },
        ]);

        setCurrentTeamName("");
        setCurrentTeamMemberIds([]);
        setTeamMemberSearch("");
        setTeamMemberDropdownOpen(false);
        setModalError("");
        setError("");
    }

    function removeDraftTeam(tempId: string): void {
        setDraftTeams((prev) => prev.filter((team) => team.tempId !== tempId));
    }

    function openTeamModeModal(): void {
        setOpenDropdown(null);
        setOpenDatePicker(null);
        setParticipantModalOpen(false);
        setModalError("");

        if (teamBuildMode === "EXISTING" && selectedExistingTeamIds.length > 0) {
            setExistingTeamSelectModalOpen(true);
            return;
        }

        if (teamBuildMode === "NEW" && draftTeams.length > 0) {
            setTeamCreateModalOpen(true);
            return;
        }

        const selectedExistingOptionStillValid = matchedExistingAssignmentTeamOptions.some((option) => (
            option.assignmentId === selectedExistingAssignmentId
        ));

        if (
            teamBuildMode === "EXISTING" &&
            !selectedExistingOptionStillValid
        ) {
            const firstOption = matchedExistingAssignmentTeamOptions[0];

            setSelectedExistingAssignmentId(firstOption?.assignmentId ?? null);
            setSelectedExistingTeamIds(firstOption?.teamIds ?? []);
        }

        setTeamModeModalOpen(true);
    }

    function confirmTeamMode(): void {
        if (teamBuildMode === "EXISTING") {
            if (matchedExistingAssignmentTeamOptions.length === 0) {
                setError("입력한 팀 개수와 일치하는 이전 팀 과제가 없습니다.");
                return;
            }

            setTeamModeModalOpen(false);
            setExistingTeamSelectModalOpen(true);
            return;
        }

        setSelectedExistingAssignmentId(null);
        setSelectedExistingTeamIds([]);
        setTeamModeModalOpen(false);
        setTeamCreateModalOpen(true);
    }

    function selectExistingAssignmentTeam(option: ExistingAssignmentTeamOption): void {
        setSelectedExistingAssignmentId(option.assignmentId);
        setSelectedExistingTeamIds(option.teamIds);
    }

    function closeExistingTeamSelectModal(): void {
        setExistingTeamListOpen(false);
        setExistingTeamSelectModalOpen(false);
    }

    function confirmExistingTeamSelect(): void {
        if (selectedExistingTeamIds.length === 0) {
            setError("사용할 이전 팀을 선택해주세요.");
            return;
        }

        setDraftTeams([]);
        setCurrentTeamName("");
        setCurrentTeamMemberIds([]);
        setTeamMemberSearch("");
        setTeamMemberDropdownOpen(false);
        setExistingTeamListOpen(false);
        setExistingTeamSelectModalOpen(false);
        setError("");
    }

    function getSelectedExistingAssignmentLabel(): string {
        const selectedOption = matchedExistingAssignmentTeamOptions.find((option) => option.assignmentId === selectedExistingAssignmentId);

        if (!selectedOption) return "이전 팀을 선택하세요";

        return `${selectedOption.assignmentName} (${selectedOption.teamIds.length}개 팀)`;
    }

    function closeTeamCreateModal(): void {
        setTeamCreateModalOpen(false);
        setTeamMemberDropdownOpen(false);
        setTeamMemberSearch("");
        setModalError("");
    }

    function toInlineTeams(): InlineTeamCreateRequest[] {
        return draftTeams.map((team) => ({
            name: team.name.trim(),
            description: null,
            memberUserIds: team.memberUserIds,
            leaderUserId: team.leaderUserId ?? null,
        }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();

        if (!externalActivityId) {
            setError("대외활동 정보를 찾을 수 없습니다.");
            return;
        }

        if (!formValid || resultForms.length === 0) {
            setError("필수 항목을 모두 입력해주세요.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            await createAssignment(externalActivityId, {
                name: name.trim(),
                description: null,
                startDate: formatDateForApi(startDate),
                endDate: formatDateForApi(endDate),
                startTime: formatTimeForApi(startTime),
                endTime: formatTimeForApi(endTime),
                deadlineAt: formatDateTimeForApi(endDate, endTime),
                progressStatus: "UPCOMING",
                resultForms,
                systemForm,
                maxAutoTeams: systemForm === "TEAM" ? Number(teamCount) : null,
                assigneeUserIds: systemForm === "INDIVIDUAL" ? selectedUserIds : [],
                teamIds: systemForm === "TEAM" && teamBuildMode === "EXISTING" ? selectedExistingTeamIds : [],
                inlineTeams: systemForm === "TEAM" && teamBuildMode === "NEW" ? toInlineTeams() : [],
            });

            navigate(-1);
        } catch (e) {
            console.error(e);
            setError("과제를 저장하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="eca-new-assignment-page">
                <div className="eca-new-assignment-top">
                    <h1>새로운 과제 생성</h1>
                    <button type="button" className="eca-new-assignment-temp-button" disabled>
                        임시저장
                    </button>
                </div>

                <form className="eca-new-assignment-card" onSubmit={handleSubmit} ref={cardRef}>
                    <div className="eca-new-assignment-field">
                        <label htmlFor="assignmentName">
                            과제명<span>*</span>
                        </label>
                        <input
                            id="assignmentName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="내용을 입력하세요"
                        />
                    </div>

                    <div className="eca-new-assignment-field">
                        <label>
                            과제 수행 기간<span>*</span>
                        </label>
                        <div className="eca-new-assignment-date-row">
                            <div className="eca-new-assignment-date-box">
                                <button type="button" className="eca-new-assignment-date-button" onClick={() => openCalendar("start")}>
                                    <span>{`${formatDateForDisplay(startDate)} ${startTime}`}</span>
                                    <img src="/icons/calendar-07-80.svg" alt="" />
                                </button>

                                {openDatePicker === "start" ? (
                                    <CalendarRange
                                        mode="startOnly"
                                        startDate={startDate}
                                        endDate={endDate}
                                        startTime={startTime}
                                        endTime={endTime}
                                        onChangeStart={setStartDate}
                                        onChangeEnd={setEndDate}
                                        onChangeStartTime={setStartTime}
                                        onChangeEndTime={setEndTime}
                                        onClose={() => setOpenDatePicker(null)}
                                        resetKey={calendarResetKey}
                                        showTime
                                    />
                                ) : null}
                            </div>

                            <span>~</span>

                            <div className="eca-new-assignment-date-box">
                                <button type="button" className="eca-new-assignment-date-button" onClick={() => openCalendar("end")}>
                                    <span>{`${formatDateForDisplay(endDate)} ${endTime}`}</span>
                                    <img src="/icons/calendar-07-80.svg" alt="" />
                                </button>

                                {openDatePicker === "end" ? (
                                    <CalendarRange
                                        mode="endOnly"
                                        startDate={startDate}
                                        endDate={endDate}
                                        startTime={startTime}
                                        endTime={endTime}
                                        onChangeStart={setStartDate}
                                        onChangeEnd={setEndDate}
                                        onChangeStartTime={setStartTime}
                                        onChangeEndTime={setEndTime}
                                        onClose={() => setOpenDatePicker(null)}
                                        resetKey={calendarResetKey}
                                        showTime
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="eca-new-assignment-field">
                        <label>
                            참여자<span>*</span>
                        </label>
                        <div className="eca-new-assignment-participant-row">
                            <button type="button" className="eca-new-assignment-participant-input" onClick={openParticipantModal}>
                                {selectedParticipantText}
                            </button>
                            <button type="button" className="eca-new-assignment-participant-button" onClick={openParticipantModal}>
                                {selectedUserIds.length > 0 ? "편집" : "선택"}
                            </button>
                        </div>
                    </div>

                    <div className="eca-new-assignment-field">
                        <div className="eca-new-assignment-system-row">
                            <div>
                                <label>
                                    과제 방식<span>*</span>
                                </label>
                                <div className="eca-new-assignment-dropdown-wrap">
                                    <button type="button" className="eca-new-assignment-select" onClick={() => toggleDropdown("systemForm")}>
                                        <span>{selectedSystemFormLabel}</span>
                                        <div className="eca-new-assignment-chevron">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </button>

                                    {openDropdown === "systemForm" ? (
                                        <div className="eca-new-assignment-menu eca-new-assignment-menu--small">
                                            {SYSTEM_FORM_OPTIONS.map((option) => (
                                                <button
                                                    type="button"
                                                    key={option.value}
                                                    className={systemForm === option.value ? "is-selected" : ""}
                                                    onClick={() => {
                                                        setSystemForm(option.value);
                                                        setOpenDropdown(null);
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {systemForm === "TEAM" ? (
                                <div>
                                    <label htmlFor="teamCount">
                                        팀 개수<span>*</span>
                                    </label>
                                    <input
                                        id="teamCount"
                                        className="eca-new-assignment-team-count-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={teamCount}
                                        onChange={handleTeamCountChange}
                                        placeholder="숫자만 입력해주세요"
                                    />
                                    <button type="button" className="eca-new-assignment-team-build-button" onClick={openTeamModeModal} disabled={!teamCount}>
                                        팀 빌딩
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="eca-new-assignment-field">
                        <label>
                            과제 산출물<span>*</span>
                        </label>

                        <div className="eca-new-assignment-dropdown-wrap--result">
                            <button type="button" className="eca-new-assignment-select" onClick={() => toggleDropdown("resultForm")}>
                                <span>
                                    {selectedResultForms.length > 0
                                        ? selectedResultForms
                                            .map((option) => option.label)
                                            .join(", ")
                                        : "내용을 선택하세요"}
                                </span>

                                <div className="eca-new-assignment-chevron">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </button>

                            {openDropdown === "resultForm" ? (
                                <div className="eca-new-assignment-menu eca-new-assignment-menu--result">
                                    {RESULT_FORM_OPTIONS.map((option) => {
                                        const checked = resultForms.includes(option.value);

                                        return (
                                            <label key={option.value} className={"eca-new-assignment-result-option" + (checked ? " is-selected" : "")} >
                                                <input type="checkbox" checked={checked} onChange={() => toggleResultForm(option.value)} />
                                                <strong>{option.label}</strong>
                                                {option.subLabel ? <small>({option.subLabel})</small> : null}
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {error ? <p className="eca-new-assignment-error">{error}</p> : null}
                    {loading ? <p className="eca-new-assignment-info">대외활동 정보를 불러오는 중입니다.</p> : null}

                    <button type="submit" className="eca-new-assignment-save-button" disabled={!formValid || saving || loading}>
                        {saving ? "저장 중" : "저장"}
                    </button>
                </form>
            </div>
            <div style={{ height: 100 }} />
            {participantModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeParticipantModal}>
                    <div className="eca-assignment-participant-modal" onMouseDown={handleParticipantModalMouseDown}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>참여자 명단</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeParticipantModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-assignment-participant-modal-body">
                            <strong className="eca-assignment-participant-modal-title">활동 참여자를 선택하세요</strong>

                            <div className="eca-assignment-participant-search-wrap" ref={participantSearchWrapRef}>
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
                                    placeholder="@ 학생A"
                                />

                                {participantDropdownOpen ? (
                                    <div className="eca-assignment-participant-dropdown">
                                        <div className="eca-assignment-participant-dropdown-top">
                                            <span>{selectedUserIds.length}명 / {participants.length}명</span>

                                            <div className="eca-assignment-participant-dropdown-actions">
                                                <button type="button" onClick={resetUsers}>초기화</button>
                                                <button type="button" onClick={selectAllUsers}>전체선택</button>
                                            </div>
                                        </div>

                                        <div className="eca-assignment-participant-dropdown-list">
                                            {filteredParticipants.map((participant) => {
                                                const checked = selectedUserIds.includes(participant.userId);

                                                return (
                                                    <label key={participant.userId} className={"eca-assignment-participant-option" + (checked ? " is-selected" : "")}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleUser(participant.userId)} />

                                                        <img
                                                            className="eca-assignment-participant-avatar"
                                                            src={participant.profileImage || "/internie_mascot_normal.png"}
                                                            alt=""
                                                            onError={(e) => {
                                                                e.currentTarget.src = "/internie_mascot_normal.png";
                                                            }}
                                                        />

                                                        <strong>{participant.name}</strong>
                                                        <small>{participant.email}</small>
                                                    </label>
                                                );
                                            })}

                                            {filteredParticipants.length === 0 ? (
                                                <p className="eca-assignment-participant-empty">검색 결과가 없습니다.</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer">
                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={closeParticipantModal}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {teamModeModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={() => setTeamModeModalOpen(false)}>
                    <div className="eca-team-mode-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>팀 빌딩</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={() => setTeamModeModalOpen(false)} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-mode-body">
                            <strong>팀 선정 방식</strong>

                            <div className="eca-team-mode-options">
                                <label className={"eca-team-mode-option" + (teamBuildMode === "EXISTING" ? " is-selected" : "") + (matchedExistingAssignmentTeamOptions.length === 0 ? " is-disabled" : "")}>
                                    <input
                                        type="checkbox"
                                        checked={teamBuildMode === "EXISTING"}
                                        disabled={matchedExistingAssignmentTeamOptions.length === 0}
                                        onChange={() => {
                                            const firstOption = matchedExistingAssignmentTeamOptions[0];

                                            setTeamBuildMode("EXISTING");
                                            setSelectedExistingAssignmentId(firstOption?.assignmentId ?? null);
                                            setSelectedExistingTeamIds(firstOption?.teamIds ?? []);
                                        }}
                                    />
                                    <span>이전 팀 유지하기</span>
                                </label>

                                <label className={"eca-team-mode-option" + (teamBuildMode === "NEW" ? " is-selected" : "")}>
                                    <input
                                        type="checkbox"
                                        checked={teamBuildMode === "NEW"}
                                        onChange={() => {
                                            setTeamBuildMode("NEW");
                                            setSelectedExistingTeamIds([]);
                                        }}
                                    />
                                    <span>새로 만들기</span>
                                </label>
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer">
                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={confirmTeamMode}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {existingTeamSelectModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeExistingTeamSelectModal}>
                    <div className="eca-team-existing-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>팀 빌딩</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeExistingTeamSelectModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-existing-body">
                            <strong>불러올 팀 과제를 선택하세요</strong>

                            <div className="eca-team-existing-select-wrap" ref={existingTeamListWrapRef}>
                                <button type="button" className="eca-team-existing-selected" onClick={() => setExistingTeamListOpen((prev) => !prev)} >
                                    <span>{getSelectedExistingAssignmentLabel()}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>

                                {existingTeamListOpen ? (
                                    <div className="eca-team-existing-list">
                                        {matchedExistingAssignmentTeamOptions.map((option) => {
                                            const checked = selectedExistingAssignmentId === option.assignmentId;

                                            return (
                                                <button type="button" key={option.assignmentId} className={"eca-team-existing-option" + (checked ? " is-selected" : "")}
                                                    onClick={() => {
                                                        selectExistingAssignmentTeam(option);
                                                        setExistingTeamListOpen(false);
                                                    }}
                                                >
                                                    <span className="eca-team-existing-radio" />
                                                    <span className="eca-team-existing-text">
                                                        <strong>{option.assignmentName}</strong>
                                                        <small>{option.teamNames.join(", ")}</small>
                                                    </span>
                                                    <em>{option.teamIds.length}개 팀</em>
                                                </button>
                                            );
                                        })}

                                        {matchedExistingAssignmentTeamOptions.length === 0 ? (
                                            <p className="eca-assignment-participant-empty">입력한 팀 개수와 일치하는 이전 팀 과제가 없습니다.</p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer eca-team-build-footer">
                            <button type="button" className="eca-team-build-back-button" onClick={() => { setExistingTeamListOpen(false); setExistingTeamSelectModalOpen(false); setTeamModeModalOpen(true); }} >
                                이전
                            </button>

                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={confirmExistingTeamSelect} >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {teamCreateModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeTeamCreateModal}>
                    <div className="eca-team-create-modal" onMouseDown={(e) => { e.stopPropagation();  if (!(e.target as HTMLElement).closest(".eca-team-member-picker")) { setTeamMemberDropdownOpen(false); } }} >
                        <div className="eca-assignment-participant-modal-header">
                            <h3>팀 빌딩</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeTeamCreateModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-create-body">
                            <div className="eca-team-create-field">
                                <label htmlFor="currentTeamName">팀 이름</label>
                                <input
                                    id="currentTeamName"
                                    value={currentTeamName}
                                    onChange={(e) => {
                                        setCurrentTeamName(e.target.value);
                                        setModalError("");
                                    }}
                                    placeholder="팀 이름을 입력하세요"
                                />
                            </div>

                            <div className="eca-team-create-field">
                                <label>팀원을 선택하세요</label>
                                <div className="eca-team-member-picker" onMouseDown={(e) => e.stopPropagation()}>
                                    <div className="eca-team-member-picker-row">
                                        <div className="eca-team-member-picker-input-wrap">
                                            <input
                                                className="eca-team-member-picker-input"
                                                value={teamMemberDropdownOpen ? teamMemberSearch : getCurrentTeamMemberInputValue()}
                                                onFocus={() => {
                                                    setTeamMemberDropdownOpen(true);
                                                    setTeamMemberSearch("");
                                                }}
                                                onChange={(e) => {
                                                    setTeamMemberSearch(e.target.value);
                                                    setTeamMemberDropdownOpen(true);
                                                }}
                                                placeholder="@ 학생A"
                                            />

                                            <button
                                                type="button"
                                                className="eca-team-member-picker-toggle"
                                                onClick={() => {
                                                    setTeamMemberDropdownOpen((prev) => !prev);
                                                    setTeamMemberSearch("");
                                                }}
                                                aria-label="팀원 목록 열기"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>

                                        <button type="button" className="eca-team-create-decide-button" onClick={addCurrentTeam}>
                                            결정
                                        </button>
                                    </div>

                                    {teamMemberDropdownOpen ? (
                                        <div className="eca-team-member-dropdown">
                                            <div className="eca-team-member-dropdown-top">
                                                <span>{currentTeamMemberIds.length}명 / {getCurrentAvailableParticipants().length}명</span>

                                                <div className="eca-team-member-dropdown-actions">
                                                    <button type="button" onClick={resetCurrentTeamMembers}>초기화</button>
                                                    <button type="button" onClick={selectAllCurrentAvailableMembers}>전체선택</button>
                                                </div>
                                            </div>

                                            <div className="eca-team-member-dropdown-list">
                                                {getCurrentAvailableParticipants().map((participant) => {
                                                    const checked = currentTeamMemberIds.includes(participant.userId);

                                                    return (
                                                        <label key={participant.userId} className={"eca-team-member-option" + (checked ? " is-selected" : "")}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleCurrentTeamMember(participant.userId)} />

                                                            <img
                                                                className="eca-team-member-avatar"
                                                                src={participant.profileImage || "/internie_mascot_normal.png"}
                                                                alt=""
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "/internie_mascot_normal.png";
                                                                }}
                                                            />

                                                            <strong>{participant.name}</strong>
                                                            <small>{participant.email ?? participant.schoolName}</small>
                                                        </label>
                                                    );
                                                })}

                                                {getCurrentAvailableParticipants().length === 0 ? (
                                                    <p className="eca-assignment-participant-empty">선택 가능한 참여자가 없습니다.</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="eca-team-created-tags">
                                    {draftTeams.map((team) => (
                                        <button type="button" key={team.tempId} onClick={() => removeDraftTeam(team.tempId)}>
                                            <span>{team.name}</span>
                                            <b>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                                                    <path d="M4.22375 10.7764L7.50063 7.49953M7.50063 7.49953L10.7775 4.22266M7.50063 7.49953L4.22375 4.22266M7.50063 7.49953L10.7775 10.7764" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </b>
                                        </button>
                                    ))}
                                </div>
                                {modalError ? <p className="eca-team-create-error">{modalError}</p> : null}
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer eca-team-build-footer">
                            <button type="button" className="eca-team-build-back-button" onClick={() => { setTeamMemberDropdownOpen(false); setTeamCreateModalOpen(false); setTeamModeModalOpen(true); }} >
                                이전
                            </button>

                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={closeTeamCreateModal} >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
    </>
    );
}