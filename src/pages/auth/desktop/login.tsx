import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError, loginWithGoogle, loginWithLocal } from "../../../api/client";
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

export default function Login(): React.ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const googleInitializedRef = useRef(false);

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const go = (url: string) => {
        window.location.href = url;
    };

    const canLogin = loginId.trim().length > 0 && password.length > 0;
    const handleGoogleClick = () => {
        if (!window.google?.accounts?.id) {
            alert(t("login.googleNotReady"));
            return;
        }

        window.google.accounts.id.prompt();
    };
    const handleLocalLogin = async () => {
        const trimmedLoginId = loginId.trim();

        if (!trimmedLoginId || !password) {
            alert("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);
            const data = await loginWithLocal({
                loginId: trimmedLoginId,
                password,
            });
            navigate(data.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
        } catch (e: any) {
            console.error("일반 로그인 실패", e);
            alert(e?.message || "로그인에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        let intervalId: number | null = null;

        const initializeGoogleLogin = () => {
            if (!window.google?.accounts?.id) return false;
            if (googleInitializedRef.current) return true;

            googleInitializedRef.current = true;

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

                        if (e instanceof ApiError) {
                            alert(e.message || t("login.loginWithGoogle"));
                            return;
                        }

                        alert(t("login.loginWithGoogle"));
                    }
                },
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
    }, [navigate, t]);

    return (
        <div className="login-desktop-page">
            <header className="login-desktop-header">
                <div className="login-desktop-header-inner">
                    <span className="login-desktop-header-logo">internie</span>
                </div>
            </header>

            <main className="login-desktop-main">
                <div className="login-desktop-container">
                    <h1 className="login-desktop-title">{t("login.desktopTitle")}</h1>
                    <p className="login-desktop-subtitle">{t("login.desktopSubtitle")}</p>

                    {/* <div className="login-desktop-tabs">
                        <button type="button" className="login-desktop-tab is-active" disabled>학생 회원</button>
                        <button type="button" className="login-desktop-tab" disabled>기업 회원</button>
                    </div> */}

                    <section className="login-desktop-card">
                        <div className="login-desktop-ac">
                            <div className="login-desktop-title-row">
                                <span className="login-desktop-input-title">{t("login.id")}</span>
                                <button type="button" className="login-desktop-input-findac" onClick={() => navigate("/find-id")} >
                                    {t("login.findId")}
                                </button>
                            </div>
                            <input
                                className="login-desktop-input"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                placeholder={t("login.idPlaceholder")}
                                autoComplete="username"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && canLogin && !submitting) {
                                        handleLocalLogin();
                                    }
                                }}
                            />
                        </div>

                        <div className="login-desktop-ac">
                            <div className="login-desktop-title-row">
                                <span className="login-desktop-input-title">{t("login.pw")}</span>
                                <button type="button" className="login-desktop-input-findac" onClick={() => navigate("/reset-password")} >
                                    {t("login.findPassword")}
                                </button>
                            </div>

                            <div className="login-desktop-input-wrap">
                                <input
                                    className="login-desktop-input is-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t("login.passwordPlaceholder")}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && canLogin && !submitting) {
                                            handleLocalLogin();
                                        }
                                    }}
                                />
                                <button type="button" className="login-desktop-pw-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"} >
                                    <img className="login-desktop-pw-blind" src={showPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                </button>
                            </div>
                        </div>

                        <button type="button" className="login-desktop-btn primary" onClick={handleLocalLogin} disabled={!canLogin || submitting} >
                            {submitting ? t("login.loginLoading") : t("login.loginButton")}
                        </button>

                        <div className="login-desktop-social-divider">
                            <span>{t("login.socialLogin")}</span>
                        </div>

                        <div className="login-desktop-socials">
                            <button type="button" className="login-desktop-btn google" onClick={handleGoogleClick} aria-label={t("login.startWithGoogleAria")} >
                                <img src="/logos/google_Logo.svg" alt="" width={16} height={16} />
                                <span>{t("login.loginWithGoogle")}</span>
                            </button>

                            <button type="button" className="login-desktop-btn kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
                                <img src="/logos/kakao_Logo.svg" alt="" width={16} height={16} />
                                <span>{t("login.loginWithKakao")}</span>
                            </button>
                        </div>

                        <div className="login-desktop-join">
                            <span>{t("login.signupPrompt")}</span>
                            <button type="button" onClick={() => navigate("/signup")}>{t("login.signupLink")}</button>
                        </div>
                        <div className="login-desktop-policy">
                            <button type="button" onClick={() => navigate("/privacy-policy")}>
                                개인정보 처리방침
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}