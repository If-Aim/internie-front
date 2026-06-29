import { useTranslation } from "react-i18next";

import React from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, getUserMe, sendMyEmailCode, verifyMyEmailCode, type UserMe, } from "../../../api/client";
import { getMyParticipatingExternalActivities, type StudentExternalActivityResponse } from "../../../api/ea";
import { getMyOrganizations } from "../../../api/organizationClient";
import type { MyOrganizationResponse } from "../../../api/organizationClient";
import { hasPendingGlobalModal } from "../../../globalModalStorage";

import StudentMobileSideMenu from "./studentMobileSideMenu";
import "../../../App.css"; 

type TimeRange = {
	startTime?: string | null;
	endTime?: string | null;
};

type DateRange = {
	startDate: string; 
	endDate: string;
};

type ScheduleItem = {
	instanceId: string;
	eventId: string;
	title: string;
	subtitle: string;
	date: string;
	eventDayId?: string | number | null;
	isLocked?: boolean;
	transcriptionCount?: number;
} & TimeRange & DateRange;

type RawEvent = {
	id: string | number;
	title: string;
	content?: string;
} & TimeRange & DateRange;

type Transcription = {
	id: number;
	text: string;
	audioUrl?: string;
};

type EventDay = {
	eventDayId: number;
	title: string;
	eventId: string | number;
	date: string; // YYYY-MM-DD
	memo?: string | null;
	completed: boolean;
	transcriptions?: Transcription[];
} & TimeRange;

type EventDayMonthResponse = {
	totalCount: number;
	eventDayList: EventDay[];
};

type MonthFilterSheetProps = {
	open: boolean;
	valueYm: string;
	sortOrder: "past" | "latest";
	onClose: () => void;
	onApply: (nextYm: string, nextSort: "past" | "latest") => void;
};

type SortOrder = "past" | "latest";

