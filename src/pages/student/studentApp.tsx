import React from "react";
import MobileStudentApp from "./mobile/studentApp";
import DesktopStudentApp from "./desktop/studentApp";

function getInitialIsDesktop(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
}

export default function StudentApp(): React.ReactElement {
    const [isDesktop] = React.useState(getInitialIsDesktop);

    return isDesktop ? <DesktopStudentApp /> : <MobileStudentApp />;
}