// src/pages/admin/desktop/ecaClient/ecaClientAdminApp.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EcaClientAdminHome from "./ecaHome";
import EcaHomePage from "./home/home";
import EcaDashboardLayout from "./dashboard/dashboard";
import EcaDashboardExActivity from "./dashboard/externalActivity/externalActivity";
import EcaDashboardAssignment from "./dashboard/assignment/assignment";
import EcaDashboardAttendance from "./dashboard/attendance/attendance";
import EcaDashboardTeamActivity from "./dashboard/teamActivity/teamActivity";
import EcaSettingsPage from "./settings/settings";

export default function EcaClientAdminApp(): React.ReactElement {
    return (
        <Routes>
            <Route element={<EcaClientAdminHome />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<EcaHomePage />} />
                <Route path="dashboard" element={<EcaDashboardLayout />}>
                    <Route index element={<Navigate to="external-activity" replace/>}/>
                    <Route path="external-activity" element={<EcaDashboardExActivity />}/>
                    <Route path="assignment" element={<EcaDashboardAssignment />}/>
                    <Route path="attendance" element={<EcaDashboardAttendance />}/>
                    <Route path="team-activity" element={<EcaDashboardTeamActivity />}/>
                </Route>
                <Route path="settings" element={<EcaSettingsPage />} />
            </Route>
        </Routes>
    );
}