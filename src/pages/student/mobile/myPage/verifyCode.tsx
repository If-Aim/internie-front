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
    const [verifyMessage, setVerifyMessage] = React.useState<string | null>(null);
    const [verifyingCode, setVerifyingCode] = React.useState(false);
    const [savingJumpCenter, setSavingJumpCenter] = React.useState(false);
    const [savingStudentNumber, setSavingStudentNumber] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const verifiedMessageTimeoutRef = React.useRef<number | null>(null);

    /*
    ** 점프 센터 선택 관련
    */
    const [institutions, setInstitutions] = React.useState<JumpOrganization[]>([]);
    const [instOpen, setInstOpen] = React.useState(false);
    const instWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [jumpOrganizationId, setJumpOrganizationId] = React.useState<number | null>(null);
    const [jumpOrganizationName, setJumpOrganizationName] = React.useState<string>("");

    const [orgLoading, setOrgLoading] = React.useState(false);
    const [orgLoadError, setOrgLoadError] = React.useState<string | null>(null);
    const [orgSaveError, setOrgSaveError] = React.useState<string | null>(null);
    const [orgSaveMessage, setOrgSaveMessage] = React.useState<string | null>(null);

    const [studentNumber, setStudentNumber] = React.useState("");
    const [studentNumberError, setStudentNumberError] = React.useState<string | null>(null);
    const [studentNumberMessage, setStudentNumberMessage] = React.useState<string | null>(null);
    
    // 각 client별 인증 코드 후 단계
    const [showJumpPopup, setShowJumpPopup] = React.useState(false);
    const [showKakaoPopup, setShowKakaoPopup] = React.useState(false);
    // 인증 상태
    const roleSet = me?.roleSet ?? [];
    const isJumpVerified = roleSet.includes("ROLE_JUMP_STUDENT");
    // const isEsgVerified = roleSet.includes("ROLE_ESG_STUDENT");
    const isKakaoVerified = roleSet.includes("ROLE_KAKAO_STUDENT");
    // const isPartnerVerified = verifiedFlow !== null;

    function triggerVerifiedMessage(message: string) {
        if (verifiedMessageTimeoutRef.current !== null) {
            window.clearTimeout(verifiedMessageTimeoutRef.current);
        }

        setVerifyMessage(message);

        verifiedMessageTimeoutRef.current = window.setTimeout(() => {
            setVerifyMessage(null);
            verifiedMessageTimeoutRef.current = null;
        }, 5000);
    }

    async function submit() {
        const trimmed = code.trim();
        if (!trimmed) {
            setError("인증코드를 입력해주세요.");
            return;
        }

        setVerifyingCode(true);
        setError(null);

        try {
            const prevRoleSet = me?.roleSet ?? [];

            const refreshed = await verifyClientUser(trimmed);
            const nextRoleSet = refreshed.roleSet ?? [];

            // 추가된 역할 찾기
            const addedRoles = nextRoleSet.filter(
                (role) => !prevRoleSet.includes(role)
            );

            setMe(refreshed);
            setCode("");
            setError(null);

            if (addedRoles.length === 0) {
                triggerVerifiedMessage("이미 인증된 코드입니다.");
            } else {
                triggerVerifiedMessage("인증이 완료되었습니다.");
            }

            const hasJumpRole = nextRoleSet.includes("ROLE_JUMP_STUDENT");
            const hasKakaoRole = nextRoleSet.includes("ROLE_KAKAO_STUDENT");
            const hasJumpOrganization = refreshed.jumpOrganization?.id != null;
            const hasStudentNumber = (refreshed.studentNumber ?? "").trim().length > 0;

            if (hasJumpRole) {
                await loadJumpOrganizations(refreshed.jumpOrganization);
            }

            if (hasJumpRole && !hasJumpOrganization) {
                setShowJumpPopup(true);
                setShowKakaoPopup(false);
            } else if (hasKakaoRole && !hasStudentNumber) {
                setShowKakaoPopup(true);
                setShowJumpPopup(false);
            } else {
                setShowJumpPopup(false);
                setShowKakaoPopup(false);
            }

        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status === 400) setError("인증 코드가 올바르지 않습니다.");
                else setError("인증에 실패했습니다.");
            } else {
                setError("인증에 실패했습니다.");
            }
        } finally {
            setVerifyingCode(false);
        }
    }

    function handleSubmitCode() {
        void submit();
    }

    async function loadJumpOrganizations(currentOrg?: JumpOrganization | null) {
        setOrgLoading(true);
        setOrgLoadError(null);

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
            setOrgLoadError("센터 목록을 불러오지 못했습니다.");
        } finally {
            setOrgLoading(false);
        }
    }

    function pickInstitution(org: JumpOrganization) {
        setJumpOrganizationId(org.id);
        setJumpOrganizationName(org.name);
        setOrgSaveError(null);
        setOrgSaveMessage(null);
        setInstOpen(false);
    }

    async function finishInstitution() {
        if (!jumpOrganizationId) return;

        const name = (me?.name ?? me?.kakaoName ?? "").trim();
        if (!name) {
            setOrgSaveError("이름 정보가 없어 센터 저장을 진행할 수 없습니다.");
            return;
        }

        setSavingJumpCenter(true);
        setOrgSaveError(null);
        setOrgSaveMessage(null);

        try {
            const updated = await submitMyOnboarding({
                name,
                jumpOrganizationId,
            });

            setMe(updated);
            setJumpOrganizationId(updated.jumpOrganization?.id ?? null);
            setJumpOrganizationName(updated.jumpOrganization?.name ?? "");
            setOrgSaveError(null);
            setOrgSaveMessage("센터 저장이 완료되었습니다.");

            const hasKakaoRole = (updated.roleSet ?? []).includes("ROLE_KAKAO_STUDENT");
            const hasStudentNumber = (updated.studentNumber ?? "").trim().length > 0;

            if (hasKakaoRole && !hasStudentNumber) {
                setShowJumpPopup(false);
                setShowKakaoPopup(true);
            } else {
                setShowJumpPopup(false);
                setShowKakaoPopup(false);
            }
        } catch (e) {
            if (e instanceof ApiError) {
                setOrgSaveError("센터 저장에 실패했습니다.");
            } else {
                setOrgSaveError("센터 저장에 실패했습니다.");
            }
        } finally {
            setSavingJumpCenter(false);
        }
    }

    async function finishStudentNumber() {
        const trimmedStudentNumber = studentNumber.trim();
        const name = (me?.name ?? me?.kakaoName ?? "").trim();

        if (!name) {
            setStudentNumberError("이름 정보가 없어 학번 저장을 진행할 수 없습니다.");
            return;
        }

        if (!trimmedStudentNumber) {
            setStudentNumberError("학번을 입력해주세요.");
            return;
        }

        setSavingStudentNumber(true);
        setStudentNumberError(null);
        setStudentNumberMessage(null);

        try {
            const updated = await submitMyOnboarding({
                name,
                studentNumber: trimmedStudentNumber,
            });

            setMe(updated);
            setStudentNumber((updated.studentNumber ?? "").trim());
            setStudentNumberError(null);
            setStudentNumberMessage("학번 저장이 완료되었습니다.");
            setShowKakaoPopup(false);
            setShowJumpPopup(false);
        } catch (e) {
            if (e instanceof ApiError) {
                setStudentNumberError("학번 저장에 실패했습니다.");
            } else {
                setStudentNumberError("학번 저장에 실패했습니다.");
            }
        } finally {
            setSavingStudentNumber(false);
        }
    }

    React.useEffect(() => {
        return () => {
            if (verifiedMessageTimeoutRef.current !== null) {
                window.clearTimeout(verifiedMessageTimeoutRef.current);
            }
        };
    }, []);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const user = await getUserMe();
                if (!mounted) return;
                setMe(user);
                setStudentNumber((user.studentNumber ?? "").trim());

                const existingOrg = user.jumpOrganization;
                if (existingOrg?.id != null) {
                    setJumpOrganizationId(existingOrg.id);
                    setJumpOrganizationName(existingOrg.name ?? "");
                }

                if (Array.isArray(user.roleSet) && user.roleSet.includes("ROLE_JUMP_STUDENT")) {
                    await loadJumpOrganizations(user.jumpOrganization);
                }

                const needsJumpCenter =
                    Array.isArray(user.roleSet) &&
                    user.roleSet.includes("ROLE_JUMP_STUDENT") &&
                    user.jumpOrganization?.id == null;

                const needsStudentNumber =
                    Array.isArray(user.roleSet) &&
                    user.roleSet.includes("ROLE_KAKAO_STUDENT") &&
                    !(user.studentNumber ?? "").trim();

                if (needsJumpCenter) {
                    setShowJumpPopup(true);
                    setShowKakaoPopup(false);
                } else if (needsStudentNumber) {
                    setShowKakaoPopup(true);
                    setShowJumpPopup(false);
                } else {
                    setShowJumpPopup(false);
                    setShowKakaoPopup(false);
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
                    className="profile-edit-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("mypage.verificationCode")}
                    disabled={verifyingCode}
                />
            </div>
            
            {showJumpPopup && (
                <div className="client-verify-popup-backdrop" onClick={() => setShowJumpPopup(false)}>
                    <div className="client-verify-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="client-verify-popup-header">
                            <div className="client-verify-popup-title">센터 선택</div>
                            <button
                                type="button"
                                className="client-verify-popup-close"
                                onClick={() => setShowJumpPopup(false)}
                            >
                                <img src="/icons/x-01.svg" alt="닫기" />
                            </button>
                        </div>

                        <div className="client-verify-popup-desc">
                            소속된 점프 센터를 선택해주세요.
                        </div>

                        <div className="client-verify-popup-body">
                            {orgLoading ? (
                                <div className="client-verify-popup-info">불러오는 중...</div>
                            ) : orgLoadError ? (
                                <div className="client-verify-popup-error">{orgLoadError}</div>
                            ) : (
                                <div className={"vcjp-dd" + (instOpen ? " vcjp-dd--open" : "")} ref={instWrapRef}>
                                    <button
                                        type="button"
                                        className="vcjp-dd-trigger"
                                        onClick={() => setInstOpen((v) => !v)}
                                        aria-haspopup="listbox"
                                        aria-expanded={instOpen}
                                        disabled={savingJumpCenter}
                                    >
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

                            {orgSaveError && <div className="client-verify-popup-error">{orgSaveError}</div>}
                            {orgSaveMessage && <div className="client-verify-popup-info">{orgSaveMessage}</div>}
                        </div>

                        <div className="client-verify-popup-footer">
                            <button
                                type="button"
                                className="client-verify-popup-secondary"
                                onClick={() => setShowJumpPopup(false)}
                                disabled={savingJumpCenter}
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                className="client-verify-popup-primary"
                                onClick={() => { void finishInstitution(); }}
                                disabled={savingJumpCenter || !jumpOrganizationId}
                            >
                                {savingJumpCenter ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showKakaoPopup && (
                <div className="client-verify-popup-backdrop" onClick={() => setShowKakaoPopup(false)}>
                    <div className="client-verify-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="client-verify-popup-header">
                            <div className="client-verify-popup-title">학번 입력</div>
                            <button
                                type="button"
                                className="client-verify-popup-close"
                                onClick={() => setShowKakaoPopup(false)}
                            >
                                <img src="/icons/x-01.svg" alt="닫기" />
                            </button>
                        </div>

                        <div className="client-verify-popup-desc">
                            카카오 인증 사용자는 학번을 입력해주세요.
                        </div>

                        <div className="client-verify-popup-body">
                            <input
                                className="client-verify-popup-input"
                                value={studentNumber}
                                onChange={(e) => {
                                    setStudentNumber(e.target.value);
                                    setStudentNumberError(null);
                                    setStudentNumberMessage(null);
                                }}
                                placeholder="학번 입력"
                                disabled={savingStudentNumber}
                            />

                            {studentNumberError && <div className="client-verify-popup-error">{studentNumberError}</div>}
                            {studentNumberMessage && <div className="client-verify-popup-info">{studentNumberMessage}</div>}
                        </div>

                        <div className="client-verify-popup-footer">
                            <button
                                type="button"
                                className="client-verify-popup-secondary"
                                onClick={() => setShowKakaoPopup(false)}
                                disabled={savingStudentNumber}
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                className="client-verify-popup-primary"
                                onClick={() => { void finishStudentNumber(); }}
                                disabled={savingStudentNumber || !studentNumber.trim()}
                            >
                                {savingStudentNumber ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {verifyMessage && (
                <div className="verify-success-message">{verifyMessage}</div>
            )}

            {error && <div className="ob-error">{error}</div>}
            <div className="verify-client-actions">
                {isJumpVerified && (
                    <button
                        type="button"
                        className="verify-client-action-btn"
                        onClick={() => {
                            setOrgSaveError(null);
                            setOrgSaveMessage(null);
                            setShowJumpPopup(true);
                            setShowKakaoPopup(false);
                        }}
                    >
                        점프 센터 선택
                    </button>
                )}

                {isKakaoVerified && (
                    <button
                        type="button"
                        className="verify-client-action-btn"
                        onClick={() => {
                            setStudentNumberError(null);
                            setStudentNumberMessage(null);
                            setShowKakaoPopup(true);
                            setShowJumpPopup(false);
                        }}
                    >
                        학번 수정
                    </button>
                )}
            </div>
            <div className="verify-code-actions">
                <button className="submit-code" onClick={handleSubmitCode} disabled={verifyingCode} >
                    {verifyingCode ? "확인 중..." : t("common.done")}
                </button>
            </div>
        </div>
    );
}