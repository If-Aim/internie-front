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
    const { t } = useTranslation();
    const googleBtnRef = useRef<HTMLDivElement | null>(null);

    const go = (url: string) => {
        window.location.href = url;
    };

    useEffect(() => { // 구글 로그인 로컬
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
    }, []);

    return (
        <div className="page">
            <div className="header-spacer" aria-hidden="true" />
            <main className="login-wrap">
                <h1 className="brand">
                    <img src="/logos/internie_Logo.svg" alt="internie" width={183} height={35} />
                </h1>

                <button
                    type="button"
                    className="btn btn-kakao"
                    onClick={() => go(kakaoAuthUrl)}
                    aria-label={t("login.startWithKakaoAria")}
                >
                    <span className="ico ico-kakao" aria-hidden="true">
                        <img src="/logos/kakao_Logo.svg" alt="" width={20} height={20} />
                    </span>
                    <span className="btn-text">{t("login.startWithKakao")}</span>
                </button>

                {/* <div className="btn-google">
                    <div ref={googleBtnRef} id="google-login-btn" />
                </div> */}
            </main>
        </div>
    );
}