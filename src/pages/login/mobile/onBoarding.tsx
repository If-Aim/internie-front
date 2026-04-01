// src/pages/login/mobile/onBoarding.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getUserMe, verifyClientUser, getMyJumpOrganizations, submitMyOnboarding, type JumpOrganization, sendEmailCode, verifyEmailCode } from "../../../api/client";
import { useTranslation } from "react-i18next";
import "./onBoarding.css"

type Step = 1 | 2 | 3 | 4 | 5;

type FormState = {
    email: string;
    emailCode: string;
    name: string;
    studentNumber: string;
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
    const ENABLE_EMAIL_VERIFICATION = false; // 이메일인증은 아직 숨김

    const [form, setForm] = React.useState<FormState>({
        email:"",
        emailCode:"",
        name: "",
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
    function getVerifiedFlow(roleSet: string[] | null | undefined) {
        if (!roleSet || roleSet.length === 0) return null;
        if (roleSet.includes("ROLE_JUMP_STUDENT")) return "JUMP";
        if (roleSet.includes("ROLE_ESG_STUDENT")) return "ESG";
        if (roleSet.includes("ROLE_KAKAO_STUDENT")) return "KAKAO";
        return null;
    }

    // 이메일 인증
    const [emailSending, setEmailSending] = React.useState(false);
    const [emailVerifying, setEmailVerifying] = React.useState(false);
    const [emailSentMessage, setEmailSentMessage] = React.useState<string | null>(null);
    const [emailError, setEmailError] = React.useState<string | null>(null);

    const [verifiedRoleSet, setVerifiedRoleSet] = React.useState<string[] | null>(null);
    const verifiedFlow = getVerifiedFlow(verifiedRoleSet);
    const isJumpVerified = verifiedFlow === "JUMP";
    // const isEsgVerified = verifiedFlow === "ESG";
    const isKakaoVerified = verifiedFlow === "KAKAO";
    const isPartnerVerified = verifiedFlow !== null;

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
                    email: (me.email ?? "").trim(),
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

    function next() {
        setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
    }

    function goToNameStep() { // 이메일 인증 숨김용
        setStep(ENABLE_EMAIL_VERIFICATION ? 3 : 4);
    }

    // function back() { 
    //     setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    // }  추후 필요 시 사용  ("이전") 버튼용

    async function submitSendEmailCode() {
        const email = form.email.trim();
        if (!email) {
            setEmailError("이메일을 입력해주세요.");
            return;
        }
        setEmailSending(true);
        setEmailError(null);
        setEmailSentMessage(null);
        try {
            const res = await sendEmailCode(email);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            setEmailSentMessage(`${res.maskedEmail}로 인증코드를 발송했습니다.`);
        } catch (e) {
            if (e instanceof ApiError) {
                setEmailError("인증코드 발송에 실패했습니다.");
                return;
            }
            setEmailError("이메일 전송 중 오류가 발생했습니다.");
        } finally {
            setEmailSending(false);
        }
    }

    async function submitVerifyEmailCode() {
        const email = form.email.trim();
        const code = form.emailCode.trim();
        if (!email) {
            setEmailError("이메일을 입력해주세요."); // TODO: 이메일 인증 번호 전송 시 남은시간과 함께 로딩하는듯한 버튼 애니메이션 추가
            return;
        }
        if (!code) {
            setEmailError("인증코드를 입력해주세요.");
            return;
        }
        setEmailVerifying(true);
        setEmailError(null);
        try {
            const res = await verifyEmailCode(email, code);

            if (res.existingAccountFound) {
                alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            if (!res.verified) {
                setEmailError("이메일 인증에 실패했습니다.");
                return;
            }

            setStep(4);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "AUTH_EXISTING_ACCOUNT") {
                    alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
                    localStorage.removeItem("accessToken");
                    navigate("/login", { replace: true });
                    return;
                }

                setEmailError("인증코드가 올바르지 않거나 만료되었습니다.");
                return;
            }
            setEmailError("이메일 인증 중 오류가 발생했습니다.");
        } finally {
            setEmailVerifying(false);
        }
    }


    function skipVerify() {
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
        goToNameStep(); // setStep(3); 이메일 인증X
    }

    async function submitVerifyCode() {
        const code = form.verifyCode.trim();

        if (!code) {
            setCodeError(t("onboarding.invalidCode"));
            return;
        }

        setSubmitting(true);
        setCodeError(null);

        try {
            const refreshed = await verifyClientUser(code);
            const roleSet = refreshed.roleSet ?? null;
            const flow = getVerifiedFlow(roleSet);

            setVerifiedRoleSet(roleSet);

            if (flow === "JUMP") {
                const orgs = await getMyJumpOrganizations();
                setInstitutions(orgs);
                setStep(2);
                return;
            }

            if (flow === "KAKAO") {
                setStep(2);
                return;
            }

            if (flow !== null) {
                goToNameStep(); //setStep(3); 이메일 인증 숨김
                return;
            }

            setCodeError(t("onboarding.verifyFailed"));
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

    function finishInstitution() {
        if (!form.jumpOrganizationId) return;
        goToNameStep(); // setStep(3);
    }

    async function finishOnboarding() {
        try {
            await submitMyOnboarding({
                name: form.name.trim(),
                studentNumber: isKakaoVerified ? form.studentNumber.trim() : undefined,
                interestJob: form.interestJob.trim() || undefined,
                interestCompany: form.interestCompany.trim() || undefined,
                jumpOrganizationId: isJumpVerified ? (form.jumpOrganizationId ?? undefined) : undefined,
            });
            navigate("/student", { replace: true });
        } catch {
            alert("온보딩 저장에 실패했습니다.");
        }
    }

    const canGoStep1 = form.verifyCode.trim().length > 0;
    const canGoStep2Jump = isJumpVerified && form.jumpOrganizationId != null;
    const canGoStep2Kakao = isKakaoVerified && form.studentNumber.trim().length > 0;
    const canGoStep3 = form.email.trim().length > 0 && form.emailCode.trim().length > 0;
    const canGoStep4 = form.name.trim().length > 0;
    const canGoStep5 = form.interestJob.trim().length > 0 || form.interestCompany.trim().length > 0;

    return (
        <div className="ob-step">
            <div className="ob-content">
                {step === 1 && (
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
                        {isPartnerVerified && (
                            <div className="ob-info">
                                인증되었습니다.
                            </div>
                        )}
                        {codeError && <div className="ob-error">{codeError}</div>}
                    </>
                )}

                {/* JUMP */}
                {step === 2 && isJumpVerified && ( 
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

                {step === 2 && isKakaoVerified && (
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

                {ENABLE_EMAIL_VERIFICATION && step === 3 && (
                    <>
                        <h1 className="ob-title">이메일 인증</h1>
                        <div className="ob-field">
                            <input
                                className="ob-input"
                                value={form.email}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="이메일을 입력해주세요"
                                autoComplete="email"
                            />
                        </div>
                        <div className="ob-field">
                            <button className="ob-btn ob-btn--ghost" onClick={submitSendEmailCode} disabled={emailSending} type="button">
                                인증코드 받기
                            </button>
                        </div>
                        <div className="ob-field">
                            <input
                                className="ob-input"
                                value={form.emailCode}
                                onChange={(e) => setForm((p) => ({ ...p, emailCode: e.target.value }))}
                                placeholder="인증코드를 입력해주세요"
                            />
                        </div>
                        {emailSentMessage && <div className="ob-info">{emailSentMessage}</div>}
                        {emailError && <div className="ob-error">{emailError}</div>}
                    </>
                )}

                {step === 4 && (
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

                {step === 5 && (
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
            </div>

            <div className="ob-footer"> {/* 각 step별 하단 버튼 */}
   
                {step === 1 && (
                    <>
                        <button className="ob-btn ob-btn--ghost" onClick={skipVerify} type="button">
                            {t("onboarding.skip")}
                        </button>
                        <button className="ob-btn ob-btn--primary" onClick={submitVerifyCode} disabled={submitting || !canGoStep1} type="button">
                            {t("onboarding.next")}
                        </button>
                    </>
                )}

                {step === 2 && isJumpVerified && (
                    <button className="ob-btn ob-btn--primary" onClick={finishInstitution} disabled={!canGoStep2Jump} type="button">
                        {t("onboarding.next")}
                    </button>
                )}
                
                {step === 2 && isKakaoVerified && (
                    <button className="ob-btn ob-btn--primary" onClick={goToNameStep/* 이메일 인증 재개 시 "next"로 변경 */} disabled={!canGoStep2Kakao} type="button">
                        {t("onboarding.finish")}
                    </button>
                )}
                
                {ENABLE_EMAIL_VERIFICATION && step === 3 && (
                    <button className="ob-btn ob-btn--primary" onClick={submitVerifyEmailCode} disabled={emailVerifying || !canGoStep3} type="button">
                        {t("onboarding.finish")}
                    </button>
                )}

                {step === 4 && (
                    <button className="ob-btn ob-btn--primary" onClick={next} disabled={!canGoStep4} type="button">
                        {t("onboarding.next")}
                    </button>
                )}
                
                {step === 5 && (
                    <>
                        {!canGoStep5 ?(
                            <button className="ob-btn ob-btn--ghost" onClick={finishOnboarding} type="button">
                                {t("onboarding.skip")}
                            </button>   
                        ):(
                            <button className="ob-btn ob-btn--primary" onClick={finishOnboarding} disabled={!canGoStep5} type="button">
                                {t("common.done")}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}