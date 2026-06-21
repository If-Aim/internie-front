import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { createAssignment, getAssignment, getExternalActivity, getExternalActivityTeams, updateAssignmentMeta, updateAssignmentSchedule, updateAssignmentAssignees, updateAssignmentTeamConfiguration, } from "../../../../../../api/ea";
import type { AssignmentResponse, AssignmentResultForm, AssignmentSystemForm, ExternalActivityParticipant, ExternalActivityResponse, InlineTeamCreateRequest, TeamResponse, } from "../../../../../../api/ea";
import { localDateTimeInputToServerKstParts, serverKstDateAndTimeToUserDate, serverKstDateAndTimeToUserTime } from "../../../../../../utils/dateTime";
import type { EcaClientAdminOutletContext } from "../../ecaHome";
import "./newAssignment.css";
import "./../../ecaCalendar.css";
import i18n from "../../../../../../i18n";

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

type EditTeamSummary = {
    teamId: number;
    teamName: string;
    leaderName: string;
    memberNames: string[];
};

type EditableTeamMember = {
    userId: number;
    userName: string;
    role: "LEADER" | "MEMBER";
};

type EditableTeam = {
    teamClientId: string;
    teamId: number | null;
    name: string;
    members: EditableTeamMember[];
};

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const SYSTEM_FORM_OPTIONS: { label: string; value: AssignmentSystemForm }[] = [
    { label: "ecaAdmin.assignmentPage.systemForm.individual", value: "INDIVIDUAL" },
    { label: "ecaAdmin.assignmentPage.systemForm.team", value: "TEAM" },
];

const RESULT_FORM_OPTIONS: { label: string; subLabel: string; value: AssignmentResultForm }[] = [
    { label: "ecaAdmin.assignmentPage.resultForm.writing", subLabel: "ecaAdmin.assignmentPage.resultForm.writingFormats", value: "WRITING" },
    { label: "ecaAdmin.assignmentPage.resultForm.image", subLabel: "ecaAdmin.assignmentPage.resultForm.imageFormats", value: "IMAGE" },
    { label: "ecaAdmin.assignmentPage.resultForm.video", subLabel: "ecaAdmin.assignmentPage.resultForm.videoFormats", value: "VIDEO" },
    { label: "ecaAdmin.assignmentPage.resultForm.link", subLabel: "ecaAdmin.assignmentPage.resultForm.linkFormats", value: "LINK" },
    { label: "ecaAdmin.assignmentPage.resultForm.etc", subLabel: "", value: "ETC" },
];

function normalizeApiTime(value?: string | null): string | null {
    if (!value) return null;

    return value.slice(0, 8);
}

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

