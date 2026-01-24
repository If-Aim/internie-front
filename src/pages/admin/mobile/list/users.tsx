// src/pages/admin/mobile/list/users.tsx
// 사용자 목록 페이지 (모바일)
import React from "react";
import { useNavigate } from "react-router-dom";
import { getUserMe, ApiError } from "../../../../api/client";

export default function AdminUsersMobile(): React.ReactElement {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await getUserMe();
        if (!mounted) return;

        if (me.role === "ROLE_ADMIN") {
          setIsAdmin(true);
        } else {
          alert("관리자만 접근할 수 있는 페이지입니다.");
          navigate("/student", { replace: true });
        }
      } catch (e) {
        if (!mounted) return;

        if (e instanceof ApiError) {
          alert("접근 권한이 없습니다.");
        }
        navigate("/student", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>확인 중…</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
          padding: 24,
        }}
      >
        <img
          src="/internie_mascot_normal.png"
          alt=""
          style={{ width: 120, marginBottom: 16 }}
        />
        <h2 style={{ marginBottom: 8 }}>모바일 관리자 화면 준비중</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          관리자 기능은 PC 환경에서 이용해주세요.
        </p>
      </div>
    );
  }

  return <></>;
}
