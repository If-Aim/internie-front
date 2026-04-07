// src/App.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./protectedRoute";
import AdminRoute from "./adminRoute";
import AdminClientRoute from "./clientAdminRoute";

const Login = lazy(() => import("./pages/login/login"));
const KakaoCallback = lazy(() => import("./pages/kakaoCallback"));
const OnBoarding = lazy(() => import("./pages/login/mobile/onBoarding"));

const StudentApp = lazy(() => import("./pages/student/studentApp"));
const AdminApp = lazy(() => import("./pages/admin/adminApp"));
const ClientAdminApp = lazy(() => import("./pages/admin/desktop/jump/clientAdminApp"));

export default function App(): React.ReactElement {
	return (
		<Suspense fallback={<div />}>
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/oauth/kakao/callback" element={<KakaoCallback />} />

				<Route element={<ProtectedRoute />}>
					<Route path="/onboarding" element={<OnBoarding />} />
				</Route>

				<Route path="/student/*" element={<StudentApp />} />
				<Route path="/" element={<Navigate to="/student" replace />} />

				{/* 관리자용 라우트 */}
				<Route element={<AdminRoute />}>
					<Route path="/system-admin/*" element={<AdminApp />} />
				</Route>
				{/* client 관리자용 라우트 */}
				<Route path="/admin/:clientType/*" element={<AdminClientRoute />}>
					<Route path="*" element={<ClientAdminApp />} />
				</Route>

				<Route path="*" element={<Navigate to="/student" replace />} />
			</Routes>
		</Suspense>
	);
}
