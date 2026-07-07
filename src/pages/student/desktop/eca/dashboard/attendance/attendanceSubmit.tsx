import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { checkInAttendance, getAttendanceCheckInEligibility, getMyAttendanceEventDetail, getMyAttendanceEvents } from "../../../../../../api/ea";
import type { AttendanceEventType, AttendanceStatus, MyAttendanceEventDetailResponse, MyAttendanceEventResponse, MyAttendanceSelfieResponse } from "../../../../../../api/ea";
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

function formatTitleDate(event: MyAttendanceEventResponse | null, language: string): string {
    const value = getEventBaseDateTimeValue(event);

    if (!value) return "-";

    const date = parseServerKstDateTime(value);

    if (!date) return "-";

    const isEnglish = language.toLowerCase().startsWith("en");

    if (isEnglish) {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    }

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    return `${date.getMonth() + 1}월 ${date.getDate()}일(${weekdays[date.getDay()]})`;
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

function getPredictedAttendanceStatus(event?: MyAttendanceEventResponse | null, now: Date = new Date()): AttendanceStatus | null {
    if (!event || event.progress !== "OPEN") return null;

    const reference = parseServerKstDateTime(event.scoreReferenceAt);

    if (!reference) return null;
    if (!isNowInUploadWindow(event, now)) return null;

    const referenceTime = reference.getTime();
    const nowTime = now.getTime();
    const minuteMs = 60 * 1000;

    if (event.type === "CLASS_START") {
        const elapsedMinutes = (nowTime - referenceTime) / minuteMs;

        if (elapsedMinutes <= event.fullCreditThresholdMinutes) return "PRESENT";
        if (elapsedMinutes <= event.partialCreditThresholdMinutes) return "LATE";
        if (elapsedMinutes <= event.halfCreditThresholdMinutes) return "VERY_LATE";

        return "ABSENT";
    }

    const earlyMinutes = (referenceTime - nowTime) / minuteMs;

    if (earlyMinutes <= event.fullCreditThresholdMinutes) return "PRESENT";
    if (earlyMinutes <= event.partialCreditThresholdMinutes) return "EARLY_LEAVE";
    if (earlyMinutes <= event.halfCreditThresholdMinutes) return "VERY_EARLY_LEAVE";

    return "ABSENT";
}

function getTimeLeftText(event?: MyAttendanceEventResponse | null, now: Date = new Date()): string {
    if (!event || event.progress !== "OPEN") return "0:00";

    const reference = parseServerKstDateTime(event.scoreReferenceAt);

    if (!reference) return "0:00";

    const referenceTime = reference.getTime();
    const fullCreditMinutesMs = event.fullCreditThresholdMinutes * 60 * 1000;
    const fullCreditEndTime = event.type === "CLASS_START" ? referenceTime + fullCreditMinutesMs : referenceTime;
    const diffSeconds = Math.max(0, Math.floor((fullCreditEndTime - now.getTime()) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getPredictedStatusLabel(status: AttendanceStatus | null, t: TFunction): string {
    if (!status) return "-";

    return translateText(t, `ecaStudent.attendancePage.status.${status}`, status);
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
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId, eventId } = useParams<{ externalActivityId?: string; eventId?: string }>();
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const searchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const initialEvent = (location.state as LocationState | null)?.event ?? null;

    const [event, setEvent] = React.useState<MyAttendanceEventResponse | null>(initialEvent);
    const [detail, setDetail] = React.useState<MyAttendanceEventDetailResponse | null>(null);
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [mobileGuideOpen, setMobileGuideOpen] = React.useState(false);
    const [cameraStarting, setCameraStarting] = React.useState(false);
    const [alreadyChecked, setAlreadyChecked] = React.useState(initialEvent ? initialEvent.status !== "NOT_CHECKED" : false);
    const [eligible, setEligible] = React.useState(false);
    const [now, setNow] = React.useState(new Date());
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [keyword, setKeyword] = React.useState("");
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

    React.useEffect(() => {
        if (!searchOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!searchWrapRef.current) return;
            if (searchWrapRef.current.contains(e.target as Node)) return;

            setSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [searchOpen]);

    React.useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const selfieRecords = getSelfieRecords(detail);
    const normalizedKeyword = keyword.trim().toLowerCase();
    const visibleSelfieRecords = selfieRecords.filter((record) => {
        return !normalizedKeyword || record.name.toLowerCase().includes(normalizedKeyword);
    });
    const canCheckIn = Boolean(event && eligible && !alreadyChecked && isNowInUploadWindow(event, now));

    const predictedStatus = getPredictedAttendanceStatus(event, now);
    const showFullCreditTimer = predictedStatus === "PRESENT";
    const summaryLabel = alreadyChecked
        ? translateText(t, `${ATTENDANCE_SUBMIT_T}.myStatusTitle`, "Status")
        : showFullCreditTimer
            ? translateText(t, `${ATTENDANCE_SUBMIT_T}.timeLeft`, "Time Left")
            : translateText(t, `${ATTENDANCE_SUBMIT_T}.currentStatus`, "Current Status");

    const summaryValue = alreadyChecked
        ? translateText(t, `${ATTENDANCE_SUBMIT_T}.checkInCompleted`, "Check-In Complete")
        : showFullCreditTimer
            ? getTimeLeftText(event, now)
            : getPredictedStatusLabel(predictedStatus, t);

    function goBack(): void {
        navigate(-1);
    }

    function stopCamera(): void {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    function closeCamera(): void {
        stopCamera();
        setCameraOpen(false);
    }

    async function openCamera(): Promise<void> {
        if (!event) return;

        if (alreadyChecked) {
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.alreadyChecked`, "You have already checked in."));
            return;
        }

        if (!canCheckIn) {
            window.alert(translateText(t, `${ATTENDANCE_SUBMIT_T}.alert.notAvailableTime`, "Check-in is not available now."));
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setMobileGuideOpen(true);
            return;
        }

        setCameraStarting(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                },
                audio: false,
            });

            streamRef.current = stream;
            setCameraOpen(true);

            window.setTimeout(() => {
                if (!videoRef.current) return;

                videoRef.current.srcObject = stream;
                void videoRef.current.play();
            }, 0);
        } catch (error) {
            console.error(error);

            if (error instanceof DOMException) {
                if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                    setMobileGuideOpen(true);
                    return;
                }

                if (error.name === "NotAllowedError" || error.name === "SecurityError") {
                    window.alert(
                        translateText(
                            t,
                            `${ATTENDANCE_SUBMIT_T}.alert.cameraPermissionDenied`,
                            "Please allow camera access."
                        )
                    );
                    return;
                }

                if (error.name === "NotReadableError" || error.name === "TrackStartError") {
                    window.alert(
                        translateText(
                            t,
                            `${ATTENDANCE_SUBMIT_T}.alert.cameraUnavailable`,
                            "The camera is currently unavailable."
                        )
                    );
                    return;
                }
            }

            setMobileGuideOpen(true);
        } finally {
            setCameraStarting(false);
        }
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

    async function captureAndCheckIn(): Promise<void> {
        if (!videoRef.current || !eventId || !event) return;

        const video = videoRef.current;
        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.92);
        });

        if (!blob) {
            window.alert(
                translateText(
                    t,
                    `${ATTENDANCE_SUBMIT_T}.alert.captureFailed`,
                    "Failed to capture photo."
                )
            );
            return;
        }

        const selfie = new File(
            [blob],
            `attendance-${eventId}-${Date.now()}.jpg`,
            { type: "image/jpeg" }
        );

        setSaving(true);

        try {
            await checkInAttendance(eventId, event.type, selfie);

            stopCamera();
            setCameraOpen(false);
            setAlreadyChecked(true);
            setEligible(false);

            await refreshAfterSubmit();
        } catch (error) {
            console.error(error);

            window.alert(
                translateText(
                    t,
                    `${ATTENDANCE_SUBMIT_T}.alert.checkInFailed`,
                    "Check-in failed."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="eca-student-attendance-submit-page">
            <header className="eca-student-attendance-submit-head">
                <button type="button" className="eca-student-attendance-submit-back" onClick={goBack} aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.back`, "Back")}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 7L10 12L15 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <h1>{formatTitleDate(event, i18n.resolvedLanguage ?? i18n.language)}</h1>
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
                                <span>{summaryLabel}</span>
                                <strong>{summaryValue}</strong>
                            </article>

                            <article className="eca-student-attendance-submit-status-card">
                                <div>
                                    <span>{translateText(t, `${ATTENDANCE_SUBMIT_T}.statusTitle`, "Status")}</span>
                                    <strong>{getTypeLabel(event?.type, t)}</strong>
                                </div>

                                <button type="button" onClick={() => void openCamera()} disabled={!canCheckIn || saving || cameraStarting}>
                                    {saving || cameraStarting
                                        ? translateText(t, `${ATTENDANCE_SUBMIT_T}.saving`, "Checking...")
                                        : translateText(t, `${ATTENDANCE_SUBMIT_T}.checkIn`, "Check-In")}
                                </button>
                            </article>
                        </div>

                        <section className="eca-student-attendance-submit-participants">
                            <div className="eca-student-attendance-submit-participants-top">
                                <h2>
                                    {translateText(t, `${ATTENDANCE_SUBMIT_T}.participants`, "Participants")} ({visibleSelfieRecords.length})
                                </h2>

                                <div className="eca-student-attendance-submit-actions">
                                    <div className="eca-student-attendance-submit-search-wrap" ref={searchWrapRef}>
                                        <button
                                            type="button"
                                            aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.search`, "Search")}
                                            aria-expanded={searchOpen}
                                            onClick={() => setSearchOpen((prev) => !prev)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M14.9692 13.521H14.2062L13.9358 13.2603C14.5394 12.5591 14.9805 11.7331 15.2276 10.8416C15.4747 9.94999 15.5217 9.01482 15.3652 8.10297C14.9113 5.41809 12.6706 3.27404 9.96645 2.94568C9.01574 2.8254 8.05013 2.92421 7.14348 3.23453C6.23684 3.54486 5.4132 4.05847 4.73559 4.73608C4.05798 5.41369 3.54437 6.23733 3.23404 7.14397C2.92372 8.05061 2.82491 9.01623 2.94519 9.96694C3.27355 12.6711 5.4176 14.9118 8.10248 15.3657C9.01433 15.5222 9.9495 15.4752 10.8411 15.2281C11.7327 14.981 12.5586 14.5399 13.2598 13.9363L13.5205 14.2067V14.9697L17.6251 19.0743C18.0211 19.4703 18.6682 19.4703 19.0641 19.0743C19.4601 18.6783 19.4601 18.0312 19.0641 17.6353L14.9692 13.521ZM9.1745 13.521C6.7697 13.521 4.82847 11.5798 4.82847 9.17499C4.82847 6.77019 6.7697 4.82896 9.1745 4.82896C11.5793 4.82896 13.5205 6.77019 13.5205 9.17499C13.5205 11.5798 11.5793 13.521 9.1745 13.521Z" fill="currentColor"/>
                                            </svg>
                                        </button>

                                        {searchOpen ? (
                                            <div className="eca-student-attendance-submit-search-popover">
                                                <input
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    placeholder={translateText(t, `${ATTENDANCE_SUBMIT_T}.searchPlaceholder`, "Search by name")}
                                                    autoFocus
                                                />
                                                <button type="button" onClick={() => setKeyword("")}>
                                                    {translateText(t, "ecaStudent.reset", "Reset")}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="eca-student-attendance-submit-participant-grid">
                                {visibleSelfieRecords.length > 0 ? (
                                    visibleSelfieRecords.map((record) => (
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
                                ) : keyword.trim() ? (
                                    <p className="eca-student-attendance-submit-empty">
                                        {translateText(t, `${ATTENDANCE_SUBMIT_T}.noSearchResults`, "No results found.")}
                                    </p>
                                ) : (
                                    <p className="eca-student-attendance-submit-empty">
                                        {translateText(t, `${ATTENDANCE_SUBMIT_T}.emptySelfies`, "No check-in photos yet.")}
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </section>
            {cameraOpen ? (
                <div className="eca-student-attendance-camera-overlay">
                    <section className="eca-student-attendance-camera-modal">
                        <button
                            type="button"
                            className="eca-student-attendance-camera-close"
                            onClick={closeCamera}
                            aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.close`, "Close")}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>

                        <h2>
                            {translateText(
                                t,
                                `${ATTENDANCE_SUBMIT_T}.camera.title`,
                                "Take a photo for attendance"
                            )}
                        </h2>

                        <div className="eca-student-attendance-camera-preview">
                            <video ref={videoRef} autoPlay playsInline muted />
                        </div>

                        <button
                            type="button"
                            className="eca-student-attendance-camera-capture"
                            onClick={() => void captureAndCheckIn()}
                            disabled={saving}
                        >
                            {saving
                                ? translateText(t, `${ATTENDANCE_SUBMIT_T}.saving`, "Checking...")
                                : translateText(t, `${ATTENDANCE_SUBMIT_T}.camera.capture`, "Capture")}
                        </button>
                    </section>
                </div>
            ) : null}
            {mobileGuideOpen ? (
                <div className="eca-student-attendance-guide-overlay">
                    <section className="eca-student-attendance-guide-modal">
                        <button
                            type="button"
                            className="eca-student-attendance-guide-close"
                            onClick={() => setMobileGuideOpen(false)}
                            aria-label={translateText(t, `${ATTENDANCE_SUBMIT_T}.aria.close`, "Close")}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>

                        <p>
                            {translateText(
                                t,
                                `${ATTENDANCE_SUBMIT_T}.camera.mobileGuide`,
                                "Please complete attendance verification on mobile."
                            )}
                        </p>

                        <button
                            type="button"
                            className="eca-student-attendance-guide-confirm"
                            onClick={() => setMobileGuideOpen(false)}
                        >
                            {translateText(t, `${ATTENDANCE_SUBMIT_T}.confirm`, "Confirm")}
                        </button>
                    </section>
                </div>
            ) : null}

        </section>
    );
}