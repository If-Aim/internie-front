// src/protectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const isLogin = localStorage.getItem("accessToken"); 

  if (!isLogin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}