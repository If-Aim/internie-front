import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../../../../api/client";
import { acceptExternalActivityStudentInvite } from "../../../../../api/ea";

export default function ExternalActivityInvite(): React.ReactElement {
    const navigate = useNavigate();
    const { token } = useParams<{ token?: string }>();

    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState("초대 정보를 확인하고 있습니다.");

    React.useEffect(() => {
        async function acceptInvite(): Promise<void> {
            const inviteToken = token?.trim();

            if (!inviteToken) {
                setMessage("유효하지 않은 초대 링크입니다.");
                return;
            }

            const accessToken = localStorage.getItem("accessToken");

            if (!accessToken) {
                window.alert("로그인 후 초대 수락이 가능합니다.");
                navigate("/login", {
                    replace: true,
                    state: {
                        from: `/invite/external-activity/${encodeURIComponent(inviteToken)}`,
                    },
                });
                return;
            }

            setLoading(true);
            setMessage("참가 등록 중입니다.");

            try {
                const response = await acceptExternalActivityStudentInvite(inviteToken);

                window.alert(`${response.externalActivityName}의 참가자로 등록되었습니다.`);
                navigate(`/student/activities/${response.externalActivityId}/assignment`, {
                    replace: true,
                });
            } catch (error) {
                console.error(error);

                if (error instanceof ApiError) {
                    if (error.status === 401) {
                        window.alert("로그인 후 해당 링크로 다시 접속해주세요.");
                        navigate("/login", {
                            replace: true,
                            state: {
                                from: `/invite/external-activity/${encodeURIComponent(inviteToken)}`,
                            },
                        });
                        return;
                    }

                    if (error.code === "EXTERNAL_ACTIVITY_STUDENT_INVITE_NOT_FOUND") {
                        setMessage("존재하지 않는 초대 링크입니다.");
                        return;
                    }

                    if (error.code === "EXTERNAL_ACTIVITY_STUDENT_INVITE_DISABLED") {
                        setMessage("비활성화된 초대 링크입니다.");
                        return;
                    }

                    if (error.code === "EXTERNAL_ACTIVITY_PARTICIPANT_ALREADY_EXISTS") {
                        window.alert("이미 참가 등록된 대외활동입니다.");
                        navigate("/student", { replace: true });
                        return;
                    }

                    setMessage(error.message || "초대 수락에 실패했습니다.");
                    return;
                }

                setMessage("초대 수락 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }

        void acceptInvite();
    }, [token, navigate]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
            <div style={{ width: "360px", padding: "32px 24px", border: "1px solid #ddd", borderRadius: "14px", textAlign: "center", boxSizing: "border-box" }}>
                <img src="/internie_mascot_normal.png" alt="" style={{ width: "72px", height: "72px", objectFit: "contain", marginBottom: "18px" }} />
                <h1 style={{ margin: "0 0 12px", color: "#000", fontSize: "20px", fontWeight: 700 }}>
                    대외활동 초대
                </h1>
                <p style={{ margin: 0, color: "#808080", fontSize: "14px", fontWeight: 500, lineHeight: "20px" }}>
                    {message}
                </p>
                {loading ? (
                    <p style={{ margin: "16px 0 0", color: "#A0A0A0", fontSize: "12px", fontWeight: 500 }}>
                        잠시만 기다려주세요.
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigate("/student", { replace: true })}
                        style={{ height: "40px", padding: "0 18px", marginTop: "24px", border: "1px solid #ddd", borderRadius: "10px", background: "#fff", color: "#808080", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                    >
                        홈으로 이동
                    </button>
                )}
            </div>
        </div>
    );
}