const TOTAL_QUESTIONS = 4; // 질문 갯수
/*날짜 관련 함수*/
function toYmd(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
function ymdToDate(ymd: string): Date {
	const [y, m, d] = ymd.split("-").map(Number);
	return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}
function expandEventToDailyItems(
	e: RawEvent,
	ym: string
): ScheduleItem[] {
	const [yStr, mStr] = ym.split("-");
	const y = Number(yStr);
	const m = Number(mStr); 
	const monthStart = new Date(y, m - 1, 1);
	const monthEnd = new Date(y, m, 0);

	const start = ymdToDate(e.startDate);
	const end = ymdToDate(e.endDate);

	const s = start > monthStart ? start : monthStart;
	const ed = end < monthEnd ? end : monthEnd;

	if (s > ed) return [];

	const eventId = String(e.id);
	const out: ScheduleItem[] = [];
	for (let cur = s; cur <= ed; cur = addDays(cur, 1)) {
			const date = toYmd(cur);
			out.push({
			instanceId: `${eventId}_${date}`,
			eventId,
			title: e.title,
			subtitle: e.content ?? "",
			date,
			startDate: e.startDate,
			endDate: e.endDate,
			startTime: e.startTime ?? null,
			endTime: e.endTime ?? null,
			eventDayId: null,
		});
	}
	return out;
}
function formatDateYmdLocale(iso: string, locale: string): string {
	const d = new Date(`${iso}T00:00:00`);
	return new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(d);
}
function dateLabel(
	iso: string,
	locale: string,
	t: (k: string, opts?: any) => string
): string {
	const d = new Date(`${iso}T00:00:00`);
	const today = new Date();

	const same =
		d.getFullYear() === today.getFullYear() &&
		d.getMonth() === today.getMonth() &&
		d.getDate() === today.getDate();

	const dayNum = d.getDate();
	const weekdayFormat: Intl.DateTimeFormatOptions["weekday"] = locale.startsWith("ko") ? "long" : "short";
	const weekday = new Intl.DateTimeFormat(locale, { weekday: weekdayFormat, }).format(d);
  
	return same
		? t("home.date.today", { day: dayNum })
		: t("home.date.weekday", { day: dayNum, weekday });
}
function ymToDisplayWithLang(ym: string, lang: string) {
	const [y, m] = ym.split("-").map(Number);
	const d = new Date(y, m - 1, 1);

	if (lang.startsWith("ko")) {
		return `${y}.${String(m).padStart(2, "0")}.`;
	}
	// 영어는 "Oct 2025"
	return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}

/* 시간 관련 함수 */
function hhmm(t?: string | null): string {
	if (!t) return "";
	return t.slice(0, 5);
}
function toHHmm(t?: string | null): string | undefined {
	if (!t) return undefined;
	return t.length >= 5 ? t.slice(0, 5) : t;
}
function isAllDayTime(startTime?: string | null, endTime?: string | null): boolean {
	if (!startTime || !endTime) return false;
	const s = startTime.slice(0, 5);
	const e = endTime.slice(0, 5);
	return s === "00:00" && (e === "24:00" || e === "23:59");
}
function timeRangeText(
	startTime?: string | null,
	endTime?: string | null,
	t?: (key: string, opts?: any) => string
): string {
	if (!startTime || !endTime) return "";
	if (isAllDayTime(startTime, endTime)) return t ? t("common.allDay") : "All day";
	return `${hhmm(startTime)}–${hhmm(endTime)}`;
}

type HeaderProps = {
	onMenuClick: () => void;
	onAddClick: () => void;
};

function Header({ onMenuClick, onAddClick }: HeaderProps): React.ReactElement {
	const { t } = useTranslation();

	return (
		<div className="topbar topbar-main">
			<button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
				<img className="icon" src="/icons/menu-01.svg" alt={t("common.menu")} />
			</button>

			<div className="app-title">internie</div>

			<button className="iconbtn" aria-label={t("common.add")} onClick={onAddClick}>
				<img className="icon" src="/icons/plus-01.svg" alt={t("common.add")} />
			</button>
		</div>
	);
}

/**
 * 로딩중 점 애니메이션  
 */
function LoadingDots() {
	return (
		<div className="loading-dots" role="status" aria-live="polite" aria-label="loading" >
			<span className="loading-dot" />
			<span className="loading-dot" />
			<span className="loading-dot" />
		</div>
	);
}

function MonthFilterSheet({
	open,
	valueYm,
	sortOrder,
	onClose,
	onApply,
}: MonthFilterSheetProps) {
	const { t, i18n } = useTranslation();
	const [tmpYm, setTmpYm] = React.useState(valueYm);
	const [tmpSort, setTmpSort] = React.useState<"past" | "latest">(sortOrder);
	const [pickerYm, setPickerYm] = React.useState(tmpYm);
	const [isMonthPickerOpen, setIsMonthPickerOpen] = React.useState(false);

	React.useEffect(() => {
		if (open) {
			setTmpYm(valueYm);
			setTmpSort(sortOrder);
			setPickerYm(valueYm);
		}
	}, [open, valueYm, sortOrder]);

	React.useEffect(() => {
		if (!open) return;
		const scrollY = window.scrollY;
		document.body.style.position = "fixed";
		document.body.style.top = `-${scrollY}px`;
		document.body.style.left = "0";
		document.body.style.right = "0";
		document.body.style.width = "100%";

		return () => {
			const y = Math.abs(parseInt(document.body.style.top || "0", 10));
			document.body.style.position = "";
			document.body.style.top = "";
			document.body.style.left = "";
			document.body.style.right = "";
			document.body.style.width = "";
			window.scrollTo(0, y);
		};
	}, [open]);

	if (!open) return null;

	return (
		<div className="period-sheet-backdrop" onClick={onClose} role="presentation">
			<div className="period-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="period-sheet-header">
					<div className="period-sheet-title">{t("filter.title")}</div>
					<button className="period-sheet-close" onClick={onClose} aria-label={t("common.close")}>
						<img className="icon" alt="" src="/icons/x-01.svg" />
					</button>
				</div>

				<div className="period-sheet-body">
					<div className="period-sheet-section">
						<div className="period-sheet-label">{t("filter.period")}</div>

							<label className="month-input">
							<div className="month-input-text">{ymToDisplayWithLang(tmpYm, i18n.language)}</div>
							<button type="button" className="month-icon-btn" aria-label={t("filter.period")} onClick={() => {setPickerYm(tmpYm); setIsMonthPickerOpen(true);}}><img className="month-input-icon" src="/icons/calendar-07.svg" alt="" /></button>
							<input className="month-input-native" type="text" value={ymToDisplayWithLang(tmpYm, i18n.language)} readOnly onClick={() => {setPickerYm(tmpYm); setIsMonthPickerOpen(true);}} aria-label="month" />
						</label>
					</div>

					<div className="period-sheet-section">
						<div className="period-sheet-label">{t("filter.sort")}</div>

						<div className="sort-row">
							<button type="button" className={`sort-btn ${tmpSort === "past" ? "active" : ""}`} onClick={() => setTmpSort("past")} >
								{t("filter.sortPast")}
							</button>
							<button type="button" className={`sort-btn ${tmpSort === "latest" ? "active" : ""}`} onClick={() => setTmpSort("latest")} >
								{t("filter.sortLatest")}
							</button>
						</div>
					</div>
				</div>

				<div className="period-sheet-footer">
					<button type="button" className="period-sheet-apply" onClick={() => onApply(tmpYm, tmpSort)} > {t("filter.apply")} </button>
				</div>

				<MonthPickerModal
					open={isMonthPickerOpen}
					ym={pickerYm}
					lang={i18n.language}
					minYear={2020}
					maxYear={2030}
					onClose={() => setIsMonthPickerOpen(false)}
					onConfirm={(nextYm) => { setPickerYm(nextYm); setTmpYm(nextYm); setIsMonthPickerOpen(false); }} 
				/>
			</div>
		</div>
	);
}

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function monthLabel(m: number, lang: string) {
	if (lang.startsWith("ko")) return `${m}월`;
	const d = new Date(2025, m - 1, 1);
	return new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
}

function MonthWheelPicker({
	ym,
	lang,
	onChange,
	minYear,
	maxYear,
}: {
	ym: string;
	lang: string;
	onChange: (nextYm: string) => void;
	minYear: number;
	maxYear: number;
}) {
	const PAD_ITEMS = 2;
	const itemRef = React.useRef<HTMLDivElement | null>(null);
	const [itemH, setItemH] = React.useState(52);
	React.useEffect(() => {
		if (!itemRef.current) return;
		const h = itemRef.current.offsetHeight;
		if (h > 0) setItemH(h);
	}, []);
	const years = React.useMemo(() => {
		const out: number[] = [];
		for (let y = minYear; y <= maxYear; y++) out.push(y);
		return out;
	}, [minYear, maxYear]);

	const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

	const [yStr, mStr] = ym.split("-");
	const selectedYear = Number(yStr);
	const selectedMonth = Number(mStr);

	const yearRef = React.useRef<HTMLDivElement | null>(null);
	const monthRef = React.useRef<HTMLDivElement | null>(null);
	const lockRef = React.useRef(false);
	const centerOffset = (el: HTMLDivElement) => (el.clientHeight - itemH) / 2;

	const setWheelToValue = React.useCallback(() => {
		const yIdx = clamp(years.indexOf(selectedYear), 0, years.length - 1);
		const mIdx = clamp(selectedMonth - 1, 0, 11);

		const yEl = yearRef.current;
		const mEl = monthRef.current;
		if (!yEl || !mEl) return;

		const yTop = (yIdx + PAD_ITEMS) * itemH - centerOffset(yEl);
		const mTop = (mIdx + PAD_ITEMS) * itemH - centerOffset(mEl);

		yEl.scrollTop = yTop;
		mEl.scrollTop = mTop;
	}, [years, selectedYear, selectedMonth, itemH]);

	React.useEffect(() => {
		setWheelToValue();
	}, [setWheelToValue]);

	const onYearScroll = () => {
		if (lockRef.current) return;
		scheduleSnap("year");
	};
	const onMonthScroll = () => {
		if (lockRef.current) return;
		scheduleSnap("month");
	};

	const snapTimerRef = React.useRef<number | null>(null);
	const smoothScrollTo = (el: HTMLDivElement, top: number) => {
		el.scrollTo({ top, behavior: "smooth" });
	};
	const scheduleSnap = React.useCallback(
		(kind: "year" | "month") => {
		const el = kind === "year" ? yearRef.current : monthRef.current;
		if (!el) return;

		if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);

		snapTimerRef.current = window.setTimeout(() => {
			lockRef.current = true;
			try {
				const idxWithPads = Math.round((el.scrollTop + centerOffset(el)) / itemH);
				const rawIndex = idxWithPads - PAD_ITEMS;

				if (kind === "year") {
					const idx = clamp(rawIndex, 0, years.length - 1);
					const targetTop = (idx + PAD_ITEMS) * itemH - centerOffset(el);
					smoothScrollTo(el, targetTop);

					const nextY = years[idx];
					onChange(`${nextY}-${pad2(selectedMonth)}`);
				} else {
					const idx = clamp(rawIndex, 0, 11);
					const targetTop = (idx + PAD_ITEMS) * itemH - centerOffset(el);
					smoothScrollTo(el, targetTop);

					const nextM = idx + 1;
					onChange(`${selectedYear}-${pad2(nextM)}`);
				}
			} finally {
				window.setTimeout(() => {
					lockRef.current = false;
				}, 180);
			}
		}, 120); // 값이 커질수록 민감도↓
		}, [PAD_ITEMS, itemH, years, selectedYear, selectedMonth, onChange]
	);

	return (
		<div className="wheel-wrap" style={{ ["--wheel-item-h" as any]: `${itemH}px` }}>
			<div className="wheel-col">
				<div ref={yearRef} className="wheel" onScroll={onYearScroll} >
				{Array.from({ length: PAD_ITEMS }).map((_, i) => (
					<div key={`y_pad_top_${i}`} className="wheel-item wheel-pad" />
				))}
				{years.map((y, idx) => {
					const active = y === selectedYear;
					return (
						<div key={y} ref={idx === 0 ? itemRef : null} className={`wheel-item ${active ? "active" : ""}`}>
							{y}
							{lang.startsWith("ko") ? "년" : ""}
						</div>
					);
				})}
				{Array.from({ length: PAD_ITEMS }).map((_, i) => (
					<div key={`y_pad_bot_${i}`} className="wheel-item wheel-pad" />
				))}
				</div>
			</div>

			<div className="wheel-col">
				<div ref={monthRef} className="wheel" onScroll={onMonthScroll} >
				{Array.from({ length: PAD_ITEMS }).map((_, i) => (
					<div key={`m_pad_top_${i}`} className="wheel-item wheel-pad" />
				))}
				{months.map((m) => {
					const active = m === selectedMonth;
					return (
					<div key={m} className={`wheel-item ${active ? "active" : ""}`}>
						{monthLabel(m, lang)}
					</div>
					);
				})}
				{Array.from({ length: PAD_ITEMS }).map((_, i) => (
					<div key={`m_pad_bot_${i}`} className="wheel-item wheel-pad" />
				))}
				</div>
			</div>

			<div className="wheel-highlight" aria-hidden="true" />
			<div className="wheel-fade wheel-fade-top" aria-hidden="true" />
			<div className="wheel-fade wheel-fade-bottom" aria-hidden="true" />
		</div>
	);
}
function MonthPickerModal({
	open,
	ym,
	lang,
	minYear,
	maxYear,
	onClose,
	onConfirm,
}: {
	open: boolean;
	ym: string;
	lang: string;
	minYear: number;
	maxYear: number;
	onClose: () => void;
	onConfirm: (ym: string) => void;
}) {
	const { t } = useTranslation();
	const [localYm, setLocalYm] = React.useState(ym);

	React.useEffect(() => {
		if (open) setLocalYm(ym);
	}, [open, ym]);

	if (!open) return null;

	return (
		<div className="monthpicker-backdrop" onClick={onClose} role="presentation">
			<div className="monthpicker-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="monthpicker-header">
					<div className="monthpicker-title">{t("filter.period")}</div>
					<button className="monthpicker-close" onClick={onClose} aria-label={t("common.close")}>
						<img className="icon" alt="" src="/icons/x-01.svg" />
					</button>
				</div>

				<div className="monthpicker-body">
					<MonthWheelPicker
						ym={localYm}
						lang={lang}
						onChange={setLocalYm}
						minYear={minYear}
						maxYear={maxYear}
					/>
				</div>

				<div className="monthpicker-footer">
					<button className="monthpicker-confirm" type="button" onClick={() => onConfirm(localYm)}>
						{t("filter.confirm")}
					</button>
				</div>
			</div>
		</div>
	);
}

