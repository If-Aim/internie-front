// src/pages/kakaoCallback.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginWithKakao, type LoginResponse, ApiError } from "../api/client";

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
                const body: LoginResponse = await loginWithKakao(code, redirectUri);

                navigate(body.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
            } catch (e) {
                if (e instanceof ApiError) {
                    console.error("로그인 실패:", e.status, e.bodyText ?? e.message);
                } else {
                    console.error("네트워크/파싱 에러:", e);
                }
                navigate("/login", { replace: true });
            }
        })();
    }, [navigate, searchParams]);

    return <div />;
}