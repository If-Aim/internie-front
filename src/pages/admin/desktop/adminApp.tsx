// src/pages/admin/desktop/adminApp.tsx
// 관리자화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Users from "./list/users";

export default function DesktopAdminApp(): React.ReactElement {
  return (
    <Routes>
      <Route index element={<Navigate to="users" replace />} />
      <Route path="users" element={<Users />} />
      <Route path="*" element={<Navigate to="users" replace />} />
    </Routes>
  );
}