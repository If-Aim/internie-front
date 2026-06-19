import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { checkInAttendance, getAttendanceCheckInEligibility, getMyAttendanceEventDetail, getMyAttendanceEvents } from "../../../../../../api/ea";
import type { MyAttendanceEventDetailResponse, MyAttendanceSelfieResponse, MyAttendanceEventResponse } from "../../../../../../api/ea";
import { formatServerKstDateTimeDateLabelForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./ecaStudentMobileAttendanceSubmit.css";

type LocationState = {
    event?: MyAttendanceEventResponse;
};

type GalleryItem = {
    id: string;
    file: File;
    url: string;
};

type CameraFacingMode = "user" | "environment";

function getEventBaseDateTimeValue(event?: MyAttendanceEventResponse | null): string | null {
    if (!event) return null;

    return event.type === "CLASS_END" ? event.scoreReferenceAt : event.uploadWindowStart;
}

function formatTitleParts(event?: MyAttendanceEventResponse | null): { dateText: string; typeText: string } {
    if (!event) return { dateText: "Attendance", typeText: "" };

    return {
        dateText: formatServerKstDateTimeDateLabelForUser(getEventBaseDateTimeValue(event), event.eventDate),
        typeText: event.type === "CLASS_START" ? "Start" : "End",
    };
}

function isNowInUploadWindow(event?: MyAttendanceEventResponse | null, now: Date = new Date()): boolean {
    if (!event) {
        return false;
    }

    const start = parseServerKstDateTime(event.uploadWindowStart);
    const end = parseServerKstDateTime(event.uploadWindowEnd);

    if (!start || !end) {
        return false;
    }

    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

function makePreviewUrl(file: File | null): string {
    if (!file) return "";

    return window.URL.createObjectURL(file);
}

function getSelfieRecords(detail: MyAttendanceEventDetailResponse | null): MyAttendanceSelfieResponse[] {
    if (!detail) return [];

    return detail.records.filter((record) => Boolean(record.selfieUrl));
}

type HeaderProps = {
    titleDate: string;
    titleType: string;
    pickerOpen: boolean;
    onBackClick: () => void;
    onPickerClose: () => void;
};

function Header({ titleDate, titleType, pickerOpen, onBackClick, onPickerClose }: HeaderProps): React.ReactElement {
    return (
        <div className="topbar topbar-main">
            {pickerOpen ? (
                <div style={{display: "block", width: 24, height: 24}} aria-hidden="true" />
            ) : (
                <button type="button" className="iconbtn" aria-label="back" onClick={onBackClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            )}

            <div className="app-title">
                <span>{titleDate}</span>
                {titleType ? <span className="app-title-status">{titleType}</span> : null}
            </div>

            {pickerOpen ? (
                <button type="button" className="iconbtn" aria-label="close" onClick={onPickerClose}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 4L4 20M20 20L4 4" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            ) : (
                <div style={{display: "block", width: 24, height: 24}} aria-hidden="true" />
            )}
        </div>
    );
}

export default function EcaMobileAttendanceSubmit(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId, eventId } = useParams<{ externalActivityId?: string; eventId?: string }>();

    const initialEvent = (location.state as LocationState | null)?.event ?? null;
    const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
    const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    const [event, setEvent] = React.useState<MyAttendanceEventResponse | null>(initialEvent);
    const [detail, setDetail] = React.useState<MyAttendanceEventDetailResponse | null>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState("");
    const [galleryItems, setGalleryItems] = React.useState<GalleryItem[]>([]);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [cameraFacing, setCameraFacing] = React.useState<CameraFacingMode>("user");
    const [cameraStream, setCameraStream] = React.useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = React.useState("");
    const [capturedCameraFile, setCapturedCameraFile] = React.useState<File | null>(null);
    const [capturedCameraPreviewUrl, setCapturedCameraPreviewUrl] = React.useState("");
    const [/*eligible*/, setEligible] = React.useState(false);
    const [alreadyChecked, setAlreadyChecked] = React.useState(false);
    const [now, setNow] = React.useState(new Date());
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [error, setError] = React.useState("");

    const [cameraGuideOpen, setCameraGuideOpen] = React.useState(true);
    const finishSuccessOverlay = React.useCallback((): void => {
        setSuccess(false);
        setPickerOpen(false);
        setSelectedFile(null);
        setGalleryItems([]);
    }, []);

    React.useEffect(() => {
        async function fetchAttendanceDetail(): Promise<void> {
            if (!externalActivityId || !eventId) {
                setError("출석 정보를 찾을 수 없습니다.");
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

                setEvent(currentEvent);

                try {
                    const eligibilityData = await getAttendanceCheckInEligibility(eventId);
                    setEligible(eligibilityData.eligible);
                    setAlreadyChecked(eligibilityData.alreadyChecked);
                } catch {
                    setEligible(currentEvent?.progress === "OPEN" && currentEvent.status === "NOT_CHECKED");
                    setAlreadyChecked(currentEvent?.status !== "NOT_CHECKED");
                }

                try {
                    const detailData = await getMyAttendanceEventDetail(eventId);
                    setDetail(detailData);
                } catch {
                    setDetail(null);
                }
            } catch (e) {
                console.error(e);
                setEvent(null);
                setDetail(null);
                setError("출석 상세 정보를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        }

        fetchAttendanceDetail();
    }, [externalActivityId, eventId]);

    React.useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    React.useEffect(() => {
        const previewUrl = makePreviewUrl(selectedFile);

        setSelectedPreviewUrl(previewUrl);

        return () => {
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [selectedFile]);

    React.useEffect(() => {
        const previewUrl = makePreviewUrl(capturedCameraFile);

        setCapturedCameraPreviewUrl(previewUrl);

        return () => {
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [capturedCameraFile]);

    React.useEffect(() => {
        if (!videoRef.current || !cameraStream) return;

        videoRef.current.srcObject = cameraStream;
        void videoRef.current.play().catch(() => undefined);
    }, [cameraStream]);

    React.useEffect(() => {
        return () => {
            cameraStream?.getTracks().forEach((track) => track.stop());
        };
    }, [cameraStream]);

    React.useEffect(() => {
        return () => {
            galleryItems.forEach((item) => window.URL.revokeObjectURL(item.url));
        };
    }, [galleryItems]);

    React.useEffect(() => {
        if (!success) return;

        const timer = window.setTimeout(() => {
            finishSuccessOverlay();
        }, 2700);

        return () => {
            window.clearTimeout(timer);
        };
    }, [success, finishSuccessOverlay]);

    function goBack(): void {
        navigate(-1);
    }

    function closePicker(): void {
        setPickerOpen(false);
    }

    function openPicker(): void {
        if (alreadyChecked) {
            alert("이미 출석 체크가 완료되었습니다.");
            return;
        }

        if (!isNowInUploadWindow(event, now)) {
            alert("현재 출석 가능한 시간이 아닙니다.");
            return;
        }

        setPickerOpen(true);
    }

    function stopCameraStream(stream: MediaStream | null): void {
        stream?.getTracks().forEach((track) => track.stop());
    }

    async function startCameraStream(nextFacing: CameraFacingMode = cameraFacing): Promise<void> {
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("이 브라우저에서는 웹 카메라를 사용할 수 없습니다.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: nextFacing },
                audio: false,
            });

            setCameraStream(stream);
        } catch (e) {
            console.error(e);
            setCameraError("카메라 권한을 허용해주세요.");
        }
    }

    async function openCamera(): Promise<void> {
        setCameraOpen(true);
        setCameraGuideOpen(true);
        setCapturedCameraFile(null);
        setCameraError("");

        await startCameraStream();
    }

    function closeCamera(): void {
        stopCameraStream(cameraStream);
        setCameraStream(null);
        setCameraOpen(false);
        setCameraGuideOpen(true);
        setCapturedCameraFile(null);
        setCameraError("");
    }
 
    function toggleCameraGuide(): void {
        setCameraGuideOpen((prev) => !prev);
    }

    async function switchCameraFacing(): Promise<void> {
        const nextFacing: CameraFacingMode = cameraFacing === "user" ? "environment" : "user";

        stopCameraStream(cameraStream);
        setCameraStream(null);
        setCameraFacing(nextFacing);
        setCameraError("");

        await startCameraStream(nextFacing);
    }

    async function retakeCameraPhoto(): Promise<void> {
        stopCameraStream(cameraStream);
        setCameraStream(null);
        setCapturedCameraFile(null);
        setCameraGuideOpen(true);
        setCameraError("");

        await startCameraStream();
    }

    async function captureCameraPhoto(): Promise<void> {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
            alert("카메라가 아직 준비되지 않았습니다.");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) {
            alert("사진을 캡처하지 못했습니다.");
            return;
        }

        if (cameraFacing === "user") {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error("Failed to capture photo"));
            }, "image/jpeg", 0.92);
        });

        const file = new File([blob], `attendance-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });

        stopCameraStream(cameraStream);
        setCameraStream(null);
        setCapturedCameraFile(file);
    }

    function openGallery(): void {
        galleryInputRef.current?.click();
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
        const files = Array.from(event.target.files ?? []);

        event.target.value = "";

        if (files.length === 0) return;

        const imageFiles = files.filter((file) => file.type.startsWith("image/"));

        if (imageFiles.length === 0) {
            alert("이미지 파일만 선택할 수 있습니다.");
            return;
        }

        const nextItems = imageFiles.map((file, index) => ({
            id: `${file.name}-${file.lastModified}-${index}`,
            file,
            url: window.URL.createObjectURL(file),
        }));

        setGalleryItems(nextItems);
        setSelectedFile(imageFiles[0]);
    }

    function selectGalleryItem(file: File): void {
        setSelectedFile(file);
    }

    async function submitAttendance(uploadFile: File, closeCameraAfterSuccess = false): Promise<void> {
        if (!eventId || !event || saving) return;

        if (alreadyChecked || !isNowInUploadWindow(event, now)) {
            alert("현재 출석 가능한 시간이 아닙니다.");
            return;
        }

        setSaving(true);

        try {
            await checkInAttendance(eventId, event.type, uploadFile);
            setAlreadyChecked(true);
            setEligible(false);

            try {
                const detailData = await getMyAttendanceEventDetail(eventId);
                setDetail(detailData);
            } catch {
                setDetail(null);
            }

            if (closeCameraAfterSuccess) {
                closeCamera();
            }

            setPickerOpen(false);
            setSuccess(true);
        } catch (e) {
            console.error(e);
            alert("출석 체크에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpload(): Promise<void> {
        if (!selectedFile) {
            alert("업로드할 사진을 선택해주세요.");
            return;
        }

        await submitAttendance(selectedFile);
    }
    
    async function confirmCameraPhoto(): Promise<void> {
        if (!capturedCameraFile) return;

        setSelectedFile(capturedCameraFile);

        await submitAttendance(capturedCameraFile, true);
    }

    const selfieRecords = getSelfieRecords(detail);
    const canCheckIn = !alreadyChecked && isNowInUploadWindow(event, now);
    const selectedFileInGallery = galleryItems.some((item) => item.file === selectedFile);
    const pageClassName = [
        "attendance-submit-page",
        pickerOpen ? "is-picker" : "",
        cameraOpen ? "is-camera-open" : "",
    ].filter(Boolean).join(" ");
    const titleParts = formatTitleParts(event);

    return (
        <main className={pageClassName}>
            {!cameraOpen ? (
                <Header
                    titleDate={titleParts.dateText}
                    titleType={titleParts.typeText}
                    pickerOpen={pickerOpen}
                    onBackClick={goBack}
                    onPickerClose={closePicker}
                />
            ) : null}

            {loading ? (
                <p className="attendance-mobile-empty"/>
            ) : error ? (
                <p className="attendance-mobile-empty">{error}</p>
            ) : (
                <>
                    {pickerOpen ? (
                        <section className="attendance-submit-grid">
                            <button type="button" className="attendance-submit-photo is-camera" onClick={() => void openCamera()}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                                    <path d="M10.8001 9.18011V10.1801C11.1558 10.1801 11.4847 9.9912 11.6639 9.68398L10.8001 9.18011ZM13.3201 4.86011V3.86011C12.9644 3.86011 12.6355 4.04902 12.4563 4.35624L13.3201 4.86011ZM22.6801 4.86011L23.5439 4.35624C23.3647 4.04902 23.0358 3.86011 22.6801 3.86011V4.86011ZM25.2001 9.18011L24.3363 9.68398C24.5155 9.9912 24.8444 10.1801 25.2001 10.1801V9.18011ZM3.6001 27.5401H4.6001V12.7801H3.6001H2.6001V27.5401H3.6001ZM7.2001 9.18011V10.1801H10.8001V9.18011V8.18011H7.2001V9.18011ZM10.8001 9.18011L11.6639 9.68398L14.1839 5.36398L13.3201 4.86011L12.4563 4.35624L9.93632 8.67624L10.8001 9.18011ZM13.3201 4.86011V5.86011H22.6801V4.86011V3.86011H13.3201V4.86011ZM22.6801 4.86011L21.8163 5.36398L24.3363 9.68398L25.2001 9.18011L26.0639 8.67624L23.5439 4.35624L22.6801 4.86011ZM25.2001 9.18011V10.1801H28.8001V9.18011V8.18011H25.2001V9.18011ZM32.4001 12.7801H31.4001V27.5401H32.4001H33.4001V12.7801H32.4001ZM32.4001 27.5401H31.4001C31.4001 28.976 30.236 30.1401 28.8001 30.1401V31.1401V32.1401C31.3406 32.1401 33.4001 30.0806 33.4001 27.5401H32.4001ZM28.8001 9.18011V10.1801C30.236 10.1801 31.4001 11.3442 31.4001 12.7801H32.4001H33.4001C33.4001 10.2396 31.3406 8.18011 28.8001 8.18011V9.18011ZM3.6001 12.7801H4.6001C4.6001 11.3442 5.76416 10.1801 7.2001 10.1801V9.18011V8.18011C4.65959 8.18011 2.6001 10.2396 2.6001 12.7801H3.6001ZM7.2001 31.1401V30.1401C5.76416 30.1401 4.6001 28.976 4.6001 27.5401H3.6001H2.6001C2.6001 30.0806 4.65959 32.1401 7.2001 32.1401V31.1401ZM23.4001 19.2601H22.4001C22.4001 21.6902 20.4301 23.6601 18.0001 23.6601V24.6601V25.6601C21.5347 25.6601 24.4001 22.7947 24.4001 19.2601H23.4001ZM18.0001 24.6601V23.6601C15.57 23.6601 13.6001 21.6902 13.6001 19.2601H12.6001H11.6001C11.6001 22.7947 14.4655 25.6601 18.0001 25.6601V24.6601ZM12.6001 19.2601H13.6001C13.6001 16.8301 15.57 14.8601 18.0001 14.8601V13.8601V12.8601C14.4655 12.8601 11.6001 15.7255 11.6001 19.2601H12.6001ZM18.0001 13.8601V14.8601C20.4301 14.8601 22.4001 16.8301 22.4001 19.2601H23.4001H24.4001C24.4001 15.7255 21.5347 12.8601 18.0001 12.8601V13.8601ZM28.8001 31.1401V30.1401H7.2001V31.1401V32.1401H28.8001V31.1401Z" fill="#808080"/>
                                </svg>
                            </button>

                            {selectedPreviewUrl && !selectedFileInGallery ? (
                                <button type="button" className="attendance-submit-photo is-selected">
                                    <img src={selectedPreviewUrl} alt="selected" />
                                    <span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="12" fill="#0166FF"/>
                                        </svg>
                                    </span>
                                </button>
                            ) : null}
                            {galleryItems.map((item) => (
                                <button type="button" className={selectedFile === item.file ? "attendance-submit-photo is-selected" : "attendance-submit-photo"} key={item.id} onClick={() => selectGalleryItem(item.file)}>
                                    <img src={item.url} alt="gallery selected" />
                                    {selectedFile === item.file ? (
                                        <span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                                                <circle cx="13" cy="13" r="13" fill="#0166FF" />
                                                <path d="M7 13L11.2 17L19 9" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    ) : null}
                                </button>
                            ))}
                            <button type="button" className="attendance-submit-photo is-gallery" onClick={openGallery}>
                                <span className="attendance-submit-gallery-text">+</span>
                            </button>
                        </section>
                    ) : selfieRecords.length > 0 ? (
                        <section className="attendance-submit-grid">
                            {selfieRecords.map((record) => (
                                <button type="button" className="attendance-submit-photo" key={record.recordId}>
                                    <img src={record.selfieUrl ?? ""} alt={record.name} />
                                </button>
                            ))}
                        </section>
                    ) : (
                        <p className="attendance-submit-empty">아직 출석한 학생이 없습니다.</p>
                    )}

                    <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="attendance-submit-file-input" onChange={handleFileChange} />
                    <input ref={galleryInputRef} type="file" accept="image/*" multiple className="attendance-submit-file-input" onChange={handleFileChange} />

                    <div className="attendance-submit-bottom">
                        {pickerOpen ? (
                            <button type="button" className="attendance-submit-primary" disabled={saving} onClick={handleUpload}>
                                {saving ? "Uploading..." : "Upload"}
                            </button>
                        ) : (
                            <button type="button" className="attendance-submit-primary" disabled={!canCheckIn} onClick={openPicker}>
                                Check-In
                            </button>
                        )}
                    </div>
                    {cameraOpen ? (
                        <div className="attendance-camera-layer" role="dialog" aria-modal="true" aria-label="camera">
                            {capturedCameraPreviewUrl ? (
                                <img className="attendance-camera-review-image" src={capturedCameraPreviewUrl} alt="captured selfie" />
                            ) : (
                                <video ref={videoRef} className={cameraFacing === "user" ? "attendance-camera-video is-front" : "attendance-camera-video is-back"} autoPlay muted playsInline />
                            )}

                            <button type="button" className="attendance-camera-close" aria-label="close camera" onClick={closeCamera}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 4L4 20M20 20L4 4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>

                            {!capturedCameraPreviewUrl ? (
                                <>
                                    <div className={cameraGuideOpen ? "attendance-camera-guide is-open" : "attendance-camera-guide is-closed"} aria-hidden={!cameraGuideOpen}>
                                        Please take a selfie
                                    </div>

                                    <button type="button" className={cameraGuideOpen ? "attendance-camera-guide-toggle" : "attendance-camera-guide-toggle is-closed"} aria-label={cameraGuideOpen ? "hide guide" : "show guide"} onClick={toggleCameraGuide}>
                                        <svg className="attendance-camera-guide-toggle-bg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.24"/>
                                        </svg>
                                        <svg className="attendance-camera-guide-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M7 14L12 9L17 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>

                                    {cameraError ? <p className="attendance-camera-error">{cameraError}</p> : null}

                                    <button type="button" className="attendance-camera-capture" aria-label="take photo" disabled={!cameraStream || Boolean(cameraError)} onClick={() => void captureCameraPhoto()} />
                                    <button type="button" className="attendance-camera-switch" aria-label="switch camera" disabled={!cameraStream || Boolean(cameraError)} onClick={() => void switchCameraFacing()}>
                                        <svg className="attendance-camera-switch-bg" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
                                            <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.5" />
                                        </svg>
                                        <svg className="attendance-camera-switch-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <path d="M7.43684 9.66667C9.29009 6.27913 12.754 4 16.7213 4C21.2195 4 25.0705 6.92991 26.6606 11.0833M10.6922 11.0833H5.33301V5.41667M25.8958 21C24.0426 24.3875 20.5787 26.6667 16.6114 26.6667C12.1132 26.6667 8.26216 23.7368 6.67212 19.5833M22.6405 19.5833H27.9997V25.25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <div className="attendance-camera-review-actions">
                                    <button type="button" className="attendance-camera-review-button is-retake" disabled={saving} onClick={() => void retakeCameraPhoto()}>
                                        Retake
                                    </button>
                                    <button type="button" className="attendance-camera-review-button is-checkin" disabled={saving} onClick={() => void confirmCameraPhoto()}>
                                        {saving ? "Uploading..." : "Check-In"}
                                    </button>
                                </div>
                            )}

                            <canvas ref={canvasRef} className="attendance-camera-canvas" aria-hidden="true" />
                        </div>
                    ) : null}
                    {success ? (
                        <button type="button" className="attendance-submit-success-layer" aria-label="close success message" onClick={finishSuccessOverlay}>
                            <span className="attendance-submit-success-icon-wrap">
                                <svg className="attendance-submit-success-icon" xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 50 50" fill="none">
                                    <circle className="attendance-submit-success-circle" cx="25" cy="25" r="25" fill="#0166FF"/>
                                    <path className="attendance-submit-success-check" d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </span>
                            <strong>Check-In Complete!</strong>
                        </button>
                    ) : null}
                </>
            )}
        </main>
    );
}