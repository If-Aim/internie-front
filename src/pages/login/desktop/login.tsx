// src/pages/login/desktop/login.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import "./login.css";

const kakaoClientId = import.meta.env.VITE_KAKAO_REST_API_KEY;
const origin = window.location.origin;
const kakaoRedirectUri = `${origin}/oauth/kakao/callback`;
const kakaoAuthUrl =
	"https://kauth.kakao.com/oauth/authorize" +
	`?response_type=code` +
	`&client_id=${encodeURIComponent(kakaoClientId)}` +
	`&redirect_uri=${encodeURIComponent(kakaoRedirectUri)}`;

export default function Login(): React.ReactElement {
	// =========PC 버전 로그인 화면관련 선언=================
	const { t } = useTranslation();
	const go = (url: string) => {
		window.location.href = url;
	};

	// 임시 PC 버전 로그인 변수 선언
	// const { t, i18n } = useTranslation();
	// const go = (url: string) => { window.location.href = url; };
	// const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");
	// const toggleLang = async () => {
	//   await i18n.changeLanguage(isKo ? "en" : "ko");
	// };

	// =========PC 버전 로그인 화면 관련 컴포넌트=============
	return (
		<div className="login-desktop-page">
			<header className="login-desktop-header">
				<div className="login-desktop-header-inner">
					<img src="/logos/internie_Logo_thin.png" alt="internie" className="login-desktop-logo" />
				</div>
			</header>

			<main className="login-desktop-main">
				<div className="login-desktop-container">
					<h2 className="login-desktop-title">PC버전은 현재 준비중입니다</h2>
					<p className="login-desktop-subtitle">모바일환경에서 최적화되어있습니다.</p>
					<div className="login-desktop-tabs">
						<button type="button" className="login-desktop-tab is-active" disabled>학생 회원 </button>
						<button type="button" className="login-desktop-tab" disabled>기업 회원</button>
					</div>

					<section className="login-desktop-card">
						<input className="login-desktop-input" disabled placeholder="이메일을 입력하세요"/>
						<input className="login-desktop-input" disabled placeholder="비밀번호를 입력하세요" type="password" />

						<button type="button" className="login-desktop-btn primary" disabled>로그인하기</button>
						<button type="button" className="login-desktop-btn kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")} >
							<img src="/logos/kakao_Logo.svg" alt="" width={20} height={20} />
							<span>{t("login.startWithKakao")}</span>
						</button>

						<div className="login-desktop-join">
							<span>계정이 없으신가요?</span>{" "}
							<button type="button" disabled>
								회원가입
							</button>
						</div>
					</section>
				</div>
			</main>
		</div>
	);

	// 임시 PC 버전 로그인 컴포넌트
	// return (
	//   <div className="page">
	//     {/* 임시 언어 토글 */}
	//     <button
	//       type="button"
	//       className="lang-toggle"
	//       onClick={toggleLang}
	//       aria-label={isKo ? "Switch language to English" : "언어를 한국어로 변경"}
	//     >
	//       {isKo ? "EN" : "KO"}
	//     </button>
	//     <div className="header-spacer" aria-hidden="true" />
	//     <main className="login-wrap">
	//       <h1 className="brand">
	//         <img src="/logos/internie_Logo.svg" alt="internie" width={183} height={35} />
	//       </h1>

	//       <button type="button" className="btn btn-kakao" onClick={() => go(kakaoAuthUrl)} aria-label={t("login.startWithKakaoAria")}>
	//         <span className="ico ico-kakao" aria-hidden="true">
	//           <img src="/logos/kakao_Logo.svg" alt="" width={20} height={20} />
	//         </span>
	//         <span className="btn-text">{t("login.startWithKakao")}</span>
	//       </button>

	//       {/*<button
	//         type="button"
	//         className="btn btn-google"
	//         onClick={() => go(GOOGLE_AUTH_URL)}
	//         aria-label="Google로 시작하기">
	//         <span className="ico ico-google" aria-hidden="true">
	//           <img src="/logos/google_Logo.svg" alt="" width={20} height={20} />
	//         </span>
	//         <span className="btn-text">Google로 시작하기</span>
	//       </button>*/}
	//     </main>
	//   </div>
	// );
}
