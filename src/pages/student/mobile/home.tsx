// src/pages/student/home.tsx
import { useTranslation } from "react-i18next";

import React from "react";
import { useNavigate } from "react-router-dom";
import { api, getUserMe } from "../../../api/client";

import "../../../App.css"; 

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

type MonthFilterSheetProps = {
  open: boolean;
  valueYm: string;
  sortOrder: "past" | "latest";
  onClose: () => void;
  onApply: (nextYm: string, nextSort: "past" | "latest") => void;
};

type SortOrder = "past" | "latest";
type SheetView = "main" | "monthPicker";

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
  const weekdayFormat: Intl.DateTimeFormatOptions["weekday"] = locale.startsWith("ko") ? "long" : "short";
  const weekday = new Intl.DateTimeFormat(locale, { weekday: weekdayFormat, }).format(d);
  
  return same
    ? t("home.date.today", { day: dayNum })
    : t("home.date.weekday", { day: dayNum, weekday });
}
function ymToDisplayWithLang(ym: string, lang: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);

  if (lang.startsWith("ko")) {
    return `${y}.${String(m).padStart(2, "0")}.`;
  }
  // 영어는 "Oct 2025"
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d);
}
/*시간 관련 함수*/
function hhmm(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
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

function MonthFilterSheet({
  open,
  valueYm,
  sortOrder,
  onClose,
  onApply,
}: MonthFilterSheetProps) {
  const { t, i18n } = useTranslation();
  const [tmpYm, setTmpYm] = React.useState(valueYm);
  const [tmpSort, setTmpSort] = React.useState<"past" | "latest">(sortOrder);
  const [view, setView] = React.useState<SheetView>("main");
  const [pickerYm, setPickerYm] = React.useState(tmpYm);

  React.useEffect(() => {
    if (open) {
      setTmpYm(valueYm);
      setTmpSort(sortOrder);
      setView("main");
      setPickerYm(valueYm);
    }
  }, [open, valueYm, sortOrder]);

  React.useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      const y = Math.abs(parseInt(document.body.style.top || "0", 10));
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, y);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="period-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="period-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`period-sheet-pages ${view === "monthPicker" ? "to-picker" : ""}`}>
          {/* 조회 화면 */}
          <div className="period-sheet-page">
            <div className="period-sheet-header">
              <div className="period-sheet-title">{t("filter.title")}</div>
              <button className="period-sheet-close" onClick={onClose} aria-label={t("common.close")}>
                <img className="icon" alt="" src="/x-01.svg" />
              </button>
            </div>

            <div className="period-sheet-body">
              <div className="period-sheet-section">
                <div className="period-sheet-label">{t("filter.period")}</div>

                <label className="month-input">
                  <div className="month-input-text">{ymToDisplayWithLang(tmpYm, i18n.language)}</div>
                  <button type="button" className="month-icon-btn" aria-label={t("filter.period")} onClick={() => {setPickerYm(tmpYm); setView("monthPicker");}}><img className="month-input-icon" src="/calendar-07.svg" alt="" /></button>
                  <input className="month-input-native" type="month" value={tmpYm} onChange={(e) => setTmpYm(e.target.value)} aria-label="month" />
                </label>
              </div>

              <div className="period-sheet-section">
                <div className="period-sheet-label">{t("filter.sort")}</div>

                <div className="sort-row">
                  <button
                    type="button"
                    className={`sort-btn ${tmpSort === "past" ? "active" : ""}`}
                    onClick={() => setTmpSort("past")}
                  >
                    {t("filter.sortPast")}
                  </button>
                  <button
                    type="button"
                    className={`sort-btn ${tmpSort === "latest" ? "active" : ""}`}
                    onClick={() => setTmpSort("latest")}
                  >
                    {t("filter.sortLatest")}
                  </button>
                </div>
              </div>
            </div>

            <div className="period-sheet-footer">
              <button type="button" className="period-sheet-apply" onClick={() => onApply(tmpYm, tmpSort)} > {t("filter.apply")} </button>
            </div>
          </div>
          {/* month 선택 화면 */}
          <div className="period-sheet-page">
            <div className="period-sheet-picker-header">
              <button
                type="button"
                className="period-sheet-picker-back"
                aria-label="back"
                onClick={() => setView("main")}
              >
                <img src="/chevron-right.svg" alt="" className="period-sheet-picker-back-icon"/>
              </button>

              {/* 연도 변경 기능은 비워둠 */}
              <div className="period-sheet-picker-year">
                {pickerYm.split("-")[0]}{i18n.language.startsWith("ko") ? "년" : ""}
              </div>

              <button
                type="button"
                className="period-sheet-picker-close"
                aria-label={t("common.close")}
                onClick={onClose}
              >
                <img className="icon" alt="" src="/x-01.svg" />
              </button>
            </div>

            <div className="period-sheet-picker-body">
              <MonthWheelPicker
                ym={pickerYm}
                lang={i18n.language}
                onChange={(nextYm) => setPickerYm(nextYm)}
                minYear={2010}
                maxYear={2030}
              />
            </div>

            <div className="period-sheet-picker-footer">
              <button type="button" className="period-sheet-picker-confirm" onClick={() => {setTmpYm(pickerYm); setView("main");}}> {t("filter.confirm")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthLabel(m: number, lang: string) {
  if (lang.startsWith("ko")) return `${m}월`;
  const d = new Date(2025, m - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(d);
}

function MonthWheelPicker({
  ym,
  lang,
  onChange,
  minYear,
  maxYear,
}: {
  ym: string;
  lang: string;
  onChange: (nextYm: string) => void;
  minYear: number;
  maxYear: number;
}) {
  const PAD_ITEMS = 2;
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const [itemH, setItemH] = React.useState(64);
  React.useEffect(() => {
    if (!itemRef.current) return;
    const h = itemRef.current.offsetHeight;
    if (h > 0) setItemH(h);
  }, []);
  const years = React.useMemo(() => {
    const out: number[] = [];
    for (let y = minYear; y <= maxYear; y++) out.push(y);
    return out;
  }, [minYear, maxYear]);

  const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const [yStr, mStr] = ym.split("-");
  const selectedYear = Number(yStr);
  const selectedMonth = Number(mStr);

  const yearRef = React.useRef<HTMLDivElement | null>(null);
  const monthRef = React.useRef<HTMLDivElement | null>(null);
  const lockRef = React.useRef(false);
  const centerOffset = (el: HTMLDivElement) => (el.clientHeight - itemH) / 2;

  const setWheelToValue = React.useCallback(() => {
    const yIdx = clamp(years.indexOf(selectedYear), 0, years.length - 1);
    const mIdx = clamp(selectedMonth - 1, 0, 11);

    const yEl = yearRef.current;
    const mEl = monthRef.current;
    if (!yEl || !mEl) return;

    const yTop = (yIdx + PAD_ITEMS) * itemH - centerOffset(yEl);
    const mTop = (mIdx + PAD_ITEMS) * itemH - centerOffset(mEl);

    yEl.scrollTop = yTop;
    mEl.scrollTop = mTop;
  }, [years, selectedYear, selectedMonth, itemH]);

  React.useEffect(() => {
    // 열린 직후/값 변경 시 휠 위치 맞추기
    setWheelToValue();
  }, [setWheelToValue]);

  const pickFromScroll = React.useCallback(
    (kind: "year" | "month") => {
      if (lockRef.current) return;

      const el = kind === "year" ? yearRef.current : monthRef.current;
      if (!el) return;

      const idxWithPads = Math.round((el.scrollTop + centerOffset(el)) / itemH);
      const rawIndex = idxWithPads - PAD_ITEMS;

      if (kind === "year") {
        const idx = clamp(rawIndex, 0, years.length - 1);
        const nextY = years[idx];
        const nextYm = `${nextY}-${pad2(selectedMonth)}`;
        onChange(nextYm);
      } else {
        const idx = clamp(rawIndex, 0, 11);
        const nextM = idx + 1;
        const nextYm = `${selectedYear}-${pad2(nextM)}`;
        onChange(nextYm);
      }
    },
    [itemH, PAD_ITEMS, years, selectedYear, selectedMonth, onChange]
  );

  const onYearScroll = () => pickFromScroll("year");
  const onMonthScroll = () => pickFromScroll("month");

  const onSnapEnd = React.useCallback(() => {
    lockRef.current = true;
    try {
      setWheelToValue();
    } finally {
      window.setTimeout(() => {
        lockRef.current = false;
      }, 0);
    }
  }, [setWheelToValue]);

  return (
    <div className="wheel-wrap" style={{ ["--wheel-item-h" as any]: `${itemH}px` }}>
      <div className="wheel-col">
        <div
          ref={yearRef}
          className="wheel"
          onScroll={onYearScroll}
          onPointerUp={onSnapEnd}
          onTouchEnd={onSnapEnd}
        >
          {Array.from({ length: PAD_ITEMS }).map((_, i) => (
            <div key={`y_pad_top_${i}`} className="wheel-item wheel-pad" />
          ))}
          {years.map((y, idx) => {
            const active = y === selectedYear;
            return (
              <div key={y} ref={idx === 0 ? itemRef : null} className={`wheel-item ${active ? "active" : ""}`}>
                {y}
                {lang.startsWith("ko") ? "년" : ""}
              </div>
            );
          })}
          {Array.from({ length: PAD_ITEMS }).map((_, i) => (
            <div key={`y_pad_bot_${i}`} className="wheel-item wheel-pad" />
          ))}
        </div>
      </div>

      <div className="wheel-col">
        <div
          ref={monthRef}
          className="wheel"
          onScroll={onMonthScroll}
          onPointerUp={onSnapEnd}
          onTouchEnd={onSnapEnd}
        >
          {Array.from({ length: PAD_ITEMS }).map((_, i) => (
            <div key={`m_pad_top_${i}`} className="wheel-item wheel-pad" />
          ))}
          {months.map((m) => {
            const active = m === selectedMonth;
            return (
              <div key={m} className={`wheel-item ${active ? "active" : ""}`}>
                {monthLabel(m, lang)}
              </div>
            );
          })}
          {Array.from({ length: PAD_ITEMS }).map((_, i) => (
            <div key={`m_pad_bot_${i}`} className="wheel-item wheel-pad" />
          ))}
        </div>
      </div>

      {/* 가운데 선택 라인/하이라이트 */}
      <div className="wheel-highlight" aria-hidden="true" />
      {/* 위/아래 그라데이션 마스크 */}
      <div className="wheel-fade wheel-fade-top" aria-hidden="true" />
      <div className="wheel-fade wheel-fade-bottom" aria-hidden="true" />
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

type MonthHeaderProps = { value: string; onOpen: () => void;};
function MonthHeader({ value, onOpen }: MonthHeaderProps) {
  const { t, i18n } = useTranslation();

  const locale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const label = React.useMemo(() => {
    const [yy, mm] = value.split("-").map(Number);
    const d = new Date(yy, mm - 1, 1);
    if (i18n.language.startsWith("ko")) return `${mm}월`;
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
  }, [value, locale, i18n.language]);
  return (
    <div className="month-row" style={{ position: "relative" }}>
      <div className="month-left">
        <div className="h1">{label}</div>
        <button
          className="month-btn"
          aria-label={t("calendar.selectMonth")}
          onClick={onOpen}
        >
          <img className="icon" src="/chevron-right.svg" alt={t("calendar.selectMonth")} />
        </button>
      </div>
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
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("latest");
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const [items, setItems] = React.useState<ScheduleItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<ScheduleItem | null>(null);

  const byDate = React.useMemo<[string, ScheduleItem[]][]>(() => {
    const g: Record<string, ScheduleItem[]> = {};
    for (const it of items) (g[it.date] ??= []).push(it);
    const entries = Object.entries(g);
    entries.sort((a, b) => {
      if (sortOrder === "latest") return a[0] < b[0] ? 1 : -1;
      return a[0] < b[0] ? -1 : 1;
    });
    return entries;
  }, [items, sortOrder]);

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
      navigate(`/student/schedule/${newEventDayId}/questions`);
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
          <MonthHeader value={month} onOpen={() => setIsFilterOpen(true)} />
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

        <MonthFilterSheet
          open={isFilterOpen}
          valueYm={month}
          sortOrder={sortOrder}
          onClose={() => setIsFilterOpen(false)}
          onApply={(nextYm, nextSort) => {
            setMonth(nextYm);
            setSortOrder(nextSort);
            setIsFilterOpen(false);
          }}
        />

      </div>
    </>
  );
}

export default Home;
