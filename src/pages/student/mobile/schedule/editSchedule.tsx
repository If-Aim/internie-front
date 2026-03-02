// src/pages/student/mobile/schedule/editSchedule.tsx
import { useTranslation } from "react-i18next";

import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api, ApiError, deleteEvent, deleteEventDay } from "../../../../api/client";

import "./schedule.css";

type Stage = "form" | "outro";

type EditState =
| 	{
		event?: {
			id: string | number;
			title: string;
			content?: string;
			startDate: string; // 'YYYY-MM-DD'
			endDate: string; // 'YYYY-MM-DD'
			startTime?: string; // 'HH:mm:ss'
			endTime?: string; // 'HH:mm:ss'
			eventDayId?: string | number | null;
			transcriptionCount?: number;
		};
	}
| null;

type EventDay = {
	eventDayId: number;
	eventId: string | number;
	date: string; // YYYY-MM-DD
	completed: boolean;
	transcriptions?: Array<any>;
};
type EventDayMonthResponse = {
	totalCount: number;
	eventDayList: EventDay[];
};
type RangeSheetMode = "range" | "startOnly" | "endOnly";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
	`${String(h).padStart(2, "0")}:00`
);
const toApiHHmmss = (hhmm: string) => `${hhmm}:00`;

function displayTimeLabel(hhmm: string, locale: string) {
	const [hh, mm] = hhmm.split(":").map(Number);
	const d = new Date(2000, 0, 1, hh, mm, 0);

	return new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(d);
}

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
function ymdToDate(ymd: string): Date {
	const [y, m, d] = ymd.split("-").map(Number);
	return new Date(y, m - 1, d);
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getTimeIndex = (t: string | null) => (t ? TIME_OPTIONS.indexOf(t) : -1);

function displayTimePillLabelEn(hhmm: string) {
    const [hh, mm] = hhmm.split(":").map(Number);
    const d = new Date(2000, 0, 1, hh, mm, 0);

    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
}


// 날짜 관련
function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
const clampToStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function addMonths(d: Date, diff: number) {
	return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}
function daysInMonth(year: number, month: number) {
	return new Date(year, month + 1, 0).getDate();
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
// 녹음 존재 시 기간 수정 block
function ymFromDate(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthRange(start: Date, end: Date) {
	const out: string[] = [];
	const cur = new Date(start.getFullYear(), start.getMonth(), 1);
	const last = new Date(end.getFullYear(), end.getMonth(), 1);
	while (cur <= last) {
		out.push(ymFromDate(cur));
		cur.setMonth(cur.getMonth() + 1);
	}
	return out;
}

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
		<div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="set time" onClick={onClose}>
			<div className="sheet-card" onClick={(e) => e.stopPropagation()}>
				<div className="sheet-header">
					<span className="sheet-title">{t("common.time")}</span>
					<button className="sheet-close-btn" aria-label={t("common.close")} onClick={onClose}>
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
	mode: RangeSheetMode;

	startDate: Date;
	endDate: Date;
	onChangeStart: (d: Date) => void;
	onChangeEnd: (d: Date) => void;

	onClose: () => void;
};

function DateRangeSheet({
	mode,
	startDate,
	endDate,
	onChangeStart,
	onChangeEnd,
	onClose,
}: DateRangeSheetProps) {
	const { t } = useTranslation();
	const [weeks, setWeeks] = React.useState<5 | 6>(5);
	const [resetKey, setResetKey] = React.useState(0);
	React.useEffect(() => {
		setResetKey((k) => k + 1);
	}, [mode]);

	return (
		<div className="sheet-backdrop sheet-backdrop--cal" role="dialog" aria-modal="true" aria-label="set date range" onClick={onClose}>
			<div
				className={
				"sheet-card sheet-card--date" + (weeks === 6 ? " sheet-card--date--6w" : " sheet-card--date--5w")
				}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sheet-header">
					<span className="sheet-title">{t("common.dateRange")}</span>
					<button className="sheet-close-btn" aria-label={t("common.close")} onClick={onClose}>
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
						onClose={onClose}
						onWeeksChange={setWeeks}
						resetKey={resetKey}
					/>
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
	mode: RangeSheetMode;
	startDate: Date;
	endDate: Date;
	onChangeStart: (d: Date) => void;
	onChangeEnd: (d: Date) => void;
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
	const weeks = (days.length === 42 ? 6 : 5) as 5 | 6;
	const isSixWeeks = days.length === 42;

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
				onChangeStart(picked); 
				onChangeEnd(picked); 
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
						<button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="prev month" >
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
						<div key={w} className="cal-weekday">
						{w}
						</div>
					))}
				</div>

				<div className="cal-grid">
					{days.map((d) => {
						const inMonth = d.getMonth() === month;
						const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

						if (!inMonth) return <div key={key} className="cal-cell cal-cell--empty" aria-hidden="true" />;

						const day = clampToStartOfDay(d);
						const isStart = isSameDay(day, s);
						const isEnd = isSameDay(day, e);
						const between = !sameDay && inRange(day);
						const showRange = !sameDay && (between || isStart || isEnd);

						return (
							<div
								key={key}
								className={"cal-cell" + (between ? " is-inrange" : "") + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "")}
							>
								{showRange && <div className="cal-range" aria-hidden="true" />}

								<button
								type="button"
								className={
									"cal-day" +
									((sameDay && isSameDay(day, s)) ? " is-selected" : "") +
									(isStart || isEnd ? " is-selected" : "")
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

export default function EditSchedule() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

	const nav = useNavigate();
	const { eventId } = useParams();
	const location = useLocation();
	const state = location.state as EditState;
	const passed = state?.event;

	const [stage, setStage] = React.useState<Stage>("form");

	const [showSheet, setShowSheet] = React.useState(false);
	const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

	// 종일일때 서버에 어떤 값으로 보낼지? - TODO
	const initialAllDay = passed?.startTime === "00:00:00" && passed?.endTime === "23:59:59";
	const [isAllDay, setIsAllDay] = React.useState<boolean>(initialAllDay);

	const [startDate, setStartDate] = React.useState<Date>(() => (passed?.startDate ? ymdToDate(passed.startDate) : new Date()));
	const [endDate, setEndDate] = React.useState<Date>(() => (passed?.endDate ? ymdToDate(passed.endDate) : new Date()));
	React.useEffect(() => {
		if (!passed?.startDate || !passed?.endDate) return;
		setStartDate(ymdToDate(passed.startDate));
		setEndDate(ymdToDate(passed.endDate));
	}, [passed?.startDate, passed?.endDate]);
	
	const [startTime, setStartTime] = React.useState<string | null>(() =>
		initialAllDay ? null :
		passed?.startTime ? passed.startTime.slice(0, 5) : null
	);

	const [endTime, setEndTime] = React.useState<string | null>(() =>
		initialAllDay ? null :
		passed?.endTime ? passed.endTime.slice(0, 5) : null
	);

	const hasTime = startTime !== null && endTime !== null;

	const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);
	const [rangeSheetMode, setRangeSheetMode] = React.useState<RangeSheetMode>("range");

	const [title, setTitle] = React.useState<string>(() => passed?.title ?? "");
	const [memo, setMemo] = React.useState<string>(() => passed?.content ?? "");

	const [firstRecordedDate, setFirstRecordedDate] = React.useState<Date | null>(null); // 첫 녹음(기록) 일자 조회
	const [lastRecordedDate, setLastRecordedDate] = React.useState<Date | null>(null); // 마지막 녹음(기록) 일자 조회

	React.useEffect(() => {
		if (!passed) {
			alert(t("error.cannotLoadSchedule"));
			nav("/", { replace: true });
		}
	}, [passed, nav]);

	React.useEffect(() => {
		let cancelled = false;

		(async () => {
		if (!eventId || !passed?.startDate || !passed?.endDate) return;
			try {
				const baseStart = ymdToDate(passed.startDate);
				const baseEnd = ymdToDate(passed.endDate);

				const months = monthRange(baseStart, baseEnd);

				const lists = await Promise.all(
					months.map((ym) => {
						const [y, m] = ym.split("-");
						return api<EventDayMonthResponse>(`/event-days/${y}/${m}`);
					})
				);

				if (cancelled) return;

				const all = lists.flatMap((r) => r.eventDayList ?? []);
				const my = all.filter((ed) => String(ed.eventId) === String(eventId));

				// 녹음 1개 이상 또는 completed=true를 "기록 있음"으로 봄
				const recorded = my.filter((ed) => {
					const c = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
					return ed.completed === true || c > 0;
				});

				if (recorded.length === 0) {
					setFirstRecordedDate(null);
					setLastRecordedDate(null);
					return;
				}

				let min = recorded[0].date;
				let max = recorded[0].date;
				for (const ed of recorded) {
					if (ed.date < min) min = ed.date;
					if (ed.date > max) max = ed.date; 
				}
				setFirstRecordedDate(ymdToDate(min));
				setLastRecordedDate(ymdToDate(max));
			} catch (e) {
				setFirstRecordedDate(null);
				setLastRecordedDate(null);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [eventId, passed?.startDate, passed?.endDate]);

	const openStartOnlyRangeSheet = () => {
		setRangeSheetMode("startOnly");
		setShowDateRangeSheet(true);
	};
	const openEndOnlyRangeSheet = () => {
		setRangeSheetMode("endOnly");
		setShowDateRangeSheet(true);
	};


	function formatRangeDate(d: Date, locale: string) {
		if (locale.startsWith("ko")) {
			return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(d);
		}
		return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
	}

	const handleStartDateChange = (newDate: Date) => {
		const nd = stripTime(newDate);
		if (firstRecordedDate && nd > stripTime(firstRecordedDate)) {
			alert("첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다."); // TODO: 언어 치환
			return;
		}
		setStartDate(newDate);
		if (stripTime(newDate) > stripTime(endDate)) setEndDate(newDate);
	};

	const handleEndDateChange = (newDate: Date) => {
		const nd = stripTime(newDate);

		// 마지막 기록(녹음)일보다 앞당길 수 없음
		if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
			alert("기록이 있는 날짜 이전으로는 마감일을 변경할 수 없습니다."); //TODO: 언어 치환
			return;
		}

		if (nd < stripTime(startDate)) {
			alert(t("error.failSetEndDate"));
			return;
		}
		setEndDate(newDate);
	};

	const handleEndDateChangeForRange = (newDate: Date) => {
		const nd = stripTime(newDate);
		const sd = stripTime(startDate);

		if (lastRecordedDate && nd < stripTime(lastRecordedDate)) {
			alert("녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다."); //TODO: 언어 치환
			setEndDate(lastRecordedDate); 
			return;
		}

		if (nd < sd) {
			setEndDate(startDate);
			return;
		}
		setEndDate(newDate);
	};

	const handleStartTimeChange = (newTime: string) => {
		setStartTime(newTime);

		const isSame = stripTime(startDate).getTime() === stripTime(endDate).getTime();
		if (!isSame) return;

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

	const handleEndTimeChange = (newTime: string) => {
		const isSame = stripTime(startDate).getTime() === stripTime(endDate).getTime();
		if (isSame && startTime) {
			if (getTimeIndex(newTime) < getTimeIndex(startTime)) {
				alert(t("error.failSetEndTime"));
				return;
			}
		}
		setEndTime(newTime);
	};

	const handleSave = async () => {
		if (!eventId) {
			alert(t("error.invalidAccessMissingEventId"));
			return;
		}
		if (!title.trim()) {
			alert(t("schedule_edit.alertAddTitle"));
			return;
		}
		if (firstRecordedDate && stripTime(startDate) > stripTime(firstRecordedDate)) {
			alert("첫 녹음이 있는 날짜 이후로는 시작일을 변경할 수 없습니다."); //TODO: 언어 치환
			return;
		}
		if (lastRecordedDate && stripTime(endDate) < stripTime(lastRecordedDate)) {
			alert("녹음이 있는 날짜 이전으로는 종료일을 변경할 수 없습니다."); //TODO: 언어 치환
			return;
		}
		try {
			const payload: {
				title: string;
				content: string;
				startDate: string;
				endDate: string;
				startTime?: string;
				endTime?: string;
			} = {
				title,
				content: memo,
				startDate: toYmd(startDate),
				endDate: toYmd(endDate),
			};

			if (isAllDay) {
				payload.startTime = "00:00:00";
				payload.endTime = "23:59:59";
			} else if (startTime && endTime) {
				payload.startTime = toApiHHmmss(startTime);
				payload.endTime = toApiHHmmss(endTime);
			}

			const updatedEventFromServer = await api<any>(`/events/${eventId}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});

			const finalEventForUI = {
				...updatedEventFromServer,
				id: updatedEventFromServer.id ?? eventId,
				startTime: updatedEventFromServer.startTime ?? payload.startTime ?? null,
				endTime: updatedEventFromServer.endTime ?? payload.endTime ?? null,
			};

			setStage("outro");
			nav("/", { replace: true, state: { refetch: true, updatedEvent: finalEventForUI } });
		} catch (err) {
			const msg = err instanceof Error ? err.message : t("error.unknown");
			alert(t("schedule_edit.editeFailedWithMessage", { message: msg }));
		}
	};

	const handleDelete = async () => {
		if (!eventId) {
			alert(t("error.invalidAccessMissingEventId"));
			return;
		}
		const transcriptionCount = passed?.transcriptionCount ?? 0;
		if (transcriptionCount > 0) {
			alert(t("schedule_edit.cannotDeleteWithRecording"));
			return;
		}

		const ok = window.confirm(t("schedule_edit.confirmDelete"));
		if (!ok) return;

		//세부일정은 있지만 녹음 기록이 없는 경우 일정 삭제 처리
		const eventDayId = passed?.eventDayId ?? null;
		try {
			if (eventDayId != null) {
				await deleteEventDay(eventDayId);
			}
			await deleteEvent(eventId);

			nav("/", { replace: true, state: { refetch: true, deletedEventId: eventId } });
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 500 || err.status === 409) {
					alert(t("schedule_edit.cannotDeleteHasRecord"));
					return;
				}
				if (err.status === 401) {
					alert(t("schedule_edit.noPermissionDelete"));
					return;
				}
				if (err.status === 403) {
					alert(t("error.authRequired"));
					return;
				}
				if (err.status === 404) {
					alert(t("error.notFound"));
					return;
				}

				alert(t("schedule_edit.deleteFailWithStatus", { status: err.status, body: err.bodyText ?? "" }));
				return;
			}

			const msg = err instanceof Error ? err.message : t("error.unknown");
			alert(t("schedule_edit.deleteFailedWithMessage", { message: msg }));
		}
	};

	return (
		<div className="screen">
			{stage === "form" && (
				<>
					<header className="topbar topbar-main">
						<button className="iconbtn" aria-label={t("common.menu")}>
							<img className="icon" src="/menu-01.svg" alt="" />
						</button>

						<h1 className="topbar-title">{t("schedule_edit.title")}</h1>

						<button className="iconbtn" aria-label={t("common.close")} onClick={() => nav(-1)}>
							<img className="icon" src="/x-01.svg" alt="" />
						</button>
					</header>

					<main className="new-event">
						<input className="title-input" placeholder={t("schedule_edit.titlePlaceholder")} aria-label="Schedule Title" value={title} onChange={(e) => setTitle(e.target.value)} />
						<section className="schedule-card schedule-card--datetime">
							{/* 기간 */}
							<div className="schedule-line schedule-line--date">
								<img className="icon schedule-line-icon" src="/clock-01.svg" alt="" />

								<div className="date-inline">
									<button type="button" className="date-pill" onClick={openStartOnlyRangeSheet} aria-label="set start date" >
										{formatRangeDate(startDate, locale)}
									</button>

									<span className="date-sep" aria-hidden="true">
										-
									</span>

									<button type="button" className="date-pill" onClick={openEndOnlyRangeSheet} aria-label="set end date" >
										{formatRangeDate(endDate, locale)}
									</button>
								</div>
							</div>

							{/* 시간 토글 */}
							<div className="schedule-line schedule-line--time">
								<img className="icon schedule-line-icon" src="/schedule_stopwatch.svg" alt="" />

								<div className="row-toggle-left">
									<strong>시간 추가하기</strong>
								</div>

								<button
									type="button"
									className={`switch ${(hasTime || isAllDay) ? "is-on" : ""}`}
									onClick={() => {
										const on = !(hasTime || isAllDay);

										if (on) {
											setIsAllDay(false);
											if (!startTime) setStartTime("09:00");
											if (!endTime) setEndTime("10:00");

											requestAnimationFrame(() => {
												setTimeStep("start");
												setShowSheet(true);
											});
										} else {
											setIsAllDay(false);
											setStartTime(null);
											setEndTime(null);
										}
									}}
									aria-pressed={hasTime || isAllDay}
								/>
							</div>

							{/* 시간 pill */}
							{(hasTime || isAllDay) && !isAllDay && (
								<div className="schedule-line schedule-line--time-pills">
									<div className="row-icon--empty" />

									<div className="time-inline">
										<button type="button" className="time-pill" onClick={() => { setTimeStep("start"); setShowSheet(true); }} >
											{hasTime ? displayTimePillLabelEn(startTime!) : "09:00 AM"}
										</button>

										<span className="date-sep" aria-hidden="true">
											-
										</span>

										<button type="button" className="time-pill" onClick={() => { setTimeStep("end"); setShowSheet(true); }} >
											{hasTime ? displayTimePillLabelEn(endTime!) : "10:00 AM"}
										</button>
									</div>
								</div>
							)}
						</section>

						{/* 메모 */}
						<div className="memo-box">
							<textarea
								className="memo-input"
								placeholder={t("schedule_edit.memoPlaceholder")}
								aria-label=""
								value={memo}
								onChange={(e) => setMemo(e.target.value)}
							/>
						</div>
						<div className="bottom-spacer-schedule"></div>
					</main>

					<footer className="footer-fixed">
						<button type="button" className="btn-delete" onClick={handleDelete}>
							{t("schedule_edit.delete")}
						</button>
						<button type="button" className="btn-primary" onClick={handleSave}>
							{t("schedule_edit.save")}
						</button>
					</footer>

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

					{showDateRangeSheet && (
						<DateRangeSheet
							mode={rangeSheetMode}
							startDate={startDate}
							endDate={endDate}
							onChangeStart={handleStartDateChange}
							onChangeEnd={rangeSheetMode === "range" ? handleEndDateChangeForRange : handleEndDateChange}
							onClose={() => setShowDateRangeSheet(false)}
						/>
					)}
				</>
			)}
		</div>
	);
}
