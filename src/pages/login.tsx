import { useTranslation } from "react-i18next";

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

//const GOOGLE_AUTH_URL = "/auth/google"; // 추후 추가

export default function Login() {
  const { t, i18n } = useTranslation();
  const go = (url: string) => { window.location.href = url; };
  const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
  const toggleLang = async () => {
    await i18n.changeLanguage(isKo ? "en" : "ko");
  };
  return (
    <div className="page">
      {/* 임시 언어 토글 */}
      <button
        type="button"
        className="lang-toggle"
        onClick={toggleLang}
        aria-label={isKo ? "Switch language to English" : "언어를 한국어로 변경"}
      >
        {isKo ? "EN" : "KO"}
      </button>
      <div className="header-spacer" aria-hidden="true" />
      <main className="login-wrap">
        <h1 className="brand">
          <img src="/internie_Logo.svg" alt="internie" width={183} height={35} />
        </h1>

        <button type="button" className="btn btn-kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
          <span className="ico ico-kakao" aria-hidden="true">
            <img src="/kakao_Logo.svg" alt="" width={20} height={20} />
          </span>
          <span className="btn-text">{t("login.startWithKakao")}</span>
        </button>

        {/*<button
          type="button"
          className="btn btn-google"
          onClick={() => go(GOOGLE_AUTH_URL)}
          aria-label="Google로 시작하기">
          <span className="ico ico-google" aria-hidden="true">
            <img src="/google_Logo.svg" alt="" width={20} height={20} />
          </span>
          <span className="btn-text">Google로 시작하기</span>
        </button>*/}
      </main>
    </div>
  );
}