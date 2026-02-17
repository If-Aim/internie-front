// src/pages/admin/mobile/adminApp.tsx
// 모바일 관리자 화면 라우트
import React from "react";
import { Routes, Route } from "react-router-dom";
import Users from "./list/users";

function ComingSoon() {
	return <div style={{ padding: 16 }}>모바일 관리자 화면은 준비 중입니다.</div>;
}

export default function MobileAdminApp(): React.ReactElement {
	return (
		<Routes>
			<Route path="/users" element={<Users />} />
			<Route path="*" element={<ComingSoon />} />
		</Routes>
	);
}