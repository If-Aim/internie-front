import React from "react";
import { useNavigate } from "react-router-dom";
import { getAdminUsers, type AdminUser, ApiError } from "../../../../api/client";
import "./users.css";

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return "인증완료";
    case "PENDING":
      return "대기중";
    case "REJECTED":
      return "인증거절";
    default:
      return status;
  }
}

export default function AdminUsersPage(): React.ReactElement {
  const navigate = useNavigate();

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const approvedCount = users.filter((u) => u.status === "APPROVED").length;

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const list = await getAdminUsers();
        if (!mounted) return;
        setUsers(list);
      } catch (e) {
        if (!mounted) return;

        if (e instanceof ApiError && e.status === 403) {
          navigate("/student", { replace: true });
          return;
        }

        setErrorMsg("사용자 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="admin-users-page">
      <header className="admin-topbar">
        <div className="brand">
          <img src="/internie_Logo_thin.png" alt="internie" />
        </div>
        <div className="admin-info">
          <span>관리자 님</span>
          <div className="avatar" />
        </div>
      </header>

      <main className="admin-users-content single">
        <section className="users-left full">
          <div className="users-left-header">
            <h1>전체 사용자</h1>
            <div className="count">
              <span className="count-blue">{approvedCount}명</span>/{users.length}명
            </div>
          </div>

          <div className="users-list">
            {loading ? (
              <p className="loading">불러오는 중…</p>
            ) : errorMsg ? (
              <p className="error">{errorMsg}</p>
            ) : users.length === 0 ? (
              <p className="empty">등록된 사용자가 없습니다.</p>
            ) : (
              users.map((u, idx) => (
                <div key={u.userId} className="user-row readonly">
                  <div className="user-left">
                    <span className="index">{idx + 1}</span>
                    <span className="name">{u.name}</span>
                  </div>

                  <span className="school">{u.nickname ?? "-"}</span>

                  <span className={`status ${String(u.status).toLowerCase()}`}>
                    {statusLabel(u.status)}
                  </span>

                  <span className="role">
                    {u.role === "ROLE_ADMIN" ? "관리자" : "학생"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}