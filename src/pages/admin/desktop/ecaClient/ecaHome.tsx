// src/pages/admin/desktop/ecaClient/ecaHome.tsx
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, getUserMe, } from "../../../../api/client";
import { getMyManagedExternalActivities } from "../../../../api/ea";
import { getMyOrganizations } from "../../../../api/organizationClient";
import type { UserMe,} from "../../../../api/client";
import type { ExternalActivityResponse } from "../../../../api/ea";
import type { MyOrganizationResponse } from "../../../../api/organizationClient";
import "./ecaClientAdmin.css";

const SELECTED_ORGANIZATION_STORAGE_KEY = "eca.selectedOrganizationId";

export type EcaClientAdminOutletContext = {
    me: UserMe | null;
    organizations: MyOrganizationResponse[];
    organization: MyOrganizationResponse | null;
    selectedOrganizationId: number | null;
    organizationLoading: boolean;
    managedActivities: ExternalActivityResponse[];
    setSelectedOrganizationId: React.Dispatch<React.SetStateAction<number | null>>;
    refreshManagedActivities: () => Promise<void>;
};

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
    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<number | null>(() => {
        const saved = sessionStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY);
        const parsed = saved ? Number(saved) : NaN;

        return Number.isFinite(parsed) ? parsed : null;
    });
    const [organizationLoading, setOrganizationLoading] = React.useState(false);

    const organization = React.useMemo(() => {
        return organizations.find((item) => item.organizationId === selectedOrganizationId) ?? null;
    }, [organizations, selectedOrganizationId]);
    const { pathname } = useLocation();

    React.useEffect(() => {
        if (selectedOrganizationId) {
            sessionStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, String(selectedOrganizationId));
            return;
        }

        sessionStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY);
    }, [selectedOrganizationId]);

    React.useEffect(() => {
        setOpenedActivityIds([]);
    }, [selectedOrganizationId]);

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

    React.useEffect(() => {
        let mounted = true;

        async function fetchOrganizations(): Promise<void> {
            setOrganizationLoading(true);

            try {
                const data = await getMyOrganizations();

                if (!mounted) return;

                setOrganizations(data);
                setSelectedOrganizationId((prev) => {
                    if (prev && data.some((item) => item.organizationId === prev)) {
                        return prev;
                    }

                    return data[0]?.organizationId ?? null;
                });
            } catch (e) {
                console.error(e);

                if (mounted) {
                    setOrganizations([]);
                    setSelectedOrganizationId(null);
                }
            } finally {
                if (mounted) {
                    setOrganizationLoading(false);
                }
            }
        }

        void fetchOrganizations();

        return () => {
            mounted = false;
        };
    }, []);

    const adminName = getDisplayAdminName(me);
    const adminProfileImg = isDefaultProfileImage(me?.profileImage)
        ? "/internie_mascot_normal.png"
        : (me?.profileImage ?? "/internie_mascot_normal.png");

    const [openedActivityIds, setOpenedActivityIds] = React.useState<number[]>([]);
    const [managedActivities, setManagedActivities] = React.useState<ExternalActivityResponse[]>([]);

    const refreshManagedActivities = React.useCallback(async (): Promise<void> => {
        if (!selectedOrganizationId) {
            setManagedActivities([]);
            return;
        }

        try {
            const data = await getMyManagedExternalActivities();

            setManagedActivities(
                data.filter((activity) => activity.organizationId === selectedOrganizationId)
            );
        } catch (e) {
            console.error(e);
            setManagedActivities([]);
        }
    }, [selectedOrganizationId]);

    React.useEffect(() => {
        void refreshManagedActivities();
    }, [refreshManagedActivities]);

    function handleServicePreparing(e: React.MouseEvent<HTMLAnchorElement>): void {
        e.preventDefault();
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
                            const activityId = activity.externalActivityId;
                            const isOpen = openedActivityIds.includes(activityId);
                            const isActivityActive = pathname.startsWith(`/eca-admin/activities/${activityId}/dashboard`)
                                || pathname.startsWith(`/eca-admin/activities/${activityId}/assignment`);
                                // 추후 하위 메뉴 API 연결 시 아래 경로도 active 조건에 추가
                                // pathname.startsWith(`/eca-admin/activities/${activityId}/attendance`)
                                // pathname.startsWith(`/eca-admin/activities/${activityId}/team`)

                            return (
                                <div className="eca-client-admin-menu-group" key={activityId}>
                                    <button
                                        type="button"
                                        className={isActivityActive ? "eca-client-admin-menu-item eca-client-admin-menu-item--active eca-client-admin-menu-item--with-arrow" : "eca-client-admin-menu-item eca-client-admin-menu-item--with-arrow"}
                                        onClick={() => {
                                            setOpenedActivityIds((prev) => (
                                                prev.includes(activityId)
                                                    ? prev.filter((id) => id !== activityId)
                                                    : [...prev, activityId]
                                            ));
                                        }}
                                    >
                                        <img
                                            className={isOpen ? "eca-client-admin-chevron eca-client-admin-chevron--open" : "eca-client-admin-chevron"}
                                            src="/icons/chevron-right-80.svg"
                                            alt=""
                                        />
                                        <span className="eca-client-admin-menu-title">{activity.name}</span>
                                    </button>

                                    {isOpen ? (
                                        <div className="eca-client-admin-submenu">
                                            <NavLink
                                                to={`/eca-admin/activities/${activityId}/dashboard`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                            >
                                                대시보드
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activityId}/assignment`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                            >
                                                과제 현황
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activityId}/attendance`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                                onClick={handleServicePreparing}
                                            >
                                                출석 현황
                                            </NavLink>
                                            <NavLink
                                                to={`/eca-admin/activities/${activityId}/team-activity`}
                                                className={({ isActive }) => isActive ? "eca-client-admin-submenu-item eca-client-admin-submenu-item--active" : "eca-client-admin-submenu-item"}
                                                onClick={handleServicePreparing}
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

                <NavLink
                    to="/eca-admin/settings"
                    className={({ isActive }) => (
                        isActive
                            ? "eca-client-admin-sidebar-profile eca-client-admin-sidebar-profile--active"
                            : "eca-client-admin-sidebar-profile"
                    )}
                >
                    <img className="eca-client-admin-avatar-img" src={adminProfileImg} alt="admin avatar" />
                    <span className="eca-client-admin-name">관리자 {adminName}님</span>
                </NavLink>
            </aside>

            <main className="eca-client-admin-body">
                <div className="eca-client-admin-surface">
                    <Outlet
                        context={{
                            me,
                            organizations,
                            organization,
                            selectedOrganizationId,
                            organizationLoading,
                            managedActivities,
                            setSelectedOrganizationId,
                            refreshManagedActivities,
                        } satisfies EcaClientAdminOutletContext}
                    />
                </div>
            </main>
        </div>
    );
}