type MonthHeaderProps = { value: string; onOpen: () => void;};
function MonthHeader({ value, onOpen }: MonthHeaderProps) {
	const { t, i18n } = useTranslation();

	const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
	const label = React.useMemo(() => {
		const [yy, mm] = value.split("-").map(Number);
		const d = new Date(yy, mm - 1, 1);
		if (i18n.language.startsWith("ko")) return `${mm}월`;
		return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
	}, [value, locale, i18n.language]);
	return (
		<div className="month-row" style={{ position: "relative" }}>
			<div className="month-left">
				<div className="h1">{label}</div>
				<button className="month-btn" aria-label={t("calendar.selectMonth")} onClick={onOpen} 				>
					<img className="icon" src="/icons/chevron-right.svg" alt="" />
				</button>
			</div>
		</div>
	);
}

type EmptyStateProps = { onAddClick: () => void };
function EmptyState({}: EmptyStateProps): React.ReactElement {
	const { t } = useTranslation();
	return (
		<div className="empty">
			<img className="empty-illust" src="/internie_mascot_normal.png" alt="" />
			<p className="empty-sub">
				{t("empty.title")}
				<br />
				{t("empty.subtitle")}
			</p>
			<button type="button" className="empty-sync" onClick={() => alert("Coming soon")}>
				{t("empty.sync")}
			</button>
		</div>
	);
}

