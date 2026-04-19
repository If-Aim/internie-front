import React from "react";
import MobileStudentApp from "./mobile/studentApp";
import DesktopStudentApp from "./desktop/studentApp";

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

export default function StudentApp(): React.ReactElement {
	const isDesktop = useIsDesktop();
	return isDesktop ? <DesktopStudentApp /> : <MobileStudentApp />;
}