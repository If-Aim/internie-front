// src/pages/admin/desktop/client/home.tsx
// 점프 관리자 페이지 메인 (PC)
import React from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import "./clientAdmin.css";

function getDisplayAdminName(me: UserMe | null): string {
	if (!me) return "관리자";
	const nick = (me.nickname ?? "").trim();
	const name = (me.name ?? "").trim();
	return nick || name || "관리자";
}

function isDefaultProfileImage(url?: string | null): boolean {
    if (!url) return true;

    const lowered = url.toLowerCase();
    if (lowered.includes("default")) return true;

    return false;
}

export default function JumpAdminHome(): React.ReactElement {
	const [me, setMe] = React.useState<UserMe | null>(null);
	const { pathname } = useLocation();
	const { clientType } = useParams<{ clientType: string }>();
	const basePath = clientType ? `/admin/${clientType}` : "/admin/jump";
	const isReportsPage = pathname.startsWith(`${basePath}/reports`);

	React.useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				const data = await getUserMe();
				if (!mounted) return;
				setMe(data);
			} catch (e) {
				if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
					if (mounted) setMe(null);
					return;
				}
				console.error(e);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	const adminName = getDisplayAdminName(me);
	const adminProfileImg = isDefaultProfileImage(me?.profileImage)
		? "/internie_mascot_normal.png"
		: (me?.profileImage ?? "/internie_mascot_normal.png");

	return (
		<div className={isReportsPage ? "client-admin-page client-admin-page--reports" : "client-admin-page"}>
			<div className={isReportsPage ? "client-report-scroll" : undefined}>
				<div className={isReportsPage ? "client-report-scroll-inner" : undefined}>
					<header className="client-admin-topbar">
						<div className="client-admin-topbar-left">
							<a href="https://www.internie.com/student" rel="noopener noreferrer"><img className="client-admin-logo" src="/logos/internie_Logo_thin.png" alt="internie" /></a>
						</div>

						<nav className="client-admin-topbar-tabs" aria-label="admin tabs">
							<NavLink
								to={`${basePath}/dashboard`}
								className={({ isActive }) => (isActive ? "client-admin-tab client-admin-tab--active" : "client-admin-tab")}
							>
								<span>대시보드</span>
							</NavLink>
							<NavLink
								to={`${basePath}/analysis`}
								className={({ isActive }) => (isActive ? "client-admin-tab client-admin-tab--active" : "client-admin-tab")}
							>
								<span>참가자 관리</span>
							</NavLink>
							<NavLink
								to={`${basePath}/analysis`}// 추후 변경
								className="client-admin-tab client-admin-tab--disabled"
								onClick={(e) => {
								e.preventDefault(); 
								alert("서비스 준비중입니다.");
								}}
							>
								<span>설정</span>
							</NavLink>
						</nav>

						<div className="client-admin-topbar-right">
							<span className="client-admin-name">관리자 {adminName}님</span>

							<img className="client-admin-avatar-img" src={adminProfileImg} alt="admin avatar" />
						</div>
					</header>

					<div className="client-admin-body">
						<div className="client-admin-surface">
							<Outlet />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}