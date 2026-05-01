// src/pages/admin/desktop/ecaClient/ecaHome.tsx
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, getUserMe, getMyManagedExternalActivities, type UserMe, type ExternalActivityResponse, } from "../../../../api/client"; 
import "./ecaClientAdmin.css";

type ManagedActivity = {
    id: number;
    title: string;
};

function toManagedActivity(activity: ExternalActivityResponse): ManagedActivity {
    return {
        id: activity.externalActivityId,
        title: activity.name,
    };
}

function getDisplayAdminName(me: UserMe | null): string {
    if (!me) return "이름";
    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();
    return nick || name || "";
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;
    return url.toLowerCase().includes("default");
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

    const [openedActivityId, setOpenedActivityId] = React.useState<number | null>(null);
    const [managedActivities, setManagedActivities] = React.useState<ManagedActivity[]>([]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await getMyManagedExternalActivities();
                if (!mounted) return;
                setManagedActivities(data.map(toManagedActivity));
            } catch (e) {
                console.error(e);
                if (mounted) {
                    setManagedActivities([]);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    function handleServicePreparing() {
		alert("서비스 준비중입니다.");
	}
    return (
        <div className="eca-client-admin-page">
            <aside className="eca-client-admin-sidebar">
                <div className="eca-client-admin-sidebar-logo-wrap">
                    <a href="https://www.internie.com/student" rel="noopener noreferrer">
                        <span className="eca-client-admin-logo">internie</span>
                    </a>
                </div>

                <NavLink to="/eca-admin/home" className={({ isActive }) => isActive ? "eca-client-admin-menu-item eca-client-admin-menu-item--active" : "eca-client-admin-menu-item"}>
                    <span className="eca-client-admin-sidebar-menu-value">홈</span>
                </NavLink>

                <div className="eca-client-admin-activity-list">
                    {managedActivities.length === 0 ? (
                        <span className="eca-client-admin-submenu-empty">담당 대외활동이 없습니다</span>
                    ) : (
                        managedActivities.map((activity) => {
                            const isOpen = openedActivityId === activity.id;
                            const isActivityActive = pathname.startsWith(`/eca-admin/activities/${activity.id}/dashboard`);
                                // 추후 하위 메뉴 API 연결 시 아래 경로도 active 조건에 추가
                                // pathname.startsWith(`/eca-admin/activities/${activity.id}/assignments`)
                                // pathname.startsWith(`/eca-admin/activities/${activity.id}/attendance`)
                                // pathname.startsWith(`/eca-admin/activities/${activity.id}/team`)

                            return (
                                <div className="eca-client-admin-menu-group" key={activity.id}>
                                    <button
                                        type="button"
                                        className={isActivityActive ? "eca-client-admin-menu-item eca-client-admin-menu-item--active eca-client-admin-menu-item--with-arrow" : "eca-client-admin-menu-item eca-client-admin-menu-item--with-arrow"}
                                        onClick={() => setOpenedActivityId((prev) => prev === activity.id ? null : activity.id)}
                                    >
                                        <img
                                            className={isOpen ? "eca-client-admin-chevron eca-client-admin-chevron--open" : "eca-client-admin-chevron"}
                                            src="/icons/chevron-right-80.svg"
                                            alt=""
                                        />
                                        <span>{activity.title}</span>
                                    </button>

                                    {isOpen ? (
                                        <div className="eca-client-admin-submenu">
                                            <NavLink
                                                to={`/eca-admin/activities/${activity.id}/dashboard`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                            >
                                                대시보드
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activity.id}/assignments`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                            >
                                                과제 제출 현황
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activity.id}/attendance`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                                onClick={handleServicePreparing}
                                            >
                                                출석 현황
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activity.id}/team-activity`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                            >
                                                팀 활동
                                            </NavLink>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="eca-client-admin-sidebar-profile">
                    <img className="eca-client-admin-avatar-img" src={adminProfileImg} alt="admin avatar" />
                    <span className="eca-client-admin-name">관리자 {adminName}님</span>
                </div>
            </aside>

            <main className="eca-client-admin-body">
                <div className="eca-client-admin-surface">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}