// src/pages/login/mobile/onBoarding.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getUserMe, verifyJumpUser } from '../../../api/client';

import "./onBoarding.css"

type Step = 1 | 2 | 3 | 4;

type FormState = {
    name: string;
    roleKeyword: string;
    companyKeyword: string;
    selectedTags: string[];
    verifyCode: string;

    institution: string;
};


export default function OnBoarding(): React.ReactElement {
    const navigate = useNavigate();
    const [step, setStep] = React.useState<Step>(1);

    const [form, setForm] = React.useState<FormState>({
        name: "",
        roleKeyword: "",
        companyKeyword: "",
        selectedTags: [],
        verifyCode: "",
        institution: "",
    });

    const [submitting, setSubmitting] = React.useState(false);
    const [codeError, setCodeError] = React.useState<string | null>(null);

    const [isVerified, setIsVerified] = React.useState(false);
    const [instOpen, setInstOpen] = React.useState(false);
    const instWrapRef = React.useRef<HTMLDivElement | null>(null);

    const INSTITUTIONS = React.useMemo(() => { // 예시 기관 목록
        return [
            "전체",
            "기관 A",
            "기관 B",
            "기관 C",
        ];
    }, []);

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
        setForm((prev) => ({ ...prev, roleKeyword: "", companyKeyword: "", selectedTags: [] }));
        setStep(3);
    }
    async function skipVerifyAndFinish() {
        setCodeError(null);

        navigate("/student", { replace: true });
    }
    async function submitAll() {
        const code = form.verifyCode.trim();

        if (!code) {
            navigate("/student", { replace: true });
            return;
        }

        setSubmitting(true);
        setCodeError(null);
        try {
            await verifyJumpUser(code);

            setIsVerified(true);
            setStep(4);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) setCodeError("인증 코드가 올바르지 않습니다.");
                else setCodeError("인증에 실패했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                setCodeError("인증에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    function pickInstitution(name: string) {// 기관 선택
        setForm((p) => ({ ...p, institution: name }));
        setInstOpen(false);
    }

    function finishInstitution() { // Step 4 완료 처리
        navigate("/student", { replace: true });
    }

    const canGoStep1 = form.name.trim().length > 0;
    
    const canFinishStep4 = isVerified && form.institution.trim().length > 0;

    return (
        <div className="ob-step">
            <div className="ob-content">
                {step === 1 && (
                    <>
                    <h1 className="ob-title">이름을 입력하세요</h1>
                    <div className="ob-field">
                        <input
                        className="ob-input"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="이름"
                        autoComplete="name"
                        />
                    </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h1 className="ob-title">나의 목표를 설정하세요</h1>

                        <div className="ob-field ob-field--icon">
                            <input
                            className="ob-input"
                            value={form.roleKeyword}
                            onChange={(e) => setForm((p) => ({ ...p, roleKeyword: e.target.value }))}
                            placeholder="관심있는 직무를 입력하세요"
                            />
                            <span className="ob-icon" aria-hidden="true"><img src="/search-01.svg" alt="" /></span>
                        </div>

                        <div className="ob-field ob-field--icon">
                            <input
                            className="ob-input"
                            value={form.companyKeyword}
                            onChange={(e) => setForm((p) => ({ ...p, companyKeyword: e.target.value }))}
                            placeholder="희망하는 기업을 입력하세요"
                            />
                            <span className="ob-icon" aria-hidden="true"><img src="/search-01.svg" alt="" /></span>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h1 className="ob-title">인증코드를 입력하세요</h1>
                        <div className="ob-field">
                            <input
                                className="ob-input"
                                value={form.verifyCode}
                                onChange={(e) => setForm((p) => ({ ...p, verifyCode: e.target.value }))}
                                placeholder="인증코드"
                            />
                        </div>

                        {codeError && <div className="ob-error">{codeError}</div>}
                    </>
                )}

                {step === 4 && isVerified && (
                    <>
                        <div className="ob-jump-logo">
                            <img src="/jump-logo.png" alt="JUMP" />
                        </div>

                        <h1 className="ob-title">기관을 선택하세요</h1>

                        <div className="ob-field">
                            <div className={"ob-dd" + (instOpen ? " ob-dd--open" : "")} ref={instWrapRef}>
                                <button
                                    type="button"
                                    className="ob-dd-trigger"
                                    onClick={() => setInstOpen((v) => !v)}
                                    aria-haspopup="listbox"
                                    aria-expanded={instOpen}
                                >
                                    <span className={"ob-dd-value" + (form.institution ? "" : " ob-dd-value--placeholder")}>
                                        {form.institution || "전체"}
                                    </span>
                                    <span className="ob-dd-caret" aria-hidden="true">
                                        <img src="/chevron-down.svg" alt="" />
                                    </span>
                                </button>

                                {instOpen && (
                                    <div className="ob-dd-menu" role="listbox" aria-label="기관 목록">
                                        {INSTITUTIONS.map((name) => (
                                            <button
                                                key={name}
                                                type="button"
                                                className={"ob-dd-item" + (form.institution === name ? " ob-dd-item--active" : "")}
                                                onClick={() => pickInstitution(name)}
                                                role="option"
                                                aria-selected={form.institution === name}
                                            >
                                                {name}
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
                    다음
                    </button>
                )}

                {step === 2 && (
                    <>
                    <button className="ob-btn ob-btn--ghost" onClick={skipGoals} type="button">
                        건너뛰기
                    </button>
                    <button className="ob-btn ob-btn--primary" onClick={next} type="button">
                        다음
                    </button>
                    </>
                )}

                {step === 3 && (
                    <>
                    <button className="ob-btn ob-btn--ghost" onClick={skipVerifyAndFinish} type="button">
                        건너뛰기
                    </button>
                    <button className="ob-btn ob-btn--primary" onClick={submitAll} disabled={submitting} type="button">
                        다음
                    </button>
                    </>
                )}
                {step === 4 && isVerified && (
                    <button className="ob-btn ob-btn--primary" onClick={finishInstitution} disabled={!canFinishStep4} type="button" >
                        완료
                    </button>
                )}
            </div>
        </div>
    );
}