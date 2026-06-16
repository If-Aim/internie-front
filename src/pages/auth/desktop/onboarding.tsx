import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getMyJumpOrganizations, getUserMe, submitMyOnboarding, verifyClientUser, type JumpOrganization, } from "../../../api/client";
import "./onboarding.css";

type MemberType = "STUDENT" | "COMPANY";
type Step = 1 | 2 | 3;

type FormState = {
    name: string;
    memberType: MemberType;
    interestCompany: string;
    interestJob: string;
    companyName: string;
    departmentName: string;
    verifyCode: string;
    studentNumber: string;
    jumpOrganizationId: number | null;
    jumpOrganizationName: string;
};

export default function DesktopOnboarding(): React.ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [step, setStep] = React.useState<Step>(1);
    const [form, setForm] = React.useState<FormState>({
        name: "",
        memberType: "STUDENT",
        interestCompany: "",
        interestJob: "",
        companyName: "",
        departmentName: "",
        verifyCode: "",
        studentNumber: "",
        jumpOrganizationId: null,
        jumpOrganizationName: "",
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [codeError, setCodeError] = React.useState<string | null>(null);
    const [verifiedRoleSet, setVerifiedRoleSet] = React.useState<string[]>([]);
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);
    const [institutionOpen, setInstitutionOpen] = React.useState(false);

    const institutionWrapRef = React.useRef<HTMLDivElement | null>(null);

    const isJumpVerified = verifiedRoleSet.includes("ROLE_JUMP_STUDENT");
    const isKakaoVerified = verifiedRoleSet.includes("ROLE_KAKAO_STUDENT");

    const hasJumpOrganization = form.jumpOrganizationId != null;
    const hasStudentNumber = form.studentNumber.trim().length > 0;

    const shouldShowJumpOrganization = isJumpVerified;
    const shouldShowStudentNumber = isKakaoVerified;

    const needsJumpOrganization = isJumpVerified && !hasJumpOrganization;
    const needsStudentNumber = isKakaoVerified && !hasStudentNumber;

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStudentStep2 = form.interestCompany.trim().length > 0 || form.interestJob.trim().length > 0;
    const canGoCompanyStep2 = form.companyName.trim().length > 0 || form.departmentName.trim().length > 0;
    const canSubmitVerifyCode = form.verifyCode.trim().length > 0;
    const canFinishVerifiedStep =
        (!needsJumpOrganization || form.jumpOrganizationId != null) &&
        (!needsStudentNumber || form.studentNumber.trim().length > 0);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();
                if (!mounted) return;

                setForm((prev) => ({
                    ...prev,
                    name: (me.name ?? "").trim(),
                    studentNumber: (me.studentNumber ?? "").trim(),
                    jumpOrganizationId: me.jumpOrganization?.id ?? null,
                    jumpOrganizationName: me.jumpOrganization?.name ?? "",
                }));

                setVerifiedRoleSet(me.roleSet ?? []);

                if (Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_JUMP_STUDENT")) {
                    const orgs = await getMyJumpOrganizations();
                    if (!mounted) return;
                    setInstitutions(orgs);
                }
            } catch {
                if (!mounted) return;
                navigate("/login", { replace: true });
            }
        })();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    React.useEffect(() => {
        function handleDocumentMouseDown(e: MouseEvent): void {
            if (!institutionOpen) return;
            const wrap = institutionWrapRef.current;
            if (!wrap) return;
            if (e.target instanceof Node && !wrap.contains(e.target)) {
                setInstitutionOpen(false);
            }
        }

        document.addEventListener("mousedown", handleDocumentMouseDown);
        return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
    }, [institutionOpen]);

    function goToStep2(): void {
        if (!canGoStep1) return;
        setStep(2);
    }

    function goToStep3(): void {
        setStep(3);
    }

    function pickMemberType(memberType: MemberType): void {
        setForm((prev) => ({
            ...prev,
            memberType,
        }));
    }

    function pickInstitution(org: JumpOrganization): void {
        setForm((prev) => ({
            ...prev,
            jumpOrganizationId: org.id,
            jumpOrganizationName: org.name,
        }));
        setInstitutionOpen(false);
    }

    async function submitVerifyCode(): Promise<void> {
        const code = form.verifyCode.trim();

        if (!code) {
            setCodeError(t("onboarding.verifyCodeRequired"));
            return;
        }

        try {
            setSubmitting(true);
            setCodeError(null);

            const refreshed = await verifyClientUser(code);
            const roleSet = refreshed.roleSet ?? [];

            setVerifiedRoleSet(roleSet);
            setForm((prev) => ({
                ...prev,
                studentNumber: (refreshed.studentNumber ?? "").trim(),
                jumpOrganizationId: refreshed.jumpOrganization?.id ?? null,
                jumpOrganizationName: refreshed.jumpOrganization?.name ?? "",
            }));

            const hasJumpRole = roleSet.includes("ROLE_JUMP_STUDENT");
            const hasKakaoRole = roleSet.includes("ROLE_KAKAO_STUDENT");
            const hasJumpOrganization = refreshed.jumpOrganization?.id != null;
            const hasStudentNumber = (refreshed.studentNumber ?? "").trim().length > 0;

            if (hasJumpRole) {
                const orgs = await getMyJumpOrganizations();
                setInstitutions(orgs);
            }

            if ((hasJumpRole && !hasJumpOrganization) || (hasKakaoRole && !hasStudentNumber)) {
                return;
            }

            await finishOnboarding();
        } catch (e) {
            if (e instanceof ApiError) {
                setCodeError(t("onboarding.invalidCode"));
                return;
            }

            setCodeError(t("onboarding.verifyFailedRetry"));
        } finally {
            setSubmitting(false);
        }
    }

    async function finishOnboarding(): Promise<void> {
        try {
            setSubmitting(true);

            await submitMyOnboarding({
                name: form.name.trim(),
                userType: form.memberType,

                ...(form.memberType === "STUDENT" && form.interestCompany.trim()
                    ? { interestCompany: form.interestCompany.trim() }
                    : {}),
                ...(form.memberType === "STUDENT" && form.interestJob.trim()
                    ? { interestJob: form.interestJob.trim() }
                    : {}),

                ...(form.memberType === "COMPANY" && form.companyName.trim()
                    ? { companyName: form.companyName.trim() }
                    : {}),
                ...(form.memberType === "COMPANY" && form.departmentName.trim()
                    ? { departmentName: form.departmentName.trim() }
                    : {}),

                ...(form.memberType === "STUDENT" && isKakaoVerified
                    ? { studentNumber: form.studentNumber.trim() }
                    : {}),
                ...(form.memberType === "STUDENT" && isJumpVerified
                    ? { jumpOrganizationId: form.jumpOrganizationId }
                    : {}),
            });

            navigate("/student", { replace: true });
        } catch {
            alert(t("onboarding.saveFailed"));
        } finally {
            setSubmitting(false);
        }
    }

    async function skipStep2(): Promise<void> {
        setStep(3);
    }

    async function skipVerify(): Promise<void> {
        await finishOnboarding();
    }

    async function finishVerifiedOnboarding(): Promise<void> {
        if (!canFinishVerifiedStep) return;
        await finishOnboarding();
    }

    return (
        <div className="onboarding-desktop-page">
            <header className="onboarding-desktop-header">
                <div className="onboarding-desktop-header-inner">
                    <span className="onboarding-desktop-header-logo">internie</span>
                </div>
            </header>

            <main className="onboarding-desktop-main">
                <section className="onboarding-desktop-container">
                    <h1 className="onboarding-desktop-title">{t("onboarding.desktopTitle")}</h1>

                    {step === 1 && (
                        <>
                            <div className="onboarding-desktop-form">
                                <div className="onboarding-desktop-field">
                                    <label className="onboarding-desktop-label" htmlFor="desktop-onboarding-name">
                                        {t("onboarding.nameLabel")}
                                    </label>
                                    <input
                                        id="desktop-onboarding-name"
                                        className="onboarding-desktop-input"
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder={t("onboarding.realNamePlaceholder")}
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="onboarding-desktop-field">
                                    <span className="onboarding-desktop-label">{t("onboarding.memberTypeLabel")}</span>
                                    <div className="onboarding-desktop-type-grid">
                                        <button type="button" className={`onboarding-desktop-type-button ${form.memberType === "STUDENT" ? "is-active" : ""}`} onClick={() => pickMemberType("STUDENT")} >
                                            {t("onboarding.student")}
                                        </button>
                                        <button type="button" className={`onboarding-desktop-type-button ${form.memberType === "COMPANY" ? "is-active" : ""}`} onClick={() => pickMemberType("COMPANY")} >
                                            {t("onboarding.company")}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button type="button" className={`onboarding-desktop-main-button ${canGoStep1 ? "is-active" : ""}`} onClick={goToStep2} disabled={!canGoStep1} >
                                {t("onboarding.next")}
                            </button>
                        </>
                    )}

                    {step === 2 && form.memberType === "STUDENT" && (
                        <>
                            <div className="onboarding-desktop-form">
                                <div className="onboarding-desktop-field">
                                    <span className="onboarding-desktop-label">{t("onboarding.goalLabel")}</span>
                                    <div className="onboarding-desktop-double-inputs">
                                        <input
                                            className="onboarding-desktop-input"
                                            value={form.interestCompany}
                                            onChange={(e) => setForm((prev) => ({ ...prev, interestCompany: e.target.value }))}
                                            placeholder={t("onboarding.interestCompanyPlaceholder")}
                                        />
                                        <input
                                            className="onboarding-desktop-input"
                                            value={form.interestJob}
                                            onChange={(e) => setForm((prev) => ({ ...prev, interestJob: e.target.value }))}
                                            placeholder={t("onboarding.interestJobPlaceholder")}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="onboarding-desktop-footer-actions">
                                <button type="button" className={`onboarding-desktop-main-button ${canGoStudentStep2 ? "is-active" : ""}`} onClick={goToStep3} disabled={!canGoStudentStep2} >
                                    {t("onboarding.next")}
                                </button>
                                <button type="button" className="onboarding-desktop-skip-button" onClick={skipStep2}>
                                    {t("onboarding.skip")}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 2 && form.memberType === "COMPANY" && (
                        <>
                            <div className="onboarding-desktop-form">
                                <div className="onboarding-desktop-field">
                                    <span className="onboarding-desktop-label">{t("onboarding.companyInfoLabel")}</span>
                                    <div className="onboarding-desktop-double-inputs">
                                        <input
                                            className="onboarding-desktop-input"
                                            value={form.companyName}
                                            onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                                            placeholder={t("onboarding.companyNamePlaceholder")}
                                        />
                                        <input
                                            className="onboarding-desktop-input"
                                            value={form.departmentName}
                                            onChange={(e) => setForm((prev) => ({ ...prev, departmentName: e.target.value }))}
                                            placeholder={t("onboarding.departmentNamePlaceholder")}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="onboarding-desktop-footer-actions">
                                <button type="button" className={`onboarding-desktop-main-button ${canGoCompanyStep2 ? "is-active" : ""}`} onClick={goToStep3} disabled={!canGoCompanyStep2} >
                                    {t("onboarding.next")}
                                </button>
                                <button type="button" className="onboarding-desktop-skip-button" onClick={skipStep2}>
                                    {t("onboarding.skip")}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="onboarding-desktop-form onboarding-desktop-form--verify">
                                <div className="onboarding-desktop-field">
                                    <span className="onboarding-desktop-label">{t("onboarding.verifyCodeLabel")}</span>
                                    <input
                                        className="onboarding-desktop-input"
                                        value={form.verifyCode}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, verifyCode: e.target.value }));
                                            setCodeError(null);
                                        }}
                                        placeholder={t("onboarding.verifyCodePlaceholder")}
                                    />
                                </div>

                                {codeError && <div className="onboarding-desktop-error">{codeError}</div>}

                                {shouldShowJumpOrganization && (
                                    <div className="onboarding-desktop-field">
                                        <span className="onboarding-desktop-label">{t("onboarding.institutionLabel")}</span>
                                        <div className={`onboarding-desktop-dropdown ${institutionOpen ? "is-open" : ""}`} ref={institutionWrapRef} >
                                            <button type="button" className="onboarding-desktop-dropdown-trigger" onClick={() => setInstitutionOpen((prev) => !prev)} >
                                                <span className={form.jumpOrganizationName ? "" : "is-placeholder"}>
                                                    {form.jumpOrganizationName || t("onboarding.institutionSelectPlaceholder")}
                                                </span>
                                                <img src="/icons/chevron-left.svg" alt="" />
                                            </button>

                                            {institutionOpen && (
                                                <div className="onboarding-desktop-dropdown-menu">
                                                    {institutions.map((org) => (
                                                        <button key={org.id} type="button" className={`onboarding-desktop-dropdown-item ${form.jumpOrganizationId === org.id ? "is-active" : ""}`} onClick={() => pickInstitution(org)} >
                                                            {org.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {shouldShowStudentNumber && (
                                    <div className="onboarding-desktop-field">
                                        <span className="onboarding-desktop-label">{t("onboarding.studentNumberLabel")}</span>
                                        <input
                                            className="onboarding-desktop-input"
                                            value={form.studentNumber}
                                            onChange={(e) => setForm((prev) => ({ ...prev, studentNumber: e.target.value }))}
                                            placeholder={t("onboarding.studentNumberPlaceholder")}
                                        />
                                    </div>
                                )}
                            </div>

                            {!shouldShowJumpOrganization && !shouldShowStudentNumber ? (
                                <div className="onboarding-desktop-footer-actions">
                                    <button type="button" className={`onboarding-desktop-main-button ${canSubmitVerifyCode ? "is-active" : ""}`} onClick={submitVerifyCode} disabled={!canSubmitVerifyCode || submitting} >
                                        {t("onboarding.next")}
                                    </button>
                                    <button type="button" className="onboarding-desktop-skip-button" onClick={skipVerify}>
                                        {t("onboarding.skip")}
                                    </button>
                                </div>
                            ) : (
                                <div className="onboarding-desktop-footer-actions">
                                    <button type="button" className={`onboarding-desktop-main-button ${canFinishVerifiedStep ? "is-active" : ""}`} onClick={finishVerifiedOnboarding} disabled={!canFinishVerifiedStep || submitting} >
                                        {t("onboarding.finish")}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}