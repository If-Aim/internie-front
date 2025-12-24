// src/App.tsx
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Login from "./pages/login";
import KakaoCallback from "./pages/kakaoCallback";
import NewSchedule from "./pages/newSchedule";
import QuestionsPage from "./pages/questionsPage";
import ProtectedRoute from "./protectedRoute";
import EditSchedule from "./pages/editSchedule";

import "./App.css";

/*날짜 관련*/
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
  e: { id: string | number; title: string; content?: string; startDate: string; endDate: string;startTime?: string | null; endTime?: string | null; },
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
    });
  }
  return out;
}
function parseIsoDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    date: d,
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    day: d.getDate(),
    weekday: d.getDay(),
  };
}
function formatKoreanDateYmd(iso: string): string {
  const { y, m, day } = parseIsoDate(iso);
  return `${y}년 ${m}월 ${day}일`;
}
function dateLabel(iso: string): string {
  const { date, day, weekday } = parseIsoDate(iso);
  const w = ["일", "월", "화", "수", "목", "금", "토"][weekday];

  const today = new Date();
  const same =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return same ? `${day}일 오늘` : `${day}일 ${w}요일`;
}
function shiftYm(ym: string, diffMonths: number): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);

  const d = new Date(y, m - 1 + diffMonths, 1);
  const ny = d.getFullYear();
  const nm = d.getMonth() + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}


/*시간 관련 함수*/
function hhmm(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5); // "16:00:00" -> "16:00"
}

function timeRangeText(startTime?: string | null, endTime?: string | null): string {
  if (!startTime || !endTime) return "";
  return `${hhmm(startTime)}–${hhmm(endTime)}`;
}

