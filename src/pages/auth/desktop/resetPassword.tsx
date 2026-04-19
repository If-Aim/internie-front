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

    const [resetToken, setResetToken] = React.useState("");
    const [sendSuccess, setSendSuccess] = React.useState<string | null>(null);
    const [passwordError, setPasswordError] = React.useState<string | null>(null);
    const [confirmError, setConfirmError] = React.useState<string | null>(null);

    const [codeSent, setCodeSent] = React.useState(false);
    const [remainingSeconds, setRemainingSeconds] = React.useState(0);

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

    async function handleSendCode() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (!loginId || !email) {
            setError("아이디와 이메일을 입력해주세요.");
            return;
        }

        setSending(true);
        setError(null);
        setSendSuccess(null);

        try {
            const res = await sendResetPasswordCode({
                loginId,
                email,
                language: i18n.language,
            });

            setCodeSent(true);
            setRemainingSeconds(600);
            setSendSuccess(res.message);
        } catch (e) {
            if (e instanceof ApiError) {
                setError(e.message);
            } else {
                setError("인증코드 발송에 실패했습니다.");
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
            setError("인증코드를 입력해주세요.");
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const res = await verifyResetPasswordCode({
                loginId,
                email,
                code,
                language: i18n.language,
            });

            setResetToken(res.resetToken);
            setError(null);
            setStep(2);
        } catch (e) {
            if (e instanceof ApiError) {
                setError(e.message);
            } else {
                setError("인증코드가 올바르지 않습니다.");
            }
        } finally {
            setVerifying(false);
        }
    }

    async function handleResetPassword() {
        const loginId = form.loginId.trim();
        const email = form.email.trim();

        if (form.newPassword !== form.newPasswordConfirm) {
            setConfirmError("비밀번호가 일치하지 않습니다.");
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

            alert("비밀번호가 재설정되었습니다.");
            navigate("/login", { replace: true });
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "NEW_PASSWORD_SAME_AS_OLD") {
                    setPasswordError("새 비밀번호는 이전에 사용하던 비밀번호와 달라야 합니다.");
                    return;
                }
                setError(e.message);
                return;
            }

            setError("비밀번호 재설정에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    React.useEffect(() => {
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
                                    <span className="reset-desktop-label">아이디</span>
                                    <input
                                        className="reset-desktop-input"
                                        value={form.loginId}
                                        onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))}
                                        placeholder="아이디를 입력해주세요"
                                        autoComplete="username"
                                    />
                                </div>

                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">이메일</span>
                                    <div className="reset-desktop-inline">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.email}
                                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                            placeholder="이메일을 입력해주세요"
                                            autoComplete="email"
                                        />
                                        <button type="button" className="reset-desktop-btn ghost reset-desktop-inline-btn" onClick={handleSendCode} disabled={sending || !canSendCode} >
                                            {codeSent ? "재전송" : "인증하기"}
                                        </button>
                                    </div>
                                </div>

                                {codeSent && (
                                    <div className="reset-desktop-field">
                                        <span className="reset-desktop-label">인증코드</span>
                                        <div className="reset-desktop-code-wrap">
                                            <input
                                                className="reset-desktop-input reset-desktop-code-input"
                                                value={form.code}
                                                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                                                placeholder="인증코드를 입력해주세요"
                                            />
                                            <span className="reset-desktop-code-timer">{formatTime(remainingSeconds)}</span>
                                        </div>
                                    </div>
                                )}

                                {sendSuccess && <div className="reset-desktop-info">{sendSuccess}</div>}
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">비밀번호</span>
                                    <div className="reset-desktop-input-wrap">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.newPassword}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, newPassword: e.target.value }));
                                                setPasswordError(null);
                                            }}
                                            placeholder={t("login.passwordPlaceholder")}
                                            type={showNewPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="reset-desktop-pw-toggle" onClick={() => setShowNewPassword((prev) => !prev)} aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 보기"} >
                                            <img className="login-desktop-pw-blind" src={showNewPassword ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                        </button>
                                    </div>
                                    {passwordError && <div className="reset-desktop-error">{passwordError}</div>}
                                </div>

                                <div className="reset-desktop-field">
                                    <span className="reset-desktop-label">비밀번호 확인</span>
                                    <div className="reset-desktop-input-wrap">
                                        <input
                                            className="reset-desktop-input"
                                            value={form.newPasswordConfirm}
                                            onChange={(e) => {
                                                setForm((prev) => ({ ...prev, newPasswordConfirm: e.target.value }));
                                                setConfirmError(null);
                                            }}
                                            placeholder="비밀번호를 다시 입력해주세요"
                                            type={showNewPasswordConfirm ? "text" : "password"}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="reset-desktop-pw-toggle" onClick={() => setShowNewPasswordConfirm((prev) => !prev)} aria-label={showNewPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"} >
                                            <img className="login-desktop-pw-blind" src={showNewPasswordConfirm ? "/icons/carbon_view-6b.svg" : "/icons/carbon_view-6b-blind.svg"} alt="" />
                                        </button>
                                    </div>
                                    {(confirmError || passwordMismatch) && (
                                        <div className="reset-desktop-error">
                                            {confirmError ?? "비밀번호가 일치하지 않습니다."}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {error && <div className="reset-desktop-error">{error}</div>}

                        <div className="reset-desktop-actions">
                            {step === 1 && (
                                <button type="button" className="reset-desktop-btn primary" onClick={handleVerifyCode} disabled={verifying || !codeSent || !canVerifyCode || remainingSeconds <= 0} >
                                    {verifying ? "확인 중..." : "다음"}
                                </button>
                            )}

                            {step === 2 && (
                                <button type="button" className="reset-desktop-btn primary" onClick={handleResetPassword} disabled={submitting || !canSubmit} >
                                    {submitting ? "처리 중..." : "비밀번호 변경"}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}