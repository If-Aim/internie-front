// src/pages/kakaoCallback.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function KakaoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    // React.StrictMode에서 두 번 실행 방지
    if (ranRef.current) return;
    ranRef.current = true;

    const code = searchParams.get("code");
    
    // 코드가 없으면 로그인 화면으로 튕기기
    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const code = searchParams.get("code");
        const origin = window.location.origin;
        const currentRedirectUri = `${origin}/oauth/kakao/callback`;
        console.log("보내는 데이터:", { code, redirect_uri: currentRedirectUri });

        const res = await fetch(`/auth/kakao`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code, redirect_uri: currentRedirectUri }),
        });

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

        // [핵심] 헤더에서 토큰 꺼내기
        // Authorization 헤더 확인 (대소문자 상관없이 가져옴)
        const accessToken = res.headers.get("Authorization") || res.headers.get("authorization");

        if (accessToken) {
          // 토큰 저장 (Bearer 포함 여부는 백엔드 응답에 따라 다르지만 보통 포함됨)
          localStorage.setItem("accessToken", accessToken);
          console.log("로그인 성공! 토큰 저장됨.");
          navigate("/", { replace: true });
        } else {
          console.error("헤더에 Access Token이 없습니다.");
          navigate("/login", { replace: true });
        }

      } catch (e) {
        console.error("네트워크 에러:", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, searchParams]);

  return <div></div>;
}