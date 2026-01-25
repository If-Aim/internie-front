// src/pages/admin/desktop/adminApp.tsx
// 관리자화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminRoute from "../../../adminRoute";
import AdminHome from "./home";
import Users from "./list/users";
import Certificates from "./upload/certificates";
import Reports from "./download/reports";


export default function DesktopAdminApp(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AdminRoute />}>
        <Route element={<AdminHome />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<Users />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="users" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}