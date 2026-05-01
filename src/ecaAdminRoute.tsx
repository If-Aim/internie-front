import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ApiError, getUserMe } from "./api/client";

export default function EcaAdminRoute(): React.ReactElement | null {
    const location = useLocation();
    const [state, setState] = React.useState<"loading" | "unauthenticated" | "forbidden" | "allowed">("loading");

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const me = await getUserMe();

                if (!mounted) return;

                if (Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_ESG_ADMIN")) {
                    setState("allowed");
                    return;
                }

                setState("forbidden");
            } catch (e) {
                if (!mounted) return;

                if (e instanceof ApiError && e.status === 401) {
                    setState("unauthenticated");
                    return;
                }

                console.error(e);
                setState("forbidden");
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (state === "unauthenticated") {
            alert("로그인이 필요한 서비스입니다.");
        }

        if (state === "forbidden") {
            alert("대외활동 관리자만 접근할 수 있는 페이지입니다.");
        }
    }, [state]);

    if (state === "loading") return null;

    if (state === "unauthenticated") {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (state === "forbidden") {
        return <Navigate to="/student" replace />;
    }

    return <Outlet />;
}