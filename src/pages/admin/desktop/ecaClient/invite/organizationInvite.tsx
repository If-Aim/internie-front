import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../../../../api/client";
import { acceptOrganizationInvite } from "../../../../../api/organizationClient";
import "./organizationInvite.css";

type InviteAcceptState = "checking" | "success" | "error";

export default function OrganizationInvitePage(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useParams<{ token?: string }>();

    const [state, setState] = React.useState<InviteAcceptState>("checking");
    const [message, setMessage] = React.useState("초대 정보를 확인하고 있습니다.");
    const [organizationName, setOrganizationName] = React.useState("");

    React.useEffect(() => {
        async function acceptInvite(): Promise<void> {
            if (!token) {
                setState("error");
                setMessage("유효하지 않은 초대 링크입니다.");
                return;
            }

            const accessToken = localStorage.getItem("accessToken");

            if (!accessToken) {
                sessionStorage.setItem("postLoginRedirect", location.pathname);
                navigate("/login", { replace: true });
                return;
            }

            const acceptingKey = `organizationInviteAccepting:${token}`;
            const alreadyAccepting = sessionStorage.getItem(acceptingKey);

            if (alreadyAccepting === "true") {
                return;
            }

            sessionStorage.setItem(acceptingKey, "true");

            try {
                const response = await acceptOrganizationInvite(token);

                setOrganizationName(response.organizationName);
                setState("success");
                setMessage("기관 초대 수락이 완료되었습니다.");
            } catch (error) {
                console.error(error);

                sessionStorage.removeItem(acceptingKey);
                setState("error");

                if (error instanceof ApiError) {
                    if (error.code === "ORGANIZATION_INVITE_NOT_FOUND") {
                        setMessage("존재하지 않는 초대 링크입니다.");
                        return;
                    }

                    if (error.code === "ORGANIZATION_INVITE_ALREADY_PROCESSED") {
                        setMessage("이미 처리된 초대 링크입니다.");
                        return;
                    }

                    if (error.code === "ORGANIZATION_INVITE_EXPIRED") {
                        setMessage("만료된 초대 링크입니다.");
                        return;
                    }

                    if (error.code === "ORGANIZATION_MEMBER_ALREADY_EXISTS") {
                        setMessage("이미 해당 기관에 가입되어 있습니다.");
                        return;
                    }
                }

                setMessage("초대 수락에 실패했습니다.");
            }
        }

        void acceptInvite();
    }, [location.pathname, navigate, token]);

    function moveToSettings(): void {
        navigate("/eca-admin/settings", { replace: true });
    }

    function moveToHome(): void {
        navigate("/student", { replace: true });
    }

    return (
        <div className="organization-invite-page">
            <section className="organization-invite-card">
                {state === "checking" ? (
                    <>
                        <h1 className="organization-invite-title">기관 초대 확인</h1>
                        <p className="organization-invite-desc">{message}</p>
                    </>
                ) : null}

                {state === "success" ? (
                    <>
                        <h1 className="organization-invite-title">기관 가입 완료</h1>
                        <p className="organization-invite-desc">
                            <strong>{organizationName}</strong> 기관에 멤버로 가입되었습니다.
                        </p>

                        <div className="organization-invite-button-row">
                            <button type="button" className="organization-invite-primary-button" onClick={moveToSettings}>
                                관리자 설정으로 이동
                            </button>
                            <button type="button" className="organization-invite-secondary-button" onClick={moveToHome}>
                                홈으로 이동
                            </button>
                        </div>
                    </>
                ) : null}

                {state === "error" ? (
                    <>
                        <h1 className="organization-invite-title">초대 수락 불가</h1>
                        <p className="organization-invite-desc">{message}</p>

                        <div className="organization-invite-button-row">
                            <button type="button" className="organization-invite-secondary-button" onClick={moveToHome}>
                                홈으로 이동
                            </button>
                        </div>
                    </>
                ) : null}
            </section>
        </div>
    );
}