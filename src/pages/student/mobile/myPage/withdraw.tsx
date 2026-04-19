import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getUserMe, withdraw, type UserMe } from "../../../../api/client";
import "./withdraw.css";

const REASONS = [
    "mypage.WithdrawR.reason.notUsing",
    "mypage.WithdrawR.reason.notUseful",
    "mypage.WithdrawR.reason.tooExpensive",
    "mypage.WithdrawR.reason.privacy",
    "mypage.WithdrawR.reason.etc",
] as const;

type WithdrawReason = typeof REASONS[number] | "";

export default function WithdrawPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [me, setMe] = React.useState<UserMe | null>(null);
    const [reason, setReason] = React.useState<WithdrawReason>("");
    const [detail, setDetail] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const selectWrapRef = React.useRef<HTMLDivElement | null>(null);
    const displayName = (me?.name ?? "").trim() || "회원";
    const isEtcReason = reason === "mypage.WithdrawR.reason.etc";
    const trimmedDetail = detail.trim();
    const canSubmit = !!reason && !submitting && (!isEtcReason || !!trimmedDetail);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const res = await getUserMe();
                if (!mounted) return;
                setMe(res);
            } catch (e) {
                console.error("getUserMe failed:", e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!selectWrapRef.current) return;
            if (!selectWrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    function handleSelectReason(value: typeof REASONS[number]) {
        setReason(value);
        setOpen(false);

        if (value !== "mypage.WithdrawR.reason.etc") {
            setDetail("");
        }
    }

    async function handleWithdraw() {
        if (!canSubmit) return;

        try {
            setSubmitting(true);

            await withdraw({
                reason,
                detail: isEtcReason ? trimmedDetail : "",
            });

            localStorage.removeItem("accessToken");
            navigate("/login", { replace: true });
        } catch (e) {
            console.error("withdraw failed:", e);
            alert("회원탈퇴 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="withdraw-page">
            <header className="withdraw-header">
                <button type="button" className="withdraw-back" aria-label="back" onClick={() => navigate(-1)}>
                    <img src="/icons/chevron-left.svg" alt="" />
                </button>
            </header>

            <section className="withdraw-hero">
                <div className="withdraw-copy">
                    <h1 className="withdraw-title">{t("mypage.WithdrawTitle", { name: displayName})}<br/>{t("mypage.WithdrawTitle2")}</h1>
                    <p className="withdraw-desc">{t("mypage.WithdrawDesc")}<br/>{t("mypage.WithdrawDesc2")}<br/>{t("mypage.WithdrawDesc3")}</p>
                </div>
                <div className="withdraw-image-wrap">
                    <img className="withdraw-image" src="/internie_mascot_crying.png" alt="" /> 
                </div>
            </section>

            <section className="withdraw-card">
                <div className="withdraw-question-row">
                    <div className="withdraw-question-badge">Q</div>
                    <div className="withdraw-question">{t("mypage.WithdrawQuestion", { name: displayName})}</div>
                </div>

                <div ref={selectWrapRef} className="withdraw-select-wrap">
                    <button
                        type="button"
                        className={`withdraw-select ${open ? "is-open" : ""}`}
                        onClick={() => setOpen((prev) => !prev)}
                    >
                        <span className={reason ? "" : "is-placeholder"}>
                            {reason ? t(reason) : t("mypage.WithdrawReasonSelect")}
                        </span>
                        <img src="/icons/chevron-down-ae.svg" alt="" />
                    </button>

                    {open && (
                        <div className="withdraw-option-list">
                            {REASONS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className={`withdraw-option ${reason === item ? "is-selected" : ""}`}
                                    onClick={() => handleSelectReason(item)}
                                >
                                    {t(item)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {isEtcReason && (
                    <textarea
                        className="withdraw-detail"
                        placeholder={t("mypage.WithdrawR.reason.detailPlaceholder", "서비스 탈퇴 사유를 적어주세요")}
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        maxLength={300}
                    />
                )}
            </section>
            <div className="wd-bottom-spacer"></div>
            <button type="button" className="withdraw-submit" disabled={!canSubmit} onClick={handleWithdraw}>
                {submitting ? "처리 중..." : "탈퇴하기"}
            </button>
        </div>
    );
}