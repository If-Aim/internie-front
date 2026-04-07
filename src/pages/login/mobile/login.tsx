// src/pages/login/mobile/login.tsx
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, loginWithGoogle } from "../../../api/client";
import "./login.css";

declare global {
    interface Window {
        google?: any;
    }
}

const kakaoClientId = import.meta.env.VITE_KAKAO_REST_API_KEY;
const origin = window.location.origin;
const kakaoRedirectUri = `${origin}/oauth/kakao/callback`;
const kakaoAuthUrl =
    "https://kauth.kakao.com/oauth/authorize"
    + `?response_type=code`
    + `&client_id=${encodeURIComponent(kakaoClientId)}`
    + `&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}`;

export default function Login() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const googleBtnRef = useRef<HTMLDivElement | null>(null);

    const go = (url: string) => {
        window.location.href = url;
    };

    const handleGoogleClick = () => {
        const target = googleBtnRef.current?.querySelector("div[role='button']") as HTMLDivElement | null;
        if (target) {
            target.click();
            return;
        }
        alert("구글 로그인 버튼을 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    };

    useEffect(() => {
        let intervalId: number | null = null;

        const initializeGoogleLogin = () => {
            if (!window.google || !googleBtnRef.current) return false;

            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: async (response: any) => {
                    const idToken = response?.credential;

                    if (!idToken) {
                        console.error("Google idToken을 받지 못했습니다.");
                        return;
                    }

                    try {
                        const data = await loginWithGoogle(idToken);
                        navigate(data.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
                    } catch (e) {
                        console.error("구글 로그인 실패", e);

                        if (e instanceof ApiError && e.code === "AUTH_EXISTING_ACCOUNT") {
                            alert("이미 존재하는 계정입니다. 기존 계정으로 로그인해주세요.");
                            return;
                        }

                        alert("구글 로그인에 실패했습니다.");
                    }
                },
            });

            googleBtnRef.current.innerHTML = "";

            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: "outline",
                size: "large",
                width: 260,
                text: "signin_with",
                shape: "rectangular",
            });

            return true;
        };

        if (!initializeGoogleLogin()) {
            intervalId = window.setInterval(() => {
                if (initializeGoogleLogin() && intervalId) {
                    window.clearInterval(intervalId);
                }
            }, 300);
        }

        return () => {
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [navigate]);
    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
    function handleServicePreparing() {
		alert(isKo ? "서비스 준비중입니다.": "Coming Soon");
	}
    return (
        <div className="page">
            <div className="header-spacer" aria-hidden="true" />
            <main className="login-wrap">
                <div className="login-content">
                    <div className="login-center">
                        <div className="login-mascot">
                            <img src="/internie_mascot_normal.png" alt="internie" />
                        </div>
                        <h1 className="brand">internie</h1>
                        <p className="brand-sub">하루 5분으로 진짜 스펙 만들기</p>
                    </div>

                    <div className="login-actions">
                        <button type="button" className="btn btn-kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")} > 
                            <span className="btn-icon" aria-hidden="true">
                                <img src="/logos/kakao_Logo.svg" alt="" />
                            </span>
                            <span className="btn-text">{t("login.startWithKakao")}</span>
                        </button>

                        <button type="button" className="btn btn-google" onClick={handleServicePreparing} aria-label={t("login.startWithGoogleAria")} >
                            <span className="btn-icon" aria-hidden="true">
                                <img src="/logos/google_Logo.svg" alt="" />
                            </span>
                            <span className="btn-text">{t("login.startWithGoogle")}</span>
                        </button>

                        <div className="google-hidden-btn" aria-hidden="true">
                            <div ref={googleBtnRef} id="google-login-btn" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}