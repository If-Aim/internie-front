// src/App.tsx
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { api } from "./api/client";
import Login from "./pages/login";
import KakaoCallback from "./pages/kakaoCallback";
import NewSchedule from "./pages/newSchedule";
import QuestionsPage from "./pages/questionsPage";
import ProtectedRoute from "./protectedRoute";
import EditSchedule from "./pages/editSchedule";
import MyPage from "./pages/myPage";

import "./App.css";

type ScheduleItem = {
  instanceId: string;
  eventId: string;
  title: string;
  subtitle: string;
  date: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  eventDayId?: string | number | null;
  isLocked?: boolean;
  transcriptionCount?: number;
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
  startTime?: string | null;
  endTime?: string | null;
  memo?: string | null;
  completed: boolean;
  transcriptions?: Transcription[];
};

type EventDayMonthResponse = {
  totalCount: number;
  eventDayList: EventDay[];
};
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
  e: { id: string | number; title: string; content?: string; startDate: string; endDate: string;startTime?: string | null; endTime?: string | null; },
  ym: string
): ScheduleItem[] {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1~12
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0); // 이번 달 마지막 날

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

/*시간 관련 함수*/
function hhmm(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5); // "16:00:00" -> "16:00"
}
function toHHmm(t?: string | null): string | undefined {
  if (!t) return undefined;
  return t.length >= 5 ? t.slice(0, 5) : t;
}
function isAllDayTime(startTime?: string | null, endTime?: string | null): boolean { //"종일" 처리
  if (!startTime || !endTime) return false;
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  return s === "00:00" && (e === "24:00" || e === "23:59");
}
function timeRangeText(startTime?: string | null, endTime?: string | null): string { //"종일" 처리
  if (!startTime || !endTime) return "";
  if (isAllDayTime(startTime, endTime)) return "종일";
  return `${hhmm(startTime)}–${hhmm(endTime)}`;
}
type HeaderProps = {
  onMenuClick: () => void;
  onAddClick: () => void;
};
function Header({ onMenuClick, onAddClick }: HeaderProps): React.ReactElement {
  return (
    <div className="topbar">
      {/* side menu */}
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
  userId: number | null; 
  userName: string;
  userProfileImg: string;
};
function SideMenu({ isOpen, onClose/*, userId*/, userName, userProfileImg }: SideMenuProps) {
  const navigate = useNavigate();

  const widthRef = React.useRef<number>(Math.round(window.innerWidth * 0.95));
  const rafRef = React.useRef<number | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [x, setX] = React.useState<number>(() => -widthRef.current); 
  const startXRef = React.useRef(0);
  const startPanelXRef = React.useRef(0); 
  const lastXRef = React.useRef(0);
  const lastTRef = React.useRef(0);
  const vxRef = React.useRef(0); 

  const [dragging, setDragging] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  React.useEffect(() => {
    const w = panelRef.current?.offsetWidth ?? widthRef.current;
    widthRef.current = w;

    if (dragging) return;

    setX(isOpen ? 0 : -w);
  }, [isOpen, dragging]);

  const openProgress = React.useMemo(() => {
    const w = widthRef.current || 1;
    return clamp(1 - Math.abs(x) / w, 0, 1);
  }, [x]);

  const closeWithSnap = React.useCallback(() => {
    if (closing) return;

    const w = widthRef.current;
    setDragging(false);
    setClosing(true);

    setX(-w);

    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 260);
  }, [onClose, closing]);

  const openWithSnap = React.useCallback(() => {
    setDragging(false);
    setX(0);
  }, []);
  const onPointerDown = (e: React.PointerEvent) => {
    if (!panelRef.current) return;

    if (!isOpen) return;

    panelRef.current.setPointerCapture(e.pointerId);

    const w = panelRef.current.offsetWidth;
    widthRef.current = w;

    setDragging(true);

    startXRef.current = e.clientX;
    startPanelXRef.current = x;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    vxRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    if (!panelRef.current) return;

    const now = performance.now();
    const dx = e.clientX - startXRef.current;

    const w = widthRef.current;
    const nextX = clamp(startPanelXRef.current + dx, -w, 0);

    const dt = now - lastTRef.current;
    if (dt > 0) {
      const v = (e.clientX - lastXRef.current) / dt; 
      vxRef.current = v;
      lastXRef.current = e.clientX;
      lastTRef.current = now;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setX(nextX));
  };

  const onPointerUpOrCancel = (e: React.PointerEvent) => {
    if (!dragging) return;

    const w = widthRef.current;
    const progress = clamp(1 - Math.abs(x) / w, 0, 1);

    const v = vxRef.current;
    const flingLeft = v < -0.6; 
    const passedThreshold = progress < 0.6; //60% 미만이면 닫힌 상태

    setDragging(false);

    if (flingLeft || passedThreshold) {
      closeWithSnap();
    } else {
      openWithSnap();
    }

    try {
      panelRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const canInteract = isOpen || dragging || closing;

  return (
    <>
      <div className="drawer-backdrop" onClick={() => {if (!canInteract) return; closeWithSnap()}} aria-hidden="true" 
      style={{
        opacity: openProgress,
        pointerEvents: canInteract ? "auto" : "none",
        transition: dragging ? "none" : "opacity 220ms ease",
      }}  
      />
      <div ref={panelRef} className="drawer-panel" 
      style={{
        transform: `translateX(${x}px)`,
        transition: dragging ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: canInteract ? "auto" : "none",
      }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
      >
        <div className="drawer-header">
          <div className="profile-wrap">
            <img src={userProfileImg} alt="프로필" className="profile-img" />
            <div className="profile-info">
              <div className="name">{userName}</div>
              {/*<div className="email">User ID: {userId ?? "-"}</div>*/}
            </div>
          </div>
        </div>
        
        <div className="drawer-body">
          <button className="drawer-menu-item" onClick={() => { navigate("/mypage"); closeWithSnap(); }}>
            <img className="icon" src="/user-profile-02.svg" alt="마이페이지"/> <span>마이페이지</span>
          </button>
          <button className="drawer-menu-item" onClick={() => { /* TODO */ }}>
            <img className="icon" src="/arrow-refresh-01.svg" alt="최근활동"/> <span>최근 활동</span>
          </button>
          <button className="drawer-menu-item" onClick={() => { /* TODO */ }}>
            <img className="icon" src="/settings.svg" alt="설정 및 개인정보"/> <span>설정 및 개인정보</span>
          </button>
        </div>

      </div>
    </>
  );
}

type MonthHeaderProps = { value: string; onChange: (ym: string) => void };
function MonthHeader({ value, onChange }: MonthHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const currentYm = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [, mStr] = value.split("-");
  const label = `${Number(mStr)}월`;
  const months = React.useMemo(() => {
    const [yStr, mStr] = currentYm.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const list: { ym: string; text: string }[] = [];
    for (let mm = m; mm >= 1; mm--) {
      const ym = `${y}-${String(mm).padStart(2, "0")}`;
      list.push({ ym, text: `${mm}월` });
    }
    return list;
  }, [currentYm]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="month-row" ref={ref} style={{ position: "relative" }}>
      <div className="month-left">
        <div className="h1">{label}</div>
        <button className="month-btn" aria-label="월 선택" onClick={() => setOpen(v => !v)}>
          <img className="icon" src="/chevron-right.svg" alt="월 선택" />
        </button>
      </div>

      {open && (
        <div className="month-pop" role="menu" aria-label="월 선택" style={{ left: 0, top: "100%", marginTop: 8 }}>
          <div className="month-menu">
            {months.map(m => (
              <button
                key={m.ym}
                className="month-item"
                aria-current={m.ym === value ? "true" : undefined}
                onClick={() => { onChange(m.ym); setOpen(false); }}
              >
                {m.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type EmptyStateProps = { onAddClick: () => void; };
function EmptyState({ /*onAddClick*/ }: EmptyStateProps): React.ReactElement {
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

type EventCardProps = Pick<ScheduleItem, "title" | "subtitle"> & {
  selected: boolean;
  locked: boolean;
  onClick: () => void;
  onEditClick: () => void; 
};
function EventCard({ title, subtitle, selected, locked, onClick, onEditClick }: EventCardProps): React.ReactElement {
  return (
    <article
      className={"card" + (selected ? " card--selected" : "") + (locked ? " card-locked" : "")}
      onClick={onClick}
      style={{ position: "relative", cursor: "pointer" }}
      aria-disabled={locked ? "true" : undefined}
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


function Home(): React.ReactElement {
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = React.useState<string>(currentMonth);
  
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const [currentUserId/*, setCurrentUserId*/] = React.useState<number | null>(null);

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
  const isSelectedLocked = !!selectedItem?.isLocked;

  const [userName, setUserName] = React.useState<string>("사용자");
  const [userProfileImg, setUserProfileImg] = React.useState<string>("/internie_mascot_normal.png");
  React.useEffect(() => {
    (async () => {
      try {
        const { getUserIdFromAccessToken, getUserById } = await import("./api/client");
        const uid = getUserIdFromAccessToken();
        if (!uid) return;

        const me = await getUserById(uid);
        setUserName(me.name ?? "사용자");
        setUserProfileImg(me.profileImage ?? "/internie_mascot_normal.png");
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);
  React.useEffect(() => {
    (async () => {
      try {
        const [y, m] = month.split("-");

        const [eventsData, eventDaysData] = await Promise.all([ //전체일정, 세부일정 동시 조회
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

          const serverHasLatest = rawList.some((e: any) =>
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
        for (const ed of eventDaysData.eventDayList ?? []) {
          const key = `${String(ed.eventId)}__${ed.date}`;
          eventDayByKey.set(key, ed);
        }
        const expanded = events.flatMap((ev) => expandEventToDailyItems(ev, month));

        const merged = expanded.map((it) => {
          const key = `${String(it.eventId)}__${it.date}`;
          const ed = eventDayByKey.get(key);

          if (!ed) return it;

          const count = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
          const locked = count > 0; 

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
  }, [month, refetchTick]);

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

  const handleRecord = async () => {
    if (!selectedItem) return;
    if (selectedItem.isLocked) return;

    try {
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
      setSelectedItem(null);
      navigate(`/schedule/${newEventDayId}/questions`);

    } catch (error) {
      alert("일정을 기록하는 중 오류가 발생했습니다.");
    }
  };
  const canRecord = !!selectedItem && !isSelectedLocked;

  return (
    <div className={`wrap ${isMenuOpen ? "lock-scroll" : ""}`}>
      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setMenuOpen(false)} 
        userId={currentUserId}
        userName={userName}
        userProfileImg={userProfileImg}
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
            {arr.map((it) => {
              const locked = !!it.isLocked;
              return (
                <EventCard
                  key={it.instanceId}
                  title={it.title}
                  subtitle={timeRangeText(it.startTime, it.endTime)}
                  selected={selectedItem?.instanceId === it.instanceId}
                  locked={locked}
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
              );
            })}
          </section>
        ))
      ) : (
        <EmptyState onAddClick={() => navigate("/schedule/new")} />
      )}
      <div className="bottom-spacer" />
      
      {/* 기록하기 모달(팝업) */}
      {isRecordModalOpen && selectedItem && (
        <EventModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRecord={handleRecord}
        />
      )}
      {hasItems && (
      <div className="bottom-cta">
        <button
          type="button"
          className={`record-btn ${canRecord ? "enabled" : ""}`}
          disabled={!canRecord}
          onClick={() => {if (!canRecord) return; setIsRecordModalOpen(true);}}
        >
          기록하기
        </button>
      </div>
      )}
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
        <Route element={<ProtectedRoute />}> {/*보호된 라우트 (로그인상태에서만 접근가능) */}
          <Route path="/" element={<Home />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/schedule/new" element={<NewSchedule />} />
          <Route path="/schedule/:eventId" element={<EditSchedule />} />
          <Route path="/schedule/:scheduleId/questions" element={<QuestionsPage />} />
        </Route>
      </Routes>
    </div>
  );
}