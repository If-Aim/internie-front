// src/pages/student/home.tsx
import { useTranslation } from "react-i18next";

import React from "react";
import { useNavigate } from "react-router-dom";
import { api, getUserMe } from "../../api/client";

import "../../App.css"; 

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
  e: {
    id: string | number;
    title: string;
    content?: string;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
  },
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
      eventDayId: null,
    });
  }
  return out;
}
function formatDateYmdLocale(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}
function dateLabel(
  iso: string,
  locale: string,
  t: (k: string, opts?: any) => string
): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();

  const same =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const dayNum = d.getDate();
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);

  return same
    ? t("home.date.today", { day: dayNum })
    : t("home.date.weekday", { day: dayNum, weekday });
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
function isAllDayTime(startTime?: string | null, endTime?: string | null): boolean {
  if (!startTime || !endTime) return false;
  const s = startTime.slice(0, 5);
  const e = endTime.slice(0, 5);
  return s === "00:00" && (e === "24:00" || e === "23:59");
}
function timeRangeText(
  startTime?: string | null,
  endTime?: string | null,
  t?: (key: string, opts?: any) => string
): string {
  if (!startTime || !endTime) return "";
  if (isAllDayTime(startTime, endTime)) return t ? t("common.allDay") : "All day";
  return `${hhmm(startTime)}–${hhmm(endTime)}`;
}

type HeaderProps = {
  onMenuClick: () => void;
  onAddClick: () => void;
};
function Header({ onMenuClick, onAddClick }: HeaderProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="topbar topbar-main">
      <button className="iconbtn" aria-label={t("common.menu")} onClick={onMenuClick}>
        <img className="icon" src="/menu-01.svg" alt={t("common.menu")} />
      </button>

      <div className="app-title">internie</div>

      <button className="iconbtn" aria-label={t("common.add")} onClick={onAddClick}>
        <img className="icon" src="/plus-01.svg" alt={t("common.add")} />
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
function SideMenu({ isOpen, onClose, userName, userProfileImg }: SideMenuProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

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
    const passedThreshold = progress < 0.6;

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
      <div
        className="drawer-backdrop"
        onClick={() => {
          if (!canInteract) return;
          closeWithSnap();
        }}
        aria-hidden="true"
        style={{
          opacity: openProgress,
          pointerEvents: canInteract ? "auto" : "none",
          transition: dragging ? "none" : "opacity 220ms ease",
        }}
      />
      <div
        ref={panelRef}
        className="drawer-panel"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging
            ? "none"
            : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: canInteract ? "auto" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
      >
        <div className="drawer-header">
          <div className="profile-wrap">
            <img src={userProfileImg} alt={t("menu.profile")} className="profile-img" />
            <div className="profile-info">
              <div className="name">{userName}</div>
            </div>
          </div>
        </div>

        <div className="drawer-body">
          <button className="drawer-menu-item" onClick={() => { navigate("/student/mypage");  closeWithSnap(); }} >
            <img className="icon" src="/user-profile-02.svg" alt={t("menu.mypage")} />{" "}
            <span>{t("menu.mypage")}</span>
          </button>
          <button className="drawer-menu-item" onClick={() => {}}>
            <img className="icon" src="/arrow-refresh-01.svg" alt={t("menu.recent")} />{" "}
            <span>{t("menu.recent")}</span>
          </button>
          <button className="drawer-menu-item" onClick={() => {}}>
            <img className="icon" src="/settings.svg" alt={t("menu.settings")} />{" "}
            <span>{t("menu.settings")}</span>
          </button>
        </div>
      </div>
    </>
  );
}

