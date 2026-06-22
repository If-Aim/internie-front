import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { createAttendanceEvent, downloadAttendanceExcel, getAttendanceEvents, getAttendanceParticipants, getAttendanceSummary } from "../../../../../../api/ea";
import type { AttendanceEventResponse, AttendanceEventType, AttendanceEventSort, AttendanceParticipantRateResponse, AttendanceParticipantSort, AttendanceSummaryResponse } from "../../../../../../api/ea";
import { addMinutesToServerKstDateTime, formatServerKstDateTimeDateLabelForUser, formatServerKstDateTimeTimeForUser, localDateTimeInputToServerKstParts, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import AdminStudentProfileModal from "../AdminStudentProfileModal";
import type { AdminStudentProfile } from "../AdminStudentProfileModal";
import "./attendance.css";
import "../../ecaCalendar.css"

const ATTENDANCE_T = "ecaAdmin.attendancePage";

type SortOption<T extends string> = {
    labelKey: string;
    value: T;
};

type AttendanceStudentProfileSource = AttendanceParticipantRateResponse & {
    nickname?: string | null;
    userNickname?: string | null;
    linkedinUrl?: string | null;
    userLinkedinUrl?: string | null;
};

function toAdminStudentProfile(item: AttendanceParticipantRateResponse, fallbackName: string): AdminStudentProfile {
    const source = item as AttendanceStudentProfileSource;
    const nickname = source.nickname?.trim() || source.userNickname?.trim() || null;
    const linkedinUrl = source.linkedinUrl?.trim() || source.userLinkedinUrl?.trim() || null;

    return {
        name: item.name?.trim() || fallbackName,
        nickname,
        linkedinUrl,
        profileImage: item.profileImage ?? null,
    };
}

const eventSortOptions: SortOption<AttendanceEventSort>[] = [
    { labelKey: "sort.newest", value: "latest" },
    { labelKey: "sort.oldest", value: "oldest" },
    { labelKey: "sort.highest", value: "rateDesc" },
    { labelKey: "sort.lowest", value: "rateAsc" },
];

const participantSortOptions: SortOption<AttendanceParticipantSort>[] = [
    { labelKey: "sort.alphabetical", value: "nameAsc" },
    { labelKey: "sort.highest", value: "rateDesc" },
    { labelKey: "sort.lowest", value: "rateAsc" },
];

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function stripCreateDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCreateDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addCreateMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatCreateDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseCreateDateInput(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    const fallback = stripCreateDate(new Date());

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return fallback;
    }

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    return stripCreateDate(date);
}

