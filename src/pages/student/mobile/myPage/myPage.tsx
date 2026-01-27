// src/pages/student/mobile/myPage/myPage.tsx
import React from "react";
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
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.endsWith("/mypage/verify")) {
    return <Outlet />;
  }
  
  const [me, setMe] = React.useState<UserMe | null>(null);
  const displayName = me?.name ?? "";
  const displayEmail = (me as any)?.email ?? "이메일";
  const isVerifiedStudent = me?.status === "APPROVED" && Boolean(me?.verificationImage);
  const status = (me?.status ?? "UNVERIFIED") as VerifyStatus;
  
  const verifyUi = (() => {
    switch (status) {
      case "PENDING":
        return {
          label: "인증 요청중",
          disabled: true,
          onClick: () => {}, // 눌러도 아무 동작 안 하게
        };
      case "REJECTED":
        return {
          label: "인증이 실패했어요",
          disabled: false,
          onClick: () => navigate("/student/verify"), // 다시 신청 화면으로
        };
      case "APPROVED":
        return {
          label: "프로필 수정하기",
          disabled: false,
          onClick: () => navigate("/account"), // 프로필 수정 화면으로
        };
      case "UNVERIFIED":
      default:
        return {
          label: "재학생 인증하기",
          disabled: false,
          onClick: () => navigate("/student/verify"),
        };
    }
  })();

  const isDefaultProfile =
    !me?.profileImage ||
    me.profileImage.includes("kakao") || // 카카오 기본 이미지
    me.profileImage.includes("default");
  const avatarSrc = isDefaultProfile
    ? "/internie_mascot_normal.png"
    : me?.profileImage!;
  const [/*recent*/, setRecent] = React.useState<EventDay[]>([]);
  const [targetCompany, /*setTargetCompany*/] = React.useState<string | null>(null);

  // mypage-menu-item 서비스 준비중 팝업알림
  function handleServicePreparing() {
    alert("서비스 준비중입니다.");
  }

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

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await getUserMe();
        if (!mounted) return;

        setMe(res);
      } catch {
      }
    })();

    return () => { mounted = false; };
  }, []);

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
        <div className="mypage-email">{/*마이페이지*/}</div>

        <button type="button" className="mypage-close" aria-label="닫기" onClick={() => navigate("/")} >
          <img src="/x-01.svg" alt="메인화면으로 이동" />
        </button>
      </header>

      <section className="mypage-top">
        <div className="mypage-profileimg-wrap">
          <img className="mypage-profileimg" src={avatarSrc} alt="profileImg" />
          {isVerifiedStudent && (
            <img className="mypage-school-badge" src="/school_mark.png" alt="재학생 인증" />
          )}
        </div>
        <div className="mypage-greeting">
          안녕하세요, <span className="mypage-name">{displayName}</span>님
        </div>
        <div className="mypage-email-sub">{displayEmail}</div>
      </section>

      <section className="mypage-cards">
        {/* 재학생 인증 */}
          <>
            <button
              type="button"
              className={`mypage-card wide ${status === "PENDING" ? "is-pending" : ""} ${status === "REJECTED" ? "is-rejected" : ""}`}
              onClick={verifyUi.onClick}
              disabled={verifyUi.disabled}
            >
              <span className="mypage-badge" />
              <span className="mypage-card-title">{verifyUi.label}</span>
            </button>

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
          </>
        <div className="mypage-menu">
          <button type="button" className="mypage-menu-item" onClick={handleServicePreparing}>
            <span className="mypage-menu-title">나의 목표 기업</span>
            <span className="mypage-menu-right">
              <span className="mypage-menu-value">{targetCompany ?? "미설정"}</span>
              <img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
            </span>
          </button>

          <button type="button" className="mypage-menu-item" onClick={() => navigate("cert")}> {/* 추후 onClick 이벤트 변경: {() => navigate("/certificate")} */}
            <span className="mypage-menu-title">나의 수료증</span>
            <span className="mypage-menu-right">
              <img className="mypage-menu-chevron" src="/chevron-right.svg" alt="" />
            </span>
          </button>
        </div>
        <div className="bottom-spacer"></div>
      </section>

      {/* <section className="mypage-links">
        {isVerifiedStudent ? (
          <>
            <button type="button" className="mypage-link">
              프로필 공유하기
            </button>
            <button type="button" className="mypage-link" onClick={() => navigate("/account")} >
              프로필 수정하기
            </button>
          </>
        ) : (
          <button type="button" className="mypage-link" disabled>
            목표 기업 설정
          </button>
        )}
      </section> */}

      <button type="button" className="mypage-logout" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}