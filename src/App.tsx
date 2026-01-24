// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login/login";
import KakaoCallback from "./pages/kakaoCallback";
import StudentApp from "./pages/student/studentApp";

import AdminApp from "./pages/admin/adminApp";
export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />

      <Route path="/student/*" element={<StudentApp />} />
      <Route path="/" element={<Navigate to="/student" replace />} />

      {/* 관리자용 라우트 */}
      <Route path="/admin/*" element={<AdminApp />} />

      <Route path="/mypage" element={<Navigate to="/student/mypage" replace />} />
      <Route path="/schedule/new" element={<Navigate to="/student/schedule/new" replace />} />
      
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}