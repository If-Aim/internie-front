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
type StatusFilter = "ALL" | AttendanceStatus;

const STATUS_FILTERS: StatusFilter[] = ["ALL", "NOT_CHECKED", "PRESENT", "LATE", "VERY_LATE", "EARLY_LEAVE", "VERY_EARLY_LEAVE", "ABSENT"];

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

function formatEventDate(event: MyAttendanceEventResponse): string {
    return formatServerKstDateTimeDateLabelForUser(getEventBaseDateTimeValue(event), event.eventDate);
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

function getNextStatusFilter(current: StatusFilter): StatusFilter {
    const currentIndex = STATUS_FILTERS.indexOf(current);
    const nextIndex = currentIndex < 0 || currentIndex === STATUS_FILTERS.length - 1 ? 0 : currentIndex + 1;

    return STATUS_FILTERS[nextIndex];
}

function getFilterLabel(filter: StatusFilter, t: TFunction): string {
    if (filter === "ALL") return translateText(t, `${ATTENDANCE_T}.filter.all`, "All");

    return getStatusLabel(filter, t);
}

function sortEvents(events: MyAttendanceEventResponse[], sortDirection: SortDirection): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => {
        const diff = getEventSortTime(a) - getEventSortTime(b);

        if (diff === 0) return a.eventId - b.eventId;

        return sortDirection === "asc" ? diff : -diff;
    });
}

export default function EcaStudentAttendance(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [events, setEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");

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

    const progressedEvents = events.filter(isProgressedEvent);
    const totalEventCount = events.length;
    const progressedEventCount = progressedEvents.length;
    const currentScore = progressedEvents.reduce((sum, event) => sum + (Number.isFinite(event.score) ? event.score : 0), 0);
    const progressPercent = totalEventCount === 0 ? 0 : Math.round((progressedEventCount / totalEventCount) * 100);

    const visibleEvents = React.useMemo(() => {
        const filteredEvents = statusFilter === "ALL" ? events : events.filter((event) => event.status === statusFilter);

        return sortEvents(filteredEvents, sortDirection);
    }, [events, sortDirection, statusFilter]);

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
                    <strong>{translateText(t, `${ATTENDANCE_T}.list`, "List")} ({visibleEvents.length})</strong>

                    <div className="eca-student-attendance-actions">
                        <button type="button" className="eca-student-attendance-icon-button" title={getFilterLabel(statusFilter, t)} aria-label={getFilterLabel(statusFilter, t)} onClick={() => setStatusFilter((prev) => getNextStatusFilter(prev))}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M4 5H16M6.5 10H13.5M8.5 15H11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>

                        <button type="button" className="eca-student-attendance-icon-button" title={sortDirection === "asc" ? "Oldest" : "Newest"} aria-label={sortDirection === "asc" ? "Oldest" : "Newest"} onClick={() => setSortDirection((prev) => prev === "asc" ? "desc" : "asc")}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
                                <path d="M10 5V22M10 22L6.5 18.5M10 22L13.5 18.5M18 23V6M18 6L14.5 9.5M18 6L21.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="eca-student-attendance-table-head">
                    <span>{translateText(t, `${ATTENDANCE_T}.column.assignment`, "Assignment")}</span>
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
                                <span className="eca-student-attendance-date">{formatEventDate(event)}</span>
                                <span className="eca-student-attendance-type">{getTypeLabel(event.type, t)}</span>
                                <span className={`eca-student-attendance-status ${getStatusClass(event.status)}`}>{getStatusLabel(event.status, t)}</span>
                                <span className="eca-student-attendance-arrow" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M10 7L15 12L10 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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