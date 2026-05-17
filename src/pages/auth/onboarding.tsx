import React from "react";
import MobileOnboarding from "./mobile/onboarding"; 
import DesktopOnboarding from "./desktop/onboarding";

function useIsDesktop(): boolean {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const mql = window.matchMedia("(min-width: 1024px)");

        const onChange = (): void => {
            setIsDesktop(mql.matches);
        };

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

export default function Onboarding(): React.ReactElement {
    const isDesktop = useIsDesktop();
    return isDesktop ? <DesktopOnboarding /> : <MobileOnboarding />;
}