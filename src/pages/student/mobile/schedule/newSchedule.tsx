// src/pages/student/mobile/schedule/newSchedule.tsx
import { useTranslation } from "react-i18next";

import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../api/client";

import "./schedule.css";

type TimeWheelVariant = "sheet" | "calendar";
type RepeatMode = "DAILY" | "WEEKLY";

const MAX_OCCURRENCES = 60;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
	`${String(h).padStart(2, "0")}:00`
); 
function displayTimeLabel(hhmm: string, locale: string) {
	const [hh, mm] = hhmm.split(":").map(Number);
	const d = new Date(2000, 0, 1, hh, mm, 0);

	return new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(d);
}
function displayTimeWheelLabel(hhmm: string, locale: string) {
	const [hh, mm] = hhmm.split(":").map(Number);
	const d = new Date(2000, 0, 1, hh, mm, 0);

	if (locale.startsWith("ko")) {
		return new Intl.DateTimeFormat("ko-KR", {
			hour: "numeric",
			hour12: true, 
		})
			.formatToParts(d)
			.filter((p) => p.type === "hour")
			.map((p) => p.value)
			.join("")
			.trim() + "시";
	}

	return new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})
		.formatToParts(d)
		.filter((p) => p.type !== "dayPeriod")
		.map((p) => p.value)
		.join("")
		.trim();
}
const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const toApiHHmmss = (hhmm: string) => `${hhmm}:00`;
function toYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getTimeIndex = (t: string | null) => (t ? TIME_OPTIONS.indexOf(t) : -1);

//날짜 관련
function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function clampToStartOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(d: Date, diff: number) {
	return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}

function daysInMonth(year: number, month: number) {
	return new Date(year, month + 1, 0).getDate();
}

function getWeekdayMon0(d: Date): number {
    const js = d.getDay();
    return (js + 6) % 7;
}

function getMonthGrid(base: Date) {
	const year = base.getFullYear();
	const month = base.getMonth();

	const first = new Date(year, month, 1);

	const jsDay = first.getDay(); 
	const offset = (jsDay + 6) % 7; 

	const dim = daysInMonth(year, month);
	const totalCells = offset + dim;
	const rows = Math.ceil(totalCells / 7);
	const cellCount = rows * 7; 

	const start = new Date(year, month, 1 - offset);
	
	const days = Array.from({ length: cellCount }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});

	return { year, month, days };
}

function enumerateRepeatDates(params: {
    start: Date;
    until: Date;
    mode: RepeatMode;
    weekdaysMon0?: boolean[]; // WEEKLY일 때 사용
}): Date[] {
    const start = stripTime(params.start);
    const until = stripTime(params.until);

    if (until.getTime() < start.getTime()) return [];

    const dates: Date[] = [];

    if (params.mode === "DAILY") {
        for (let cur = new Date(start); cur.getTime() <= until.getTime(); cur.setDate(cur.getDate() + 1)) {
            dates.push(new Date(cur));
            if (dates.length > MAX_OCCURRENCES) break;
        }
        return dates;
    }

    const weekdays = params.weekdaysMon0 ?? [false, false, false, false, false, false, false];
    const anySelected = weekdays.some(Boolean);
    if (!anySelected) return [];

    for (let cur = new Date(start); cur.getTime() <= until.getTime(); cur.setDate(cur.getDate() + 1)) {
        const wd = getWeekdayMon0(cur);
        if (weekdays[wd]) {
            dates.push(new Date(cur));
            if (dates.length > MAX_OCCURRENCES) break;
        }
    }
    return dates;
}

