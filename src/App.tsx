// src/App.tsx
import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
//import AuthCallback from "./pages/authCallback";
import NewSchedule from "./pages/newSchedule";
import Login from "./pages/login";
import QuestionsPage from "./pages/questionsPage";
import ProtectedRoute from "./protectedRoute";
import KakaoCallback from "./pages/kakaoCallback";
const USE_MOCK = false as const;  // true: 목업 데이터 사용, false: 실제 API 호출

type ScheduleItem = {
  id: string;
  title: string;
  subtitle: string;
  /** 'YYYY-MM-DD' */
  date: string;
};

type ApiSchedulesResp = { items: ScheduleItem[] };

async function api<T = unknown>(path: string): Promise<T> {

  const accessToken = localStorage.getItem("accessToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(path, {
    headers,
    credentials: "include", // Refresh Token 쿠키도 같이 보내서 토큰 만료 시 대비
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function Header(): React.ReactElement {
  return (
    <div className="topbar">
      <button className="iconbtn" aria-label="menu" onClick={() => { /* TODO */ }}>
        {/* public 폴더 자산은 /파일명 으로 접근 */}
        <img className="icon" src="/menu-01.svg" alt="메뉴" />
      </button>

      <div className="app-title">internie</div>

      <button className="iconbtn" aria-label="add" onClick={() => { /* TODO */ }}>
        <img className="icon" src="/calendar-07.svg" alt="추가" />
      </button>
    </div>
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

function mockList(): ScheduleItem[] {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  return [
    {
      id: "demo-1",
      title: "새로운 이벤트",
      subtitle: "첫 번째 일정입니다",
      date: dateStr,           // 오늘 날짜에 붙이기
    },
  ];
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

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = React.useState<string>(currentMonth);

  const [items, setItems] = React.useState<ScheduleItem[]>(USE_MOCK ? mockList() : []);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);

  React.useEffect(() => {
    if (USE_MOCK) return;

    //(async () => {
      //const data = await api<ApiSchedulesResp>(`/schedules?month=${month}`);
      //setItems(Array.isArray(data.items) ? data.items : []);
    //})().catch(console.error);
    (async () => {
      try {
        const [y, m] = month.split("-"); 
        
        const path = `/events/${y}/${m}`;

        console.log("스케줄 요청:", path); // 디버깅용 로그

        const data = await api<any>(path); 
        console.log("백엔드 응답 데이터:", data); 

        // 4. 데이터 매핑 (Backend 'Event' -> Frontend 'ScheduleItem')
        // 백엔드가 { items: [...] } 형태가 아니라 배열([...])을 바로 줄 수도 있습니다.
        // 백엔드 필드명이 id, title, content, startDate 처럼 다를 수 있으니 여기서 맞춰줍니다.
        
        const rawList = Array.isArray(data) ? data : (data.items || []);
        
        const mappedItems: ScheduleItem[] = rawList.map((item: any) => ({
            // 좌측: 프론트엔드 필드명, 우측: 백엔드에서 오는 필드명(추측)
            // console.log(data) 결과를 보고 우측 이름을 수정해야 합니다.
            id: item.eventId || item.id,            
            title: item.title || item.eventName,
            subtitle: item.content || item.description || "상세 내용 없음",
            date: item.startDate || item.date // "YYYY-MM-DD" 형태여야 함
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
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // 내림차순
  }, [items]);
  
  const hasItems = byDate.length > 0;
//false;
  return (
    <div className="wrap">
      <div className="spacer-50" aria-hidden="true" />
      <Header />
      <div className="row" style={{ marginTop: 23 }}>
        <MonthHeader value={month} onChange={setMonth} />
      </div>

      {hasItems ? (
        byDate.map(([date, arr]) => (
          <section key={date}>
            <h2 className="h2">{dateLabel(date)}</h2>
            {arr.map((it) => (
              <EventCard
                key={it.id}
                title={it.title}
                subtitle={it.subtitle}
                selected={selectedItem?.id === it.id}
                onClick={() => setSelectedItem(it)}      // ← 클릭 시 모달용 상태 설정
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
      {selectedItem && (
        <EventModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRecord={() => {
            const id = selectedItem.id;
            setSelectedItem(null);
            navigate(`/schedule/${id}/questions`);
          }}
        />
      )}
    </div>
  );
}
//나중에 콜백 페이지 쓰면 라우트 추가 <Route path="/auth/callback" element={<AuthCallback />} />   카카오: 

export default function App(): React.ReactElement {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />
        <Route path="/schedule/new" element={<NewSchedule />} />
        <Route path="/schedule/:scheduleId/questions" element={<QuestionsPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
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
