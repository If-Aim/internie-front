import React from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { ApiError, getUserMe } from "../../../../api/client";
import { getMyParticipatingExternalActivities } from "../../../../api/ea";
import type { UserMe } from "../../../../api/client";
import type { StudentExternalActivityResponse } from "../../../../api/ea";
import "./ecaStudentLayout.css";

export type EcaStudentOutletContext = {
    me: UserMe | null;
    activities: StudentExternalActivityResponse[];
    activitiesLoading: boolean;
};

function getDisplayStudentName(me: UserMe | null): string {
    if (!me) return "학생";

    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();

    return nick || name || "학생";
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;

    return url.toLowerCase().includes("default");
}

function handleServicePreparing(e: React.MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    alert("서비스 준비중입니다.");
}

function getActivityBasePath(activityId: number): string {
    return `/student/activities/${activityId}`;
}

function isActivityPathActive(pathname: string, activityId: number): boolean {
    return pathname.startsWith(getActivityBasePath(activityId));
}

export default function EcaStudentLayout(): React.ReactElement {
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const { pathname } = useLocation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [activities, setActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const [activitiesLoading, setActivitiesLoading] = React.useState(true);
    const [openedActivityId, setOpenedActivityId] = React.useState<number | null>(externalActivityId ? Number(externalActivityId) : null);

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

        async function fetchActivities(): Promise<void> {
            setActivitiesLoading(true);

            try {
                const data = await getMyParticipatingExternalActivities();

                if (!mounted) return;

                const sortedActivities = [...data].sort((a, b) => a.externalActivityId - b.externalActivityId);

                setActivities(sortedActivities);
            } catch (e) {
                console.error(e);

                if (mounted) {
                    setActivities([]);
                }
            } finally {
                if (mounted) {
                    setActivitiesLoading(false);
                }
            }
        }

        fetchActivities();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!externalActivityId) return;

        const nextActivityId = Number(externalActivityId);

        if (Number.isFinite(nextActivityId)) {
            setOpenedActivityId(nextActivityId);
        }
    }, [externalActivityId]);

    const studentName = getDisplayStudentName(me);
    const profileImage = isDefaultProfileImage(me?.profileImage)
        ? "/internie_mascot_normal.png"
        : (me?.profileImage ?? "/internie_mascot_normal.png");

    return (
        <div className="eca-student-layout">
            <aside className="eca-student-sidebar">
                <div className="eca-student-sidebar-logo-wrap">
                    <NavLink to="/student">
                        <span className="eca-student-logo">internie</span>
                    </NavLink>
                </div>

                <nav className="eca-student-nav">
                    <NavLink
                        to="/student"
                        end
                        className={({ isActive }) => isActive ? "eca-student-menu-item eca-student-menu-item--active" : "eca-student-menu-item"}
                        onClick={handleServicePreparing}
                    >
                        <span className="eca-student-sidebar-menu-value">홈</span>
                    </NavLink>

                    <div className="eca-student-activity-list">
                        {activitiesLoading ? (
                            <span className="eca-student-submenu-empty">대외활동을 불러오는 중입니다</span>
                        ) : activities.length === 0 ? (
                            <span className="eca-student-submenu-empty">참여 중인 대외활동이 없습니다</span>
                        ) : (
                            activities.map((activity) => {
                                const activityId = activity.externalActivityId;
                                const basePath = getActivityBasePath(activityId);
                                const isOpen = openedActivityId === activityId;
                                const isActivityActive = isActivityPathActive(pathname, activityId);

                                return (
                                    <div className="eca-student-menu-group" key={activityId}>
                                        <button
                                            type="button"
                                            className={isActivityActive ? "eca-student-menu-item eca-student-menu-item--active eca-student-menu-item--with-arrow" : "eca-student-menu-item eca-student-menu-item--with-arrow"}
                                            onClick={() => setOpenedActivityId((prev) => prev === activityId ? null : activityId)}
                                        >
                                            <img className={isOpen ? "eca-student-chevron eca-student-chevron--open" : "eca-student-chevron"} src="/icons/chevron-right-80.svg" alt="" />
                                            <span>{activity.name}</span>
                                        </button>

                                        {isOpen ? (
                                            <div className="eca-student-submenu">
                                                <NavLink to={`${basePath}/dashboard`} className={({ isActive }) => isActive ? "eca-student-submenu-item eca-student-submenu-item--active" : "eca-student-submenu-item"}>
                                                    대시보드
                                                </NavLink>

                                                <NavLink to={`${basePath}/assignment`} className={({ isActive }) => isActive ? "eca-student-submenu-item eca-student-submenu-item--active" : "eca-student-submenu-item"}>
                                                    과제 제출 현황
                                                </NavLink>

                                                <NavLink to={`${basePath}/attendance`} className={({ isActive }) => isActive ? "eca-student-submenu-item eca-student-submenu-item--active" : "eca-student-submenu-item"} onClick={handleServicePreparing}>
                                                    출석 현황
                                                </NavLink>

                                                <NavLink to={`${basePath}/team-activity`} className={({ isActive }) => isActive ? "eca-student-submenu-item eca-student-submenu-item--active" : "eca-student-submenu-item"} onClick={handleServicePreparing}>
                                                    팀 활동
                                                </NavLink>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </nav>

                <div className="eca-student-sidebar-profile">
                    <img className="eca-student-avatar-img" src={profileImage} alt="student avatar" />
                    <span className="eca-student-name">{studentName}님</span>
                </div>
            </aside>

            <main className="eca-student-body">
                <div className="eca-student-surface">
                    <Outlet context={{ me, activities, activitiesLoading } satisfies EcaStudentOutletContext} />
                </div>
            </main>
        </div>
    );
}