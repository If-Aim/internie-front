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
        const currentRedirectUri = `${origin}/oauth/kakao/callback`;

        const res = await loginWithKakao(code, currentRedirectUri);

        if (res.status === 403) {
          alert("서버 보안 설정(403) 때문에 막혔습니다. 백엔드 개발자에게 문의해주세요.");
          navigate("/login", { replace: true });
          return;
        }

        if (!res.ok) {
          console.error("로그인 실패:", res.status);
          navigate("/login", { replace: true });
          return;
        }

        const auth =
          res.headers.get("authorization") ||
          res.headers.get("Authorization");

        if (!auth) {
          console.error("헤더에 Authorization이 없습니다.");
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("accessToken", auth);
        navigate("/", { replace: true });
      } catch (e) {
        console.error("네트워크 에러:", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, searchParams]);

  return <div />;
}
