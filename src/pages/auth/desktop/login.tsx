import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

export default function Login(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const googleInitializedRef = useRef(false);
    const googleButtonRef = useRef<HTMLDivElement | null>(null);
    const currentLanguage = i18n.resolvedLanguage || i18n.language;
    const isEnglish = currentLanguage.startsWith("en");

    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [googleReady, setGoogleReady] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(true);
    const [googleLoadFailed, setGoogleLoadFailed] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastClosing, setToastClosing] = useState(false);
    const [toastGuide, setToastGuide] = useState(false);
    const toastTimerRef = useRef<number | null>(null);
    const toastCloseTimerRef = useRef<number | null>(null);
    const googleLoginFailCountRef = useRef(0);

    const go = (url: string) => {
        window.location.href = url;
    };

    const canLogin = loginId.trim().length > 0 && password.length > 0;
    const showErrorToast = (message: string, options?: { guide?: boolean; duration?: number }) => {
        const duration = options?.duration ?? 3000;

        setLoginError(message);
        setToastClosing(false);
        setToastGuide(options?.guide === true);
        setToastMessage(null);

        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }

        if (toastCloseTimerRef.current) {
            window.clearTimeout(toastCloseTimerRef.current);
        }

        window.setTimeout(() => {
            setToastMessage(message);
        }, 0);

        toastTimerRef.current = window.setTimeout(() => {
            setToastClosing(true);

            toastCloseTimerRef.current = window.setTimeout(() => {
                setToastMessage(null);
                setToastClosing(false);
                setToastGuide(false);
            }, 280);
        }, duration);
    };

    const clearLoginError = () => {
        setLoginError(null);
        setToastMessage(null);
        setToastClosing(false);
        setToastGuide(false);

        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }

        if (toastCloseTimerRef.current) {
            window.clearTimeout(toastCloseTimerRef.current);
        }
    };

    const getGoogleLoginFailedMessage = () => {
        return isEnglish ? "Google login failed. Please try again." : t("login.googleLoginFailed");
    };

    const getGoogleLoginGuideMessage = () => {
        return isEnglish
            ? "Google login keeps failing.\nPlease use a normal Chrome window and check whether cookies and pop-ups are allowed.\nSettings → Privacy and security → Third-party cookies\nSettings → Site settings → Pop-ups and redirects"
            : "Google 로그인이 계속 실패하고 있습니다.\nChrome 일반 창에서 접속한 뒤, 쿠키와 팝업 허용 여부를 확인해주세요.\n설정 → 개인 정보 보호 및 보안 → 서드 파티 쿠키\n설정 → 사이트 설정 → 팝업 및 리디렉션";
    };

    const getGoogleCredentialMissingMessage = () => {
        return isEnglish ? "Could not get your Google account information." : "Google 계정 정보를 받지 못했습니다.";
    };

    const showGoogleLoginFailureToast = (message?: string) => {
        googleLoginFailCountRef.current += 1;

        if (googleLoginFailCountRef.current >= 2) {
            showErrorToast(getGoogleLoginGuideMessage(), { guide: true, duration: 8000 });
            return;
        }

        showErrorToast(message || getGoogleLoginFailedMessage());
    };

    const renderGoogleButton = () => {
        const buttonContainer = googleButtonRef.current;

        if (!buttonContainer || !window.google?.accounts?.id) {
            return;
        }

        buttonContainer.innerHTML = "";

        window.google.accounts.id.renderButton(buttonContainer, {
            type: "icon",
            theme: "outline",
            size: "large",
            shape: "circle",
            locale: isEnglish ? "en" : "ko",
        });
    };


    const handleLocalLogin = async () => {
        const trimmedLoginId = loginId.trim();

        if (!trimmedLoginId || !password) {
            showErrorToast(t("login.requiredLoginInfo"));
            return;
        }

        try {
            setSubmitting(true);
            setLoginError(null);

            const data = await loginWithLocal({
                loginId: trimmedLoginId,
                password,
            });

            navigate(data.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
        } catch (e) {
            console.error("일반 로그인 실패", e);

            if (e instanceof ApiError && e.message.includes("탈퇴한 회원")) {
                showErrorToast(t("login.withdrawnAccount"));
                return;
            }

            showErrorToast(t("login.invalidLogin"));
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
                    showGoogleLoginFailureToast(isEnglish ? "Google login is not configured." : "Google 로그인 설정이 누락되었습니다.");
                    return;
                }

                if (!window.google?.accounts?.id) {
                    setGoogleReady(false);
                    setGoogleLoading(false);
                    setGoogleLoadFailed(true);
                    showGoogleLoginFailureToast(t("login.googleNotReady"));
                    return;
                }

                if (googleInitializedRef.current) {
                    renderGoogleButton();
                    setGoogleReady(true);
                    setGoogleLoading(false);
                    setGoogleLoadFailed(false);
                    return;
                }

                googleInitializedRef.current = true;

                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    ux_mode: "popup",
                    use_fedcm_for_button: true,
                    button_auto_select: false,
                    callback: async (response: any) => {
                        const idToken = response?.credential;

                        if (!idToken) {
                            console.error("Google idToken을 받지 못했습니다.", response);
                            showGoogleLoginFailureToast(getGoogleCredentialMissingMessage());
                            return;
                        }

                        try {
                            const data = await loginWithGoogle(idToken);

                            googleLoginFailCountRef.current = 0;
                            navigate(data.onboardingCompleted ? "/student" : "/onboarding", { replace: true });
                        } catch (e) {
                            console.error("구글 로그인 실패", e);

                            if (e instanceof ApiError && e.message.includes("탈퇴한 회원")) {
                                showErrorToast(t("login.withdrawnAccount"));
                                return;
                            }

                            if (e instanceof ApiError) {
                                showGoogleLoginFailureToast(isEnglish ? getGoogleLoginFailedMessage() : e.message || getGoogleLoginFailedMessage());
                                return;
                            }

                            showGoogleLoginFailureToast(getGoogleLoginFailedMessage());
                        }
                    },
                });

                renderGoogleButton();

                setGoogleReady(true);
                setGoogleLoading(false);
                setGoogleLoadFailed(false);
            } catch (e) {
                console.error("Google SDK 로드 실패", e);
                setGoogleReady(false);
                setGoogleLoading(false);
                setGoogleLoadFailed(true);
                showGoogleLoginFailureToast(isEnglish ? "Failed to load Google login. Please check your browser settings or network." : "Google 로그인을 불러오지 못했습니다. 브라우저 설정 또는 네트워크를 확인해주세요.");
            }
        };

        initializeGoogleLogin();

        return () => {
            cancelled = true;
        };
    }, [navigate, t, isEnglish]);

    useEffect(() => { // 3초 후 toast 사라짐
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }

            if (toastCloseTimerRef.current) {
                window.clearTimeout(toastCloseTimerRef.current);
            }
        };
    }, []);

    return (
        <>
            <SeoMeta
                title={isEnglish ? "Login | Internie" : "로그인 | 인터니"}
                description={isEnglish ? "Sign in to Internie." : "인터니 서비스에 로그인합니다."}
                lang={isEnglish ? "en" : "ko"}
                noindex
            />
            <div className="login-desktop-page">
                {toastMessage && (
                    <div className={`login-desktop-toast ${toastClosing ? "is-closing" : ""} ${toastGuide ? "is-guide" : ""}`} role="alert">
                        <span className="login-desktop-toast-icon" aria-hidden="true">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="10" cy="10" r="10" fill="#FF0000" />
                                <path d="M10 5.2V10.8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="10" cy="14.5" r="1.1" fill="white" />
                            </svg>
                        </span>
                        <span className="login-desktop-toast-text">{toastMessage}</span>
                    </div>
                )}
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
                                    onChange={(e) => { setLoginId(e.target.value); clearLoginError(); }}
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
                                        className={`login-desktop-input is-password ${loginError ? "is-error" : ""}`}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); clearLoginError(); }}
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

                            <div className={`login-desktop-socials ${isEnglish ? "is-english" : ""}`}>
                                <div className="login-desktop-google-slot">
                                    {googleLoading && (
                                        <div className="login-desktop-google-placeholder">
                                            <span className="google-login-spinner" aria-hidden="true"></span>
                                        </div>
                                    )}

                                    {googleLoadFailed && (
                                        <div className="login-desktop-google-placeholder">
                                            {t("login.googleLoadFailedShort")}
                                        </div>
                                    )}

                                    <div ref={googleButtonRef} className={`login-desktop-google-button ${googleReady ? "is-ready" : ""}`}></div>
                                </div>

                                {!isEnglish && (
                                    <button type="button" className="login-desktop-kakao-button" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
                                        <img src="/logos/kakao_Logo.svg" alt="" className="login-desktop-kakao-icon" />
                                    </button>
                                )}
                            </div>

                            <div className="login-desktop-join">
                                <span>{t("login.signupPrompt")}</span>
                                <button type="button" onClick={() => navigate("/signup")}>{t("login.signupLink")}</button>
                            </div>
                            <div className="login-desktop-policy">
                                <button type="button" onClick={() => navigate("/privacy-policy")}>
                                    {t("login.privacy")}
                                </button>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </>
    );
}