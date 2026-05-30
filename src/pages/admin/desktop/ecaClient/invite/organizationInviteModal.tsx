import React from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../../../api/client";
import { acceptOrganizationInvite, getOrganizationInvitePreview } from "../../../../../api/organizationClient";
import "./organizationInvite.css";

type OrganizationInviteModalProps = {
    token: string;
    onClose: () => void;
};

type InviteModalState = "loading" | "idle" | "requesting" | "success" | "error";

export default function OrganizationInviteModal({
    token,
    onClose,
}: OrganizationInviteModalProps): React.ReactElement {
    const navigate = useNavigate();

    const [state, setState] = React.useState<InviteModalState>("loading");
    const [organizationName, setOrganizationName] = React.useState("");
    const [message, setMessage] = React.useState("");

    React.useEffect(() => {
        let mounted = true;

        async function fetchPreview(): Promise<void> {
            setState("loading");
            setMessage("");

            try {
                const response = await getOrganizationInvitePreview(token);

                if (!mounted) return;

                setOrganizationName(response.organizationName);
                setState("idle");
            } catch (error) {
                console.error(error);

                if (!mounted) return;

                setState("error");
                setMessage(getInviteErrorMessage(error, "초대 정보를 불러오지 못했습니다."));
            }
        }

        void fetchPreview();

        return () => {
            mounted = false;
        };
    }, [token]);

    async function handleAccept(): Promise<void> {
        if (state === "requesting") return;

        setState("requesting");

        try {
            await acceptOrganizationInvite(token);

            setState("success");
            setMessage("초대를 수락했습니다");
        } catch (error) {
            console.error(error);

            setState("error");
            setMessage(getInviteErrorMessage(error, "초대 수락에 실패했습니다."));
        }
    }

    function handleMoveToHome(): void {
        onClose();
        navigate("/student", { replace: true });
    }

    return (
        <div className="organization-invite-modal-backdrop">
            <section className="organization-invite-modal" role="dialog" aria-modal="true">
                <button type="button" className="organization-invite-modal-close" onClick={onClose} aria-label="닫기">
                    <img src="/icons/x-01.svg" className="organization-invite-close-icon" alt="" />
                </button>
                {state === "loading" ? (
                    <>
                        <InviteMailIcon />

                        <strong className="organization-invite-message">
                            초대 정보를 확인하고 있습니다
                        </strong>
                    </>
                ) : state === "success" ? (
                    <>
                        <InviteSuccessIcon />

                        <strong className="organization-invite-success-message">
                            초대를 수락했습니다
                            <br />
                            관리자 승인을 기다려주세요
                        </strong>

                        <button type="button" className="organization-invite-home-button" onClick={handleMoveToHome}>
                            홈 화면으로
                        </button>
                    </>
                )  : state === "error" ? (
                    <>
                        <InviteMailIcon />

                        <strong className="organization-invite-message">
                            {message}
                        </strong>

                        <div className="organization-invite-button-row">
                            <button type="button" className="organization-invite-secondary-button" onClick={onClose}>
                                닫기
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <InviteMailIcon />

                        <strong className="organization-invite-message">
                            {organizationName ? `${organizationName} 관리자로 초대되었습니다` : "기관 관리자로 초대되었습니다"}
                        </strong>

                        <div className="organization-invite-button-row">
                            <button type="button" className="organization-invite-primary-button" onClick={() => void handleAccept()} disabled={state === "requesting"}>
                                {state === "requesting" ? "요청 중" : "수락하기"}
                            </button>
                            <button type="button" className="organization-invite-secondary-button" onClick={onClose} disabled={state === "requesting"}>
                                거절하기
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function InviteMailIcon(): React.ReactElement {
    return (
        <div className="organization-invite-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M16.6667 66.6663C14.0146 66.6663 11.471 65.6128 9.59568 63.7374C7.72032 61.862 6.66675 59.3185 6.66675 56.6663V23.333C6.66675 20.6808 7.72032 18.1373 9.59568 16.2619C11.471 14.3866 14.0146 13.333 16.6667 13.333H63.3334C65.9856 13.333 68.5291 14.3866 70.4045 16.2619C72.2799 18.1373 73.3334 20.6808 73.3334 23.333V56.6663C73.3334 59.3185 72.2799 61.862 70.4045 63.7374C68.5291 65.6128 65.9856 66.6663 63.3334 66.6663H16.6667ZM25.4167 27.3997C25.0772 27.1097 24.6829 26.891 24.2571 26.7563C23.8314 26.6217 23.383 26.574 22.9385 26.6161C22.4939 26.6581 22.0624 26.789 21.6694 27.001C21.2765 27.213 20.9301 27.5018 20.6509 27.8502C20.3717 28.1987 20.1654 28.5997 20.0441 29.0294C19.9229 29.4591 19.8892 29.9088 19.9451 30.3518C20.001 30.7948 20.1453 31.222 20.3694 31.6082C20.5936 31.9943 20.8931 32.3315 21.2501 32.5997L33.7501 42.603C35.5237 44.023 37.728 44.7968 40.0001 44.7968C42.2721 44.7968 44.4765 44.023 46.2501 42.603L58.7501 32.603C59.092 32.3294 59.3766 31.9912 59.5878 31.6076C59.7989 31.224 59.9324 30.8026 59.9807 30.3674C60.029 29.9322 59.9911 29.4917 59.8692 29.0712C59.7472 28.6506 59.5437 28.2582 59.2701 27.9163C58.9965 27.5745 58.6582 27.2898 58.2747 27.0787C57.8911 26.8675 57.4696 26.734 57.0345 26.6857C56.5993 26.6374 56.1588 26.6753 55.7383 26.7973C55.3177 26.9192 54.9253 27.1228 54.5834 27.3963L42.0834 37.3963C41.4922 37.8697 40.7574 38.1276 40.0001 38.1276C39.2427 38.1276 38.508 37.8697 37.9167 37.3963L25.4167 27.3997Z" fill="#0166FF" />
            </svg>
        </div>
    );
}

function InviteSuccessIcon(): React.ReactElement {
    return (
        <div className="organization-invite-success-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                <path d="M35.3333 46.0003L28.1666 38.8337C27.5555 38.2225 26.7777 37.917 25.8333 37.917C24.8889 37.917 24.1111 38.2225 23.5 38.8337C22.8889 39.4448 22.5833 40.2225 22.5833 41.167C22.5833 42.1114 22.8889 42.8892 23.5 43.5003L33 53.0003C33.6666 53.667 34.4444 54.0003 35.3333 54.0003C36.2222 54.0003 37 53.667 37.6666 53.0003L56.5 34.167C57.1111 33.5559 57.4166 32.7781 57.4166 31.8337C57.4166 30.8892 57.1111 30.1114 56.5 29.5003C55.8889 28.8892 55.1111 28.5837 54.1666 28.5837C53.2222 28.5837 52.4444 28.8892 51.8333 29.5003L35.3333 46.0003ZM40 73.3337C35.3889 73.3337 31.0555 72.4581 27 70.707C22.9444 68.9559 19.4166 66.5814 16.4166 63.5837C13.4166 60.5859 11.0422 57.0581 9.2933 53.0003C7.54441 48.9425 6.66885 44.6092 6.66663 40.0003C6.66441 35.3914 7.53996 31.0581 9.2933 27.0003C11.0466 22.9426 13.4211 19.4148 16.4166 16.417C19.4122 13.4192 22.94 11.0448 27 9.29366C31.06 7.54255 35.3933 6.66699 40 6.66699C44.6066 6.66699 48.94 7.54255 53 9.29366C57.06 11.0448 60.5877 13.4192 63.5833 16.417C66.5789 19.4148 68.9544 22.9426 70.71 27.0003C72.4655 31.0581 73.34 35.3914 73.3333 40.0003C73.3266 44.6092 72.4511 48.9425 70.7066 53.0003C68.9622 57.0581 66.5877 60.5859 63.5833 63.5837C60.5789 66.5814 57.0511 68.957 53 70.7103C48.9488 72.4637 44.6155 73.3381 40 73.3337Z" fill="#0166FF" />
            </svg>
        </div>
    );
}

function getInviteErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiError) {
        if (error.code === "ORGANIZATION_INVITE_NOT_FOUND") {
            return "존재하지 않는 초대 링크입니다.";
        }

        if (error.code === "ORGANIZATION_INVITE_ALREADY_PROCESSED") {
            return "이미 처리된 초대 링크입니다.";
        }

        if (error.code === "ORGANIZATION_INVITE_EXPIRED") {
            return "만료된 초대 링크입니다.";
        }

        if (error.code === "ORGANIZATION_MEMBER_ALREADY_EXISTS") {
            return "이미 해당 기관에 가입되어 있습니다.";
        }

        if (error.code === "ORGANIZATION_INVITE_REQUEST_ALREADY_EXISTS") {
            return "이미 승인 요청을 보낸 초대입니다.";
        }
    }

    return fallbackMessage;
}