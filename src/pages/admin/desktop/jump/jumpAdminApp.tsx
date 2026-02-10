// src/pages/admin/desktop/jump/jumpAdminApp.tsx
// 관리자화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminJumpRoute from "../../../../adminJumpRoute";
import JumpAdminHome from "./home";
import JumpUsers from "./analysis/users";
import JumpReports from "./record/reports";


export default function DesktopAdminApp(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AdminJumpRoute />}>
        <Route element={<JumpAdminHome />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<JumpUsers />} />
          <Route path="reports" element={<JumpReports />} />
          <Route path="*" element={<Navigate to="users" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}