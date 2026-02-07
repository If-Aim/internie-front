// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./protectedRoute";

import Login from "./pages/login/login";
import KakaoCallback from "./pages/kakaoCallback";
import StudentApp from "./pages/student/studentApp";
import AdminRoute from "./adminRoute";
import AdminApp from "./pages/admin/adminApp";
import OnBoarding from "./pages/login/mobile/onBoarding";

export default function App(): React.ReactElement {
  return (
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
        <Route path="/admin/*" element={<AdminApp />} />
      </Route>

      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}