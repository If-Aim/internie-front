import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    if (!token) {
      alert("로그인이 필요한 서비스입니다.");
    }
  }, [token]);

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}