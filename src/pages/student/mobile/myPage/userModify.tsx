// src/pages/student/mobile/myPage/userModify.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getUserMe, updateMyProfile, type UserMe, updateMyProfileImage } from "../../../../api/client";
import "./myPage.css";
import "./userModify.css";

type ProfileForm = {
    name: string;
    // nickname: string;        // TODO: 추후 활성화
    // email: string;           // TODO: 백엔드 필드 생기면
    // birth: string;           // TODO
};

function normalizeText(v: string) {
    return v.trim();
}

export default function EditProfilePage(): React.ReactElement {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const [me, setMe] = React.useState<UserMe | null>(null);

    const [form, setForm] = React.useState<ProfileForm>({ name: "" });
    const [initialForm, setInitialForm] = React.useState<ProfileForm | null>(null);

    const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const [saving, setSaving] = React.useState(false);
    const [/*avatarVersion*/, setAvatarVersion] = React.useState<number>(0);

    React.useEffect(() => {
    }, [selectedImageFile]);

    React.useEffect(() => {
    }, [previewUrl]);
    
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await getUserMe();
                if (!mounted) return;

                setMe(data);

                const loaded: ProfileForm = {
                name: data.name ?? "",
                // nickname: data.nickname ?? "",
                // email: (data as any).email ?? "",
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
    
    const avatarSrc = previewUrl ?? serverAvatarSrc;

    // 임시
    const displayEmail = (me as any)?.email ?? "example@your.email";
    const birth = (me as any)?.birth ?? t("mypage.birth");
    const schoolMajor = me?.status === "APPROVED" ? (me.school?.name ?? t("mypage.noSchool")) : t("mypage.needStudentVerification");

    // 변경 여부
    const isDirty = React.useMemo(() => {
        if (!initialForm) return false;

        // 지금은 name만 비교
        if (normalizeText(form.name) !== normalizeText(initialForm.name)) return true;

        // TODO: 추후 필드 활성화 시 아래 주석 해제
        // if (normalizeText(form.nickname) !== normalizeText(initialForm.nickname)) return true;
        // if (normalizeText(form.email) !== normalizeText(initialForm.email)) return true;
        // if (normalizeText(form.birth) !== normalizeText(initialForm.birth)) return true;

        if (selectedImageFile) return true;

        return false;
    }, [form, initialForm, selectedImageFile]);

    async function onPickProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = "";

        if (!file.type.startsWith("image/")) {
            alert(t("error.imageRequired"));
            return;
        }

        setSelectedImageFile(file);
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

    function handleServicePreparing() {
        alert("서비스 준비중입니다.");
    }
    
    if (!me || !initialForm) return <div />;

    return (
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

                    <button type="button" className="profile-edit-avatar-btn" onClick={()=> fileRef.current?.click()} disabled={saving} >
                        {t("mypage.edit")}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onPickProfileImage} style={{ display: "none" }} /> 
                </section>

                <section className="profile-edit-form">
                    <div className="profile-edit-field">
                        <div className="profile-edit-label">{t("mypage.name")}</div>
                        <input className="profile-edit-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={saving} />
                    </div>

                    <div className="profile-edit-field">
                        <div className="profile-edit-label">E-mail</div>
                        <input className="profile-edit-input is-readonly" value={displayEmail} readOnly onClick={handleServicePreparing} />
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
    );
}
