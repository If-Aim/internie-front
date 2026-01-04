// src/pages/login/desktop/login.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./login.css";

const kakaoClientId = import.meta.env.VITE_KAKAO_REST_API_KEY;
const origin = window.location.origin;
const kakaoRedirectUri = `${origin}/oauth/kakao/callback`;
const kakaoAuthUrl =
  "https://kauth.kakao.com/oauth/authorize" +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(kakaoClientId)}` +
  `&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}`;

export default function Login(): React.ReactElement {
  const { t } = useTranslation();
  const go = (url: string) => {
    window.location.href = url;
  };

  return (
    <div className="page desktop">
      <header className="topbar">
        <img src="/internie_Logo.svg" alt="internie" className="topbar-logo" />
      </header>

      <main className="login-desktop-wrap">
        {/* TODO: 로그인 구현 완료 후 문구 변경 */}
        <h2 className="title">PC버전은 현재 준비중입니다</h2>
        <p className="subtitle">모바일에서 카카오 로그인으로 이용하실 수 있습니다.</p>

        <div className="role-tabs">
          <button type="button" className="tab active" disabled>
            학생 회원
          </button>
          <button type="button" className="tab" disabled>
            기업 회원
          </button>
        </div>

        <section className="login-card">
          <div className="form">
            <input disabled placeholder="이메일을 입력하세요" />
            <input disabled placeholder="비밀번호를 입력하세요" />
            <button type="button" className="btn primary" disabled>
              로그인하기
            </button>

            <button
              type="button"
              className="btn btn-kakao"
              onClick={() => go(kakaoAuthUrl)}
              aria-label={t("login.startWithKakaoAria")}
            >
              <span className="ico ico-kakao" aria-hidden="true">
                <img src="/kakao_Logo.svg" alt="" width={20} height={20} />
              </span>
              <span className="btn-text">{t("login.startWithKakao")}</span>
            </button>

            <div className="join">
              <span>계정이 없으신가요?</span> <button disabled>회원가입</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
