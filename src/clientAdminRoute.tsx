// 기본 관리자 + client 관리자용 protectedRoute
import React from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { ApiError, checkIsClientAdmin, type ClientType } from "./api/client";

export default function AdminClientRoute() {
    const params = useParams<{ clientType: string }>();
    const [allowed, setAllowed] = React.useState<boolean | null>(null);

    function isClientType(value: string | undefined): value is ClientType {
        return value === "jump" || value === "kakao";
    }

    const clientType = isClientType(params.clientType) ? params.clientType : null;

    React.useEffect(() => {
        if (!clientType) {
            setAllowed(false);
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const ok = await checkIsClientAdmin(clientType);
                if (mounted) setAllowed(ok);
            } catch (e) {
                if (mounted) setAllowed(false);
                if (!(e instanceof ApiError)) console.error(e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [clientType]);

    if (allowed === null) return null;

    if (!allowed) {
        return <Navigate to="/student" replace />;
    }

    return <Outlet />;
}