type MonthHeaderProps = { value: string; onChange: (ym: string) => void };
function MonthHeader({ value, onChange }: MonthHeaderProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const label = React.useMemo(() => {
    const [yy, mm] = value.split("-").map(Number);
    const d = new Date(yy, mm - 1, 1);
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
  }, [value, locale]);

  const months = React.useMemo(() => {
    const base = new Date();
    base.setDate(1);

    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    const list: { ym: string; text: string }[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      const text = fmt.format(d);
      list.push({ ym, text });
    }
    return list;
  }, [locale]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="month-row" ref={ref} style={{ position: "relative" }}>
      <div className="month-left">
        <div className="h1">{label}</div>
        <button
          className="month-btn"
          aria-label={t("calendar.selectMonth")}
          onClick={() => setOpen((v) => !v)}
        >
          <img className="icon" src="/chevron-right.svg" alt={t("calendar.selectMonth")} />
        </button>
      </div>

      {open && (
        <div
          className="month-pop"
          role="menu"
          aria-label={t("calendar.selectMonth")}
          style={{ left: 0, top: "100%", marginTop: 8 }}
        >
          <div className="month-menu">
            {months.map((m) => (
              <button
                key={m.ym}
                className="month-item"
                aria-current={m.ym === value ? "true" : undefined}
                onClick={() => {
                  onChange(m.ym);
                  setOpen(false);
                }}
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

type EmptyStateProps = { onAddClick: () => void };
function EmptyState({}: EmptyStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <img className="empty-illust" src="/internie_mascot_normal.png" alt="" />
      <p className="empty-sub">
        {t("empty.title")}
        <br />
        {t("empty.subtitle")}
      </p>
      <button type="button" className="empty-sync" onClick={() => {}}>
        {t("empty.sync")}
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
function EventCard({
  title,
  subtitle,
  selected,
  locked,
  onClick,
  onEditClick,
}: EventCardProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <article
      className={"card" + (selected ? " card--selected" : "") + (locked ? " card-locked" : "")}
      onClick={onClick}
      style={{ position: "relative", cursor: "pointer" }}
      aria-disabled={locked ? "true" : undefined}
    >
      <div className="item">
        <div className={"thumb" + (selected || locked ? " thumb--selected" : "")} />
        <div>
          <div className="title">{title}</div>
          <div className="subtitle">{subtitle}</div>
        </div>
      </div>

      <button
        type="button"
        className="card-edit-btn"
        aria-label={t("schedule.edit")}
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
      >
        <img
          className="icon"
          src="/chevron-right.svg"
          alt={t("schedule.edit")}
          style={{ transform: "rotate(-90deg)" }}
        />
      </button>
    </article>
  );
}

type EventModalProps = {
  item: ScheduleItem;
  onClose: () => void;
  onRecord: () => void;
};
function EventModal({ item, onClose, onRecord }: EventModalProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const dateText = formatDateYmdLocale(item.date, i18n.language === "en" ? "en-US" : "ko-KR");

  return (
    <div className="event-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="event-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="event-modal-header">
          <div>
            <div className="event-modal-title">{item.title}</div>
            <div className="event-modal-date">{dateText}</div>
          </div>
          <button type="button" className="event-modal-close" aria-label={t("common.close")} onClick={onClose}>
            <img className="icon" alt="" src="/x-01.svg" />
          </button>
        </header>

        <main className="event-modal-body">
          <p className="event-modal-text">
            {t("modal.desc1")}
            <br />
            {t("modal.desc2")}
          </p>

          <div className="event-modal-cards">
            <div className="event-modal-card-placeholder" />
            <div className="event-modal-card-placeholder" />
          </div>
        </main>

        <footer className="event-modal-footer">
          <button type="button" className="event-modal-primary" onClick={onRecord}>
            {t("common.record")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Home(): React.ReactElement {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = React.useState<string>(currentMonth);
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const [items, setItems] = React.useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);

  const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) (g[it.date] ??= []).push(it);
    return Object.entries(g).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const hasItems = byDate.length > 0;
  const pendingUpdatedEventRef = React.useRef<any>(null);
  const isSelectedLocked = !!selectedItem?.isLocked;

  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [userName, setUserName] = React.useState<string>("User");
  const [userProfileImg, setUserProfileImg] = React.useState<string>(
    "/internie_mascot_normal.png"
  );

  React.useEffect(() => {
    (async () => {
      try {
        const me = await getUserMe();
        setCurrentUserId(me.userId);
        setUserName(me.name ?? "User");
        setUserProfileImg(me.profileImage ?? "/internie_mascot_normal.png");
      } catch (e) {
        console.error("getUserMe failed:", e);
        setCurrentUserId(null);
        setUserName("User");
        setUserProfileImg("/internie_mascot_normal.png");
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const [y, m] = month.split("-");

        const [eventsData, eventDaysData] = await Promise.all([
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

          const serverHasLatest = rawList.some(
            (e: any) =>
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
  }, [month]);

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
      navigate(`/student/schedule/${newEventDayId}/questions`); // 이후 /student/...로 변경 예정
    } catch (error) {
      alert(t("error.record"));
    }
  };

  const canRecord = !!selectedItem && !isSelectedLocked;

  return (
    <>
      <Header onMenuClick={() => setMenuOpen(true)} onAddClick={() => navigate("/student/schedule/new")} />
      <div className={`wrap ${isMenuOpen ? "lock-scroll" : ""}`}>
        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setMenuOpen(false)}
          userId={currentUserId}
          userName={userName}
          userProfileImg={userProfileImg}
        />

        <div className="row" style={{ marginTop: 18 }}>
          <MonthHeader value={month} onChange={setMonth} />
        </div>

        {hasItems ? (
          byDate.map(([date, arr]) => (
            <section key={date} style={{ marginTop: "19px", marginBottom: "27px" }}>
              <h2
                className="h2"
                style={{
                  fontSize: "16px",
                  color: "#979797",
                  fontWeight: 500,
                  lineHeight: "20px",
                  marginBottom: "13px",
                }}
              >
                {dateLabel(date, i18n.language === "en" ? "en-US" : "ko-KR", t)}
              </h2>

              {arr.map((it) => {
                const locked = !!it.isLocked;
                return (
                  <EventCard
                    key={it.instanceId}
                    title={it.title}
                    subtitle={timeRangeText(it.startTime, it.endTime, t)}
                    selected={selectedItem?.instanceId === it.instanceId}
                    locked={locked}
                    onClick={() => setSelectedItem((prev) => (prev?.instanceId === it.instanceId ? null : it))}
                    onEditClick={() =>
                      navigate(`/student/schedule/${it.eventId}`, {
                        state: {
                          event: {
                            id: it.eventId,
                            eventDayId: it.eventDayId ?? null,
                            transcriptionCount: it.transcriptionCount ?? 0,
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
          <EmptyState onAddClick={() => navigate("/student/schedule/new")} />
        )}

        <div className="bottom-spacer" />

        {isRecordModalOpen && selectedItem && (
          <EventModal item={selectedItem} onClose={() => setSelectedItem(null)} onRecord={handleRecord} />
        )}

        {hasItems && (
          <div className="bottom-cta">
            <button
              type="button"
              className={`record-btn ${canRecord ? "enabled" : ""}`}
              disabled={!canRecord}
              onClick={() => {
                if (!canRecord) return;
                setIsRecordModalOpen(true);
              }}
            >
              {t("common.record")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Home;
