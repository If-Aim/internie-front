import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMyAttendanceEvents } from "../../../../../../api/ea";
import type { AttendanceEventType, AttendanceStatus, MyAttendanceEventResponse } from "../../../../../../api/ea";
import { formatServerKstDateTimeDateLabelForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./attendance.css";

const ATTENDANCE_T = "ecaStudent.attendancePage";

type SortDirection = "asc" | "desc";

const STATUS_FILTERS: AttendanceStatus[] = [
    "NOT_CHECKED",
    "PRESENT",
    "LATE",
    "VERY_LATE",
    "EARLY_LEAVE",
    "VERY_EARLY_LEAVE",
    "ABSENT",
];

const TYPE_FALLBACK_LABELS: Record<AttendanceEventType, string> = {
    CLASS_START: "Start",
    CLASS_END: "End",
};

const STATUS_FALLBACK_LABELS: Record<AttendanceStatus, string> = {
    NOT_CHECKED: "Assigned",
    PRESENT: "Present",
    LATE: "Late",
    VERY_LATE: "Very Late",
    EARLY_LEAVE: "Early Leave",
    VERY_EARLY_LEAVE: "Very Early Leave",
    ABSENT: "Absent",
};

function translateText(t: TFunction, key: string, defaultValue: string): string {
    return String(t(key, { defaultValue }));
}

function getEventBaseDateTimeValue(event: MyAttendanceEventResponse): string | null {
    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatEventDate(event: MyAttendanceEventResponse, language: string): string {
    return formatServerKstDateTimeDateLabelForUser(
        getEventBaseDateTimeValue(event),
        event.eventDate,
        language
    );
}

function getEventSortTime(event: MyAttendanceEventResponse): number {
    const date = parseServerKstDateTime(event.uploadWindowStart);

    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function getTypeLabel(type: AttendanceEventType, t: TFunction): string {
    return translateText(t, `${ATTENDANCE_T}.type.${type}`, TYPE_FALLBACK_LABELS[type]);
}

function getStatusLabel(status: AttendanceStatus, t: TFunction): string {
    return translateText(t, `${ATTENDANCE_T}.status.${status}`, STATUS_FALLBACK_LABELS[status]);
}

function getStatusClass(status: AttendanceStatus): string {
    if (status === "PRESENT") return "is-present";
    if (status === "ABSENT") return "is-absent";
    if (status === "NOT_CHECKED") return "is-assigned";
    if (status === "VERY_LATE" || status === "VERY_EARLY_LEAVE") return "is-very-late";

    return "is-late";
}

function isProgressedEvent(event: MyAttendanceEventResponse): boolean {
    return event.progress !== "SCHEDULED";
}

function formatScore(score: number): string {
    if (Number.isInteger(score)) return String(score);

    return score.toFixed(1).replace(/\.0$/, "");
}

function getFilterLabel(filters: AttendanceStatus[], t: TFunction): string {
    if (filters.length === STATUS_FILTERS.length) {
        return translateText(t, `${ATTENDANCE_T}.filter.all`, "All");
    }

    if (filters.length === 0) {
        return translateText(t, `${ATTENDANCE_T}.filter.none`, "None");
    }

    return filters.map((filter) => getStatusLabel(filter, t)).join(", ");
}

function sortEvents(events: MyAttendanceEventResponse[], sortDirection: SortDirection): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => {
        const diff = getEventSortTime(a) - getEventSortTime(b);

        if (diff === 0) return a.eventId - b.eventId;

        return sortDirection === "asc" ? diff : -diff;
    });
}

export default function EcaStudentAttendance(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [events, setEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
    const [selectedStatusFilters, setSelectedStatusFilters] = React.useState<AttendanceStatus[]>(() => [...STATUS_FILTERS]);
    const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
    const filterPopoverRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        let mounted = true;

        async function fetchAttendance(): Promise<void> {
            if (!externalActivityId) {
                setError(translateText(t, `${ATTENDANCE_T}.error.activityNotFound`, "Activity not found."));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getMyAttendanceEvents(externalActivityId);

                if (!mounted) return;

                setEvents(sortEvents(data, "asc"));
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setEvents([]);
                setError(translateText(t, `${ATTENDANCE_T}.error.attendanceLoadFailed`, "Failed to load attendance."));
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchAttendance();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

    React.useEffect(() => {
        if (!filterPopoverOpen) return;

        function handleMouseDown(event: MouseEvent): void {
            if (!filterPopoverRef.current) return;
            if (filterPopoverRef.current.contains(event.target as Node)) return;

            setFilterPopoverOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [filterPopoverOpen]);

    const progressedEvents = events.filter(isProgressedEvent);
    const totalEventCount = events.length;
    const progressedEventCount = progressedEvents.length;
    const currentScore = progressedEvents.reduce((sum, event) => sum + (Number.isFinite(event.score) ? event.score : 0), 0);
    const progressPercent = totalEventCount === 0 ? 0 : Math.round((progressedEventCount / totalEventCount) * 100);

    const isFilterChanged = selectedStatusFilters.length !== STATUS_FILTERS.length;
    const visibleEvents = React.useMemo(() => {
        const filteredEvents = events.filter((event) => selectedStatusFilters.includes(event.status));

        return sortEvents(filteredEvents, sortDirection);
    }, [events, sortDirection, selectedStatusFilters]);

    function toggleStatusFilter(status: AttendanceStatus): void {
        setSelectedStatusFilters((prev) => {
            if (prev.includes(status)) {
                return prev.filter((item) => item !== status);
            }

            return [...prev, status];
        });
    }

    function openAttendanceSubmit(event: MyAttendanceEventResponse): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance/${event.eventId}`, {
            state: { event },
        });
    }

    return (
        <section className="eca-student-attendance-page">
            <h1 className="eca-student-attendance-title">{translateText(t, `${ATTENDANCE_T}.title`, "My Attendance")}</h1>

            <div className="eca-student-attendance-summary-row">
                <article className="eca-student-attendance-summary-card">
                    <span className="eca-student-attendance-summary-label">{translateText(t, `${ATTENDANCE_T}.score`, "Score")}</span>
                    <strong className="eca-student-attendance-summary-value">
                        {formatScore(currentScore)}
                        <em>/{progressedEventCount}</em>
                    </strong>
                </article>

                <article className="eca-student-attendance-summary-card">
                    <span className="eca-student-attendance-summary-label">{translateText(t, `${ATTENDANCE_T}.progress`, "Progress")}</span>
                    <strong className="eca-student-attendance-summary-value">{progressPercent}%</strong>
                </article>
            </div>

            <section className="eca-student-attendance-list-card">
                <div className="eca-student-attendance-list-top">
                    <strong>List ({visibleEvents.length})</strong>

                    <div className="eca-student-attendance-actions">
                        <div className="eca-student-attendance-filter-wrap" ref={filterPopoverRef}>
                            <button type="button" className="eca-student-attendance-icon-button" title={getFilterLabel(selectedStatusFilters, t)} aria-label={getFilterLabel(selectedStatusFilters, t)} aria-expanded={filterPopoverOpen} onClick={() => setFilterPopoverOpen((prev) => !prev)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke={isFilterChanged ? "#0166FF" : "#A0A0A0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    {isFilterChanged ? <circle cx="20" cy="6" r="3" fill="#0166FF"/> : null}
                                </svg>
                            </button>

                            {filterPopoverOpen ? (
                                <div className="eca-student-attendance-filter-popover">
                                    {STATUS_FILTERS.map((status) => (
                                        <button type="button" key={status} className="eca-student-attendance-filter-option" onClick={() => toggleStatusFilter(status)}>
                                            <img
                                                className="eca-student-attendance-filter-radio"
                                                src={
                                                    selectedStatusFilters.length === STATUS_FILTERS.length
                                                        ? "/icons/filter_selected_all.svg"
                                                        : selectedStatusFilters.includes(status)
                                                            ? "/icons/filter_selected_one.svg"
                                                            : "/icons/filter_selected_none.svg"
                                                }
                                                alt=""
                                            />
                                            <span>{getStatusLabel(status, t)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <button type="button" className="eca-student-attendance-icon-button" title={sortDirection === "asc" ? "Oldest" : "Newest"} aria-label={sortDirection === "asc" ? "Oldest" : "Newest"} onClick={() => setSortDirection((prev) => prev === "asc" ? "desc" : "asc")}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M21 6.375L17.625 3L14.25 6.375M17.625 3L17.625 21M3 17.625L6.375 21L9.75 17.625M6.375 21L6.375 3" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="eca-student-attendance-table-head">
                    <span>{translateText(t, `${ATTENDANCE_T}.column.date`, "Assignment")}</span>
                    <span>{translateText(t, `${ATTENDANCE_T}.column.type`, "Type")}</span>
                    <span>{translateText(t, `${ATTENDANCE_T}.column.status`, "Status")}</span>
                    <span />
                </div>

                <div className="eca-student-attendance-list">
                    {loading ? (
                        <p className="eca-student-attendance-empty">{translateText(t, `${ATTENDANCE_T}.loading`, "Loading...")}</p>
                    ) : error ? (
                        <p className="eca-student-attendance-empty">{error}</p>
                    ) : visibleEvents.length === 0 ? (
                        <p className="eca-student-attendance-empty">{translateText(t, `${ATTENDANCE_T}.empty`, "No attendance events.")}</p>
                    ) : (
                        visibleEvents.map((event) => (
                            <button type="button" className="eca-student-attendance-row" key={event.eventId} onClick={() => openAttendanceSubmit(event)}>
                                <span className="eca-student-attendance-date">{formatEventDate(event, i18n.resolvedLanguage ?? i18n.language)}</span>
                                <span className="eca-student-attendance-type">{getTypeLabel(event.type, t)}</span>
                                <span className={`eca-student-attendance-status ${getStatusClass(event.status)}`}>{getStatusLabel(event.status, t)}</span>
                                <span className="eca-student-attendance-arrow" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 7L14 12L9 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </section>
        </section>
    );
}