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

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function NewSchedule() {
    const nav = useNavigate();
    const [stage, setStage] = React.useState<Stage>("form");
    const [showSheet, setShowSheet] = React.useState(false);
    const [startTime, setStartTime] = React.useState<string | null>(null);
    const [endTime, setEndTime] = React.useState<string | null>(null);
    const hasTime = startTime !== null && endTime !== null;

    const [showStartDateSheet, setShowStartDateSheet] = React.useState(false);
    const [showEndDateSheet, setShowEndDateSheet] = React.useState(false);
    const [showDateRangeSheet, setShowDateRangeSheet] = React.useState(false);
    
    const [startDate, setStartDate] = React.useState<Date>(() => new Date());
    const [endDate, setEndDate] = React.useState<Date>(() => new Date());
    const [title, setTitle] = React.useState("");
    const [memo, setMemo] = React.useState("");


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
    const dateRangeLabel = `${formatKoreanDate(startDate)} ~ ${formatKoreanDate(endDate)}`;
    const isRangeSelected = startDate.getTime() !== endDate.getTime();
    const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    // 시간 문자열(예: "오전 09:00")의 인덱스를 반환하는 헬퍼 함수
    const getTimeIndex = (t: string | null) => (t ? TIME_OPTIONS.indexOf(t) : -1);

    // 시작 시간 변경 시
    const handleStartTimeChange = (newTime: string) => {
        setStartTime(newTime);
        
        // 날짜가 같고 + 종료 시간이 이미 설정되어 있는데 + 시작 시간이 종료 시간보다 늦어진 경우
        // -> 종료 시간을 시작 시간과 똑같이 맞춰줌
        const isSameDay = startDate.getTime() === endDate.getTime();
        if (isSameDay && endTime) {
            if (getTimeIndex(newTime) > getTimeIndex(endTime)) {
                setEndTime(newTime);
            }
        }
    };

    // 종료 시간 변경 시
    const handleEndTimeChange = (newTime: string) => {
        const isSameDay = startDate.getTime() === endDate.getTime();
        
        // 날짜가 같고 + 시작 시간이 있는데 + 종료 시간이 시작 시간보다 빠른 경우
        // -> 경고 띄우고 변경 안 함
        if (isSameDay && startTime) {
            if (getTimeIndex(newTime) < getTimeIndex(startTime)) {
                alert("종료 시간은 시작 시간보다 빠를 수 없습니다.");
                return;
            }
        }
        setEndTime(newTime);
    };

    const handleStartDateChange = (newDate: Date) => {
        setStartDate(newDate);
        // 만약 새로 선택한 시작일이 현재 마감일보다 늦다면, 마감일도 시작일과 같게 맞춤
        if (stripTime(newDate) > stripTime(endDate)) {
            setEndDate(newDate);
        }
    };
    // 마감일 변경 시 처리
    const handleEndDateChange = (newDate: Date) => {
        // 마감일이 시작일보다 빠른지 검사
        if (stripTime(newDate) < stripTime(startDate)) {
            alert("마감일은 시작일보다 빠를 수 없습니다.");
            return;
        }
        setEndDate(newDate);
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
        const payload = {
          title: title,
          content: memo, // 메모 내용
          startDate: toYmd(startDate), 
          endDate: toYmd(endDate)    
        };

        
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
        }, 15000);

      } catch (err) {
        console.error("에러 발생:", err);
        alert("일정을 저장하지 못했습니다.");
      }
    };

    //type LocalScheduleItem = {
      //id: string;
      //title: string;
      //subtitle: string;
      //date: string; // 'YYYY-MM-DD'
    //};

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
                        <button
                            type="button"
                            className="row-head row-head-btn"
                            onClick={() => setShowStartDateSheet(true)}
                            aria-label="날짜 선택하기"
                        >
                            <img className="icon" src="/clock-01.svg" alt="날짜" />
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
                        <button type="button" className="row-sub row-sub-btn" 
                        onClick={() => setShowDateRangeSheet(true)} aria-label="시작일-마감일 설정">
                        {isRangeSelected ? dateRangeLabel : "시작일-마감일"}
                        </button>
                    </div>
                    <div className="add-btn-wrapper">
                        <button className="add-date" aria-label="시작일-마감일설정" onClick={() => setShowDateRangeSheet(true)}>
                        <img className="add" src="/plus-02.svg" alt="" />
                        </button>
                    </div>
                </section>

                {/* 메모추가 */}
                <div className="memo-box">
                    <textarea
                      className="memo-input"
                      placeholder="메모 추가하기..."
                      aria-label="메모 추가"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
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
                    onChangeStart={handleStartTimeChange}
                    onChangeEnd={handleEndTimeChange}
                    onClose={() => setShowSheet(false)}
                />
            )}
            {/* 날짜 선택 바텀시트 */}
            {showStartDateSheet && (
                <DateSheet
                    value={startDate}
                    onChange={handleStartDateChange}
                    onClose={() => setShowStartDateSheet(false)}
                />
            )}

            {showEndDateSheet && (
                <DateSheet
                    value={endDate}
                    onChange={handleEndDateChange}
                    onClose={() => setShowEndDateSheet(false)}
                />
            )}

            {showDateRangeSheet && (
              <DateRangeSheet
                startDate={startDate}
                endDate={endDate}
                onChangeStart={handleStartDateChange}
                onChangeEnd={handleEndDateChange}
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

type DateRangeSheetProps = {
  startDate: Date;
  endDate: Date;
  onChangeStart: (d: Date) => void;
  onChangeEnd: (d: Date) => void;
  onClose: () => void;
};

function DateRangeSheet({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onClose,
}: DateRangeSheetProps) {
  const toInputValue = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!v) return;
    const [y, m, d] = v.split("-").map(Number);
    onChangeStart(new Date(y, m - 1, d));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!v) return;
    const [y, m, d] = v.split("-").map(Number);
    onChangeEnd(new Date(y, m - 1, d));
  };

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="기간 선택"
      onClick={onClose}
    >
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">기간</span>
          <button
            className="sheet-close-btn"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="date-range-body">
          <div className="date-range-col">
            <div className="sheet-col-label">시작일</div>
            <input
              className="date-input"
              type="date"
              value={toInputValue(startDate)}
              onChange={handleStartChange}
            />
          </div>

          <div className="sheet-divider" />

          <div className="date-range-col">
            <div className="sheet-col-label">마감일</div>
            <input
              className="date-input"
              type="date"
              value={toInputValue(endDate)}
              onChange={handleEndChange}
            />
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