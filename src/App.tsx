// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
//import AuthCallback from "./pages/authCallback";
import NewSchedule from "./pages/newSchedule";
import Login from "./pages/login";

const USE_MOCK = true as const;

type ScheduleItem = {
  id: string;
  title: string;
  subtitle: string;
  /** 'YYYY-MM-DD' */
  date: string;
};

type ApiSchedulesResp = { items: ScheduleItem[] };

async function api<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path);
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
        <img className="icon" src="/plus-01.svg" alt="추가" />
      </button>
    </div>
  );
}

type EventCardProps = Pick<ScheduleItem, "title" | "subtitle">;
function EventCard({ title, subtitle }: EventCardProps): React.ReactElement {
  return (
    <article className="card">
      <div className="item">
        <div className="thumb" />
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
  const t = (o: number) => {
    const x = new Date();
    x.setDate(x.getDate() + o);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
      x.getDate()
    ).padStart(2, "0")}`;
  };
  return [
    { id: "a1", title: "새로운 이벤트", subtitle: "새로운 이벤트", date: t(0) },
    { id: "a2", title: "새로운 이벤트", subtitle: "새로운 이벤트", date: t(0) },
    { id: "b1", title: "새로운 이벤트", subtitle: "새로운 이벤트", date: t(-1) },
    { id: "b2", title: "새로운 이벤트", subtitle: "새로운 이벤트", date: t(-1) },
    { id: "c1", title: "새로운 이벤트", subtitle: "새로운 이벤트", date: t(-2) },
  ];
}
function Home(): React.ReactElement {
  const [month, setMonth] = React.useState<string>("2025-10");
  const [items, setItems] = React.useState<ScheduleItem[]>(USE_MOCK ? mockList() : []);

  React.useEffect(() => {
    if (USE_MOCK) return;
    (async () => {
      const data = await api<ApiSchedulesResp>(`/schedules?month=${month}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    })().catch(console.error);
  }, [month]);

  const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) {
      (g[it.date] ??= []).push(it);
    }
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // 내림차순
  }, [items]);

  return (
    <div className="wrap">
      <Header />
      <div className="row" style={{ marginTop: 23 }}>
        <MonthHeader value={month} onChange={setMonth} />
      </div>
      {byDate.map(([date, arr]) => (
        <section key={date}>
          <h2 className="h2">{dateLabel(date)}</h2>
          {arr.map((it) => (
            <EventCard key={it.id} title={it.title} subtitle={it.subtitle} />
          ))}
        </section>
      ))}
    </div>
  );
}
//나중에 콜백 페이지 쓰면 라우트 추가 <Route path="/auth/callback" element={<AuthCallback />} /> 

export default function App(): React.ReactElement {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/schedule/new" element={<NewSchedule />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}