import React, { useState } from "react";
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

type SignupStep = 1 | 2 | 3 | 4;

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

        if (code === "ALREADY_REGISTERED_WITH_GOOGLE") return t("signup.alreadyGoogle");
        if (code === "ALREADY_REGISTERED_WITH_KAKAO") return t("signup.alreadyKakao");
        if (code === "ALREADY_REGISTERED_WITH_LOCAL") return t("signup.alreadyLocal");
        if (code === "EMAIL_COOLDOWN_ACTIVE") return e.message || t("signup.emailCooldownActive");
        if (code === "USER_NOT_FOUND") return t("signup.emailCodeSendFail");
        return e.message || t("signup.emailCodeSendFail");
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

function isValidSignupPassword(value: string): boolean {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/.test(value);
}

function autoClear(setter: React.Dispatch<React.SetStateAction<string | null>>, delay = 3000) {
    setTimeout(() => setter(null), delay);
}

export default function Signup(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [step, setStep] = React.useState<SignupStep>(1);
    const [form, setForm] = React.useState<FormState>({
        loginId: "",
        password: "",
        passwordConfirm: "",
        email: "",
    });

    const [code, setCode] = React.useState("");
    const [sendingCode, setSendingCode] = React.useState(false);
    const [verifyingCode, setVerifyingCode] = React.useState(false);
    const [checkingLoginId, setCheckingLoginId] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const [emailVerified, setEmailVerified] = React.useState(false);
    const [emailCodeSent, setEmailCodeSent] = React.useState(false);
    const [emailCodeExpiresAt, setEmailCodeExpiresAt] = React.useState<number | null>(null);
    const [emailCodeTimeLeft, setEmailCodeTimeLeft] = React.useState(0);

    const [loginIdChecked, setLoginIdChecked] = React.useState(false);
    const [loginIdAvailable, setLoginIdAvailable] = React.useState<boolean | null>(null);
    const [loginIdInfo, setLoginIdInfo] = React.useState<string | null>(null);

    const [emailInfo, setEmailInfo] = React.useState<string | null>(null);
    const [emailError, setEmailError] = React.useState<string | null>(null);
    const [codeError, setCodeError] = React.useState<string | null>(null);
    const [loginIdError, setLoginIdError] = React.useState<string | null>(null);
    const [passwordError, setPasswordError] = React.useState<string | null>(null);
    const [signupError, setSignupError] = React.useState<string | null>(null);
    
    const [accountExistsModalOpen, setAccountExistsModalOpen] = React.useState(false);
    const [accountExistsMessage, setAccountExistsMessage] = React.useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const [openGuide, setOpenGuide] = React.useState<"loginId" | "password" | null>(null);
    const guideWrapRef = React.useRef<HTMLDivElement | null>(null);

    const prevEmailRef = React.useRef(form.email);
    const prevLoginIdRef = React.useRef(form.loginId);

    const canSendEmailCode = form.email.trim().length > 0 && !sendingCode;
    const canGoLoginIdStep = emailVerified;
    const canGoPasswordStep = loginIdChecked && loginIdAvailable === true;
    const canSubmit =
        form.password.length > 0 &&
        form.passwordConfirm.length > 0 &&
        form.password === form.passwordConfirm &&
        !submitting;
    
    const passwordInvalid = form.password.length > 0 && !isValidSignupPassword(form.password);
    const passwordConfirmInvalid =
        form.passwordConfirm.length > 0 &&
        form.password.length > 0 &&
        form.password !== form.passwordConfirm;

    React.useEffect(() => {
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;

        setEmailVerified(false);
        setEmailCodeSent(false);
        setEmailCodeExpiresAt(null);
        setEmailCodeTimeLeft(0);
        setCode("");
        setEmailInfo(null);
        setEmailError(null);
        setCodeError(null);

        if (step >= 2) {
            setStep(1);
        }
    }, [form.email, step]);

    React.useEffect(() => {
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;

        setLoginIdChecked(false);
        setLoginIdAvailable(null);
        setLoginIdInfo(null);
        setLoginIdError(null);

        if (step >= 4) {
            setStep(3);
        }
    }, [form.loginId, step]);

    React.useEffect(() => {
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
        function handleClickOutside(e: MouseEvent) {
            if (!guideWrapRef.current) return;
            if (!guideWrapRef.current.contains(e.target as Node)) {
                setOpenGuide(null);
            }
        }

        if (openGuide !== null) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openGuide]);

    function handleBack() {
        if (step === 1) {
            navigate("/login");
            return;
        }

        if (step === 2) {
            setCodeError(null);
            setStep(1);
            return;
        }

        if (step === 3) {
            setLoginIdError(null);
            setStep(2);
            return;
        }

        setPasswordError(null);
        setSignupError(null);
        setStep(3);
    }

    async function handleSendEmailCode() {
        const email = form.email.trim();
        const isResend = emailCodeSent;

        if (!email) {
            setEmailError(t("signup.emailRequired"));
            return;
        }

        setSendingCode(true);
        setEmailError(null);
        setCodeError(null);
        setEmailInfo(null);
        setEmailVerified(false);
        setCode("");

        try {
            const res = await sendEmailCode(email, language);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                if (res.existingAccountType === "GOOGLE") {
                    setAccountExistsMessage(t("signup.alreadyGoogle"));
                } else if (res.existingAccountType === "KAKAO") {
                    setAccountExistsMessage(t("signup.alreadyKakao"));
                } else if (res.existingAccountType === "LOCAL") {
                    setAccountExistsMessage(t("signup.alreadyLocal"));
                } else {
                    setAccountExistsMessage(t("signup.emailAlreadyUsed"));
                }

                setAccountExistsModalOpen(true);
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
            autoClear(setEmailInfo);
            setStep(2);
        } catch (e: unknown) {
            setEmailError(getSendEmailErrorMessage(e, t));
            autoClear(setEmailError);
        } finally {
            setSendingCode(false);
        }
    }

    async function handleVerifyEmailCode(inputCode?: string) {
        const email = form.email.trim();
        const trimmedCode = (inputCode ?? code).trim();

        if (!email) {
            setCodeError(t("signup.emailRequired"));
            return;
        }

        if (!trimmedCode) {
            setCodeError(t("signup.emailCodeRequired"));
            return;
        }

        if (trimmedCode.length !== 6) {
            return;
        }

        if (emailCodeTimeLeft <= 0) {
            setCodeError(t("signup.emailCodeExpired"));
            autoClear(setCodeError);
            return;
        }

        if (verifyingCode || emailVerified) {
            return;
        }

        setVerifyingCode(true);
        setCodeError(null);

        try {
            const res = await verifyEmailCode(email, trimmedCode);

            if (res.verified) {
                setEmailVerified(true);
                setEmailCodeExpiresAt(null);
                setEmailCodeTimeLeft(0);
                setEmailInfo(t("signup.emailVerifiedDone", { email: res.maskedEmail }));
                autoClear(setEmailInfo);
                setStep(3);
                return;
            }

            if (res.existingAccountFound) {
                setCode("");
                setEmailVerified(false);
                setCodeError(t("signup.emailAlreadyUsed"));
                return;
            }

            setCode("");
            setEmailVerified(false);
            setCodeError(t("signup.emailVerifyFail"));
        } catch (e: unknown) {
            setCode("");
            setEmailVerified(false);
            setCodeError(getVerifyEmailErrorMessage(e, t));
        } finally {
            setVerifyingCode(false);
        }
    }

    async function handleCodeChange(value: string) {
        const nextValue = value.replace(/\D/g, "").slice(0, 6);
        setCode(nextValue);
        setCodeError(null);

        if (emailVerified) return;
        if (emailCodeTimeLeft <= 0) return;
        if (nextValue.length !== 6) return;

        await handleVerifyEmailCode(nextValue);
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

            if (res.available) {
                setLoginIdInfo(t("signup.loginIdAvailable"));
                return;
            }

            setLoginIdInfo(null);
            setLoginIdError(res.message);
            autoClear(setLoginIdError);
        } catch (e: unknown) {
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

        if (!emailVerified) {
            setSignupError(t("signup.emailVerifyRequired"));
            return;
        }

        if (!loginId) {
            setSignupError(t("signup.loginIdRequired"));
            return;
        }

        if (!loginIdChecked || loginIdAvailable !== true) {
            setSignupError(t("signup.loginIdCheckRequired"));
            return;
        }

        if (!password || !passwordConfirm) {
            setPasswordError(t("signup.required"));
            return;
        }

        if (!isValidSignupPassword(password)) {
            setPasswordError(t("signup.invalidPasswordFormat"));
            return;
        }

        if (password !== passwordConfirm) {
            setPasswordError(t("signup.passwordMismatch"));
            return;
        }

        setSubmitting(true);
        setPasswordError(null);
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
            const message = getSignupErrorMessage(e, t);
            setSignupError(message);
            autoClear(setSignupError);
        } finally {
            setSubmitting(false);
        }
    }

    function renderStepTitle(): string {
        if (step === 1) return t("signup.mobileStepEmailTitle", "이메일 인증하기");
        if (step === 2) return t("signup.mobileStepCodeTitle", "인증코드 입력");
        if (step === 3) return t("signup.mobileStepLoginIdTitle", "회원가입");
        return t("signup.mobileStepLoginIdTitle", "회원가입");
    }

    function renderHeaderTitle(): string {
        return t("signup.title", "회원가입");
    }

    return (
        <>
            {accountExistsModalOpen && (
                <div className="signup-mobile-modal-overlay" onClick={() => setAccountExistsModalOpen(false)}>
                    <div className="signup-mobile-modal" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="signup-mobile-modal-close" onClick={() => setAccountExistsModalOpen(false)} aria-label={t("common.close", "닫기")} >
                            <img src="/icons/x-01.svg" alt="" />
                        </button>

                        <div className="signup-mobile-modal-icon" aria-hidden="true">
                            <img src="/icons/notify-01-blue.svg" alt="" />
                        </div>

                        <div className="signup-mobile-modal-text">
                            {accountExistsMessage || t("signup.emailAlreadyUsed")}
                        </div>

                        <button type="button" className="signup-mobile-modal-confirm" onClick={() => navigate("/login")} >
                            {t("signup.goToLogin", "로그인 화면으로")}
                        </button>
                    </div>
                </div>
            )}
            <div className="signup-mobile-page">
                <header className="signup-mobile-header">
                    <button type="button" className="signup-mobile-back-btn" onClick={handleBack} aria-label={t("common.back", "뒤로가기")}>
                        <img src="/icons/chevron-left.svg" alt="" />
                    </button>
                    <div className="signup-mobile-header-title">{renderHeaderTitle()}</div>
                </header>
                <main className="signup-mobile-main">
                    <section className="signup-mobile-section">
                        <h2 className="signup-mobile-step-title">{renderStepTitle()}</h2>

                        {step === 1 && (
                            <>
                                <div className="signup-mobile-field">
                                    <input
                                        className="signup-mobile-input"
                                        value={form.email}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, email: e.target.value }));
                                            setEmailError(null);
                                        }}
                                        placeholder={t("signup.emailPlaceholder", "이메일 입력하기")}
                                        autoComplete="email"
                                        inputMode="email"
                                    />
                                </div>

                                {emailInfo && <div className="signup-mobile-info">{emailInfo}</div>}
                                {emailError && <div className="signup-mobile-error">{emailError}</div>}

                                <button type="button" className="signup-mobile-submit-btn" onClick={handleSendEmailCode} disabled={!canSendEmailCode} >
                                    {sendingCode ? t("signup.sending", "전송 중") : t("signup.getEmailVC", "인증코드 보내기")}
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="signup-mobile-field">
                                    <div className="signup-mobile-input-wrap">
                                        <input
                                            className="signup-mobile-input signup-mobile-input--timer"
                                            value={code}
                                            onChange={(e) => {
                                                void handleCodeChange(e.target.value);
                                            }}
                                            placeholder={
                                                language === "en"
                                                    ? "Check your inbox for the verification code."
                                                    : t("signup.enterEmailVC", "메일함에서 인증코드를 확인하세요")
                                            }
                                            inputMode="numeric"
                                            disabled={emailVerified || emailCodeTimeLeft <= 0}
                                        />
                                        {!emailVerified && emailCodeTimeLeft > 0 && (
                                            <span className="signup-mobile-timer">{formatRemainingTime(emailCodeTimeLeft)}</span>
                                        )}
                                    </div>
                                </div>

                                {emailInfo && <div className="signup-mobile-info">{emailInfo}</div>}
                                {codeError && <div className="signup-mobile-error">{codeError}</div>}
                                {emailCodeTimeLeft <= 0 && !emailVerified && (
                                    <div className="signup-mobile-error">
                                        {t("signup.emailCodeExpired", "인증 시간이 만료되었습니다. 인증코드를 다시 요청해주세요.")}
                                    </div>
                                )}

                                <button type="button" className="signup-mobile-submit-btn" onClick={() => handleVerifyEmailCode()} disabled={!canGoLoginIdStep && (code.trim().length !== 6 || verifyingCode)} >
                                    {verifyingCode ? t("signup.verifying", "확인 중") : t("signup.next", "다음")}
                                </button>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div className="signup-mobile-label-row" ref={openGuide === "loginId" ? guideWrapRef : null}>
                                    <span className="signup-mobile-label">{t("login.id", "아이디")}</span>
                                    <button
                                        type="button"
                                        className="signup-mobile-guide-btn"
                                        aria-label={t("signup.loginIdGuide", "영문 소문자 or 숫자를 활용해 4-20자로 만들어주세요")}
                                        onClick={() => setOpenGuide((prev) => (prev === "loginId" ? null : "loginId"))}
                                    >
                                        <img src="/icons/info-01-6b.svg" alt="" />
                                    </button>
                                    {openGuide === "loginId" && (
                                        <div className="signup-mobile-guide-bubble">
                                            {t("signup.loginIdGuide", "영문 소문자 or 숫자를 활용해 4-20자로 만들어주세요")}
                                        </div>
                                    )}
                                </div>

                                <div className="signup-mobile-inline-field">
                                    <input
                                        className={`signup-mobile-input signup-mobile-input--inline ${loginIdError ? "is-error" : ""}`}
                                        value={form.loginId}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, loginId: e.target.value }));
                                            setLoginIdError(null);
                                        }}
                                        placeholder={t("signup.loginIdPlaceholder", "아이디를 입력하세요")}
                                        autoComplete="username"
                                    />
                                    <button
                                        type="button"
                                        className={`signup-mobile-side-btn ${loginIdChecked && loginIdAvailable ? "is-confirmed" : ""}`}
                                        onClick={handleCheckLoginId}
                                        disabled={checkingLoginId || (loginIdChecked && loginIdAvailable === true) || !form.loginId.trim()}
                                    >
                                        {checkingLoginId
                                            ? t("signup.checking", "확인 중")
                                            : loginIdChecked && loginIdAvailable === true
                                                ? t("signup.checked", "확인됨")
                                                : t("signup.checkLoginId", "중복확인")}
                                    </button>
                                </div>

                                {loginIdInfo && loginIdAvailable === true && <div className="signup-mobile-info">{loginIdInfo}</div>}
                                {loginIdError && <div className="signup-mobile-error">{loginIdError}</div>}

                                <button type="button" className="signup-mobile-submit-btn" onClick={() => setStep(4)} disabled={!canGoPasswordStep} >
                                    {t("signup.next", "다음")}
                                </button>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <div className="signup-mobile-label-row" ref={openGuide === "password" ? guideWrapRef : null}>
                                    <span className="signup-mobile-label">{t("login.pw", "비밀번호")}</span>
                                    <button
                                        type="button"
                                        className="signup-mobile-guide-btn"
                                        aria-label={t("signup.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다")}
                                        onClick={() => setOpenGuide((prev) => (prev === "password" ? null : "password"))}
                                    >
                                        <img src="/icons/info-01-6b.svg" alt="" />
                                    </button>
                                    {openGuide === "password" && (
                                        <div className="signup-mobile-guide-bubble">
                                            {t("signup.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다")}
                                        </div>
                                    )}
                                </div>

                                <div className="signup-mobile-field signup-mobile-password-wrap">
                                    <input
                                        className={`signup-mobile-input signup-mobile-password-input ${passwordInvalid || passwordError ? "is-error" : ""}`}
                                        value={form.password}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, password: e.target.value }));
                                            setPasswordError(null);
                                            setSignupError(null);
                                        }}
                                        placeholder={t("signup.passwordPlaceholder", "비밀번호를 입력하세요")}
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="signup-mobile-password-toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={t("login.passwordVisibilityToggle", "비밀번호 표시 전환")}
                                    >
                                        <img src={showPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                    </button>
                                </div>

                                {(passwordInvalid || passwordError) && (
                                    <div className="signup-mobile-error">
                                        {passwordError || t("signup.passwordGuide", "영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함한 8~20자여야 합니다")}
                                    </div>
                                )}

                                <div className="signup-mobile-field signup-mobile-field--second signup-mobile-password-wrap">
                                    <input
                                        className={`signup-mobile-input signup-mobile-password-input ${passwordConfirmInvalid ? "is-error" : ""}`}
                                        value={form.passwordConfirm}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, passwordConfirm: e.target.value }));
                                            setPasswordError(null);
                                            setSignupError(null);
                                        }}
                                        placeholder={t("signup.passwordConfirmPlaceholder", "비밀번호를 다시 입력하세요")}
                                        type={showPasswordConfirm ? "text" : "password"}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="signup-mobile-password-toggle"
                                        onClick={() => setShowPasswordConfirm((prev) => !prev)}
                                        aria-label={t("login.passwordVisibilityToggle", "비밀번호 표시 전환")}
                                    >
                                        <img src={showPasswordConfirm ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                    </button>
                                </div>

                                {passwordConfirmInvalid && (
                                    <div className="signup-mobile-error">
                                        {t("signup.passwordMismatch", "비밀번호가 일치하지 않습니다")}
                                    </div>
                                )}
                                {signupError && <div className="signup-mobile-error">{signupError}</div>}

                                <button type="button" className="signup-mobile-submit-btn" onClick={handleSignup} disabled={!canSubmit}>
                                    {submitting ? t("signup.submitting", "가입 중") : t("signup.submit", "회원가입")}
                                </button>
                            </>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}