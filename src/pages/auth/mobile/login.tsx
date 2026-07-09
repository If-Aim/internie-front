import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, loginWithGoogle, loginWithLocal } from "../../../api/client";
import "./login.css";

import SeoMeta from "../../../utils/SeoMetadata";

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

const loadGoogleScript = () => {
    return new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve();
            return;
        }

        let completed = false;

        const timeoutId = window.setTimeout(() => {
            if (completed) return;

            completed = true;

            if (window.google?.accounts?.id) {
                resolve();
                return;
            }

            reject(new Error("Google SDK load timeout"));
        }, 8000);

        const resolveIfReady = () => {
            if (completed) return;

            if (window.google?.accounts?.id) {
                completed = true;
                window.clearTimeout(timeoutId);
                resolve();
            }
        };

        const rejectOnce = () => {
            if (completed) return;

            completed = true;
            window.clearTimeout(timeoutId);
            reject(new Error("Google SDK load failed"));
        };

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

        if (existingScript) {
            existingScript.addEventListener("load", resolveIfReady, { once: true });
            existingScript.addEventListener("error", rejectOnce, { once: true });
            resolveIfReady();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolveIfReady;
        script.onerror = rejectOnce;
        document.head.appendChild(script);
    });
};

export default function Login() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage || i18n.language;
    const isEnglish = currentLanguage.startsWith("en");
    const googleInitializedRef = useRef(false);

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [googleReady, setGoogleReady] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(true);
    const [googleLoadFailed, setGoogleLoadFailed] = useState(false);

    const go = (url: string) => {
        window.location.href = url;
    };

    const handleGoogleClick = () => {
        if (googleLoading || googleLoadFailed || !googleReady || !window.google?.accounts?.id) {
            setLoginError(t("login.googleNotReady"));
            return;
        }

        window.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed?.()) {
                console.error("Google prompt not displayed", notification.getNotDisplayedReason?.());
                setLoginError(t("login.googleLoginFailed"));
                return;
            }

            if (notification.isSkippedMoment?.()) {
                console.error("Google prompt skipped", notification.getSkippedReason?.());
                setLoginError(t("login.googleLoginFailed"));
                return;
            }

            if (notification.isDismissedMoment?.()) {
                console.error("Google prompt dismissed", notification.getDismissedReason?.());
            }
        });
    };

    const handleLocalLogin = async () => {
        const trimmedLoginId = loginId.trim();
        const trimmedPassword = password.trim();

        if (!trimmedLoginId || !trimmedPassword) {
            alert(t("signup.required"));
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
        let cancelled = false;

        const initializeGoogleLogin = async () => {
            try {
                setGoogleReady(false);
                setGoogleLoading(true);
                setGoogleLoadFailed(false);

                await loadGoogleScript();

                if (cancelled) {
                    return;
                }

                const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

                if (!googleClientId) {
                    console.error("구글 로그인이 설정되지 않았습니다.");
                    setGoogleReady(false);
                    setGoogleLoading(false);
                    setGoogleLoadFailed(true);
                    setLoginError(t("login.googleLoadFailed"));
                    return;
                }

                if (!window.google?.accounts?.id) {
                    setGoogleReady(false);
                    setGoogleLoading(false);
                    setGoogleLoadFailed(true);
                    setLoginError(t("login.googleNotReady"));
                    return;
                }

                if (googleInitializedRef.current) {
                    setGoogleReady(true);
                    setGoogleLoading(false);
                    setGoogleLoadFailed(false);
                    return;
                }

                googleInitializedRef.current = true;

                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response: any) => {
                        const idToken = response?.credential;

                        if (!idToken) {
                            console.error("Google idToken을 받지 못했습니다.", response);
                            setLoginError(t("login.googleLoginFailed"));
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

                setGoogleReady(true);
                setGoogleLoading(false);
                setGoogleLoadFailed(false);
            } catch (e) {
                console.error("Google SDK 로드 실패", e);
                setGoogleReady(false);
                setGoogleLoading(false);
                setGoogleLoadFailed(true);
                setLoginError(t("login.googleLoadFailed"));
            }
        };

        initializeGoogleLogin();

        return () => {
            cancelled = true;
        };
    }, [navigate, t]);

    return (
        <>
            <SeoMeta
                title={isEnglish ? "Login | Internie" : "로그인 | 인터니"}
                description={isEnglish ? "Sign in to Internie." : "인터니 서비스에 로그인합니다."}
                lang={isEnglish ? "en" : "ko"}
                noindex
            />
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
                            <button type="button" className="mobile-login-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={t("login.pw")}>
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
                        {!isEnglish && (
                            <button type="button" className="mobile-login-social-btn mobile-login-kakao-btn" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
                                <span className="mobile-login-social-icon" aria-hidden="true">
                                    <img src="/logos/kakao_Logo.svg" alt="" />
                                </span>
                                <span className="mobile-login-social-text">{t("login.startWithKakao")}</span>
                            </button>
                        )}

                        <button type="button" className="mobile-login-social-btn mobile-login-google-btn" onClick={handleGoogleClick} disabled={googleLoading || googleLoadFailed || !googleReady} aria-label={t("login.startWithGoogleAria")}>
                            <span className="mobile-login-social-icon" aria-hidden="true">
                                <img src="/logos/google_Logo.svg" alt="" />
                            </span>
                            {googleLoading ? (
                                <span className="google-login-spinner" aria-hidden="true"></span>
                            ) : (
                                <span className="mobile-login-social-text">{googleLoadFailed ? t("login.googleLoadFailedShort") : t("login.startWithGoogle")}</span>
                            )}
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
                            {t("login.privacy")}
                        </button>
                    </section>
                    
                    <div className="bottom-spacer"></div>
                </main>
            </div>
        </>
    );
}