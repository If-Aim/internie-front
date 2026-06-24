import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { addPendingGlobalModal } from "../../../../../globalModalStorage";

const ORGANIZATION_INVITE_T = "ecaAdmin.organizationInvite";

export default function OrganizationInvitePage(): React.ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { token } = useParams<{ token?: string }>();
    const alertShownRef = React.useRef(false);

    React.useEffect(() => {
        if (!token) return;

        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) {
            if (!alertShownRef.current) {
                alertShownRef.current = true;
                window.alert(t(`${ORGANIZATION_INVITE_T}.loginRequired`));
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
    }, [location.pathname, navigate, token, t]);

    if (!token) {
        return <Navigate to="/student" replace />;
    }

    return null;
}