// src/adminJumpRoute.tsx
// 기본 관리자 + 점프 관리자용 protectedRoute
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { ApiError, checkIsJumpOrAdmin } from "./api/client";

export default function AdminJumpRoute() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = await checkIsJumpOrAdmin();
        if (mounted) setAllowed(ok);
      } catch (e) {
        if (mounted) setAllowed(false);
        if (!(e instanceof ApiError)) console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    alert("관리자 또는 점프 관리자만 접근할 수 있는 페이지입니다.");
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
}
