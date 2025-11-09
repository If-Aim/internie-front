// src/pages/schduleIntro.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/schedule.css";

export default function ScheduleIntro() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav("/schedule/new"), 15000);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <>
      <div className="header-spacer" aria-hidden="true" />
      <main className="welcome">
        <img src="/internie_mascot_normal.png" alt="" className="welcome-img" />
        <p className="welcome-text">새로운 일정 추가 어쩌구</p>
      </main>
    </>
  );
}
