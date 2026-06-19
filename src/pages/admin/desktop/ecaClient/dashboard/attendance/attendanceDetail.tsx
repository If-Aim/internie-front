import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteAttendanceEvent, endAttendanceEventNow, getAttendanceEventDetail, startAttendanceEventNow, updateAttendanceRecordStatus, type AttendanceEventDetailResponse, type AttendanceEventParticipantRecordResponse, type AttendanceStatus, } from "../../../../../../api/ea";
import { formatServerKstDateTimeDateLabelForUser, formatServerKstDateTimeWithWeekdayForUser, parseServerKstDateTime } from "../../../../../../utils/dateTime";
import "./attendanceDetail.css";

type ViewMode = "list" | "gallery";
type DetailSort = "nameAsc" | "status";

const statusOptions: { label: string; value: AttendanceStatus }[] = [
    { label: "출석", value: "PRESENT" },
    { label: "지각", value: "LATE" },
    { label: "결석", value: "ABSENT" },
];

const sortOptions: { label: string; value: DetailSort }[] = [
    { label: "이름순", value: "nameAsc" },
    { label: "출석 상태순", value: "status" },
];

function BackIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 7L10 12L15 17" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MoreIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="6" cy="13" r="1.8" fill="#000" />
            <circle cx="13" cy="13" r="1.8" fill="#000" />
            <circle cx="20" cy="13" r="1.8" fill="#000" />
        </svg>
    );
}

function SearchIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10.5 18C6.36 18 3 14.64 3 10.5S6.36 3 10.5 3S18 6.36 18 10.5C18 12.21 17.43 13.78 16.47 15.04L20.21 18.79C20.6 19.18 20.6 19.81 20.21 20.21C19.82 20.6 19.18 20.6 18.79 20.21L15.04 16.47C13.78 17.43 12.21 18 10.5 18ZM10.5 16C13.54 16 16 13.54 16 10.5S13.54 5 10.5 5S5 7.46 5 10.5S7.46 16 10.5 16Z" fill="#A0A0A0" />
        </svg>
    );
}

function SortIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4.5 7H19.5M7 12H17M10 17H14" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function EditIcon({ active }: { active: boolean }): React.ReactElement {
    const color = active ? "#000000" : "#A0A0A0";
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8.8 20.199C8.54654 20.4528 8.24554 20.6542 7.91421 20.7916C7.58288 20.9291 7.22771 20.9998 6.869 21H3V17.156C3 16.432 3.288 15.737 3.8 15.225M8.8 20.199L3.8 15.225M8.8 20.199L18.774 10.221M3.8 15.225L13.784 5.22995L15.21 3.80196C15.4638 3.54781 15.7651 3.34618 16.0968 3.20857C16.4286 3.07097 16.7842 3.00009 17.1433 3C17.5024 2.99991 17.8581 3.0706 18.1899 3.20803C18.5217 3.34546 18.8231 3.54695 19.077 3.80096L20.203 4.92796C20.7155 5.44049 21.0035 6.13563 21.0035 6.86045C21.0035 7.58528 20.7155 8.28042 20.203 8.79296L18.774 10.221M18.774 10.221L13.783 5.22995" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChatIcon(): React.ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
            <path d="M15.2827 6.09522L3.61606 0.261891C3.15564 0.0327317 2.63574 -0.0488505 2.12725 0.0282672C1.61877 0.105385 1.14644 0.337449 0.774668 0.692821C0.402895 1.04819 0.14977 1.50958 0.049803 2.01407C-0.0501637 2.51856 0.00789349 3.0416 0.216059 3.51189L2.21606 7.98689C2.26144 8.09508 2.28481 8.21123 2.28481 8.32856C2.28481 8.44588 2.26144 8.56203 2.21606 8.67022L0.216059 13.1452C0.0466425 13.5258 -0.0249779 13.9427 0.00770662 14.358C0.0403911 14.7733 0.176344 15.1739 0.403211 15.5233C0.630077 15.8727 0.940664 16.1599 1.30674 16.3587C1.67283 16.5576 2.08279 16.6618 2.49939 16.6619C2.88958 16.658 3.27397 16.5669 3.62439 16.3952L15.2911 10.5619C15.7049 10.3537 16.0527 10.0346 16.2958 9.64029C16.5389 9.24593 16.6676 8.7918 16.6676 8.32856C16.6676 7.86531 16.5389 7.41118 16.2958 7.01683C16.0527 6.62247 15.7049 6.3034 15.2911 6.09522H15.2827ZM14.5411 9.07022L2.87439 14.9036C2.72119 14.9771 2.54917 15.0021 2.38138 14.9751C2.21359 14.9481 2.05807 14.8705 1.93565 14.7526C1.81324 14.6347 1.72979 14.4822 1.6965 14.3156C1.66321 14.1489 1.68166 13.9761 1.74939 13.8202L3.74106 9.34522C3.76684 9.28547 3.7891 9.22425 3.80773 9.16189H9.54939C9.77041 9.16189 9.98237 9.07409 10.1386 8.91781C10.2949 8.76153 10.3827 8.54957 10.3827 8.32856C10.3827 8.10754 10.2949 7.89558 10.1386 7.7393C9.98237 7.58302 9.77041 7.49522 9.54939 7.49522H3.80773C3.7891 7.43286 3.76684 7.37165 3.74106 7.31189L1.74939 2.83689C1.68166 2.68103 1.66321 2.50818 1.6965 2.34153C1.72979 2.17488 1.81324 2.02239 1.93565 1.90451C2.05807 1.78663 2.21359 1.709 2.38138 1.68202C2.54917 1.65504 2.72119 1.68 2.87439 1.75356L14.5411 7.58689C14.6776 7.65682 14.7921 7.76307 14.8721 7.89393C14.9521 8.02479 14.9944 8.17519 14.9944 8.32856C14.9944 8.48193 14.9521 8.63233 14.8721 8.76319C14.7921 8.89405 14.6776 9.00029 14.5411 9.07022Z" fill="#A0A0A0" />
        </svg>
    );
}

const showManualWindowButtons = false;

function isLateLikeStatus(status: AttendanceStatus): boolean {
    return status === "LATE"
        || status === "VERY_LATE"
        || status === "EARLY_LEAVE"
        || status === "VERY_EARLY_LEAVE";
}

function normalizeEditableStatus(status: AttendanceStatus): AttendanceStatus {
    if (status === "PRESENT") {
        return "PRESENT";
    }

    if (isLateLikeStatus(status)) {
        return "LATE";
    }

    return "ABSENT";
}

function getStatusOrder(status: AttendanceStatus): number {
    const normalized = normalizeEditableStatus(status);

    if (normalized === "PRESENT") {
        return 0;
    }

    if (normalized === "LATE") {
        return 1;
    }

    return 2;
}

function resolveDetailProgress(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): "SCHEDULED" | "OPEN" | "CLOSED" {
    if (!detail) {
        return "SCHEDULED";
    }

    const start = parseServerKstDateTime(detail.uploadWindowStart);
    const end = parseServerKstDateTime(detail.uploadWindowEnd);

    if (!start || !end) {
        return detail.progress;
    }

    if (now.getTime() < start.getTime()) {
        return "SCHEDULED";
    }

    if (now.getTime() > end.getTime()) {
        return "CLOSED";
    }

    return "OPEN";
}

function getOriginalEditableStatus(
    record: AttendanceEventParticipantRecordResponse,
    progress: "SCHEDULED" | "OPEN" | "CLOSED"
): AttendanceStatus | null {
    if (record.status === "NOT_CHECKED" && progress !== "CLOSED") {
        return null;
    }

    return normalizeEditableStatus(record.status);
}

function getEventTypeLabel(type: AttendanceEventDetailResponse["type"]): string {
    return type === "CLASS_START" ? "Start" : "End";
}

