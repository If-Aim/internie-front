import "../styles/login.css";
const KAKAO_AUTH_URL = "/api/auth/kakao";   // 백엔드 라우트에 맞게 수정
const GOOGLE_AUTH_URL = "/api/auth/google"; // 백엔드 라우트에 맞게 수정

// 백엔드가 내부에서 redirect_uri를 사용한다면 이렇게 붙여 보냅니다.
//const ORIGIN = window.location.origin;
//const KAKAO_AUTH_URL  = `/api/auth/kakao?redirect_uri=${encodeURIComponent(ORIGIN + "/auth/callback?provider=kakao")}`;
//const GOOGLE_AUTH_URL = `/api/auth/google?redirect_uri=${encodeURIComponent(ORIGIN + "/auth/callback?provider=google")}`;
// TODO: OAuth2 완료 후 /login/success에서 return_to 처리
// NOTE: 백엔드가 Spring Security 기본 경로면 /oauth2/authorization/{provider}로 교체 가능

/**
 * 로그인 화면 컴포넌트
 * 역할: 소셜 로그인 시작 버튼을 노출하고, 공급자 승인 페이지로 리다이렉트
 */
export default function Login() {
  /**
	 * 주 역할: 주어진 URL로 즉시 이동
	 * 왜: OAuth2 Authorization Code 플로우는 브라우저 리다이렉트로 시작함
	 */
  const go = (url: string) => { window.location.href = url; };

  return (
    <>
      {/* 빈 헤더 공간 */}
      <div className="header-spacer" aria-hidden="true" />
      
      <main className="login-wrap">
        <h1 className="brand">
          <img src="/internie_Logo.svg" alt="internie" width={183} height={35} />
        </h1>

        <button type="button" className="btn btn-kakao" onClick={() => go(KAKAO_AUTH_URL)} aria-label="카카오로 시작하기">
          <span className="ico ico-kakao" aria-hidden="true">
              <img src="/kakao_Logo.svg" alt="" width={20} height={20} />
          </span>
          <span className="btn-text">카카오로 시작하기</span>
        </button>

        <button
          type="button"
          className="btn btn-google"
          onClick={() => go(GOOGLE_AUTH_URL)}
          aria-label="Google로 시작하기">
          <span className="ico ico-google" aria-hidden="true">
              <img src="/google_Logo.svg" alt="" width={20} height={20} />
          </span>
          <span className="btn-text">Google로 시작하기</span>
        </button>
      </main>
    </>
  );
}