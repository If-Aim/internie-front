// src/pages/admin/desktop/jump/home.tsx
// 점프 관리자 페이지 메인 (PC)
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import "./jumpAdmin.css";

function getDisplayAdminName(me: UserMe | null): string {
  if (!me) return "관리자";
  const nick = (me.nickname ?? "").trim();
  const name = (me.name ?? "").trim();
  return nick || name || "관리자";
}

export default function JumpAdminHome(): React.ReactElement {
  const [me, setMe] = React.useState<UserMe | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getUserMe();
        if (!mounted) return;
        setMe(data);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          if (mounted) setMe(null);
          return;
        }
        console.error(e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const adminName = getDisplayAdminName(me);

  return (
    <div className="jump-admin-page">
      <header className="jump-admin-topbar">
        <div className="jump-admin-topbar-left">
          <img className="jump-admin-logo" src="/internie_Logo_thin.png" alt="internie" />
        </div>

        <nav className="jump-admin-topbar-tabs" aria-label="admin tabs">
          <NavLink
            to="/jump-admin/reports"
            className={({ isActive }) => (isActive ? "jump-admin-tab jump-admin-tab--active" : "jump-admin-tab")}
          >
            <span>기록 열람</span>
          </NavLink>
          <NavLink
            to="/jump-admin/analysis"
            className={({ isActive }) => (isActive ? "jump-admin-tab jump-admin-tab--active" : "jump-admin-tab")}
          >
            <span>역량분석</span>
          </NavLink>
        </nav>

        <div className="jump-admin-topbar-right">
          <span className="jump-admin-name">관리자 {adminName}님</span>

          {me?.profileImage ? (
            <img className="jump-admin-avatar-img" src={me.profileImage} alt="admin avatar" />
          ) : (
            <div className="jump-admin-avatar" aria-label="admin avatar" />
          )}
        </div>
      </header>

      <div className="jump-admin-body">
        <div className="jump-admin-surface">
          <Outlet />
        </div>
      </div>
    </div>
  );
}