type EventCardProps = Pick<ScheduleItem, "title" | "subtitle"> & {
	selected: boolean;
	locked: boolean;
	onClick: () => void;
	onEditClick: () => void;
};
function EventCard({
	title,
	subtitle,
	selected,
	locked,
	onClick,
	onEditClick,
}: EventCardProps): React.ReactElement {
	const { t } = useTranslation();
	return (
		<article
			className={"card" + (selected ? " card--selected" : "") + (locked ? " card-locked" : "")}
			onClick={onClick}
			style={{ position: "relative", cursor: "pointer" }}
			aria-disabled={locked ? "true" : undefined}
		>
		<div className="item">
			<div className={"thumb" + (selected || locked ? " thumb--selected" : "")} />
			<div>
				<div className="title">{title}</div>
				<div className="subtitle">{subtitle}</div>
			</div>
		</div>

		<button
			type="button"
			className="card-edit-btn"
			aria-label={t("schedule.edit")}
			onClick={(e) => {
				e.stopPropagation();
				onEditClick();
			}}
		>
			<img className="icon" src="/icons/chevron-right.svg" alt="" style={{ transform: "rotate(-90deg)" }} />
		</button>
    </article>
  );
}

type EventModalProps = {
	item: ScheduleItem;
	onClose: () => void;
	onRecord: () => void;
	eventDaysForThisEvent: EventDay[];
};
function hasRecord(ed: EventDay): boolean {
	const count = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
	return count > 0 || ed.completed === true;
}
function getWeekdayIndex(iso: string): number {
	// 0=Sun 6=Sat
	const d = new Date(`${iso}T00:00:00`);
	const js = d.getDay();

	return (js + 6) % 7;
}
function weekdayLabels(lang: string): string[] {
	if (lang.startsWith("ko")) return ["월", "화", "수", "목", "금", "토", "일"];
	return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}
function EventModal({ item, onClose, onRecord, eventDaysForThisEvent }: EventModalProps): React.ReactElement {
	const { t, i18n } = useTranslation();
	const locale = i18n.language.startsWith("en") ? "en-US" : "ko-KR";
	const dateText = formatDateYmdLocale(item.date, locale);
	const labels = weekdayLabels(i18n.language);

	const recordedWeekdaySet = React.useMemo(() => {
		const s = new Set<number>(); // 0=월 ... 6=일
		for (const ed of eventDaysForThisEvent) {
			if (!hasRecord(ed)) continue;
			s.add(getWeekdayIndex(ed.date));
		}
		return s;
	}, [eventDaysForThisEvent]);
  
	return (
		<div className="event-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
			<div className="event-modal-sheet" onClick={(e) => e.stopPropagation()}>
				<header className="event-modal-header">
					<div className="event-modal-header-spacer" aria-hidden="true" />
					<div className="event-modal-header-center">
						<div className="event-modal-title">{item.title}</div>
						<div className="event-modal-date">{dateText}</div>
					</div>
					<button type="button" className="event-modal-close" aria-label={t("common.close")} onClick={onClose}>
						<img className="icon" alt="" src="/icons/x-01.svg" />
					</button>
				</header>
				<div className="event-modal-weekdays" aria-label="weekday">
					{labels.map((w, idx) => {
						const isRecorded = recordedWeekdaySet.has(idx);
						return (
						<div
							key={w}
							className={`event-modal-weekday ${isRecorded ? "is-active" : ""}`}
						>
							{w}
						</div>
						);
					})}
				</div>

				<main className="event-modal-body">
					<div className="event-modal-bubble" role="note" aria-label="description">
						<div className="event-modal-bubble-text">
							{t("modal.desc1")}
							<br />
							{t("modal.desc2")}
						</div>
					</div>

					<img className="event-modal-mascot" src="/internie_mascot_normal.png" alt="" draggable={false} />
				</main>

				<footer className="event-modal-footer">
					<button type="button" className="event-modal-primary" onClick={onRecord}>
						{t("common.record")}
					</button>
				</footer>
			</div>
		</div>
	);
}

