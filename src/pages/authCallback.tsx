import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * AuthCallback
 * 역할: 공급자 승인 후 콜백 쿼리(code/state/provider)를 받아
 *       백엔드 교환 엔드포인트를 호출하고, 세션 수립 후 라우팅합니다.
 */
export default function AuthCallback() {
  /**
	 * NOTE: 백엔드가 HttpOnly 세션 쿠키를 발급하면
	 *       프론트는 토큰을 저장하지 않습니다.
	 * TODO: 실패 사유를 쿼리로 받아 사용자 메시지 노출
	 */
  const nav = useNavigate();
  const [sp] = useSearchParams();

  useEffect(() => {
    (async () => {
      // ① 백엔드가 code를 교환하도록 호출 (경로는 서버에 맞추세요)
      const provider = sp.get("provider");   // kakao | google
      const code = sp.get("code");           // OAuth code
      const state = sp.get("state") || "";

      // 백엔드가 httpOnly 쿠키를 심어주면 프론트는 저장 불필요
      if (provider && code) {
        const res = await fetch(`/api/auth/callback?provider=${provider}&code=${code}&state=${state}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }

      // ② 토큰을 URL로 전달받는 방식이라면 (예: hash)
      // const token = new URLSearchParams(window.location.hash.slice(1)).get("access_token");
      // if (token) localStorage.setItem("access_token", token);

      // 완료 후 이동
      nav("/schedule/intro", { replace: true });
    })().catch(() => {
      nav("/login", { replace: true });
    });
  }, [nav, sp]);

  return null; // 로딩 UI가 필요하면 스피너 렌더
}
