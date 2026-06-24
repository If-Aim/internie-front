import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMyAttendanceEvents, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { AttendanceEventType, AttendanceStatus, MyAttendanceEventResponse, StudentExternalActivityDetailResponse } from "../../../../../../api/ea";
import { formatServerKstDateTimeDateLabelForUser, formatServerKstDateTimeTimeForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileAttendance.css";

const ATTENDANCE_T = "ecaStudent.attendancePage";

type HeaderProps = {
    activityName: string;
    onMenuClick: () => void;
};

function Header({ activityName, onMenuClick }: HeaderProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
                <img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
            </button>

            <div className="app-title">{activityName}</div>

            <div style={{ display: "block", width: 24, height: 24 }} aria-hidden="true" />
        </div>
    );
}

function getEventBaseDateTimeValue(event: MyAttendanceEventResponse): string | null {
    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatEventDate(event: MyAttendanceEventResponse): string {
    return formatServerKstDateTimeDateLabelForUser(getEventBaseDateTimeValue(event));
}

function getEventDisplayTime(event: MyAttendanceEventResponse): string {
    return formatServerKstDateTimeTimeForUser(getEventBaseDateTimeValue(event), "");
}

function getEventSortTime(event: MyAttendanceEventResponse): number {
    const date = parseServerKstDateTime(event.uploadWindowStart);

    if (date) {
        return date.getTime();
    }

    return Number.MAX_SAFE_INTEGER;
}

function getTypeLabel(type: AttendanceEventType, t: TFunction): string {
    return t(`${ATTENDANCE_T}.type.${type}`);
}

function getStatusLabel(status: AttendanceStatus, t: TFunction): string {
    return t(`${ATTENDANCE_T}.status.${status}`);
}

function getStatusClass(status: AttendanceStatus): string {
    if (status === "PRESENT") return "is-present";
    if (status === "ABSENT") return "is-absent";
    if (status === "NOT_CHECKED") return "is-not-checked";

    return "is-late";
}

function sortAttendanceEvents(events: MyAttendanceEventResponse[]): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => getEventSortTime(a) - getEventSortTime(b));
}

export default function EcaMobileAttendance(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [events, setEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function fetchAttendance(): Promise<void> {
            if (!externalActivityId) {
                setError(t(`${ATTENDANCE_T}.error.activityNotFound`));
                return;
            }

            setLoading(true);
            setError("");

            try {
                const [activityData, eventData] = await Promise.all([
                    getMyParticipatingExternalActivity(externalActivityId),
                    getMyAttendanceEvents(externalActivityId),
                ]);

                setActivity(activityData);
                setEvents(sortAttendanceEvents(eventData));
            } catch (e) {
                console.error(e);
                setActivity(null);
                setEvents([]);
                setError(t(`${ATTENDANCE_T}.error.attendanceLoadFailed`));
            } finally {
                setLoading(false);
            }
        }

        fetchAttendance();
    }, [externalActivityId, t]);

    function openMenu(): void {
        window.dispatchEvent(new CustomEvent("openStudentMobileMenu"));
    }

    function openAttendance(event: MyAttendanceEventResponse): void {
        if (!externalActivityId) return;

        navigate(`/student/activities/${externalActivityId}/attendance/${event.eventId}`, {
            state: { event },
        });
    }

    return (
        <main className="eca-mobile-student-attendance-page">
            <Header activityName={activity?.name ?? t(`${ATTENDANCE_T}.fallbackTitle`)} onMenuClick={openMenu} />

            <section className="eca-mobile-student-attendance-list">
                {loading ? (
                    <p className="eca-mobile-student-attendance-empty">{t(`${ATTENDANCE_T}.loading`)}</p>
                ) : error ? (
                    <p className="eca-mobile-student-attendance-empty">{error}</p>
                ) : events.length === 0 ? (
                    <p className="eca-mobile-student-attendance-empty">{t(`${ATTENDANCE_T}.empty`)}</p>
                ) : (
                    events.map((event) => {
                        const displayTime = getEventDisplayTime(event);

                        return (
                            <button type="button" className="eca-mobile-student-attendance-card" key={event.eventId} onClick={() => openAttendance(event)}>
                                <span className="eca-mobile-student-attendance-card-text">
                                    <strong>{formatEventDate(event)}</strong>
                                    <em>
                                        {getTypeLabel(event.type, t)}
                                        {displayTime ? <span className="eca-mobile-student-attendance-time">{displayTime}</span> : null}
                                    </em>
                                </span>

                                <span className={`eca-mobile-student-attendance-status ${getStatusClass(event.status)}`}>
                                    {getStatusLabel(event.status, t)}
                                </span>

                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M10 7L15 12L10 17" stroke="#848484" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        );
                    })
                )}
            </section>
        </main>
    );
}