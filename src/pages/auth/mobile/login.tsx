import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
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

export default function Login() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const googleInitializedRef = useRef(false);

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    
    const go = (url: string) => {
        window.location.href = url;
    };

    const handleGoogleClick = () => {
        if (!window.google?.accounts?.id) {
            alert(t("login.googleNotReady"));
            return;
        }

        window.google.accounts.id.prompt();
    };

    const handleLocalLogin = async () => {
        const trimmedLoginId = loginId.trim();
        const trimmedPassword = password.trim();

        if (!trimmedLoginId || !trimmedPassword) {
            alert("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        try {
            setSubmitting(true);
            const data = await loginWithLocal({
                loginId: trimmedLoginId,
                password: trimmedPassword,
            });
            navigate(data.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
        } catch (e) {
            console.error("일반 로그인 실패", e);

            if (e instanceof ApiError && e.message.includes("탈퇴한 회원")) {
                setLoginError(t("login.withdrawnAccount"));
                return;
            }

            setLoginError(t("login.invalidLogin"));
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

                        if (e instanceof ApiError && e.message.includes("탈퇴한 회원")) {
                            setLoginError(t("login.withdrawnAccount"));
                            return;
                        }

                        if (e instanceof ApiError) {
                            setLoginError(e.message || t("login.googleLoginFailed"));
                            return;
                        }

                        setLoginError(t("login.googleLoginFailed"));
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
        <div className="mobile-login-page">
            <div className="mobile-login-safe" aria-hidden="true" />
            <main className="mobile-login-main">
                <section className="mobile-login-logo-section">
                    <h1 className="mobile-login-logo">internie</h1>
                </section>

                <section className="mobile-login-form-section">
                    <div className="mobile-login-input-wrap">
                        <input
                            className="mobile-login-input"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder={t("login.idPlaceholder")}
                            autoComplete="username"
                        />
                    </div>

                    <div className="mobile-login-input-wrap mobile-login-password-wrap">
                        <input
                            className={`mobile-login-input mobile-login-password-input ${loginError ? "is-error" : ""}`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("login.passwordPlaceholder")}
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                        />
                        <button type="button" className="mobile-login-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={t("login.passwordVisibilityToggle") || "비밀번호 표시 전환"}>
                            <img src={showPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                        </button>
                    </div>
                    {loginError && (
                        <div className="mobile-login-error-text">
                            {loginError}
                        </div>
                    )}

                    <div className="mobile-login-find-auth">
                        <button type="button" className="mobile-login-find-auth-btn" onClick={() => navigate("/find-id")}>
                            {t("login.findId")}
                        </button>
                        <span className="mobile-login-find-auth-divider" aria-hidden="true"></span>
                        <button type="button" className="mobile-login-find-auth-btn" onClick={() => navigate("/reset-password")}>
                            {t("login.findPassword")}
                        </button>
                    </div>
                    <button type="button" className="mobile-login-submit-btn" onClick={handleLocalLogin} disabled={submitting}>
                        {submitting ? t("login.loginLoading") : t("login.loginButton")}
                    </button>
                </section>

                <section className="mobile-login-social-section">
                    <button type="button" className="mobile-login-social-btn mobile-login-kakao-btn" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
                        <span className="mobile-login-social-icon" aria-hidden="true">
                            <img src="/logos/kakao_Logo.svg" alt="" />
                        </span>
                        <span className="mobile-login-social-text">{t("login.startWithKakao")}</span>
                    </button>

                    <button type="button" className="mobile-login-social-btn mobile-login-google-btn" onClick={handleGoogleClick} aria-label={t("login.startWithGoogleAria")}>
                        <span className="mobile-login-social-icon" aria-hidden="true">
                            <img src="/logos/google_Logo.svg" alt="" />
                        </span>
                        <span className="mobile-login-social-text">{t("login.startWithGoogle")}</span>
                    </button>
                </section>

                <section className="mobile-login-signup-section">
                    <span className="mobile-login-signup-text">{t("login.signupPrompt")}</span>
                    <button type="button" className="mobile-login-signup-link" onClick={() => navigate("/signup")}>
                        {t("login.signupLink")}
                    </button>
                </section>

                <section className="mobile-login-policy-section">
                    <button type="button" className="mobile-login-policy-link" onClick={() => navigate("/privacy-policy")}>
                        개인정보 처리방침
                    </button>
                </section>
                
                <div className="bottom-spacer"></div>
            </main>
        </div>
    );
}