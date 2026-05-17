import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getUserMe, verifyClientUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization, } from "../../../api/client";
import { useTranslation } from "react-i18next";
import "./onboarding.css"

type Step = 1 | 2 | 3 | 4 ;
type MemberType = "STUDENT" | "COMPANY";

type FormState = {
    name: string;
    memberType: MemberType;
    studentNumber: string;
    interestJob: string;
    interestCompany: string;
    selectedTags: string[]; // 지금 UI에 유지할거면 유지
    verifyCode: string;

    jumpOrganizationId: number | null;
    jumpOrganizationName: string; // 드롭다운 표시용
};


export default function MobileOnboarding(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = React.useState<Step>(1);

    const [form, setForm] = React.useState<FormState>({
        name: "",
        memberType: "STUDENT",
        studentNumber: "",
        interestJob: "",
        interestCompany: "",
        selectedTags: [],
        verifyCode: "",
        jumpOrganizationId: null,
        jumpOrganizationName: "",
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [codeError, setCodeError] = React.useState<string | null>(null);

    // ROLE 검증
    const [verifiedRoleSet, setVerifiedRoleSet] = React.useState<string[] | null>(null);
    const [hasTriedVerify, setHasTriedVerify] = React.useState(false);

    const roleSet = verifiedRoleSet ?? [];
    const isJumpVerified = roleSet.includes("ROLE_JUMP_STUDENT");
    const isKakaoVerified = roleSet.includes("ROLE_KAKAO_STUDENT");

    const verifiedMessages = roleSet // 각 역할별 메시지 생성 로직
        .map((role) => {
            if (role === "ROLE_JUMP_STUDENT") return "JUMP 인증되었습니다.";
            if (role === "ROLE_KAKAO_STUDENT") return "KAKAO 인증되었습니다.";
            return null;
        })
        .filter(Boolean) as string[];

    const hasJumpOrganization = form.jumpOrganizationId != null;
    const hasStudentNumber = form.studentNumber.trim().length > 0;

    const shouldShowJumpOrganization = isJumpVerified;
    const shouldShowStudentNumber = isKakaoVerified;

    const needsJumpOrganization = isJumpVerified && !hasJumpOrganization;
    const needsStudentNumber = isKakaoVerified && !hasStudentNumber;

    const [instOpen, setInstOpen] = React.useState(false);
    const instWrapRef = React.useRef<HTMLDivElement | null>(null);
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();
                if (!mounted) return;

                setForm((p) => ({
                    ...p,
                    name: (me.name ?? "").trim(),
                    memberType: Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_COMPANY") ? "COMPANY" : "STUDENT",
                    studentNumber: (me.studentNumber ?? "").trim(),
                    jumpOrganizationId: me.jumpOrganization?.id ?? null,
                    jumpOrganizationName: me.jumpOrganization?.name ?? "",
                }));

                setVerifiedRoleSet(me.roleSet ?? null);

                if (Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_JUMP_STUDENT")) {
                    const orgs = await getMyJumpOrganizations();
                    if (!mounted) return;
                    setInstitutions(orgs);
                }
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

    function finishNameStep(): void {
        if (!form.name.trim()) {
            return;
        }

        setStep(2);
    }

    function finishInterestStep(): void {
        setStep(3);
    }

    // function back() { 
    //     setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    // }  추후 필요 시 사용  ("이전") 버튼용

    async function skipVerify(): Promise<void> {
        setCodeError(null);
        setVerifiedRoleSet(null);
        setInstitutions([]);
        setForm((prev) => ({
            ...prev,
            verifyCode: "",
            studentNumber: "",
            jumpOrganizationId: null,
            jumpOrganizationName: "",
        }));

        await finishOnboarding();
    }

    async function submitVerifyCode(): Promise<void> {
        if (form.memberType === "COMPANY") {
            return;
        }

        const code = form.verifyCode.trim();

        if (!code) {
            setCodeError(t("onboarding.invalidCode"));
            return;
        }

        setSubmitting(true);
        setCodeError(null);

        try {
            const refreshed = await verifyClientUser(code);
            const roleSet = refreshed.roleSet ?? [];

            setVerifiedRoleSet(roleSet);
            setHasTriedVerify(true);

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
                setStep(4);
                return;
            }

            await finishOnboarding();
        } catch (e) {
            if (e instanceof ApiError) {
                setCodeError("인증 코드가 올바르지 않습니다.");
                return;
            }

            setCodeError("인증 중 오류가 발생했습니다.");
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

    async function finishFollowupStep(): Promise<void> {
        if (needsJumpOrganization && !form.jumpOrganizationId) {
            return;
        }

        if (needsStudentNumber && !form.studentNumber.trim()) {
            return;
        }

        await finishOnboarding();
    }

    async function finishOnboarding(): Promise<void> {
        try {
            await submitMyOnboarding({
                name: form.name.trim(),
                userType: form.memberType,

                ...(form.memberType === "STUDENT" && isKakaoVerified
                    ? { studentNumber: form.studentNumber.trim() }
                    : {}),
                ...(form.memberType === "STUDENT" && isJumpVerified
                    ? { jumpOrganizationId: form.jumpOrganizationId }
                    : {}),
                ...(form.memberType === "STUDENT" && form.interestJob.trim()
                    ? { interestJob: form.interestJob.trim() }
                    : {}),
                ...(form.memberType === "STUDENT" && form.interestCompany.trim()
                    ? { interestCompany: form.interestCompany.trim() }
                    : {}),
            });

            navigate("/student", { replace: true });
        } catch {
            alert("온보딩 저장에 실패했습니다.");
        }
    }

    const canGoStep1 = form.name.trim().length > 0;
    const canGoStep2 = form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;
    const canGoStep3 = form.verifyCode.trim().length > 0;
    const canGoStep4 =
        (!needsJumpOrganization || form.jumpOrganizationId != null) &&
        (!needsStudentNumber || form.studentNumber.trim().length > 0);

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

                        <div className="ob-member-type">
                            <span className="ob-member-type-title">회원 유형</span>

                            <div className="ob-member-type-grid">
                                <button
                                    type="button"
                                    className={`ob-member-type-btn ${form.memberType === "STUDENT" ? "is-active" : ""}`}
                                    onClick={() => setForm((p) => ({ ...p, memberType: "STUDENT" }))}
                                >
                                    학생
                                </button>

                                <button
                                    type="button"
                                    className={`ob-member-type-btn ${form.memberType === "COMPANY" ? "is-active" : ""}`}
                                    onClick={() => setForm((p) => ({ ...p, memberType: "COMPANY" }))}
                                >
                                    기업
                                </button>
                            </div>
                        </div>
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
                                disabled={form.memberType === "COMPANY"}
                            />
                        </div>

                        {form.memberType === "COMPANY" && (
                            <div className="ob-info">
                                기업 회원 인증코드는 아직 적용되지 않았습니다. 건너뛰기를 선택해주세요.
                            </div>
                        )}

                        {hasTriedVerify && verifiedMessages.length > 0 && (
                            <div className="ob-info">
                                {verifiedMessages.map((msg, idx) => (
                                    <div key={idx}>{msg}</div>
                                ))}
                            </div>
                        )}

                        {codeError && <div className="ob-error">{codeError}</div>}
                    </>
                )}

                {step === 4 && (
                    <>
                        {shouldShowJumpOrganization && (
                            <>
                                <div className="ob-jump-logo">
                                    <img src="/logos/jump-logo.png" alt="JUMP" />
                                </div>

                                <h1 className="ob-title">{t("onboarding.step4Title")}</h1>

                                <div className="ob-field">
                                    <div className={"ob-dd" + (instOpen ? " ob-dd--open" : "")} ref={instWrapRef}>
                                        <button
                                            type="button"
                                            className="ob-dd-trigger"
                                            onClick={() => setInstOpen((v) => !v)}
                                            aria-haspopup="listbox"
                                            aria-expanded={instOpen}
                                        >
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

                        {shouldShowStudentNumber && (
                            <>
                                <h1 className="ob-title">학번을 입력해주세요</h1>
                                <div className="ob-field">
                                    <input
                                        className="ob-input"
                                        value={form.studentNumber}
                                        onChange={(e) => setForm((p) => ({ ...p, studentNumber: e.target.value }))}
                                        placeholder="학번"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>

            <div className="ob-footer"> {/* 각 step별 하단 버튼 */}
                {step === 1 && (
                    <button className="ob-btn ob-btn--primary" onClick={finishNameStep} disabled={!canGoStep1} type="button">
                        {t("onboarding.next")}
                    </button>
                )}

                {step === 2 && (
                    <>
                        {!canGoStep2 ? (
                            <button className="ob-btn ob-btn--ghost" onClick={finishInterestStep} type="button">
                                {t("onboarding.skip")}
                            </button>
                        ) : (
                            <button className="ob-btn ob-btn--primary" onClick={finishInterestStep} type="button">
                                {t("onboarding.next")}
                            </button>
                        )}
                    </>
                )}

                {step === 3 && (
                    <>
                        <button className="ob-btn ob-btn--ghost" onClick={skipVerify} type="button">
                            {t("onboarding.skip")}
                        </button>

                        <button
                            className="ob-btn ob-btn--primary"
                            onClick={submitVerifyCode}
                            disabled={form.memberType === "COMPANY" || submitting || !canGoStep3}
                            type="button"
                        >
                            {t("onboarding.next")}
                        </button>
                    </>
                )}

                {step === 4 && (
                    <button className="ob-btn ob-btn--primary" onClick={finishFollowupStep} disabled={!canGoStep4} type="button">
                        {t("common.done")}
                    </button>
                )}
            </div>
        </div>
    );
}
