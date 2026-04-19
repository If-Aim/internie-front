// src/pages/admin/desktop/ecaClient/home.tsx
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import "./ecaClientAdmin.css";

function getDisplayAdminName(me: UserMe | null): string {
    if (!me) return "관리자";
    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();
    return nick || name || "관리자";
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;
    const lowered = url.toLowerCase();
    if (lowered.includes("default")) return true;
    return false;
}

export default function EcaClientAdminHome(): React.ReactElement{
    const [me, setMe] = React.useState<UserMe | null>(null);
    const { pathname } = useLocation();

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
    const adminProfileImg = isDefaultProfileImage(me?.profileImage)
        ? "/internie_mascot_normal.png"
        : (me?.profileImage ?? "/internie_mascot_normal.png");

    const isHomePage = pathname === "/eca-admin" || pathname === "/eca-admin/home";
    const isDashboardPage = pathname.startsWith("/eca-admin/dashboard");
    const isSettingsPage = pathname.startsWith("/eca-admin/settings");

    return (
        <div className="eca-client-admin-page">
            <header className="eca-client-admin-topbar">
                <div className="eca-client-admin-topbar-left">
                    <a href="https://www.internie.com/student" rel="noopener noreferrer">
                        <span className="eca-client-admin-logo">internie</span>
                    </a>
                </div>

                <nav className="eca-client-admin-topbar-tabs" aria-label="eca client admin tabs">
                    <NavLink
                        to="/eca-admin/home"
                        className={isHomePage ? "eca-client-admin-tab eca-client-admin-tab--active" : "eca-client-admin-tab"}
                    >
                        <span>홈</span>
                    </NavLink>

                    <NavLink
                        to="/eca-admin/dashboard"
                        className={isDashboardPage ? "eca-client-admin-tab eca-client-admin-tab--active" : "eca-client-admin-tab"}
                    >
                        <span>대시보드</span>
                    </NavLink>

                    <NavLink
                        to="/eca-admin/settings"
                        className={isSettingsPage ? "eca-client-admin-tab eca-client-admin-tab--active" : "eca-client-admin-tab"}
                    >
                        <span>설정</span>
                    </NavLink>
                </nav>

                <div className="eca-client-admin-topbar-right">
                    <span className="eca-client-admin-name">관리자 {adminName}님</span>
                    <img className="eca-client-admin-avatar-img" src={adminProfileImg} alt="admin avatar" />
                </div>
            </header>

            <main className="eca-client-admin-body">
                <div className="eca-client-admin-surface">
                    <Outlet />
                </div>
            </main>
        </div>
    );
} 
