// src/pages/admin/adminApp.tsx
// 관리자 페이지 PC/모바일 판별 라우트
import React from "react";
import MobileAdminApp from "./mobile/adminApp";
import DesktopAdminApp from "./desktop/default/adminApp";

function useIsDesktop() {
	const [isDesktop, setIsDesktop] = React.useState(false);

	React.useEffect(() => {
		const mql = window.matchMedia("(min-width: 1024px)");
		const onChange = () => setIsDesktop(mql.matches);

		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isDesktop;
}

export default function AdminApp(): React.ReactElement {
	const isDesktop = useIsDesktop();
	return isDesktop ? <DesktopAdminApp /> : <MobileAdminApp />;
}