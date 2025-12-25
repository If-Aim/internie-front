// src/pages/newSchedule.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/schedule.css";

type Stage = "form" | "outro";

const TIME_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12; 
  return `${period} ${hour12}:00`;
});

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);


function toApiTime(t: string): string {
  const m = t.match(/^(오전|오후)\s+(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error("유효하지 않은 시간 형식입니다.");

  const period = m[1];
  const hh12 = Number(m[2]); 
  const mm = m[3];

  let hh24 = hh12 % 12;     
  if (period === "오후") hh24 += 12; 

  const HH = String(hh24).padStart(2, "0");
  return `${HH}:${mm}:00`;
}
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

//시간 관련 - 종일일때 서버에 시간을 어떤 값으로 보낼지 - TODO
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
  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="시간 선택"
      onClick={onClose}
    >
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">시간</span>
          <button
            className="sheet-close-btn"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
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
                  종일
                </button>
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={"time-item" + (t === startTime ? " is-selected" : "")}
                    onClick={() => {
                      setIsAllDay(false);
                      onChangeStart(t);
                      setStep("end");
                    }}
                  >
                    {t} ~
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sheet-col">
              <div className="time-list">
                {TIME_OPTIONS.map((t) => {
                  const startIdx = getTimeIndex(startTime);
                  const endIdx = getTimeIndex(t);
                  const isDisabled = startTime ? endIdx < startIdx : false;

                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={isDisabled}
                      className={
                        "time-item" +
                        (t === endTime ? " is-selected" : "") +
                        (isDisabled ? " is-disabled" : "")
                      }
                      onClick={() => {
                        onChangeEnd(t);
                        onClose();
                      }}
                    >
                      ~ {t}
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
  startTime,
  onChangeStartTime,
  onClose,
}: DateRangeSheetProps) {
  const [weeks, setWeeks] = React.useState<5 | 6>(5);
  const [resetKey, setResetKey] = React.useState(0);
  React.useEffect(() => {
    setResetKey((k) => k + 1);
  }, []);
  return (
    <div
      className="sheet-backdrop sheet-backdrop--cal"
      role="dialog"
      aria-modal="true"
      aria-label="기간 선택"
      onClick={onClose}
    >
      <div className={
          "sheet-card sheet-card--date" +
          (weeks === 6 ? " sheet-card--date--6w" : " sheet-card--date--5w")
        } 
        onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">기간</span>
          <button className="sheet-close-btn" aria-label="닫기" onClick={onClose} >
            ✕
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

          <div className="date-range-time date-range-time--single">
            <div className="date-range-time-col">
              <TimeWheel value={startTime} onChange={onChangeStartTime} />
            </div>
          </div>
        </div>

        <button className="sheet-confirm btn-primary" type="button" onClick={onClose}>
          확인
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
    const pTime = picked.getTime();
    const sTime = s.getTime();
    const eTime = e.getTime();

    if (mode === "startOnly") {
      onChangeStart(picked);
      if (pTime > eTime) onChangeEnd(picked);
      return;
    }

    if (mode === "endOnly") {
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
          <button type="button" className="cal-close-btn" aria-label="닫기" onClick={onClose}>
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

//달력 내 시간 부분
function toKoreanHourLabel(h24: number) {
  const period = h24 < 12 ? "오전" : "오후";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { period, text: `${period} ${h12}:00`, hourText: `${h12}시` };
}

function parseHourFromTimeLabel(t: string | null): number | null {
  if (!t) return null;
  const m = t.match(/^(오전|오후)\s+(\d{1,2}):00$/);
  if (!m) return null;
  const period = m[1];
  const hh12 = Number(m[2]);
  let hh24 = hh12 % 12;
  if (period === "오후") hh24 += 12;
  return hh24;
}

function TimeWheel({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (t: string | null) => void;
}) {
  const selectedHour = parseHourFromTimeLabel(value);
  const selectedPeriod = selectedHour === null ? "오후" : selectedHour < 12 ? "오전" : "오후";

  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = React.useRef<number | null>(null);

  const [opacities, setOpacities] = React.useState<number[]>(
    () => Array.from({ length: HOURS.length }, () => 1)
  );
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  //시간 휠 그라데이션
  const computeOpacities = React.useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const left = row.scrollLeft;
    const startOffset = 40;
    const fadeWidth = 140; 
    const next = HOURS.map((_, idx) => {
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
      <div className="timewheel-period">{selectedPeriod}</div>

      <div
        ref={rowRef}
        className="timewheel-row"
        role="listbox"
        aria-label="시간 선택"
        onScroll={onScroll}
      >
        {HOURS.map((h24, idx) => {
          const { text, hourText } = toKoreanHourLabel(h24);
          const isSelected = selectedHour === h24;

          return (
            <button
              key={h24}
              ref={(el) => { itemRefs.current[idx] = el; }}
              type="button"
              className={"timewheel-item" + (isSelected ? " is-selected" : "")}
              style={{
                opacity: isSelected ? 1 : opacities[idx],
              }}
              onClick={() => {
                onChange(text);
                requestAnimationFrame(computeOpacities);
              }}
            >
              {hourText}
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
  const [stage, setStage] = React.useState<Stage>("form");
  const [showSheet, setShowSheet] = React.useState(false);
  const [timeStep, setTimeStep] = React.useState<"start" | "end">("start");

  const [isAllDay, setIsAllDay] = React.useState(false);
  

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
  
  const openStartOnlyRangeSheet = () => {
    setRangeSheetMode("startOnly");
    setShowDateRangeSheet(true);
  };

  const openEndOnlyRangeSheet = () => {
    setRangeSheetMode("endOnly");
    setShowDateRangeSheet(true);
  };

  const openFullRangeSheet = () => {
    setRangeSheetMode("range");
    setShowDateRangeSheet(true);
  };

  const formatKoreanDate = React.useCallback((d: Date) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return `${y}년 ${m}월 ${day}일`;
  }, []);
  const formatMonthDay = React.useCallback((d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}월 ${day}일`;
  }, []);

  const startDateLabel = formatKoreanDate(startDate);
  const endDateLabel = formatKoreanDate(endDate);
  const dateRangeLabel = `${formatMonthDay(startDate)} ~ ${formatMonthDay(endDate)}`;
  
  //기간 변경 시
  const handleStartDateChange = (newDate: Date) => {
      setStartDate(newDate);
      if (stripTime(newDate) > stripTime(endDate)) {
          setEndDate(newDate);
      }
  };
  // 마감일 변경 시 처리
  const handleEndDateChange = (newDate: Date) => {
      if (stripTime(newDate) < stripTime(startDate)) {
          alert("마감일은 시작일보다 빠를 수 없습니다.");
          return;
      }
      setEndDate(newDate);
  };
  //기간변경전용
  const handleEndDateChangeForRange = (newDate: Date) => {
    const nd = stripTime(newDate);
    const sd = stripTime(startDate);

    if (nd < sd) {
      setEndDate(startDate); 
      return;
    }
    setEndDate(newDate);
  };

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
              alert("종료 시간은 시작 시간보다 빠를 수 없습니다.");
              return;
          }
      }
      setEndTime(newTime);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      nav("/login");
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

      if (!isAllDay && startTime && endTime) {
        payload.startTime = toApiTime(startTime);
        payload.endTime = toApiTime(endTime);
      }
      
      const res = await fetch(`/events`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
      // 에러 처리
        if (res.status === 401) {
          alert("토큰이 만료되었습니다. 다시 로그인해주세요.");
          nav("/login");
          return;
        }
        throw new Error(`저장 실패: ${res.status}`);
      }

      //성공 시
      setStage("outro");
      
      setTimeout(() => {
        nav("/", { replace: true });
      }, 1500);

    } catch (err) {
      console.error("에러 발생:", err);
      alert("일정을 저장하지 못했습니다.");
    }
  };

  return (
      <div className="screen">
      {/* 일정 작성 화면 */}
      {stage === "form" && (
          <>
          <div className="spacer-50" aria-hidden="true" />
          <header className="topbar_newschedule">
              <button className="iconbtn" aria-label="메뉴">
              <img className="icon" src="/menu-01.svg" alt="" />
              </button>
              <h1 className="topbar-title">일정 추가</h1>
              <button className="iconbtn" aria-label="닫기" onClick={() => nav(-1)}>
              <img className="icon" src="/x-01.svg" alt="" />
              </button>
          </header>

          <main className="new-event">
            <input className="title-input" placeholder="새로운 이벤트..." aria-label="이벤트 제목" value={title} onChange={(e) => setTitle(e.target.value)} />

            {/* 일정 */}
            <section className="row">
                <div className="col">
                    <button  type="button" className="row-head row-head-btn" onClick={openStartOnlyRangeSheet} aria-label="기간 선택하기" >
                        <img className="icon" src="/clock-01.svg" alt="날짜" />
                        <div className="row-today">
                            <strong>{startDateLabel}</strong>
                        </div>
                    </button>
                    <button type="button" className="row-sub row-sub-btn"
                    onClick={() => { setTimeStep("start"); setShowSheet(true); }}
                    aria-label={hasTime ? "시간 수정하기" : "시간 추가하기"}>
                    {isAllDay ? "종일" : hasTime ? `${startTime} ~ ${endTime}` : "시간 추가하기"}
                    </button>
                </div>
                <div className="add-btn-wrapper">
                    <button className="add-date" aria-label={hasTime ? "시간 수정하기" : "시간 추가하기"} onClick={() => {setTimeStep("start");setShowSheet(true);}}                   >
                    <img className="add" src="/plus-02.svg" alt="" />
                    </button>
                </div>
            </section>

            {/* 날짜 */}
            <section className="row row--today">
                <div className="col">
                  <button type="button" className="row-head row-head-btn" onClick={openEndOnlyRangeSheet} aria-label="기간 선택하기" >
                    <img className="icon" src="/check-broken.svg" alt="날짜" />
                    <div className="row-today">
                      <strong>{endDateLabel}</strong>
                    </div>
                  </button>
                  <button type="button" className="row-sub row-sub-btn" onClick={openFullRangeSheet} aria-label="시작일-마감일 설정">
                  {isRangeSelected ? dateRangeLabel : "시작일-마감일"}
                  </button>
                </div>
                <div className="add-btn-wrapper">
                    <button className="add-date" aria-label="시작일-마감일설정" onClick={openFullRangeSheet}>
                    <img className="add" src="/plus-02.svg" alt="" />
                    </button>
                </div>
            </section>

            {/* 메모추가 */}
            <div className="memo-box">
                <textarea className="memo-input" placeholder="메모 추가하기..." aria-label="메모 추가" value={memo} onChange={(e) => setMemo(e.target.value)}
                />
            </div>
          </main>

          <footer className="footer-fixed">
              <button className="btn-primary" onClick={handleSave}>저장하기</button>
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
          {showDateRangeSheet && (
            <DateRangeSheet
              mode={rangeSheetMode}
              startDate={startDate}
              endDate={endDate}
              onChangeStart={handleStartDateChange}
              onChangeEnd={rangeSheetMode === "range" ? handleEndDateChangeForRange : handleEndDateChange}
              startTime={startTime}
              onChangeStartTime={(t) => { if (t) handleStartTimeChange(t); else setStartTime(null); }}
              onClose={() => setShowDateRangeSheet(false)}
            />
          )}
          </>
      )}
      {/* 아웃트로 화면 */}
      {stage === "outro" && (
          <>
          <div className="spacer-50" aria-hidden="true" />
          <main className="outro">
              <img src="/internie_mascot_normal.png" alt="" className="outro-img"/>
              <p className="outro-text">인터니가 질문을 준비하고 있어요!<br />오늘은 어떤 역량을 얻을 수 있을까요?</p>
          </main>
          </>
      )}
    </div>
  );
}
