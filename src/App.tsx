import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./protectedRoute";
import AdminRoute from "./adminRoute";
import AdminClientRoute from "./clientAdminRoute";
import EcaAdminRoute from "./ecaAdminRoute";

const Auth = lazy(() => import("./pages/auth/auth"));
const Signup = lazy(() => import("./pages/auth/signup"));
const FindId = lazy(() => import("./pages/auth/findId"));
const ResetPassword = lazy(() => import("./pages/auth/resetPassword"));
const KakaoCallback = lazy(() => import("./pages/kakaoCallback"));
const PrivacyPolicy = lazy(() => import("./pages/privacy/privacyPolicy"));
const OnBoarding = lazy(() => import("./pages/auth/onboarding"));
const OrganizationInvite = lazy(() => import("./pages/admin/desktop/ecaClient/invite/organizationInvite"));
const ExternalActivityInvite = lazy(()=> import("./pages/student/desktop/eca/invite/ecaInvite"))

const StudentApp = lazy(() => import("./pages/student/studentApp"));
const AdminApp = lazy(() => import("./pages/admin/adminApp"));
const ClientAdminApp = lazy(() => import("./pages/admin/desktop/client/clientAdminApp"));
const EcaClientAdminApp = lazy(() => import("./pages/admin/desktop/ecaClient/ecaClientAdminApp"));

export default function App(): React.ReactElement {
    return (
        <Suspense fallback={<div />}>
            <Routes>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/find-id" element={<FindId />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/invite/organization/:token" element={<OrganizationInvite />} />
                <Route path="/invite/external-activity/:token" element={<ExternalActivityInvite />} />

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

                {/* 대외활동 관리자용 라우트 */}
                <Route element={<EcaAdminRoute />}>
                    <Route path="/eca-admin/*" element={<EcaClientAdminApp />} />
                </Route>

                <Route path="*" element={<Navigate to="/student" replace />} />
            </Routes>
        </Suspense>
    );
}