function formatCreateDateButtonLabel(value: string, locale: string): string {
    const date = parseCreateDateInput(value);

    return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function getCreateMonthGrid(cursor: Date): { month: number; days: Date[] } {
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

function AttendanceCreateCalendar({
    value,
    onChange,
    onClose,
    calendarLocale,
    previousMonthLabel,
    nextMonthLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    calendarLocale: string;
    previousMonthLabel: string;
    nextMonthLabel: string;
}): React.ReactElement {
    const selectedDate = parseCreateDateInput(value);
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const [cursor, setCursor] = React.useState(() => new Date(selectedYear, selectedMonth, 1));
    const calendarRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        setCursor(new Date(selectedYear, selectedMonth, 1));
    }, [selectedYear, selectedMonth]);

    React.useEffect(() => {
        function handleMouseDown(event: MouseEvent): void {
            if (!calendarRef.current) return;
            if (calendarRef.current.contains(event.target as Node)) return;

            onClose();
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [onClose]);

    const { month, days } = getCreateMonthGrid(cursor);
    const isSixWeeks = days.length === 42;
    const title = new Intl.DateTimeFormat(calendarLocale, { month: "long", year: "numeric" }).format(cursor);

    return (
        <div ref={calendarRef} className={"eca-cal" + (isSixWeeks ? " eca-cal--6w" : " eca-cal--5w")}>
            <div className="eca-cal-header">
                <div className="eca-cal-header-bottom">
                    <div className="eca-cal-title">{title}</div>
                    <div className="eca-cal-nav">
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addCreateMonths(cursor, -1))} aria-label={previousMonthLabel}>
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="eca-cal-nav-btn" onClick={() => setCursor(addCreateMonths(cursor, 1))} aria-label={nextMonthLabel}>
                            <img className="icon" src="/icons/Next (Stroke).svg" alt="" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="eca-cal-body">
                <div className="eca-cal-week">
                    {WEEK_LABELS.map((weekday) => (
                        <div key={weekday} className="eca-cal-weekday">{weekday}</div>
                    ))}
                </div>

                <div className="eca-cal-grid">
                    {days.map((day) => {
                        const inMonth = day.getMonth() === month;
                        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

                        if (!inMonth) {
                            return <div key={key} className="eca-cal-cell eca-cal-cell--empty" aria-hidden="true" />;
                        }

                        const normalizedDay = stripCreateDate(day);
                        const selected = isSameCreateDay(normalizedDay, selectedDate);

                        return (
                            <div key={key} className={"eca-cal-cell" + (selected ? " is-start is-end" : "")}>
                                <button
                                    type="button"
                                    className={"eca-cal-day" + (selected ? " is-selected" : "")}
                                    onClick={() => {
                                        onChange(formatCreateDateInput(normalizedDay));
                                        onClose();
                                    }}
                                >
                                    {normalizedDay.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function DownloadIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M11.625 15.513C11.5083 15.471 11.4 15.4 11.3 15.3L7.7 11.7C7.5 11.5 7.404 11.2667 7.412 11C7.42 10.7333 7.516 10.5 7.7 10.3C7.9 10.1 8.13767 9.996 8.413 9.988C8.68833 9.98 8.92567 10.0757 9.125 10.275L11 12.15V5C11 4.71667 11.096 4.47934 11.288 4.288C11.48 4.09667 11.7173 4.00067 12 4C12.2827 3.99934 12.5203 4.09534 12.713 4.288C12.9057 4.48067 13.0013 4.718 13 5V12.15L14.875 10.275C15.075 10.075 15.3127 9.979 15.588 9.987C15.8633 9.995 16.1007 10.0993 16.3 10.3C16.4833 10.5 16.5793 10.7333 16.588 11C16.5967 11.2667 16.5007 11.5 16.3 11.7L12.7 15.3C12.6 15.4 12.4917 15.471 12.375 15.513C12.2583 15.555 12.1333 15.5757 12 15.575C11.8667 15.5743 11.7417 15.5537 11.625 15.513ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.19667 19.0217 4.00067 18.5507 4 18V16C4 15.7167 4.096 15.4793 4.288 15.288C4.48 15.0967 4.71733 15.0007 5 15C5.28267 14.9993 5.52033 15.0953 5.713 15.288C5.90567 15.4807 6.00133 15.718 6 16V18H18V16C18 15.7167 18.096 15.4793 18.288 15.288C18.48 15.0967 18.7173 15.0007 19 15C19.2827 14.9993 19.5203 15.0953 19.713 15.288C19.9057 15.4807 20.0013 15.718 20 16V18C20 18.55 19.8043 19.021 19.413 19.413C19.0217 19.805 18.5507 20.0007 18 20H6Z" fill="#A0A0A0"/>
        </svg>
    );
}

function SearchIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.5005 13.9995H14.7105L14.4305 13.7295C15.0554 13.0035 15.5122 12.1483 15.768 11.2251C16.0239 10.3019 16.0725 9.33364 15.9105 8.38949C15.4405 5.60949 13.1205 3.38949 10.3205 3.04949C9.33608 2.92495 8.33625 3.02726 7.39749 3.34858C6.45872 3.66989 5.60591 4.20171 4.90429 4.90332C4.20268 5.60493 3.67087 6.45775 3.34955 7.39651C3.02823 8.33527 2.92593 9.3351 3.05046 10.3195C3.39046 13.1195 5.61046 15.4395 8.39046 15.9095C9.33462 16.0715 10.3029 16.0229 11.2261 15.767C12.1492 15.5112 13.0044 15.0544 13.7305 14.4295L14.0005 14.7095V15.4995L18.2505 19.7495C18.6605 20.1595 19.3305 20.1595 19.7405 19.7495C20.1505 19.3395 20.1505 18.6695 19.7405 18.2595L15.5005 13.9995ZM9.50046 13.9995C7.01046 13.9995 5.00046 11.9895 5.00046 9.49949C5.00046 7.00949 7.01046 4.99949 9.50046 4.99949C11.9905 4.99949 14.0005 7.00949 14.0005 9.49949C14.0005 11.9895 11.9905 13.9995 9.50046 13.9995Z" fill="#A0A0A0"/>
        </svg>
    );
}

function ChevronIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowRightIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function PlusIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#D9D9D9" />
            <path d="M12 7V17M17 12H7" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function getEventTypeLabel(type: AttendanceEventResponse["type"], t: TFunction): string {
    return type === "CLASS_START" ? t(`${ATTENDANCE_T}.start`) : t(`${ATTENDANCE_T}.end`);
}

function getEventReferenceTimeLabel(value?: string | null): string {
    return formatServerKstDateTimeTimeForUser(value);
}

function getEventDateLabel(value?: string | null): string {
    return formatServerKstDateTimeDateLabelForUser(value);
}

function getPercentLabel(value?: number | null): string {
    if (value === null || value === undefined) {
        return "-";
    }

    return `${value}%`;
}

function getTodayDateInput(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${date}`;
}

function getAutoAttendanceName(date: string, t: TFunction): string {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return t(`${ATTENDANCE_T}.attendancePanelTitle`);
    }

    return t(`${ATTENDANCE_T}.autoAttendanceName`, {
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
    });
}

function getDetailDateLabelForCreate(value: string, locale: string): string {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Attendance";
    }

    return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function getAutoRoundNumber(events: AttendanceEventResponse[], eventDate: string): number {
    const sameDateEvent = events.find((event) => event.eventDate === eventDate);

    if (sameDateEvent) {
        return sameDateEvent.roundNumber;
    }

    const maxRoundNumber = events.reduce((max, event) => Math.max(max, event.roundNumber), 0);

    return maxRoundNumber + 1;
}

function getFullCreditBoundaryTime(item: AttendanceEventResponse): number | null {
    const reference = parseServerKstDateTime(item.scoreReferenceAt);

    if (!reference) {
        return null;
    }

    const fullCreditMinutes = item.fullCreditThresholdMinutes ?? item.durationMinutes;

    return reference.getTime() + fullCreditMinutes * 60 * 1000;
}

function getComputedEventProgress(item: AttendanceEventResponse, now: Date): AttendanceEventResponse["progress"] {
    const start = parseServerKstDateTime(item.uploadWindowStart);
    const end = parseServerKstDateTime(item.uploadWindowEnd);

    if (!start || !end) {
        return item.progress;
    }

    if (now.getTime() < start.getTime()) {
        return "SCHEDULED";
    }

    if (now.getTime() > end.getTime()) {
        return "CLOSED";
    }

    return "OPEN";
}

function isAttendanceTimerRunning(item: AttendanceEventResponse, now: Date): boolean {
    const progress = getComputedEventProgress(item, now);
    const reference = parseServerKstDateTime(item.scoreReferenceAt);
    const boundaryTime = getFullCreditBoundaryTime(item);

    if (progress !== "OPEN" || !reference || boundaryTime === null) {
        return false;
    }

    return now.getTime() >= reference.getTime() && now.getTime() < boundaryTime;
}

function getEventStatusLabel(item: AttendanceEventResponse, now: Date, t: TFunction): string {
    const progress = getComputedEventProgress(item, now);

    if (isAttendanceTimerRunning(item, now)) {
        return t(`${ATTENDANCE_T}.inProgress`);
    }

    if (progress === "SCHEDULED") {
        return t(`${ATTENDANCE_T}.scheduled`);
    }

    return `${item.attendanceRatePercent}%`;
}

function getEventStatusClassName(item: AttendanceEventResponse, now: Date): string {
    const progress = getComputedEventProgress(item, now);

    if (isAttendanceTimerRunning(item, now)) {
        return "eca-admin-attendance-event-status eca-admin-attendance-event-status--progress";
    }

    if (progress === "SCHEDULED") {
        return "eca-admin-attendance-event-status eca-admin-attendance-event-status--scheduled";
    }

    return "eca-admin-attendance-event-status eca-admin-attendance-event-status--rate";
}

function toTwentyFourHourTime(hour: string, minute: string, period: "AM" | "PM"): string {
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);

    if (!Number.isFinite(parsedHour) || !Number.isFinite(parsedMinute)) {
        return "";
    }

    if (parsedHour < 1 || parsedHour > 12 || parsedMinute < 0 || parsedMinute > 59) {
        return "";
    }

    let hour24 = parsedHour;

    if (period === "AM" && parsedHour === 12) {
        hour24 = 0;
    }

    if (period === "PM" && parsedHour !== 12) {
        hour24 = parsedHour + 12;
    }

    return `${String(hour24).padStart(2, "0")}:${String(parsedMinute).padStart(2, "0")}`;
}

function SortMenu<T extends string>({
    open,
    value,
    options,
    onSelect,
    t,
}: {
    open: boolean;
    value: T;
    options: SortOption<T>[];
    onSelect: (value: T) => void;
    t: TFunction;
}): React.ReactElement | null {
    if (!open) {
        return null;
    }

    return (
        <div className="eca-admin-attendance-sort-menu">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={option.value === value ? "eca-admin-attendance-sort-menu-item eca-admin-attendance-sort-menu-item--active" : "eca-admin-attendance-sort-menu-item"}
                    onClick={() => onSelect(option.value)}
                >
                    {t(`${ATTENDANCE_T}.${option.labelKey}`)}
                </button>
            ))}
        </div>
    );
}

export default function EcaAttendancePage(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const calendarLocale = i18n.language?.startsWith("ko") ? "ko-KR" : "en-US";
    
    const { externalActivityId } = useParams<{ externalActivityId: string }>();
    const [createModalOpen, setCreateModalOpen] = React.useState(false);
    const [createStep, setCreateStep] = React.useState<1 | 2>(1);
    const [createType, setCreateType] = React.useState<AttendanceEventType>("CLASS_START");
    const [createFullCreditMinutes, setCreateFullCreditMinutes] = React.useState<"5" | "15">("5");
    const [createDatePickerOpen, setCreateDatePickerOpen] = React.useState(false);
    const [createDate, setCreateDate] = React.useState(getTodayDateInput());
    const [createStartHour, setCreateStartHour] = React.useState("09");
    const [createStartMinute, setCreateStartMinute] = React.useState("00");
    const [createStartPeriod, setCreateStartPeriod] = React.useState<"AM" | "PM">("AM");
    const [createError, setCreateError] = React.useState("");
    const [creating, setCreating] = React.useState(false);
    const [summary, setSummary] = React.useState<AttendanceSummaryResponse | null>(null);
    const [events, setEvents] = React.useState<AttendanceEventResponse[]>([]);
    const [participants, setParticipants] = React.useState<AttendanceParticipantRateResponse[]>([]);
    const [selectedStudentProfile, setSelectedStudentProfile] = React.useState<AdminStudentProfile | null>(null);

    const [eventSort, setEventSort] = React.useState<AttendanceEventSort>("latest");
    const [participantSort, setParticipantSort] = React.useState<AttendanceParticipantSort>("nameAsc");
    const [participantSearch, setParticipantSearch] = React.useState("");
    const [participantSearchDraft, setParticipantSearchDraft] = React.useState("");
    const [eventSortOpen, setEventSortOpen] = React.useState(false);
    const [participantSortOpen, setParticipantSortOpen] = React.useState(false);
    const [participantSearchOpen, setParticipantSearchOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [downloading, setDownloading] = React.useState(false);
    const [now, setNow] = React.useState(new Date());
    const [errorMessage, setErrorMessage] = React.useState("");
        
    const eventListRef = React.useRef<HTMLDivElement | null>(null);
    const participantListRef = React.useRef<HTMLDivElement | null>(null);
    const participantSearchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const [eventListScrollable, setEventListScrollable] = React.useState(false);
    const [participantListScrollable, setParticipantListScrollable] = React.useState(false);

    const selectedEventSortOption = eventSortOptions.find((option) => option.value === eventSort);
    const selectedParticipantSortOption = participantSortOptions.find((option) => option.value === participantSort);
    const selectedEventSortLabel = selectedEventSortOption ? t(`${ATTENDANCE_T}.${selectedEventSortOption.labelKey}`) : t(`${ATTENDANCE_T}.sort.newest`);
    const selectedParticipantSortLabel = selectedParticipantSortOption ? t(`${ATTENDANCE_T}.${selectedParticipantSortOption.labelKey}`) : t(`${ATTENDANCE_T}.sort.alphabetical`);

    const loadAttendanceData = React.useCallback(async (): Promise<void> => {
        if (!externalActivityId) {
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const [summaryResult, eventResult, participantResult] = await Promise.all([
                getAttendanceSummary(externalActivityId),
                getAttendanceEvents(externalActivityId, eventSort),
                getAttendanceParticipants(externalActivityId, {
                    search: participantSearch,
                    sort: participantSort,
                }),
            ]);

            setSummary(summaryResult);
            setEvents(eventResult);
            setParticipants(participantResult);
        } catch (error) {
            console.error(error);
            setSummary(null);
            setEvents([]);
            setParticipants([]);
            setErrorMessage(t(`${ATTENDANCE_T}.attendanceLoadFailed`));
        } finally {
            setLoading(false);
        }
    }, [externalActivityId, eventSort, participantSort, participantSearch, t, i18n.language]);

    React.useEffect(() => {
        void loadAttendanceData();
    }, [loadAttendanceData]);

    React.useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    React.useEffect(() => {
        if (!participantSearchOpen) {
            return;
        }

        function handleMouseDown(event: MouseEvent): void {
            if (participantSearchWrapRef.current?.contains(event.target as Node)) {
                return;
            }

            setParticipantSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [participantSearchOpen]);

    React.useEffect(() => {
        function syncScrollable(): void {
            const element = eventListRef.current;

            if (!element) {
                setEventListScrollable(false);
                return;
            }

            setEventListScrollable(element.scrollHeight > element.clientHeight + 1);
        }

        const frameId = window.requestAnimationFrame(syncScrollable);
        const resizeObserver = new ResizeObserver(syncScrollable);
        const element = eventListRef.current;

        if (element) {
            resizeObserver.observe(element);
        }

        window.addEventListener("resize", syncScrollable);

        return () => {
            window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            window.removeEventListener("resize", syncScrollable);
        };
    }, [events, loading, errorMessage]);

    React.useEffect(() => {
        function syncScrollable(): void {
            const element = participantListRef.current;

            if (!element) {
                setParticipantListScrollable(false);
                return;
            }

            setParticipantListScrollable(element.scrollHeight > element.clientHeight + 1);
        }

        const frameId = window.requestAnimationFrame(syncScrollable);
        const resizeObserver = new ResizeObserver(syncScrollable);
        const element = participantListRef.current;

        if (element) {
            resizeObserver.observe(element);
        }

        window.addEventListener("resize", syncScrollable);

        return () => {
            window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            window.removeEventListener("resize", syncScrollable);
        };
    }, [participants, loading, participantSearch]);

    function closeFloatingMenus(): void {
        setEventSortOpen(false);
        setParticipantSortOpen(false);
    }

    function handleOpenParticipantSearch(): void {
        setParticipantSearchDraft(participantSearch);
        setParticipantSearchOpen((prev) => !prev);
        setEventSortOpen(false);
        setParticipantSortOpen(false);
    }

    function handleChangeCreateStartHour(value: string): void {
        const nextValue = value.replace(/\D/g, "").slice(0, 2);

        if (!nextValue) {
            setCreateStartHour("");
            return;
        }

        const parsedHour = Number(nextValue);

        if (parsedHour >= 13) {
            alert(t(`${ATTENDANCE_T}.create.hourRangeAlert`));
            return;
        }

        setCreateStartHour(nextValue);
    }

    function handleChangeCreateStartMinute(value: string): void {
        const nextValue = value.replace(/\D/g, "").slice(0, 2);

        if (!nextValue) {
            setCreateStartMinute("");
            return;
        }

        const parsedMinute = Number(nextValue);

        if (parsedMinute >= 60) {
            alert(t(`${ATTENDANCE_T}.create.minuteRangeAlert`));
            return;
        }

        setCreateStartMinute(nextValue);
    }

    async function handleDownloadExcel(): Promise<void> {
        if (!externalActivityId || downloading) {
            return;
        }

        setDownloading(true);

        try {
            await downloadAttendanceExcel(externalActivityId);
        } catch (error) {
            console.error(error);
            alert(t(`${ATTENDANCE_T}.attendanceDownloadFailed`));
        } finally {
            setDownloading(false);
        }
    }

    function handleOpenCreateModal(): void {
        setCreateStep(1);
        setCreateType("CLASS_START");
        setCreateFullCreditMinutes("5");
        setCreateDate(getTodayDateInput());
        setCreateStartHour("09");
        setCreateStartMinute("00");
        setCreateStartPeriod("AM");
        setCreateError("");
        setCreateDatePickerOpen(false);
        setCreateModalOpen(true);
    }

    function handleCloseCreateModal(): void {
        setCreateModalOpen(false);
        setCreateError("");
        setCreateDatePickerOpen(false);
    }

    function handleNextCreateStep(): void {
        if (!createDate) {
            setCreateError(t(`${ATTENDANCE_T}.create.dateRequired`));
            return;
        }

        setCreateError("");
        setCreateDatePickerOpen(false);
        setCreateStep(2);
    }

    async function handleCreateAttendanceEvent(): Promise<void> {
        if (!externalActivityId || creating) {
            return;
        }

        const attendanceStartTime = toTwentyFourHourTime(createStartHour, createStartMinute, createStartPeriod);
        const fullCreditMinutes = Number(createFullCreditMinutes);

        const parsedHour = Number(createStartHour);
        const parsedMinute = Number(createStartMinute);

        if (!Number.isFinite(parsedHour) || parsedHour < 1 || parsedHour > 12) {
            setCreateError(t(`${ATTENDANCE_T}.create.durationRequired`));
            return;
        }

        if (!Number.isFinite(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
            alert(t(`${ATTENDANCE_T}.create.minuteRangeAlert`));
            return;
        }

        if (!createDate || !attendanceStartTime) {
            setCreateError(t(`${ATTENDANCE_T}.create.dateTimeRequired`));
            return;
        }

        if (!Number.isFinite(fullCreditMinutes) || fullCreditMinutes <= 0) {
            setCreateError(t(`${ATTENDANCE_T}.create.durationRequired`));
            return;
        }

        const scoreReferenceParts = localDateTimeInputToServerKstParts(createDate, attendanceStartTime);
        const scoreReferenceAt = scoreReferenceParts.dateTime;
        const eventDate = scoreReferenceParts.date;
        const scoreReferenceDateTime = parseServerKstDateTime(scoreReferenceAt);
        const halfCreditMinutes = 60;
        const uploadWindowStart = createType === "CLASS_END" ? addMinutesToServerKstDateTime(scoreReferenceAt, -halfCreditMinutes) : scoreReferenceAt;

        if (!scoreReferenceDateTime) {
            setCreateError(t(`${ATTENDANCE_T}.create.invalidReferenceTime`));
            return;
        }

        setCreating(true);
        setCreateError("");

        try {
            await createAttendanceEvent(externalActivityId, {
                roundNumber: getAutoRoundNumber(events, eventDate),
                name: getAutoAttendanceName(eventDate, t),
                eventDate,
                type: createType,
                uploadWindowStart,
                scoreReferenceAt,
                durationMinutes: 60,
                fullCreditThresholdMinutes: fullCreditMinutes,
                partialCreditThresholdMinutes: 30,
                halfCreditThresholdMinutes: halfCreditMinutes,
            });

            setCreateModalOpen(false);
            await loadAttendanceData();
        } catch (error) {
            console.error(error);
            setCreateError(t(`${ATTENDANCE_T}.create.createFailed`));
        } finally {
            setCreating(false);
        }
    }

    function handleMoveDetail(eventId: number): void {
        if (!externalActivityId) {
            return;
        }

        navigate(`/program-admin/activities/${externalActivityId}/attendance/${eventId}`);
    }

    return (
        <div className="eca-admin-attendance-page">
            {(eventSortOpen || participantSortOpen) ? (
                <button type="button" className="eca-admin-attendance-floating-backdrop" aria-label="close dropdown" onClick={closeFloatingMenus} />
            ) : null}

            <div className="eca-admin-attendance-page-inner">
                <h1 className="eca-admin-attendance-title">{t(`${ATTENDANCE_T}.title`)}</h1>

                <section className="eca-admin-attendance-summary-grid">
                    <article className="eca-admin-attendance-summary-card">
                        <span className="eca-admin-attendance-summary-label">{t(`${ATTENDANCE_T}.roster`)}</span>
                        <strong className="eca-admin-attendance-summary-value">{summary?.totalParticipantCount ?? 0}</strong>
                    </article>

                    <article className="eca-admin-attendance-summary-card">
                        <span className="eca-admin-attendance-summary-label">{t(`${ATTENDANCE_T}.attendanceRequirement`)}</span>
                        <strong className="eca-admin-attendance-summary-value">{getPercentLabel(summary?.attendanceMinimumRate)} <span className="eca-admin-attendance-summary-arrow">↑</span></strong>
                    </article>

                    <article className="eca-admin-attendance-summary-card">
                        <span className="eca-admin-attendance-summary-label">{t(`${ATTENDANCE_T}.averageAttendanceRate`)}</span>
                        <strong className="eca-admin-attendance-summary-value">{getPercentLabel(summary?.averageAttendanceRate)}</strong>
                    </article>

                    <article className="eca-admin-attendance-summary-card">
                        <span className="eca-admin-attendance-summary-label">{t(`${ATTENDANCE_T}.studentsAtRisk`)}</span>
                        <strong className="eca-admin-attendance-summary-value">{summary?.belowThresholdCount ?? 0}</strong>
                    </article>
                </section>

                <section className="eca-admin-attendance-content-grid">
                    <article className={eventListScrollable ? "eca-admin-attendance-panel eca-admin-attendance-events-panel eca-admin-attendance-panel--scrollable" : "eca-admin-attendance-panel eca-admin-attendance-events-panel"}>
                        <div className="eca-admin-attendance-panel-header">
                            <h2 className="eca-admin-attendance-panel-title">{t(`${ATTENDANCE_T}.attendancePanelTitle`)}</h2>

                            <div className="eca-admin-attendance-panel-actions">
                                <button type="button" className="eca-admin-attendance-icon-button" aria-label={t(`${ATTENDANCE_T}.downloadAria`)} onClick={handleDownloadExcel} disabled={downloading}>
                                    <DownloadIcon />
                                </button>

                                <div className="eca-admin-attendance-sort-wrap">
                                    <button type="button" className="eca-admin-attendance-sort-button" onClick={() => { setEventSortOpen((prev) => !prev); setParticipantSortOpen(false);}}>
                                        <span>{selectedEventSortLabel}</span>
                                        <ChevronIcon />
                                    </button>

                                    <SortMenu
                                        open={eventSortOpen}
                                        value={eventSort}
                                        options={eventSortOptions}
                                        t={t}
                                        onSelect={(value) => {
                                            setEventSort(value);
                                            setEventSortOpen(false);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="button" className="eca-admin-attendance-create-event-button" onClick={handleOpenCreateModal}>
                            <PlusIcon />
                            <span>{t(`${ATTENDANCE_T}.createAttendanceButton`)}</span>
                        </button>

                        {errorMessage ? (
                            <p className="eca-admin-attendance-error">{errorMessage}</p>
                        ) : null}

                        <div ref={eventListRef} className="eca-admin-attendance-event-list">
                            {loading ? (
                                <p className="eca-admin-attendance-empty-text">{t(`${ATTENDANCE_T}.loading`)}</p>
                            ) : events.length === 0 ? (
                                <p className="eca-admin-attendance-empty-text">{t(`${ATTENDANCE_T}.noAttendanceEvents`)}</p>
                            ) : (
                                events.map((item) => (
                                    <button key={item.eventId} type="button" className="eca-admin-attendance-event-row" onClick={() => handleMoveDetail(item.eventId)}>
                                        <span className="eca-admin-attendance-event-date">{getEventDateLabel(item.scoreReferenceAt)}</span>
                                        <span className="eca-admin-attendance-event-type">
                                            {getEventTypeLabel(item.type, t)}, {getEventReferenceTimeLabel(item.scoreReferenceAt)}
                                        </span>
                                        <span className={getEventStatusClassName(item, now)}>{getEventStatusLabel(item, now, t)}</span>
                                        <div className="eca-admin-attendance-event-arrow"><ArrowRightIcon /></div>
                                    </button>
                                ))
                            )}
                        </div>
                    </article>

                    <article className={participantListScrollable ? "eca-admin-attendance-panel eca-admin-attendance-participants-panel eca-admin-attendance-panel--scrollable" : "eca-admin-attendance-panel eca-admin-attendance-participants-panel"}>
                        <div className="eca-admin-attendance-panel-header">
                            <h2 className="eca-admin-attendance-panel-title">{t(`${ATTENDANCE_T}.participantsTitle`, { count: summary?.totalParticipantCount ?? participants.length })}</h2>

                            <div className="eca-admin-attendance-panel-actions">
                                <div className="eca-admin-attendance-search-wrap" ref={participantSearchWrapRef}>
                                    <button type="button" className={participantSearch ? "eca-admin-attendance-icon-button eca-admin-attendance-icon-button--active" : "eca-admin-attendance-icon-button"} aria-label={t(`${ATTENDANCE_T}.searchParticipantsAria`)} onClick={handleOpenParticipantSearch}>
                                        <SearchIcon />
                                    </button>

                                    {participantSearchOpen ? (
                                        <div className="eca-admin-attendance-search-popover">
                                            <input
                                                autoFocus
                                                value={participantSearchDraft}
                                                placeholder={t(`${ATTENDANCE_T}.searchStudentPlaceholder`)}
                                                onChange={(event) => {
                                                    const value = event.target.value;

                                                    setParticipantSearchDraft(value);
                                                    setParticipantSearch(value.trim());
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        setParticipantSearch(participantSearchDraft.trim());
                                                        setParticipantSearchOpen(false);
                                                    }

                                                    if (event.key === "Escape") {
                                                        setParticipantSearchOpen(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <div className="eca-admin-attendance-sort-wrap">
                                    <button type="button" className="eca-admin-attendance-sort-button" onClick={() => { setParticipantSortOpen((prev) => !prev); setEventSortOpen(false); }}>
                                        <span>{selectedParticipantSortLabel}</span>
                                        <ChevronIcon />
                                    </button>

                                    <SortMenu
                                        open={participantSortOpen}
                                        value={participantSort}
                                        options={participantSortOptions}
                                        t={t}
                                        onSelect={(value) => {
                                            setParticipantSort(value);
                                            setParticipantSortOpen(false);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div ref={participantListRef} className="eca-admin-attendance-participant-list">
                            {loading ? (
                                <p className="eca-admin-attendance-empty-text">{t(`${ATTENDANCE_T}.loading`)}</p>
                            ) : participants.length === 0 ? (
                                <p className="eca-admin-attendance-empty-text">{t(`${ATTENDANCE_T}.noParticipants`)}</p>
                            ) : (
                                participants.map((item) => (
                                    <button key={item.userId} type="button" className="eca-admin-attendance-participant-row" onClick={() => setSelectedStudentProfile(toAdminStudentProfile(item, t(`${ATTENDANCE_T}.noName`)))}>
                                        <span className="eca-admin-attendance-participant-avatar">
                                            {item.profileImage ? (
                                                <img src={item.profileImage} alt="" className="eca-admin-attendance-participant-avatar-image" />
                                            ) : null}
                                        </span>
                                        <strong className="eca-admin-attendance-participant-name">{item.name}</strong>
                                        <span className="eca-admin-attendance-participant-rate">
                                            {t(`${ATTENDANCE_T}.attendanceRatePrefix`)} <b className={item.thresholdMet ? "eca-admin-attendance-rate-blue" : "eca-admin-attendance-rate-red"}>{item.cumulativeRate}%</b>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </article>
                </section>
            </div>
            {createModalOpen ? (
                <div className="eca-admin-attendance-create-modal-backdrop" onMouseDown={handleCloseCreateModal}>
                    <section className="eca-admin-attendance-create-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="eca-admin-attendance-create-progress">
                            <span className="eca-admin-attendance-create-progress-bar eca-admin-attendance-create-progress-bar--active" />
                            <span className={createStep === 2 ? "eca-admin-attendance-create-progress-bar eca-admin-attendance-create-progress-bar--active" : "eca-admin-attendance-create-progress-bar"} />
                        </div>

                        <p className="eca-admin-attendance-create-step">{t(`${ATTENDANCE_T}.create.step`, { step: createStep })}</p>

                        <div className="eca-admin-attendance-create-slide-viewport">
                            <div className={createStep === 1 ? "eca-admin-attendance-create-slide-pane eca-admin-attendance-create-slide-pane--step1 is-active" : "eca-admin-attendance-create-slide-pane eca-admin-attendance-create-slide-pane--step1 is-before"}>
                                <div className="eca-admin-attendance-create-body">
                                    <h2 className="eca-admin-attendance-create-title">{t(`${ATTENDANCE_T}.create.title`)}</h2>

                                    <div className="eca-admin-attendance-create-date-field">
                                        <span className="eca-admin-attendance-create-time-label">{t(`${ATTENDANCE_T}.create.date`)}</span>

                                        <div className="eca-admin-attendance-create-date-picker-wrap">
                                            <button type="button" className="eca-admin-attendance-create-date-button" onClick={() => setCreateDatePickerOpen((prev) => !prev)}>
                                                <span>{formatCreateDateButtonLabel(createDate, calendarLocale)}</span>
                                                <img src="/icons/calendar-07-80.svg" alt="" />
                                            </button>

                                            {createDatePickerOpen ? (
                                                <AttendanceCreateCalendar
                                                    value={createDate}
                                                    onChange={setCreateDate}
                                                    onClose={() => setCreateDatePickerOpen(false)}
                                                    calendarLocale={calendarLocale}
                                                    previousMonthLabel={t(`${ATTENDANCE_T}.previousMonth`)}
                                                    nextMonthLabel={t(`${ATTENDANCE_T}.nextMonth`)}
                                                />
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="eca-admin-attendance-create-type-block">
                                        <span className="eca-admin-attendance-create-time-label">{t(`${ATTENDANCE_T}.create.startOrEnd`)}</span>

                                        <div className="eca-admin-attendance-create-type-grid">
                                            <button type="button" className={createType === "CLASS_START" ? "eca-admin-attendance-create-type-button eca-admin-attendance-create-type-button--active" : "eca-admin-attendance-create-type-button"} onClick={() => setCreateType("CLASS_START")} >
                                                {t(`${ATTENDANCE_T}.start`)}
                                            </button>
                                            <button type="button" className={createType === "CLASS_END" ? "eca-admin-attendance-create-type-button eca-admin-attendance-create-type-button--active" : "eca-admin-attendance-create-type-button"} onClick={() => setCreateType("CLASS_END")} >
                                                {t(`${ATTENDANCE_T}.end`)}
                                            </button>
                                        </div>
                                    </div>

                                    {createStep === 1 && createError ? (
                                        <p className="eca-admin-attendance-create-error">{createError}</p>
                                    ) : null}

                                    <button type="button" className="eca-admin-attendance-create-next-button" onClick={handleNextCreateStep}>
                                        {t(`${ATTENDANCE_T}.create.next`)}
                                    </button>
                                </div>
                            </div>

                            <div className={createStep === 2 ? "eca-admin-attendance-create-slide-pane eca-admin-attendance-create-slide-pane--step2 is-active" : "eca-admin-attendance-create-slide-pane eca-admin-attendance-create-slide-pane--step2 is-after"}>
                                <div className="eca-admin-attendance-create-body eca-admin-attendance-create-body--step2">
                                    <h2 className="eca-admin-attendance-create-title">
                                        {t(`${ATTENDANCE_T}.attendanceTitleByDate`, { date: getDetailDateLabelForCreate(createDate, calendarLocale) })}
                                    </h2>

                                    <div className="eca-admin-attendance-create-time-form">
                                        <div className="eca-admin-attendance-create-time-block">
                                            <span className="eca-admin-attendance-create-time-label">
                                                {createType === "CLASS_START" ? t(`${ATTENDANCE_T}.create.startTime`) : t(`${ATTENDANCE_T}.create.endTime`)}
                                            </span>

                                            <div className="eca-admin-attendance-create-time-row">
                                                <input
                                                    className="eca-admin-attendance-create-time-input"
                                                    value={createStartHour}
                                                    maxLength={2}
                                                    inputMode="numeric"
                                                    onChange={(event) => handleChangeCreateStartHour(event.target.value)}
                                                />

                                                <span className="eca-admin-attendance-create-time-colon">:</span>

                                                <input
                                                    className="eca-admin-attendance-create-time-input"
                                                    value={createStartMinute}
                                                    maxLength={2}
                                                    inputMode="numeric"
                                                    onChange={(event) => handleChangeCreateStartMinute(event.target.value)}
                                                />

                                                <div className="eca-admin-attendance-create-period-buttons">
                                                    <button type="button" className={createStartPeriod === "AM" ? "eca-admin-attendance-create-period-button eca-admin-attendance-create-period-button--active" : "eca-admin-attendance-create-period-button"} onClick={() => setCreateStartPeriod("AM")} >
                                                        AM
                                                    </button>

                                                    <button type="button" className={createStartPeriod === "PM" ? "eca-admin-attendance-create-period-button eca-admin-attendance-create-period-button--active" : "eca-admin-attendance-create-period-button"} onClick={() => setCreateStartPeriod("PM")} >
                                                        PM
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="eca-admin-attendance-create-duration-block">
                                            <span className="eca-admin-attendance-create-time-label">{t(`${ATTENDANCE_T}.create.duration`)}</span>

                                            <div className="eca-admin-attendance-create-duration-grid">
                                                <button type="button" className={createFullCreditMinutes === "5" ? "eca-admin-attendance-create-duration-button eca-admin-attendance-create-duration-button--active" : "eca-admin-attendance-create-duration-button"} onClick={() => setCreateFullCreditMinutes("5")} >
                                                    {t(`${ATTENDANCE_T}.create.forMinutes`, { minutes: 5 })}
                                                </button>

                                                <button type="button" className={createFullCreditMinutes === "15" ? "eca-admin-attendance-create-duration-button eca-admin-attendance-create-duration-button--active" : "eca-admin-attendance-create-duration-button"} onClick={() => setCreateFullCreditMinutes("15")} >
                                                    {t(`${ATTENDANCE_T}.create.forMinutes`, { minutes: 15 })}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {createStep === 2 && createError ? (
                                        <p className="eca-admin-attendance-create-error">{createError}</p>
                                    ) : null}

                                    <div className="eca-admin-attendance-create-actions">
                                        <button type="button" className="eca-admin-attendance-create-back-button" onClick={() => setCreateStep(1)}>
                                            {t(`${ATTENDANCE_T}.create.back`)}
                                        </button>

                                        <button type="button" className="eca-admin-attendance-create-submit-button" onClick={handleCreateAttendanceEvent} disabled={creating}>
                                            {creating ? t(`${ATTENDANCE_T}.create.creating`) : t(`${ATTENDANCE_T}.create.submit`)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            ) : null}
            <AdminStudentProfileModal
                student={selectedStudentProfile}
                onClose={() => setSelectedStudentProfile(null)}
            />
        </div>
    );
}