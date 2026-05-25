import React from "react";
import { Navigate, Outlet, useOutletContext, useParams } from "react-router-dom";
import type { EcaStudentOutletContext } from "./ecaStudentLayout";

export default function EcaStudentActivityGuard(): React.ReactElement | null {
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();
    const context = useOutletContext<EcaStudentOutletContext>();
    const { activities, activitiesLoading } = context;

    const [blocked, setBlocked] = React.useState(false);
    const alertShownRef = React.useRef(false);

    const activityId = externalActivityId ? Number(externalActivityId) : NaN;
    const isValidActivityId = Number.isFinite(activityId);
    const hasAccess = isValidActivityId && activities.some((activity) => (
        activity.externalActivityId === activityId
    ));

    React.useEffect(() => {
        if (activitiesLoading) return;

        if (!isValidActivityId || !hasAccess) {
            if (!alertShownRef.current) {
                alertShownRef.current = true;
                window.alert("접근할 수 없습니다.");
            }

            setBlocked(true);
            return;
        }

        setBlocked(false);
        alertShownRef.current = false;
    }, [activitiesLoading, isValidActivityId, hasAccess]);

    if (activitiesLoading) {
        return null;
    }

    if (blocked || !isValidActivityId || !hasAccess) {
        return <Navigate to="/student" replace />;
    }

    return <Outlet context={context} />;
}