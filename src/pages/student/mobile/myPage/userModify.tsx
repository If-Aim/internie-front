import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getUserMe, updateMyProfile, type UserMe, updateMyProfileImage, deleteMyProfileImage, sendMyEmailCode, verifyMyEmailCode } from "../../../../api/client";
import "./myPage.css";
import "./userModify.css";

type ProfileForm = {
    name: string;
    email: string;
    nickname: string;
    linkedinUrl: string;
    studentNumber: string;
    major: string;
    campus: string;
};

function normalizeText(v: string) {
    return v.trim();
}

function normalizeOptionalText(v: string): string | null {
    const trimmed = v.trim();
    return trimmed ? trimmed : null;
}

export default function EditProfilePage(): React.ReactElement {
    const { t, i18n } = useTranslation();

    const navigate = useNavigate();
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const [me, setMe] = React.useState<UserMe | null>(null);

    const [form, setForm] = React.useState<ProfileForm>({
        name: "",
        email: "",
        nickname: "",
        linkedinUrl: "",
        studentNumber: "",
        major: "",
        campus: "",
    });
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
                    email: data.email ?? "",
                    nickname: data.nickname ?? "",
                    linkedinUrl: data.linkedinUrl ?? "",
                    studentNumber: data.studentNumber ?? "",
                    major: data.major ?? "",
                    campus: data.campus ?? "",
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
    const isStudentUser = (me?.roleSet ?? []).some((role) => role === "ROLE_STUDENT" || role.endsWith("_STUDENT"));

    // 변경 여부
    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;

        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;
        if (normalizeText(form.email) !== normalizeText(initialForm.email)) return true;
        if (normalizeText(form.nickname) !== normalizeText(initialForm.nickname)) return true;
        if (normalizeText(form.linkedinUrl) !== normalizeText(initialForm.linkedinUrl)) return true;
        if (normalizeText(form.studentNumber) !== normalizeText(initialForm.studentNumber)) return true;
        if (normalizeText(form.major) !== normalizeText(initialForm.major)) return true;
        if (normalizeText(form.campus) !== normalizeText(initialForm.campus)) return true;

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
        const trimmedNickname = normalizeText(form.nickname);
        const trimmedLinkedinUrl = normalizeText(form.linkedinUrl);
        const trimmedStudentNumber = normalizeText(form.studentNumber);
        const trimmedMajor = normalizeText(form.major);
        const trimmedCampus = normalizeText(form.campus);

        if (!trimmedName) {
            alert(t("mypage.needName"));
            return;
        }

        if (trimmedLinkedinUrl && !/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/.+/i.test(trimmedLinkedinUrl)) {
            alert(t("mypage.profileEdit.invalidLinkedinUrl"));
            return;
        }

        try {
            setSaving(true);

            let updatedMe: UserMe | null = null;
            updatedMe = await updateMyProfile({
                name: trimmedName,
                nickname: normalizeOptionalText(trimmedNickname),
                linkedinUrl: normalizeOptionalText(trimmedLinkedinUrl),
                studentNumber: normalizeOptionalText(trimmedStudentNumber),
                major: normalizeOptionalText(trimmedMajor),
                campus: normalizeOptionalText(trimmedCampus),
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
                name: trimmedName,
                email: form.email,
                nickname: trimmedNickname,
                linkedinUrl: trimmedLinkedinUrl,
                studentNumber: trimmedStudentNumber,
                major: trimmedMajor,
                campus: trimmedCampus,
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
                    ? `${t("mypage.profileEdit.updateFailed")} (status=${String(status)})\n${String(bodyText ?? "")}`
                    : `${t("mypage.profileEdit.updateFailed")}\n${String(e ?? "")}`
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
            setEmailError(t("mypage.profileEdit.emailRequired"));
            return;
        }

        if (nextEmail === currentEmail) {
            setEmailError(t("mypage.profileEdit.sameEmail"));
            return;
        }
        
        const email = emailForm.email.trim();

        if (!email) {
            setEmailError(t("mypage.profileEdit.emailRequired"));
            return;
        }

        setEmailSending(true);
        setEmailError(null);
        setEmailSentMessage(null);

        try {
            const lang = i18n.resolvedLanguage ?? i18n.language ?? "ko";
            const res = await sendMyEmailCode(email, lang);

            if (res.status === "EXISTING_ACCOUNT_FOUND") {
                alert(t("mypage.profileEdit.existingAccount"));
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            setEmailSentMessage(t("mypage.profileEdit.codeSent", { email: res.maskedEmail }));
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.code === "AUTH_EXISTING_ACCOUNT") {
                    alert(t("mypage.profileEdit.existingAccount"));
                    localStorage.removeItem("accessToken");
                    navigate("/login", { replace: true });
                    return;
                }
                setEmailError(t("mypage.profileEdit.sendCodeFailed"));
                return;
            }

            setEmailError(t("mypage.profileEdit.emailSendError"));
        } finally {
            setEmailSending(false);
        }
    }
    
    async function handleVerifyEmailCode() {
        const email = emailForm.email.trim();
        const code = emailForm.code.trim();
        const beforeEmail = (me?.email ?? "").trim().toLowerCase();

        if (!email) {
            setEmailError(t("mypage.profileEdit.emailRequired"));
            return;
        }

        if (!code) {
            setEmailError(t("mypage.profileEdit.codeRequired"));
            return;
        }

        if (email.toLowerCase() === beforeEmail) {
            setEmailError(t("mypage.profileEdit.sameEmail"));
            return;
        }

        try {
            setEmailVerifying(true);
            setEmailError(null);

            const res = await verifyMyEmailCode(email, code);

            if (!res.verified) {
                setEmailError(t("mypage.profileEdit.emailVerifyFailed"));
                return;
            }

            const nextMe = await getUserMe();
            const afterEmail = (nextMe.email ?? "").trim().toLowerCase();

            if (afterEmail === beforeEmail) {
                setEmailError(t("mypage.profileEdit.sameEmailNotChanged"));
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
            alert(t("mypage.profileEdit.emailChangeComplete"));
        } catch (e) {
            if (e instanceof ApiError) {
                setEmailError(t("mypage.profileEdit.codeInvalidOrExpired"));
                return;
            }

            setEmailError(t("mypage.profileEdit.emailVerifyError"));
        } finally {
            setEmailVerifying(false);
        }
    }
    
    if (!me || !initialForm) return <div />;

    return (
        <>
            <div className="mypage user-modify">
                <header className="mypage-header">
                    <div className="mypage-email">{t("mypage.editProfile")}</div>
                    <button type="button" className="mypage-close" aria-label={t("common.close")} onClick={() => navigate(-1)}>
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
                            <div className="profile-edit-label">{t("mypage.profileEdit.nickname")}</div>
                            <input className="profile-edit-input" value={form.nickname} onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))} disabled={saving} placeholder={t("mypage.profileEdit.nicknamePlaceholder")} />
                        </div>

                        <div className="profile-edit-field">
                            <div className="profile-edit-label">{t("mypage.profileEdit.linkedin")}</div>
                            <input className="profile-edit-input" value={form.linkedinUrl} onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))} disabled={saving} placeholder="https://www.linkedin.com/in/..." />
                        </div>

                        <div className="profile-edit-field">
                            <div className="profile-edit-label">{t("mypage.profileEdit.email")}</div>
                            <input className="profile-edit-input is-readonly" value={displayEmail} readOnly 
                                onClick={() => {
                                    if (saving) return;
                                    setEmailConfirmOpen(true);
                                }} 
                            />
                        </div>

                        {isStudentUser && (
                            <>
                                <div className="profile-edit-field">
                                    <div className="profile-edit-label">{t("mypage.profileEdit.studentId")}</div>
                                    <input className="profile-edit-input" value={form.studentNumber} onChange={(e) => setForm((prev) => ({ ...prev, studentNumber: e.target.value }))} disabled={saving} placeholder={t("mypage.profileEdit.studentIdPlaceholder")} />
                                </div>

                                <div className="profile-edit-field">
                                    <div className="profile-edit-label">{t("mypage.profileEdit.major")}</div>
                                    <input className="profile-edit-input" value={form.major} onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))} disabled={saving} placeholder={t("mypage.profileEdit.majorPlaceholder")} />
                                </div>

                                <div className="profile-edit-field">
                                    <div className="profile-edit-label">{t("mypage.profileEdit.campus")}</div>
                                    <input className="profile-edit-input" value={form.campus} onChange={(e) => setForm((prev) => ({ ...prev, campus: e.target.value }))} disabled={saving} placeholder={t("mypage.profileEdit.campusPlaceholder")} />
                                </div>
                            </>
                        )}
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
                            <div className="client-verify-popup-title">{t("mypage.profileEdit.emailChangeTitle")}</div>
                            <button type="button" className="client-verify-popup-close" onClick={() => setEmailConfirmOpen(false)}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="client-verify-popup-desc">
                            {t("mypage.profileEdit.emailChangeConfirmDesc")}
                        </div>

                        <div className="client-verify-popup-footer">
                            <button type="button" className="client-verify-popup-secondary" onClick={() => setEmailConfirmOpen(false)}>
                                {t("mypage.profileEdit.cancel")}
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
                                {t("mypage.profileEdit.continue")}
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
							<div className="email-popup-title">{t("mypage.profileEdit.emailVerifyTitle")}</div>
							<button type="button" className="email-popup-close" aria-label={t("common.close")} onClick={handleCloseEmailVerifyPopup}>
								<img className="icon" src="/icons/x-01.svg" alt="" />
							</button>
						</div>

						<div className="email-popup-desc">
                            {t("mypage.profileEdit.emailVerifyDesc")}
						</div>

						<div className="email-popup-body">
							<input
								className="email-popup-input"
								value={emailForm.email}
								onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))}
								placeholder={t("mypage.profileEdit.emailPlaceholder")}
								autoComplete="email"
							/>

							<div className="email-popup-row">
								<input
									className="email-popup-input"
									value={emailForm.code}
									onChange={(e) => setEmailForm((prev) => ({ ...prev, code: e.target.value }))}
									placeholder={t("mypage.profileEdit.codePlaceholder")}
								/>
								<button type="button" className="email-popup-send-btn" onClick={handleSendEmailCode} disabled={emailSending}>
									{emailSending ? t("mypage.profileEdit.sending") : t("mypage.profileEdit.sendCode")}
								</button>
							</div>

							{emailSentMessage && <div className="email-popup-info">{emailSentMessage}</div>}
							{emailError && <div className="email-popup-error">{emailError}</div>}
						</div>

						<div className="email-popup-footer">
							<button type="button" className="email-popup-secondary" onClick={handleCloseEmailVerifyPopup}>
                                {t("mypage.profileEdit.later")}
							</button>
							<button type="button" className="email-popup-primary" onClick={handleVerifyEmailCode} disabled={emailVerifying || !emailForm.email.trim() || !emailForm.code.trim()}>
								{emailVerifying ? t("mypage.profileEdit.verifying") : t("mypage.profileEdit.verify")}
							</button>
						</div>
					</div>
				</div>
			)}
        </>
    );
}
