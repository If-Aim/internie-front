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
    <div className="login-desktop-page">
      <header className="login-desktop-header">
        <div className="login-desktop-header-inner">
          <img
            src="/internie_Logo_thin.png"
            alt="internie"
            className="login-desktop-logo"
          />
        </div>
      </header>

      <main className="login-desktop-main">
        <div className="login-desktop-container">
          <h2 className="login-desktop-title">
            PC버전은 현재 준비중입니다
          </h2>
          <p className="login-desktop-subtitle">
            모바일에서 카카오 로그인으로 이용하실 수 있습니다.
          </p>

          <div className="login-desktop-tabs">
            <button
              type="button"
              className="login-desktop-tab is-active"
              disabled
            >
              학생 회원
            </button>
            <button
              type="button"
              className="login-desktop-tab"
              disabled
            >
              기업 회원
            </button>
          </div>

          <section className="login-desktop-card">
            <input
              className="login-desktop-input"
              disabled
              placeholder="이메일을 입력하세요"
            />
            <input
              className="login-desktop-input"
              disabled
              placeholder="비밀번호를 입력하세요"
              type="password"
            />

            <button
              type="button"
              className="login-desktop-btn primary"
              disabled
            >
              로그인하기
            </button>

            <button
              type="button"
              className="login-desktop-btn kakao"
              onClick={() => go(kakaoAuthUrl)}
              aria-label={t("login.startWithKakaoAria")}
            >
              <img src="/kakao_Logo.svg" alt="" width={20} height={20} />
              <span>{t("login.startWithKakao")}</span>
            </button>

            <div className="login-desktop-join">
              <span>계정이 없으신가요?</span>{" "}
              <button type="button" disabled>
                회원가입
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
