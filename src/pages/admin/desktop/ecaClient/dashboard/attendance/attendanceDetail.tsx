import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endAttendanceEventNow, getAttendanceEventDetail, startAttendanceEventNow, updateAttendanceRecordStatus, type AttendanceEventDetailResponse, type AttendanceEventParticipantRecordResponse, type AttendanceStatus, } from "../../../../../../api/ea";
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

    if (detail.progress === "SCHEDULED") {
        return "SCHEDULED";
    }

    if (detail.progress === "CLOSED") {
        return "CLOSED";
    }

    const end = new Date(detail.uploadWindowEnd);

    if (now > end) {
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

function getDetailDateLabel(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function getCheckedAtLabel(value?: string | null): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function getFullCreditEndTime(detail: AttendanceEventDetailResponse | null): number | null {
    if (!detail) {
        return null;
    }

    const start = new Date(detail.uploadWindowStart);

    if (Number.isNaN(start.getTime())) {
        return null;
    }

    const fullCreditMinutes = detail.fullCreditThresholdMinutes ?? detail.durationMinutes;

    return start.getTime() + fullCreditMinutes * 60 * 1000;
}

function isFullCreditTimeEnded(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): boolean {
    const fullCreditEndTime = getFullCreditEndTime(detail);

    if (fullCreditEndTime === null) {
        return false;
    }

    return now.getTime() >= fullCreditEndTime;
}

function getTimeCardLabel(
    detail: AttendanceEventDetailResponse | null,
    now: Date
): string {
    if (!detail) {
        return "-";
    }

    const progress = resolveDetailProgress(detail, now);
    const start = new Date(detail.uploadWindowStart);

    if (Number.isNaN(start.getTime())) {
        return "-";
    }

    if (progress === "SCHEDULED") {
        return new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(start);
    }

    if (progress === "CLOSED") {
        return "Ended";
    }

    const fullCreditMinutes = detail.fullCreditThresholdMinutes ?? detail.durationMinutes;
    const fullCreditEnd = new Date(start.getTime() + fullCreditMinutes * 60 * 1000);
    const diffSeconds = Math.max(0, Math.floor((fullCreditEnd.getTime() - now.getTime()) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = String(diffSeconds % 60).padStart(2, "0");

    return `${minutes}:${seconds}`;
}

export default function EcaDashboardAttendanceDetail(): React.ReactElement {
    const navigate = useNavigate();
    const { eventId } = useParams<{ externalActivityId: string; eventId: string }>();
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

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [leaving, setLeaving] = React.useState(false);
    const [now, setNow] = React.useState(new Date());

    const wasOpenRef = React.useRef(false);
    const autoClosingRef = React.useRef(false);
    const fullCreditNoticeShownRef = React.useRef(false);

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

    const shouldShowTimeKpi = detailProgress === "SCHEDULED" || detailProgress === "OPEN";

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
        void loadDetail();
    }, [loadDetail]);

    React.useEffect(() => {
        fullCreditNoticeShownRef.current = false;
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

        if (fullCreditNoticeShownRef.current) {
            return;
        }

        if (!isFullCreditTimeEnded(detail, now)) {
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

    function handleBack(): void {
        setLeaving(true);
        window.setTimeout(() => navigate(-1), 180);
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
            await startAttendanceEventNow(eventId, detail.type);
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

    function handleApplySearch(): void {
        setSearch(searchDraft.trim());
        setSearchOpen(false);
    }

    function getDraftStatus(record: AttendanceEventParticipantRecordResponse): AttendanceStatus | null {
        const draft = draftStatuses[record.recordId];

        if (draft !== undefined) {
            return draft;
        }

        return getOriginalEditableStatus(record, detailProgress);
    }

    return (
        <div className={leaving ? "attendance-detail-page attendance-detail-page--leaving" : "attendance-detail-page"}>
            <div className="attendance-detail-inner">
                <h1 className="attendance-detail-title">Attendance</h1>

                <section className="attendance-detail-card">
                    <button type="button" className="attendance-detail-back-button" onClick={handleBack}>
                        <BackIcon />
                    </button>

                    <div className="attendance-detail-heading-row">
                        <div className="attendance-detail-heading-title-group">
                            <h2 className="attendance-detail-event-title">
                                <span>{detail ? getDetailDateLabel(detail.eventDate) : "-"}</span>
                                <b>{detail ? getEventTypeLabel(detail.type) : ""}</b>
                            </h2>

                            <div className="attendance-detail-menu-wrap">
                                <button type="button" className="attendance-detail-more-button" onClick={() => setMenuOpen((prev) => !prev)}>
                                    <MoreIcon />
                                </button>

                                {menuOpen ? (
                                    <>
                                        <button type="button" className="attendance-detail-menu-backdrop" aria-label="close menu" onClick={() => setMenuOpen(false)} />
                                        <div className="attendance-detail-small-menu">
                                            <button type="button" className="attendance-detail-small-menu-item attendance-detail-small-menu-item--delete" onClick={() => alert("출석 이벤트 삭제 API 연결 후 사용할 수 있습니다.")}>delete</button>
                                            <button type="button" className="attendance-detail-small-menu-item" onClick={() => alert("출석 이벤트 수정 API 연결 후 사용할 수 있습니다.")}>revise</button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <button type="button" className="attendance-detail-view-toggle" onClick={() => setViewMode((prev) => prev === "list" ? "gallery" : "list")}>
                            {viewMode === "list" ? "View as Gallery" : "View as List"}
                        </button>
                    </div>

                    <section className="attendance-detail-kpi-grid">
                        {shouldShowTimeKpi ? (
                            <>
                                <article className="attendance-detail-kpi-card attendance-detail-kpi-card--time">
                                    <div className="attendance-detail-kpi-head">
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

                                    <strong className={detailProgress === "OPEN" ? "attendance-detail-time-left attendance-detail-time-left--active" : "attendance-detail-time-left"}>
                                        {getTimeCardLabel(detail, now)}
                                    </strong>
                                </article>

                                <article className="attendance-detail-kpi-card">
                                    <span>Present</span>
                                    <strong>{counts.present}</strong>
                                </article>

                                <article className="attendance-detail-kpi-card">
                                    <span>Absent</span>
                                    <strong>{counts.absent}</strong>
                                </article>
                            </>
                        ) : (
                            <>
                                <article className="attendance-detail-kpi-card">
                                    <span>Present</span>
                                    <strong>{counts.present}</strong>
                                </article>

                                <article className="attendance-detail-kpi-card">
                                    <span>Late</span>
                                    <strong>{counts.late}</strong>
                                </article>

                                <article className="attendance-detail-kpi-card">
                                    <span>Absent</span>
                                    <strong>{counts.absent}</strong>
                                </article>
                            </>
                        )}
                    </section>

                    <div className="attendance-detail-participants-header">
                        <h3>Participants ({records.length})</h3>

                        <div className="attendance-detail-participants-actions">
                            <div className="attendance-detail-sort-wrap">
                                <button type="button" className="attendance-detail-icon-button" onClick={() => setSortOpen((prev) => !prev)}>
                                    <SortIcon />
                                </button>

                                {sortOpen ? (
                                    <>
                                        <button type="button" className="attendance-detail-menu-backdrop" aria-label="close sort" onClick={() => setSortOpen(false)} />
                                        <div className="attendance-detail-sort-menu">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={sort === option.value ? "attendance-detail-sort-menu-item attendance-detail-sort-menu-item--active" : "attendance-detail-sort-menu-item"}
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

                            <button type="button" className="attendance-detail-icon-button" onClick={handleToggleEditMode}>
                                <EditIcon active={editMode} />
                            </button>

                            <button type="button" className="attendance-detail-icon-button" onClick={() => {
                                setSearchDraft(search);
                                setSearchOpen(true);
                            }}>
                                <SearchIcon />
                            </button>
                        </div>
                    </div>

                    {search ? (
                        <div className="attendance-detail-search-chip">
                            <span>검색: {search}</span>
                            <button type="button" onClick={() => setSearch("")}>Clear</button>
                        </div>
                    ) : null}

                    {loading ? (
                        <p className="attendance-detail-empty">Loading...</p>
                    ) : viewMode === "list" ? (
                        <div className="attendance-detail-list">
                            {visibleRecords.map((record) => {
                                const draftStatus = getDraftStatus(record);

                                return (
                                    <div key={record.recordId} className="attendance-detail-row">
                                        <span className="attendance-detail-avatar">
                                            {record.profileImage ? (
                                                <img src={record.profileImage} alt="" className="attendance-detail-avatar-image" />
                                            ) : null}
                                        </span>
                                        <div className="attendance-detail-person">
                                            <strong>{record.name}</strong>
                                            <span>{getCheckedAtLabel(record.checkedAt)}</span>
                                        </div>

                                        <div className="attendance-detail-status-buttons">
                                            {statusOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={draftStatus === option.value ? `attendance-detail-status-pill attendance-detail-status-pill--${option.value.toLowerCase()} attendance-detail-status-pill--active` : "attendance-detail-status-pill"}
                                                    onClick={() => handleChangeDraftStatus(record.recordId, option.value)}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>

                                        <button type="button" className="attendance-detail-chat-button" title="채팅 기능은 추후 연결 예정입니다." disabled>
                                            <ChatIcon />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="attendance-detail-gallery">
                            {visibleRecords.map((record) => (
                                <button key={record.recordId} type="button" className="attendance-detail-gallery-card" onClick={() => handleOpenImageModal(record)}>
                                    {record.selfieUrl ? <img src={record.selfieUrl} alt={record.name} /> : <span className="attendance-detail-gallery-empty">No Image</span>}
                                    <span>{record.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {editMode ? (
                        <button type="button" className={hasChanges ? "attendance-detail-save-button attendance-detail-save-button--active" : "attendance-detail-save-button"} disabled={!hasChanges || saving} onClick={handleSaveListChanges}>
                            Save
                        </button>
                    ) : null}
                </section>
            </div>

            {searchOpen ? (
                <div className="attendance-detail-modal-backdrop" onMouseDown={() => setSearchOpen(false)}>
                    <section className="attendance-detail-search-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <h2>참여자 검색</h2>
                        <input
                            value={searchDraft}
                            placeholder="학생 이름을 입력하세요"
                            onChange={(event) => setSearchDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    handleApplySearch();
                                }
                            }}
                        />
                        <div>
                            <button type="button" onClick={() => setSearchOpen(false)}>취소</button>
                            <button type="button" onClick={handleApplySearch}>검색</button>
                        </div>
                    </section>
                </div>
            ) : null}

            {selectedRecord ? (
                <div className="attendance-detail-modal-backdrop" onMouseDown={() => setSelectedRecord(null)}>
                    <section className="attendance-detail-photo-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <button type="button" className="attendance-detail-photo-close" onClick={() => setSelectedRecord(null)}>×</button>

                        <div className="attendance-detail-photo-preview">
                            {selectedRecord.selfieUrl ? <img src={selectedRecord.selfieUrl} alt={selectedRecord.name} /> : <span>No Image</span>}
                        </div>

                        <div className="attendance-detail-photo-info">
                            <h2>{selectedRecord.name}</h2>
                            <p>{getCheckedAtLabel(selectedRecord.checkedAt)}</p>

                            <div className="attendance-detail-photo-status-list">
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={selectedStatus === option.value ? "attendance-detail-photo-status attendance-detail-photo-status--active" : "attendance-detail-photo-status"}
                                        onClick={() => setSelectedStatus(option.value)}
                                    >
                                        <span />
                                        <b>{option.label}</b>
                                    </button>
                                ))}
                            </div>

                            <button type="button" className="attendance-detail-photo-save" onClick={handleSaveSelectedRecord} disabled={saving}>
                                Save
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}

            {successOpen ? (
                <div className="attendance-detail-modal-backdrop" onMouseDown={() => setSuccessOpen(false)}>
                    <section className="attendance-detail-success-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <h2>Saved!</h2>
                        <button type="button" onClick={() => setSuccessOpen(false)}>OK</button>
                    </section>
                </div>
            ) : null}

            {closedNoticeOpen ? (
                <div className="attendance-detail-modal-backdrop" onMouseDown={() => setClosedNoticeOpen(false)}>
                    <section className="attendance-detail-success-modal" onMouseDown={(event) => event.stopPropagation()}>
                        <h2>Attendance has closed</h2>
                        <button type="button" onClick={() => setClosedNoticeOpen(false)}>OK</button>
                    </section>
                </div>
            ) : null}

        </div>
    );
}