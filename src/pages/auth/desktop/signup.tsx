import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signup, sendEmailCode, verifyEmailCode, ApiError, checkLoginIdAvailability } from "../../../api/client";
import "./signup.css";

type FormState = {
    loginId: string;
    password: string;
    passwordConfirm: string;
    email: string;
};

function getSignupErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";

        if (code === "LOGIN_ID_ALREADY_EXISTS") return t("signup.loginIdAlreadyExists");
        if (code === "EMAIL_VERIFICATION_REQUIRED") return t("signup.emailVerifyRequired");
        if (code === "ALREADY_REGISTERED_WITH_LOCAL") return t("signup.alreadyLocal");
        if (code === "ALREADY_REGISTERED_WITH_GOOGLE") return t("signup.alreadyGoogle");
        if (code === "ALREADY_REGISTERED_WITH_KAKAO") return t("signup.alreadyKakao");
        if (code === "INVALID_LOGIN_ID_FORMAT") return t("signup.invalidLoginIdFormat");
        if (code === "INVALID_PASSWORD_FORMAT") return t("signup.invalidPasswordFormat");
        if (code === "INVALID_LOGIN_REQUEST") return t("signup.required");
        if (code === "AUTH_EXISTING_ACCOUNT") return t("signup.alreadyAccount");

        return e.message || t("signup.fail");
    }

    return t("signup.fail");
}

function getCheckLoginIdErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";

        if (code === "INVALID_LOGIN_ID_FORMAT") return t("signup.invalidLoginIdFormat");
        if (code === "LOGIN_ID_ALREADY_EXISTS") return t("signup.loginIdAlreadyExists");

        return e.message || t("signup.loginIdCheckFail");
    }

    return t("signup.loginIdCheckFail");
}

function getSendEmailErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        const message = (e.message ?? "").trim();

        if (code === "ALREADY_REGISTERED_WITH_GOOGLE") return t("signup.alreadyGoogle");
        if (code === "ALREADY_REGISTERED_WITH_KAKAO") return t("signup.alreadyKakao");
        if (code === "ALREADY_REGISTERED_WITH_LOCAL") return t("signup.alreadyLocal");
        if (code === "EMAIL_COOLDOWN_ACTIVE") return message || t("signup.emailCooldownActive");
        if (code === "USER_NOT_FOUND") return t("signup.emailCodeSendFail");

        if (message) return message;

        return t("signup.emailCodeSendFail");
    }

    return t("signup.emailCodeSendFail");
}

function getVerifyEmailErrorMessage(e: unknown, t: (key: string, options?: any) => string): string {
    if (e instanceof ApiError) {
        const code = e.code ?? "";
        const message = (e.message ?? "").trim();

        if (code === "EMAIL_CODE_INVALID") return t("signup.emailCodeInvalid");
        if (code === "EMAIL_CODE_EXPIRED") return t("signup.emailCodeExpired");
        if (message) return message;

        return t("signup.emailVerifyFail");
    }

    return t("signup.emailVerifyFail");
}

function formatRemainingTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Signup(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [step, setStep] = React.useState<1 | 2>(1);

    const [checkingLoginId, setCheckingLoginId] = React.useState(false);
    const [loginIdChecked, setLoginIdChecked] = React.useState(false);
    const [loginIdAvailable, setLoginIdAvailable] = React.useState<boolean | null>(null);
    const [loginIdInfo, setLoginIdInfo] = React.useState<string | null>(null);

    const [code, setCode] = React.useState("");
    const [sendingCode, setSendingCode] = React.useState(false);
    const [verifyingCode, setVerifyingCode] = React.useState(false);
    const [emailVerified, setEmailVerified] = React.useState(false);
    const [emailInfo, setEmailInfo] = React.useState<string | null>(null);
    const [emailInfoVisible, setEmailInfoVisible] = React.useState(false);
    const [emailCodeSent, setEmailCodeSent] = React.useState(false);
    const [emailCodeExpiresAt, setEmailCodeExpiresAt] = React.useState<number | null>(null);
    const [emailCodeTimeLeft, setEmailCodeTimeLeft] = React.useState(0);

    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [form, setForm] = React.useState<FormState>({
        loginId: "",
        password: "",
        passwordConfirm: "",
        email: "",
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = React.useState(false);

    const [signupError, setSignupError] = React.useState<string | null>(null);
    const [signupErrorVisible, setSignupErrorVisible] = React.useState(false);
    const [loginIdError, setLoginIdError] = React.useState<string | null>(null);
    const [loginIdErrorVisible, setLoginIdErrorVisible] = React.useState(false);
    const [emailError, setEmailError] = React.useState<string | null>(null);
    const [emailErrorVisible, setEmailErrorVisible] = React.useState(false);

    const [loginIdGuideMessage, setLoginIdGuideMessage] = React.useState(t("signup.loginIdGuide"));
    const [loginIdGuideVisible, setLoginIdGuideVisible] = React.useState(false);
    const [passwordGuideMessage, setPasswordGuideMessage] = React.useState(t("signup.passwordGuide"));
    const [passwordGuideVisible, setPasswordGuideVisible] = React.useState(false);

    const canGoNext = form.email.trim().length > 0 && emailVerified;

    const canSubmit =
        isValidLoginId(form.loginId.trim()) &&
        isValidPassword(form.password) &&
        form.passwordConfirm.length > 0 &&
        form.email.trim().length > 0 &&
        emailVerified &&
        form.password === form.passwordConfirm &&
        loginIdChecked &&
        loginIdAvailable === true;

    function isValidLoginId(value: string): boolean {
        return /^[a-z0-9_-]{4,20}$/.test(value);
    }

    function isValidPassword(value: string): boolean {
        return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/.test(value);
    }

    function getLoginIdGuideMessage(value: string): string | null {
        if (value.length === 0) {
            return null;
        }

        if (!/^[a-z0-9_-]*$/.test(value)) {
            return t("signup.loginIdInvalidChar");
        }

        if (value.length < 4 || value.length > 20) {
            return t("signup.loginIdInvalidLength");
        }

        return null;
    }

    function getPasswordGuideMessage(value: string): string | null {
        if (value.length === 0) {
            return null;
        }

        if (!/^[A-Za-z\d@$!%*#?&]*$/.test(value)) {
            return t("signup.passwordInvalidChar");
        }

        if (value.length < 8 || value.length > 20) {
            return t("signup.passwordInvalidLength");
        }

        if (!/[A-Za-z]/.test(value)) {
            return t("signup.passwordMissingLetter");
        }

        if (!/\d/.test(value)) {
            return t("signup.passwordMissingNumber");
        }

        if (!/[@$!%*#?&]/.test(value)) {
            return t("signup.passwordMissingSpecial");
        }

        return null;
    }

    const prevEmailRef = React.useRef(form.email);

    const prevLoginIdRef = React.useRef(form.loginId);
    const emailInfoTimerRef = React.useRef<number | null>(null);
    const emailErrorTimerRef = React.useRef<number | null>(null);
    const loginIdErrorTimerRef = React.useRef<number | null>(null);
    const signupErrorTimerRef = React.useRef<number | null>(null);

    const emailInfoFadeTimerRef = React.useRef<number | null>(null);
    const emailErrorFadeTimerRef = React.useRef<number | null>(null);
    const loginIdErrorFadeTimerRef = React.useRef<number | null>(null);
    const signupErrorFadeTimerRef = React.useRef<number | null>(null);

    const loginIdGuideTimerRef = React.useRef<number | null>(null);
    const passwordGuideTimerRef = React.useRef<number | null>(null);

    function showEmailInfo(message: string) {
        setEmailInfo(message);
        setEmailInfoVisible(true);

        if (emailInfoTimerRef.current) {
            window.clearTimeout(emailInfoTimerRef.current);
        }

        if (emailInfoFadeTimerRef.current) {
            window.clearTimeout(emailInfoFadeTimerRef.current);
        }

        emailInfoTimerRef.current = window.setTimeout(() => {
            setEmailInfoVisible(false);

            emailInfoFadeTimerRef.current = window.setTimeout(() => {
                setEmailInfo(null);
            }, 250);
        }, 3000);
    }

    function showEmailError(message: string) {
        setEmailError(message);
        setEmailErrorVisible(true);

        if (emailErrorTimerRef.current) {
            window.clearTimeout(emailErrorTimerRef.current);
        }

        if (emailErrorFadeTimerRef.current) {
            window.clearTimeout(emailErrorFadeTimerRef.current);
        }

        emailErrorTimerRef.current = window.setTimeout(() => {
            setEmailErrorVisible(false);

            emailErrorFadeTimerRef.current = window.setTimeout(() => {
                setEmailError(null);
            }, 250);
        }, 3000);
    }

    function showLoginIdGuide(message?: string) {
        setLoginIdGuideMessage(message ?? t("signup.loginIdGuide"));
        setLoginIdGuideVisible(true);

        if (loginIdGuideTimerRef.current) {
            window.clearTimeout(loginIdGuideTimerRef.current);
        }

        loginIdGuideTimerRef.current = window.setTimeout(() => {
            setLoginIdGuideVisible(false);
        }, 3000);
    }

    function showPasswordGuide(message?: string) {
        setPasswordGuideMessage(message ?? t("signup.passwordGuide"));
        setPasswordGuideVisible(true);

        if (passwordGuideTimerRef.current) {
            window.clearTimeout(passwordGuideTimerRef.current);
        }

        passwordGuideTimerRef.current = window.setTimeout(() => {
            setPasswordGuideVisible(false);
        }, 3000);
    }

    function hideLoginIdGuide() {
        setLoginIdGuideVisible(false);

        if (loginIdGuideTimerRef.current) {
            window.clearTimeout(loginIdGuideTimerRef.current);
        }
    }

    function hidePasswordGuide() {
        setPasswordGuideVisible(false);

        if (passwordGuideTimerRef.current) {
            window.clearTimeout(passwordGuideTimerRef.current);
        }
    }

    function showLoginIdError(message: string) {
        setLoginIdError(message);
        setLoginIdErrorVisible(true);

        if (loginIdErrorTimerRef.current) {
            window.clearTimeout(loginIdErrorTimerRef.current);
        }

        if (loginIdErrorFadeTimerRef.current) {
            window.clearTimeout(loginIdErrorFadeTimerRef.current);
        }

        loginIdErrorTimerRef.current = window.setTimeout(() => {
            setLoginIdErrorVisible(false);

            loginIdErrorFadeTimerRef.current = window.setTimeout(() => {
                setLoginIdError(null);
            }, 250);
        }, 3000);
    }

    function showSignupError(message: string) {
        setSignupError(message);
        setSignupErrorVisible(true);

        if (signupErrorTimerRef.current) {
            window.clearTimeout(signupErrorTimerRef.current);
        }

        if (signupErrorFadeTimerRef.current) {
            window.clearTimeout(signupErrorFadeTimerRef.current);
        }

        signupErrorTimerRef.current = window.setTimeout(() => {
            setSignupErrorVisible(false);

            signupErrorFadeTimerRef.current = window.setTimeout(() => {
                setSignupError(null);
            }, 250);
        }, 3000);
    }
    function hideEmailNotice() {
        setEmailInfoVisible(false);
        setEmailErrorVisible(false);

        if (emailInfoTimerRef.current) {
            window.clearTimeout(emailInfoTimerRef.current);
        }

        if (emailErrorTimerRef.current) {
            window.clearTimeout(emailErrorTimerRef.current);
        }

        if (emailInfoFadeTimerRef.current) {
            window.clearTimeout(emailInfoFadeTimerRef.current);
        }

        if (emailErrorFadeTimerRef.current) {
            window.clearTimeout(emailErrorFadeTimerRef.current);
        }

        emailInfoFadeTimerRef.current = window.setTimeout(() => {
            setEmailInfo(null);
        }, 350);

        emailErrorFadeTimerRef.current = window.setTimeout(() => {
            setEmailError(null);
        }, 350);
    }

    React.useEffect(() => { // 이메일 변경 감지
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;
        setEmailVerified(false);
        setCode("");
        hideEmailNotice();
        setEmailCodeSent(false);
        setEmailCodeExpiresAt(null);
        setEmailCodeTimeLeft(0);

        if (step === 2) {
            setStep(1);
        }
    }, [form.email, step]);

    React.useEffect(() => { // 인증코드 유효시간
        if (!emailCodeExpiresAt) {
            setEmailCodeTimeLeft(0);
            return;
        }

        const updateRemaining = () => {
            const remain = Math.max(0, Math.floor((emailCodeExpiresAt - Date.now()) / 1000));
            setEmailCodeTimeLeft(remain);

            if (remain === 0) {
                setEmailVerified(false);
            }
        };

        updateRemaining();

        const timer = window.setInterval(updateRemaining, 1000);

        return () => window.clearInterval(timer);
    }, [emailCodeExpiresAt]);

    React.useEffect(() => {
        if (step !== 2) return;

        showLoginIdGuide();
        showPasswordGuide();
    }, [step]);

    React.useEffect(() => { // 아이디 변경 감지 
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;
        setLoginIdChecked(false);
        setLoginIdAvailable(null);
        setLoginIdInfo(null);
        setLoginIdError(null);
    }, [form.loginId]);

    React.useEffect(() => { // info, error 타이머 정리
        return () => {
            if (emailInfoTimerRef.current) {
                window.clearTimeout(emailInfoTimerRef.current);
            }

            if (emailErrorTimerRef.current) {
                window.clearTimeout(emailErrorTimerRef.current);
            }

            if (loginIdErrorTimerRef.current) {
                window.clearTimeout(loginIdErrorTimerRef.current);
            }

            if (signupErrorTimerRef.current) {
                window.clearTimeout(signupErrorTimerRef.current);
            }

            if (emailInfoFadeTimerRef.current) {
                window.clearTimeout(emailInfoFadeTimerRef.current);
            }

            if (emailErrorFadeTimerRef.current) {
                window.clearTimeout(emailErrorFadeTimerRef.current);
            }

            if (loginIdGuideTimerRef.current) {
                window.clearTimeout(loginIdGuideTimerRef.current);
            }

            if (passwordGuideTimerRef.current) {
                window.clearTimeout(passwordGuideTimerRef.current);
            }

            if (loginIdErrorFadeTimerRef.current) {
                window.clearTimeout(loginIdErrorFadeTimerRef.current);
            }

            if (signupErrorFadeTimerRef.current) {
                window.clearTimeout(signupErrorFadeTimerRef.current);
            }
        };
    }, []);

    async function handleSendEmailCode() {
        const email = form.email.trim();
        const isResend = emailCodeSent;

        if (!email) {
            showEmailError(t("signup.emailRequired"));
            return;
        }

        setSendingCode(true);
        hideEmailNotice();
        setEmailVerified(false);
        setCode("");

        try {
            const res = await sendEmailCode(email, language);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                if (res.existingAccountType === "GOOGLE") {
                    showEmailError(t("signup.alreadyGoogle"));
                } else if (res.existingAccountType === "KAKAO") {
                    showEmailError(t("signup.alreadyKakao"));
                } else if (res.existingAccountType === "LOCAL") {
                    showEmailError(t("signup.alreadyLocal"));
                } else {
                    showEmailError(t("signup.emailAlreadyUsed"));
                }
                return;
            }

            setEmailCodeSent(true);
            setEmailCodeExpiresAt(Date.now() + 10 * 60 * 1000);
            setEmailCodeTimeLeft(10 * 60);
            showEmailInfo(
                isResend
                    ? t("signup.emailCodeResent", { email: res.maskedEmail })
                    : t("signup.emailCodeSent", { email: res.maskedEmail })
            );
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                console.log("sendEmailCode error", {
                    status: e.status,
                    code: e.code,
                    message: e.message,
                    bodyText: e.bodyText,
                });
            }
            showEmailError(getSendEmailErrorMessage(e, t));
        } finally {
            setSendingCode(false);
        }
    }

    async function handleVerifyEmailCode(inputCode?: string) {
        const email = form.email.trim();
        const trimmedCode = (inputCode ?? code).trim();

        if (!email) {
            showEmailError(t("signup.emailRequired"));
            return;
        }

        if (!trimmedCode) {
            showEmailError(t("signup.emailCodeRequired"));
            return;
        }

        if (trimmedCode.length !== 6) {
            return;
        }

        if (emailCodeTimeLeft <= 0) {
            showEmailError(t("signup.emailCodeExpired"));
            return;
        }

        if (verifyingCode || emailVerified) {
            return;
        }

        setVerifyingCode(true);
        if (emailError) { hideEmailNotice(); }

        try {
            const res = await verifyEmailCode(email, trimmedCode);

            if (res.verified) {
                setEmailVerified(true);
                setEmailCodeExpiresAt(null);
                setEmailCodeTimeLeft(0);
                showEmailInfo(t("signup.emailVerifiedDone", { email: res.maskedEmail }));
                return;
            }

            if (res.existingAccountFound) {
                setCode("");
                setEmailVerified(false);
                showEmailError(t("signup.emailAlreadyUsed"));
                return;
            }

            setCode("");
            setEmailVerified(false);
            showEmailError(t("signup.emailVerifyFail"));
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                console.log("verifyEmailCode error", {
                    status: e.status,
                    code: e.code,
                    message: e.message,
                    bodyText: e.bodyText,
                });
            }

            setCode("");
            setEmailVerified(false);
            showEmailError(getVerifyEmailErrorMessage(e, t));
        } finally {
            setVerifyingCode(false);
        }
    }

    async function handleCodeChange(value: string) {
        const nextValue = value.replace(/\D/g, "").slice(0, 6);

        setCode(nextValue);

        if (emailError) {
            hideEmailNotice();
        }

        if (emailVerified) return;
        if (emailCodeTimeLeft <= 0) return;
        if (nextValue.length !== 6) return;

        await handleVerifyEmailCode(nextValue);
    }

    function handleNextStep() {
        if (!form.email.trim()) {
            showEmailError(t("signup.emailRequired"));
            return;
        }

        if (emailCodeSent && emailCodeTimeLeft <= 0 && !emailVerified) {
            showEmailError(t("signup.emailCodeExpired"));
            return;
        }

        if (!emailVerified) {
            showEmailError(t("signup.emailVerifyRequired"));
            return;
        }

        hideEmailNotice();
        setStep(2);
    }

    async function handleCheckLoginId() {
        const loginId = form.loginId.trim();
        const guideMessage = getLoginIdGuideMessage(loginId);

        if (!loginId) {
            showLoginIdGuide();
            return;
        }

        if (guideMessage) {
            showLoginIdGuide(guideMessage);
            return;
        }

        setCheckingLoginId(true);
        hideLoginIdGuide();
        setLoginIdError(null);
        setLoginIdErrorVisible(false);
        setLoginIdInfo(null);

        try {
            const res = await checkLoginIdAvailability(loginId);

            setLoginIdChecked(true);
            setLoginIdAvailable(res.available);
            setLoginIdInfo(res.message);

            if (!res.available) {
                showLoginIdError(res.message);
            }
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                console.log("checkLoginIdAvailability error", {
                    status: e.status,
                    code: e.code,
                    message: e.message,
                    bodyText: e.bodyText,
                });
            }

            setLoginIdChecked(false);
            setLoginIdAvailable(false);
            setLoginIdInfo(null);
            showLoginIdError(getCheckLoginIdErrorMessage(e, t));
        } finally {
            setCheckingLoginId(false);
        }
    }

    async function handleSignup() {
        const loginId = form.loginId.trim();
        const password = form.password;
        const passwordConfirm = form.passwordConfirm;
        const email = form.email.trim();

        if (!loginId || !password || !passwordConfirm || !email) {
            showSignupError(t("signup.required"));
            return;
        }
        if (!loginIdChecked || loginIdAvailable !== true) {
            showSignupError(t("signup.loginIdCheckRequired"));
            return;
        }
        if (password !== passwordConfirm) {
            showSignupError(t("signup.passwordMismatch"));
            return;
        }
        if (!emailVerified) {
            showSignupError(t("signup.emailVerifyRequired"));
            return;
        }
        setSubmitting(true);
        setSignupError(null);

        try {
            await signup({
                loginId,
                password,
                email,
            });
            alert(t("signup.success"));
            navigate("/login", { replace: true });
        } catch (e: unknown) {
            if (e instanceof ApiError) {
                console.log("signup error", {
                    status: e.status,
                    code: e.code,
                    message: e.message,
                    bodyText: e.bodyText,
                });
            }

            showSignupError(getSignupErrorMessage(e, t));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="signup-desktop-page">
            <header className="signup-desktop-header">
                <div className="signup-desktop-header-inner">
                    <span className="signup-desktop-header-logo">internie</span>
                </div>
            </header>

            <main className="signup-desktop-main">
                <div className="signup-desktop-container">
                    <h1 className="signup-desktop-title">{t("signup.title")}</h1>
                    <p className="signup-desktop-subtitle">
                        {t("signup.hasAccount")}
                        <button type="button" className="signup-desktop-subtitle-link" onClick={() => navigate("/login")}>
                            {t("signup.returnLogin")}
                        </button>
                    </p>

                    <section className="signup-desktop-card">
                        {step === 1 && (
                            <>
                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("signup.email")}</span>
                                    <div className="signup-desktop-inline">
                                        <div className="signup-desktop-inline-stack">
                                            <input
                                                className="signup-desktop-input"
                                                value={form.email}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setForm((prev) => ({ ...prev, email: value }));
                                                    hideEmailNotice();
                                                }}
                                                placeholder={t("signup.emailPlaceholder")}
                                                autoComplete="email"
                                            />
                                            {!emailCodeSent && (
                                                <div className={`signup-desktop-info ${emailInfoVisible || emailErrorVisible ? "is-visible" : ""} ${emailError ? "is-error" : ""}`}>
                                                    {emailError ?? emailInfo ?? ""}
                                                </div>
                                            )}
                                        </div>
                                        <button type="button" className="signup-desktop-inline-btn" onClick={handleSendEmailCode} disabled={sendingCode || !form.email.trim()} >
                                            {sendingCode ? t("signup.sending") : emailCodeSent ? t("signup.resendEmailVC") : t("signup.getEmailVC")}
                                        </button>
                                    </div>
                                </div>

                                {emailCodeSent && (
                                    <div className="signup-desktop-field">
                                        <span className="signup-desktop-label">{t("signup.verifyCode")}</span>
                                        <div className="signup-desktop-inline">
                                            <div className="signup-desktop-inline-stack">
                                                <div className="signup-desktop-input-wrap has-timer">
                                                    <input
                                                        className="signup-desktop-input has-inner-timer"
                                                        value={code}
                                                        onChange={(e) => {
                                                            void handleCodeChange(e.target.value);
                                                        }}
                                                        placeholder={t("signup.enterEmailVC")}
                                                        disabled={emailVerified || emailCodeTimeLeft <= 0}
                                                    />
                                                    {!emailVerified && emailCodeTimeLeft > 0 && (
                                                        <span className="signup-desktop-input-timer">
                                                            {formatRemainingTime(emailCodeTimeLeft)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`signup-desktop-info ${emailInfoVisible || emailErrorVisible ? "is-visible" : ""} ${emailError ? "is-error" : ""}`}>
                                                    {emailError ?? emailInfo ?? ""}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="signup-desktop-actions">
                                    <button type="button" className="signup-desktop-btn primary" onClick={handleNextStep} disabled={!canGoNext} >
                                        {t("signup.next")}
                                    </button>
                                </div>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("login.id")}</span>
                                    <div className="signup-desktop-control">
                                        <div className="signup-desktop-inline-row">
                                            <input
                                                className="signup-desktop-input"
                                                value={form.loginId}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const trimmedValue = value.trim();
                                                    const guideMessage = getLoginIdGuideMessage(trimmedValue);

                                                    setForm((prev) => ({ ...prev, loginId: value }));
                                                    setLoginIdChecked(false);
                                                    setLoginIdAvailable(null);
                                                    setLoginIdInfo(null);
                                                    setLoginIdError(null);
                                                    setLoginIdErrorVisible(false);

                                                    if (guideMessage) {
                                                        showLoginIdGuide(guideMessage);
                                                    } else {
                                                        hideLoginIdGuide();
                                                    }
                                                }}
                                                placeholder={t("signup.loginIdPlaceholder")}
                                                autoComplete="username"
                                            />
                                            <button type="button" className="signup-desktop-inline-btn" onClick={handleCheckLoginId} disabled={checkingLoginId || !form.loginId.trim()} >
                                                {checkingLoginId ? t("signup.checking") : t("signup.checkLoginId")}
                                            </button>
                                        </div>
                                        <div className={`signup-desktop-notice ${(loginIdGuideVisible || loginIdErrorVisible || loginIdInfo) ? "is-visible" : ""} ${(loginIdGuideVisible || loginIdError || loginIdAvailable === false) ? "is-error" : ""}`}>
                                            {loginIdError ?? loginIdInfo ?? loginIdGuideMessage}
                                        </div>
                                    </div>
                                </div>

                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("login.pw")}</span>
                                    <div className="signup-desktop-control">
                                        <div className="signup-desktop-input-wrap has-password">
                                            <input
                                                className="signup-desktop-input is-password"
                                                value={form.password}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const guideMessage = getPasswordGuideMessage(value);

                                                    setForm((prev) => ({ ...prev, password: value }));
                                                    setSignupError(null);
                                                    setSignupErrorVisible(false);

                                                    if (guideMessage) {
                                                        showPasswordGuide(guideMessage);
                                                    } else {
                                                        hidePasswordGuide();
                                                    }

                                                    if (form.passwordConfirm.length > 0 && value !== form.passwordConfirm) {
                                                        showSignupError(t("signup.passwordMismatch"));
                                                    }
                                                }}
                                                placeholder={t("signup.passwordPlaceholder")}
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                            />
                                            <button type="button" className="signup-desktop-pw-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>
                                                <img className="signup-desktop-pw-blind" src={showPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                            </button>
                                        </div>
                                        <div className={`signup-desktop-notice ${passwordGuideVisible ? "is-visible" : ""} is-error`}>
                                            {passwordGuideMessage}
                                        </div>
                                    </div>
                                </div>

                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("signup.passwordConfirm")}</span>
                                    <div className="signup-desktop-control">
                                        <div className="signup-desktop-input-wrap has-password">
                                            <input
                                                className="signup-desktop-input is-password"
                                                value={form.passwordConfirm}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    setForm((prev) => ({ ...prev, passwordConfirm: value }));
                                                    setSignupError(null);
                                                    setSignupErrorVisible(false);

                                                    if (value.length > 0 && form.password !== value) {
                                                        showSignupError(t("signup.passwordMismatch"));
                                                    }
                                                }}
                                                placeholder={t("signup.passwordConfirmPlaceholder")}
                                                type={showPasswordConfirm ? "text" : "password"}
                                                autoComplete="new-password"
                                            />
                                            <button type="button" className="signup-desktop-pw-toggle" onClick={() => setShowPasswordConfirm((prev) => !prev)} aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}>
                                                <img className="signup-desktop-pw-blind" src={showPasswordConfirm ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                            </button>
                                        </div>
                                        <div className={`signup-desktop-notice ${signupErrorVisible ? "is-visible" : ""} is-error`}>
                                            {signupError ?? ""}
                                        </div>
                                    </div>
                                </div>

                                <div className="signup-desktop-actions">
                                    <button type="button" className="signup-desktop-btn ghost" onClick={() => { setSignupError(null); setSignupErrorVisible(false); hideLoginIdGuide(); hidePasswordGuide(); setStep(1); }} >
                                        {t("signup.prev")}
                                    </button>

                                    <button type="button" className="signup-desktop-btn primary" onClick={handleSignup} disabled={submitting || !canSubmit} >
                                        {submitting ? t("signup.submitting") : t("signup.submit")}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}