import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMyAttendanceEvents, getMyParticipatingExternalActivity } from "../../../../../../api/ea";
import type { AttendanceEventType, AttendanceStatus, MyAttendanceEventResponse, StudentExternalActivityDetailResponse } from "../../../../../../api/ea";
import { parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileAttendance.css";

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

            <div style={{display: "block", width: 24, height: 24}} aria-hidden="true" />
        </div>
    );
}

function getEventBaseDate(event: MyAttendanceEventResponse): Date | null {
    const value = event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;

    return parseServerKstDateTime(value);
}

function formatEventDate(event: MyAttendanceEventResponse): string {
    const date = getEventBaseDate(event);

    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(date);
}

function getEventDisplayTime(event: MyAttendanceEventResponse): string {
    const date = getEventBaseDate(event);

    if (!date) return "";

    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

function getEventSortTime(event: MyAttendanceEventResponse): number {
    const date = parseServerKstDateTime(event.uploadWindowStart);

    if (date) {
        return date.getTime();
    }

    return 0;
}

function getTypeLabel(type: AttendanceEventType): string {
    return type === "CLASS_START" ? "Start" : "End";
}

function getStatusLabel(status: AttendanceStatus): string {
    const labels: Record<AttendanceStatus, string> = {
        NOT_CHECKED: "Not Checked",
        PRESENT: "Present",
        LATE: "Late",
        VERY_LATE: "Very Late",
        EARLY_LEAVE: "Early Leave",
        VERY_EARLY_LEAVE: "Very Early Leave",
        ABSENT: "Absent",
    };

    return labels[status];
}

function getStatusClass(status: AttendanceStatus): string {
    if (status === "PRESENT") return "is-present";
    if (status === "ABSENT") return "is-absent";
    if (status === "NOT_CHECKED") return "is-not-checked";

    return "is-late";
}

function sortAttendanceEvents(events: MyAttendanceEventResponse[]): MyAttendanceEventResponse[] {
    return [...events].sort((a, b) => {
        if (a.progress === "OPEN" && b.progress !== "OPEN") return -1;
        if (a.progress !== "OPEN" && b.progress === "OPEN") return 1;

        return getEventSortTime(b) - getEventSortTime(a);
    });
}

export default function EcaMobileAttendance(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [activity, setActivity] = React.useState<StudentExternalActivityDetailResponse | null>(null);
    const [events, setEvents] = React.useState<MyAttendanceEventResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function fetchAttendance(): Promise<void> {
            if (!externalActivityId) {
                setError("대외활동 정보를 찾을 수 없습니다.");
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
                setError("출석 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchAttendance();
    }, [externalActivityId]);

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
            <Header activityName={activity?.name ?? "Attendance"} onMenuClick={openMenu} />

            <section className="eca-mobile-student-attendance-list">
                {loading ? (
                    <p className="eca-mobile-student-attendance-empty">출석 정보를 불러오는 중입니다.</p>
                ) : error ? (
                    <p className="eca-mobile-student-attendance-empty">{error}</p>
                ) : events.length === 0 ? (
                    <p className="eca-mobile-student-attendance-empty">등록된 출석 이벤트가 없습니다.</p>
                ) : (
                    events.map((event) => {
                        const displayTime = getEventDisplayTime(event);

                        return (
                            <button type="button" className="eca-mobile-student-attendance-card" key={event.eventId} onClick={() => openAttendance(event)}>
                                <span className="eca-mobile-student-attendance-card-text">
                                    <strong>{formatEventDate(event)}</strong>
                                    <em>
                                        {getTypeLabel(event.type)}
                                        {displayTime ? <span className="eca-mobile-student-attendance-time">{displayTime}</span> : null}
                                    </em>
                                </span>

                                <span className={`eca-mobile-student-attendance-status ${getStatusClass(event.status)}`}>
                                    {getStatusLabel(event.status)}
                                </span>

                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M10 7L15 12L10 17" stroke="#848484" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        );
                    })
                )}
            </section>
        </main>
    );
}