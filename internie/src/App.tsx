// src/App.tsx
import React from "react";

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
      <button
        className="iconbtn"
        aria-label="menu"
        onClick={() => {
          /* TODO: 사이드메뉴 열기 */
        }}
      >
        <img className="icon" src="/public/menu-01.svg" alt="메뉴" />
      </button>

      <div className="app-title">internie</div>

      <button
        className="iconbtn"
        aria-label="add"
        onClick={() => {
          /* TODO: 일정 추가 */
        }}
      >
        <img className="icon" src="/public/plus-01.svg" alt="추가" />
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

  // 기준 월: 앱 로드 시점의 "현재 달" 고정 (예: 2025-10)
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

  // 라벨
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
    return list; // 예: 현재가 10월이면 10,9,...,1
  }, [currentYm]);

  return (
    <div className="month-row" ref={ref} style={{ position: "relative" }}>
      <div className="month-left">
        <div className="h1">{label}</div>
        <button className="month-btn" aria-label="월 선택" onClick={() => setOpen(v => !v)}>
          <img className="icon" src="/public/chevron-right.svg" alt="월 선택" />
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

function App(): React.ReactElement {
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

export default App;
