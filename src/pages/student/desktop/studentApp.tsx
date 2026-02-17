// src/pages/student/desktop/studentApp.tsx
import React from "react";
import Login from "../../login/login";
import MobileStudentApp from "../mobile/studentApp";

export default function StudentApp(): React.ReactElement {
	const isAuthed = !!localStorage.getItem("accessToken");

	if (!isAuthed) {
		return <Login />;
	}

	return <MobileStudentApp />;
}