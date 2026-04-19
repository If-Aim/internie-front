import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getUserMe, updateMyProfile, type UserMe, updateMyProfileImage, deleteMyProfileImage, sendMyEmailCode, verifyMyEmailCode } from "../../../../api/client";
import "./myPage.css";
import "./userModify.css";

type ProfileForm = {
    name: string;
    email: string;
    // nickname: string;        // TODO: 추후 활성화
    // birth: string;           // TODO
};

function normalizeText(v: string) {
    return v.trim();
}

export default function EditProfilePage(): React.ReactElement {
    const { t, i18n } = useTranslation();

    const navigate = useNavigate();
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const [me, setMe] = React.useState<UserMe | null>(null);

    const [form, setForm] = React.useState<ProfileForm>({ name: "", email: "", });
    const [initialForm, setInitialForm] = React.useState<ProfileForm | null>(null);

    const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
    const [removeProfileImage, setRemoveProfileImage] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    
    const [emailConfirmOpen, setEmailConfirmOpen] = React.useState(false);
    const [emailVerifyPopupOpen, setEmailVerifyPopupOpen] = React.useState(false);
    const [emailForm, setEmailForm] = React.useState({ email: "", code: "" });
    const [emailSending, setEmailSending] = React.useState(false);
    const [emailVerifying, setEmailVerifying] = React.useState(false);
    const [emailSentMessage, setEmailSentMessage] = React.useState<string | null>(null);
    const [emailError, setEmailError] = React.useState<string | null>(null);

    const [saving, setSaving] = React.useState(false);
    const [/*avatarVersion*/, setAvatarVersion] = React.useState<number>(0);
    
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await getUserMe();
                if (!mounted) return;

                setMe(data);

                const loaded: ProfileForm = {
                name: data.name ?? "",
                email: (data as any).email ?? "",
                // nickname: data.nickname ?? "",
                // birth: (data as any).birth ?? "",
                };

                setForm(loaded);
                setInitialForm(loaded);
            } catch {
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!selectedImageFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(selectedImageFile);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [selectedImageFile]);

    const isDefaultProfile = !me?.profileImage || (me.profileImage ?? "").includes("default");
    const rawServerAvatarSrc = isDefaultProfile ? "/internie_mascot_normal.png" : (me?.profileImage ?? "/internie_mascot_normal.png");

    const serverAvatarSrc =
        rawServerAvatarSrc.startsWith("http")
            ? rawServerAvatarSrc
            : rawServerAvatarSrc;
    
    const avatarSrc = removeProfileImage
        ? "/internie_mascot_normal.png"
        : (previewUrl ?? serverAvatarSrc);

    // 임시
    const displayEmail = form.email.trim() || "";
    const birth = (me as any)?.birth ?? t("mypage.birth");
    const schoolMajor = me?.status === "APPROVED" ? (me.school?.name ?? t("mypage.noSchool")) : t("mypage.needStudentVerification");

    // 변경 여부
    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;

        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;
        if (normalizeText(form.email) !== normalizeText(initialForm.email)) return true;
        
        // TODO: 추후 필드 활성화 시 아래 주석 해제
        // if (normalizeText(form.nickname) !== normalizeText(initialForm.nickname)) return true;
        // if (normalizeText(form.birth) !== normalizeText(initialForm.birth)) return true;

        if (selectedImageFile) return true;
        if (removeProfileImage) return true;
        return false;

    }, [form, initialForm, selectedImageFile, removeProfileImage]);

    async function onPickProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = "";

        if (!file.type.startsWith("image/")) {
            alert(t("error.imageRequired"));
            return;
        }

        setRemoveProfileImage(false);
        setSelectedImageFile(file);
    }
    
    function onDeleteProfileImage() {
        setSelectedImageFile(null);
        setRemoveProfileImage(true);
    }

    async function onSave() {
        const trimmedName = normalizeText(form.name);

        if (!trimmedName) {
            alert(t("mypage.needName"));
            return;
        }
        try {
            setSaving(true);

            let updatedMe: UserMe | null = null;
            updatedMe = await updateMyProfile({
                name: trimmedName,
            });

            if (removeProfileImage) {
                updatedMe = await deleteMyProfileImage();
            }

            if (selectedImageFile) {
                updatedMe = await updateMyProfileImage(selectedImageFile);
            }

            if (updatedMe) {
                setMe(updatedMe);
                setAvatarVersion(Date.now());
                window.dispatchEvent(new Event("profile-updated"));
            }

            const nextInitial: ProfileForm = {
                ...form,
                name: trimmedName,
            };
            setInitialForm(nextInitial);
            setForm(nextInitial);

            setSelectedImageFile(null);
            setRemoveProfileImage(false);
        } catch (e) {
            const status = (e as any)?.status;
            const bodyText = (e as any)?.bodyText;

            alert(
                status != null
                    ? `수정 실패 (status=${String(status)})\n${String(bodyText ?? "")}`
                    : `수정 실패\n${String(e ?? "")}`
            );
            console.error("[onSave] error:", e);
        } finally {
            setSaving(false);
        }
    }

    function handleEmailPopupBackdropClick() {
		setEmailVerifyPopupOpen(false);
	}

    function handleCloseEmailVerifyPopup() {
		setEmailVerifyPopupOpen(false);
	}

    async function handleSendEmailCode() {
        const currentEmail = (me?.email ?? "").trim().toLowerCase();
        const nextEmail = emailForm.email.trim().toLowerCase();

        if (!nextEmail) {
            setEmailError("이메일을 입력해주세요.");
            return;
        }

        if (nextEmail === currentEmail) {
            setEmailError("현재 사용 중인 이메일과 동일합니다. 다른 이메일을 입력해주세요.");
            return;
        }
        
        const email = emailForm.email.trim();

        if (!email) {
            setEmailError("이메일을 입력해주세요.");
            return;
        }

        setEmailSending(true);
        setEmailError(null);
        setEmailSentMessage(null);

        try {
            const lang = i18n.resolvedLanguage ?? i18n.language ?? "ko";
            const res = await sendMyEmailCode(email, lang);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            setEmailSentMessage(`${res.maskedEmail}로 인증코드를 발송했습니다.`);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "AUTH_EXISTING_ACCOUNT") {
                    alert("이미 존재하는 계정입니다. 해당 계정으로 로그인해주세요.");
                    localStorage.removeItem("accessToken");
                    navigate("/login", { replace: true });
                    return;
                }
                setEmailError("인증코드 발송에 실패했습니다.");
                return;
            }

            setEmailError("이메일 전송 중 오류가 발생했습니다.");
        } finally {
            setEmailSending(false);
        }
    }
    
    async function handleVerifyEmailCode() {
        const email = emailForm.email.trim();
        const code = emailForm.code.trim();
        const beforeEmail = (me?.email ?? "").trim().toLowerCase();

        if (!email) {
            setEmailError("이메일을 입력해주세요.");
            return;
        }

        if (!code) {
            setEmailError("인증코드를 입력해주세요.");
            return;
        }

        if (email.toLowerCase() === beforeEmail) {
            setEmailError("현재 사용 중인 이메일과 동일합니다. 다른 이메일을 입력해주세요.");
            return;
        }

        try {
            setEmailVerifying(true);
            setEmailError(null);

            const res = await verifyMyEmailCode(email, code);

            if (!res.verified) {
                setEmailError("이메일 인증에 실패했습니다.");
                return;
            }

            const nextMe = await getUserMe();
            const afterEmail = (nextMe.email ?? "").trim().toLowerCase();

            if (afterEmail === beforeEmail) {
                setEmailError("현재 이메일과 동일하여 변경되지 않았습니다.");
                return;
            }

            setMe(nextMe);
            setForm((prev) => ({ ...prev, email: (nextMe.email ?? "").trim() }));
            setInitialForm((prev) =>
                prev ? { ...prev, email: (nextMe.email ?? "").trim() } : prev
            );
            setEmailVerifyPopupOpen(false);
            setEmailForm({ email: "", code: "" });
            setEmailSentMessage(null);
            setEmailError(null);
            window.dispatchEvent(new Event("profile-updated"));
            alert("이메일 변경이 완료되었습니다.");
        } catch (e) {
            if (e instanceof ApiError) {
                setEmailError("인증코드가 올바르지 않거나 만료되었습니다.");
                return;
            }
            setEmailError("이메일 인증 중 오류가 발생했습니다.");
        } finally {
            setEmailVerifying(false);
        }
    }

    function handleServicePreparing() {
        alert("서비스 준비중입니다.");
    }
    
    if (!me || !initialForm) return <div />;

    return (
        <>
            <div className="mypage user-modify">
                <header className="mypage-header">
                    <div className="mypage-email">{t("mypage.editProfile")}</div>
                    <button type="button" className="mypage-close" aria-label="닫기" onClick={() => navigate(-1)}>
                        <img src="/icons/x-01.svg" alt="" />
                    </button>
                </header>

                <div className="profile-edit">
                    <section className="mypage-top">
                        <div className="mypage-profileimg-wrap">
                            <img className="mypage-profileimg" src={avatarSrc} alt="profileImg" />
                        </div>
                        <div className="profile-edit-avatar-actions">
                            <button type="button" className="profile-edit-avatar-btn" onClick={()=> fileRef.current?.click()} disabled={saving} >
                                {t("mypage.edit")}
                            </button>
                            <button type="button" className="profile-edit-avatar-delete-btn" onClick={onDeleteProfileImage} disabled={saving} > 
                                {t("mypage.delete")}
                            </button>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={onPickProfileImage} style={{ display: "none" }} /> 
                    </section>

                    <section className="profile-edit-form">
                        <div className="profile-edit-field">
                            <div className="profile-edit-label">{t("mypage.name")}</div>
                            <input className="profile-edit-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={saving} />
                        </div>

                        <div className="profile-edit-field">
                            <div className="profile-edit-label">E-mail</div>
                            <input className="profile-edit-input is-readonly" value={displayEmail} readOnly 
                                onClick={() => {
                                    if (saving) return;
                                    setEmailConfirmOpen(true);
                                }} 
                            />
                        </div>

                        <div className="profile-edit-field">
                            <div className="profile-edit-label">{t("mypage.birth")}</div>
                            <input className="profile-edit-input is-readonly" value={birth} readOnly onClick={handleServicePreparing} />
                        </div>

                        <div className="profile-edit-field">
                            <div className="profile-edit-label">{t("mypage.schoolMajor")}</div>
                            <input className="profile-edit-input is-readonly" value={schoolMajor} disabled />
                        </div>
                    </section>
                </div>

                <div className="profile-edit-bottom">
                    <button className={`profile-edit-save ${!isDirty ? "is-disabled" : ""}`} onClick={onSave} disabled={!isDirty || saving} >
                        {t("common.save")}
                    </button>
                </div>
            </div>

            {emailConfirmOpen && (
                <div className="client-verify-popup-backdrop" onClick={() => setEmailConfirmOpen(false)} role="presentation">
                    <div className="client-verify-popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="client-verify-popup-header">
                            <div className="client-verify-popup-title">이메일 변경</div>
                            <button type="button" className="client-verify-popup-close" onClick={() => setEmailConfirmOpen(false)}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="client-verify-popup-desc">
                            이메일을 변경을 위해 이메일 인증을 진행해야 합니다. 계속하시겠습니까?
                        </div>

                        <div className="client-verify-popup-footer">
                            <button type="button" className="client-verify-popup-secondary" onClick={() => setEmailConfirmOpen(false)}>
                                취소
                            </button>
                            <button
                                type="button"
                                className="client-verify-popup-primary"
                                onClick={() => {
                                    setEmailConfirmOpen(false);
                                    setEmailForm({ email: "", code: "" });
                                    setEmailSentMessage(null);
                                    setEmailError(null);
                                    setEmailVerifyPopupOpen(true);
                                }}
                            >
                                계속
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 이메일 재인증 */}
			{emailVerifyPopupOpen && (
				<div className="email-popup-backdrop" onClick={handleEmailPopupBackdropClick} role="presentation">
					<div className="email-popup" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
						<div className="email-popup-header">
							<div className="email-popup-title">이메일 인증</div>
							<button type="button" className="email-popup-close" aria-label={t("common.close")} onClick={handleCloseEmailVerifyPopup}>
								<img className="icon" src="/icons/x-01.svg" alt="" />
							</button>
						</div>

						<div className="email-popup-desc">
							이메일 변경을 위해 인증을 진행해주세요.
						</div>

						<div className="email-popup-body">
							<input
								className="email-popup-input"
								value={emailForm.email}
								onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))}
								placeholder="이메일을 입력해주세요"
								autoComplete="email"
							/>

							<div className="email-popup-row">
								<input
									className="email-popup-input"
									value={emailForm.code}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, code: e.target.value }))}
									placeholder="인증코드를 입력해주세요"
								/>
								<button
									type="button"
									className="email-popup-send-btn"
									onClick={handleSendEmailCode}
									disabled={emailSending}
								>
									{emailSending ? "전송중" : "코드 받기"}
								</button>
							</div>

							{emailSentMessage && <div className="email-popup-info">{emailSentMessage}</div>}
							{emailError && <div className="email-popup-error">{emailError}</div>}
						</div>

						<div className="email-popup-footer">
							<button type="button" className="email-popup-secondary" onClick={handleCloseEmailVerifyPopup}>
								나중에
							</button>
							<button
								type="button"
								className="email-popup-primary"
								onClick={handleVerifyEmailCode}
								disabled={emailVerifying || !emailForm.email.trim() || !emailForm.code.trim()}
							>
								{emailVerifying ? "인증 중" : "인증하기"}
							</button>
						</div>
					</div>
				</div>
			)}
        </>
    );
}
