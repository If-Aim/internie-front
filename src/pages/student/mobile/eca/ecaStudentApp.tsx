import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate, useParams, useLocation, matchPath } from "react-router-dom";
import { ApiError, getUserMe } from "../../../../api/client";
import { getMyOrganizations } from "../../../../api/organizationClient";
import { getMyParticipatingExternalActivities } from "../../../../api/ea";
import type { UserMe } from "../../../../api/client";
import type { MyOrganizationResponse } from "../../../../api/organizationClient";
import type { StudentExternalActivityResponse } from "../../../../api/ea";
import StudentMobileSideMenu from "../studentMobileSideMenu";
import EcaMobileDashboard from "./dashboard/dashboard/ecaStudentMobileDashboard";
import EcaStudentMobileNotification from "./dashboard/notification/notification";

import EcaMobileAssignment from "./dashboard/assignment/ecaStudentMobileAssignment";
import EcaMobileAssignmentSubmit from "./dashboard/assignment/ecaStudentMobileAssignmentSubmit";
import EcaMobileAttendance from "./dashboard/attendance/ecaStudentMobileAttendance";
import EcaMobileAttendanceSubmit from "./dashboard/attendance/ecaStudentMobileAttendanceSubmit";
import EcaMobileLeaderboard from "./dashboard/leaderboard/ecaStudentMobileLeaderboard";
import EcaStudentMobileLeaderboardMission from "./dashboard/leaderboard/ecaStudentMobileLeaderboardMission";
import "./ecaStudentApp.css";

const ECA_STUDENT_APP_T = "ecaStudent.appPage";

