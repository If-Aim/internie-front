import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../../auth/auth.tsx";
import MobileStudentApp from "../mobile/studentApp";
import DesktopEcaStudentApp from "./eca/ecaStudentApp.tsx";
import MobileEcaStudentApp from "../mobile/eca/ecaStudentApp.tsx";

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = React.useState(() => window.matchMedia("(max-width: 1023px)").matches);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 1023px)");

        function handleChange(e: MediaQueryListEvent): void {
            setIsMobile(e.matches);
        }

        setIsMobile(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isMobile;
}

export default function StudentApp(): React.ReactElement {
    const isAuthed = !!localStorage.getItem("accessToken");
    const isMobile = useIsMobile();

    if (!isAuthed) {
        return <Login />;
    }

    return (
        <Routes>
            <Route path="activities/*" element={isMobile ? <MobileEcaStudentApp /> : <DesktopEcaStudentApp />} />
            <Route path="*" element={<MobileStudentApp />} />
        </Routes>
    );
}