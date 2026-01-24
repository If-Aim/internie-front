// src/pages/kakaoCallback.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginWithKakao } from "../api/client";

export default function KakaoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const code = searchParams.get("code");
    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const origin = window.location.origin;
        const redirectUri = `${origin}/oauth/kakao/callback`;

        const res = await loginWithKakao(code, redirectUri);

        if (!res.ok) {
          console.error("로그인 실패:", res.status, await res.text().catch(() => ""));
          navigate("/login", { replace: true });
          return;
        }

        const auth = res.headers.get("Authorization") || res.headers.get("authorization");
        if (!auth) {
          console.error("헤더에 Authorization이 없습니다.");
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("accessToken", auth);
        navigate("/student", { replace: true });
      } catch (e) {
        console.error("네트워크 에러:", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, searchParams]);

  return <div />;
}
