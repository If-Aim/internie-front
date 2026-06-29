import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { checkInAttendance, getAttendanceCheckInEligibility, getMyAttendanceEventDetail, getMyAttendanceEvents } from "../../../../../../api/ea";
import type { AttendanceEventType, MyAttendanceEventDetailResponse, MyAttendanceEventResponse, MyAttendanceSelfieResponse } from "../../../../../../api/ea";
import { parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./attendanceSubmit.css";

const ATTENDANCE_SUBMIT_T = "ecaStudent.attendanceSubmitPage";
const DEFAULT_PROFILE_IMAGE = "/internie_mascot_normal.png";

type LocationState = {
    event?: MyAttendanceEventResponse;
};

function translateText(t: TFunction, key: string, defaultValue: string): string {
    return String(t(key, { defaultValue }));
}

function getEventBaseDateTimeValue(event?: MyAttendanceEventResponse | null): string | null {
    if (!event) return null;

    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatTitleDate(event?: MyAttendanceEventResponse | null): string {
    const value = getEventBaseDateTimeValue(event);

    if (!value) return "-";

    const date = parseServerKstDateTime(value);

    if (!date) return "-";

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function getTypeLabel(type?: AttendanceEventType | null, t?: TFunction): string {
    if (!type) return "-";

    if (!t) return type === "CLASS_END" ? "End" : "Start";

    return translateText(t, `${ATTENDANCE_SUBMIT_T}.type.${type}`, type === "CLASS_END" ? "End" : "Start");
}

function isNowInUploadWindow(event?: MyAttendanceEventResponse | null, now: Date = new Date()): boolean {
    if (!event) return false;

    const start = parseServerKstDateTime(event.uploadWindowStart);
    const end = parseServerKstDateTime(event.uploadWindowEnd);

    if (!start || !end) return false;

    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

function getTimeLeftText(event?: MyAttendanceEventResponse | null, now: Date = new Date()): string {
    if (!event || event.progress !== "OPEN") return "0:00";

    const end = parseServerKstDateTime(event.uploadWindowEnd);

    if (!end) return "0:00";

    const diffSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getSelfieRecords(detail: MyAttendanceEventDetailResponse | null): MyAttendanceSelfieResponse[] {
    if (!detail) return [];

    return detail.records.filter((record) => Boolean(record.selfieUrl));
}

function getSafeImage(value?: string | null): string {
    if (!value) return DEFAULT_PROFILE_IMAGE;
    if (value.toLowerCase().includes("default")) return DEFAULT_PROFILE_IMAGE;

    return value;
}

export default function EcaStudentAttendanceSubmit(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId, eventId } = useParams<{ externalActivityId?: string; eventId?: string }>();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const initialEvent = (location.state as LocationState | null)?.event ?? null;

    const [event, setEvent] = React.useState<MyAttendanceEventResponse | null>(initialEvent);
    const [detail, setDetail] = React.useState<MyAttendanceEventDetailResponse | null>(null);
    const [alreadyChecked, setAlreadyChecked] = React.useState(initialEvent ? initialEvent.status !== "NOT_CHECKED" : false);
    const [eligible, setEligible] = React.useState(false);
    const [now, setNow] = React.useState(new Date());
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    React.useEffect(() => {
        let mounted = true;

        async function fetchAttendanceSubmitData(): Promise<void> {
            if (!externalActivityId || !eventId) {
                setError(translateText(t, `${ATTENDANCE_SUBMIT_T}.error.attendanceNotFound`, "Attendance event not found."));
                return;
            }

            setLoading(true);
            setError("");

            try {
                let currentEvent = initialEvent;

                if (!currentEvent) {
                    const events = await getMyAttendanceEvents(externalActivityId);
                    currentEvent = events.find((item) => String(item.eventId) === String(eventId)) ?? null;
                }

                if (!mounted) return;

                setEvent(currentEvent);

                try {
                    const eligibilityData = await getAttendanceCheckInEligibility(eventId);

                    if (!mounted) return;

                    setEligible(eligibilityData.eligible);
                    setAlreadyChecked(eligibilityData.alreadyChecked);
                } catch {
                    if (!mounted) return;

                    setEligible(currentEvent?.progress === "OPEN" && currentEvent.status === "NOT_CHECKED");
                    setAlreadyChecked(currentEvent?.status !== "NOT_CHECKED");
                }

                try {
                    const detailData = await getMyAttendanceEventDetail(eventId);

                    if (!mounted) return;

                    setDetail(detailData);
                } catch {
                    if (!mounted) return;

                    setDetail(null);
                }
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setEvent(null);
                setDetail(null);
                setError(translateText(t, `${ATTENDANCE_SUBMIT_T}.error.attendanceDetailLoadFailed`, "Failed to load attendance detail."));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void fetchAttendanceSubmitData();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, eventId, initialEvent, t]);

    const selfieRecords = getSelfieRecords(detail);
    const canCheckIn = Boolean(event && eligible && !alreadyChecked && isNowInUploadWindow(event, now));
    const timeLeftText = getTimeLeftText(event, now);

    function goBack(): void {
        navigate(-1);
    }

    function openFilePicker(): void {
        if (!event) return;

        if (alreadyChecked) {
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.alreadyChecked`, "You have already checked in."));
            return;
        }

        if (!canCheckIn) {
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.notAvailableTime`, "Check-in is not available now."));
            return;
        }

        fileInputRef.current?.click();
    }

    async function refreshAfterSubmit(): Promise<void> {
        if (!externalActivityId || !eventId) return;

        const [events, detailData] = await Promise.all([
            getMyAttendanceEvents(externalActivityId),
            getMyAttendanceEventDetail(eventId),
        ]);

        setEvent(events.find((item) => String(item.eventId) === String(eventId)) ?? event);
        setDetail(detailData);
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = e.target.files?.[0] ?? null;

        e.target.value = "";

        if (!file || !eventId || !event) return;

        if (!file.type.startsWith("image/")) {
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.imageOnly`, "Only image files can be uploaded."));
            return;
        }

        setSaving(true);

        try {
            await checkInAttendance(eventId, event.type, file);
            setAlreadyChecked(true);
            setEligible(false);
            await refreshAfterSubmit();

            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.checkInSuccess`, "Check-in completed."));
        } catch (error) {
            console.error(error);
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.checkInFailed`, "Check-in failed."));
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="eca-student-attendance-submit-page">
            <header className="eca-student-attendance-submit-head">
                <button type="button" className="eca-student-attendance-submit-back" onClick={goBack} aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.back`, "Back")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 17L9 12L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <h1>{formatTitleDate(event)}</h1>
            </header>

            <section className="eca-student-attendance-submit-card">
                {loading ? (
                    <p className="eca-student-attendance-submit-empty">{translateText(t, `${ATTENDANCE_SUBMIT_T}.loading`, "Loading...")}</p>
                ) : error ? (
                    <p className="eca-student-attendance-submit-empty">{error}</p>
                ) : (
                    <>
                        <div className="eca-student-attendance-submit-summary">
                            <article>
                                <span>{translateText(t, `${ATTENDANCE_SUBMIT_T}.timeLeft`, "Time Left")}</span>
                                <strong>{timeLeftText}</strong>
                            </article>

                            <article className="eca-student-attendance-submit-status-card">
                                <div>
                                    <span>{translateText(t, `${ATTENDANCE_SUBMIT_T}.statusTitle`, "Status")}</span>
                                    <strong>{getTypeLabel(event?.type, t)}</strong>
                                </div>

                                <button type="button" onClick={openFilePicker} disabled={!canCheckIn || saving}>
                                    {saving ? translateText(t, `${ATTENDANCE_SUBMIT_T}.saving`, "Checking...") : translateText(t, `${ATTENDANCE_SUBMIT_T}.checkIn`, "Check-In")}
                                </button>

                                <input ref={fileInputRef} type="file" accept="image/*" className="eca-student-attendance-submit-file-input" onChange={handleFileChange} />
                            </article>
                        </div>

                        <section className="eca-student-attendance-submit-participants">
                            <div className="eca-student-attendance-submit-participants-top">
                                <h2>{translateText(t, `${ATTENDANCE_SUBMIT_T}.participants`, "Participants")} ({selfieRecords.length})</h2>

                                <div>
                                    <button type="button" aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.filter`, "Filter")}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 7H19M8 12H16M10 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                    <button type="button" aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.edit`, "Edit")}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none">
                                            <path d="M13.5 6.5L17.5 10.5M4 20H8L18.5 9.5C19.6046 8.39543 19.6046 6.60457 18.5 5.5C17.3954 4.39543 15.6046 4.39543 14.5 5.5L4 16V20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button type="button" aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.search`, "Search")}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none">
                                            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="eca-student-attendance-submit-participant-grid">
                                {selfieRecords.length > 0 ? (
                                    selfieRecords.map((record) => (
                                        <article className="eca-student-attendance-submit-selfie-card" key={record.recordId}>
                                            <img
                                                src={getSafeImage(record.selfieUrl)}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                                                }}
                                            />
                                            <span>{record.name}</span>
                                        </article>
                                    ))
                                ) : (
                                    <p className="eca-student-attendance-submit-empty">{translateText(t, `${ATTENDANCE_SUBMIT_T}.emptySelfies`, "No check-in photos yet.")}</p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </section>
        </section>
    );
}