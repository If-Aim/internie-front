// src/pages/admin/desktop/ecaClient/dashboard/dashboard.tsx
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import "./dashboard.css";

export default function EcaDashboardLayout(): React.ReactElement {
    const { pathname } = useLocation();

    const isExternalActivity = pathname === "/eca-admin/dashboard" || pathname === "/eca-admin/dashboard/external-activity";
    const isAssignment = pathname.startsWith("/eca-admin/dashboard/assignment");
    const isAttendance = pathname.startsWith("/eca-admin/dashboard/attendance");
    const isTeamActivity = pathname.startsWith("/eca-admin/dashboard/team-activity");

    return (
        <div className="eca-dashboard-page">
            <aside className="eca-dashboard-sidebar">
                <nav className="eca-dashboard-side-nav" aria-label="eca dashboard menu">
                    <NavLink
                        to="/eca-admin/dashboard/external-activity"
                        className={isExternalActivity ? "eca-dashboard-side-link eca-dashboard-side-link--active" : "eca-dashboard-side-link"}
                    >
                        대외활동 현황
                    </NavLink>

                    <NavLink
                        to="/eca-admin/dashboard/assignment"
                        className={isAssignment ? "eca-dashboard-side-link eca-dashboard-side-link--active" : "eca-dashboard-side-link"}
                    >
                        과제 제출 현황
                    </NavLink>

                    <NavLink
                        to="/eca-admin/dashboard/attendance"
                        className={isAttendance ? "eca-dashboard-side-link eca-dashboard-side-link--active" : "eca-dashboard-side-link"}
                    >
                        출석 현황
                    </NavLink>

                    <NavLink
                        to="/eca-admin/dashboard/team-activity"
                        className={isTeamActivity ? "eca-dashboard-side-link eca-dashboard-side-link--active" : "eca-dashboard-side-link"}
                    >
                        팀 활동
                    </NavLink>
                </nav>
            </aside>

            <section className="eca-dashboard-content">
                <Outlet />
            </section>
        </div>
    )

}