function getDetailDateLabel(value?: string | null): string {
    return formatServerKstDateTimeDateLabelForUser(value);
}

function getCheckedAtLabel(value?: string | null): string {
    return formatServerKstDateTimeWithWeekdayForUser(value);
}

function getFullCreditBoundaryTime(detail: AttendanceEventDetailResponse | null): number | null {
    if (!detail) {
        return null;
    }

    const reference = parseServerKstDateTime(detail.scoreReferenceAt);

    if (!reference) {
        return null;
    }

    const fullCreditMinutes = detail.fullCreditThresholdMinutes ?? detail.durationMinutes;

    return reference.getTime() + fullCreditMinutes * 60 * 1000;
}

function isFullCreditTimeEnded(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): boolean {
    const fullCreditBoundaryTime = getFullCreditBoundaryTime(detail);

    if (fullCreditBoundaryTime === null) {
        return false;
    }

    return now.getTime() >= fullCreditBoundaryTime;
}

function hasSelfie(record: AttendanceEventParticipantRecordResponse): boolean {
    return Boolean(record.selfieUrl?.trim());
}

function getTimeCardLabel(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): string {
    if (!detail) {
        return "-";
    }

    const progress = resolveDetailProgress(detail, now);
    const reference = parseServerKstDateTime(detail.scoreReferenceAt);

    if (!reference) {
        return "-";
    }

    if (progress === "SCHEDULED") {
        return "Not Started";
    }

    if (progress === "CLOSED") {
        return "Ended";
    }

    if (now.getTime() < reference.getTime()) {
        return "Not Started";
    }

    const fullCreditBoundaryTime = getFullCreditBoundaryTime(detail);

    if (fullCreditBoundaryTime === null) {
        return "-";
    }

    const diffSeconds = Math.max(0, Math.floor((fullCreditBoundaryTime - now.getTime()) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = String(diffSeconds % 60).padStart(2, "0");

    return `${minutes}:${seconds}`;
}

function isBeforeScoreReferenceTime(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): boolean {
    if (!detail) {
        return false;
    }

    const reference = parseServerKstDateTime(detail.scoreReferenceAt);

    if (!reference) {
        return false;
    }

    return now.getTime() < reference.getTime();
}

function isNotStartedKpiState(
    detail: AttendanceEventDetailResponse | null,
    progress: "SCHEDULED" | "OPEN" | "CLOSED",
    now: Date
): boolean {
    return progress === "SCHEDULED" || (progress === "OPEN" && isBeforeScoreReferenceTime(detail, now));
}

function getTimeCardClassName(
    detail: AttendanceEventDetailResponse | null,
    progress: "SCHEDULED" | "OPEN" | "CLOSED",
    now: Date
): string {
    const isNotStarted = progress === "SCHEDULED" || (progress === "OPEN" && isBeforeScoreReferenceTime(detail, now));

    if (isNotStarted) {
        return "eca-admin-attendance-detail-time-left eca-admin-attendance-detail-kpi-value--not-started";
    }

    if (progress === "OPEN") {
        return "eca-admin-attendance-detail-time-left eca-admin-attendance-detail-time-left--active";
    }

    return "eca-admin-attendance-detail-time-left";
}

export default function EcaDashboardAttendanceDetail(): React.ReactElement {
    const navigate = useNavigate();
    const { externalActivityId, eventId } = useParams<{ externalActivityId?: string; eventId?: string }>();
    const [detail, setDetail] = React.useState<AttendanceEventDetailResponse | null>(null);
    const [viewMode, setViewMode] = React.useState<ViewMode>("list");
    const [sort, setSort] = React.useState<DetailSort>("nameAsc");
    const [search, setSearch] = React.useState("");
    const [searchDraft, setSearchDraft] = React.useState("");
    const [draftStatuses, setDraftStatuses] = React.useState<Record<number, AttendanceStatus>>({});
    const [editMode, setEditMode] = React.useState(false);
    const [sortOpen, setSortOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [successOpen, setSuccessOpen] = React.useState(false);
    const [selectedRecord, setSelectedRecord] = React.useState<AttendanceEventParticipantRecordResponse | null>(null);
    const [selectedStatus, setSelectedStatus] = React.useState<AttendanceStatus>("ABSENT");
    const [closedNoticeOpen, setClosedNoticeOpen] = React.useState(false);
    const [timerFinishedUi, setTimerFinishedUi] = React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [leaving, setLeaving] = React.useState(false);
    const [now, setNow] = React.useState(new Date());

    const wasOpenRef = React.useRef(false);
    const autoClosingRef = React.useRef(false);
    const fullCreditNoticeShownRef = React.useRef(false);
    const searchWrapRef = React.useRef<HTMLDivElement | null>(null);
    const fullCreditEndedInitializedRef = React.useRef(false);
    const fullCreditEndedPreviousRef = React.useRef(false);

    const detailProgress = resolveDetailProgress(detail, now);
    const records = React.useMemo(() => detail?.records ?? [], [detail]);

    const counts = React.useMemo(() => {
        return records.reduce(
            (acc, record) => {
                if (record.status === "PRESENT") {
                    acc.present += 1;
                } else if (isLateLikeStatus(record.status)) {
                    acc.late += 1;
                } else if (record.status === "ABSENT" || (record.status === "NOT_CHECKED" && detailProgress === "CLOSED")) {
                    acc.absent += 1;
                }

                return acc;
            },
            { present: 0, late: 0, absent: 0 }
        );
    }, [records, detailProgress]);

    const isNotStartedKpi = isNotStartedKpiState(detail, detailProgress, now);
    const shouldShowTimeKpi = (detailProgress === "SCHEDULED" || detailProgress === "OPEN") && !timerFinishedUi;

    const visibleRecords = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return records
            .filter((record) => !normalizedSearch || record.name.toLowerCase().includes(normalizedSearch))
            .sort((a, b) => {
                if (sort === "status") {
                    return getStatusOrder(a.status) - getStatusOrder(b.status) || a.name.localeCompare(b.name);
                }

                return a.name.localeCompare(b.name);
            });
    }, [records, search, sort]);

    const visibleGalleryRecords = React.useMemo(() => {
        return visibleRecords.filter(hasSelfie);
    }, [visibleRecords]);

    const hasChanges = React.useMemo(() => {
        return records.some((record) => {
            const draft = draftStatuses[record.recordId];

            if (draft === undefined) {
                return false;
            }

            return draft !== getOriginalEditableStatus(record, detailProgress);
        });
    }, [records, draftStatuses, detailProgress]);


    const loadDetail = React.useCallback(async (): Promise<void> => {
        if (!eventId) {
            return;
        }

        setLoading(true);

        try {
            const data = await getAttendanceEventDetail(eventId);
            setDetail(data);
            setDraftStatuses({});
        } catch (error) {
            console.error(error);
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    React.useEffect(() => {
        if (!eventId || detailProgress !== "OPEN" || editMode || saving) {
            return;
        }

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            getAttendanceEventDetail(eventId)
                .then((data) => {
                    setDetail(data);
                })
                .catch((error) => {
                    console.error(error);
                });
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [eventId, detailProgress, editMode, saving]);

    React.useEffect(() => {
        if (!searchOpen) {
            return;
        }

        function handleMouseDown(event: MouseEvent): void {
            if (searchWrapRef.current?.contains(event.target as Node)) {
                return;
            }

            setSearchOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [searchOpen]);

    React.useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    React.useEffect(() => {
        fullCreditNoticeShownRef.current = false;
        fullCreditEndedInitializedRef.current = false;
        fullCreditEndedPreviousRef.current = false;
        setTimerFinishedUi(false);
    }, [eventId]);

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    React.useEffect(() => {
        if (!detail || detailProgress !== "OPEN") {
            return;
        }

        const ended = isFullCreditTimeEnded(detail, now);

        if (!fullCreditEndedInitializedRef.current) {
            fullCreditEndedInitializedRef.current = true;
            fullCreditEndedPreviousRef.current = ended;

            if (ended) {
                setTimerFinishedUi(true);
            }

            return;
        }

        const justEnded = !fullCreditEndedPreviousRef.current && ended;

        fullCreditEndedPreviousRef.current = ended;

        if (!justEnded || fullCreditNoticeShownRef.current) {
            return;
        }

        fullCreditNoticeShownRef.current = true;
        setClosedNoticeOpen(true);
    }, [detail, detailProgress, now]);

    React.useEffect(() => {
        if (detailProgress === "OPEN") {
            wasOpenRef.current = true;
            autoClosingRef.current = false;
            return;
        }

        if (detailProgress !== "CLOSED" || !wasOpenRef.current || autoClosingRef.current || !eventId) {
            return;
        }

        autoClosingRef.current = true;
        wasOpenRef.current = false;

        void (async () => {
            try {
                await endAttendanceEventNow(eventId);
                await loadDetail();
            } catch (error) {
                console.error(error);
                await loadDetail();
            }
        })();
    }, [detailProgress, eventId, loadDetail]);

    function handleCloseClosedNotice(): void {
        setClosedNoticeOpen(false);
        setTimerFinishedUi(true);
        void loadDetail();
    }

    function handleBack(): void {
        if (!externalActivityId) {
            navigate("/program-admin/home", { replace: true });
            return;
        }

        setLeaving(true);

        window.setTimeout(() => {
            navigate(`/program-admin/activities/${externalActivityId}/attendance`);
        }, 180);
    }

    function handleToggleEditMode(): void {
        setEditMode((prev) => !prev);
    }

    function handleChangeDraftStatus(recordId: number, status: AttendanceStatus): void {
        if (!editMode) {
            return;
        }

        setDraftStatuses((prev) => ({ ...prev, [recordId]: status }));
    }

    async function handleSaveListChanges(): Promise<void> {
        if (!hasChanges || saving) {
            return;
        }

        setSaving(true);

        try {
            const changedRecords = records.filter((record) => {
                const draft = draftStatuses[record.recordId];

                return draft !== undefined && draft !== normalizeEditableStatus(record.status);
            });

            await Promise.all(changedRecords.map((record) => updateAttendanceRecordStatus(record.recordId, { status: draftStatuses[record.recordId] })));
            await loadDetail();
            setEditMode(false);
            setSuccessOpen(true);
        } catch (error) {
            console.error(error);
            alert("출석 상태를 저장하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    function handleOpenImageModal(record: AttendanceEventParticipantRecordResponse): void {
        setSelectedRecord(record);
        setSelectedStatus(normalizeEditableStatus(record.status));
    }

    async function handleSaveSelectedRecord(): Promise<void> {
        if (!selectedRecord || saving) {
            return;
        }

        setSaving(true);

        try {
            await updateAttendanceRecordStatus(selectedRecord.recordId, { status: selectedStatus });
            await loadDetail();
            setSelectedRecord(null);
            setSuccessOpen(true);
        } catch (error) {
            console.error(error);
            alert("출석 상태를 저장하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    async function handleStartNow(): Promise<void> {
        if (!eventId || !detail || saving) {
            return;
        }

        setSaving(true);

        try {
            await startAttendanceEventNow(eventId, detail.type, detail.scoreReferenceAt);
            await loadDetail();
        } catch (error) {
            console.error(error);
            alert("출석 이벤트를 시작하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    async function handleEndNow(): Promise<void> {
        if (!eventId || saving) {
            return;
        }

        setSaving(true);

        try {
            await endAttendanceEventNow(eventId);
            await loadDetail();
        } catch (error) {
            console.error(error);
            alert("출석 이벤트를 종료하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAttendanceEvent(): Promise<void> {
        if (!eventId || saving) {
            return;
        }

        const confirmed = window.confirm("이 출석 이벤트를 삭제하시겠습니까? 삭제된 출석 기록과 사진은 복구할 수 없습니다.");

        if (!confirmed) {
            return;
        }

        setSaving(true);
        setMenuOpen(false);

        try {
            await deleteAttendanceEvent(eventId);

            if (externalActivityId) {
                navigate(`/program-admin/activities/${externalActivityId}/attendance`, { replace: true });
            } else {
                navigate("/program-admin/home", { replace: true });
            }
        } catch (error) {
            console.error(error);
            alert("출석 이벤트를 삭제하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    }

    function getDraftStatus(record: AttendanceEventParticipantRecordResponse): AttendanceStatus | null {
        const draft = draftStatuses[record.recordId];
        if (draft !== undefined) {
            return draft;
        }
        return getOriginalEditableStatus(record, detailProgress);
    }

    return (
        <>
            <div className={leaving ? "eca-admin-attendance-detail-page eca-admin-attendance-detail-page--leaving" : "eca-admin-attendance-detail-page"}>
                <div className="eca-admin-attendance-detail-inner">
                    <h1 className="eca-admin-attendance-detail-title">Attendance</h1>

                    <section className="eca-admin-attendance-detail-card">
                        <button type="button" className="eca-admin-attendance-detail-back-button" onClick={handleBack}>
                            <BackIcon />
                        </button>

                        <div className="eca-admin-attendance-detail-heading-row">
                            <div className="eca-admin-attendance-detail-heading-title-group">
                                <h2 className="eca-admin-attendance-detail-event-title">
                                    <span>{detail ? getDetailDateLabel(detail.scoreReferenceAt) : "-"}</span>
                                    <b>{detail ? getEventTypeLabel(detail.type) : ""}</b>
                                </h2>

                                <div className="eca-admin-attendance-detail-menu-wrap">
                                    <button type="button" className="eca-admin-attendance-detail-more-button" onClick={() => setMenuOpen((prev) => !prev)}>
                                        <MoreIcon />
                                    </button>

                                    {menuOpen ? (
                                        <>
                                            <button type="button" className="eca-admin-attendance-detail-menu-backdrop" aria-label="close menu" onClick={() => setMenuOpen(false)} />
                                            <div className="eca-admin-attendance-detail-small-menu">
                                                <button type="button" className="eca-admin-attendance-detail-small-menu-item eca-admin-attendance-detail-small-menu-item--delete" onClick={handleDeleteAttendanceEvent} disabled={saving}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                        <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#EA5345"/>
                                                    </svg>
                                                    delete
                                                </button>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            <button type="button" className="eca-admin-attendance-detail-view-toggle" onClick={() => setViewMode((prev) => prev === "list" ? "gallery" : "list")}>
                                {viewMode === "list" ? "View as Gallery" : "View as List"}
                            </button>
                        </div>

                        <section className="eca-admin-attendance-detail-kpi-grid">
                            {shouldShowTimeKpi ? (
                                <>
                                    <article className="eca-admin-attendance-detail-kpi-card eca-admin-attendance-detail-kpi-card--time">
                                        <div className="eca-admin-attendance-detail-kpi-head">
                                            <span>{detailProgress === "OPEN" ? "Time Left" : "Time"}</span>

                                            {showManualWindowButtons && detailProgress === "SCHEDULED" && detail ? (
                                                <button type="button" onClick={handleStartNow} disabled={saving}>
                                                    Start Now
                                                </button>
                                            ) : null}

                                            {showManualWindowButtons && detailProgress === "OPEN" ? (
                                                <button type="button" onClick={handleEndNow} disabled={saving}>
                                                    End Now
                                                </button>
                                            ) : null}
                                        </div>

                                        <strong className={getTimeCardClassName(detail, detailProgress, now)}>
                                            {getTimeCardLabel(detail, now)}
                                        </strong>
                                    </article>

                                    <article className="eca-admin-attendance-detail-kpi-card">
                                        <span>Present</span>
                                        <strong className={isNotStartedKpi ? "eca-admin-attendance-detail-kpi-value--not-started" : ""}>
                                            {isNotStartedKpi ? "Not Started" : counts.present}
                                        </strong>
                                    </article>

                                    <article className="eca-admin-attendance-detail-kpi-card">
                                        <span>Absent</span>
                                        <strong className={isNotStartedKpi ? "eca-admin-attendance-detail-kpi-value--not-started" : ""}>
                                            {isNotStartedKpi ? "Not Started" : counts.absent}
                                        </strong>
                                    </article>
                                </>
                            ) : (
                                <>
                                    <article className="eca-admin-attendance-detail-kpi-card">
                                        <span>Present</span>
                                        <strong>{counts.present}</strong>
                                    </article>

                                    <article className="eca-admin-attendance-detail-kpi-card">
                                        <span>Late</span>
                                        <strong>{counts.late}</strong>
                                    </article>

                                    <article className="eca-admin-attendance-detail-kpi-card">
                                        <span>Absent</span>
                                        <strong>{counts.absent}</strong>
                                    </article>
                                </>
                            )}
                        </section>

                        <div className="eca-admin-attendance-detail-participants-header">
                            <h3>Participants ({records.length})</h3>

                            <div className="eca-admin-attendance-detail-participants-actions">
                                <div className="eca-admin-attendance-detail-sort-wrap">
                                    <button type="button" className="eca-admin-attendance-detail-icon-button" onClick={() => setSortOpen((prev) => !prev)}>
                                        <SortIcon />
                                    </button>

                                    {sortOpen ? (
                                        <>
                                            <button type="button" className="eca-admin-attendance-detail-menu-backdrop" aria-label="close sort" onClick={() => setSortOpen(false)} />
                                            <div className="eca-admin-attendance-detail-sort-menu">
                                                {sortOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={sort === option.value ? "eca-admin-attendance-detail-sort-menu-item eca-admin-attendance-detail-sort-menu-item--active" : "eca-admin-attendance-detail-sort-menu-item"}
                                                        onClick={() => {
                                                            setSort(option.value);
                                                            setSortOpen(false);
                                                        }}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                                <button type="button" className="eca-admin-attendance-detail-icon-button" onClick={handleToggleEditMode}>
                                    <EditIcon active={editMode} />
                                </button>

                                <div className="eca-admin-attendance-detail-search-wrap" ref={searchWrapRef}>
                                    <button type="button" className="eca-admin-attendance-detail-icon-button" onClick={() => { setSearchDraft(search); setSearchOpen((prev) => !prev); }}>
                                        <SearchIcon />
                                    </button>

                                    {searchOpen ? (
                                        <div className="eca-admin-attendance-detail-search-popover">
                                            <input
                                                autoFocus
                                                value={searchDraft}
                                                placeholder="참여자 검색"
                                                onChange={(event) => {
                                                    const value = event.target.value;

                                                    setSearchDraft(value);
                                                    setSearch(value.trim());
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        setSearch(searchDraft.trim());
                                                        setSearchOpen(false);
                                                    }

                                                    if (event.key === "Escape") {
                                                        setSearchOpen(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {search ? (
                            <div className="eca-admin-attendance-detail-search-chip">
                                <span>검색: {search}</span>
                                <button type="button" onClick={() => setSearch("")}>Clear</button>
                            </div>
                        ) : null}

                        {loading ? (
                            <p className="eca-admin-attendance-detail-empty">Loading...</p>
                        ) : viewMode === "list" ? (
                            <div className="eca-admin-attendance-detail-list">
                                {visibleRecords.map((record) => {
                                    const draftStatus = getDraftStatus(record);

                                    return (
                                        <div key={record.recordId} className="eca-admin-attendance-detail-row">
                                            <span className="eca-admin-attendance-detail-avatar">
                                                {record.profileImage ? (
                                                    <img src={record.profileImage} alt="" className="eca-admin-attendance-detail-avatar-image" />
                                                ) : null}
                                            </span>
                                            <div className="eca-admin-attendance-detail-person">
                                                <strong>{record.name}</strong>
                                            </div>

                                            <div className="eca-admin-attendance-detail-status-buttons">
                                                {statusOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={draftStatus === option.value ? `eca-admin-attendance-detail-status-pill eca-admin-attendance-detail-status-pill--${option.value.toLowerCase()} eca-admin-attendance-detail-status-pill--active` : "eca-admin-attendance-detail-status-pill"}
                                                        onClick={() => handleChangeDraftStatus(record.recordId, option.value)}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <button type="button" className="eca-admin-attendance-detail-chat-button" title="채팅 기능은 추후 연결 예정입니다." disabled>
                                                <ChatIcon />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="eca-admin-attendance-detail-gallery">
                                {visibleGalleryRecords.length === 0 ? (
                                    <p className="eca-admin-attendance-detail-empty">업로드된 출석 사진이 없습니다.</p>
                                ) : (
                                    visibleGalleryRecords.map((record) => (
                                        <button key={record.recordId} type="button" className="eca-admin-attendance-detail-gallery-card" onClick={() => handleOpenImageModal(record)}>
                                            <img src={record.selfieUrl ?? ""} alt={record.name} />
                                            <span>{record.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {editMode ? (
                            <button type="button" className={hasChanges ? "eca-admin-attendance-detail-save-button eca-admin-attendance-detail-save-button--active" : "eca-admin-attendance-detail-save-button"} disabled={!hasChanges || saving} onClick={handleSaveListChanges}>
                                Save
                            </button>
                        ) : null}
                    </section>
                </div>
            </div>
 
            {selectedRecord ? (
                <div className="eca-admin-attendance-detail-modal-backdrop" onMouseDown={() => setSelectedRecord(null)}>
                    <section className="eca-admin-attendance-detail-photo-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" className="eca-admin-attendance-detail-photo-close" onClick={() => setSelectedRecord(null)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>

                        <div className="eca-admin-attendance-detail-photo-preview">
                            {selectedRecord.selfieUrl ? <img src={selectedRecord.selfieUrl} alt={selectedRecord.name} /> : <span>No Image</span>}
                        </div>

                        <div className="eca-admin-attendance-detail-photo-info">
                            <h2>{selectedRecord.name}</h2>
                            <p>{getCheckedAtLabel(selectedRecord.checkedAt)}</p>

                            <div className="eca-admin-attendance-detail-photo-status-list">
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={selectedStatus === option.value ? "eca-admin-attendance-detail-photo-status eca-admin-attendance-detail-photo-status--active" : "eca-admin-attendance-detail-photo-status"}
                                        onClick={() => setSelectedStatus(option.value)}
                                    >
                                        <span />
                                        <b>{option.label}</b>
                                    </button>
                                ))}
                            </div>

                            <button type="button" className="eca-admin-attendance-detail-photo-save" onClick={handleSaveSelectedRecord} disabled={saving}>
                                Save
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            {successOpen ? (
                <div className="eca-admin-attendance-detail-modal-backdrop" onMouseDown={() => setSuccessOpen(false)}>
                    <section className="eca-admin-attendance-detail-success-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <h2>Saved!</h2>
                        <button type="button" onClick={() => setSuccessOpen(false)}>OK</button>
                    </section>
                </div>
            ) : null}

            {closedNoticeOpen ? (
                <div className="eca-admin-attendance-detail-modal-backdrop" onMouseDown={handleCloseClosedNotice}>
                    <section className="eca-admin-attendance-detail-success-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <h2>Attendance has closed</h2>
                        <button type="button" onClick={handleCloseClosedNotice}>OK</button>
                    </section>
                </div>
            ) : null}
        </>
    );
}