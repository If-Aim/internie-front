// src/pages/admin/desktop/download/reports.tsx
// 보고서 화면(탭)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers } from "../../../../api/client";
import "./reports.css";

type CalCell = { key: string; day: number | null; dateStr: string | null };
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number) {
  // m: 1~12
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function buildMonthCells(year: number, month1to12: number): CalCell[] {
  // monthIndex: 0~11
  const monthIndex = month1to12 - 1;
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  // 스크린샷 기준: Mo Tu We Th Fr Sa Su (월요일 시작)
  // JS getDay(): 0=Sun..6=Sat  → 월요일 시작으로 변환
  const jsDow = first.getDay(); // 0..6
  const mondayStartOffset = (jsDow + 6) % 7; // Mon=0..Sun=6

  const cells: CalCell[] = [];

  // 앞쪽 빈 칸
  for (let i = 0; i < mondayStartOffset; i++) {
    cells.push({ key: `e-${year}-${month1to12}-${i}`, day: null, dateStr: null });
  }

  // 날짜 칸
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      key: `d-${year}-${month1to12}-${d}`,
      day: d,
      dateStr: ymd(year, month1to12, d),
    });
  }

  // 7의 배수로 맞추기(행 맞춤)
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t-${year}-${month1to12}-${cells.length}`, day: null, dateStr: null });
  }

  return cells;
}

function monthLabel(year: number, month1to12: number) {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${months[month1to12 - 1]} ${year}`;
}

function ReportCalendar(): React.ReactElement {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1); // 1~12

  const [selectedDate, setSelectedDate] = React.useState<string>(() =>
    ymd(today.getFullYear(), today.getMonth() + 1, today.getDate())
  );

  const cells = React.useMemo(() => buildMonthCells(year, month), [year, month]);

  function goPrev() {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }

  function goNext() {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }

  return (
    <div className="admin-cal-card">
      <div className="admin-cal-head">
        <div className="admin-cal-title">{monthLabel(year, month)}</div>
        <div className="admin-cal-nav">
          <button type="button" className="admin-cal-nav-btn" onClick={goPrev} aria-label="prev month">
            <img src="/Previous (Stroke).svg" alt="" />
          </button>
          <button type="button" className="admin-cal-nav-btn" onClick={goNext} aria-label="next month">
            <img src="/Next (Stroke).svg" alt="" />
          </button>
        </div>
      </div>

      <div className="admin-cal-dow">
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>

      <div className="admin-cal-grid" role="grid" aria-label="calendar">
        {cells.map((c) => {
          const isSelected = c.dateStr && c.dateStr === selectedDate;
          return (
            <button
              key={c.key}
              type="button"
              className={isSelected ? "admin-cal-cell admin-cal-cell--selected" : "admin-cal-cell"}
              disabled={c.day == null}
              onClick={() => c.dateStr && setSelectedDate(c.dateStr)}
            >
              {c.day ?? ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function displaySchoolOrNickname(u: AdminUser) {
  // 목업에서 학교명 자리가 필요하지만 현재 응답엔 school이 없음 → nickname을 우선 표시
  return (u.nickname ?? "").trim() || "-";
}

export default function AdminReportsPage(): React.ReactElement {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const selectedUser = React.useMemo(
    () => users.find((u) => u.userId === selectedId) ?? null,
    [users, selectedId]
  );

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const list = await getAdminUsers(); // 전체 사용자 목록 
        if (!mounted) return;

        setUsers(list);
        setSelectedId((prev) =>
          prev && list.some((u) => u.userId === prev) ? prev : list[0]?.userId ?? null
        );
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setErrorMsg("관리자 권한이 필요합니다.");
          return;
        }
        setErrorMsg("사용자 목록을 불러오지 못했습니다.");
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="admin-grid">
      {/* 목록 */}
      <section className="admin-col admin-col--left">
        <div className="admin-section-head">
          <div className="admin-section-title">사용자 목록</div>
        </div>

        <div className="admin-list">
          {loading ? (
            <p className="loading">불러오는 중…</p>
          ) : errorMsg ? (
            <p className="error">{errorMsg}</p>
          ) : users.length === 0 ? (
            <p className="empty">등록된 사용자가 없습니다.</p>
          ) : (
            users.map((u, idx) => {
              const isSelected = u.userId === selectedId;
              return (
                <button
                  key={u.userId}
                  type="button"
                  className={isSelected ? "admin-list-item admin-list-item--selected" : "admin-list-item"}
                  onClick={() => setSelectedId(u.userId)}
                >
                  <span className="admin-badge">{idx + 1}</span>
                  <span className="admin-user-name">{u.name}</span>
                  <span className="admin-user-school">{displaySchoolOrNickname(u)}</span>
                  <span className="admin-user-status-pill"></span>
                  <span className="admin-chevron"><img src="/chevron-right.svg" alt="" /></span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 보고서 프리뷰 */}
      <section className="admin-col admin-col--right">
        <div className="report-card">
          {!selectedUser ? (
            <p className="admin-hint">목록에서 사용자를 선택해주세요.</p>
          ) : (
            <ReportCalendar />
          )}
        </div>
      </section>
    </div>
  );
}