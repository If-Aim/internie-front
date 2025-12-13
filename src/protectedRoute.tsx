import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token"); // 로그인 여부 판단

  if (!token) return <Navigate to="/login" replace />;

  return children;
}
