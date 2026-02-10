// src/pages/admin/desktop/jump/analysis/users.tsx
import React from "react";
import "./users.css";

type ActivityCard = {
  id: string;
  title: string;
  keywords: string[];
};

type ScheduleItem = {
  time: string;
  title: string;
  subtitle?: string;
};

export default function JumpAdminAnalysisUsersPage(): React.ReactElement {
  // ===== 더미 데이터 =====
  const profile = {
    name: "인턴이",
    school: "이화여자대학교 경영학부",
    email: "internie@ewha.ac.kr",
    avgScore: 65,
    topCount: 2,
    lowCount: 3,
    reliability: 87,
  };

  const schedule = {
    dateLabel: "8월 28일, 목요일",
    items: [
      { time: "08:00", title: "새로운 이벤트", subtitle: "새로운 이벤트" },
      { time: "09:00", title: "새로운 이벤트", subtitle: "새로운 이벤트" },
      { time: "10:00", title: "새로운 이벤트", subtitle: "새로운 이벤트" },
      { time: "03:00", title: "새로운 이벤트", subtitle: "새로운 이벤트" },
    ] satisfies ScheduleItem[],
  };

  const activities: ActivityCard[] = [
    { id: "a1", title: "나의 활동", keywords: ["역량 키워드"] },
    { id: "a2", title: "나의 활동", keywords: ["역량 키워드"] },
    { id: "a3", title: "나의 활동", keywords: ["역량 키워드"] },
    { id: "a4", title: "나의 활동", keywords: ["키워드"] },
    { id: "a5", title: "디자인 스프린트", keywords: ["키워드", "키워드"] },
    { id: "a6", title: "디자인 스프린트", keywords: ["키워드", "키워드"] },
    { id: "a7", title: "디자인 스프린트", keywords: ["키워드"] },
    { id: "a8", title: "디자인 스프린트", keywords: ["키워드", "키워드"] },
    { id: "a9", title: "디자인 스프린트", keywords: ["키워드"] },
    { id: "a10", title: "디자인 스프린트", keywords: ["키워드"] },
    { id: "a11", title: "디자인 스프린트", keywords: ["키워드"] },
    { id: "a12", title: "디자인 스프린트", keywords: ["키워드"] },
  ];

  function onPrevDay() {}
  function onNextDay() {}
  function onUpgrade() {}
  function onEditProfile() {}

  return (
    <div className="jump-analysis-layout">
      <div className="jump-analysis-left">
        <section className="analysis-card analysis-report">
          <div className="analysis-report-head">
            <div className="analysis-report-title">역량분석 보고서</div>

            <button type="button" className="analysis-report-edit" onClick={onEditProfile}>
              편집
            </button>
          </div>

          <div className="analysis-profile-row">
            <div className="analysis-avatar" aria-label="avatar" />
            <div className="analysis-profile-meta">
              <div className="analysis-profile-name">{profile.name}</div>
              <div className="analysis-profile-sub">{profile.school}</div>
              <div className="analysis-profile-sub">{profile.email}</div>
            </div>
          </div>

          <div className="analysis-report-stats">
            <div className="analysis-stat">
              <div className="analysis-stat-value">{profile.avgScore}점</div>
              <div className="analysis-stat-label">역량점수 평균</div>
            </div>
            <div className="analysis-stat">
              <div className="analysis-stat-value">{profile.topCount}개</div>
              <div className="analysis-stat-label">상위 역량</div>
            </div>
            <div className="analysis-stat">
              <div className="analysis-stat-value">{profile.lowCount}개</div>
              <div className="analysis-stat-label">하위 역량</div>
            </div>
          </div>

          <div className="analysis-report-footer">
            <div className="analysis-reliability">
              <span className="analysis-reliability-label">신뢰도</span>
              <span className="analysis-reliability-value">{profile.reliability}%</span>
            </div>

            <button type="button" className="analysis-upgrade-btn" onClick={onUpgrade}>
              역량 업그레이드하기
            </button>
          </div>
        </section>

        {/* 나의 일정 카드 */}
        <section className="analysis-card analysis-schedule">
          <div className="analysis-schedule-head">
            <div className="analysis-schedule-title">나의 일정</div>
          </div>

          <div className="analysis-schedule-date">
            <button type="button" className="analysis-day-nav" onClick={onPrevDay} aria-label="prev day">
              ‹
            </button>
            <div className="analysis-day-label">{schedule.dateLabel}</div>
            <button type="button" className="analysis-day-nav" onClick={onNextDay} aria-label="next day">
              ›
            </button>
          </div>

          <div className="analysis-schedule-list">
            {schedule.items.map((it, idx) => (
              <div key={`${it.time}-${idx}`} className="analysis-schedule-item">
                <div className="analysis-time">
                  <div className="analysis-time-main">{it.time}</div>
                </div>

                <div className="analysis-schedule-dot" aria-hidden="true" />

                <div className="analysis-schedule-text">
                  <div className="analysis-schedule-item-title">{it.title}</div>
                  <div className="analysis-schedule-item-sub">{it.subtitle ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="jump-analysis-right">
        <section className="analysis-activity-panel">
          <div className="analysis-activity-head">나의 활동</div>

          <div className="analysis-activity-grid">
            {activities.map((a) => (
              <button key={a.id} type="button" className="analysis-activity-card">
                <div className="analysis-activity-tags">
                  {a.keywords.slice(0, 2).map((k, i) => (
                    <span key={`${a.id}-k-${i}`} className="analysis-pill">
                      {k}
                    </span>
                  ))}
                </div>

                <div className="analysis-activity-title">{a.title}</div>

                <div className="analysis-activity-chevron" aria-hidden="true">
                  ›
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
