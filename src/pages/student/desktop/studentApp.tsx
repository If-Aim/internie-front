import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../../auth/auth.tsx";
import MobileStudentApp from "../mobile/studentApp";
import EcaStudentApp from "./eca/ecaStudentApp.tsx";

export default function StudentApp(): React.ReactElement {
    const isAuthed = !!localStorage.getItem("accessToken");

    if (!isAuthed) {
        return <Login />;
    }

    return (
        <Routes>
            <Route index element={<MobileStudentApp />} />
            <Route path="activities/*" element={<EcaStudentApp />} />
            <Route path="*" element={<MobileStudentApp />} />
        </Routes>
    );
}