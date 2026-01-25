// src/pages/admin/desktop/list/users.tsx
// 사용자 목록 페이지 (PC)
import React from "react";
// import { useNavigate } from "react-router-dom";
import { ApiError, type AdminUser, getAdminUsers, approveAdminUser, rejectAdminUser } from "../../../../api/client";
import "./users.css";

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return "승인완료";
    case "PENDING":
      return "승인대기";
    case "REJECTED":
      return "승인거절";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "status--approved";
    case "PENDING":
      return "status--pending";
    case "REJECTED":
      return "status--rejected";
    default:
      return "status--etc";
  }
}

function displaySchoolOrNickname(u: AdminUser) {
  // 백엔드 응답에 school이 없어서, 기존 UI의 "학교" 자리에 닉네임 우선 표시(없으면 '-')
  return (u.nickname ?? "").trim() || "-";
}

export default function AdminUsersPage(): React.ReactElement {
  // const navigate = useNavigate();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const selectedUser = React.useMemo(
    () => users.find((u) => u.userId === selectedId) ?? null,
    [users, selectedId]
  );

  const totalCount = users.length;
  const approvedCount = users.filter((u) => u.status === "APPROVED").length;

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const list = await getAdminUsers(); 
        if (!mounted) return;

        setUsers(list);
        setSelectedId((prev) => (prev && list.some((u) => u.userId === prev) ? prev : list[0]?.userId ?? null));
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

  const patchUserInList = (updated: AdminUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u))
    );
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    if (actionLoading) return;
    if (selectedUser.status !== "PENDING") return; 

    setActionLoading(true);
    try {
      const updated = await approveAdminUser(selectedUser.userId);
      patchUserInList(updated); 
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) alert("사용자를 찾을 수 없습니다.");
        else if (e.status === 403) alert("접근 권한이 없습니다.");
        else alert("승인 처리에 실패했습니다.");
      } else {
        alert("승인 처리에 실패했습니다.");
      }
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    if (actionLoading) return;
    if (selectedUser.status !== "PENDING") return; 

    setActionLoading(true);
    try {
      const updated = await rejectAdminUser(selectedUser.userId);
      patchUserInList(updated); 
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) alert("사용자를 찾을 수 없습니다.");
        else if (e.status === 403) alert("접근 권한이 없습니다.");
        else alert("거절 처리에 실패했습니다.");
      } else {
        alert("거절 처리에 실패했습니다.");
      }
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // const handleReRequest = async () => {
  //   // 현재 백엔드 문서에 "재요청" API가 없으므로,
  //   // 일단 버튼만 두고 나중에 API가 생기면 연결
  //   
  // };

  // const canAct = !!selectedUser && selectedUser.status === "PENDING" && !actionLoading; 

  return (
    <div className="admin-grid">
      {/* 목록 */}
      <section className="admin-col admin-col--left">
        <div className="admin-section-head">
          <div className="admin-section-title">전체 사용자</div>

          <div className="admin-section-count">
            <span className="admin-count-strong">{approvedCount}명</span>
            <span className="admin-count-total">/{totalCount}명</span>
          </div>

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
                  <span className={`admin-user-status-pill ${statusClass(u.status)}`}>
                    {statusLabel(u.status)}
                  </span>
                  <span className="admin-chevron"><img className="admin-chevron" src="/Next (Stroke).svg" alt="admin avatar" /></span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 상세 */}
      <section className="admin-col admin-col--right">
        <div className="admin-detail-card">
          {!selectedUser ? (
            <div style={{ padding: 8, textAlign: "center", fontWeight: 700 }}>
              사용자를 선택해주세요.
            </div>
          ) : (
            <>
              <h2 className="admin-detail-name">{selectedUser.name}</h2>

              {/* 학생증 이미지 */}
              <div className="admin-detail-photo">
                {selectedUser.verificationImage ? (
                  <img
                    src={selectedUser.verificationImage}
                    alt="verification"
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                  />
                ) : (
                  <span>(학생증 사진 없음)</span>
                )}
              </div>

              <div className="admin-detail-actions">
                <button
                  className="admin-btn admin-btn--ghost"
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? "처리 중…" : "거절"}
                </button>

                <button
                  className="admin-btn admin-btn--primary"
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? "처리 중…" : "승인"}
                </button>
              </div>

              {/* 목업에 재요청, 승인 버튼만 있음. 추후 아래 주석 해제 */}
              {/* 
              <div className="admin-detail-actions" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <button className="admin-btn admin-btn--ghost" type="button" onClick={handleReRequest}>
                  재요청
                </button>
                <button className="admin-btn admin-btn--ghost" type="button" onClick={handleReject}>
                  거절
                </button>
                <button className="admin-btn admin-btn--primary" type="button" onClick={handleApprove}>
                  승인
                </button>
              </div>
              */}
            </>
          )}
        </div>
      </section>
    </div>
  );
}