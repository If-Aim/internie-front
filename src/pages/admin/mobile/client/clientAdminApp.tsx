// src/pages/admin/mobile/client/clientAdminApp.tsx
// 고객사 관리자 모바일 라우트
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ClientAdminHomeMobile from "./home";
import ClientAdminUsersPage from "../../desktop/client/analysis/users";
import ClientAdminDashboardPage from "../../desktop/client/dashboard/dashboard";
import "./clientAdminMobile.css";

export default function MobileClientAdminApp(): React.ReactElement {
    return (
        <Routes>
            <Route element={<ClientAdminHomeMobile />}>
                <Route index element={<Navigate to="analysis" replace />} />
                <Route path="analysis" element={<ClientAdminUsersPage />} />
                <Route path="dashboard" element={<ClientAdminDashboardPage />} />
                <Route path="*" element={<Navigate to="../analysis" replace />} />
            </Route>
        </Routes>
    );
}
