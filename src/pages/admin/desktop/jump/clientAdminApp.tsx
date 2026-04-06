// src/pages/admin/desktop/jump/jumpAdminApp.tsx
// 관리자화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ClientAdminHome from "./home";
import ClientAdminUsersPage from "./analysis/users";
import ClientAdminDashboardPage from "./dashboard/dashboard";


export default function DesktopAdminApp(): React.ReactElement {
	return (
		<Routes>
			<Route element={<ClientAdminHome />}>
				<Route index element={<Navigate to="analysis" replace />} />
				<Route path="analysis" element={<ClientAdminUsersPage />} />
				<Route path="dashboard" element={<ClientAdminDashboardPage />} />
				<Route path="*" element={<Navigate to="../analysis" replace />} />
			</Route>
		</Routes>
	);
}