// src/pages/student/mobile/myPage/verifyCode.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { type UserMe, ApiError, verifyClientUser, getUserMe, type JumpOrganization, getMyJumpOrganizations, submitMyOnboarding } from "../../../../api/client";
import "./myPage.css";
import "./userModify.css";

export default function VerifyCodePage() {
    const { t } = useTranslation();
    
    const navigate = useNavigate();
    const [me, setMe] = React.useState<UserMe | null>(null);

    const [code, setCode] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    /*
    ** 점프 센터 선택 관련
    */
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);
    const [instOpen, setInstOpen] = React.useState(false);
    const instWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [jumpOrganizationId, setJumpOrganizationId] = React.useState<number | null>(null);
    const [jumpOrganizationName, setJumpOrganizationName] = React.useState<string>("");

    const [orgLoading, setOrgLoading] = React.useState(false);
    const [orgError, setOrgError] = React.useState<string | null>(null);

    // 인증 상태
    function getVerifiedFlow(role: string | null) {
        switch (role) {
            case "ROLE_JUMP_STUDENT":
                return "JUMP";
            case "ROLE_ESG_STUDENT":
                return "ESG";
            case "ROLE_KAKAO_STUDENT":
                return "KAKAO";
            default:
                return null;
        }
    }

    const verifiedFlow = getVerifiedFlow(me?.role ?? null);

    const isJumpVerified = verifiedFlow === "JUMP";
    // const isEsgVerified = verifiedFlow === "ESG";
    // const isKakaoVerified = verifiedFlow === "KAKAO";
    const isPartnerVerified = verifiedFlow !== null;

    async function submit() {
        const trimmed = code.trim();
        if (!trimmed) {
            setError("인증코드를 입력해주세요.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const refreshed = await verifyClientUser(trimmed);
            const flow = getVerifiedFlow(refreshed.role ?? null);

            setMe(refreshed);

            if (flow === "JUMP") {
                setCode("인증이 완료되었습니다.");
                await loadJumpOrganizations(refreshed.jumpOrganization);
                return;
            }

            if (flow !== null) {
                setCode("인증이 완료되었습니다.");
                return;
            }

            setError("인증된 사용자 역할을 확인할 수 없습니다.");
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 401) setError("인증 코드가 올바르지 않습니다.");
                else setError("인증에 실패했습니다.");
            } else {
                setError("인증에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    function handleDone() {
        if (isJumpVerified) {
            void finishInstitution();
            return;
        }

        if (isPartnerVerified) {
            navigate("/student", { replace: true });
            return;
        }

        void submit();
    }

    async function loadJumpOrganizations(currentOrg?: JumpOrganization | null) {
        setOrgLoading(true);
        setOrgError(null);

        try {
            const orgs = await getMyJumpOrganizations();
            const list = Array.isArray(orgs) ? orgs : [];

            const merged =
                currentOrg?.id && !list.some((x) => x.id === currentOrg.id)
                    ? [{ id: currentOrg.id, name: currentOrg.name ?? "" }, ...list]
                    : list;

            setInstitutions(merged);

            if (currentOrg?.id) {
                setJumpOrganizationId(currentOrg.id);
                setJumpOrganizationName(currentOrg.name ?? "");
            }
        } catch {
            setInstitutions([]);
            setOrgError("센터 목록을 불러오지 못했습니다.");
        } finally {
            setOrgLoading(false);
        }
    }

    function pickInstitution(org: JumpOrganization) {
        setJumpOrganizationId(org.id);
        setJumpOrganizationName(org.name);
        setInstOpen(false);
    }

    async function finishInstitution() {
        if (!jumpOrganizationId) return;

        const name = (me?.name ?? me?.kakaoName ?? "").trim();
        if (!name) {
            setOrgError("이름 정보가 없어 센터 저장을 진행할 수 없습니다.");
            return;
        }

        setSubmitting(true);
        setOrgError(null);

        try {
            await submitMyOnboarding({
                name,
                jumpOrganizationId,
            });

            navigate("/student", { replace: true });
        } catch (e) {
            if (e instanceof ApiError) {
                setOrgError("센터 저장에 실패했습니다.");
            } else {
                setOrgError("센터 저장에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
    }
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const user = await getUserMe();
                if (!mounted) return;
                setMe(user);

                const existingOrg = user.jumpOrganization;
                if (existingOrg?.id != null) {
                    setJumpOrganizationId(existingOrg.id);
                    setJumpOrganizationName(existingOrg.name ?? "");
                }

                if (user.role === "ROLE_JUMP_STUDENT") {
                    setCode("JUMP 인증 완료");
                    await loadJumpOrganizations(user.jumpOrganization);
                }
            } catch {
                
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

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

    return (
        <div className="mypage user-verify-code">
            <header className="mypage-header">
                <button type="button" className="mypage-previous" aria-label="previous" onClick={() => navigate(-1)} >
                    <img src="/icons/chevron-left.svg" alt="" />
                </button>
                <div className="mypage-email"></div>
            </header>

            <div className="profile-edit-field">
                <div className="profile-edit-label">{t("mypage.enterVerificationCode")}</div>
                <input
                    className={`profile-edit-input ${isJumpVerified ? "is-readonly" : ""}`}
                    value={isPartnerVerified ? "인증이 완료되었습니다." : code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={isPartnerVerified ? undefined : t("mypage.verificationCode")}
                    readOnly={isPartnerVerified}
                    disabled={submitting}
                />
            </div>

            {isJumpVerified && ( // 점프 센터 선택
                <div className="jump-center-select">
                    <div className="vcjp-jump-logo">
                        <img src="/logos/jump-logo.png" alt="JUMP" />
                    </div>
                    <div className="vcjp-title">센터를 선택하세요</div>

                    {orgLoading ? (
                        <div className="ob-error">불러오는 중...</div>
                    ) : orgError ? (
                        <div className="ob-error">{orgError}</div>
                    ) : (
                        <div className={"vcjp-dd" + (instOpen ? " vcjp-dd--open" : "")} ref={instWrapRef}>
                            <button type="button" className="vcjp-dd-trigger" onClick={() => setInstOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={instOpen} disabled={submitting} > 
                                <span className={"vcjp-dd-value" + (jumpOrganizationName ? "" : " vcjp-dd-value--placeholder")}>
                                    {jumpOrganizationName || "센터 선택"}
                                </span>
                                <span className="vcjp-dd-caret" aria-hidden="true">
                                    <img src="/icons/chevron-left.svg" alt="" />
                                </span>
                            </button>

                            {instOpen && (
                                <div className="vcjp-dd-menu" role="listbox" aria-label="센터 목록">
                                    {institutions.map((org) => (
                                        <button
                                            key={org.id}
                                            type="button"
                                            className={"vcjp-dd-item" + (jumpOrganizationId === org.id ? " vcjp-dd-item--active" : "")}
                                            onClick={() => pickInstitution(org)}
                                            role="option"
                                            aria-selected={jumpOrganizationId === org.id}
                                        >
                                            {org.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && <div className="ob-error">{error}</div>}

            <button
                className="submit-code"
                onClick={handleDone}
                disabled={
                    submitting ||
                    (isJumpVerified && !jumpOrganizationId)
                }
            >
                {t("common.done")}
            </button>
        </div>
    );
}