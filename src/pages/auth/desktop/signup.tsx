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

    const [signupError, setSignupError] = React.useState<string | null>(null);
    const [loginIdError, setLoginIdError] = React.useState<string | null>(null);
    const [emailError, setEmailError] = React.useState<string | null>(null);

    const canGoNext = form.email.trim().length > 0 && emailVerified;

    const canSubmit =
        form.loginId.trim().length > 0 &&
        form.password.length > 0 &&
        form.passwordConfirm.length > 0 &&
        form.email.trim().length > 0 &&
        emailVerified &&
        form.password === form.passwordConfirm &&
        loginIdChecked &&
        loginIdAvailable === true;

    const prevLoginIdRef = React.useRef(form.loginId);
    const prevEmailRef = React.useRef(form.email);

    React.useEffect(() => { // 이메일 변경 감지
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;
        setEmailVerified(false);
        setCode("");
        setEmailInfo(null);
        setEmailError(null);
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

    React.useEffect(() => { // 아이디 변경 감지 
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;
        setLoginIdChecked(false);
        setLoginIdAvailable(null);
        setLoginIdInfo(null);
        setLoginIdError(null);
    }, [form.loginId]);

    async function handleSendEmailCode() {
        const email = form.email.trim();
        const isResend = emailCodeSent;

        if (!email) {
            setEmailError(t("signup.emailRequired"));
            return;
        }

        setSendingCode(true);
        setEmailError(null);
        setEmailInfo(null);
        setEmailVerified(false);
        setCode("");

        try {
            const res = await sendEmailCode(email, language);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                if (res.existingAccountType === "GOOGLE") {
                    setEmailError(t("signup.alreadyGoogle"));
                } else if (res.existingAccountType === "KAKAO") {
                    setEmailError(t("signup.alreadyKakao"));
                } else if (res.existingAccountType === "LOCAL") {
                    setEmailError(t("signup.alreadyLocal"));
                } else {
                    setEmailError(t("signup.emailAlreadyUsed"));
                }
                return;
            }

            setEmailCodeSent(true);
            setEmailCodeExpiresAt(Date.now() + 10 * 60 * 1000);
            setEmailCodeTimeLeft(10 * 60);
            setEmailInfo(
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
            setEmailError(getSendEmailErrorMessage(e, t));
        } finally {
            setSendingCode(false);
        }
    }

    async function handleVerifyEmailCode(inputCode?: string) {
        const email = form.email.trim();
        const trimmedCode = (inputCode ?? code).trim();

        if (!email) {
            setEmailError(t("signup.emailRequired"));
            return;
        }

        if (!trimmedCode) {
            setEmailError(t("signup.emailCodeRequired"));
            return;
        }

        if (trimmedCode.length !== 6) {
            return;
        }

        if (emailCodeTimeLeft <= 0) {
            setEmailError(t("signup.emailCodeExpired"));
            return;
        }

        if (verifyingCode || emailVerified) {
            return;
        }

        setVerifyingCode(true);
        setEmailError(null);

        try {
            const res = await verifyEmailCode(email, trimmedCode);

            if (res.verified) {
                setEmailVerified(true);
                setEmailCodeExpiresAt(null);
                setEmailCodeTimeLeft(0);
                setEmailInfo(t("signup.emailVerifiedDone", { email: res.maskedEmail }));
                return;
            }

            if (res.existingAccountFound) {
                setCode("");
                setEmailVerified(false);
                setEmailError(t("signup.emailAlreadyUsed"));
                return;
            }

            setCode("");
            setEmailVerified(false);
            setEmailError(t("signup.emailVerifyFail"));
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
            setEmailError(getVerifyEmailErrorMessage(e, t));
        } finally {
            setVerifyingCode(false);
        }
    }

    async function handleCodeChange(value: string) {
        const nextValue = value.replace(/\D/g, "").slice(0, 6);

        setCode(nextValue);
        setEmailError(null);

        if (emailVerified) return;
        if (emailCodeTimeLeft <= 0) return;
        if (nextValue.length !== 6) return;

        await handleVerifyEmailCode(nextValue);
    }

    function handleNextStep() {
        if (!form.email.trim()) {
            setEmailError(t("signup.emailRequired"));
            return;
        }

        if (emailCodeSent && emailCodeTimeLeft <= 0 && !emailVerified) {
            setEmailError(t("signup.emailCodeExpired"));
            return;
        }

        if (!emailVerified) {
            setEmailError(t("signup.emailVerifyRequired"));
            return;
        }

        setEmailError(null);
        setStep(2);
    }

    async function handleCheckLoginId() {
        const loginId = form.loginId.trim();

        if (!loginId) {
            setLoginIdError(t("signup.loginIdRequired"));
            return;
        }

        setCheckingLoginId(true);
        setLoginIdError(null);
        setLoginIdInfo(null);

        try {
            const res = await checkLoginIdAvailability(loginId);

            setLoginIdChecked(true);
            setLoginIdAvailable(res.available);
            setLoginIdInfo(res.message);

            if (!res.available) {
                setLoginIdError(res.message);
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
            setLoginIdError(getCheckLoginIdErrorMessage(e, t));
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
            setSignupError(t("signup.required"));
            return;
        }
        if (!loginIdChecked || loginIdAvailable !== true) {
            setSignupError(t("signup.loginIdCheckRequired"));
            return;
        }
        if (password !== passwordConfirm) {
            setSignupError(t("signup.passwordMismatch"));
            return;
        }
        if (!emailVerified) {
            setSignupError(t("signup.emailVerifyRequired"));
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

            setSignupError(getSignupErrorMessage(e, t));
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
                                        <input
                                            className="signup-desktop-input"
                                            value={form.email}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setForm((prev) => ({ ...prev, email: value }));
                                                setEmailError(null);
                                            }}
                                            placeholder={t("signup.emailPlaceholder")}
                                            autoComplete="email"
                                        />
                                        <button type="button" className="signup-desktop-inline-btn" onClick={handleSendEmailCode} disabled={sendingCode || !form.email.trim()} >
                                            {sendingCode ? t("signup.sending") : emailCodeSent ? t("signup.resendEmailVC") : t("signup.getEmailVC")}
                                        </button>
                                    </div>
                                </div>

                                {emailCodeSent && (
                                    <div className="signup-desktop-field">
                                        <span className="signup-desktop-label">{t("signup.verifyCode")}</span>
                                        <div className="signup-desktop-inline">
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
                                        </div>
                                    </div>
                                )}

                                {emailInfo && <div className="signup-desktop-info">{emailInfo}</div>}
                                {emailError && <div className="signup-desktop-error">{emailError}</div>}

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
                                    <div className="signup-desktop-inline">
                                        <input
                                            className="signup-desktop-input"
                                            value={form.loginId}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setForm((prev) => ({ ...prev, loginId: value }));
                                                setLoginIdError(null);
                                            }}
                                            placeholder={t("signup.loginIdPlaceholder")}
                                            autoComplete="username"
                                        />
                                        <button type="button" className="signup-desktop-inline-btn" onClick={handleCheckLoginId} disabled={checkingLoginId || !form.loginId.trim()} >
                                            {checkingLoginId ? t("signup.checking") : t("signup.checkLoginId")}
                                        </button>
                                    </div>
                                    <div className="signup-desktop-help">{t("signup.loginIdGuide")}</div>
                                </div>

                                {loginIdInfo && (
                                    <div className={`signup-desktop-info ${loginIdAvailable === false ? "is-error" : ""}`}>
                                        {loginIdInfo}
                                    </div>
                                )}
                                {loginIdError && <div className="signup-desktop-error">{loginIdError}</div>}

                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("login.pw")}</span>
                                    <input
                                        className="signup-desktop-input"
                                        value={form.password}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm((prev) => ({ ...prev, password: value }));
                                            setSignupError(null);
                                        }}
                                        placeholder={t("signup.passwordPlaceholder")}
                                        type="password"
                                        autoComplete="new-password"
                                    />
                                    <div className="signup-desktop-help">{t("signup.passwordGuide")}</div>
                                </div>

                                <div className="signup-desktop-field">
                                    <span className="signup-desktop-label">{t("signup.passwordConfirm")}</span>
                                    <input
                                        className="signup-desktop-input"
                                        value={form.passwordConfirm}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm((prev) => ({ ...prev, passwordConfirm: value }));
                                            setSignupError(null);
                                        }}
                                        placeholder={t("signup.passwordConfirmPlaceholder")}
                                        type="password"
                                        autoComplete="new-password"
                                    />
                                </div>

                                {signupError && <div className="signup-desktop-error">{signupError}</div>}

                                <div className="signup-desktop-actions">
                                    <button type="button" className="signup-desktop-btn ghost" onClick={() => { setSignupError(null); setStep(1); }} >
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