import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sendResetPasswordCode, verifyResetPasswordCode, resetPasswordWithToken, ApiError, } from "../../../api/client";
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
    return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export default function ResetPassword(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

    const [step, setStep] = React.useState<Step>(1);
    const [form, setForm] = React.useState<FormState>({
        loginId: "",
        email: "",
        code: "",
        newPassword: "",
        newPasswordConfirm: "",
    });
    const [sending, setSending] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [errorVisible, setErrorVisible] = React.useState(false);

    const [resetToken, setResetToken] = React.useState("");
    const [sendSuccess, setSendSuccess] = React.useState<string | null>(null);
    const [sendSuccessVisible, setSendSuccessVisible] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState<string | null>(null);
    const [passwordErrorVisible, setPasswordErrorVisible] = React.useState(false);
    const [confirmError, setConfirmError] = React.useState<string | null>(null);
    const [confirmErrorVisible, setConfirmErrorVisible] = React.useState(false);

    const [codeSent, setCodeSent] = React.useState(false);
    const [remainingSeconds, setRemainingSeconds] = React.useState(0);

    const errorTimerRef = React.useRef<number | null>(null);
    const errorFadeTimerRef = React.useRef<number | null>(null);
    const sendSuccessTimerRef = React.useRef<number | null>(null);
    const sendSuccessFadeTimerRef = React.useRef<number | null>(null);
    const passwordErrorTimerRef = React.useRef<number | null>(null);
    const passwordErrorFadeTimerRef = React.useRef<number | null>(null);
    const confirmErrorTimerRef = React.useRef<number | null>(null);
    const confirmErrorFadeTimerRef = React.useRef<number | null>(null);

    const canSendCode = form.loginId.trim().length > 0 && form.email.trim().length > 0;
    const canVerifyCode = form.code.trim().length > 0;
    const passwordMismatch =
        form.newPasswordConfirm.length > 0 &&
        form.newPassword !== form.newPasswordConfirm;

    const canSubmit =
        form.newPassword.length > 0 &&
        form.newPasswordConfirm.length > 0 &&
        form.newPassword === form.newPasswordConfirm &&
        !submitting;

    const passwordNoticeMessage = passwordError ?? confirmError ?? (passwordMismatch ? t("resetPassword.passwordMismatch") : "");
    const passwordNoticeVisible = passwordErrorVisible || confirmErrorVisible || passwordMismatch;

    function clearTimer(timerRef: React.MutableRefObject<number | null>) {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }
    }

    function showError(message: string) {
        setSendSuccess(null);
        setSendSuccessVisible(false);
        clearTimer(sendSuccessTimerRef);
        clearTimer(sendSuccessFadeTimerRef);

        setError(message);
        setErrorVisible(true);
        clearTimer(errorTimerRef);
        clearTimer(errorFadeTimerRef);

        errorTimerRef.current = window.setTimeout(() => {
            setErrorVisible(false);

            errorFadeTimerRef.current = window.setTimeout(() => {
                setError(null);
            }, 250);
        }, 3000);
    }

    function showSendSuccess(message: string) {
        setError(null);
        setErrorVisible(false);
        clearTimer(errorTimerRef);
        clearTimer(errorFadeTimerRef);

        setSendSuccess(message);
        setSendSuccessVisible(true);
        clearTimer(sendSuccessTimerRef);
        clearTimer(sendSuccessFadeTimerRef);

        sendSuccessTimerRef.current = window.setTimeout(() => {
            setSendSuccessVisible(false);

            sendSuccessFadeTimerRef.current = window.setTimeout(() => {
                setSendSuccess(null);
            }, 250);
        }, 3000);
    }

    function showPasswordError(message: string) {
        setConfirmError(null);
        setConfirmErrorVisible(false);
        clearTimer(confirmErrorTimerRef);
        clearTimer(confirmErrorFadeTimerRef);

        setPasswordError(message);
        setPasswordErrorVisible(true);
        clearTimer(passwordErrorTimerRef);
        clearTimer(passwordErrorFadeTimerRef);

        passwordErrorTimerRef.current = window.setTimeout(() => {
            setPasswordErrorVisible(false);

            passwordErrorFadeTimerRef.current = window.setTimeout(() => {
                setPasswordError(null);
            }, 250);
        }, 3000);
    }

    function showConfirmError(message: string) {
        setPasswordError(null);
        setPasswordErrorVisible(false);
        clearTimer(passwordErrorTimerRef);
        clearTimer(passwordErrorFadeTimerRef);

        setConfirmError(message);
        setConfirmErrorVisible(true);
        clearTimer(confirmErrorTimerRef);
        clearTimer(confirmErrorFadeTimerRef);

        confirmErrorTimerRef.current = window.setTimeout(() => {
            setConfirmErrorVisible(false);

            confirmErrorFadeTimerRef.current = window.setTimeout(() => {
                setConfirmError(null);
            }, 250);
        }, 3000);
    }

    function hideError() {
        setErrorVisible(false);
        clearTimer(errorTimerRef);
        clearTimer(errorFadeTimerRef);

        errorFadeTimerRef.current = window.setTimeout(() => {
            setError(null);
        }, 350);
    }

    function hideSendSuccess() {
        setSendSuccessVisible(false);
        clearTimer(sendSuccessTimerRef);
        clearTimer(sendSuccessFadeTimerRef);

        sendSuccessFadeTimerRef.current = window.setTimeout(() => {
            setSendSuccess(null);
        }, 350);
    }

    function hidePasswordError() {
        setPasswordErrorVisible(false);
        clearTimer(passwordErrorTimerRef);
        clearTimer(passwordErrorFadeTimerRef);

        passwordErrorFadeTimerRef.current = window.setTimeout(() => {
            setPasswordError(null);
        }, 350);
    }

    function hideConfirmError() {
        setConfirmErrorVisible(false);
        clearTimer(confirmErrorTimerRef);
        clearTimer(confirmErrorFadeTimerRef);

        confirmErrorFadeTimerRef.current = window.setTimeout(() => {
            setConfirmError(null);
        }, 350);
    }

    function hideStepOneNotice() {
        hideError();
        hideSendSuccess();
    }

    function hidePasswordNotice() {
        hideError();
        hidePasswordError();
        hideConfirmError();
    }

    async function handleSendCode() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!loginId || !email) {
            showError(t("resetPassword.requiredLoginIdEmail"));
            return;
        }

        setSending(true);
        hideStepOneNotice();

        try {
            const res = await sendResetPasswordCode({
                loginId,
                email,
                language: i18n.language,
            });

            setCodeSent(true);
            setRemainingSeconds(600);
            showSendSuccess(res.message);
        } catch (e) {
            if (e instanceof ApiError) {
                showError(e.message);
            } else {
                showError(t("resetPassword.codeSendFail"));
            }
        } finally {
            setSending(false);
        }
    }

    async function handleVerifyCode() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();
        const code = form.code.trim();

        if (!code) {
            showError(t("resetPassword.codeRequired"));
            return;
        }

        setVerifying(true);
        hideStepOneNotice();

        try {
            const res = await verifyResetPasswordCode({
                loginId,
                email,
                code,
                language: i18n.language,
            });

            setResetToken(res.resetToken);
            setStep(2);
        } catch (e) {
            if (e instanceof ApiError) {
                showError(e.message);
            } else {
                showError(t("resetPassword.codeVerifyFail"));
            }
        } finally {
            setVerifying(false);
        }
    }

    async function handleResetPassword() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (form.newPassword !== form.newPasswordConfirm) {
            showConfirmError(t("resetPassword.passwordMismatch"));
            return;
        }

        setSubmitting(true);
        hidePasswordNotice();

        try {
            await resetPasswordWithToken({
                loginId,
                email,
                resetToken,
                newPassword: form.newPassword,
            });

            alert("비밀번호가 재설정되었습니다.");
            navigate("/login", { replace: true });
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "NEW_PASSWORD_SAME_AS_OLD") {
                    showPasswordError(t("resetPassword.passwordSameAsOld"));
                    return;
                }

                showConfirmError(e.message);
                return;
            }

            showConfirmError(t("resetPassword.fail"));
        } finally {
            setSubmitting(false);
        }
    }

    React.useEffect(() => { // 인증코드 타이머
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

    React.useEffect(() => {
        return () => {
            clearTimer(errorTimerRef);
            clearTimer(errorFadeTimerRef);
            clearTimer(sendSuccessTimerRef);
            clearTimer(sendSuccessFadeTimerRef);
            clearTimer(passwordErrorTimerRef);
            clearTimer(passwordErrorFadeTimerRef);
            clearTimer(confirmErrorTimerRef);
            clearTimer(confirmErrorFadeTimerRef);
        };
    }, []);

    return (
        <div className="reset-desktop-page">
            <header className="reset-desktop-header">
                <div className="reset-desktop-header-inner">
                    <span className="reset-desktop-header-logo">internie</span>
                </div>
            </header>

            <main className="reset-desktop-main">
                <div className="reset-desktop-container">
                    <h1 className="reset-desktop-title">{t("resetPassword.title")}</h1>
                    <p className="reset-desktop-subtitle">{t("resetPassword.subtitle")}</p>

                    <section className="reset-desktop-card">
                        {step === 1 && (
                            <>
                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">{t("login.id")}</span>
                                    <div className="reset-desktop-input-wrap">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.loginId}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, loginId: e.target.value, code: "" }));
                                                hideStepOneNotice();
                                                setCodeSent(false);
                                                setRemainingSeconds(0);
                                            }}
                                            placeholder={t("login.idPlaceholder")}
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>

                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">{t("signup.email")}</span>
                                    <div className="reset-desktop-inline">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.email}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, email: e.target.value, code: "" }));
                                                hideStepOneNotice();
                                                setCodeSent(false);
                                                setRemainingSeconds(0);
                                            }}
                                            placeholder={t("signup.emailPlaceholder")}
                                            autoComplete="email"
                                        />
                                        <button type="button" className="reset-desktop-btn ghost reset-desktop-inline-btn" onClick={handleSendCode} disabled={sending || !canSendCode} >
                                            {codeSent ? t("signup.resendEmailVC") : t("signup.getEmailVC")}
                                        </button>
                                    </div>
                                </div>

                                {codeSent && (
                                    <div className="reset-desktop-field">
                                        <span className="reset-desktop-label">{t("signup.verifyCode")}</span>
                                        <div className="reset-desktop-code-wrap">
                                            <input
                                                className="reset-desktop-input reset-desktop-code-input"
                                                value={form.code}
                                                onChange={(e) => {setForm((prev) => ({ ...prev, code: e.target.value })); hideError(); }}
                                                placeholder={t("signup.enterEmailVC")}
                                            />
                                            <span className="reset-desktop-code-timer">{formatTime(remainingSeconds)}</span>
                                        </div>
                                    </div>
                                )}
                                <div className={`reset-desktop-notice ${error ? "is-error" : ""} ${(errorVisible || sendSuccessVisible) ? "is-visible" : ""}`}>
                                    {error ?? sendSuccess ?? ""}
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">{t("login.pw")}</span>
                                    <div className="reset-desktop-input-wrap">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.newPassword}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, newPassword: e.target.value }));
                                                hidePasswordError();

                                                if (confirmError) {
                                                    hideConfirmError();
                                                }
                                            }}
                                            placeholder={t("login.passwordPlaceholder")}
                                            type={showNewPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="reset-desktop-pw-toggle" onClick={() => setShowNewPassword((prev) => !prev)} aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 보기"} >
                                            <img className="reset-desktop-pw-blind" src={showNewPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                        </button>
                                    </div>
                                </div>

                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">{t("signup.passwordConfirm")}</span>
                                    <div className="reset-desktop-input-wrap">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.newPasswordConfirm}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, newPasswordConfirm: e.target.value }));
                                                hideConfirmError();
                                            }}
                                            placeholder={t("signup.passwordConfirmPlaceholder")}
                                            type={showNewPasswordConfirm ? "text" : "password"}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="reset-desktop-pw-toggle" onClick={() => setShowNewPasswordConfirm((prev) => !prev)} aria-label={showNewPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"} >
                                            <img className="login-desktop-pw-blind" src={showNewPasswordConfirm ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                        </button>
                                    </div>
                                </div>
                                <div className={`reset-desktop-notice is-error ${passwordNoticeVisible ? "is-visible" : ""}`}>
                                    {passwordNoticeMessage}
                                </div>
                            </>
                        )}

                        <div className="reset-desktop-actions">
                            {step === 1 && (
                                <button type="button" className="reset-desktop-btn primary" onClick={handleVerifyCode} disabled={verifying || !codeSent || !canVerifyCode || remainingSeconds <= 0} >
                                    {verifying ? t("signup.verifying") : t("resetPassword.next")}
                                </button>
                            )}

                            {step === 2 && (
                                <button type="button" className="reset-desktop-btn primary" onClick={handleResetPassword} disabled={submitting || !canSubmit} >
                                    {submitting ? t("resetPassword.submitting") : t("resetPassword.changePassword")}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}