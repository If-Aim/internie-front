// src/pages/admin/mobile/client/home.tsx
// 고객사 관리자 모바일 메인
import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";

function getDisplayAdminName(me: UserMe | null, fallback: string): string {
    if (!me) return fallback;

    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();

    return nick || name || fallback;
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;
    return url.toLowerCase().includes("default");
}

export default function ClientAdminHomeMobile(): React.ReactElement {
    const { t } = useTranslation();
    const { clientType } = useParams<{ clientType: string }>();
    const [me, setMe] = React.useState<UserMe | null>(null);
    const basePath = clientType ? `/admin/${clientType}` : "/admin/jump";

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

    const adminName = getDisplayAdminName(me, t("clientAdmin.defaultAdminName"));
    const adminProfileImg = isDefaultProfileImage(me?.profileImage) ? "/internie_mascot_normal.png" : (me?.profileImage ?? "/internie_mascot_normal.png");
    const clientName = clientType === "kakao" ? t("clientAdmin.kakaoClientName") : clientType === "jump" ? t("clientAdmin.jumpClientName") : t("clientAdmin.defaultClientName");

    return (
        <div className="client-mobile-admin-page">
            <header className="client-mobile-admin-topbar">
                <div className="client-mobile-admin-mainbar">
                    <a href="https://www.internie.com/student" rel="noopener noreferrer" className="client-mobile-admin-logo-link">
                        <img className="client-mobile-admin-logo" src="/logos/internie_Logo_thin.png" alt="internie" />
                    </a>

                    <div className="client-mobile-admin-profile">
                        <div className="client-mobile-admin-profile-text">
                            <span>{t("clientAdmin.adminLabel", { name: adminName })}</span>
                            <strong>{clientName}</strong>
                        </div>
                        <img className="client-mobile-admin-avatar" src={adminProfileImg} alt="admin avatar" />
                    </div>
                </div>

                <nav className="client-mobile-admin-tabs" aria-label="client admin tabs">
                    <NavLink to={`${basePath}/dashboard`} className={({ isActive }) => (isActive ? "client-mobile-admin-tab client-mobile-admin-tab--active" : "client-mobile-admin-tab")}>
                        {t("clientAdmin.dashboard")}
                    </NavLink>
                    <NavLink to={`${basePath}/analysis`} className={({ isActive }) => (isActive ? "client-mobile-admin-tab client-mobile-admin-tab--active" : "client-mobile-admin-tab")}>
                        {t("clientAdmin.analysis")}
                    </NavLink>
                    <NavLink
                        to={`${basePath}/analysis`}
                        className="client-mobile-admin-tab client-mobile-admin-tab--disabled"
                        onClick={(event) => {
                            event.preventDefault();
                            alert(t("clientAdmin.comingSoon"));
                        }}
                    >
                        {t("clientAdmin.settings")}
                    </NavLink>
                </nav>
            </header>

            <main className="client-mobile-admin-body">
                <div className="client-mobile-admin-surface">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
