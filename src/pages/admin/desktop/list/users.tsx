// src/pages/admin/desktop/list/users.tsx
// 유저 리스트
import React from "react";
import { getAdminUsers, type AdminUser, ApiError } from "../../../../api/client";
import "./users.css"

function formatKoreanDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(d);
}

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
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const selectedUser = users.find((u) => u.userId === selectedId) ?? null;
  const approvedCount = users.filter((u) => u.status === "APPROVED").length;

  React.useEffect(() => {
    (async () => {
      try {
        const list = await getAdminUsers();
        setUsers(list);
        if (list.length > 0) setSelectedId(list[0].userId);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setErrorMsg("관리자만 접근 가능합니다.");
        } else {
          setErrorMsg("사용자 목록 조회 실패");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="admin-users-page">
      {/* TopBar */}
      <header className="admin-topbar">
        <div className="brand">internie</div>
        <div className="admin-info">
          <span>관리자 님</span>
          <div className="avatar" />
        </div>
      </header>

      <main className="admin-users-content">
        {/* LEFT */}
        <section className="users-left">
          <div className="users-left-header">
            <h1>{formatKoreanDate(new Date())}</h1>
            <div className="count">
              <span className="count-blue">{approvedCount}명</span>
              /{users.length}명
            </div>
          </div>

          {errorMsg && <p className="error">{errorMsg}</p>}

          <div className="users-list">
            {loading ? (
              <p className="loading">불러오는 중…</p>
            ) : (
              users.map((u, idx) => (
                <button
                  key={u.userId}
                  className={`user-row ${u.userId === selectedId ? "active" : ""}`}
                  onClick={() => setSelectedId(u.userId)}
                >
                  <div className="user-left">
                    <span className="index">{idx + 1}</span>
                    <span className="name">{u.name}</span>
                  </div>

                  <span className="school">{u.nickname ?? "-"}</span>
                  <span className={`status ${u.status.toLowerCase()}`}>
                    {statusLabel(u.status)}
                  </span>
                  <span className="chevron">›</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* RIGHT */}
        <section className="users-right">
          <h2 className="detail-name">{selectedUser?.name ?? "이름"}</h2>

          <div className="image-box">
            {selectedUser?.verificationImage ? (
              <img src={selectedUser.verificationImage} alt="학생증" />
            ) : (
              <span className="placeholder">(학생증 사진)</span>
            )}
          </div>

          <div className="actions">
            <button className="btn ghost">재요청</button>
            <button className="btn primary">승인</button>
          </div>
        </section>
      </main>
    </div>
  );
}