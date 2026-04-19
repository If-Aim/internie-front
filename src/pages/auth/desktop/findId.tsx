import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, sendFindLoginIdCode, verifyFindLoginIdCode, } from "../../../api/client"; import "./findId.css";
import "./findId.css"

type Step = 1 | 2;

export default function FindId(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const [step, setStep] = React.useState<Step>(1);
    const [form, setForm] = React.useState({
        email: "",
        code: "",
    });

    const [sending, setSending] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);

    const [error, setError] = React.useState<string | null>(null);
    const [sentMessage, setSentMessage] = React.useState<string | null>(null);

    const [popupType, setPopupType] = React.useState<"none" | "notFound" | "success">("none");
    const [popupMessage, setPopupMessage] = React.useState("");

    const language = (i18n.resolvedLanguage ?? i18n.language ?? "ko").startsWith("en") ? "en" : "ko";

    async function handleSendCode() {
        const email = form.email.trim();

        if (!email) {
            setError(t("findId.emailRequired"));
            return;
        }

        setSending(true);
        setError(null);
        setSentMessage(null);

        try {
            const res = await sendFindLoginIdCode(email, language);
            setSentMessage(t("findId.codeSent", { email: res.maskedEmail }));
            setStep(2);
        } catch (e: any) {
            if (e instanceof ApiError) {
                const code = e.code ?? "";

                if (code === "USER_NOT_FOUND") {
                    setPopupType("notFound");
                    setPopupMessage(t("findId.accountNotFound"));
                    return;
                }

                if (code === "ALREADY_REGISTERED_WITH_GOOGLE") {
                    setError(t("findId.alreadyGoogle"));
                    return;
                }

                if (code === "ALREADY_REGISTERED_WITH_KAKAO") {
                    setError(t("findId.alreadyKakao"));
                    return;
                }

                setError(e.message || t("findId.codeSendFail"));
                return;
            }

            setError(t("findId.codeSendFail"));
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

        try {
            const res = await verifyFindLoginIdCode(email, code, language);
            setPopupType("success");
            setPopupMessage(t("findId.idSent", { email: res.maskedEmail }));
        } catch (e: any) {
            if (e instanceof ApiError) {
                setError(e.message || t("findId.codeVerifyFail"));
                return;
            }

            setError(t("findId.codeVerifyFail"));
        } finally {
            setVerifying(false);
        }
    }

    return (
        <>
            <div className="find-id-desktop-page">
                <header className="find-id-desktop-header">
                    <div className="find-id-desktop-header-inner">
                        <span className="find-id-desktop-header-logo">internie</span>
                    </div>
                </header>

                <main className="find-id-desktop-main">
                    <div className="find-id-desktop-container">
                        <h1 className="find-id-desktop-title">{t("findId.title")}</h1>
                        <p className="find-id-desktop-subtitle">{t("findId.subtitle")}</p>

                        <section className="find-id-desktop-card">
                            <div className="find-id-desktop-field">
                                <span className="find-id-desktop-label">{t("signup.email")}</span>
                                <div className="find-id-desktop-inline">
                                    <input
                                        className="find-id-desktop-input"
                                        value={form.email}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm((prev) => ({ ...prev, email: value }));
                                            setError(null);
                                            setSentMessage(null);
                                            if (step === 2) {
                                                setStep(1);
                                            }
                                        }}
                                        placeholder={t("findId.emailPlaceholder")}
                                        autoComplete="email"
                                    />
                                    <button
                                        type="button"
                                        className="find-id-desktop-inline-btn"
                                        onClick={handleSendCode}
                                        disabled={sending || !form.email.trim()}
                                    >
                                        {sending ? t("signup.sending") : step === 2 ? t("signup.resendEmailVC") : t("signup.getEmailVC")}
                                    </button>
                                </div>
                            </div>

                            {step === 2 && (
                                <div className="find-id-desktop-field">
                                    <span className="find-id-desktop-label">{t("findId.codeLabel")}</span>
                                    <input
                                        className="find-id-desktop-input"
                                        value={form.code}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setForm((prev) => ({ ...prev, code: value }));
                                            setError(null);
                                        }}
                                        placeholder={t("findId.codePlaceholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && form.code.trim() && !verifying) {
                                                void handleVerifyCode();
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {sentMessage && <div className="find-id-desktop-info">{sentMessage}</div>}
                            {error && <div className="find-id-desktop-error">{error}</div>}

                            <div className="find-id-desktop-actions">
                                <button type="button" className="find-id-desktop-btn primary" onClick={handleVerifyCode} disabled={step !== 2 || verifying || !form.code.trim()} >
                                    {verifying ? t("signup.verifying") : t("signup.next")}
                                </button>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            {popupType !== "none" && (
                <div className="find-id-modal-overlay">
                    <div className="find-id-modal">
                        <div className="find-id-modal-icon">
                            ?
                        </div>

                        <div className="find-id-modal-text">
                            {popupMessage}
                        </div>

                        <div className="find-id-modal-actions">
                            {popupType === "notFound" ? (
                                <>
                                    <button type="button" className="find-id-modal-btn primary" onClick={() => navigate("/signup")} >
                                        {t("signup.title")}
                                    </button>
                                    <button type="button" className="find-id-modal-btn" onClick={() => setPopupType("none")} >
                                        {t("findId.retry")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="find-id-modal-btn primary"
                                        onClick={() => navigate("/login")}
                                    >
                                        {t("findId.goLoginNow")}
                                    </button>
                                    <button
                                        type="button"
                                        className="find-id-modal-btn"
                                        onClick={() => setPopupType("none")}
                                    >
                                        {t("findId.close")}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}