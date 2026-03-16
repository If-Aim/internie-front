// src/pages/login/mobile/onBoarding.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getUserMe, verifyJumpUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization } from "../../../api/client";
import { useTranslation } from "react-i18next";
import "./onBoarding.css"

type Step = 1 | 2 | 3 | 4;

type FormState = {
    name: string;
    interestJob: string;
    interestCompany: string;
    selectedTags: string[]; // 지금 UI에 유지할거면 유지
    verifyCode: string;

    jumpOrganizationId: number | null;
    jumpOrganizationName: string; // 드롭다운 표시용
};


export default function OnBoarding(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = React.useState<Step>(1);

    const [form, setForm] = React.useState<FormState>({
        name: "",
        interestJob: "",
        interestCompany: "",
        selectedTags: [],
        verifyCode: "",
        jumpOrganizationId: null,
        jumpOrganizationName: "",
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [codeError, setCodeError] = React.useState<string | null>(null);

    const [isVerified, setIsVerified] = React.useState(false);
    const [instOpen, setInstOpen] = React.useState(false);
    const instWrapRef = React.useRef<HTMLDivElement | null>(null);
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();
                if (!mounted) return;
                setForm((p) => ({ ...p, name: (me.name ?? "").trim() }));
            } catch (e) {
                if (!mounted) return;
                navigate("/login", { replace: true });
            }
        })();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    React.useEffect(() => {
        function onDocDown(e: MouseEvent) {
            if (!instOpen) return;
            const el = instWrapRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setInstOpen(false);
            }
        }
        document.addEventListener("mousedown", onDocDown);
        return () => document.removeEventListener("mousedown", onDocDown);
    }, [instOpen]);

    function next() {
        setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
    }

    // function back() { 
    //     setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    // }  추후 필요 시 사용  ("이전") 버튼용

    function skipGoals() {
        setForm((prev) => ({ ...prev, interestJob: "", interestCompany: "", selectedTags: [] }));
        setStep(3);
    }
    async function skipVerifyAndFinish() {
        setCodeError(null);

        try {
            await submitMyOnboarding({
                name: form.name,
                interestJob: form.interestJob,
                interestCompany: form.interestCompany,
            });
        } catch {

        }

        navigate("/student", { replace: true });
    }
    async function submitAll() {
        const code = form.verifyCode.trim();

        if (!code) {
            try {
                await submitMyOnboarding({
                    name: form.name,
                    interestJob: form.interestJob,
                    interestCompany: form.interestCompany,
                });
            } catch {}
            navigate("/student", { replace: true });
            return;
        }

        setSubmitting(true);
        setCodeError(null);

        try {
            await verifyJumpUser(code);
            setIsVerified(true);

            // 점프기관 목록 조회
            const orgs = await getMyJumpOrganizations();
            setInstitutions(orgs);

            setStep(4);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) setCodeError(t("onboarding.invalidCode"));
                else setCodeError(t("onboarding.verifyFailedRetry"));
            } else {
                setCodeError(t("onboarding.verifyFailed"));
            }
        } finally {
            setSubmitting(false);
        }
    }

    function pickInstitution(org: JumpOrganization) {
        setForm((p) => ({
            ...p,
            jumpOrganizationId: org.id,
            jumpOrganizationName: org.name,
        }));
        setInstOpen(false);
    }

    async function finishInstitution() {
        if (!form.jumpOrganizationId) return;

        try {
            await submitMyOnboarding({
                name: form.name,
                interestJob: form.interestJob,
                interestCompany: form.interestCompany,
                jumpOrganizationId: form.jumpOrganizationId,
            });
        } catch (e) {

        }

        navigate("/student", { replace: true });
    }

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStep2 = form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;
    const canGoStep3 = form.verifyCode.trim().length > 0;

    const canFinishStep4 = isVerified && form.jumpOrganizationId != null;

    return (
        <div className="ob-step">
            <div className="ob-content">
                {step === 1 && (
                    <>
                        <h1 className="ob-title">{t("onboarding.step1Title")}</h1>
                        <div className="ob-field">
                            <input
                            className="ob-input"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder={t("onboarding.namePlaceholder")}
                            autoComplete="name"
                            />
                        </div>
                        <span className="ob-alert">{t("onboarding.nameAlert")}</span>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h1 className="ob-title">{t("onboarding.step2Title")}</h1>

                        <div className="ob-field ob-field--icon">
                            <input
                                className="ob-input"
                                value={form.interestJob}
                                onChange={(e) => setForm((p) => ({ ...p, interestJob: e.target.value }))}
                                placeholder={t("onboarding.interestJobPlaceholder")}
                            />
                        </div>

                        <div className="ob-field ob-field--icon">
                            <input
                                className="ob-input"
                                value={form.interestCompany}
                                onChange={(e) => setForm((p) => ({ ...p, interestCompany: e.target.value }))}
                                placeholder={t("onboarding.interestCompanyPlaceholder")}
                            />
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h1 className="ob-title">{t("onboarding.step3Title")}</h1>
                        <div className="ob-field">
                            <input
                                className="ob-input"
                                value={form.verifyCode}
                                onChange={(e) => setForm((p) => ({ ...p, verifyCode: e.target.value }))}
                                placeholder={t("onboarding.verifyCodePlaceholder")}
                            />
                        </div>

                        {codeError && <div className="ob-error">{codeError}</div>}
                    </>
                )}

                {step === 4 && isVerified && (
                    <>
                        <div className="ob-jump-logo">
                            <img src="/logos/jump-logo.png" alt="JUMP" />
                        </div>

                        <h1 className="ob-title">{t("onboarding.step4Title")}</h1>

                        <div className="ob-field">
                            <div className={"ob-dd" + (instOpen ? " ob-dd--open" : "")} ref={instWrapRef}>
                                <button type="button" className="ob-dd-trigger" onClick={() => setInstOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={instOpen} >
                                    <span className={"ob-dd-value" + (form.jumpOrganizationName ? "" : " ob-dd-value--placeholder")}>
                                        {form.jumpOrganizationName || t("onboarding.institutionPlaceholder")}
                                    </span>
                                    <span className="ob-dd-caret" aria-hidden="true">
                                        <img src="/icons/chevron-left.svg" alt="" />
                                    </span>
                                </button>

                                {instOpen && (
                                    <div className="ob-dd-menu" role="listbox" aria-label="센터 목록">
                                        {institutions.map((org) => (
                                            <button
                                                key={org.id}
                                                type="button"
                                                className={"ob-dd-item" + (form.jumpOrganizationId === org.id ? " ob-dd-item--active" : "")}
                                                onClick={() => pickInstitution(org)}
                                                role="option"
                                                aria-selected={form.jumpOrganizationId === org.id}
                                            >
                                                {org.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="ob-footer">
                {step === 1 && (
                    <button className="ob-btn ob-btn--primary" onClick={next} disabled={!canGoStep1}>
                        {t("onboarding.next")}
                    </button>
                )}

                {step === 2 && (
                    <>  
                        <button className="ob-btn ob-btn--ghost" onClick={skipGoals} type="button">
                            {t("onboarding.skip")}
                        </button>
                        <button className="ob-btn ob-btn--primary" onClick={next} type="button" disabled={!canGoStep2} >
                            {t("onboarding.next")}
                        </button>
                    </>
                )}

                {step === 3 && (
                    <>
                        <button className="ob-btn ob-btn--ghost" onClick={skipVerifyAndFinish} type="button">
                            {t("onboarding.skip")}
                        </button>
                        <button className="ob-btn ob-btn--primary" onClick={submitAll} disabled={submitting || !canGoStep3} type="button" >
                            {t("onboarding.next")}
                        </button>
                    </>
                )}
                {step === 4 && isVerified && (
                    <button className="ob-btn ob-btn--primary" onClick={finishInstitution} disabled={!canFinishStep4} type="button" >
                        {t("common.done")}
                    </button>
                )}
            </div>
        </div>
    );
}