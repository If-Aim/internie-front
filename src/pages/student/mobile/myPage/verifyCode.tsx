// src/pages/student/mobile/myPage/verifyCode.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { type UserMe, ApiError, verifyJumpUser, getUserMe } from "../../../../api/client";
import "./myPage.css";
import "./userModify.css";

export default function VerifyCodePage() {
    const navigate = useNavigate();
    const [me, setMe] = React.useState<UserMe | null>(null);

    const [code, setCode] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    
    const isJumpVerified = me?.role === "ROLE_JUMP_STUDENT";

    async function submit() {
        const trimmed = code.trim();
        if (!trimmed) {
            setError("인증코드를 입력해주세요.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await verifyJumpUser(trimmed);

            const refreshed = await getUserMe();
            setMe(refreshed);

            if (refreshed.role === "ROLE_JUMP_STUDENT") {
                setCode("JUMP 인증 완료");
            }
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
    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const user = await getUserMe();
                if (!mounted) return;
                setMe(user);
                if (user.role === "ROLE_JUMP_STUDENT") {
                    setCode("JUMP 인증 완료");
                }
            } catch {
                
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="mypage user-verify-code">
            <header className="mypage-header">
                <button type="button" className="mypage-previous" aria-label="previous" onClick={() => navigate(-1)} >
                    <img src="/chevron-left.svg" alt="previous" />
                </button>
                <div className="mypage-email"></div>
            </header>

            <div className="profile-edit-field">
                <div className="profile-edit-label">인증코드를 입력하세요</div>
                <input
                    className={`profile-edit-input ${isJumpVerified ? "is-readonly" : ""}`}
                    value={isJumpVerified ? "JUMP 인증 완료" : code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={isJumpVerified ? undefined : "인증코드"}
                    readOnly={isJumpVerified}
                    disabled={submitting}
                />
            </div>
            {error && <div className="ob-error">{error}</div>}

            <button className="submit-code" onClick={submit} disabled={submitting || isJumpVerified} >
                완료
            </button>
        </div>
    );
}