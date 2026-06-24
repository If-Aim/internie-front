// src/pages/admin/desktop/client/clientAdminApp.tsx
// 관리자화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ClientAdminHome from "./home";
import ClientAdminUsersPage from "./analysis/users";
import ClientAdminDashboardPage from "./dashboard/dashboard";
import MobileClientAdminApp from "../../mobile/client/clientAdminApp";

function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = React.useState(() => (
        typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
    ));

    React.useEffect(() => {
        const mql = window.matchMedia("(min-width: 1024px)");
        const onChange = () => setIsDesktop(mql.matches);

        onChange();
        mql.addEventListener("change", onChange);

        return () => {
            mql.removeEventListener("change", onChange);
        };
    }, []);

    return isDesktop;
}

function DesktopClientAdminApp(): React.ReactElement {
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

export default function ClientAdminApp(): React.ReactElement {
    const isDesktop = useIsDesktop();

    return isDesktop ? <DesktopClientAdminApp /> : <MobileClientAdminApp />;
}
