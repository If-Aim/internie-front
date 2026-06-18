import React from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate, useParams, useLocation, matchPath } from "react-router-dom";
import { ApiError, getUserMe } from "../../../../api/client";
import { getMyOrganizations } from "../../../../api/organizationClient";
import { getMyParticipatingExternalActivities } from "../../../../api/ea";
import type { UserMe } from "../../../../api/client";
import type { MyOrganizationResponse } from "../../../../api/organizationClient";
import type { StudentExternalActivityResponse } from "../../../../api/ea";
import StudentMobileSideMenu from "../studentMobileSideMenu";
import EcaMobileDashboard from "./dashboard/dashboard/ecaStudentMobileDashboard";
import EcaMobileAssignment from "./dashboard/assignment/ecaStudentMobileAssignment";
import EcaMobileAssignmentSubmit from "./dashboard/assignment/ecaStudentMobileAssignmentSubmit";
import EcaMobileAttendance from "./dashboard/attendance/ecaStudentMobileAttendance";
import EcaMobileAttendanceSubmit from "./dashboard/attendance/ecaStudentMobileAttendanceSubmit";
import "./ecaStudentApp.css";

function handleServicePreparing(e: React.MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    window.alert("서비스 준비중입니다.");
}

function EcaMobileShell(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const basePath = externalActivityId ? `/student/activities/${externalActivityId}` : "/student";
    const hideBottomNav = Boolean(matchPath("/student/activities/:externalActivityId/attendance/:eventId", location.pathname));
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [activities, setActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const isAuthed = !!localStorage.getItem("accessToken");

    const userName = (me?.name ?? "").trim() || "User";
    const userEmail = (me?.email ?? "").trim();
    const userRoleSet = Array.isArray(me?.roleSet) ? me.roleSet : [];
    const userProfileImg = React.useMemo(() => {
        const profile = me?.profileImage;

        if (!profile) return "/internie_mascot_normal.png";
        if (profile.toLowerCase().includes("default")) return "/internie_mascot_normal.png";

        return profile;
    }, [me]);

    function requireAuth(pathAfterLogin: string, action?: () => void): void {
        if (!isAuthed) {
            navigate("/login", { replace: false, state: { from: pathAfterLogin } });
            return;
        }

        action?.();
    }

    React.useEffect(() => {
        let mounted = true;

        async function fetchMenuData(): Promise<void> {
            if (!isAuthed) {
                setMe(null);
                setOrganizations([]);
                setActivities([]);
                return;
            }

            try {
                const [nextMe, myOrganizations, myActivities] = await Promise.all([
                    getUserMe(),
                    getMyOrganizations(),
                    getMyParticipatingExternalActivities(),
                ]);

                if (!mounted) return;

                setMe(nextMe);
                setOrganizations(Array.isArray(myOrganizations) ? myOrganizations : []);
                setActivities([...myActivities].sort((a, b) => a.externalActivityId - b.externalActivityId));
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                    setMe(null);
                    setOrganizations([]);
                    setActivities([]);
                    return;
                }

                setMe(null);
                setOrganizations([]);
                setActivities([]);
            }
        }

        fetchMenuData();

        return () => {
            mounted = false;
        };
    }, [isAuthed]);

    React.useEffect(() => {
        function handleOpenStudentMobileMenu(): void {
            setMenuOpen(true);
        }

        window.addEventListener("openStudentMobileMenu", handleOpenStudentMobileMenu);

        return () => {
            window.removeEventListener("openStudentMobileMenu", handleOpenStudentMobileMenu);
        };
    }, []);

    React.useEffect(() => {
        if (!menuOpen) return;

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
    }, [menuOpen]);

    return (
        <div className={hideBottomNav ? "eca-mobile-shell is-without-bottom-nav" : "eca-mobile-shell"}>
            <StudentMobileSideMenu
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                userName={userName}
                userEmail={userEmail}
                userProfileImg={userProfileImg}
                userRoleSet={userRoleSet}
                organizations={organizations}
                activities={activities}
                onRequireAuth={(path, action) => requireAuth(path, action)}
            />
            <div className="eca-mobile-shell-body">
                <Outlet />
            </div>

            {hideBottomNav ? null : (
                <nav className="eca-mobile-bottom-nav">
                    <NavLink to={`${basePath}/dashboard`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M19.9247 28.1175V4.88281C19.9247 4.33053 19.477 3.88281 18.9247 3.88281H12.847C12.2948 3.88281 11.847 4.33053 11.847 4.88281V28.1175M19.9247 28.1175L19.9225 14.0243C19.9224 13.472 20.3701 13.0241 20.9225 13.0241H27C27.5523 13.0241 28 13.4719 28 14.0241V27.1175C28 27.6698 27.5523 28.1175 27 28.1175H19.9247ZM19.9247 28.1175H11.847M11.847 28.1175V21.1175C11.847 20.5652 11.3993 20.1175 10.847 20.1175H5C4.44771 20.1175 4 20.5652 4 21.1175V27.1175C4 27.6698 4.44771 28.1175 5 28.1175H11.847Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <strong>대시보드</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/assignment`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M3.20157 11.2221L3.20144 24.5879C3.20142 25.6925 4.09686 26.5879 5.20143 26.5879L26.7997 26.588C27.9043 26.588 28.7997 25.6926 28.7997 24.588L28.8002 10.3498C28.8002 9.79754 28.3525 9.3498 27.8002 9.3498H16.1118L12.4251 5.41162H4.20057C3.64814 5.41162 3.20036 5.85813 3.20054 6.41057C3.20095 7.65588 3.20158 9.79409 3.20157 11.2221Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <strong>과제 제출</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/attendance`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"} >
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4C17.8827 4 19.6642 4.43358 21.25 5.20635M25.75 8.5L15.25 19L12.25 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <strong>출석 확인</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/team-activity`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"} onClick={handleServicePreparing}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M25.6002 18.2476C27.29 19.5101 28.8002 22.6889 28.8002 24.6475C28.8002 25.2577 28.355 25.7523 27.8058 25.7523H27.2002M20.8002 13.0726C21.8933 12.4402 22.6288 11.2584 22.6288 9.9047C22.6288 8.55104 21.8933 7.36916 20.8002 6.73682M4.19456 25.7523H21.7106C22.2598 25.7523 22.705 25.2577 22.705 24.6475C22.705 20.812 19.5006 17.7027 12.9526 17.7027C6.40455 17.7027 3.2002 20.812 3.2002 24.6475C3.2002 25.2577 3.64539 25.7523 4.19456 25.7523ZM16.6097 9.9047C16.6097 11.9245 14.9724 13.5618 12.9526 13.5618C10.9328 13.5618 9.29543 11.9245 9.29543 9.9047C9.29543 7.88492 10.9328 6.24756 12.9526 6.24756C14.9724 6.24756 16.6097 7.88492 16.6097 9.9047Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </span>
                        <strong>팀 활동</strong>
                    </NavLink>
                </nav>
            )}
        </div>
    );
}

export default function EcaStudentApp(): React.ReactElement {
    return (
        <Routes>
            <Route path=":externalActivityId" element={<EcaMobileShell />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<EcaMobileDashboard />} />
                <Route path="assignment" element={<EcaMobileAssignment />} />
                <Route path="assignment/:assignmentId" element={<EcaMobileAssignmentSubmit />} />
                <Route path="attendance" element={<EcaMobileAttendance />} />
                <Route path="attendance/:eventId" element={<EcaMobileAttendanceSubmit />} />
                <Route path="team-activity" element={<EcaMobileDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
    );
}