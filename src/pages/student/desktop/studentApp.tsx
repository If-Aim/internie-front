import React from "react";
import Login from "../../auth/auth.tsx";
import MobileStudentApp from "../mobile/studentApp";

export default function StudentApp(): React.ReactElement {
	const isAuthed = !!localStorage.getItem("accessToken");

	if (!isAuthed) {
		return <Login />;
	}

	return <MobileStudentApp />;
}