function toSelectableParticipant(participant: ExternalActivityParticipant): SelectableParticipant | null {
    if (typeof participant.userId !== "number") return null;

    return {
        userId: participant.userId,
        name: participant.name ?? i18n.t("ecaAdmin.noName"),
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
                        participant.teamName?.trim() || i18n.t("ecaAdmin.assignmentPage.teamNameFallback", { teamId: participant.teamId }),
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

function parseDateFromApi(value?: string | null): Date {
    if (!value) return stripTime(new Date());

    const [year, month, day] = value.split("-").map(Number);

    return stripTime(new Date(year, month - 1, day));
}

function getAssignmentTeamIds(assignment: AssignmentResponse): number[] {
    return Array.from(
        new Set(
            (assignment.participants ?? [])
                .filter((participant) => (
                    participant.participantType === "TEAM" &&
                    typeof participant.teamId === "number"
                ))
                .map((participant) => participant.teamId as number)
        )
    );
}

function areSameUserIdSets(left: number[], right: number[]): boolean {
    const leftSet = new Set(left);
    const rightSet = new Set(right);

    if (leftSet.size !== rightSet.size) {
        return false;
    }

    return Array.from(leftSet).every((userId) => rightSet.has(userId));
}

function areSameStringSets(left: string[], right: string[]): boolean {
    const leftSet = new Set(left);
    const rightSet = new Set(right);

    if (leftSet.size !== rightSet.size) {
        return false;
    }

    return Array.from(leftSet).every((value) => rightSet.has(value));
}

function toEditTeamSummaries(
    assignment: AssignmentResponse | null,
    teams: TeamResponse[]
): EditTeamSummary[] {
    if (!assignment || assignment.systemForm !== "TEAM") return [];

    const assignmentTeamIds = new Set(getAssignmentTeamIds(assignment));

    return teams
        .filter((team) => assignmentTeamIds.has(team.teamId))
        .map((team) => {
            const leader = team.members.find((member) => member.role === "LEADER");
            const members = team.members.filter((member) => member.role !== "LEADER");

            return {
                teamId: team.teamId,
                teamName: team.name,
                leaderName: leader?.userName ?? "-",
                memberNames: members.map((member) => member.userName),
            };
        });
}

function toEditableTeams(
    assignment: AssignmentResponse | null,
    teams: TeamResponse[]
): EditableTeam[] {
    if (!assignment || assignment.systemForm !== "TEAM") return [];

    const assignmentTeamIds = new Set(getAssignmentTeamIds(assignment));

    return teams
        .filter((team) => assignmentTeamIds.has(team.teamId))
        .map((team) => ({
            teamClientId: `existing-${team.teamId}`,
            teamId: team.teamId,
            name: team.name,
            members: team.members.map((member) => ({
                userId: member.userId,
                userName: member.userName,
                role: member.role,
            })),
        }));
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

function buildLocalDateTime(date: Date, time: string): Date | null {
    const { hour, minute } = splitTime(time);
    const nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Number(hour),
        Number(minute),
        0
    );

    if (Number.isNaN(nextDate.getTime())) return null;

    return nextDate;
}

function isValidAssignmentPeriod(
    startDate: Date,
    startTime: string,
    endDate: Date,
    endTime: string
): boolean {
    const start = buildLocalDateTime(startDate, startTime);
    const end = buildLocalDateTime(endDate, endTime);

    if (!start || !end) return false;

    return end.getTime() >= start.getTime();
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
        <div className="eca-cal-time-unit-select">
            <button type="button" className="eca-cal-time-unit-button" onClick={onToggle}>
                <strong>{value}</strong>
                <span>{label}</span>
            </button>

            {open ? (
                <div className="eca-cal-time-unit-menu">
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
    
    const activeTime = mode === "endOnly" ? (endTime ?? "23:59") : (startTime ?? "00:00");
    const activeTimeParts = splitTime(activeTime);
    const timeLabel = mode === "endOnly" ? i18n.t("ecaAdmin.assignmentPage.endTime") : i18n.t("ecaAdmin.assignmentPage.startTime");

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
        <div ref={calendarRef} className={"eca-cal" + (isSixWeeks ? " eca-cal--6w" : " eca-cal--5w") + (showTime ? " cal--with-time" : "")}>
            <div className="eca-cal-header">
                <div className="eca-cal-header-bottom">
                    <div className="eca-cal-title">{title}</div>
                    <div className="eca-cal-nav">
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label={i18n.t("ecaAdmin.assignmentPage.prevMonth")}>
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label={i18n.t("ecaAdmin.assignmentPage.nextMonth")}>
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

            {showTime ? (
                <div className="eca-cal-time-panel">
                    <div className="eca-cal-time-icon" aria-label={i18n.t("ecaAdmin.assignmentPage.selectTime")}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10.64 11.76L11.76 10.64L8.8 7.68V4H7.2V8.32L10.64 11.76ZM8 16C6.89333 16 5.85333 15.79 4.88 15.37C3.90667 14.95 3.06 14.38 2.34 13.66C1.62 12.94 1.05 12.0933 0.63 11.12C0.21 10.1467 0 9.10667 0 8C0 6.89333 0.21 5.85333 0.63 4.88C1.05 3.90667 1.62 3.06 2.34 2.34C3.06 1.62 3.90667 1.05 4.88 0.63C5.85333 0.21 6.89333 0 8 0C9.10667 0 10.1467 0.21 11.12 0.63C12.0933 1.05 12.94 1.62 13.66 2.34C14.38 3.06 14.95 3.90667 15.37 4.88C15.79 5.85333 16 6.89333 16 8C16 9.10667 15.79 10.1467 15.37 11.12C14.95 12.0933 14.38 12.94 13.66 13.66C12.94 14.38 12.0933 14.95 11.12 15.37C10.1467 15.79 9.10667 16 8 16ZM8 14.4C9.77333 14.4 11.2833 13.7767 12.53 12.53C13.7767 11.2833 14.4 9.77333 14.4 8C14.4 6.22667 13.7767 4.71667 12.53 3.47C11.2833 2.22333 9.77333 1.6 8 1.6C6.22667 1.6 4.71667 2.22333 3.47 3.47C2.22333 4.71667 1.6 6.22667 1.6 8C1.6 9.77333 2.22333 11.2833 3.47 12.53C4.71667 13.7767 6.22667 14.4 8 14.4Z" fill="#808080"/>
                        </svg>
                    </div>

                     <span className="eca-cal-time-label">{timeLabel}</span>

                    <CalendarTimeUnitSelect
                        label={i18n.t("ecaAdmin.assignmentPage.hour")}
                        value={activeTimeParts.hour}
                        options={HOUR_OPTIONS}
                        open={openTimePicker === "hour"}
                        onToggle={() => setOpenTimePicker((prev) => (prev === "hour" ? null : "hour"))}
                        onChange={updateHour}
                    />

                    <CalendarTimeUnitSelect
                        label={i18n.t("ecaAdmin.assignmentPage.minute")}
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

function TeamMemberNames({ names }: { names: string[] }): React.ReactElement {
    const { t } = useTranslation();
    const memberTextRef = React.useRef<HTMLElement | null>(null);
    const [displayText, setDisplayText] = React.useState("-");

    const updateDisplayText = React.useCallback((): void => {
        const target = memberTextRef.current;

        if (!target) return;

        if (names.length === 0) {
            setDisplayText("-");
            return;
        }

        const availableWidth = target.clientWidth;

        if (availableWidth <= 0) return;

        const computedStyle = window.getComputedStyle(target);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            setDisplayText(names.join(", "));
            return;
        }

        context.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

        for (let visibleCount = names.length; visibleCount >= 1; visibleCount -= 1) {
            const visibleNames = names.slice(0, visibleCount).join(", ");
            const hiddenCount = names.length - visibleCount;
            const nextText = hiddenCount > 0
                ? `${visibleNames} ` + t("ecaAdmin.assignmentPage.andMorePerson", { count: hiddenCount })
                : visibleNames;

            if (context.measureText(nextText).width <= availableWidth) {
                setDisplayText(nextText);
                return;
            }
        }

        const fallbackText = names.length === 1
            ? names[0]
            : t("ecaAdmin.assignmentPage.andMorePerson", { count: names.length })

        setDisplayText(fallbackText);
    }, [names]);

    React.useLayoutEffect(() => {
        updateDisplayText();
    }, [updateDisplayText]);

    React.useEffect(() => {
        const target = memberTextRef.current;

        if (!target) return;

        const observer = new ResizeObserver(() => {
            updateDisplayText();
        });

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [updateDisplayText]);

    return (
        <em ref={memberTextRef} className="eca-assignment-edit-team-members" title={names.join(", ")} >
            {displayText}
        </em>
    );
}

export default function EcaNewAssignmentPage(): React.ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { externalActivityId, assignmentId } = useParams<{
        externalActivityId?: string;
        assignmentId?: string;
    }>();

    const isEditMode = Boolean(assignmentId);
    const { organization, organizationLoading } = useOutletContext<EcaClientAdminOutletContext>();

    const [/*activity*/, setActivity] = React.useState<ExternalActivityResponse | null>(null);
    const [editingAssignment, setEditingAssignment] = React.useState<AssignmentResponse | null>(null);
    const [participants, setParticipants] = React.useState<SelectableParticipant[]>([]);
    const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([]);
    const [name, setName] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>(stripTime(new Date()));
    const [endDate, setEndDate] = React.useState<Date>(stripTime(new Date()));
    const [startTime, setStartTime] = React.useState("00:00");
    const [endTime, setEndTime] = React.useState("23:59");
    const [openDatePicker, setOpenDatePicker] = React.useState<"start" | "end" | null>(null);
    const [calendarResetKey, setCalendarResetKey] = React.useState(0);
    const [systemForm, setSystemForm] = React.useState<AssignmentSystemForm>("INDIVIDUAL");
    const [teamCount, setTeamCount] = React.useState("");
    const [existingTeams, setExistingTeams] = React.useState<TeamResponse[]>([]);
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
    const [teamEditModalOpen, setTeamEditModalOpen] = React.useState(false);
    const [editableTeams, setEditableTeams] = React.useState<EditableTeam[]>([]);
    const [selectedEditableTeamClientId, setSelectedEditableTeamClientId] = React.useState<string | null>(null);
    const [openTeamMemberMenuUserId, setOpenTeamMemberMenuUserId] = React.useState<number | null>(null);
    const [teamEditAddMemberOpen, setTeamEditAddMemberOpen] = React.useState(false);
    const [teamEditAddMemberSearch, setTeamEditAddMemberSearch] = React.useState("");

    const [openDropdown, setOpenDropdown] = React.useState<DropdownType>(null);

    const [participantModalOpen, setParticipantModalOpen] = React.useState(false);
    const [participantSearch, setParticipantSearch] = React.useState("");
    const [participantDropdownOpen, setParticipantDropdownOpen] = React.useState(false);
    const [participantInputFocused, setParticipantInputFocused] = React.useState(false);
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const resultFormDropdownRef = React.useRef<HTMLDivElement | null>(null);
    const teamEditAddMemberWrapRef = React.useRef<HTMLDivElement | null>(null);
    const teamEditMemberMenuWrapRef = React.useRef<HTMLDivElement | null>(null);

    const isTeamMemberConfigurationLocked =
        isEditMode &&
        systemForm === "TEAM" &&
        editingAssignment?.teamMemberConfigurationLocked === true;
        
    const [movingMember, setMovingMember] = React.useState<{
        sourceTeamClientId: string;
        userId: number;
        userName: string;
    } | null>(null);

    const [moveTargetTeamClientId, setMoveTargetTeamClientId] = React.useState<string | null>(null);
    const [teamEditSaving, setTeamEditSaving] = React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const [leavingBack, setLeavingBack] = React.useState(false);
    const backTimerRef = React.useRef<number | null>(null);

    const [error, setError] = React.useState("");
    const [modalError, setModalError] = React.useState("");

    const cardRef = React.useRef<HTMLFormElement | null>(null);
    
    React.useEffect(() => {
        async function fetchPageData(): Promise<void> {
            if (organizationLoading) return;

            if (!organization?.organizationId || !externalActivityId) {
                setError(t("ecaAdmin.assignmentPage.assignmentOrActivityNotFound"));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [activityData, teamData, assignmentData] = await Promise.all([
                    getExternalActivity(organization.organizationId, externalActivityId),
                    getExternalActivityTeams(externalActivityId),
                    isEditMode && assignmentId
                        ? getAssignment(assignmentId)
                        : Promise.resolve(null),
                ]);

                if (activityData.manageableByMe === false) {
                    window.alert(t("ecaAdmin.assignmentPage.noManagePermission"));
                    navigate(`/program-admin/activities/${externalActivityId}/dashboard`, { replace: true });
                    return;
                }

                const nextParticipants = (activityData.participants ?? [])
                    .map(toSelectableParticipant)
                    .filter((participant): participant is SelectableParticipant => participant !== null);

                const nextExistingAssignmentTeamOptions = toExistingAssignmentTeamOptions(activityData);

                setActivity(activityData);
                setParticipants(nextParticipants);
                setExistingTeams(teamData);
                setExistingAssignmentTeamOptions(nextExistingAssignmentTeamOptions);

                if (!assignmentData) {
                    setEditingAssignment(null);
                    setSelectedExistingAssignmentId(nextExistingAssignmentTeamOptions[0]?.assignmentId ?? null);
                    setSelectedExistingTeamIds(nextExistingAssignmentTeamOptions[0]?.teamIds ?? []);
                    return;
                }

                setEditingAssignment(assignmentData);
                setName(assignmentData.name ?? "");
                setStartDate(serverKstDateAndTimeToUserDate(assignmentData.startDate, assignmentData.startTime, "00:00:00") ?? parseDateFromApi(assignmentData.startDate));
                setEndDate(serverKstDateAndTimeToUserDate(assignmentData.endDate, assignmentData.endTime, "23:59:59") ?? parseDateFromApi(assignmentData.endDate));
                setStartTime(serverKstDateAndTimeToUserTime(assignmentData.startDate, assignmentData.startTime, "00:00:00"));
                setEndTime(serverKstDateAndTimeToUserTime(assignmentData.endDate, assignmentData.endTime, "23:59:59"));
                setSystemForm(assignmentData.systemForm);
                setTeamCount(
                    assignmentData.systemForm === "TEAM"
                        ? String(assignmentData.maxAutoTeams ?? getAssignmentTeamIds(assignmentData).length)
                        : ""
                );
                setResultForms(assignmentData.resultForms ?? []);

                if (assignmentData.systemForm === "INDIVIDUAL") {
                    const nextSelectedUserIds = (assignmentData.participants ?? [])
                        .filter((participant) => (
                            participant.participantType === "USER" &&
                            typeof participant.userId === "number"
                        ))
                        .map((participant) => participant.userId as number);

                    setSelectedUserIds(nextSelectedUserIds);
                    setTeamBuildMode("NEW");
                    setSelectedExistingAssignmentId(null);
                    setSelectedExistingTeamIds([]);
                }

                if (assignmentData.systemForm === "TEAM") {
                    const nextSelectedTeamIds = getAssignmentTeamIds(assignmentData);
                    const nextSelectedUserIds = assignmentData.assigneeUserIds ?? [];

                    setSelectedUserIds(nextSelectedUserIds);
                    setTeamBuildMode("EXISTING");
                    setSelectedExistingAssignmentId(assignmentData.assignmentId);
                    setSelectedExistingTeamIds(nextSelectedTeamIds);
                }

                setDraftTeams([]);
                setCurrentTeamName("");
                setCurrentTeamMemberIds([]);
                setTeamMemberSearch("");
                setTeamMemberDropdownOpen(false);
            } catch (e) {
                console.error(e);
                setActivity(null);
                setEditingAssignment(null);
                setParticipants([]);
                setExistingTeams([]);
                setExistingAssignmentTeamOptions([]);
                setSelectedExistingAssignmentId(null);
                setSelectedExistingTeamIds([]);
                setError(isEditMode ? t("ecaAdmin.assignmentPage.assignmentDetailLoadFailed") : t("ecaAdmin.assignmentPage.activityLoadFailed"));
            } finally {
                setLoading(false);
            }
        }

        fetchPageData();
    }, [assignmentId, organization?.organizationId, organizationLoading, externalActivityId, isEditMode, navigate, t]);
    
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
        return () => {
            if (backTimerRef.current !== null) {
                window.clearTimeout(backTimerRef.current);
            }
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
    
    React.useEffect(() => {
        if (openDropdown !== "resultForm") return;

        function handleMouseDown(e: MouseEvent): void {
            if (resultFormDropdownRef.current?.contains(e.target as Node)) return;

            setOpenDropdown(null);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [openDropdown]);

    React.useEffect(() => {
        if (!teamEditAddMemberOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (teamEditAddMemberWrapRef.current?.contains(e.target as Node)) return;

            setTeamEditAddMemberOpen(false);
            setTeamEditAddMemberSearch("");
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [teamEditAddMemberOpen]);

    React.useEffect(() => {
        if (openTeamMemberMenuUserId === null) return;

        function handleMouseDown(e: MouseEvent): void {
            if (teamEditMemberMenuWrapRef.current?.contains(e.target as Node)) return;

            setOpenTeamMemberMenuUserId(null);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [openTeamMemberMenuUserId]);
    
    const selectedSystemFormLabelKey = SYSTEM_FORM_OPTIONS.find((option) => option.value === systemForm)?.label ?? "ecaAdmin.systemForm.individual";
    const selectedResultForms = RESULT_FORM_OPTIONS.filter((option) => resultForms.includes(option.value));
    const selectedParticipantText = React.useMemo(() => {
        if (selectedUserIds.length === 0) return t("ecaAdmin.assignmentPage.selectParticipants");

        const selectedParticipants = participants
            .filter((participant) => selectedUserIds.includes(participant.userId))
            .sort((a, b) => a.userId - b.userId);

        const firstParticipant = selectedParticipants[0];

        if (!firstParticipant) return t("ecaAdmin.assignmentPage.selectParticipants");
        if (selectedParticipants.length === 1) return firstParticipant.name;

        return `@ ${firstParticipant.name} ` + t("ecaAdmin.assignmentPage.andMorePerson", { count: selectedParticipants.length - 1 });
    }, [participants, selectedUserIds, t]);
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
    const canConfirmNewTeamBuild =
        Number.isInteger(requestedTeamCount) &&
        requestedTeamCount > 0 &&
        draftTeams.length === requestedTeamCount;
    
    const editTeamSummaries = React.useMemo(() => {
        return toEditTeamSummaries(editingAssignment, existingTeams);
    }, [editingAssignment, existingTeams]);

    const selectedEditableTeam = editableTeams.find((team) => team.teamClientId === selectedEditableTeamClientId) ?? null;
    const assignedEditableMemberUserIds = React.useMemo(() => {
        return new Set(
            editableTeams.flatMap((team) => team.members.map((member) => member.userId))
        );
    }, [editableTeams]);

    const assignedEditableMemberCount = assignedEditableMemberUserIds.size;
    const unassignedEditableParticipants = React.useMemo(() => {
        return participants.filter((participant) => (
            selectedUserIds.includes(participant.userId) &&
            !assignedEditableMemberUserIds.has(participant.userId)
        ));
    }, [assignedEditableMemberUserIds, participants, selectedUserIds]);
    const unassignedEditableMemberCount = unassignedEditableParticipants.length;

    const filteredUnassignedEditableParticipants = React.useMemo(() => {
        const keyword = teamEditAddMemberSearch.trim().toLowerCase();

        if (!keyword) return unassignedEditableParticipants;

        return unassignedEditableParticipants.filter((participant) => (
            participant.name.toLowerCase().includes(keyword) ||
            participant.schoolName.toLowerCase().includes(keyword) ||
            (participant.email ?? "").toLowerCase().includes(keyword)
        ));
    }, [teamEditAddMemberSearch, unassignedEditableParticipants]);

    const selectedExistingTeamMemberUserIds = React.useMemo(() => {
        return Array.from(
            new Set(
                existingTeams
                    .filter((team) => selectedExistingTeamIds.includes(team.teamId))
                    .flatMap((team) => team.members.map((member) => member.userId))
            )
        );
    }, [existingTeams, selectedExistingTeamIds]);
    const draftTeamMemberUserIds = React.useMemo(() => {
        return Array.from(
            new Set(
                draftTeams.flatMap((team) => team.memberUserIds)
            )
        );
    }, [draftTeams]);

    const formValid = React.useMemo(() => {
        if (!name.trim()) return false;
        if (!isValidAssignmentPeriod(startDate, startTime, endDate, endTime)) return false;
        if (resultForms.length === 0) return false;

        if (systemForm === "INDIVIDUAL") {
            return selectedUserIds.length > 0;
        }

        if (systemForm === "TEAM") {
            if (teamBuildMode === "EXISTING") {
                if (selectedExistingTeamIds.length === 0) return false;

                return areSameUserIdSets(
                    selectedUserIds,
                    selectedExistingTeamMemberUserIds
                );
            }

            const count = Number(teamCount);

            if (!Number.isInteger(count) || count < 1) return false;
            if (draftTeams.length !== count) return false;
            if (draftTeams.some((team) => !team.name.trim())) return false;
            if (draftTeams.some((team) => team.memberUserIds.length === 0)) return false;

            return areSameUserIdSets(
                selectedUserIds,
                draftTeamMemberUserIds
            );
        }

        return false;
    }, [draftTeams, endDate, endTime, name, resultForms.length, selectedExistingTeamIds, selectedExistingTeamMemberUserIds, selectedUserIds, startDate, startTime, systemForm, teamBuildMode, teamCount]);

    
    function toggleDropdown(type: DropdownType): void {
        if (type === "systemForm" && !canSelectSystemForm) {
            alert(t("ecaAdmin.assignmentPage.selectParticipantsFirst"));
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
        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.participantLockedBySubmission"));
            return;
        }

        setOpenDropdown(null);
        setOpenDatePicker(null);
        setParticipantSearch("");
        setParticipantInputFocused(false);
        setParticipantModalOpen(true);
        setParticipantDropdownOpen(!isEditMode);
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
        const selectedParticipants = participants
            .filter((participant) => selectedUserIds.includes(participant.userId))
            .sort((a, b) => a.userId - b.userId);

        const firstParticipant = selectedParticipants[0];

        if (!firstParticipant) return "";
        if (selectedParticipants.length === 1) return `@ ${firstParticipant.name}`;

        return `@ ${firstParticipant.name} ` + t("ecaAdmin.assignmentPage.andMorePerson", { count: selectedParticipants.length - 1 });
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

        return `@ ${selectedParticipants[0].name} ` + t("ecaAdmin.assignmentPage.andMorePerson", { count: selectedParticipants.length - 1 });
    }

    function addCurrentTeam(): void {
        const maxCount = Number(teamCount);

        if (!Number.isInteger(maxCount) || maxCount < 1) {
            setModalError(t("ecaAdmin.assignmentPage.enterTeamCountFirst"));
            return;
        }

        if (draftTeams.length >= maxCount) {
            setModalError(t("ecaAdmin.assignmentPage.teamCountReached"));
            return;
        }

        if (!currentTeamName.trim()) {
            setModalError(t("ecaAdmin.assignmentPage.enterTeamName"));
            return;
        }

        if (currentTeamMemberIds.length === 0) {
            setModalError(t("ecaAdmin.assignmentPage.selectTeamMembers"));
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
                setError(t("ecaAdmin.assignmentPage.noMatchingPreviousTeam"));
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
            setError(t("ecaAdmin.assignmentPage.selectPreviousTeam"));
            return;
        }

        if (!areSameUserIdSets(selectedUserIds, selectedExistingTeamMemberUserIds)) {
            window.alert(t("ecaAdmin.assignmentPage.participantTeamMismatch"));
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

        if (!selectedOption) return t("ecaAdmin.assignmentPage.selectPreviousTeamPlaceholder");

        return `${selectedOption.assignmentName} (${i18n.t("ecaAdmin.assignmentPage.teamCountSuffix", { count: selectedOption.teamIds.length })})`;
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

    function openTeamEditModal(): void {
        const nextEditableTeams = toEditableTeams(editingAssignment, existingTeams);

        setEditableTeams(nextEditableTeams);
        setSelectedEditableTeamClientId(nextEditableTeams[0]?.teamClientId ?? null);
        setOpenTeamMemberMenuUserId(null);
        setTeamEditAddMemberOpen(false);
        setTeamEditAddMemberSearch("");
        setMovingMember(null);
        setMoveTargetTeamClientId(null);
        setTeamEditModalOpen(true);
    }

    function closeTeamEditModal(): void {
        setTeamEditModalOpen(false);
        setOpenTeamMemberMenuUserId(null);
        setTeamEditAddMemberOpen(false);
        setTeamEditAddMemberSearch("");
        setMovingMember(null);
        setMoveTargetTeamClientId(null);
    }

    function addEditableTeam(): void {
        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.cannotAddTeamBySubmission"));
            return;
        }

        const nextTeam: EditableTeam = {
            teamClientId: crypto.randomUUID(),
            teamId: null,
            name: t("ecaAdmin.assignmentPage.newTeamWithNumber", { number: editableTeams.length + 1 }),
            members: [],
        };

        setEditableTeams((prev) => [...prev, nextTeam]);
        setSelectedEditableTeamClientId(nextTeam.teamClientId);
        setOpenTeamMemberMenuUserId(null);
        setTeamEditAddMemberOpen(false);
        setTeamEditAddMemberSearch("");
    }

    function deleteSelectedEditableTeam(): void {
        if (!selectedEditableTeam) {
            return;
        }

        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.cannotDeleteTeamBySubmission"));
            return;
        }

        if (editableTeams.length <= 1) {
            window.alert(t("ecaAdmin.assignmentPage.minOneTeamRequired"));
            return;
        }

        const confirmed = window.confirm(t("ecaAdmin.assignmentPage.confirmDeleteTeam", { name: selectedEditableTeam.name }));

        if (!confirmed) {
            return;
        }

        const removedTeamHadMembers = selectedEditableTeam.members.length > 0;
        const nextTeams = editableTeams.filter((team) => team.teamClientId !== selectedEditableTeam.teamClientId);

        setEditableTeams(nextTeams);
        setSelectedEditableTeamClientId(nextTeams[0]?.teamClientId ?? null);
        setOpenTeamMemberMenuUserId(null);
        setTeamEditAddMemberOpen(false);
        setTeamEditAddMemberSearch("");
        setMovingMember(null);
        setMoveTargetTeamClientId(null);

        if (removedTeamHadMembers) {
            window.alert(t("ecaAdmin.assignmentPage.removedTeamMembersUnassigned"));
        }
    }

    async function handleConfirmTeamEdit(): Promise<void> {
        if (teamEditSaving) return;

        if (!assignmentId || !externalActivityId) {
            window.alert(t("ecaAdmin.assignmentPage.assignmentOrActivityNotFound"));
            return;
        }

        const blankNameTeam = editableTeams.find((team) => !team.name.trim());

        if (blankNameTeam) {
            window.alert(t("ecaAdmin.assignmentPage.enterTeamName"));
            return;
        }

        const emptyTeam = editableTeams.find((team) => team.members.length === 0);

        if (emptyTeam) {
            window.alert(t("ecaAdmin.assignmentPage.minOneMemberPerTeam"));
            return;
        }

        const noLeaderTeam = editableTeams.find((team) =>
            !team.members.some((member) => member.role === "LEADER")
        );

        if (noLeaderTeam) {
            window.alert(t("ecaAdmin.assignmentPage.leaderRequiredPerTeam"));
            return;
        }

        if (hasUnassignedEditableParticipants()) {
            alertUnassignedEditableParticipants();
            return;
        }

        setTeamEditSaving(true);

        try {
            const updatedAssignment = await updateAssignmentTeamConfiguration(assignmentId, {
                assigneeUserIds: selectedUserIds,
                teams: editableTeams.map((team) => {
                    const leader = team.members.find((member) => member.role === "LEADER");

                    return {
                        teamId: team.teamId,
                        name: team.name.trim(),
                        memberUserIds: team.members.map((member) => member.userId),
                        leaderUserId: leader?.userId ?? null,
                    };
                }),
            });

            const refreshedTeams = await getExternalActivityTeams(externalActivityId);

            setEditingAssignment(updatedAssignment);
            setExistingTeams(refreshedTeams);
            setEditableTeams(toEditableTeams(updatedAssignment, refreshedTeams));
            setTeamCount(String(updatedAssignment.maxAutoTeams ?? editableTeams.length));
            setSelectedExistingAssignmentId(updatedAssignment.assignmentId);
            setSelectedExistingTeamIds(getAssignmentTeamIds(updatedAssignment));
            setOpenTeamMemberMenuUserId(null);
            setTeamEditAddMemberOpen(false);
            setTeamEditAddMemberSearch("");
            setMovingMember(null);
            setMoveTargetTeamClientId(null);
            setTeamEditModalOpen(false);
        } catch (e) {
            console.error(e);

            const message = e instanceof Error && e.message
                ? e.message
                : t("ecaAdmin.assignmentPage.teamSaveFailed");

            window.alert(message);
        } finally {
            setTeamEditSaving(false);
        }
    }

    function handleChangeTeamLeader(teamClientId: string, userId: number): void {
        setEditableTeams((prev) =>
            prev.map((team) => {
                if (team.teamClientId !== teamClientId) return team;

                return {
                    ...team,
                    members: team.members.map((member) => ({
                        ...member,
                        role: member.userId === userId ? "LEADER" : "MEMBER",
                    })),
                };
            })
        );

        setOpenTeamMemberMenuUserId(null);
    }

    function handleAddEditableTeamMember(
        teamClientId: string,
        participant: SelectableParticipant
    ): void {
        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.cannotAddMemberBySubmission"));
            return;
        }

        const alreadyAssigned = editableTeams.some((team) =>
            team.members.some((member) => member.userId === participant.userId)
        );

        if (alreadyAssigned) {
            window.alert(t("ecaAdmin.assignmentPage.alreadyAssignedToTeam"));
            return;
        }

        setEditableTeams((prev) =>
            prev.map((team) => {
                if (team.teamClientId !== teamClientId) return team;

                return {
                    ...team,
                    members: [
                        ...team.members,
                        {
                            userId: participant.userId,
                            userName: participant.name,
                            role: "MEMBER",
                        },
                    ],
                };
            })
        );

        setTeamEditAddMemberOpen(false);
        setTeamEditAddMemberSearch("");
    }

    function openMoveMemberSelect(teamClientId: string, member: EditableTeamMember): void {
        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.cannotMoveMemberBySubmission"));
            return;
        }

        if (member.role === "LEADER") {
            window.alert(t("ecaAdmin.assignmentPage.cannotMoveLeaderDirectly"));
            return;
        }

        const firstTargetTeam = editableTeams.find((team) => team.teamClientId !== teamClientId);

        if (!firstTargetTeam) {
            window.alert(t("ecaAdmin.assignmentPage.noOtherTeamToMove"));
            return;
        }

        setMovingMember({
            sourceTeamClientId: teamClientId,
            userId: member.userId,
            userName: member.userName,
        });
        setMoveTargetTeamClientId(firstTargetTeam.teamClientId);
        setOpenTeamMemberMenuUserId(null);
    }

    function confirmMoveMember(): void {
        if (!movingMember || !moveTargetTeamClientId) return;

        const sourceTeam = editableTeams.find((team) => team.teamClientId === movingMember.sourceTeamClientId);
        const movingMemberData = sourceTeam?.members.find((member) => member.userId === movingMember.userId);

        if (!movingMemberData) {
            window.alert(t("ecaAdmin.assignmentPage.movingMemberNotFound"));
            return;
        }

        setEditableTeams((prev) =>
            prev.map((team) => {
                if (team.teamClientId === movingMember.sourceTeamClientId) {
                    return {
                        ...team,
                        members: team.members.filter((member) => member.userId !== movingMember.userId),
                    };
                }

                if (team.teamClientId === moveTargetTeamClientId) {
                    return {
                        ...team,
                        members: [
                            ...team.members,
                            {
                                ...movingMemberData,
                                role: "MEMBER",
                            },
                        ],
                    };
                }

                return team;
            })
        );

        setMovingMember(null);
        setMoveTargetTeamClientId(null);
    }

    function handleRemoveEditableTeamMember(
        teamClientId: string,
        member: EditableTeamMember
    ): void {
        if (isTeamMemberConfigurationLocked) {
            window.alert(t("ecaAdmin.assignmentPage.cannotRemoveMemberBySubmission"));
            return;
        }

        const targetTeam = editableTeams.find((team) => team.teamClientId === teamClientId);

        if (!targetTeam) {
            window.alert(t("ecaAdmin.assignmentPage.teamNotFound"));
            return;
        }

        if (member.role === "LEADER") {
            window.alert(t("ecaAdmin.assignmentPage.cannotRemoveLeaderDirectly"));
            return;
        }

        if (targetTeam.members.length <= 1) {
            window.alert(t("ecaAdmin.assignmentPage.minOneMemberPerTeam"));
            return;
        }

        const confirmed = window.confirm(t("ecaAdmin.assignmentPage.confirmRemoveMember", { name: member.userName }));

        if (!confirmed) return;

        const nextEditableTeams = editableTeams.map((team) =>
            team.teamClientId === teamClientId
                ? {
                    ...team,
                    members: team.members.filter((item) => item.userId !== member.userId),
                }
                : team
        );

        setEditableTeams(nextEditableTeams);

        if (hasUnassignedEditableParticipants(nextEditableTeams)) {
            alertUnassignedEditableParticipants();
        }
    }

    function hasUnassignedEditableParticipants(teams: EditableTeam[] = editableTeams): boolean {
        const assignedUserIds = new Set(
            teams.flatMap((team) => team.members.map((member) => member.userId))
        );

        return selectedUserIds.some((userId) => !assignedUserIds.has(userId));
    }

    function alertUnassignedEditableParticipants(): void {
        window.alert(t("ecaAdmin.assignmentPage.unassignedParticipants"));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();

        if (!externalActivityId) {
            setError(t("ecaAdmin.programNotFound"));
            return;
        }

        if (!formValid || resultForms.length === 0) {
            setError(t("ecaAdmin.assignmentPage.fillAllRequired"));
            return;
        }

        if (!isValidAssignmentPeriod(startDate, startTime, endDate, endTime)) {
            setError(t("error.failSetEndTime"));
            return;
        }

        if (!isEditMode) {
            if (
                systemForm === "TEAM" &&
                teamBuildMode === "EXISTING" &&
                !areSameUserIdSets(selectedUserIds, selectedExistingTeamMemberUserIds)
            ) {
                setError(t("ecaAdmin.assignmentPage.existingTeamMembersMustMatch"));
                return;
            }

            if (
                systemForm === "TEAM" &&
                teamBuildMode === "NEW" &&
                !areSameUserIdSets(selectedUserIds, draftTeamMemberUserIds)
            ) {
                setError(t("ecaAdmin.assignmentPage.allParticipantsMustBeAssigned"));
                return;
            }

            setSaving(true);
            setError("");

            try {
                const startParts = localDateTimeInputToServerKstParts(formatDateForApi(startDate), startTime);
                const endParts = localDateTimeInputToServerKstParts(formatDateForApi(endDate), endTime);

                const request = {
                    name: name.trim(),
                    description: null,
                    startDate: startParts.date,
                    endDate: endParts.date,
                    startTime: startParts.time,
                    endTime: endParts.time,
                    deadlineAt: endParts.dateTime,
                    progressStatus: "UPCOMING" as const,
                    resultForms,
                    systemForm,
                    maxAutoTeams: systemForm === "TEAM" ? Number(teamCount) : null,
                    assigneeUserIds: selectedUserIds,
                    teamIds: systemForm === "TEAM" && teamBuildMode === "EXISTING" ? selectedExistingTeamIds : [],
                    inlineTeams: systemForm === "TEAM" && teamBuildMode === "NEW" ? toInlineTeams() : [],
                };

                await createAssignment(externalActivityId, request);
                navigate(-1);
            } catch (e) {
                console.error(e);
                setError(t("ecaAdmin.assignmentPage.assignmentSaveFailed"));
            } finally {
                setSaving(false);
            }

            return;
        }

        if (!assignmentId || !editingAssignment) {
            setError(t("ecaAdmin.assignmentPage.editAssignmentNotFound"));
            return;
        }

        if (systemForm === "TEAM") {
            const currentAssigneeUserIds = editingAssignment.assigneeUserIds ?? [];

            if (!areSameUserIdSets(selectedUserIds, currentAssigneeUserIds)) {
                setError(t("ecaAdmin.assignmentPage.teamParticipantChangeGuide"));
                return;
            }
        }

        setSaving(true);
        setError("");

        try {
            const nextStartParts = localDateTimeInputToServerKstParts(formatDateForApi(startDate), startTime);
            const nextEndParts = localDateTimeInputToServerKstParts(formatDateForApi(endDate), endTime);

            const nextStartDate = nextStartParts.date;
            const nextEndDate = nextEndParts.date;
            const nextStartTime = nextStartParts.time;
            const nextEndTime = nextEndParts.time;
            const nextDeadlineAt = nextEndParts.dateTime;

            const currentStartTime = normalizeApiTime(editingAssignment.startTime);
            const currentEndTime = normalizeApiTime(editingAssignment.endTime);

            const metaChanged =
                editingAssignment.name !== name.trim() ||
                !areSameStringSets(editingAssignment.resultForms ?? [], resultForms);

            const scheduleChanged =
                editingAssignment.startDate !== nextStartDate ||
                editingAssignment.endDate !== nextEndDate ||
                currentStartTime !== nextStartTime ||
                currentEndTime !== nextEndTime ||
                editingAssignment.deadlineAt !== nextDeadlineAt;

            const individualAssigneesChanged =
                systemForm === "INDIVIDUAL" &&
                !areSameUserIdSets(
                    editingAssignment.assigneeUserIds ?? [],
                    selectedUserIds
                );

            let latestAssignment = editingAssignment;

            if (individualAssigneesChanged) {
                latestAssignment = await updateAssignmentAssignees(assignmentId, {
                    assigneeUserIds: selectedUserIds,
                });
            }

            if (metaChanged) {
                latestAssignment = await updateAssignmentMeta(assignmentId, {
                    name: name.trim(),
                    description: null,
                    resultForms,
                });
            }

            if (scheduleChanged) {
                latestAssignment = await updateAssignmentSchedule(assignmentId, {
                    startDate: nextStartDate,
                    endDate: nextEndDate,
                    startTime: nextStartTime,
                    endTime: nextEndTime,
                    deadlineAt: nextDeadlineAt,
                });
            }

            setEditingAssignment(latestAssignment);

            navigate(
                `/program-admin/activities/${externalActivityId}/assignment/${assignmentId}`,
                { replace: true }
            );
        } catch (e) {
            console.error(e);

            const message = e instanceof Error && e.message
                ? e.message
                : t("ecaAdmin.assignmentPage.assignmentEditFailed");

            setError(message);
        } finally {
            setSaving(false);
        }
    }

    function moveBack(): void {
        if (leavingBack) return;

        setOpenDropdown(null);
        setOpenDatePicker(null);
        setParticipantModalOpen(false);
        setTeamModeModalOpen(false);
        setTeamCreateModalOpen(false);
        setExistingTeamSelectModalOpen(false);
        setTeamEditModalOpen(false);
        setLeavingBack(true);

        backTimerRef.current = window.setTimeout(() => {
            navigate(-1);
        }, 280);
    }

    return (
        <>
            <div className={"eca-admin-new-assignment-page" + (isEditMode ? " is-edit-mode" : " is-create-mode") + (leavingBack ? " is-leaving-back" : "")}>
                <div className="eca-admin-new-assignment-top">
                    <div className="eca-admin-new-assignment-top-left">
                        <button type="button" className="eca-admin-assignment-detail-back-button" onClick={moveBack} disabled={leavingBack} aria-label={t("ecaAdmin.goBack")}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M12 15L7 10L12 5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>

                        <h1>{isEditMode ? t("ecaAdmin.assignmentPage.editAssignmentTitle") : t("ecaAdmin.assignmentPage.newAssignmentTitle")}</h1>
                    </div>

                    {/* <button type="button" className="eca-admin-new-assignment-temp-button" disabled>
                        {t("ecaAdmin.assignmentPage.tempSave")}
                    </button> */}
                </div>

                <form className="eca-admin-new-assignment-card" onSubmit={handleSubmit} ref={cardRef}>
                    <div className="eca-admin-new-assignment-field">
                        <label htmlFor="assignmentName">
                            {t("ecaAdmin.assignmentPage.assignmentName")}<span>*</span>
                        </label>
                        <input
                            id="assignmentName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("ecaAdmin.assignmentPage.enterContent")}
                        />
                    </div>

                    <div className="eca-admin-new-assignment-field">
                        <label>
                            {t("ecaAdmin.assignmentPage.assignmentPeriod")}<span>*</span>
                        </label>
                        <div className="eca-admin-new-assignment-date-row">
                            <div className="eca-admin-new-assignment-date-box">
                                <button type="button" className="eca-admin-new-assignment-date-button" onClick={() => openCalendar("start")}>
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

                            <div className="eca-admin-new-assignment-date-box">
                                <button type="button" className="eca-admin-new-assignment-date-button" onClick={() => openCalendar("end")}>
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

                    <div className="eca-admin-new-assignment-field">
                        <label>{t("ecaAdmin.assignmentPage.participant")}<span>*</span></label>
                        <div className="eca-admin-new-assignment-participant-row">
                            <button type="button" className={ "eca-admin-new-assignment-participant-input" + (selectedUserIds.length === 0 ? " is-placeholder" : "") } onClick={openParticipantModal} > 
                                {selectedParticipantText}
                            </button>
                            <button type="button" className="eca-admin-new-assignment-participant-button" onClick={openParticipantModal}>
                                {selectedUserIds.length > 0 ? t("common.edit") : t("common.select")}
                            </button>
                        </div>
                    </div>

                    <div className="eca-admin-new-assignment-field">
                        <div className="eca-admin-new-assignment-system-row">
                            <div>
                                <label>{t("ecaAdmin.assignmentPage.assignmentSystemForm")}<span>*</span></label>
                                <div className="eca-admin-new-assignment-dropdown-wrap">
                                    <button type="button" className="eca-admin-new-assignment-select" onClick={() => toggleDropdown("systemForm")}>
                                        <span>{t(selectedSystemFormLabelKey)}</span>
                                        <div className="eca-admin-new-assignment-chevron">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </button>

                                    {openDropdown === "systemForm" ? (
                                        <div className="eca-admin-new-assignment-menu eca-admin-new-assignment-menu--small">
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
                                                    {t(option.label)}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {systemForm === "TEAM" && !isEditMode ? (
                                <div>
                                    <label htmlFor="teamCount">{t("ecaAdmin.assignmentPage.teamCount")}<span>*</span></label>
                                    <input
                                        id="teamCount"
                                        className="eca-admin-new-assignment-team-count-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={teamCount}
                                        onChange={handleTeamCountChange}
                                        placeholder={t("ecaAdmin.assignmentPage.numberOnlyPlaceholder")}
                                    />
                                    <button type="button" className="eca-admin-new-assignment-team-build-button" onClick={openTeamModeModal} disabled={!teamCount}>
                                        {t("ecaAdmin.assignmentPage.teamBuilding")}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {isEditMode && systemForm === "TEAM" ? (
                        <div className="eca-admin-new-assignment-field eca-assignment-edit-team-status">
                            <div className="eca-assignment-edit-team-status-head">
                                <label>{t("ecaAdmin.assignmentPage.teamStatus")}<span>*</span></label>
                                <button type="button" className="eca-assignment-edit-team-status-button" onClick={openTeamEditModal}>
                                    {t("ecaAdmin.assignmentPage.modify")}
                                </button>
                            </div>

                            <div className="eca-assignment-edit-team-table-head">
                                <span>{t("ecaAdmin.assignmentPage.teamName")}</span>
                                <span>{t("ecaAdmin.assignmentPage.teamLeader")}</span>
                                <span>{t("ecaAdmin.assignmentPage.teamMembers")}</span>
                            </div>

                            <div className="eca-assignment-edit-team-table-body">
                                {editTeamSummaries.length === 0 ? (
                                    <p className="eca-admin-new-assignment-empty">{t("ecaAdmin.assignmentPage.noLinkedTeam")}</p>
                                ) : (
                                    editTeamSummaries.map((team) => (
                                        <div key={team.teamId} className="eca-assignment-edit-team-row" >
                                            <strong>{team.teamName}</strong>
                                            <span>{team.leaderName}</span>
                                            <TeamMemberNames names={team.memberNames} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="eca-admin-new-assignment-field">
                        <label>{t("ecaAdmin.assignmentPage.assignmentDeliverable")}<span>*</span></label>
                        <div className="eca-admin-new-assignment-dropdown-wrap--result" ref={resultFormDropdownRef}>
                                <button type="button" className={ "eca-admin-new-assignment-select" + (selectedResultForms.length === 0 ? " is-placeholder" : "") } onClick={() => toggleDropdown("resultForm")} > 
                                    <span>
                                        {selectedResultForms.length > 0
                                            ? selectedResultForms
                                                .map((option) => (
                                                    option.subLabel
                                                        ? `${t(option.label)} (${t(option.subLabel)})`
                                                        : t(option.label)
                                                ))
                                                .join(", ")
                                            : t("ecaAdmin.assignmentPage.selectContent")}
                                    </span>

                                <div className="eca-admin-new-assignment-chevron">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </button>

                            {openDropdown === "resultForm" ? (
                                <div className="eca-admin-new-assignment-menu eca-admin-new-assignment-menu--result">
                                    {RESULT_FORM_OPTIONS.map((option) => {
                                        const checked = resultForms.includes(option.value);

                                        return (
                                            <label key={option.value} className={"eca-admin-new-assignment-result-option" + (checked ? " is-selected" : "")} >
                                                <input type="checkbox" checked={checked} onChange={() => toggleResultForm(option.value)} />
                                                <strong>{t(option.label)}</strong>
                                                {option.subLabel ? <small>({t(option.subLabel)})</small> : null}
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {error ? <p className="eca-admin-new-assignment-error">{error}</p> : null}
                    {loading ? <p className="eca-admin-new-assignment-info">{t("ecaAdmin.assignmentPage.activityLoading")}</p> : null}

                    <button type="submit" className="eca-admin-new-assignment-save-button" disabled={saving || loading || (!isEditMode && !formValid)} >
                        {saving ? (isEditMode ? t("ecaAdmin.assignmentPage.editing") : t("ecaAdmin.assignmentPage.saving")) : t("ecaAdmin.assignmentPage.save")}
                    </button>
                </form>
            </div>
            <div style={{ height: 100 }} />
            {participantModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeParticipantModal}>
                    <div className="eca-assignment-participant-modal" onMouseDown={handleParticipantModalMouseDown}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>{t("ecaAdmin.assignmentPage.participantList")}</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeParticipantModal}     aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-assignment-participant-modal-body">
                            <strong className="eca-assignment-participant-modal-title">{t("ecaAdmin.assignmentPage.selectActivityParticipants")}</strong>

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
                                    placeholder={t("ecaAdmin.assignmentPage.participantSearchExample")}
                                />

                                {participantDropdownOpen ? (
                                    <div className="eca-assignment-participant-dropdown">
                                        <div className="eca-assignment-participant-dropdown-top">
                                            <span>{t("ecaAdmin.assignmentPage.selectedOfTotal", { selected: selectedUserIds.length, total: participants.length })}</span>

                                            <div className="eca-assignment-participant-dropdown-actions">
                                                <button type="button" onClick={resetUsers}>{t("ecaAdmin.reset")}</button>
                                                <button type="button" onClick={selectAllUsers}>{t("ecaAdmin.assignmentPage.selectAll")}</button>
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
                                                        {/* <small>{participant.email}</small> */}
                                                    </label>
                                                );
                                            })}

                                            {filteredParticipants.length === 0 ? (
                                                <p className="eca-assignment-participant-empty">{t("ecaAdmin.noSearchResults")}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer">
                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={closeParticipantModal}>
                                {t("common.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {teamModeModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={() => setTeamModeModalOpen(false)}>
                    <div className="eca-team-mode-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>{t("ecaAdmin.assignmentPage.teamBuilding")}</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={() => setTeamModeModalOpen(false)} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-mode-body">
                            <strong>{t("ecaAdmin.assignmentPage.teamBuildingMode")}</strong>

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
                                    <span>{t("ecaAdmin.assignmentPage.loadPreviousTeam")}</span>
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
                                    <span>{t("ecaAdmin.assignmentPage.createNewTeam")}</span>
                                </label>
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer">
                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={confirmTeamMode}>
                                {t("common.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {existingTeamSelectModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeExistingTeamSelectModal}>
                    <div className="eca-team-existing-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="eca-assignment-participant-modal-header">
                            <h3>{t("ecaAdmin.assignmentPage.teamBuilding")}</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeExistingTeamSelectModal} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-existing-body">
                            <strong>{t("ecaAdmin.assignmentPage.selectAssignmentToLoad")}</strong>

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
                                                        <strong>{t("ecaAdmin.assignmentPage.selectAssignmentToLoad")}</strong>
                                                        <small>{option.teamNames.join(", ")}</small>
                                                    </span>
                                                    <em>{t("ecaAdmin.assignmentPage.teamCountSuffix", { count: option.teamIds.length })}</em>
                                                </button>
                                            );
                                        })}

                                        {matchedExistingAssignmentTeamOptions.length === 0 ? (
                                            <p className="eca-assignment-participant-empty">{t("ecaAdmin.assignmentPage.noMatchingPreviousTeam")}</p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-assignment-participant-modal-footer eca-team-build-footer">
                            <button type="button" className="eca-team-build-back-button" onClick={() => { setExistingTeamListOpen(false); setExistingTeamSelectModalOpen(false); setTeamModeModalOpen(true); }} >
                                {t("common.prev")}
                            </button>

                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={confirmExistingTeamSelect} >
                                {t("common.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {teamCreateModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeTeamCreateModal}>
                    <div className="eca-team-create-modal" onMouseDown={(e) => { e.stopPropagation();  if (!(e.target as HTMLElement).closest(".eca-team-member-picker")) { setTeamMemberDropdownOpen(false); } }} >
                        <div className="eca-assignment-participant-modal-header">
                            <h3>{t("ecaAdmin.assignmentPage.teamBuilding")}</h3>
                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeTeamCreateModal}  aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-create-body">
                            <div className="eca-team-create-field">
                                <label htmlFor="currentTeamName">{t("ecaAdmin.assignmentPage.teamName")}</label>
                                <input
                                    id="currentTeamName"
                                    value={currentTeamName}
                                    onChange={(e) => {
                                        setCurrentTeamName(e.target.value);
                                        setModalError("");
                                    }}
                                    placeholder={t("ecaAdmin.assignmentPage.enterTeamName")}
                                />
                            </div>

                            <div className="eca-team-create-field">
                                <div className="eca-team-create-field-label-row">
                                    <label>{t("ecaAdmin.assignmentPage.selectTeamMembers")}</label>
                                    <span>{t("ecaAdmin.assignmentPage.firstMemberAutoLeader")}</span>
                                </div>
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
                                                placeholder={t("ecaAdmin.assignmentPage.selectPlaceholder")}
                                            />

                                            <button
                                                type="button"
                                                className="eca-team-member-picker-toggle"
                                                onClick={() => {
                                                    setTeamMemberDropdownOpen((prev) => !prev);
                                                    setTeamMemberSearch("");
                                                }}
                                                aria-label={t("ecaAdmin.assignmentPage.openTeamMemberList")}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>

                                        <button type="button" className={"eca-team-create-decide-button" + (currentTeamMemberIds.length > 0 ? " is-active" : "")} onClick={addCurrentTeam}>
                                            {t("ecaAdmin.assignmentPage.decide")}
                                        </button>
                                    </div>

                                    {teamMemberDropdownOpen ? (
                                        <div className="eca-team-member-dropdown">
                                            <div className="eca-team-member-dropdown-top">
                                                <span>{t("ecaAdmin.assignmentPage.selectedOfTotal", { selected: currentTeamMemberIds.length, total: getCurrentAvailableParticipants().length })}</span>

                                                <div className="eca-team-member-dropdown-actions">
                                                    <button type="button" onClick={resetCurrentTeamMembers}>{t("ecaAdmin.reset")}</button>
                                                    <button type="button" onClick={selectAllCurrentAvailableMembers}>{t("ecaAdmin.assignmentPage.selectAll")}</button>
                                                </div>
                                            </div>

                                            <div className="eca-team-member-dropdown-list">
                                                {getCurrentAvailableParticipants().map((participant) => {
                                                    const checked = currentTeamMemberIds.includes(participant.userId);
                                                    const isLeader = checked && currentTeamMemberIds[0] === participant.userId;

                                                    return (
                                                        <label key={participant.userId} className={"eca-team-member-option" + (checked ? " is-selected" : "") + (isLeader ? " is-leader" : "")}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleCurrentTeamMember(participant.userId)} />
                                                            <span className="eca-team-member-checkbox" aria-hidden="true">
                                                                {checked ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                                        <rect width="20" height="20" rx="2" fill={isLeader ? "#FF0000" : "#0166FF"} />
                                                                        <path d="M5 8L8.75281 14.5L14.2376 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                ) : null}
                                                            </span>
                                                            <strong>{participant.name}</strong>
                                                            <span className="eca-team-member-info">
                                                                <b className={isLeader ? "" : "is-empty"}>{t("ecaAdmin.assignmentPage.teamLeader")}</b>
                                                                <small>{participant.email ?? participant.schoolName}</small>
                                                            </span>
                                                        </label>
                                                    );
                                                })}

                                                {getCurrentAvailableParticipants().length === 0 ? (
                                                    <p className="eca-assignment-participant-empty">{t("ecaAdmin.assignmentPage.noAvailableParticipants")}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="eca-team-created-count">
                                    <strong>{draftTeams.length}/{Number(teamCount) || 0}</strong>
                                    <span>{t("ecaAdmin.assignmentPage.teamUnit")}</span>
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
                                {t("common.prev")}
                            </button>

                            <button type="button" className="eca-assignment-participant-confirm-button" onClick={closeTeamCreateModal} disabled={!canConfirmNewTeamBuild}>
                                {t("common.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {teamEditModalOpen ? (
                <div className="eca-assignment-participant-modal-backdrop" onMouseDown={closeTeamEditModal}>
                    <div className="eca-team-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="eca-team-edit-header">
                            <h3>{t("ecaAdmin.assignmentPage.editTeamBuilding")}</h3>

                            <button type="button" className="eca-assignment-participant-modal-close" onClick={closeTeamEditModal} aria-label={t("common.close")} >
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-team-edit-summary">
                            <div>
                                <span>{t("ecaAdmin.assignmentPage.totalTeams")}</span>
                                <strong>{t("ecaAdmin.assignmentPage.countUnit", { count: editableTeams.length })}</strong>  
                            </div>

                            <div>
                                <span>{t("ecaAdmin.assignmentPage.assignedMembers")}</span>
                                <strong>{t("ecaAdmin.countPerson", { count: assignedEditableMemberCount })}</strong>
                            </div>

                            <div>
                                <span>{t("ecaAdmin.assignmentPage.unassignedMembers")}</span>
                                <strong>{t("ecaAdmin.countPerson", { count: unassignedEditableMemberCount })}</strong>
                            </div>
                        </div>
                        {isTeamMemberConfigurationLocked ? (
                            <p className="eca-assignment-team-edit-lock-guide">{t("ecaAdmin.assignmentPage.teamMemberConfigLocked")}</p>
                        ) : null}

                        <div className="eca-team-edit-body">
                            <section className="eca-team-edit-left-panel">
                                <strong className="eca-team-edit-panel-title">{t("ecaAdmin.assignmentPage.teamList")}</strong>

                                <div className="eca-team-edit-team-list">
                                    {editableTeams.map((team) => (
                                        <button
                                            type="button"
                                            key={team.teamClientId}
                                            className={
                                                "eca-team-edit-team-item" +
                                                (selectedEditableTeamClientId === team.teamClientId ? " is-selected" : "")
                                            }
                                            onClick={() => {
                                                setSelectedEditableTeamClientId(team.teamClientId);
                                                setOpenTeamMemberMenuUserId(null);
                                                setTeamEditAddMemberOpen(false);
                                                setTeamEditAddMemberSearch("");
                                            }}
                                        >
                                            {team.name}
                                        </button>
                                    ))}
                                </div>

                                <button type="button" className="eca-team-edit-add-team-button" onClick={addEditableTeam}  disabled={isTeamMemberConfigurationLocked} >
                                        <span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8.00008 2.66699C8.17689 2.66699 8.34646 2.73723 8.47149 2.86225C8.59651 2.98728 8.66675 3.15685 8.66675 3.33366V7.33366H12.6667C12.8436 7.33366 13.0131 7.4039 13.1382 7.52892C13.2632 7.65395 13.3334 7.82351 13.3334 8.00033C13.3334 8.17714 13.2632 8.34671 13.1382 8.47173C13.0131 8.59675 12.8436 8.66699 12.6667 8.66699H8.66675V12.667C8.66675 12.8438 8.59651 13.0134 8.47149 13.1384C8.34646 13.2634 8.17689 13.3337 8.00008 13.3337C7.82327 13.3337 7.6537 13.2634 7.52868 13.1384C7.40365 13.0134 7.33342 12.8438 7.33342 12.667V8.66699H3.33341C3.1566 8.66699 2.98703 8.59675 2.86201 8.47173C2.73699 8.34671 2.66675 8.17714 2.66675 8.00033C2.66675 7.82351 2.73699 7.65395 2.86201 7.52892C2.98703 7.4039 3.1566 7.33366 3.33341 7.33366H7.33342V3.33366C7.33342 3.15685 7.40365 2.98728 7.52868 2.86225C7.6537 2.73723 7.82327 2.66699 8.00008 2.66699Z" fill="#0166FF"/>
                                        </svg>
                                    </span>
                                    {t("ecaAdmin.assignmentPage.addTeam")}
                                </button>
                            </section>

                            <section className="eca-team-edit-right-panel">
                                {selectedEditableTeam ? (
                                    <>
                                        <div className="eca-team-edit-selected-team-head">
                                            <h4>{selectedEditableTeam.name}</h4>

                                            <button type="button" className="eca-team-edit-delete-team-button" onClick={deleteSelectedEditableTeam} disabled={isTeamMemberConfigurationLocked} > 
                                                {t("ecaAdmin.assignmentPage.deleteTeam")}
                                            </button>
                                        </div>

                                        <div className="eca-team-edit-name-field">
                                            <label htmlFor="editableTeamName">{t("ecaAdmin.assignmentPage.teamName")}</label>
                                            <input
                                                id="editableTeamName"
                                                value={selectedEditableTeam.name}
                                                onChange={(e) => {
                                                    const nextName = e.target.value;

                                                    setEditableTeams((prev) =>
                                                        prev.map((team) =>
                                                            team.teamClientId === selectedEditableTeam.teamClientId
                                                                ? { ...team, name: nextName }
                                                                : team
                                                        )
                                                    );
                                                }}
                                            />
                                        </div>

                                        <div className="eca-team-edit-member-section">
                                            <strong>{t("ecaAdmin.assignmentPage.teamMembers")}</strong>

                                            <div className="eca-team-edit-member-list">
                                                {selectedEditableTeam.members.map((member) => (
                                                    <div key={member.userId} className="eca-team-edit-member-row">
                                                        <span>{member.userName}</span>

                                                        {member.role === "LEADER" ? (
                                                            <em>{t("ecaAdmin.assignmentPage.teamLeader")}</em>
                                                        ) : null}

                                                        <div className="eca-team-edit-member-more-wrap" ref={openTeamMemberMenuUserId === member.userId ? teamEditMemberMenuWrapRef : null}>
                                                            <button
                                                                type="button"
                                                                className="eca-team-edit-member-more-button"
                                                                onClick={() => {
                                                                    setOpenTeamMemberMenuUserId((prev) =>
                                                                        prev === member.userId ? null : member.userId
                                                                    );
                                                                }}
                                                                aria-label={t("ecaAdmin.assignmentPage.teamMemberMenu")}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="3" height="13" viewBox="0 0 3 13" fill="none">
                                                                    <circle cx="1.5" cy="1.5" r="1.5" fill="#D9D9D9"/>
                                                                    <circle cx="1.5" cy="6.5" r="1.5" fill="#D9D9D9"/>
                                                                    <circle cx="1.5" cy="11.5" r="1.5" fill="#D9D9D9"/>
                                                                </svg>
                                                            </button>

                                                            {openTeamMemberMenuUserId === member.userId ? (
                                                                <div className="eca-team-edit-member-menu">
                                                                    {member.role !== "LEADER" ? (
                                                                        <button type="button" onClick={() => handleChangeTeamLeader(selectedEditableTeam.teamClientId, member.userId)} >
                                                                            {t("ecaAdmin.assignmentPage.assignAsLeader")}
                                                                        </button>
                                                                    ) : null}

                                                                    <button type="button" onClick={() => openMoveMemberSelect(selectedEditableTeam.teamClientId, member)} disabled={isTeamMemberConfigurationLocked}>
                                                                        {t("ecaAdmin.assignmentPage.moveToAnotherTeam")}
                                                                    </button>

                                                                    <button type="button" onClick={() => handleRemoveEditableTeamMember(selectedEditableTeam.teamClientId, member)}disabled={isTeamMemberConfigurationLocked}>
                                                                        {t("ecaAdmin.assignmentPage.removeFromTeam")}
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="eca-team-edit-add-member-wrap" ref={teamEditAddMemberWrapRef}>
                                                <button type="button" className="eca-team-edit-add-member-button" onClick={() => setTeamEditAddMemberOpen((prev) => !prev)} disabled={isTeamMemberConfigurationLocked}>
                                                    <span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <path d="M8.00008 2.66699C8.17689 2.66699 8.34646 2.73723 8.47149 2.86225C8.59651 2.98728 8.66675 3.15685 8.66675 3.33366V7.33366H12.6667C12.8436 7.33366 13.0131 7.4039 13.1382 7.52892C13.2632 7.65395 13.3334 7.82351 13.3334 8.00033C13.3334 8.17714 13.2632 8.34671 13.1382 8.47173C13.0131 8.59675 12.8436 8.66699 12.6667 8.66699H8.66675V12.667C8.66675 12.8438 8.59651 13.0134 8.47149 13.1384C8.34646 13.2634 8.17689 13.3337 8.00008 13.3337C7.82327 13.3337 7.6537 13.2634 7.52868 13.1384C7.40365 13.0134 7.33342 12.8438 7.33342 12.667V8.66699H3.33341C3.1566 8.66699 2.98703 8.59675 2.86201 8.47173C2.73698 8.34671 2.66675 8.17714 2.66675 8.00033C2.66675 7.82351 2.73698 7.65395 2.86201 7.52892C2.98703 7.4039 3.1566 7.33366 3.33341 7.33366H7.33342V3.33366C7.33342 3.15685 7.40365 2.98728 7.52868 2.86225C7.6537 2.73723 7.82327 2.66699 8.00008 2.66699Z" fill="#0166FF"/>
                                                        </svg>
                                                    </span>
                                                    {t("ecaAdmin.assignmentPage.removeFromTeam")}
                                                </button>

                                                {teamEditAddMemberOpen && selectedEditableTeam ? (
                                                    <div className="eca-team-edit-add-member-dropdown">
                                                        <input
                                                            type="text"
                                                            value={teamEditAddMemberSearch}
                                                            onChange={(e) => setTeamEditAddMemberSearch(e.target.value)}
                                                            placeholder={t("ecaAdmin.assignmentPage.searchParticipantToAdd")}
                                                        />

                                                        <div className="eca-team-edit-add-member-list">
                                                            {filteredUnassignedEditableParticipants.map((participant) => (
                                                                <button type="button" key={participant.userId} onClick={() => handleAddEditableTeamMember(selectedEditableTeam.teamClientId, participant)} >
                                                                    <strong>{participant.name}</strong>
                                                                    <span>{participant.email ?? participant.schoolName}</span>
                                                                </button>
                                                            ))}

                                                            {filteredUnassignedEditableParticipants.length === 0 ? (
                                                                <p>{t("ecaAdmin.assignmentPage.noAddableParticipants")}</p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="eca-admin-new-assignment-empty">{t("ecaAdmin.assignmentPage.noTeamsToDisplay")}</p>
                                )}
                            </section>
                        </div>

                        {movingMember ? (
                            <div className="eca-team-edit-move-panel">
                                <strong>{t("ecaAdmin.assignmentPage.moveMemberTargetTeam", { name: movingMember.userName })}</strong>

                                <div className="eca-team-edit-move-row">
                                    <select
                                        value={moveTargetTeamClientId ?? ""}
                                        onChange={(e) => setMoveTargetTeamClientId(e.target.value || null)}
                                    >
                                        {editableTeams
                                            .filter((team) => team.teamClientId !== movingMember.sourceTeamClientId)
                                            .map((team) => (
                                                <option key={team.teamClientId} value={team.teamClientId}>
                                                    {team.name}
                                                </option>
                                            ))}
                                    </select>

                                    <button type="button" onClick={confirmMoveMember} disabled={!moveTargetTeamClientId || teamEditSaving}> 
                                        {t("common.move")}
                                    </button>

                                    <button type="button" onClick={() => { setMovingMember(null); setMoveTargetTeamClientId(null); }}>
                                        {t("common.cancel")}
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="eca-team-edit-footer">
                            <button type="button" className="eca-team-edit-cancel-button" onClick={closeTeamEditModal} disabled={teamEditSaving}>
                                {t("common.cancel")}
                            </button>

                            <button type="button" className="eca-team-edit-confirm-button" onClick={handleConfirmTeamEdit} disabled={teamEditSaving || unassignedEditableMemberCount > 0} >
                                {teamEditSaving ? t("ecaAdmin.assignmentPage.saving") : t("common.confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}