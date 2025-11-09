// src/pages/newSchedule.tsx
import "../styles/schedule.css";
import React from "react";
import { useNavigate } from "react-router-dom";

export default function NewSchedule() {
    const nav = useNavigate();
    const [showOutro, setShowOutro] = React.useState(false);

    const handleSave = () => {
        setShowOutro(true);
        window.setTimeout(() => nav("/questions"), 1600); // 두 번째 화면 경로
    };

    const today = React.useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        return `${y}년 ${m}월 ${d}일`;
    }, []);

  return (
    <div className="screen">
        <div className="spacer-50" aria-hidden="true" />
        <header className="topbar">
            <button className="iconbtn" aria-label="메뉴">
                <img className="icon" src="/menu-01.svg" alt="" />
            </button>
            <h1 className="topbar-title">일정 추가</h1>
            <button className="iconbtn" aria-label="닫기">
                <img className="icon" src="/x-01.svg" alt="" />
            </button>
        </header>

        <main className="new-event">
            <input className="title-input" placeholder="새로운 이벤트..." aria-label="이벤트 제목" />

            <section className="row">
                <img className="icon" src="/clock-01.svg" alt="" />
                <div className="col">
                    <div className="row-sub">반복 안함</div>
                </div>
                <div className="chev-stack">
                    <button className="chev" aria-label="위">
                        <img className="icon rot-up" src="/chevron-right.svg" alt="" />
                    </button>
                    <button className="chev" aria-label="아래">
                        <img className="icon rot-down" src="/chevron-right.svg" alt="" />
                    </button>
                </div>
            </section>

            <section className="row">
                <img className="icon" src="/clock-01.svg" alt="날짜" />
                <div className="col">
                    <div className="row-head">
                        <div className="row-today"><strong>{today}</strong></div>
                    </div>
                    <div className="row-sub">반복 안함</div>
                </div>
            </section>
        </main>

            <footer className="footer-fixed">
                <button className="btn-primary" onClick={handleSave}>저장하기</button>
            </footer>
            {showOutro && <OutroOverlay />}
        </div>
  );
}

function OutroOverlay() {
  return (
    <div className="outro" role="dialog" aria-modal="true" aria-label="종료 화면">
      <img className="outro-img" src="/internie_mascot_normal.png" alt="" />
      <p className="outro-line1">인터니가 질문을 준비하고 있어요!</p>
      <p className="outro-line2">오늘은 어떤 역량을 얻을 수 있을까요?</p>
    </div>
  );
}