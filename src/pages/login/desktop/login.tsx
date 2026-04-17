// src/pages/login/desktop/login.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./login.css";

const kakaoClientId = import.meta.env.VITE_KAKAO_REST_API_KEY;
const origin = window.location.origin;
const kakaoRedirectUri = `${origin}/oauth/kakao/callback`;
const kakaoAuthUrl =
    "https://kauth.kakao.com/oauth/authorize"
    + `?response_type=code`
    + `&client_id=${encodeURIComponent(kakaoClientId)}`
    + `&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}`;

export default function Login(): React.ReactElement {
    const { t, i18n } = useTranslation();

    const go = (url: string) => {
        window.location.href = url;
    };

    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");

    function handleServicePreparing() {
        alert(isKo ? "서비스 준비중입니다." : "Coming Soon");
    }

    return (
        <div className="login-desktop-page">
            <header className="login-desktop-header">
                <div className="login-desktop-header-inner">
                    <span className="login-desktop-header-logo">internie</span>
                </div>
            </header>

            <main className="login-desktop-main">
                <div className="login-desktop-container">
                    <h1 className="login-desktop-title">환영합니다</h1>
                    <p className="login-desktop-subtitle">과정이 만드는 새로운 채용의 기준, 인터니</p>

                    <div className="login-desktop-tabs">
                        <button type="button" className="login-desktop-tab is-active" disabled>학생 회원</button>
                        <button type="button" className="login-desktop-tab" disabled>기업 회원</button>
                    </div>

                    <section className="login-desktop-card">
                        <div className="login-desktop-ac">
                            <span className="login-desktop-input-title">아이디</span>
                            <input className="login-desktop-input" disabled placeholder="아이디를 입력해주세요" />
                        </div>

                        <div className="login-desktop-ac">
                            <div className="login-desktop-pw-title-row">
                                <span className="login-desktop-input-title">비밀번호</span>
                                <a className="login-desktop-input-findpw">비밀번호 찾기</a>
                            </div>

                            <div className="login-desktop-input-wrap">
                                <input className="login-desktop-input is-password" disabled placeholder="비밀번호를 입력해주세요" type="password" />
                                <img className="login-desktop-pw-blind" src="/icons/carbon_view.svg" alt="" />
                            </div>
                        </div>

                        <button type="button" className="login-desktop-btn primary" disabled>로그인</button>

                        <div className="login-desktop-social-divider">
                            <span>또는 간편 로그인</span>
                        </div>

                        <div className="login-desktop-socials">
                            <button type="button" className="login-desktop-btn google" onClick={handleServicePreparing} aria-label={t("login.startWithGoogleAria")}>
                                <img src="/logos/google_Logo.svg" alt="" width={16} height={16} />
                                <span>{t("login.loginWithGoogle")}</span>
                            </button>

                            <button type="button" className="login-desktop-btn kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
                                <img src="/logos/kakao_Logo.svg" alt="" width={16} height={16} />
                                <span>{t("login.loginWithKakao")}</span>
                            </button>
                        </div>

                        <div className="login-desktop-join">
                            <span>인터니가 처음이라면?</span>
                            <button type="button" disabled>회원가입</button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}