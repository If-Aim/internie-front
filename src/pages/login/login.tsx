// src/pages/login/login.tsx
import React from "react";
import MobileLogin from "./mobile/login";
import DesktopLogin from "./desktop/login";

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

export default function Login(): React.ReactElement {
	const isDesktop = useIsDesktop();
	return isDesktop ? <DesktopLogin /> : <MobileLogin />;
}
