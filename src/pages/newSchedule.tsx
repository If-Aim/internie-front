// src/pages/newSchedule.tsx
import "../styles/schedule.css";
import React from "react";
import { useNavigate } from "react-router-dom";

type Stage = "intro" | "form" | "outro";
const TIME_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12; 
  const hh = String(hour12).padStart(2, "0");   
  return `${period} ${hh}:00`;
});

export default function NewSchedule() {
    const nav = useNavigate();
    const [stage, setStage] = React.useState<Stage>("intro");
    const [showSheet, setShowSheet] = React.useState(false);
    const [startTime, setStartTime] = React.useState<string | null>(null);
    const [endTime, setEndTime] = React.useState<string | null>(null);
    const hasTime = startTime !== null && endTime !== null;
    const [showStartDateSheet, setShowStartDateSheet] = React.useState(false);
    const [showEndDateSheet, setShowEndDateSheet] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date>(() => new Date());
    const [endDate, setEndDate] = React.useState<Date>(() => new Date());
    
    React.useEffect(() => {
        if (stage !== "intro") return;
        const t = setTimeout(() => setStage("form"), 1500); 
        return () => clearTimeout(t);
    }, [stage]);

    const formatKoreanDate = React.useCallback((d: Date) => {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${y}년 ${m}월 ${day}일`;
    }, []);
    const startDateLabel = formatKoreanDate(startDate);
    const endDateLabel = formatKoreanDate(endDate);

    const handleSave = () => {
        setStage("outro");
        setTimeout(() => nav("/questions"), 160000); 
    };

    return (
        <div className="screen">
        {/*인트로 화면 */}
        {stage === "intro" && (
            <>
            <div className="spacer-50" aria-hidden="true" />
            <main className="welcome">
                <img src="/internie_mascot_normal.png" alt="" className="welcome-img"/>
                <p className="welcome-text">인터니와 함께</p>
            </main>
            </>
        )}

        {/* 일정 작성 화면 */}
        {stage === "form" && (
            <>
            <div className="spacer-50" aria-hidden="true" />
            <header className="topbar">
                <button className="iconbtn" aria-label="메뉴">
                <img className="icon" src="/menu-01.svg" alt="" />
                </button>
                <h1 className="topbar-title">일정 추가</h1>
                <button className="iconbtn" aria-label="닫기">
                <img className="icon" src="/x-01.svg" alt="" />
                </button>
            </header>

            <main className="new-event">
                <input className="title-input" placeholder="새로운 이벤트..." aria-label="이벤트 제목" />

                {/* 반복 */}
                <section className="row">
                    <div className="col">
                        <button
                            type="button"
                            className="row-head row-head-btn"
                            onClick={() => setShowStartDateSheet(true)}
                            aria-label="날짜 선택하기"
                        >
                            <img className="icon" src="/check-broken.svg" alt="날짜" />
                            <div className="row-today">
                                <strong>{startDateLabel}</strong>
                            </div>
                        </button>
                        <button type="button" className="row-sub row-sub-btn"
                        onClick={() => setShowSheet(true)} aria-label={hasTime ? "시간 수정하기" : "시간 추가하기"}>
                        {hasTime ? `${startTime} – ${endTime}` : "시간 추가하기"}
                        </button>
                    </div>
                    <div className="add-btn-wrapper">
                        <button className="add-date" aria-label={hasTime ? "시간 수정하기" : "시간 추가하기"} onClick={() => setShowSheet(true)}                        >
                        <img className="add" src="/plus-02.svg" alt="" />
                        </button>
                    </div>
                </section>

                {/* 날짜 */}
                <section className="row row--today">
                    <div className="col">
                        <button
                            type="button"
                            className="row-head row-head-btn"
                            onClick={() => setShowEndDateSheet(true)}
                            aria-label="날짜 선택하기"
                        >
                            <img className="icon" src="/check-broken.svg" alt="날짜" />
                            <div className="row-today">
                                <strong>{endDateLabel}</strong>
                            </div>
                        </button>
                        <div className="row-sub">반복 안함</div>
                    </div>
                    <div className="add-btn-wrapper">
                        <button className="add-date" aria-label="">
                        <img className="add" src="/plus-02.svg" alt="" />
                        </button>
                    </div>
                </section>

                {/* 메모추가 */}
                <div className="memo-box">
                    <textarea className="memo-input" placeholder="메모 추가하기..." aria-label="메모 추가" />
                </div>
            </main>

            <footer className="footer-fixed">
                <button className="btn-primary" onClick={handleSave}>저장하기</button>
            </footer>
            {/* 시간 선택 바텀시트 */}
            {showSheet && (
                <TimeSheet
                    startTime={startTime}
                    endTime={endTime}
                    onChangeStart={setStartTime}
                    onChangeEnd={setEndTime}
                    onClose={() => setShowSheet(false)}
                />
            )}
            {/* 날짜 선택 바텀시트 */}
            {showStartDateSheet && (
                <DateSheet
                    value={startDate}
                    onChange={(d) => setStartDate(d)}
                    onClose={() => setShowStartDateSheet(false)}
                />
            )}

            {showEndDateSheet && (
                <DateSheet
                    value={endDate}
                    onChange={(d) => setEndDate(d)}
                    onClose={() => setShowEndDateSheet(false)}
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

type TimeSheetProps = {
  startTime: string | null;
  endTime: string | null;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onClose: () => void;
};

function TimeSheet({
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  onClose,
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
          <div className="sheet-col">
            <div className="sheet-col-label">시작</div>
            <div className="time-list">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={
                    "time-item" + (t === startTime ? " is-selected" : "")
                  }
                  onClick={() => onChangeStart(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="sheet-divider" />

          <div className="sheet-col">
            <div className="sheet-col-label">종료</div>
            <div className="time-list">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={
                    "time-item" + (t === endTime ? " is-selected" : "")
                  }
                  onClick={() => onChangeEnd(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="sheet-confirm"
          type="button"
          onClick={onClose}
        >
          확인
        </button>
      </div>
    </div>
  );
}

type DateSheetProps = {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
};

function DateSheet({ value, onChange, onClose }: DateSheetProps) {
  // YYYY-MM-DD 형식으로 맞추기
  const toInputValue = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // "2025-10-20"
    if (!v) return;
    const [y, m, d] = v.split("-").map(Number);
    onChange(new Date(y, m - 1, d));
  };

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="날짜 선택"
      onClick={onClose}
    >
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">날짜</span>
          <button
            className="sheet-close-btn"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="date-sheet-body">
          <input
            className="date-input"
            type="date"
            value={toInputValue(value)}
            onChange={handleChange}
          />
        </div>

        <button
          className="sheet-confirm"
          type="button"
          onClick={onClose}
        >
          확인
        </button>
      </div>
    </div>
  );
}