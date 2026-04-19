import React from "react";
import MobileResetPassword from "./mobile/resetPassword";
import DesktopResetPassword from "./desktop/resetPassword";

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const mql = window.matchMedia("(min-width: 1024px)");
        const onChange = () => setIsDesktop(mql.matches);

        onChange();

        if (mql.addEventListener) {
            mql.addEventListener("change", onChange);
        } else {
            mql.addListener(onChange);
        }

        return () => {
            if (mql.removeEventListener) {
                mql.removeEventListener("change", onChange);
            } else {
                mql.removeListener(onChange);
            }
        };
    }, []);

    return isDesktop;
}

export default function ResetPassword(): React.ReactElement {
    const isDesktop = useIsDesktop();
    return isDesktop ? <DesktopResetPassword /> : <MobileResetPassword />;
}