async function createEventDay(eventId: number, input: {
    date: string;
    title: string;
    startTime?: string;
    endTime?: string;
    memo?: string | null;
}): Promise<void> {
    await api(`/event-days/events/${eventId}`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

// 시간 관련 - 종일일때 서버에 시간을 어떤 값으로 보낼지 - TODO
type TimeSheetProps = {
	step: "start" | "end";
	setStep: React.Dispatch<React.SetStateAction<"start" | "end">>;

	startTime: string | null;
	endTime: string | null;
	onChangeStart: (v: string) => void;
	onChangeEnd: (v: string) => void;

	isAllDay: boolean;
	setIsAllDay: React.Dispatch<React.SetStateAction<boolean>>;
	setStartTime: React.Dispatch<React.SetStateAction<string | null>>;
	setEndTime: React.Dispatch<React.SetStateAction<string | null>>;

	onClose: () => void;
};

function TimeSheet({
	step,
	setStep,
	startTime,
	endTime,
	onChangeStart,
	onChangeEnd,
	onClose,
	isAllDay,
	setIsAllDay,
	setStartTime,
	setEndTime,
}: TimeSheetProps) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
	return (
		<div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="set time" onClick={onClose} >
			<div className="sheet-card" onClick={(e) => e.stopPropagation()} >
				<div className="sheet-header">
					<span className="sheet-title">{t("common.time")}</span>
					<button className="sheet-close-btn" aria-label={t("common.close")} onClick={onClose} >
						<img className="icon" alt="" src="/x-01.svg" />
					</button>
				</div>

				<div className="sheet-cols">
					{step === "start" ? (
						<div className="sheet-col">
							<div className="time-list">
								<button
									type="button"
									className={"time-item" + (isAllDay ? " is-selected" : "")}
									onClick={() => {
										setIsAllDay(true);
										setStartTime(null);
										setEndTime(null);
										setStep("start");
										onClose(); 
									}}
								>
									{t("common.allDay")}
								</button>
								{TIME_OPTIONS.map((opt) => (
									<button
										key={(opt)}
										type="button"
										className={"time-item" + ((opt) === startTime ? " is-selected" : "")}
										onClick={() => {
										setIsAllDay(false);
										onChangeStart(opt);
										setStep("end");
										}}
									>
										{displayTimeLabel(opt, locale)} ~
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="sheet-col">
							<div className="time-list">
								{TIME_OPTIONS.map((opt) => {
									const startIdx = getTimeIndex(startTime);
									const endIdx = getTimeIndex(opt);
									const isDisabled = startTime ? endIdx <= startIdx : false;

									return (
										<button
										key={opt}
										type="button"
										disabled={isDisabled}
										className={
											"time-item" +
											(opt === endTime ? " is-selected" : "") +
											(isDisabled ? " is-disabled" : "")
										}
										onClick={() => {
											onChangeEnd(opt);
											onClose();
										}}
										>
										~ {displayTimeLabel(opt, locale)}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

type DateRangeSheetProps = {
	mode: "range" | "startOnly" | "endOnly";

	startDate: Date;
	endDate: Date;
	onChangeStart: (d: Date) => void;
	onChangeEnd: (d: Date) => void;
	hideTimeWheel?: boolean;

	startTime: string | null;
	onChangeStartTime: (t: string | null) => void;
	onClose: () => void;
};
function DateRangeSheet({
	mode,
	startDate,
	endDate,
	onChangeStart,
	onChangeEnd,
	hideTimeWheel,

	startTime,
	onChangeStartTime,
	onClose,
}: DateRangeSheetProps) {
	const { t } = useTranslation();
	const [weeks, setWeeks] = React.useState<5 | 6>(5);
	const [resetKey, setResetKey] = React.useState(0);
	React.useEffect(() => {
		setResetKey((k) => k + 1);
	}, []);
	return (
		<div className="sheet-backdrop sheet-backdrop--cal" role="dialog" aria-modal="true" aria-label="set date range" onClick={onClose} >
			<div className={
					"sheet-card sheet-card--date" +
					(weeks === 6 ? " sheet-card--date--6w" : " sheet-card--date--5w")
				} 
				onClick={(e) => e.stopPropagation()}>

				<div className="sheet-header">
					<span className="sheet-title">{t("common.dateRange")}</span>
					<button className="sheet-close-btn" aria-label={t("common.close")} onClick={onClose} >
						<img className="icon" alt="" src="/x-01.svg" />
					</button>
				</div>

				<div className="date-range-body">
					<CalendarRange
						mode={mode}
						startDate={startDate}
						endDate={endDate}
						onChangeStart={onChangeStart}
						onChangeEnd={onChangeEnd}
						onDone={onClose}
						onClose={onClose}
						onWeeksChange={setWeeks}
						resetKey={resetKey}
					/>

					{!hideTimeWheel && (
						<div className="date-range-time date-range-time--single">
							<div className="date-range-time-col">
								<TimeWheel value={startTime} onChange={onChangeStartTime} variant="calendar" />
							</div>
						</div>
					)}
				</div>

				<button className="sheet-confirm btn-primary" type="button" onClick={onClose}>
					{t("common.confirm")}
				</button>
			</div>
		</div>
	);
}

function CalendarRange({
	mode,
	startDate,
	endDate,
	onChangeStart,
	onChangeEnd,
	onClose,
	onWeeksChange,
	resetKey,
}: {
	mode: "range" | "startOnly" | "endOnly";
	startDate: Date;
	endDate: Date;
	onChangeStart: (d: Date) => void;
	onChangeEnd: (d: Date) => void;
	onDone: () => void;
	onClose: () => void;
	onWeeksChange?: (weeks: 5 | 6) => void;
	resetKey: number;
}) {
	const { t } = useTranslation();
	const s = clampToStartOfDay(startDate);
	const e = clampToStartOfDay(endDate);
	const sameDay = isSameDay(s, e);

	const [cursor, setCursor] = React.useState(() => new Date(s.getFullYear(), s.getMonth(), 1));
	const [focus, setFocus] = React.useState<"start" | "end">("start");

	React.useEffect(() => {
		setFocus("start");
	}, [resetKey]);

	React.useEffect(() => {
		setCursor(new Date(s.getFullYear(), s.getMonth(), 1));
	}, [s.getFullYear(), s.getMonth()]);

	React.useEffect(() => {
		if (mode === "range") setFocus("start");
		if (mode === "startOnly") setFocus("start");
		if (mode === "endOnly") setFocus("end");
	}, [mode]);

	const { month, days } = getMonthGrid(cursor);
	const isSixWeeks = days.length === 42;
	const weeks = (days.length === 42 ? 6 : 5) as 5 | 6;

	React.useEffect(() => {
		onWeeksChange?.(weeks);
	}, [weeks, onWeeksChange]);
	
	const monthLabel = cursor.toLocaleString("en-US", { month: "long" });
	const title = `${monthLabel} ${cursor.getFullYear()}`;
	const inRange = (d: Date) => {
		const x = clampToStartOfDay(d).getTime();
		return x >= s.getTime() && x <= e.getTime();
	};
	const handlePick = (picked: Date) => {
		if (mode === "startOnly") { // 시작일 선택
			onChangeStart(picked);
			return;
		}

		if (mode === "endOnly") { // 마감일 선택
			const pTime = picked.getTime();
			const sTime = s.getTime();

			if (pTime < sTime) {
				alert(t("error.failSetEndDate"));
				return;
			}

			onChangeEnd(picked);
			return;
		}

		if (mode === "range") {
			if (focus === "start") {
				onChangeStart(picked);
				onChangeEnd(picked);
				setFocus("end");
				return;
			}

			if (picked.getTime() < s.getTime()) {
				onChangeStart(picked);
				onChangeEnd(s); 
				setFocus("end");
				return;
			}
			onChangeEnd(picked);
			setFocus("start");
			return;
		}
	};

	return (
		<div className={"cal" + (isSixWeeks ? " cal--6w" : " cal--5w")}>
			<div className="cal-header">
				<div className="cal-header-top">
					<button type="button" className="cal-close-btn" aria-label={t("common.close")} onClick={onClose}>
						<img className="icon" src="/x-01.svg" alt="" />
					</button>
				</div>
				<div className="cal-header-bottom">
					<div className="cal-title">{title}</div>
					<div className="cal-nav">
						<button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="prev month">
							<img className="icon" src="/Previous (Stroke).svg" alt="" />
						</button>
						<button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="next month">
							<img className="icon" src="/Next (Stroke).svg" alt="" />
						</button>
					</div>
				</div>
			</div>

			<div className="cal-body">
				<div className="cal-week">
					{WEEK_LABELS.map((w) => (
						<div key={w} className="cal-weekday">{w}</div>
					))}
				</div>
			
				<div className="cal-grid">
					{days.map((d) => {
						const inMonth = d.getMonth() === month;

						const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

						if (!inMonth) {
						return (
							<div key={key} className="cal-cell cal-cell--empty" aria-hidden="true" />
						);
						}

						const day = clampToStartOfDay(d);
						const isStart = isSameDay(day, s);
						const isEnd = isSameDay(day, e);
						const between = !sameDay && inRange(day);

						const showRange = !sameDay && (between || isStart || isEnd);
						const isBeforeStartInEndOnly =
							mode === "endOnly" && day.getTime() < s.getTime();

						return (
							<div
								key={key}
								className={
								"cal-cell" +
								(between ? " is-inrange" : "") +
								(isStart ? " is-start" : "") +
								(isEnd ? " is-end" : "")
								}
							>
								{showRange && <div className="cal-range" aria-hidden="true" />}

								<button
									type="button"
									disabled={isBeforeStartInEndOnly}
									className={
										"cal-day" +
										((sameDay && isSameDay(day, s)) ? " is-selected" : "") +
										(isStart || isEnd ? " is-selected" : "") +
										(isBeforeStartInEndOnly ? " is-disabled" : "")
									}
									onClick={() => handlePick(day)}
								>
									{day.getDate()}
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

//달력 내 시간 부분
function getDayPeriodLabel(hhmm: string | null, locale: string) {
	if (!hhmm) return "";
	const [hh, mm] = hhmm.split(":").map(Number);
	const d = new Date(2000, 0, 1, hh, mm, 0);

	const parts = new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true, 
	}).formatToParts(d);

	return parts.find((p) => p.type === "dayPeriod")?.value ?? "";
}

function TimeWheel({
	value,
	onChange,
	variant = "sheet",
}: {
	value: string | null;
	onChange: (t: string | null) => void;
	variant?: TimeWheelVariant;
}) {
	const { i18n } = useTranslation();
	const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
	const selectedPeriod = value ? getDayPeriodLabel(value, locale) : (locale.startsWith("ko") ? "오후" : "PM");

	const rowRef = React.useRef<HTMLDivElement | null>(null);
	const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
	const rafRef = React.useRef<number | null>(null);

	const [opacities, setOpacities] = React.useState<number[]>(
		() => Array.from({ length: TIME_OPTIONS.length }, () => 1)
	);
	const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
	//시간 휠 그라데이션
	const computeOpacities = React.useCallback(() => {
		const row = rowRef.current;
		if (!row) return;
		const left = row.scrollLeft;
		const startOffset = 40;
		const fadeWidth = 140; 
		const next = TIME_OPTIONS.map((_, idx) => {
			const el = itemRefs.current[idx];
			if (!el) return 1;

			const itemLeft = el.offsetLeft;
			const itemRight = itemLeft + el.offsetWidth;

			const distanceFromLeftEdge = itemRight - left;

			const raw = (distanceFromLeftEdge - startOffset) / fadeWidth;
			const t = clamp(raw, 0, 1);
			const eased = t * t * (3 - 2 * t);

			const minO = 0.12;
			const maxO = 1.0;

			return minO + (maxO - minO) * eased;
		});

		setOpacities(next);
	}, []);

	const onScroll = React.useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(() => {
			computeOpacities();
			rafRef.current = null;
		});
	}, [computeOpacities]);

	React.useEffect(() => {
		computeOpacities();
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [computeOpacities]);

	return (
		<div className="timewheel">
			{variant === "calendar" && (<div className="timewheel-period">{selectedPeriod}</div>)}

			<div
				ref={rowRef}
				className="timewheel-row"
				role="listbox"
				aria-label="set time"
				onScroll={onScroll}
			>
				{TIME_OPTIONS.map((opt, idx) => {
					const isSelected = opt === value;

					return (
						<button
							key={opt}
							ref={(el) => { itemRefs.current[idx] = el; }}
							type="button"
							className={"timewheel-item" + (isSelected ? " is-selected" : "")}
							style={{ opacity: isSelected ? 1 : opacities[idx] }}
							onClick={() => {
								onChange(opt);
								requestAnimationFrame(computeOpacities);
							}}
						>
							{displayTimeWheelLabel(opt, locale)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

//page
export default function NewSchedule() {
	type RangeSheetMode = "range" | "startOnly" | "endOnly";
	const nav = useNavigate();
	const {t, i18n} = useTranslation();
	const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

	const [showSheet, setShowSheet] = React.useState(false);
	const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

	const [isAllDay, setIsAllDay] = React.useState(false);
	const [enableTime, setEnableTime] = React.useState(false);

    const [showRepeatUntilSheet, setShowRepeatUntilSheet] = React.useState(false);
	const [enableRepeat, setEnableRepeat] = React.useState(false);
	const [repeatMode, setRepeatMode] = React.useState<RepeatMode>("DAILY");

	const [repeatWeekdays, setRepeatWeekdays] = React.useState<boolean[]>(
		() => [false, false, false, false, false, false, false]
	);

	const [repeatUntil, setRepeatUntil] = React.useState<Date>(() => new Date());

	const [title, setTitle] = React.useState("");
	const [memo, setMemo] = React.useState("");

	const [startDate, setStartDate] = React.useState<Date>(() => new Date());
	const [endDate, setEndDate] = React.useState<Date>(() => new Date());

	const [startTime, setStartTime] = React.useState<string | null>(null);
	const [endTime, setEndTime] = React.useState<string | null>(null);
	const hasTime = startTime !== null && endTime !== null;
	const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);

	const isRangeSelected = startDate.getTime() !== endDate.getTime();
	const [rangeSheetMode, setRangeSheetMode] = React.useState<RangeSheetMode>("range");
	
    const openStartRangeSheet = () => {
        setRangeSheetMode("range");
        setShowDateRangeSheet(true);
    };

    const openEndOnlyRangeSheet = () => {
        setRangeSheetMode("endOnly");
        setShowDateRangeSheet(true);
    };

	const formatFullDate = React.useCallback((d: Date) => {
		return new Intl.DateTimeFormat(locale, {
			year: "numeric",
			month: "long",
			day: "numeric",
		}).format(d);
	}, [locale]);

	function formatRangeDate(d: Date, locale: string) {
		if (locale.startsWith("ko")) {
			return new Intl.DateTimeFormat("ko-KR", {
				month: "long",
				day: "numeric",
			}).format(d); 
		}
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
		}).format(d);
	}

	React.useEffect(() => {
		if (!isRangeSelected) return;

		if (enableTime) setEnableTime(false);
		if (enableRepeat) setEnableRepeat(false);

		if (startTime !== null) setStartTime(null);
		if (endTime !== null) setEndTime(null);
		if (isAllDay) setIsAllDay(false);
	}, [isRangeSelected]);

	//시간 변경
	// 시작 시간 변경 시
	const handleStartTimeChange = (newTime: string) => {
		setStartTime(newTime);
		const isSameDay = startDate.getTime() === endDate.getTime();
		if (!isSameDay) return;
		const startIdx = getTimeIndex(newTime);

		if (!endTime) {
			const nextIdx = Math.min(startIdx + 1, TIME_OPTIONS.length - 1);
			setEndTime(TIME_OPTIONS[nextIdx]);
			return;
		}

		if (getTimeIndex(endTime) < startIdx) {
			const nextIdx = Math.min(startIdx + 1, TIME_OPTIONS.length - 1);
			setEndTime(TIME_OPTIONS[nextIdx]);
		}
	};

	// 종료 시간 변경 시
	const handleEndTimeChange = (newTime: string) => {
		const isSameDay = startDate.getTime() === endDate.getTime();
		if (isSameDay && startTime) {
			if (getTimeIndex(newTime) < getTimeIndex(startTime)) {
				alert(t("error.failSetEndTime"));
				return;
			}
		}
		setEndTime(newTime);
	};

	type CreateEventResponse = {
		id: number;
		title: string;
		content: string;
		startDate: string;
		endDate: string;
		startTime: string | null;
		endTime: string | null;
		userId: number;
	};

	const handleSave = async () => {
		if (!title.trim()) {
			alert(t("schedule_new.alertAddTitle"));
			return;
		}
		const effectiveEndDate = enableRepeat ? repeatUntil : endDate;

		if (enableRepeat && stripTime(repeatUntil).getTime() < stripTime(startDate).getTime()) {
			alert(t("error.failSetEndDate"));
			return;
		}

		let repeatDates: Date[] = [];
		if (enableRepeat) {
			repeatDates = enumerateRepeatDates({
				start: startDate,
				until: repeatUntil,
				mode: repeatMode,
				weekdaysMon0: repeatMode === "WEEKLY" ? repeatWeekdays : undefined,
			});

			if (repeatDates.length === 0) {
				alert("반복 요일을 선택해주세요."); // TODO: 언어 변경 토글
				return;
			}

			if (repeatDates.length > MAX_OCCURRENCES) {
				alert(`반복 일정은 최대 ${MAX_OCCURRENCES}개까지만 생성할 수 있습니다.`); // TODO: 언어 변경 토글
				return;
			}

			const ok = window.confirm( // TODO: 언어 변경 토글
				"반복 일정을 생성하면 세부 일정이 여러 개 만들어집니다.\n" +
				"이 중 하루라도 기록(녹음)을 하면 상위 일정(events)을 삭제할 수 없을 수 있습니다.\n" +
				"계속 진행하시겠습니까?"
			); 
			if (!ok) return;
		}

		const payload: {
			title: string;
			content: string;
			startDate: string;
			endDate: string;
			startTime?: string;
			endTime?: string;
		} = {
			title: title.trim(),
			content: memo,
			startDate: toYmd(startDate),
			endDate: toYmd(effectiveEndDate),
		};

		if (isAllDay) {
			payload.startTime = "00:00:00";
			payload.endTime = "23:59:59";
		} else if (startTime && endTime) {
			payload.startTime = toApiHHmmss(startTime);
			payload.endTime = toApiHHmmss(endTime);
		}

		try {
			const created = await api<CreateEventResponse>(`/events`, {
				method: "POST",
				body: JSON.stringify(payload),
			});

			const eventId = Number(created.id);


			const targets = enableRepeat ? repeatDates : [startDate];

			for (const d of targets) {
				const body: any = {
					date: toYmd(d),
					title: title.trim(),
					memo: memo ? memo : null,
				};

				if (isAllDay) {
					body.startTime = "00:00:00";
					body.endTime = "23:59:59";
				} else if (startTime && endTime) {
					body.startTime = toApiHHmmss(startTime);
					body.endTime = toApiHHmmss(endTime);
				}

				await createEventDay(eventId, body);
			}

			nav("/", { replace: true });
		} catch (err) {
			console.error("Error:", err);
			alert(t("error.failAddSchedule"));
		}
	};

	return (
		<div className="screen">
			{/* 일정 작성 화면 */}
			<>
				<header className="topbar topbar-main">
					<button className="iconbtn" aria-label={t("common.menu")}>
						<img className="icon" src="/menu-01.svg" alt="" />
					</button>
					<h1 className="app-title">{t("schedule_new.title")}</h1>
					<button className="iconbtn" aria-label={t("common.close")} onClick={() => nav(-1)}>
						<img className="icon" src="/x-01.svg" alt="" />
					</button>
				</header>
				
                <main className="new-event">
                    <input
                        className="title-input"
                        placeholder={t("schedule_new.titlePlaceholder")}
                        aria-label="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <section className="row row--card">
                        <div className="row-range">
                            <img className="icon" src="/schedule_clock.svg" alt="" />

                            <button type="button" className="range-pill" onClick={openStartRangeSheet} aria-label="set start date" >
                                {formatRangeDate(startDate, locale)}
                            </button>

                            <span className="range-sep">-</span>

                            <button type="button" className="range-pill" onClick={openEndOnlyRangeSheet} aria-label="set end date" >
                                {formatRangeDate(endDate, locale)}
                            </button>
                        </div>
                    </section>

                    <section className={"row row--card" + (isRangeSelected ? " is-disabled" : "")}>
                        <div className="row-toggle">
                            <div className="row-toggle-left">
                                <img className="icon" src="/schedule_stopwatch.svg" alt="" />
                                <strong>시간 추가하기</strong>
                            </div>

                            <button
                                type="button"
                                className={"switch" + (enableTime ? " is-on" : "")}
                                onClick={() => {
									if (isRangeSelected) return;

									setEnableTime((prev) => {
										const next = !prev;

										if (!next) {
											setIsAllDay(false);
											setStartTime(null);
											setEndTime(null);
										}

										return next;
									});
								}}
								aria-pressed={enableTime}
                                disabled={isRangeSelected}
                            />
                        </div>

                        {enableTime && !isRangeSelected && (
                            <div className="row-toggle-body">
                                <button
                                    type="button"
                                    className="time-pill"
                                    onClick={() => {
                                        setTimeStep("start");
                                        setShowSheet(true);
                                    }}
                                    aria-label={hasTime ? t("schedule_new.editTime") : t("schedule_new.addTime")}
                                >
                                    {isAllDay
                                        ? t("common.allDay")
                                        : hasTime
                                            ? `${displayTimeLabel(startTime!, locale)} - ${displayTimeLabel(endTime!, locale)}`
                                            : t("schedule_new.addTime")}
                                </button>
                            </div>
                        )}
                    </section>

                    <section className={"row row--card" + (isRangeSelected ? " is-disabled" : "")}>
                        <div className="row-toggle">
                            <div className="row-toggle-left">
                                <img className="icon" src="/reapeat-01.svg" alt="" />
                                <strong>반복하기</strong>
                            </div>

                            <button
                                type="button"
                                className={"switch" + (enableRepeat ? " is-on" : "")}
                                onClick={() => {
									if (isRangeSelected) return;

									setEnableRepeat((prev) => {
										const next = !prev;

										if (next) {
											setRepeatUntil((cur) => {
												const c = stripTime(cur);
												const s = stripTime(startDate);
												return c.getTime() < s.getTime() ? s : c;
											});

											if (repeatMode === "WEEKLY" && !repeatWeekdays.some(Boolean)) {
												const wd = getWeekdayMon0(startDate);
												const base = [false, false, false, false, false, false, false];
												base[wd] = true;
												setRepeatWeekdays(base);
											}
										}

										return next;
									});
								}}
                                aria-pressed={enableRepeat}
                                disabled={isRangeSelected}
                            />
                        </div>

                        {enableRepeat && !isRangeSelected && (
                            <div className="row-toggle-body">
                                <div className="repeat-row">
                                    <select
                                        className="repeat-select"
                                        value={repeatMode}
                                        onChange={(e) => {
											const v = e.target.value as RepeatMode;
											setRepeatMode(v);

											if (v === "WEEKLY" && !repeatWeekdays.some(Boolean)) {
												const wd = getWeekdayMon0(startDate);
												const base = [false, false, false, false, false, false, false];
												base[wd] = true;
												setRepeatWeekdays(base);
											}
										}}
                                    >
                                        <option value="DAILY">매일</option>
                                        <option value="WEEKLY">매주</option>
                                    </select>
                                </div>

                                {repeatMode === "WEEKLY" && (
                                    <div className="repeat-weekdays">
                                        {["월", "화", "수", "목", "금", "토", "일"].map((label, idx) => {
                                            const active = repeatWeekdays[idx];
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    className={"weekday-pill" + (active ? " is-on" : "")}
                                                    onClick={() => {
                                                        setRepeatWeekdays((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = !next[idx];
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="repeat-until">
                                    <img className="icon" src="/clock-01.svg" alt="" />
                                    <strong>반복 종료일</strong>
                                    <button
                                        type="button"
                                        className="range-pill"
                                        onClick={() => setShowRepeatUntilSheet(true)}
                                    >
                                        {formatFullDate(repeatUntil)}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 메모추가 */}
                    <div className="memo-box">
                        <textarea
                            className="memo-input"
                            placeholder={t("schedule_new.memoPlaceholder")}
                            aria-label="add memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                    </div>
                </main>

				<footer className="footer-fixed">
					<button className="btn-primary" onClick={handleSave}>{t("common.save")}</button>
				</footer>
				{/* 시간 선택 바텀시트 */}
				{showSheet && (
					<TimeSheet
						step={timeStep}
						setStep={setTimeStep}
						startTime={startTime}
						endTime={endTime}
						onChangeStart={handleStartTimeChange}
						onChangeEnd={handleEndTimeChange}
						isAllDay={isAllDay}
						setIsAllDay={setIsAllDay}
						setStartTime={setStartTime}
						setEndTime={setEndTime}
						onClose={() => setShowSheet(false)}
					/>
				)}
				{showRepeatUntilSheet && (
					<DateRangeSheet
						mode="endOnly"
						startDate={startDate}
						endDate={repeatUntil}
						onChangeStart={() => {}}
						onChangeEnd={(d) => setRepeatUntil(d)}
						startTime={null}
						onChangeStartTime={() => {}}
						hideTimeWheel={true}
						onClose={() => setShowRepeatUntilSheet(false)}
					/>
				)}
				{showDateRangeSheet && (
					<DateRangeSheet
						mode={rangeSheetMode}
						startDate={startDate}
						endDate={endDate}
						onChangeStart={(d) => {
							setStartDate(d);
							if (stripTime(d).getTime() > stripTime(endDate).getTime()) {
								setEndDate(d);
							}

							setEnableTime(false);
							setStartTime(null);
							setEndTime(null);
							setIsAllDay(false);

							setEnableRepeat(false);
						}}
						onChangeEnd={(d) => {
							if (stripTime(d).getTime() < stripTime(startDate).getTime()) {
								alert(t("error.failSetEndDate"));
								return;
							}
							setEndDate(d);

							if (stripTime(d).getTime() !== stripTime(startDate).getTime()) {
								setEnableTime(false);
								setStartTime(null);
								setEndTime(null);
								setIsAllDay(false);

								setEnableRepeat(false);
							}
						}}
						startTime={startTime}
						onChangeStartTime={(v) => {
							if (!v) return;
							handleStartTimeChange(v);
						}}
						onClose={() => setShowDateRangeSheet(false)}
					/>
				)}
			</>
		</div>
	);
}
