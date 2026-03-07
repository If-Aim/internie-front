// src/pages/admin/desktop/jump/home.tsx
// 점프 관리자 페이지 메인 (PC)
import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import "./jumpAdmin.css";

function getDisplayAdminName(me: UserMe | null): string {
	if (!me) return "관리자";
	const nick = (me.nickname ?? "").trim();
	const name = (me.name ?? "").trim();
	return nick || name || "관리자";
}

export default function JumpAdminHome(): React.ReactElement {
	const [me, setMe] = React.useState<UserMe | null>(null);
	const { pathname } = useLocation();
	const isReportsPage = pathname.startsWith("/jump-admin/reports");

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

	return (
		<div className={isReportsPage ? "jump-admin-page jump-admin-page--reports" : "jump-admin-page"}>
			<div className={isReportsPage ? "jump-report-scroll" : undefined}>
				<div className={isReportsPage ? "jump-report-scroll-inner" : undefined}>
					<header className="jump-admin-topbar">
						<div className="jump-admin-topbar-left">
							<a href="https://www.internie.com/student" rel="noopener noreferrer"><img className="jump-admin-logo" src="/logos/internie_Logo_thin.png" alt="internie" /></a>
						</div>

						<nav className="jump-admin-topbar-tabs" aria-label="admin tabs">
							<NavLink
								to="/jump-admin/dashboard"
								className={({ isActive }) => (isActive ? "jump-admin-tab jump-admin-tab--active" : "jump-admin-tab")}
							>
								<span>대시보드</span>
							</NavLink>
							<NavLink
								to="/jump-admin/analysis"
								className={({ isActive }) => (isActive ? "jump-admin-tab jump-admin-tab--active" : "jump-admin-tab")}
							>
								<span>참가자 관리</span>
							</NavLink>
							<NavLink
								to="/jump-admin/analysis" // 추후 변경
								className="jump-admin-tab jump-admin-tab--disabled"
								onClick={(e) => {
								e.preventDefault(); 
								alert("서비스 준비중입니다.");
								}}
							>
								<span>설정</span>
							</NavLink>
						</nav>

						<div className="jump-admin-topbar-right">
							<span className="jump-admin-name">관리자 {adminName}님</span>

							{me?.profileImage ? (
								<img className="jump-admin-avatar-img" src={me.profileImage} alt="admin avatar" />
							) : (
								<div className="jump-admin-avatar" aria-label="admin avatar" />
							)}
						</div>
					</header>

					<div className="jump-admin-body">
						<div className="jump-admin-surface">
							<Outlet />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}