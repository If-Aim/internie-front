import "../styles/login.css";

//const origin = window.location.origin;
const kakaoClientId = import.meta.env.VITE_KAKAO_REST_API_KEY;
const origin = window.location.origin; 
const kakaoRedirectUri = `${origin}/oauth/kakao/callback`;
const kakaoAuthUrl =
	"https://kauth.kakao.com/oauth/authorize"
	+ `?response_type=code`
	+ `&client_id=${encodeURIComponent(kakaoClientId)}`
	+ `&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}`;


const GOOGLE_AUTH_URL = "/auth/google"; // 백엔드 라우트에 맞게 수정

export default function Login() {

  const go = (url: string) => { window.location.href = url; };

  return (
    <>
      <div className="header-spacer" aria-hidden="true" />
      
      <main className="login-wrap">
        <h1 className="brand">
          <img src="/internie_Logo.svg" alt="internie" width={183} height={35} />
        </h1>

        <button type="button" className="btn btn-kakao" onClick={() => go(kakaoAuthUrl)} aria-label="카카오로 시작하기">
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