function EcaMobileShell(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const basePath = externalActivityId ? `/student/activities/${externalActivityId}` : "/student";
    const hideBottomNav = Boolean(matchPath("/student/activities/:externalActivityId/attendance/:eventId", location.pathname))
        || Boolean(matchPath("/student/activities/:externalActivityId/leaderboard/missions", location.pathname))
        || Boolean(matchPath("/student/activities/:externalActivityId/notification", location.pathname));
    const isLeaderboardSection = location.pathname === `${basePath}/leaderboard` || location.pathname.startsWith(`${basePath}/leaderboard/`);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [activities, setActivities] = React.useState<StudentExternalActivityResponse[]>([]);
    const isAuthed = !!localStorage.getItem("accessToken");

    const userName = (me?.name ?? "").trim() || t(`${ECA_STUDENT_APP_T}.defaultUserName`);
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
                <Outlet context={{ userName, userEmail, userProfileImg, onRequireAuth: requireAuth }} />
            </div>

            {hideBottomNav ? null : (
                <nav className="eca-mobile-bottom-nav">
                    <NavLink to={`${basePath}/dashboard`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M19.9247 28.1175V4.88281C19.9247 4.33053 19.477 3.88281 18.9247 3.88281H12.847C12.2948 3.88281 11.847 4.33053 11.847 4.88281V28.1175M19.9247 28.1175L19.9225 14.0243C19.9224 13.472 20.3701 13.0241 20.9225 13.0241H27C27.5523 13.0241 28 13.4719 28 14.0241V27.1175C28 27.6698 27.5523 28.1175 27 28.1175H19.9247ZM19.9247 28.1175H11.847M11.847 28.1175V21.1175C11.847 20.5652 11.3993 20.1175 10.847 20.1175H5C4.44771 20.1175 4 20.5652 4 21.1175V27.1175C4 27.6698 4.44771 28.1175 5 28.1175H11.847Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <strong>{t(`${ECA_STUDENT_APP_T}.bottomNav.dashboard`)}</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/assignment`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M3.20157 11.2221L3.20144 24.5879C3.20142 25.6925 4.09686 26.5879 5.20143 26.5879L26.7997 26.588C27.9043 26.588 28.7997 25.6926 28.7997 24.588L28.8002 10.3498C28.8002 9.79754 28.3525 9.3498 27.8002 9.3498H16.1118L12.4251 5.41162H4.20057C3.64814 5.41162 3.20036 5.85813 3.20054 6.41057C3.20095 7.65588 3.20158 9.79409 3.20157 11.2221Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <strong>{t(`${ECA_STUDENT_APP_T}.bottomNav.assignment`)}</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/attendance`} className={({ isActive }) => isActive ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"} >
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4C17.8827 4 19.6642 4.43358 21.25 5.20635M25.75 8.5L15.25 19L12.25 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        <strong>{t(`${ECA_STUDENT_APP_T}.bottomNav.attendance`)}</strong>
                    </NavLink>
                    <NavLink to={`${basePath}/leaderboard`} className={() => isLeaderboardSection ? "eca-mobile-bottom-nav-item is-active" : "eca-mobile-bottom-nav-item"}>
                        <span className="eca-mobile-bottom-nav-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path opacity="0.2" d="M27.108 25.9463C26.5539 26.044 25.9845 26.0068 25.4479 25.8377C24.9113 25.6686 24.4234 25.3727 24.0255 24.975L18.7617 19H21.5005C22.4496 19.001 23.3873 18.794 24.2477 18.3934C25.1082 17.9928 25.8703 17.4085 26.4804 16.6815C27.0906 15.9546 27.534 15.1027 27.7793 14.1858C28.0247 13.269 28.066 12.3095 27.9005 11.375L29.9455 21.8962C30.1054 22.8095 29.8964 23.7488 29.3644 24.5081C28.8324 25.2674 28.0209 25.7847 27.108 25.9463Z" fill="currentColor"/>
                                <path d="M22.0003 14H19.0003C18.7351 14 18.4807 13.8946 18.2932 13.7071C18.1056 13.5196 18.0003 13.2652 18.0003 13C18.0003 12.7348 18.1056 12.4804 18.2932 12.2929C18.4807 12.1054 18.7351 12 19.0003 12H22.0003C22.2655 12 22.5199 12.1054 22.7074 12.2929C22.8949 12.4804 23.0003 12.7348 23.0003 13C23.0003 13.2652 22.8949 13.5196 22.7074 13.7071C22.5199 13.8946 22.2655 14 22.0003 14ZM13.0003 12H12.0003V11C12.0003 10.7348 11.8949 10.4804 11.7074 10.2929C11.5199 10.1054 11.2655 10 11.0003 10C10.7351 10 10.4807 10.1054 10.2932 10.2929C10.1056 10.4804 10.0003 10.7348 10.0003 11V12H9.00029C8.73507 12 8.48072 12.1054 8.29318 12.2929C8.10565 12.4804 8.00029 12.7348 8.00029 13C8.00029 13.2652 8.10565 13.5196 8.29318 13.7071C8.48072 13.8946 8.73507 14 9.00029 14H10.0003V15C10.0003 15.2652 10.1056 15.5196 10.2932 15.7071C10.4807 15.8946 10.7351 16 11.0003 16C11.2655 16 11.5199 15.8946 11.7074 15.7071C11.8949 15.5196 12.0003 15.2652 12.0003 15V14H13.0003C13.2655 14 13.5199 13.8946 13.7074 13.7071C13.8949 13.5196 14.0003 13.2652 14.0003 13C14.0003 12.7348 13.8949 12.4804 13.7074 12.2929C13.5199 12.1054 13.2655 12 13.0003 12ZM30.1853 25.0812C29.8084 25.6194 29.3183 26.0686 28.7493 26.3971C28.1803 26.7256 27.5462 26.9255 26.8917 26.9828C26.2372 27.0401 25.5781 26.9534 24.9606 26.7288C24.3432 26.5041 23.7825 26.147 23.3178 25.6825C23.3028 25.6675 23.2878 25.6525 23.274 25.6362L18.3103 20H13.6853L8.72654 25.6362L8.68279 25.6825C7.83804 26.5254 6.69365 26.9992 5.50029 27C4.84334 26.9998 4.1944 26.8557 3.59908 26.5779C3.00375 26.3001 2.47647 25.8953 2.05427 25.392C1.63208 24.8886 1.3252 24.299 1.15521 23.6644C0.985221 23.0298 0.956235 22.3657 1.07029 21.7188C1.0697 21.7129 1.0697 21.7071 1.07029 21.7013L3.11654 11.19C3.42108 9.45634 4.32686 7.88546 5.67473 6.75339C7.02261 5.62133 8.72633 5.0005 10.4865 5H21.5003C23.2552 5.0028 24.9537 5.62008 26.3009 6.74466C27.6481 7.86924 28.559 9.4301 28.8753 11.1562V11.1788L30.9215 21.7C30.9221 21.7058 30.9221 21.7117 30.9215 21.7175C31.0274 22.299 31.0169 22.8958 30.8905 23.4732C30.7641 24.0506 30.5244 24.5971 30.1853 25.0812ZM21.5003 18C22.959 18 24.3579 17.4205 25.3894 16.3891C26.4208 15.3576 27.0003 13.9587 27.0003 12.5C27.0003 11.0413 26.4208 9.64236 25.3894 8.61091C24.3579 7.57946 22.959 7 21.5003 7H10.4865C9.19523 7.00116 7.94569 7.45767 6.95775 8.28922C5.96982 9.12076 5.30678 10.2741 5.08529 11.5463V11.5625L3.03779 22.0737C2.94729 22.5949 3.02439 23.1313 3.25801 23.6058C3.49163 24.0803 3.86973 24.4685 4.33793 24.7145C4.80613 24.9606 5.3403 25.0518 5.86362 24.9751C6.38694 24.8983 6.87244 24.6576 7.25029 24.2875L12.4903 18.3388C12.5841 18.2323 12.6995 18.1471 12.8288 18.0886C12.9581 18.0302 13.0984 18 13.2403 18H21.5003ZM28.9628 22.0737L27.8703 16.4487C27.1984 17.5337 26.2607 18.4293 25.146 19.0508C24.0313 19.6722 22.7765 19.9989 21.5003 20H20.9753L24.7503 24.2887C25.0349 24.5656 25.3811 24.771 25.7605 24.8881C26.1399 25.0052 26.5416 25.0307 26.9328 24.9625C27.5844 24.8475 28.1638 24.4788 28.5441 23.9374C28.9244 23.3959 29.0745 22.7257 28.9615 22.0737H28.9628Z" fill="currentColor"/>
                            </svg>
                        </span>
                        <strong>{t(`${ECA_STUDENT_APP_T}.bottomNav.leaderboard`)}</strong>
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
                <Route path="notification" element={<EcaStudentMobileNotification />} />
                <Route path="assignment" element={<EcaMobileAssignment />} />
                <Route path="assignment/:assignmentId" element={<EcaMobileAssignmentSubmit />} />
                <Route path="attendance" element={<EcaMobileAttendance />} />
                <Route path="attendance/:eventId" element={<EcaMobileAttendanceSubmit />} />
                <Route path="leaderboard" element={<EcaMobileLeaderboard />} />
                <Route path="leaderboard/missions" element={<EcaStudentMobileLeaderboardMission />} />
            </Route>

            <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
    );
}