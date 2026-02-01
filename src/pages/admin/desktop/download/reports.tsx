// src/pages/admin/desktop/download/reports.tsx
// 보고서 화면(탭)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers } from "../../../../api/client";
import "./reports.css";

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
          {/* 날짜는 일단 렌더링 x */}<p>사용자 목록</p>
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
                  
                  <span className="admin-chevron"><img src="/chevron-right.svg" alt="" /></span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 보고서 프리뷰 */}
      <section className="report-right">
        <div className="report-card">
          <div className="report-photo">
            <span>(보고서 사진 또는 파일?)</span>
          </div>

          {!selectedUser && <p className="admin-hint">목록에서 사용자를 선택해주세요.</p>}
        </div>
      </section>
    </div>
  );
}