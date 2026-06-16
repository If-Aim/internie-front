import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sendResetPasswordCode, verifyResetPasswordCode, resetPasswordWithToken, ApiError } from "../../../api/client";
import "./resetPassword.css";

type Step = 1 | 2;

type FormState = {
    loginId: string;
    email: string;
    code: string;
    newPassword: string;
    newPasswordConfirm: string;
};

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function isValidResetPassword(value: string): boolean {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/.test(value);
}

export default function ResetPassword(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormState>({
        loginId: "",
        email: "",
        code: "",
        newPassword: "",
        newPasswordConfirm: "",
    });

    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [errorVisible, setErrorVisible] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [infoVisible, setInfoVisible] = useState(false);

    const [resetToken, setResetToken] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [openGuide, setOpenGuide] = useState<"password" | null>(null);
    const [successModalOpen, setSuccessModalOpen] = useState(false);

    const guideWrapRef = useRef<HTMLDivElement | null>(null);
    const prevLoginIdRef = useRef(form.loginId);
    const prevEmailRef = useRef(form.email);

    const canSendCode = form.loginId.trim().length > 0 && form.email.trim().length > 0 && !sending;
    const canVerifyCode = form.code.trim().length > 0 && !verifying && remainingSeconds > 0;
    const passwordInvalid = form.newPassword.length > 0 && !isValidResetPassword(form.newPassword);
    const passwordMismatch =
        form.newPasswordConfirm.length > 0 &&
        form.newPassword.length > 0 &&
        form.newPassword !== form.newPasswordConfirm;

    const canSubmit =
        form.newPassword.length > 0 &&
        form.newPasswordConfirm.length > 0 &&
        form.newPassword === form.newPasswordConfirm &&
        isValidResetPassword(form.newPassword) &&
        !submitting;

    function showError(message: string) {
        setError(message);
        setErrorVisible(true);

        setTimeout(() => {
            setErrorVisible(false);
        }, 2000);

        setTimeout(() => {
            setError(null);
        }, 3000);
    }

    function showInfo(message: string) {
        setInfo(message);
        setInfoVisible(true);

        setTimeout(() => setInfoVisible(false), 2000);
        setTimeout(() => setInfo(null), 3000);
    }

    useEffect(() => {
        if (prevLoginIdRef.current === form.loginId) return;
        prevLoginIdRef.current = form.loginId;

        if (step !== 1) return;

        setCodeSent(false);
        setRemainingSeconds(0);
        setInfo(null);
        setInfoVisible(false);
        setError(null);
        setForm((prev) => ({ ...prev, code: "" }));
    }, [form.loginId, step]);

    useEffect(() => {
        if (prevEmailRef.current === form.email) return;
        prevEmailRef.current = form.email;

        if (step !== 1) return;

        setCodeSent(false);
        setRemainingSeconds(0);
        setInfo(null);
        setInfoVisible(false);
        setError(null);
        setForm((prev) => ({ ...prev, code: "" }));
    }, [form.email, step]);

    useEffect(() => {
        if (!codeSent || remainingSeconds <= 0) return;

        const timer = window.setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [codeSent, remainingSeconds]);

    useEffect(() => {
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

    async function handleSendCode() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!loginId || !email) {
            showError(t("resetPassword.requiredLoginIdEmail"));
            return;
        }

        setSending(true);
        setError(null);
        setInfo(null);
        setInfoVisible(false);

        try {
            await sendResetPasswordCode({
                loginId,
                email,
                language,
            });

            setCodeSent(true);
            setRemainingSeconds(600);
            setForm((prev) => ({ ...prev, code: "" }));
            showInfo(t("resetPassword.codeSent", { email }));
        } catch {
            showError(t("resetPassword.codeSendFail"));
        } finally {
            setSending(false);
        }
    }

    async function handleVerifyCode() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();
        const code = form.code.trim();

        if (!code) {
            setError(t("resetPassword.codeRequired"));
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const res = await verifyResetPasswordCode({
                loginId,
                email,
                code,
                language,
            });

            setResetToken(res.resetToken);
            setStep(2);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "EMAIL_CODE_INVALID") {
                    showError(t("resetPassword.codeVerifyFail"));
                    return;
                }

                if (e.code === "EMAIL_CODE_EXPIRED") {
                    setError(t("signup.emailCodeExpired"));
                    return;
                }

                setError(t("resetPassword.fail"));
            } else {
                setError(t("resetPassword.fail"));
            }
        } finally {
            setVerifying(false);
        }
    }

    async function handleResetPassword() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!form.newPassword || !form.newPasswordConfirm) {
            setPasswordError(t("resetPassword.passwordRequired"));
            return;
        }

        if (!isValidResetPassword(form.newPassword)) {
            setPasswordError(t("resetPassword.passwordGuide"));
            return;
        }

        if (form.newPassword !== form.newPasswordConfirm) {
            setConfirmError(t("resetPassword.passwordMismatch"));
            return;
        }

        setSubmitting(true);
        setError(null);
        setPasswordError(null);
        setConfirmError(null);

        try {
            await resetPasswordWithToken({
                loginId,
                email,
                resetToken,
                newPassword: form.newPassword,
            });

            setSuccessModalOpen(true);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "NEW_PASSWORD_SAME_AS_OLD") {
                    setPasswordError(t("resetPassword.passwordSameAsOld"));
                    return;
                }

                setError(e.message || t("resetPassword.fail"));
                return;
            }

            setError(t("resetPassword.fail"));
        } finally {
            setSubmitting(false);
        }
    }

    function handleBack() {
        if (step === 1) {
            navigate("/login");
            return;
        }

        setPasswordError(null);
        setConfirmError(null);
        setError(null);
        setStep(1);
    }

    return (
        <>
            {successModalOpen && (
                <div className="find-id-modal-mobile-overlay" onClick={() => setSuccessModalOpen(false)}>
                    <div className="find-id-modal-mobile" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="find-id-modal-mobile-close" onClick={() => setSuccessModalOpen(false)} aria-label={t("common.close")}>
                            <img src="/icons/x-01.svg" alt="" />
                        </button>

                        <div className="find-id-moblie-modal-icon" aria-hidden="true">
                            <img src="/icons/checkcircle-rounded-blue.svg" alt="" />
                        </div>

                        <div className="find-id-modal-mobile-text">
                            {t("resetPassword.resetDone")}
                        </div>

                        <button type="button" className="find-id-modal-mobile-confirm" onClick={() => navigate("/login", { replace: true })}>
                            {t("resetPassword.goLogin")}
                        </button>
                    </div>
                </div>
            )}

            <div className="rp-page">
                <header className="signup-mobile-header">
                    <button type="button" className="signup-mobile-back-btn" onClick={handleBack} aria-label={t("resetPassword.goLogin")}>
                        <img src="/icons/chevron-left.svg" alt="" />
                    </button>
                    <div className="signup-mobile-header-title">{t("resetPassword.title")}</div>
                </header>

                <div className="rp-content">
                    {step === 1 && (
                        <>
                            <h1 className="rp-title">{t("resetPassword.emailVerifyTitle")}</h1>

                            <div className="rp-field">
                                <input
                                    className="rp-input"
                                    value={form.loginId}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, loginId: e.target.value }));
                                        setError(null);
                                    }}
                                    placeholder={t("resetPassword.loginIdPlaceholder")}
                                    autoComplete="username"
                                />
                            </div>

                            <div className="rp-field">
                                <input
                                    className={`rp-input ${error && !codeSent ? "is-error" : ""}`}
                                    value={form.email}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, email: e.target.value }));
                                        setError(null);
                                        setInfo(null);
                                        setInfoVisible(false);
                                    }}
                                    placeholder={t("resetPassword.emailPlaceholder")}
                                    autoComplete="email"
                                    inputMode="email"
                                />
                            </div>

                            {codeSent && (
                                <div className="rp-field rp-code-field rp-field--second">
                                    <input
                                        className={`rp-input rp-code-input ${error ? "is-error" : ""}`}
                                        value={form.code}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, code: e.target.value }));
                                            setError(null);
                                        }}
                                        placeholder={t("resetPassword.codePlaceholder")}
                                        inputMode="numeric"
                                    />
                                    {remainingSeconds > 0 && (
                                        <span className="rp-code-timer">{formatTime(remainingSeconds)}</span>
                                    )}
                                </div>
                            )}

                            {info && (
                                <div className={`rp-info ${infoVisible ? "is-show" : "is-hide"}`}>
                                    {info}
                                </div>
                            )}
                            {error && (
                                <div className={`rp-error ${errorVisible ? "is-show" : "is-hide"}`}>
                                    {error}
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h1 className="rp-title">{t("resetPassword.resetTitle")}</h1>

                            <div className="rp-label-row" ref={openGuide === "password" ? guideWrapRef : null}>
                                <span className="rp-label">{t("login.pw")}</span>
                                <button
                                    type="button"
                                    className="rp-guide-btn"
                                    aria-label={t("resetPassword.passwordGuide")}
                                    onClick={() => setOpenGuide((prev) => (prev === "password" ? null : "password"))}
                                >
                                    <img src="/icons/info-01-6b.svg" alt="" />
                                </button>
                                {openGuide === "password" && (
                                    <div className="rp-guide-bubble">
                                        {t("resetPassword.passwordGuide")}
                                    </div>
                                )}
                            </div>

                            <div className="rp-field rp-password-wrap">
                                <input
                                    className={`rp-input rp-password-input ${passwordInvalid || passwordError ? "is-error" : ""}`}
                                    value={form.newPassword}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, newPassword: e.target.value }));
                                        setPasswordError(null);
                                        setError(null);
                                    }}
                                    placeholder={t("resetPassword.newPasswordPlaceholder")}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                />
                                <button type="button" className="rp-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={t("login.pw")}>
                                    <img src={showPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                </button>
                            </div>

                            {(passwordInvalid || passwordError) && (
                                <div className="rp-error-op1">
                                    {passwordError || t("resetPassword.passwordGuide")}
                                </div>
                            )}

                            <div className="rp-field rp-field--second rp-password-wrap">
                                <input
                                    className={`rp-input rp-password-input ${passwordMismatch || confirmError ? "is-error" : ""}`}
                                    value={form.newPasswordConfirm}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, newPasswordConfirm: e.target.value }));
                                        setConfirmError(null);
                                        setError(null);
                                    }}
                                    placeholder={t("resetPassword.newPasswordConfirmPlaceholder")}
                                    type={showPasswordConfirm ? "text" : "password"}
                                    autoComplete="new-password"
                                />
                                <button type="button" className="rp-password-toggle" onClick={() => setShowPasswordConfirm((prev) => !prev)} aria-label={t("login.pw")}>
                                    <img src={showPasswordConfirm ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                </button>
                            </div>

                            {(passwordMismatch || confirmError) && (
                                <div className="rp-error-op1">
                                    {confirmError || t("resetPassword.passwordMismatch")}
                                </div>
                            )}

                            {error && (
                                <div className={`rp-error ${errorVisible ? "is-show" : "is-hide"}`}>
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="rp-footer">
                    {step === 1 && (
                        <button className="rp-btn rp-btn--primary" type="button" onClick={codeSent ? handleVerifyCode : handleSendCode} disabled={codeSent ? !canVerifyCode : !canSendCode} >
                            {codeSent
                                ? (verifying ? t("resetPassword.verifying") : t("resetPassword.next"))
                                : (sending ? t("resetPassword.sending") : t("resetPassword.next"))}
                        </button>
                    )}

                    {step === 2 && (
                        <button className="rp-btn rp-btn--primary" type="button" onClick={handleResetPassword} disabled={!canSubmit} >
                            {submitting ? t("resetPassword.submitting") : t("resetPassword.changePassword")}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}