/* src/pages/student/mobile/mypage/targetCom.tsx */
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

function safeName(me: UserMe | null): string {
    if (!me) return "";
    const name = normalize(me.name);
    if (name) return name;
    const kakaoName = normalize(me.kakaoName);
    if (kakaoName) return kakaoName;
    return "";
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
                setError("내 정보 조회에 실패했습니다.");
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

        const name = safeName(me);
        if (!name) {
            setError(t("error.failSetCareerGoalMissName"));
            return;
        }

        try {
            setSaving(true);
            setError("");

            const updated = await submitMyOnboarding({
                name,
                interestJob: normalize(form.interestJob) || null,
                interestCompany: normalize(form.interestCompany) || null,
                jumpOrganizationId: me.jumpOrganization?.id ?? null,
            });

            setMe(updated);

            const next: FormState = {
                interestJob: normalize(updated.interestJob),
                interestCompany: normalize(updated.interestCompany),
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
                <button type="button" className="tc-header__close" onClick={onClose} aria-label="닫기">
                    <img src="/x-01.svg"/>
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
                            onChange={(e) => setForm((p) => ({ ...p, interestJob: e.target.value }))}
                            placeholder={t("mypage.desiredJobEx")}
                            disabled={loading || saving}
                        />
                        <img className="tc-pencil" src="/ph_pencil-simple-thin.svg"/>
                    </div>
                </section>

                <section className="tc-section">
                    <div className="tc-label">{t("mypage.targetComLabel")}</div>
                    <div className="tc-inputRow">
                        <input
                            ref={companyRef}
                            className="tc-input"
                            value={form.interestCompany}
                            onChange={(e) => setForm((p) => ({ ...p, interestCompany: e.target.value }))}
                            placeholder={t("mypage.targetComLabelEx")}
                            disabled={loading || saving}
                        />
                        <img className="tc-pencil" src="/ph_pencil-simple-thin.svg"/>
                    </div>
                </section>
            </main>

            <footer className="tc-footer">
                <button type="button" className="tc-saveBtn" onClick={onSave} disabled={!canSave} >
                    {saving ? t("schedule_edit.saving") : t("schedule_edit.save")}
                </button>
            </footer>
        </div>
    );
}