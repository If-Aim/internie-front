// src/pages/admin/mobile/ecaClient/ecaHome.tsx
// 대외활동 관리자 모바일 메인
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import { getMyManagedExternalActivities, type ExternalActivityResponse } from "../../../../api/ea";
import { getMyOrganizations, type MyOrganizationResponse } from "../../../../api/organizationClient";
import type { EcaClientAdminOutletContext } from "../../desktop/ecaClient/ecaHome";

const SELECTED_ORGANIZATION_STORAGE_KEY = "eca.selectedOrganizationId";

function getDisplayAdminName(me: UserMe | null): string {
    if (!me) return "";

    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();

    return nick || name || "";
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;
    return url.toLowerCase().includes("default");
}

function getActivityIdFromPath(pathname: string): number | null {
    const match = pathname.match(/^\/program-admin\/activities\/(\d+)/);
    if (!match) return null;

    const activityId = Number(match[1]);
    return Number.isFinite(activityId) ? activityId : null;
}

function isAssignmentEvaluationRoute(pathname: string, activityId: number): boolean {
    return new RegExp(`^/program-admin/activities/${activityId}/assignment/[^/]+/evaluation/[^/]+/?$`).test(pathname);
}

function isActivityRouteActive(pathname: string, activityId: number, menuPath: string): boolean {
    const isAssignmentEvaluationActive = isAssignmentEvaluationRoute(pathname, activityId);

    if (menuPath === "assignment" && isAssignmentEvaluationActive) return false;
    if (menuPath === "evaluation" && isAssignmentEvaluationActive) return true;

    const basePath = `/program-admin/activities/${activityId}/${menuPath}`;
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export default function EcaClientAdminMobileHome(): React.ReactElement {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<number | null>(() => {
        const saved = sessionStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY);
        const parsed = saved ? Number(saved) : NaN;

        return Number.isFinite(parsed) ? parsed : null;
    });
    const [organizationLoading, setOrganizationLoading] = React.useState(false);
    const [openedActivityIds, setOpenedActivityIds] = React.useState<number[]>([]);
    const [managedActivities, setManagedActivities] = React.useState<ExternalActivityResponse[]>([]);

    const organization = React.useMemo(() => {
        return organizations.find((item) => item.organizationId === selectedOrganizationId) ?? null;
    }, [organizations, selectedOrganizationId]);

    const activeActivityId = getActivityIdFromPath(pathname);
    const activeActivity = managedActivities.find((activity) => activity.externalActivityId === activeActivityId) ?? null;

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
        if (activeActivityId === null) return;

        setOpenedActivityIds((prev) => (
            prev.includes(activeActivityId) ? prev : [...prev, activeActivityId]
        ));
    }, [activeActivityId]);

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
                    if (prev && data.some((item) => item.organizationId === prev)) return prev;
                    return data[0]?.organizationId ?? null;
                });
            } catch (e) {
                console.error(e);

                if (mounted) {
                    setOrganizations([]);
                    setSelectedOrganizationId(null);
                }
            } finally {
                if (mounted) setOrganizationLoading(false);
            }
        }

        void fetchOrganizations();

        return () => {
            mounted = false;
        };
    }, []);

    const refreshManagedActivities = React.useCallback(async (): Promise<void> => {
        if (!selectedOrganizationId) {
            setManagedActivities([]);
            return;
        }

        try {
            const data = await getMyManagedExternalActivities();
            setManagedActivities(data.filter((activity) => activity.organizationId === selectedOrganizationId));
        } catch (e) {
            console.error(e);
            setManagedActivities([]);
        }
    }, [selectedOrganizationId]);

    React.useEffect(() => {
        void refreshManagedActivities();
    }, [refreshManagedActivities]);

    React.useEffect(() => {
        if (!drawerOpen) return;

        const scrollY = window.scrollY;

        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        document.body.style.overflow = "hidden";

        return () => {
            const y = Math.abs(parseInt(document.body.style.top || "0", 10));
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.left = "";
            document.body.style.right = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            window.scrollTo(0, y);
        };
    }, [drawerOpen]);

    const adminName = getDisplayAdminName(me) || t("ecaAdmin.defaultAdminName");
    const adminProfileImg = isDefaultProfileImage(me?.profileImage) ? "/internie_mascot_normal.png" : (me?.profileImage ?? "/internie_mascot_normal.png");
    const pageTitle = activeActivity?.name ?? (pathname.startsWith("/program-admin/settings") ? t("menu.settings") : t("ecaAdmin.home"));

    function closeDrawer(): void {
        setDrawerOpen(false);
    }

    function handleServicePreparing(event: React.MouseEvent<HTMLAnchorElement>): void {
        event.preventDefault();
        alert(t("ecaAdmin.comingSoon"));
    }

    function renderActivityMenu(activity: ExternalActivityResponse): React.ReactNode {
        const activityId = activity.externalActivityId;
        const isOpen = openedActivityIds.includes(activityId);
        const isActivityActive = pathname.startsWith(`/program-admin/activities/${activityId}/`);

        return (
            <section className="eca-mobile-admin-drawer-group" key={activityId}>
                <button
                    type="button"
                    className={isActivityActive ? "eca-mobile-admin-drawer-activity is-active" : "eca-mobile-admin-drawer-activity"}
                    onClick={() => {
                        setOpenedActivityIds((prev) => (
                            prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId]
                        ));
                    }}
                >
                    <span className={isOpen ? "eca-mobile-admin-drawer-chevron is-open" : "eca-mobile-admin-drawer-chevron"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M15 8L10 13L5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </span>
                    <span>{activity.name}</span>
                </button>

                {isOpen ? (
                    <div className="eca-mobile-admin-drawer-submenu">
                        <NavLink to={`/program-admin/activities/${activityId}/dashboard`} className={isActivityRouteActive(pathname, activityId, "dashboard") ? "is-active" : ""} onClick={closeDrawer}>
                            {t("ecaAdmin.dashboard")}
                        </NavLink>
                        <NavLink to={`/program-admin/activities/${activityId}/assignment`} className={isActivityRouteActive(pathname, activityId, "assignment") ? "is-active" : ""} onClick={closeDrawer}>
                            {t("ecaAdmin.assignment")}
                        </NavLink>
                        <NavLink to={`/program-admin/activities/${activityId}/evaluation`} className={isActivityRouteActive(pathname, activityId, "evaluation") ? "is-active" : ""} onClick={closeDrawer}>
                            {t("ecaAdmin.evaluation")}
                        </NavLink>
                        <NavLink to={`/program-admin/activities/${activityId}/attendance`} className={isActivityRouteActive(pathname, activityId, "attendance") ? "is-active" : ""} onClick={closeDrawer}>
                            {t("ecaAdmin.attendance")}
                        </NavLink>
                        <NavLink to={`/program-admin/activities/${activityId}/team-activity`} className={isActivityRouteActive(pathname, activityId, "team-activity") ? "is-active" : ""} onClick={handleServicePreparing}>
                            {t("ecaAdmin.team")}
                        </NavLink>
                        <NavLink to={`/program-admin/activities/${activityId}/leaderboard`} className={isActivityRouteActive(pathname, activityId, "leaderboard") ? "is-active" : ""} onClick={closeDrawer}>
                            {t("ecaAdmin.leaderboard")}
                        </NavLink>
                    </div>
                ) : null}
            </section>
        );
    }

    return (
        <div className="eca-mobile-admin-page">
            <header className="eca-mobile-admin-topbar">
                <button type="button" className="eca-mobile-admin-menu-button" onClick={() => setDrawerOpen(true)} aria-label={t("common.menu")}>
                    <img src="/icons/menu-01.svg" alt="" />
                </button>

                <div className="eca-mobile-admin-title">
                    <span>{t("menu.programAdminPage")}</span>
                    <strong>{pageTitle}</strong>
                </div>

                <NavLink to="/program-admin/settings" className="eca-mobile-admin-profile-link" aria-label={t("menu.settings")}>
                    <img src={adminProfileImg} alt="admin avatar" />
                </NavLink>
            </header>

            {drawerOpen ? (
                <div className="eca-mobile-admin-drawer-backdrop" onClick={closeDrawer} role="presentation">
                    <aside className="eca-mobile-admin-drawer" onClick={(event) => event.stopPropagation()}>
                        <div className="eca-mobile-admin-drawer-head">
                            <div>
                                <span>internie</span>
                                <strong>{t("ecaAdmin.ecaClientAdminName", { adminName })}</strong>
                            </div>
                            <button type="button" onClick={closeDrawer} aria-label={t("common.close")}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <nav className="eca-mobile-admin-drawer-nav" aria-label="program admin menu">
                            <NavLink to="/program-admin/home" className={({ isActive }) => (isActive ? "eca-mobile-admin-drawer-main is-active" : "eca-mobile-admin-drawer-main")} onClick={closeDrawer}>
                                {t("ecaAdmin.home")}
                            </NavLink>

                            <div className="eca-mobile-admin-drawer-activity-list">
                                {managedActivities.length === 0 ? (
                                    <span className="eca-mobile-admin-drawer-empty">{t("ecaAdmin.ecaClientAdminSubmenuEmpty")}</span>
                                ) : (
                                    managedActivities.map(renderActivityMenu)
                                )}
                            </div>

                            <NavLink to="/program-admin/settings" className={({ isActive }) => (isActive ? "eca-mobile-admin-drawer-main is-active" : "eca-mobile-admin-drawer-main")} onClick={closeDrawer}>
                                {t("menu.settings")}
                            </NavLink>
                        </nav>
                    </aside>
                </div>
            ) : null}

            <main className="eca-mobile-admin-body">
                <div className="eca-mobile-admin-surface">
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