type ScheduleItem = {
  instanceId: string;
  eventId: string;
  title: string;
  subtitle: string;
  date: string; /* 'YYYY-MM-DD' */
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
};
type RawEvent = {
  id: string | number;
  title: string;
  content?: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
};

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const Token = localStorage.getItem("accessToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (Token) {
    headers["Authorization"] = `${Token}`;
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("accessToken"); 
    
    window.location.href = "/login"; 
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

type HeaderProps = {
  onMenuClick: () => void;
  onAddClick: () => void;
};
function Header({ onMenuClick, onAddClick }: HeaderProps): React.ReactElement {
  return (
    <div className="topbar">
      {/* menu drawer */}
      <button className="iconbtn" aria-label="menu" onClick={onMenuClick}>
        <img className="icon" src="/menu-01.svg" alt="메뉴" />
      </button>

      <div className="app-title">internie</div>

      <button className="iconbtn" aria-label="add" onClick={onAddClick}>
        <img className="icon" src="/plus-01.svg" alt="추가" />
      </button>
    </div>
  );
}

type SideMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userId: number | null; 
};
function SideMenu({ isOpen, onClose, onLogout, userId }: SideMenuProps) {
  if (!isOpen) return null;

  const user = {
    nickname: "null",  //나중에 닉네임 또는 본명? 불러오기
    profileImage: "/internie_mascot_normal.png" //나중에 프로필 이미지 불러오기 
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel">
        <div className="drawer-header">
          <div className="profile-wrap">
            <img 
              src={user.profileImage} 
              alt="프로필" 
              className="profile-img" 
            />
            <div className="profile-info">
              <div className="name">{user.nickname}</div>
              <div className="email">User ID: {userId ?? "-"}</div>
            </div>
          </div>
        </div>
        
        <div className="drawer-body">
          <button className="drawer-menu-item" onClick={() => { /* TODO */ }}>
            마이페이지
          </button>
          <button className="drawer-menu-item" onClick={() => { /* TODO */ }}>
            설정
          </button>
        </div>

        <div className="drawer-footer">
          <button className="btn-logout" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
}

type EventCardProps = Pick<ScheduleItem, "title" | "subtitle"> & {
  selected: boolean;
  onClick: () => void;
  onEditClick: () => void; 
};
function EventCard({ title, subtitle, selected, onClick, onEditClick }: EventCardProps): React.ReactElement {
  return (
    <article
      className={"card" + (selected ? " card--selected" : "")}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      <div className="item">
        <div className={"thumb" + (selected ? " thumb--selected" : "")} />
        <div>
          <div className="title">{title}</div>
          <div className="subtitle">{subtitle}</div>
        </div>
      </div>

      <button
        type="button"
        className="card-edit-btn"
        aria-label="일정 수정"
        onClick={(e) => {
          e.stopPropagation(); 
          onEditClick();
        }}
      >
        <img className="icon" src="/chevron-right.svg" alt="일정 수정" style={{ transform: "rotate(-90deg)" }} />
      </button>
    </article>
  );
}

type MonthHeaderProps = { value: string; onChange: (ym: string) => void };
function MonthHeader({ value, onChange }: MonthHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const [yStr, mStr] = value.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  // 연도 리스트: 예) 현재연도 기준 -5 ~ +1
  const years = React.useMemo(() => {
    const nowY = new Date().getFullYear();
    const start = nowY - 5;
    const end = nowY + 1;
    const list: number[] = [];
    for (let y = start; y <= end; y++) list.push(y);
    return list;
  }, []);
  //const label = `${Number(mStr)}월`;
  const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);


  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const setYear = (y: number) => onChange(`${y}-${String(month).padStart(2, "0")}`);
  const setMonth = (m: number) => onChange(`${year}-${String(m).padStart(2, "0")}`);

  return (
    <div className="month-row" ref={ref} style={{ position: "relative" }}>
      <div className="month-left">
        <button className="month-nav" aria-label="이전 달" onClick={() => onChange(shiftYm(value, -1))}>
          〈
        </button>

        <button className="month-nav" aria-label="다음 달" onClick={() => onChange(shiftYm(value, 1))}>
          〉
        </button>
        <button
          className="month-btn"
          type="button"
          aria-label="연도/월 선택"
          onClick={() => setOpen((v) => !v)}
        >
          {year}년 {month}월
          <img className="icon" src="/chevron-right.svg" alt="" style={{ marginLeft: 6 }} />
        </button>
      </div>

      {open && (
        <div
          className="month-pop"
          role="dialog"
          aria-label="연도/월 선택"
          style={{ left: 0, top: "100%", marginTop: 8 }}
        >
          <div className="month-menu" style={{ display: "flex", gap: 12, padding: 12 }}>
            {/* 연도 컬럼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>연도</div>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className="month-item"
                  aria-current={y === year ? "true" : undefined}
                  onClick={() => setYear(y)}
                >
                  {y}년
                </button>
              ))}
            </div>

            {/* 월 컬럼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>월</div>
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="month-item"
                  aria-current={m === month ? "true" : undefined}
                  onClick={() => {
                    setMonth(m);
                    setOpen(false); // 월 선택하면 닫기
                  }}
                >
                  {m}월
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type EmptyStateProps = { onAddClick: () => void; };
function EmptyState({ onAddClick }: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty">
      <img className="empty-illust" src="/internie_mascot_normal.png" alt="" />

      <p className="empty-sub">아직 일정이 없어요.<br /> 일정을 추가해 볼까요?</p>

      <button
        type="button"
        className="empty-sync"
        onClick={() => {
          // 나중에 캘린더 연동 기능 넣기
        }}
      >
        캘린더 연동하기
      </button>
    </div>
  );
}

function Home(): React.ReactElement {
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = React.useState<string>(currentMonth);
  
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);

  const [items, setItems] = React.useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);
  const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) {
      (g[it.date] ??= []).push(it);
    }
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1)); 
  }, [items]); 

  const hasItems = byDate.length > 0;
  const [refetchTick] = React.useState(0);
  const pendingUpdatedEventRef = React.useRef<any>(null);


  React.useEffect(() => {
    (async () => {
      try {
        const [y, m] = month.split("-");
        const data = await api<any>(`/events/${y}/${m}`);
        const rawList = data.eventList || [];
        
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

          const serverHasLatest = rawList.some((e: any) =>
            String(e.id) === String(u.id) &&
            (u.title == null || e.title === u.title) &&
            (u.content == null || e.content === u.content) &&
            (u.startDate == null || e.startDate === u.startDate) &&
            (u.endDate == null || e.endDate === u.endDate) &&
            (u.startTime == null || e.startTime === u.startTime) &&
            (u.endTime == null || e.endTime === u.endTime)
          );

          if (serverHasLatest) {
            pendingUpdatedEventRef.current = null;
          }
        }

        const expanded = events.flatMap((ev) => expandEventToDailyItems(ev, month));

        setItems(expanded);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [month, refetchTick]);

  React.useEffect(() => {
    if (!selectedItem) setIsRecordModalOpen(false);
  }, [selectedItem]);

  const handleRecord = async () => {
    if (!selectedItem) return;

    try {
      const body = {
        title: selectedItem.title,
        memo: selectedItem.subtitle,
        date: selectedItem.date,
      };

      const response = await api<any>(`/event-days/events/${selectedItem.eventId}`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const newEventDayId = response.eventDayId;
      setSelectedItem(null);
      navigate(`/schedule/${newEventDayId}/questions`);

    } catch (error) {
      alert("일정을 기록하는 중 오류가 발생했습니다.");
    }
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setMenuOpen(false); 
    navigate("/login"); 
  };

  return (
    <div className="wrap">
      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setMenuOpen(false)} 
        onLogout={handleLogout}
        userId={currentUserId}
      />

      <div className="spacer-50" aria-hidden="true" />
      
      <Header onMenuClick={() => setMenuOpen(true)} onAddClick={() => navigate("/schedule/new")} />
      
      <div className="row" style={{ marginTop: 23}}>
        <MonthHeader value={month} onChange={setMonth} />
      </div>

      {hasItems ? (
        byDate.map(([date, arr]) => (
          <section key={date} style={{marginTop: "19px", marginBottom: "27px"}}>
            <h2 className="h2" style={{ fontSize: "16px", color: "#979797", fontWeight: 500, lineHeight: "20px",marginBottom: "13px" }}>{dateLabel(date)}</h2>
            {arr.map((it) => (
              <EventCard
                key={it.instanceId}
                title={it.title}
                subtitle={timeRangeText(it.startTime, it.endTime)}
                selected={selectedItem?.instanceId === it.instanceId}
                onClick={() => setSelectedItem(prev => (prev?.instanceId === it.instanceId ? null : it))}
                onEditClick={() =>
                  navigate(`/schedule/${it.eventId}`, {
                    state: {
                      event: {
                        id: it.eventId,
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
            ))}
          </section>
        ))
      ) : (
        <EmptyState onAddClick={() => navigate("/schedule/new")} />
      )}
      <div className="bottom-spacer" />
      {/*파란색 일정 추가 버튼
      <button
        type="button"
        className="fab-add"
        aria-label="새 일정 추가"
        onClick={() => navigate("/schedule/new")}
      >
        <img className="icon" src="/plus-01-white.svg" alt="" />
      </button>*/}
      
      {/* 기록하기 모달(팝업) */}
      {isRecordModalOpen && selectedItem && (
        <EventModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRecord={handleRecord}
        />
      )}
      <div className="bottom-cta">
        <button
          type="button"
          className={`record-btn ${selectedItem ? "enabled" : ""}`}
          disabled={!selectedItem}
          onClick={() => setIsRecordModalOpen(true)}
        >
          기록하기
        </button>
      </div>
    </div>
  );
}



type EventModalProps = {
  item: ScheduleItem;
  onClose: () => void;
  onRecord: () => void;
};
function EventModal({ item, onClose, onRecord }: EventModalProps): React.ReactElement {
  const dateText = formatKoreanDateYmd(item.date);

  return (
    <div
      className="event-modal-backdrop"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="event-modal-sheet"
        onClick={(e) => e.stopPropagation()} // 안쪽 클릭 시 닫히지 않게
      >
        <header className="event-modal-header">
          <div>
            <div className="event-modal-title">{item.title}</div>
            <div className="event-modal-date">{dateText}</div>
          </div>
          <button
            type="button"
            className="event-modal-close"
            aria-label="닫기"
            onClick={onClose}
            
          >
            <img className="icon" alt="" src="/x-01.svg"/>
          </button>
        </header>

        <main className="event-modal-body">
          <p className="event-modal-text">
            오늘의 경험을 기록하고<br />
            역량 점수를 얻으세요!
          </p>

          <div className="event-modal-cards">
            <div className="event-modal-card-placeholder" />
            <div className="event-modal-card-placeholder" />
          </div>
        </main>

        <footer className="event-modal-footer">
          <button
            type="button"
            className="event-modal-primary"
            onClick={onRecord}
          >
            기록하기
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    // 라우터
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />
        <Route element={<ProtectedRoute />}> {/*보호되 라우트 (로그인상태에서만 접근가능) */}
          <Route path="/" element={<Home />} />
          <Route path="/schedule/new" element={<NewSchedule />} />
          <Route path="/schedule/:eventId" element={<EditSchedule />} />
          <Route path="/schedule/:scheduleId/questions" element={<QuestionsPage />} />
        </Route>
      </Routes>
    </div>
  );
}