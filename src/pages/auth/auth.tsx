import React from "react";
import MobileLogin from "./mobile/login";
import DesktopLogin from "./desktop/login";

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

export default function Auth(): React.ReactElement {
    const isDesktop = useIsDesktop();
    return isDesktop ? <DesktopLogin /> : <MobileLogin />;
}