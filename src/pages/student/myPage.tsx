import React from "react";
import { useNavigate } from "react-router-dom";
import { getUserMe, getEventDaysByMonth } from "../../api/client";
import type { EventDay } from "../../api/client";

import "../styles/myPage.css";

type Props = { onLogout?: () => void; };

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
function toHHmm(t?: string | null) {
  if (!t) return "00:00";
  return t.length >= 5 ? t.slice(0, 5) : t;
}
function sortKey(ed: EventDay) {
  // date: "2025-12-30"
  const dateKey = ed.date.replaceAll("-", ""); // "20251230"
  const timeKey = (ed.startTime ?? "00:00").slice(0, 5).replace(":", ""); // "0930"
  const txCount = Array.isArray(ed.transcriptions) ? ed.transcriptions.length : 0;
  return { dateKey, timeKey, txCount };
}

// 마이페이지 컴포넌트
export default function MyPage({ onLogout }: Props) {
  const navigate = useNavigate();

  //const [email, setEmail] = React.useState("internie@gmail.com"); 임시
  const [name, setName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState("/internie_mascot_normal.png");

  const [recent, setRecent] = React.useState<EventDay[]>([]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await getUserMe();
        if (!mounted) return;

        setName(me.name ?? "사용자");
        setAvatarUrl(me.profileImage ? me.profileImage : "/internie_mascot_normal.png"); //프로필 이미지 없을 때
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
        <div className="mypage-email">마이페이지{/*{email}*/}</div>

        <button type="button" className="mypage-close" aria-label="닫기" onClick={() => navigate("/")} >
          <img src="/x-01.svg" alt="메인화면으로 이동" />
        </button>
      </header>

      <section className="mypage-top">
        <div className="mypage-profileimg-wrap">
          <img className="mypage-profileimg" src={avatarUrl} alt="" />
        </div>

        { name && (
          <div className="mypage-greeting">
            안녕하세요, <span className="mypage-name">{name}</span>님
          </div>
        )}
      </section>

      <section className="mypage-cards">
        {/* 재학생 인증카드 */}
        <button type="button" className="mypage-card wide" disabled>
          <span className="mypage-badge" aria-hidden="true" />
          <span className="mypage-card-title">(재학생 인증)</span>
        </button>

        {/* 최근 기록한? 일정 카드 */}
        <div className="mypage-cardgrid">
          {/* TODO: 카드 클릭 시 조회 화면으로 이동 */}
          <button type="button" className="mypage-card square" disabled />
          <button type="button" className="mypage-card square" disabled />
        </div>

        {/* 카드 아래 텍스트(사진처럼 카드 아래에 제목/시간) */}
        <div className="mypage-cardgrid-meta">
          <div className="mypage-meta">
            <div className="mypage-meta-title">{recent[0]?.title ?? "새로운 이벤트"}</div>
            <div className="mypage-meta-time">{toHHmm(recent[0]?.startTime ?? null)}</div>
          </div>
          <div className="mypage-meta">
            <div className="mypage-meta-title">{recent[1]?.title ?? "새로운 이벤트"}</div>
            <div className="mypage-meta-time">{toHHmm(recent[1]?.startTime ?? null)}</div>
          </div>
        </div>
      </section>

      <section className="mypage-links">
        <button type="button" className="mypage-link" disabled>(프로필 공유)</button>
        <button type="button" className="mypage-link" onClick={() => navigate("/account")} disabled>
          계정 관리하기
        </button>
      </section>

      <button type="button" className="mypage-logout" onClick={() => (onLogout ? onLogout() : navigate("/login"))} >
        로그아웃
      </button>
    </div>
  );
}