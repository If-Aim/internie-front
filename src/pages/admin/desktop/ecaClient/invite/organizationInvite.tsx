import React from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { addPendingGlobalModal } from "../../../../../globalModalStorage";

export default function OrganizationInvitePage(): React.ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useParams<{ token?: string }>();
    const alertShownRef = React.useRef(false);

    React.useEffect(() => {
        if (!token) return;

        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
            if (!alertShownRef.current) {
                alertShownRef.current = true;
                window.alert("기관 관리자 초대를 수락하려면 먼저 로그인해야 합니다.");
            }

            sessionStorage.setItem("postLoginRedirect", location.pathname);
            navigate("/login", { replace: true });
            return;
        }

        addPendingGlobalModal({
            id: `ORGANIZATION_INVITE:${token}`,
            type: "ORGANIZATION_INVITE",
            token,
        });

        navigate("/student", { replace: true });
    }, [location.pathname, navigate, token]);

    if (!token) {
        return <Navigate to="/student" replace />;
    }

    return null;
}