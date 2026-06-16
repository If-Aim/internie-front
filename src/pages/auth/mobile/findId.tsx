import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sendFindLoginIdCode, verifyFindLoginIdCode, ApiError } from "../../../api/client";
import "./findId.css";

type FormState = {
    email: string;
    code: string;
};

export default function FindId(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";
    const navigate = useNavigate();

    const [form, setForm] = React.useState<FormState>({
        email: "",
        code: "",
    });
    const [sending, setSending] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);

    const [codeSent, setCodeSent] = React.useState(false);
    const [successModalOpen, setSuccessModalOpen] = React.useState(false);
    const [/*maskedEmail*/, setMaskedEmail] = React.useState("");

    const canSendCode = form.email.trim().length > 0;
    const canVerifyCode = form.code.trim().length > 0;

    async function handleSendCode() {
        const email = form.email.trim();

        if (!email) {
            setError(t("findId.emailRequired"));
            return;
        }

        setSending(true);
        setError(null);
        setInfo(null);

        try {
            const res = await sendFindLoginIdCode(email, language);
            setMaskedEmail(res.maskedEmail);
            setInfo(t("findId.codeSent", { email: res.maskedEmail }));
            setCodeSent(true);
        } catch (e: any) {
            const code = e?.code ?? "";

            if (code === "ALREADY_REGISTERED_WITH_GOOGLE") {
                setError(t("findId.alreadyGoogle"));
            } else if (code === "ALREADY_REGISTERED_WITH_KAKAO") {
                setError(t("findId.alreadyKakao"));
            } else if (code === "USER_NOT_FOUND") {
                setError(t("findId.accountNotFound"));
            } else if (e instanceof ApiError) {
                setError(e.message || t("findId.codeSendFail"));
            } else {
                setError(t("findId.codeSendFail"));
            }
        } finally {
            setSending(false);
        }
    }

    async function handleVerifyCode() {
        const email = form.email.trim();
        const code = form.code.trim();

        if (!code) {
            setError(t("findId.codeRequired"));
            return;
        }

        setVerifying(true);
        setError(null);
        setInfo(null);

        try {
            const res = await verifyFindLoginIdCode(email, code, language);
            setMaskedEmail(res.maskedEmail);
            setSuccessModalOpen(true);
        } catch (e: any) {
            if (e instanceof ApiError) {
                setError(e.message || t("findId.codeVerifyFail"));
            } else {
                setError(t("findId.codeVerifyFail"));
            }
        } finally {
            setVerifying(false);
        }
    }

    return (
        <div className="find-id-mobile-page">
            {successModalOpen && (
                <div className="find-id-mobile-modal-overlay" onClick={() => setSuccessModalOpen(false)}>
                    <div className="find-id-mobile-modal" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="find-id-mobile-modal-close" onClick={() => setSuccessModalOpen(false)} aria-label={t("common.close")}>
                            <img src="/icons/x-01.svg" alt="" />
                        </button>

                        <div className="find-id-mobile-modal-icon" aria-hidden="true">
                            <img src="/icons/mail-01-blue.svg" alt="" />
                        </div>

                        <div className="find-id-mobile-modal-text">
                            {t("findId.checkMailbox")}
                        </div>

                        <button type="button" className="find-id-mobile-modal-confirm" onClick={() => navigate("/login", { replace: true })}>
                            {t("findId.goLoginNow")}
                        </button>
                    </div>
                </div>
            )}

            <div className="find-id-mobile-content">
                <header className="signup-mobile-header">
                    <button type="button" className="signup-mobile-back-btn" onClick={() => navigate("/login")} aria-label={t("findId.backToLogin")}>
                        <img src="/icons/chevron-left.svg" alt="" />
                    </button>
                    <div className="signup-mobile-header-title">{t("findId.title")}</div>
                </header>

                <h1 className="find-id-mobile-title">{t("findId.title")}</h1>

                <div className="find-id-mobile-field">
                    <input
                        className={`find-id-mobile-input ${error && !codeSent ? "is-error" : ""}`}
                        value={form.email}
                        onChange={(e) => {
                            const value = e.target.value;
                            setForm((prev) => ({ ...prev, email: value }));
                            setError(null);
                            setInfo(null);

                            if (codeSent) {
                                setCodeSent(false);
                                setForm((prev) => ({ ...prev, code: "" }));
                            }
                        }}
                        placeholder={t("findId.emailPlaceholder")}
                        autoComplete="email"
                    />
                </div>

                {codeSent && (
                    <div className="find-id-mobile-field find-id-mobile-field--second">
                        <input
                            className={`find-id-mobile-input ${error ? "is-error" : ""}`}
                            value={form.code}
                            onChange={(e) => {
                                setForm((prev) => ({ ...prev, code: e.target.value }));
                                setError(null);
                            }}
                            placeholder={t("findId.codePlaceholder")}
                            inputMode="numeric"
                        />
                    </div>
                )}

                {info && <div className="find-id-mobile-info">{info}</div>}
                {error && <div className="find-id-mobile-error">{error}</div>}
            </div>

            <div className="find-id-mobile-footer">
                {!codeSent ? (
                    <button type="button" className="find-id-mobile-btn find-id-mobile-btn--primary" onClick={handleSendCode} disabled={sending || !canSendCode}>
                        {sending ? t("signup.sending") : t("findId.next")}
                    </button>
                ) : (
                    <button type="button" className="find-id-mobile-btn find-id-mobile-btn--primary" onClick={handleVerifyCode} disabled={verifying || !canVerifyCode} >
                        {verifying ? t("signup.verifying") : t("findId.getId")}
                    </button>
                )}
            </div>
        </div>
    );
}