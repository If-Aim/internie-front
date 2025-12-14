// src/App.tsx
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import NewSchedule from "./pages/newSchedule";
import Login from "./pages/login";
import QuestionsPage from "./pages/questionsPage";
import ProtectedRoute from "./protectedRoute";
import KakaoCallback from "./pages/kakaoCallback";
import "./App.css";

type ScheduleItem = {
  id: string;
  title: string;
  subtitle: string;
  /** 'YYYY-MM-DD' */
  date: string;
};

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {

  const Token = localStorage.getItem("accessToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (Token) {
    headers["Authorization"] = `${Token}`;
  }
  console.log("실제로 전송되는 헤더:", headers["Authorization"]);
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    localStorage.removeItem("accessToken"); 
    
    window.location.href = "/login"; 
    
    throw new Error("세션이 만료되었습니다. 다시 로그인해주세요.");
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

type HeaderProps = {
  onMenuClick: () => void;
};

function Header({ onMenuClick }: HeaderProps): React.ReactElement {
  return (
    <div className="topbar">
      {/* 햄버거 버튼 클릭 시 onMenuClick 실행 */}
      <button className="iconbtn" aria-label="menu" onClick={onMenuClick}>
        <img className="icon" src="/menu-01.svg" alt="메뉴" />
      </button>

      <div className="app-title">internie</div>

      <button className="iconbtn" aria-label="add" onClick={() => { /* TODO */ }}>
        <img className="icon" src="/calendar-07.svg" alt="추가" />
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

  // 닉네임이나 이미지는 현재 API에 없으므로 고정값 혹은 로컬스토리지 활용 가능
  // 여기서는 userId만 동적으로 표시합니다.
  const user = {
    nickname: "null",
    profileImage: "/internie_mascot_normal.png"
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
              {/* Home에서 받아온 userId 표시 */}
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

type EventCardProps = Pick<ScheduleItem, "title" | "subtitle"> & {selected:boolean; onClick:() => void;};
function EventCard({ title, subtitle, selected, onClick }: EventCardProps): React.ReactElement {
  return (
    <article
      className={"card" + (selected ? " card--selected" : "")}
      onClick={onClick}
    >
      <div className="item">
        <div className={"thumb" + (selected ? " thumb--selected" : "")} />
        <div>
          <div className="title">{title}</div>
          <div className="subtitle">{subtitle}</div>
        </div>
      </div>
    </article>
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

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const [, mStr] = value.split("-");
  const label = `${Number(mStr)}월`;

  // "현재 달 → 1월" 역순 고정 목록
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

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const today = new Date();
  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return same ? `${d.getDate()}일 오늘` : `${d.getDate()}일 ${w}요일`;
}


type EmptyStateProps = {
  onAddClick: () => void;
};

function EmptyState({ onAddClick }: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty">
      <img className="empty-illust" src="/internie_mascot_normal.png" alt="" />

      <p className="empty-sub">아직 일정이 없어요.<br /> 일정을 추가해 볼까요?</p>

      <button
        type="button"
        className="empty-sync"
        onClick={() => {
          // TODO: 나중에 캘린더 연동 기능 넣기
        }}
      >
        캘린더 연동하기
      </button>
    </div>
  );
}

function Home(): React.ReactElement {
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = React.useState(false);

  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = React.useState<string>(currentMonth);
  const [items, setItems] = React.useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [y, m] = month.split("-"); 
        const path = `/events/${y}/${m}`;
        const data = await api<any>(path); 
        const rawList = data.eventList || [];

        if (rawList.length > 0) {
          // 첫 번째 일정의 userId를 사용 (모든 일정의 소유자는 같을 테니)
          setCurrentUserId(rawList[0].userId);
        }
        const mappedItems: ScheduleItem[] = rawList.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            subtitle: item.content,  
            date: item.startDate
        }));
        setItems(mappedItems);
      } catch (e) {
        console.error("스케줄 불러오기 실패:", e);
      }
    })();
  }, [month]);

  const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) {
      (g[it.date] ??= []).push(it);
    }
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1)); 
  }, [items]);
  
  const hasItems = byDate.length > 0;

  const handleRecord = async () => {
    if (!selectedItem) return;

    try {
      const body = {
        title: selectedItem.title,
        memo: selectedItem.subtitle, // subtitle을 content로 매핑
        date: selectedItem.date,
      };

      // 2. API 호출: POST /event-days/events/{eventId}
      // 응답 타입을 any 혹은 명세서에 맞게 정의 가능
      const response = await api<any>(`/event-days/events/${selectedItem.id}`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      console.log("세부 일정 생성 성공:", response);

      const newEventDayId = response.eventDayId;
      setSelectedItem(null);
      navigate(`/schedule/${newEventDayId}/questions`);

    } catch (error) {
      console.error("기록하기 실패:", error);
      alert("일정을 기록하는 중 오류가 발생했습니다.");
    }
  };


  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem("accessToken"); // 토큰 삭제
    setMenuOpen(false); // 메뉴 닫기
    navigate("/login"); // 로그인 페이지로 이동
  };

  return (
    <div className="wrap">
      {/* SideMenu 배치 (z-index가 높으므로 맨 위에 뜸) */}
      <SideMenu 
        isOpen={isMenuOpen} 
        onClose={() => setMenuOpen(false)} 
        onLogout={handleLogout}
        userId={currentUserId}
      />

      <div className="spacer-50" aria-hidden="true" />
      
      {/* Header에 메뉴 클릭 핸들러 전달 */}
      <Header onMenuClick={() => setMenuOpen(true)} />
      
      <div className="row" style={{ marginTop: 23 }}>
        <MonthHeader value={month} onChange={setMonth} />
      </div>

      {hasItems ? (
        byDate.map(([date, arr]) => (
          <section key={date}>
            <h2 className="h2"style={{ fontSize: "16px", color: "#979797", fontWeight: 500, lineHeight: "20px",marginTop: "27px" }}>{dateLabel(date)}</h2>
            {arr.map((it) => (
              <EventCard
                key={it.id}
                title={it.title}
                subtitle={it.subtitle}
                selected={selectedItem?.id === it.id}
                onClick={() => setSelectedItem(it)}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState onAddClick={() => navigate("/schedule/new")} />
      )}

      <button
        type="button"
        className="fab-add"
        aria-label="새 일정 추가"
        onClick={() => navigate("/schedule/new")}
      >
        <img className="icon" src="/plus-01-white.svg" alt="" />
      </button>
      
      {/* ... EventModal 등 ... */}
      {selectedItem && (
        <EventModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRecord={handleRecord}
        />
      )}
    </div>
  );
}

type EventModalProps = {
  item: ScheduleItem;
  onClose: () => void;
  onRecord: () => void;
};

function formatKoreanDateYmd(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

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
            ✕
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
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/schedule/new" element={<NewSchedule />} />
          <Route path="/schedule/:scheduleId/questions" element={<QuestionsPage />} />
        </Route>
      </Routes>
    </div>
  );
}