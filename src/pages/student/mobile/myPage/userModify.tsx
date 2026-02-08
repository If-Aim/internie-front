// src/pages/student/mobile/myPage/userModify.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { getUserMe, updateMyName, updateMyProfileImage, type UserMe } from "../../../../api/client";
import "./myPage.css";

export default function EditProfilePage(): React.ReactElement {
    const navigate = useNavigate();
    const fileRef = React.useRef<HTMLInputElement | null>(null);

    const [me, setMe] = React.useState<UserMe | null>(null);
    const [name, setName] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    const isDefaultProfile =
        !me?.profileImage ||
        me.profileImage.includes("kakao") ||
        me.profileImage.includes("default");

    const avatarSrc: string = isDefaultProfile
        ? "/internie_mascot_normal.png"
        : me.profileImage!;

    const displayEmail = (me as any)?.email ?? "이메일";
    const birth = (me as any)?.birth ?? "생년월일";
    const schoolMajor =
        me?.status === "APPROVED"
            ? "학교명" // 추후 서버 값으로 교체
            : "재학생 인증 필요";

    React.useEffect(() => {
        (async () => {
            const data = await getUserMe();
            setMe(data);
            setName(data.name);
        })();
    }, []);

    async function onSave() {
        if (!name.trim()) {
            alert("이름을 입력해주세요.");
            return;
        }

        try {
            setSaving(true);
            const updated = await updateMyName(name.trim());
            setMe(updated);
        } catch (e: any) {
            alert("이름 수정에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }
    async function onPickProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = "";

        if (!file.type.startsWith("image/")) {
            alert("이미지 파일만 업로드할 수 있습니다.");
            return;
        }

        try {
            setSaving(true);
            const updated = await updateMyProfileImage(file);
            setMe(updated);
        } catch (err) {
            alert("프로필 이미지 업로드에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    }
    if (!me) return <div />;

    return (
        <div className="edit-profile">
            <header className="mypage-header">
                <button type="button" className="mypage-previous" aria-label="previous" onClick={() => navigate(-1)}>
                    <img src="/chevron-left.svg" alt="previous" />
                </button>
                <div className="mypage-email">프로필 수정하기</div>
            </header>

            <div className="profile-edit">
                <section className="profile-edit-top">
                    <div className="profile-edit-avatar-wrap">
                        <img className="profile-edit-avatar" src={avatarSrc} alt="" />

                        <button type="button" className="profile-edit-avatar-btn" onClick={() => fileRef.current?.click()} disabled={saving} >
                            편집
                        </button>

                        <input ref={fileRef} type="file" accept="image/*" onChange={onPickProfileImage} style={{ display: "none" }} />
                    </div>
                </section>

                <section className="profile-edit-form">
                    <div className="profile-edit-field">
                        <div className="profile-edit-label">이름</div>
                        <input className="profile-edit-input" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="profile-edit-field">
                        <div className="profile-edit-label">E-mail</div>
                        <input className="profile-edit-input is-readonly" value={displayEmail} disabled />
                    </div>

                    <div className="profile-edit-field">
                        <div className="profile-edit-label">생년월일</div>
                        <input className="profile-edit-input is-readonly" value={birth} disabled />
                    </div>

                    <div className="profile-edit-field">
                        <div className="profile-edit-label">학교/전공</div>
                        <input className="profile-edit-input is-readonly" value={schoolMajor} disabled />
                    </div>
                </section>

                <div className="profile-edit-bottom">
                    <button className="profile-edit-save" onClick={onSave} disabled={saving}>
                        저장하기
                    </button>
                </div>
            </div>
        </div>
    );
}
