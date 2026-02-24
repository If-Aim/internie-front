// src/pages/kakaoCallback.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginWithKakao, routeAfterLoginFromLogin } from "../api/client";

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

				const login = await loginWithKakao(code, redirectUri);

				const nextPath = routeAfterLoginFromLogin(login);

				navigate(nextPath, { replace: true });

			} catch (e) {
				console.error("로그인 실패:", e);
				navigate("/login", { replace: true });
			}
		})();
	}, [navigate, searchParams]);

  return <div />;
}
