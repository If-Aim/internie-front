// src/pages/student/desktop/studentApp.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../../login/login";
import MobileStudentApp from "../mobile/studentApp";

export default function StudentApp(): React.ReactElement {
  const isAuthed = !!localStorage.getItem("accessToken");

  if (isAuthed) {
    // PC에서도 로그인되면 모바일 학생앱을 그대로 보여줌 (임시)
    return <MobileStudentApp />;
  }

  // 로그인 안 되었으면 로그인 화면만
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<Login />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}