function Home(): React.ReactElement {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const [globalModalOpen, setGlobalModalOpen] = React.useState(false);
	
	const [loginGateOpen, setLoginGateOpen] = React.useState(false);
	const [pendingPath, setPendingPath] = React.useState<string | null>(null);

	// 이메일 인증
	const EMAIL_VERIFY_DISMISSED_KEY = "student.emailVerify.dismissed";
	const [emailVerifyDismissed, setEmailVerifyDismissed] = React.useState(() => {
		return sessionStorage.getItem(EMAIL_VERIFY_DISMISSED_KEY) === "true";
	});
	const [emailVerifyPopupOpen, setEmailVerifyPopupOpen] = React.useState(false);
	const [needsEmailVerification, setNeedsEmailVerification] = React.useState(false);
	const [emailForm, setEmailForm] = React.useState({ email: "", code: "" });
	const [emailSending, setEmailSending] = React.useState(false);
	const [emailVerifying, setEmailVerifying] = React.useState(false);
	const [emailSentMessage, setEmailSentMessage] = React.useState<string | null>(null);
	const [emailError, setEmailError] = React.useState<string | null>(null);

	React.useEffect(() => {
		function syncGlobalModalOpen(): void {
			setGlobalModalOpen(hasPendingGlobalModal());
		}

		syncGlobalModalOpen();

		window.addEventListener("pendingGlobalModalChanged", syncGlobalModalOpen);
		window.addEventListener("storage", syncGlobalModalOpen);

		return () => {
			window.removeEventListener("pendingGlobalModalChanged", syncGlobalModalOpen);
			window.removeEventListener("storage", syncGlobalModalOpen);
		};
	}, []);

	async function handleSendEmailCode() {
		const email = emailForm.email.trim();

		if (!email) {
			setEmailError("이메일을 입력해주세요.");
			return;
		}

		setEmailSending(true);
		setEmailError(null);
		setEmailSentMessage(null);

		try {
			const lang = i18n.resolvedLanguage ?? i18n.language ?? "ko";
			const res = await sendMyEmailCode(email, lang);

			if (res.status === "EXISTING_ACCOUNT_FOUND") {
				alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
				localStorage.removeItem("accessToken");
				navigate("/login", { replace: true });
				return;
			}

			setEmailSentMessage(`${res.maskedEmail}로 인증코드를 발송했습니다.`);
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.code === "AUTH_EXISTING_ACCOUNT") {
					alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
					localStorage.removeItem("accessToken");
					navigate("/login", { replace: true });
					return;
				}
				setEmailError("인증코드 발송에 실패했습니다.");
				return;
			}

			setEmailError("이메일 전송 중 오류가 발생했습니다.");
		} finally {
			setEmailSending(false);
		}
	}

	async function handleVerifyEmailCode() {
		const email = emailForm.email.trim();
		const code = emailForm.code.trim();

		if (!email) {
			setEmailError("이메일을 입력해주세요.");
			return;
		}

		if (!code) {
			setEmailError("인증코드를 입력해주세요.");
			return;
		}

		setEmailVerifying(true);
		setEmailError(null);

		try {
			const res = await verifyMyEmailCode(email, code);

			if (res.existingAccountFound) {
				alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
				localStorage.removeItem("accessToken");
				navigate("/login", { replace: true });
				return;
			}

			if (!res.verified) {
				setEmailError("이메일 인증에 실패했습니다.");
				return;
			}

			const nextMe = await getUserMe();
			sessionStorage.removeItem(EMAIL_VERIFY_DISMISSED_KEY);
			setEmailVerifyDismissed(false);
			setMe(nextMe);
			setNeedsEmailVerification(false);
			setEmailVerifyPopupOpen(false);
			setEmailForm({
				email: (nextMe.email ?? "").trim(),
				code: "",
			});
			setEmailSentMessage(null);
			setEmailError(null);

			alert("이메일 인증이 완료되었습니다.");
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.code === "AUTH_EXISTING_ACCOUNT") {
					alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
					localStorage.removeItem("accessToken");
					navigate("/login", { replace: true });
					return;
				}

				setEmailError("인증코드가 올바르지 않거나 만료되었습니다.");
				return;
			}

			setEmailError("이메일 인증 중 오류가 발생했습니다.");
		} finally {
			setEmailVerifying(false);
		}
	}

	function dismissEmailVerifyPopup(): void {
		sessionStorage.setItem(EMAIL_VERIFY_DISMISSED_KEY, "true");
		setEmailVerifyDismissed(true);
		setEmailVerifyPopupOpen(false);
	}

	function handleCloseEmailVerifyPopup(): void {
		dismissEmailVerifyPopup();
	}

	function handleEmailPopupBackdropClick(): void {
		dismissEmailVerifyPopup();
	}

	const isAuthed = !!localStorage.getItem("accessToken");

	const openLoginGate = (pathAfterLogin?: string) => {
		setPendingPath(pathAfterLogin ?? null);
		setLoginGateOpen(true);
	};

	const goLogin = () => {
		setLoginGateOpen(false);
		navigate("/login", { replace: false, state: { from: pendingPath ?? "/student" } });
	};

	const requireAuth = (pathAfterLogin: string, action?: () => void) => {
		if (!isAuthed) {
			openLoginGate(pathAfterLogin);
			return;
		}
		action?.();
	};

	const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const STORAGE_KEY_YM = "student.home.ym";
    const STORAGE_KEY_SORT = "student.home.sort";

    const [month, setMonth] = React.useState<string>(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY_YM);
        return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonth;
    });

    const [sortOrder, setSortOrder] = React.useState<SortOrder>(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY_SORT);
        return saved === "past" || saved === "latest" ? saved : "latest";
    });

	const [isFilterOpen, setIsFilterOpen] = React.useState(false);
	const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
	const [isMenuOpen, setMenuOpen] = React.useState(false);
	const [items, setItems] = React.useState<ScheduleItem[]>([]);
	const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);
	const [eventDaysByEventId, setEventDaysByEventId] = React.useState<Map<string, EventDay[]>>(new Map());
	const [recordStage, setRecordStage] = React.useState<"idle" | "preparing">("idle");

	// eca
	const [myActivities, setMyActivities] = React.useState<StudentExternalActivityResponse[]>([]);

	const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
		const g: Record<string, ScheduleItem[]> = {};
		for (const it of items) (g[it.date] ??= []).push(it);
		const entries = Object.entries(g);
		entries.sort((a, b) => {
			if (sortOrder === "latest") return a[0] < b[0] ? 1 : -1;
			return a[0] < b[0] ? -1 : 1;
		});
		return entries;
	}, [items, sortOrder]);

	const hasItems = byDate.length > 0;
	const pendingUpdatedEventRef = React.useRef<any>(null);
	const isSelectedLocked = !!selectedItem?.isLocked;

	const [me, setMe] = React.useState<UserMe | null>(null);
	const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
	const [profileTick, setProfileTick] = React.useState(0);
	const userName = (me?.name ?? "").trim() || "User";
	const userEmail = (me?.email ?? "").trim();
	const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];

	const userProfileImg = React.useMemo(() => {
		const profile = me?.profileImage;

		if (!profile) return "/internie_mascot_normal.png";

		const lowered = profile.toLowerCase();
		if (lowered.includes("default")) return "/internie_mascot_normal.png";

		return profile;
	}, [me]);

	React.useEffect(() => {
		const onUpdated = () => setProfileTick((v) => v + 1);
		window.addEventListener("profile-updated", onUpdated);
		return () => window.removeEventListener("profile-updated", onUpdated);
	}, []);

	React.useEffect(() => {
		(async () => {
			if (!isAuthed) {
				sessionStorage.removeItem(EMAIL_VERIFY_DISMISSED_KEY);
				setEmailVerifyDismissed(false);
				setMe(null);
				setOrganizations([]);
				setNeedsEmailVerification(false);
				setEmailVerifyPopupOpen(false);
				setEmailForm({ email: "", code: "" });
				setEmailSentMessage(null);
				setEmailError(null);
				return;
			}

			try {
				const [nextMe, myOrganizations] = await Promise.all([
					getUserMe(),
					getMyOrganizations(),
				]);

				setMe(nextMe);
				setOrganizations(Array.isArray(myOrganizations) ? myOrganizations : []);

				const needsVerify = !nextMe.email || nextMe.emailVerified !== true;
				const hasGlobalModal = hasPendingGlobalModal();
				const dismissed = sessionStorage.getItem(EMAIL_VERIFY_DISMISSED_KEY) === "true";

				setNeedsEmailVerification(needsVerify);
				setEmailVerifyDismissed(dismissed);
				setEmailVerifyPopupOpen(needsVerify && !hasGlobalModal && !dismissed);
			} catch (e) {
				console.error("getUserMe or getMyOrganizations failed:", e);
				setMe(null);
				setOrganizations([]);
				setNeedsEmailVerification(false);
				setEmailVerifyPopupOpen(false);
				setEmailForm({ email: "", code: "" });
				setEmailSentMessage(null);
				setEmailError(null);
			}
		})();
	}, [isAuthed, profileTick]);

	React.useEffect(() => {
		let mounted = true;

		async function fetchMyActivities(): Promise<void> {
			if (!isAuthed) {
				setMyActivities([]);
				return;
			}

			try {
				const data = await getMyParticipatingExternalActivities();
				const sortedActivities = [...data].sort((a, b) => a.externalActivityId - b.externalActivityId);

				if (mounted) {
					setMyActivities(sortedActivities);
				}
			} catch (e) {
				console.error("getMyParticipatingExternalActivities failed:", e);

				if (mounted) {
					setMyActivities([]);
				}
			}
		}

		fetchMyActivities();

		return () => {
			mounted = false;
		};
	}, [isAuthed]);

	React.useEffect(() => {
		if (!isAuthed) return;
		if (!needsEmailVerification) return;
		if (globalModalOpen) return;
		if (emailVerifyPopupOpen) return;
		if (emailVerifyDismissed) return;

		setEmailVerifyPopupOpen(true);
	}, [isAuthed, needsEmailVerification, globalModalOpen, emailVerifyPopupOpen, emailVerifyDismissed]);

	React.useEffect(() => {
		(async () => {
		if (!isAuthed) { setItems([]); return; }
			try {
				const [y, m] = month.split("-");
				const [eventsData, eventDaysData] = await Promise.all([
					api<any>(`/events/${y}/${m}`),
					api<EventDayMonthResponse>(`/event-days/${y}/${m}`),
				]);

				const rawList = eventsData.eventList || [];

				let events: RawEvent[] = rawList.map((e: any): RawEvent => ({
					id: e.id,
					title: e.title,
					content: e.content,
					startDate: e.startDate,
					endDate: e.endDate,
					startTime: e.startTime ?? null,
					endTime: e.endTime ?? null,
				}));

					const u = pendingUpdatedEventRef.current;
					if (u) {
						events = events.map((ev) =>
							String(ev.id) === String(u.id)
							? {
								...ev,
								title: u.title ?? ev.title,
								content: u.content ?? ev.content,
								startDate: u.startDate ?? ev.startDate,
								endDate: u.endDate ?? ev.endDate,
								startTime: u.startTime ?? ev.startTime,
								endTime: u.endTime ?? ev.endTime,
								}
							: ev
						);

						const serverHasLatest = rawList.some(
							(e: any) =>
							String(e.id) === String(u.id) &&
							(u.title == null || e.title === u.title) &&
							(u.content == null || e.content === u.content) &&
							(u.startDate == null || e.startDate === u.startDate) &&
							(u.endDate == null || e.endDate === u.endDate) &&
							(u.startTime == null || e.startTime === u.startTime) &&
							(u.endTime == null || e.endTime === u.endTime)
						);

						if (serverHasLatest) pendingUpdatedEventRef.current = null;
					}

					const eventDayByKey = new Map<string, EventDay>();
					const nextEventDaysByEventId = new Map<string, EventDay[]>();

					for (const ed of eventDaysData.eventDayList ?? []) {
						const key = `${String(ed.eventId)}__${ed.date}`;
						eventDayByKey.set(key, ed);

						const eid = String(ed.eventId);
						const arr = nextEventDaysByEventId.get(eid) ?? [];
						arr.push(ed);
						nextEventDaysByEventId.set(eid, arr);
					}
					setEventDaysByEventId(nextEventDaysByEventId);

					const expanded = events.flatMap((ev) => expandEventToDailyItems(ev, month));

					const merged = expanded.map((it) => {
					const key = `${String(it.eventId)}__${it.date}`;
					const ed = eventDayByKey.get(key);

					if (!ed) return it;

					const count = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
					const locked = ed.completed === true || count >= TOTAL_QUESTIONS;

					return {
						...it,
						eventDayId: ed.eventDayId,
						transcriptionCount: count,
						isLocked: locked,
					};
				});

				setItems(merged);
			} catch (e) {
				console.error(e);
			}
		})();
	}, [month]);

	React.useEffect(() => {
		if (!selectedItem) setIsRecordModalOpen(false);
	}, [selectedItem]);

	React.useEffect(() => {
		if (!isMenuOpen) return;

		const scrollY = window.scrollY;

		document.body.style.position = "fixed";
		document.body.style.top = `-${scrollY}px`;
		document.body.style.left = "0";
		document.body.style.right = "0";
		document.body.style.width = "100%";
		document.body.style.overflow = "hidden";

		return () => {
			const y = Math.abs(parseInt(document.body.style.top || "0", 10));
			document.body.style.position = "";
			document.body.style.top = "";
			document.body.style.left = "";
			document.body.style.right = "";
			document.body.style.width = "";
			document.body.style.overflow = "";
			window.scrollTo(0, y);
		};
	}, [isMenuOpen]);

	React.useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY_YM, month);
    }, [month]);

    React.useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY_SORT, sortOrder);
    }, [sortOrder]);
    
	React.useEffect(() => {
        if (isAuthed) return;

        sessionStorage.removeItem(STORAGE_KEY_YM);
        sessionStorage.removeItem(STORAGE_KEY_SORT);

        setMonth(currentMonth);
        setSortOrder("latest");
    }, [isAuthed, currentMonth]);

	const handleRecord = async () => {
		if (!selectedItem) return;
		if (!isAuthed) { openLoginGate(`/student`); return; }
		if (selectedItem.isLocked) return;

		setIsRecordModalOpen(false);
		setRecordStage("preparing");

		const startedAt = Date.now();
		const delayRecording = (path: string) => {
			const elapsed = Date.now() - startedAt;
			const remain = Math.max(0, 2000 - elapsed); // 2초

			window.setTimeout(()=>{
				setRecordStage("idle")
				setSelectedItem(null);
				navigate(path);
			}, remain);
		};

		try {
			if (selectedItem.eventDayId) {
				const count = selectedItem.transcriptionCount ?? 0;
				if (count >= TOTAL_QUESTIONS) {
				setRecordStage("idle");
				return;
				} 
				delayRecording(`/student/schedule/${selectedItem.eventDayId}/questions`);
				return;
			}

			const body = {
				date: selectedItem.date,
				title: selectedItem.title,
				memo: selectedItem.subtitle,
				startTime: toHHmm(selectedItem.startTime ?? null),
				endTime: toHHmm(selectedItem.endTime ?? null),
				subtitle: selectedItem.subtitle ?? "",
			};

			const response = await api<any>(`/event-days/events/${selectedItem.eventId}`, {
				method: "POST",
				body: JSON.stringify(body),
			});

			const newEventDayId = response.eventDayId;
			delayRecording(`/student/schedule/${newEventDayId}/questions`);
		} catch (error) {
			setRecordStage("idle");
			alert(t("error.record"));
		}
	};

	const canRecord = !!selectedItem && !isSelectedLocked;

	return (
		<>
			{recordStage === "preparing" && (
				<div className="preparing-page" aria-modal="true" role="dialog">
					<div className="preparing-content">
						<LoadingDots />
						<p className="preparing-title">{t("modal.questionsPreparingTitle")}</p>
						<p className="preparing-desc">{t("modal.questionsPreparingDesc1")}<br/>{t("modal.questionsPreparingDesc2")}</p>
					</div>
				</div>
			)}
			<Header onMenuClick={() => requireAuth("/student", () => setMenuOpen(true))} onAddClick={() => requireAuth("/student/schedule/new", () => navigate("/student/schedule/new"))} />
			<div className={`wrap ${isMenuOpen ? "lock-scroll" : ""}`}>
				<StudentMobileSideMenu
					isOpen={isMenuOpen}
					onClose={() => setMenuOpen(false)}
					userName={userName}
					userEmail={userEmail}
					userProfileImg={userProfileImg}
					userRoleSet={userRoleSet}
					organizations={organizations}
					activities={myActivities}
					onRequireAuth={(path, action) => requireAuth(path, action)}
				/>

				<div className="row" style={{ marginTop: 18 }}>
					<MonthHeader value={month} onOpen={() => setIsFilterOpen(true)} />
				</div>

				{hasItems ? (
					byDate.map(([date, arr]) => (
						<section key={date} style={{ marginTop: "19px", marginBottom: "27px" }}>
							<h2 className="h2" style={{ fontSize: "16px", color: "#979797", fontWeight: 500, lineHeight: "20px", marginBottom: "13px", }} >
								{dateLabel(date, i18n.language === "en" ? "en-US" : "ko-KR", t)}
							</h2>

							{arr.map((it) => {
								const locked = !!it.isLocked;
								return (
									<EventCard
										key={it.instanceId}
										title={it.title}
										subtitle={timeRangeText(it.startTime, it.endTime, t)}
										selected={selectedItem?.instanceId === it.instanceId}
										locked={locked}
										onClick={() => {
											if (locked && it.eventDayId) {
											setMenuOpen(false);
											setIsFilterOpen(false);
											setIsRecordModalOpen(false);
											setSelectedItem(null);
											navigate(`/student/schedule/${it.eventDayId}/detail`);
											return;
											}
											setSelectedItem((prev) => (prev?.instanceId === it.instanceId ? null : it));
										}}
										onEditClick={() =>
											navigate(`/student/schedule/${it.eventId}`, {
												state: {
												event: {
													id: it.eventId,
													eventDayId: it.eventDayId ?? null,
													transcriptionCount: it.transcriptionCount ?? 0,
													title: it.title,
													content: it.subtitle,
													startDate: it.startDate,
													endDate: it.endDate,
													startTime: it.startTime ?? null,
													endTime: it.endTime ?? null,
												},
												},
											})
										}
									/>
								);
							})}
						</section>
					))
				) : (
					<EmptyState onAddClick={() => navigate("/student/schedule/new")} />
				)}

				<div className="bottom-spacer" />

				{isRecordModalOpen && selectedItem && (
					<EventModal
						item={selectedItem}
						onClose={() => setSelectedItem(null)}
						onRecord={handleRecord}
						eventDaysForThisEvent={eventDaysByEventId.get(String(selectedItem.eventId)) ?? []}
					/>
				)}

				{hasItems && recordStage !== "preparing" && (
					<div className="bottom-cta">
						<button
							type="button"
							className={`record-btn ${canRecord ? "enabled" : ""}`}
							disabled={!canRecord}
							onClick={() => {
								if (!canRecord) return;
								requireAuth(`/student`, () => {setIsRecordModalOpen(true);});
							}}
						>
						{t("common.record")}
						</button>
					</div>
				)}

				<MonthFilterSheet
					open={isFilterOpen}
					valueYm={month}
					sortOrder={sortOrder}
					onClose={() => setIsFilterOpen(false)}
					onApply={(nextYm, nextSort) => {
						setMonth(nextYm);
						setSortOrder(nextSort);
						setIsFilterOpen(false);
					}}
				/>
			</div>

			{/* 로그인 유도 팝업 */}
			{loginGateOpen && (
				<div className="event-modal-backdrop" onClick={() => setLoginGateOpen(false)} role="presentation">
					<div className="event-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
						<header className="event-modal-header">
							<div>
								<div className="event-modal-title">{t("login.getLoginTitle")}</div>
								<div className="event-modal-date">{t("login.getLoginSub")}</div>
							</div>
							<button type="button" className="event-modal-close" aria-label={t("common.close")} onClick={() => setLoginGateOpen(false)} >
								<img className="icon" alt="" src="/icons/x-01.svg" />
							</button>
						</header>

						<footer className="event-modal-footer" style={{ display: "flex", gap: 10 }}>
							<button type="button" className="event-modal-primary" onClick={goLogin}>
								로그인
							</button>
							<button type="button" className="event-modal-primary" onClick={() => setLoginGateOpen(false)}>
								나중에
							</button>
						</footer>
					</div>
				</div>
			)}

			{/* 이메일 인증 유도 */}
			{emailVerifyPopupOpen && needsEmailVerification && (
				<div className="email-popup-backdrop" onClick={handleEmailPopupBackdropClick} role="presentation">
					<div className="email-popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
						<div className="email-popup-header">
							<div className="email-popup-title">이메일 인증</div>
							<button type="button" className="email-popup-close" aria-label={t("common.close")} onClick={handleCloseEmailVerifyPopup}>
								<img className="icon" src="/icons/x-01.svg" alt="" />
							</button>
						</div>

						<div className="email-popup-desc">
							계정 보호와 안정적인 로그인 이용을 위해 이메일 인증을 진행해주세요.
						</div>

						<div className="email-popup-body">
							<input
								className="email-popup-input"
								value={emailForm.email}
								onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))}
								placeholder="이메일을 입력해주세요"
								autoComplete="email"
							/>

							<div className="email-popup-row">
								<input
									className="email-popup-input"
									value={emailForm.code}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, code: e.target.value }))}
									placeholder="인증코드를 입력해주세요"
								/>
								<button
									type="button"
									className="email-popup-send-btn"
									onClick={handleSendEmailCode}
									disabled={emailSending}
								>
									{emailSending ? "전송중" : "코드 받기"}
								</button>
							</div>

							{emailSentMessage && <div className="email-popup-info">{emailSentMessage}</div>}
							{emailError && <div className="email-popup-error">{emailError}</div>}
						</div>

						<div className="email-popup-footer">
							<button type="button" className="email-popup-secondary" onClick={handleCloseEmailVerifyPopup}>
								나중에
							</button>
							<button
								type="button"
								className="email-popup-primary"
								onClick={handleVerifyEmailCode}
								disabled={emailVerifying || !emailForm.email.trim() || !emailForm.code.trim()}
							>
								{emailVerifying ? "인증 중" : "인증하기"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default Home;
