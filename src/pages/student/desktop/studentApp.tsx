// src/pages/student/desktop/studentApp.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../../login/login"; // TODO: PC 버전 로그인 페이지 구성

export default function StudentApp(): React.ReactElement {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<Login />} />

      {/* /student 아래 다른 경로 접근 시 모두 로그인으로 이동 */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}