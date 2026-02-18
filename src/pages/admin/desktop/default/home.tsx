// src/pages/admin/desktop/default/home.tsx
// 관리자 페이지 메인 (PC)
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ApiError, getUserMe, type UserMe } from "../../../../api/client";
import "./admin.css";

function getDisplayAdminName(me: UserMe | null): string {
	if (!me) return "관리자";
	const nick = (me.nickname ?? "").trim();
	const name = (me.name ?? "").trim();
	return nick || name || "관리자";
}

export default function AdminHome(): React.ReactElement {
	const [me, setMe] = React.useState<UserMe | null>(null);

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
		<div className="admin-page">
			<header className="admin-topbar">
				<div className="admin-topbar-left">
					<a href="https://www.internie.com/student" rel="noopener noreferrer"><img className="admin-logo" src="/internie_Logo_thin.png" alt="internie" /></a>
				</div>

				<nav className="admin-topbar-tabs" aria-label="admin tabs">
					<NavLink
						to="/admin/users"
						className={({ isActive }) => (isActive ? "admin-tab admin-tab--active" : "admin-tab")}
					>
						<span>학생증</span>
					</NavLink>
					<NavLink
						to="/admin/certificates"
						className={({ isActive }) => (isActive ? "admin-tab admin-tab--active" : "admin-tab")}
					>
						<span>수료증</span>
					</NavLink>
					<NavLink
						to="/admin/reports"
						className={({ isActive }) => (isActive ? "admin-tab admin-tab--active" : "admin-tab")}
					>
						<span>기록 열람</span>
					</NavLink>
				</nav>

				<div className="admin-topbar-right">
					<span className="admin-name">관리자 {adminName}님</span>

					{me?.profileImage ? (
						<img className="admin-avatar-img" src={me.profileImage} alt="admin avatar" />
					) : (
						<div className="admin-avatar" aria-label="admin avatar" />
					)}
				</div>
			</header>

			<div className="admin-body">
				<div className="admin-surface">
					<Outlet />
				</div>
			</div>
		</div>
	);
}