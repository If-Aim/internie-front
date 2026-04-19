import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getUserMe, submitMyOnboarding, type UserMe } from "../../../../api/client";
import "./targetCom.css";

type FormState = {
    interestJob: string;
    interestCompany: string;
};

function normalize(v: unknown): string {
    return String(v ?? "").trim();
}

export default function TargetCompanyPage(): React.ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string>("");

    const [form, setForm] = React.useState<FormState>({
        interestJob: "",
        interestCompany: "",
    });
    const [initial, setInitial] = React.useState<FormState | null>(null);

    const jobRef = React.useRef<HTMLInputElement | null>(null);
    const companyRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const data = await getUserMe();
                if (!mounted) return;

                setMe(data);

                const next: FormState = {
                    interestJob: normalize(data.interestJob),
                    interestCompany: normalize(data.interestCompany),
                };

                setForm(next);
                setInitial(next);
                setError("");
            } catch (e) {
                if (!mounted) return;
                setError(t("error.failGetUserMe"));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const dirty = React.useMemo(() => {
        if (!initial) return false;
        return (
            normalize(form.interestJob) !== normalize(initial.interestJob) ||
            normalize(form.interestCompany) !== normalize(initial.interestCompany)
        );
    }, [form, initial]);

    const canSave = !loading && !saving && dirty;

    const onClose = () => {
        navigate(-1);
    };

    const onSave = async () => {
        if (!me) return;
        if (!canSave) return;

        try {
            setSaving(true);
            setError("");

            await submitMyOnboarding({
                interestJob: normalize(form.interestJob),
                interestCompany: normalize(form.interestCompany),
            });

            const refreshed = await getUserMe();

            setMe(refreshed);

            const next: FormState = {
                interestJob: normalize(refreshed.interestJob),
                interestCompany: normalize(refreshed.interestCompany),
            };

            setForm(next);
            setInitial(next);

            navigate(-1);
        } catch (e) {
            setError(t("error.failSetCareerGoal"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="tc-page">
            <header className="tc-header">
                <div className="tc-header__spacer" />
                <h1 className="tc-header__title">{t("mypage.targetCompany")}</h1>
                <button type="button" className="tc-header__close" onClick={onClose} aria-label="close" >
                    <img src="/icons/x-01.svg" alt="" />
                </button>
            </header>

            <main className="tc-content">
                {error ? <div className="tc-error">{error}</div> : null}

                <section className="tc-section">
                    <div className="tc-label">{t("mypage.desiredJob")}</div>
                    <div className="tc-inputRow">
                        <input
                            ref={jobRef}
                            className="tc-input"
                            value={form.interestJob}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, interestJob: e.target.value }))
                            }
                            placeholder={t("mypage.desiredJobEx")}
                            disabled={loading || saving}
                        />
                        <img className="tc-pencil" src="/icons/ph_pencil-simple-thin.svg" alt="" aria-hidden="true" />
                    </div>
                </section>

                <section className="tc-section">
                    <div className="tc-label">{t("mypage.targetComLabel")}</div>
                    <div className="tc-inputRow">
                        <input
                            ref={companyRef}
                            className="tc-input"
                            value={form.interestCompany}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, interestCompany: e.target.value }))
                            }
                            placeholder={t("mypage.targetComLabelEx")}
                            disabled={loading || saving}
                        />
                        <img className="tc-pencil" src="/icons/ph_pencil-simple-thin.svg" alt="" aria-hidden="true" />
                    </div>
                </section>
            </main>

            <div className="tc-footer">
                <button type="button" className="tc-saveBtn" onClick={onSave} disabled={!canSave} >
                    {saving ? t("schedule_edit.saving") : t("schedule_edit.save")}
                </button>
            </div>
        </div>
    );
}