// src/pages/student/mobile/myPage/myPage.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { getUserMe, getEventDaysByMonth, logout, type UserMe } from "../../../../api/client";
import type { EventDay } from "../../../../api/client";

import "./myPage.css";

type Props = { onLogout?: () => void; };
type VerifyStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

// 최근 기록 관련 유틸
function currentYm() {
    const d = new Date();
    return { y: String(d.getFullYear()), m: String(d.getMonth() + 1).padStart(2, "0") };
}
function prevYm(y: string, m: string) {
    const yy = Number(y);
    const mm = Number(m);
    if (mm === 1) return { y: String(yy - 1), m: "12" };
    return { y, m: String(mm - 1).padStart(2, "0") };
}
// function toHHmm(t?: string | null) { 최근 기록 관련 부분
//   if (!t) return "00:00";
//   return t.length >= 5 ? t.slice(0, 5) : t;
// }
function sortKey(ed: EventDay) {
	const dateKey = ed.date.replaceAll("-", "");
	const timeKey = (ed.startTime ?? "00:00").slice(0, 5).replace(":", "");
	const txCount = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
	return { dateKey, timeKey, txCount };
}

// 마이페이지 컴포넌트
export default function MyPage({ onLogout }: Props) {
	const { t, i18n } = useTranslation();

	const location = useLocation();
	const navigate = useNavigate();

	if (location.pathname.endsWith("/mypage/verify")) {
		return <Outlet />;
	}	
  
	const [me, setMe] = React.useState<UserMe | null>(null);
	const [avatarVersion, setAvatarVersion] = React.useState<number>(0);

	const displayName = me?.name ?? "";
	const isVerifiedStudent = me?.status === "APPROVED" && Boolean(me?.verificationImage);
	const status = (me?.status ?? "UNVERIFIED") as VerifyStatus;
	const [showRejectModal, setShowRejectModal] = React.useState(false);

	const verifyUi = (() => {
		switch (status) {
			case "PENDING":
				return {
					label: t("mypage_verifyUi.pending"),
					disabled: true,
					onClick: () => {}, 
				};
			case "REJECTED":
				return {
					label: t("mypage_verifyUi.rejected"),
					disabled: false,
					onClick: () => navigate("/student/verify"), 
				};
			case "APPROVED":
				return {
					label: "프로필 수정하기",
					disabled: false,
					onClick: handleServicePreparing,
				};
			case "UNVERIFIED":
			default:
				return {
					label: t("mypage_verifyUi.unverified"),
					disabled: false,
					onClick: () => navigate("/student/verify"),
				};
		}
	})();

	const mypageSubText = (() => {
		if (status === "APPROVED") {
			return t("mypage_verifyUi.approved");
		}
		return t("mypage_verifyUi.required");
	})();

	const isDefaultProfile =
		!me?.profileImage ||
		me.profileImage.includes("default");
	const rawAvatarSrc = isDefaultProfile
		? "/internie_mascot_normal.png"
		: (me?.profileImage ?? "/internie_mascot_normal.png");

	const avatarSrc =
		rawAvatarSrc.startsWith("http")
			? `${rawAvatarSrc}${rawAvatarSrc.includes("?") ? "&" : "?"}v=${avatarVersion || 0}`
			: rawAvatarSrc;
	const [/*recent*/, setRecent] = React.useState<EventDay[]>([]);
	const [targetCompany, /*setTargetCompany*/] = React.useState<string | null>(null);

	// mypage-menu-item 서비스 준비중 팝업알림 
	const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
	function handleServicePreparing() {
		alert(isKo ? "서비스 준비중입니다.": "Coming Soon");
	}

	// 로그아웃
	async function handleLogout() {
		try {
			await logout();
		} catch (e) {
		} finally {
			localStorage.removeItem("accessToken");
			if (onLogout) onLogout();
			navigate("/login", { replace: true });
		}
	}

	// 학생증 인증 거절 후 다시 인증하기 버튼
	function goReVerify() {
		setShowRejectModal(false);
		navigate("/student/verify");
	}
	// 팝업 닫기 감지
	function closeRejectModal() {
		if (!me) return;
		setShowRejectModal(false);
	}
	React.useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const res = await getUserMe();
				if (!mounted) return;

				const lastStatusKey = `mypage_last_status_${res.userId}`;
				const lastStatus = localStorage.getItem(lastStatusKey);

				if (res.status === "REJECTED" && lastStatus !== "REJECTED") {
					setShowRejectModal(true);
				}

				localStorage.setItem(lastStatusKey, res.status ?? "");
				setMe(res);
				setAvatarVersion(Date.now());
			} catch {}
		})();
		return () => { mounted = false; };
	}, [location.pathname]);

	React.useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const { y, m } = currentYm();
				const prev = prevYm(y, m);

				const [curRes, prevRes] = await Promise.all([
					getEventDaysByMonth(y, m),
					getEventDaysByMonth(prev.y, prev.m),
				]);
				const all = [...(curRes.eventDayList ?? []), ...(prevRes.eventDayList ?? [])];
				const recorded = all.filter(ed => Array.isArray(ed.transcriptions) && ed.transcriptions.length > 0);
				recorded.sort((a, b) => { // 최근 기록 부분
					const A = sortKey(a);  
					const B = sortKey(b);
					if (A.dateKey !== B.dateKey) return A.dateKey < B.dateKey ? 1 : -1;
					if (A.timeKey !== B.timeKey) return A.timeKey < B.timeKey ? 1 : -1;
					return A.txCount < B.txCount ? 1 : -1;
				});
				const top2 = recorded.slice(0, 2);
				if (!mounted) return;
				setRecent(top2);
			} catch (e) {
				if (!mounted) return;
				setRecent([]);
			}
		})();
		return () => { mounted = false; };
	}, []);

	return (
		<div className="mypage">
			<header className="mypage-header">
				<button type="button" className="mypage-previous" aria-label="previous" onClick={() => navigate("/")} >
					<img src="/chevron-left.svg" alt="previous" />
				</button>
				<div className="mypage-email"></div>
			</header>

			<section className="mypage-top">
				<div className="mypage-profileimg-wrap">
					<img className="mypage-profileimg" src={avatarSrc} alt="profileImg" />
					{isVerifiedStudent && (
						<img className="mypage-verify-badge" src="/school-verified-01.svg" alt="재학생 인증 완료" />
					)}
				</div>
				<div className="mypage-greeting">
					{t("mypage.greeting")} <span className="mypage-name">{displayName}</span>{t("mypage.greeting2")}
				</div>
				<div className="mypage-email-sub">{mypageSubText}</div>
			</section>

			<section className="mypage-cards">
				{/* 재학생 인증 */}
				{status !== "APPROVED" && (
					<button
						type="button"
						className={`mypage-card wide 
							${status === "PENDING" ? "is-pending" : ""} 
							${status === "REJECTED" ? "is-rejected" : ""}
						`}
						onClick={handleServicePreparing}
						disabled={verifyUi.disabled}
					>
						<span className="mypage-badge" />
						<span className="mypage-card-title">{verifyUi.label}</span>
					</button>
				)}

				{/* 최근 기록한? 일정 카드 
				<div className="mypage-cardgrid">
					TODO: 카드 클릭 시 조회 화면으로 이동 
					<button type="button" className="mypage-card square" disabled />
					<button type="button" className="mypage-card square" disabled />
				</div>
				<div className="mypage-cardgrid-meta"> //카드 아래 텍스트(사진처럼 카드 아래에 제목/시간)
					<div className="mypage-meta">
						<div className="mypage-meta-title">{recent[0]?.title ?? "새로운 이벤트"}</div>
						<div className="mypage-meta-time">{toHHmm(recent[0]?.startTime ?? null)}</div>
					</div>
					<div className="mypage-meta">
						<div className="mypage-meta-title">{recent[1]?.title ?? "새로운 이벤트"}</div>
						<div className="mypage-meta-time">{toHHmm(recent[1]?.startTime ?? null)}</div>
					</div>
				</div>
				*/}
				<div className="mypage-menu">
					<button type="button" className="mypage-menu-item" onClick={handleServicePreparing}>
						<span className="mypage-menu-title">{t("mypage.targetCompany")}</span>
						<span className="mypage-menu-right">
							<span className="mypage-menu-value">{targetCompany ?? t("mypage.notSet")}</span>
							<img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
						</span>
					</button>
					<button type="button" className="mypage-menu-item" onClick={() => navigate("cert")}> 
						<span className="mypage-menu-title">{t("mypage.certs")}</span>
						<span className="mypage-menu-right">
							<img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
						</span>
					</button>
					<button type="button" className="mypage-menu-item" onClick={() => navigate("modify")}> 
						<span className="mypage-menu-title">{t("mypage.editProfile")}</span>
						<span className="mypage-menu-right">
							<img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
						</span>
					</button>
					<button type="button" className="mypage-menu-item"onClick={() => navigate("verify-code")}>
						<span className="mypage-menu-title">{t("mypage.verifyCode")}</span>
						<span className="mypage-menu-right">
							<img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
						</span>
					</button>
				</div>
				<div className="bottom-spacer"></div>
			</section>

			<button type="button" className="mypage-logout" onClick={handleLogout}>
				{t("mypage.logout")}
			</button>

			{showRejectModal && (
				<div className="mypage-modal-backdrop" role="presentation">
					<div className="mypage-modal" role="dialog" aria-modal="true">
						<button type="button" className="mypage-modal-close" aria-label="close" onClick={closeRejectModal} >
							<img src="/x-01.svg"></img>
						</button>

						<div className="mypage-modal-body">
							<span className="mypage-modal-title">{t("mypage_modal.title")}</span>
							<span className="mypage-modal-reason">사유:<br/>정보 미제거, 학생증 판별 불가</span> {/* 추후 사유 노출 수정 */}
						</div>
						<button type="button" className="mypage-modal-primary" onClick={goReVerify} >
							{t("mypage_modal.reVerify")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}