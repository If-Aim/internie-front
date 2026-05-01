import React from "react";
import "./dashboard.css";

type ActivityStatus = "upcoming" | "ongoing" | "completed" | "delayed";

interface AssignmentSummary {
    id: number;
    title: string;
    count: number;
}

interface AttendanceSummary {
    id: number;
    date: string;
    activityName: string;
    attendedCount: number;
    totalCount: number;
}

interface Participant {
    id: number;
    name: string;
    school: string;
    status?: "active" | "default";
}

interface TeamSummary {
    id: number;
    name: string;
    members: string;
    statusText: string;
    status?: "active" | "inactive";
}

const assignments: AssignmentSummary[] = [
    { id: 1, title: "과제 A", count: 12 },
    { id: 2, title: "과제 B", count: 10 },
    { id: 3, title: "과제 C", count: 9 },
];

const attendances: AttendanceSummary[] = [
    { id: 1, date: "4월 11일 (토)", activityName: "활동 A", attendedCount: 10, totalCount: 12 },
    { id: 2, date: "4월 7일 (토)", activityName: "활동 B", attendedCount: 15, totalCount: 15 },
    { id: 3, date: "3월 28일 (토)", activityName: "활동 C", attendedCount: 14, totalCount: 16 },
];

const participants: Participant[] = [
    { id: 1, name: "학생 A", school: "이화여자대학교 교육공학과", status: "active" },
    { id: 2, name: "학생 B", school: "이화여자대학교 교육공학과" },
    { id: 3, name: "학생 C", school: "이화여자대학교 교육공학과", status: "active" },
];

const teams: TeamSummary[] = [
    { id: 1, name: "팀 A", members: "학생 A 외 4명", statusText: "현재 활동중", status: "active" },
    { id: 2, name: "팀 B", members: "학생 B 외 3명", statusText: "3시간 전", status: "inactive" },
    { id: 3, name: "팀 C", members: "학생 C 외 2명", statusText: "3일 전", status: "inactive" },
];

export default function EcaDashboardExActivity(): React.ReactElement {
    const status: ActivityStatus = "ongoing"; // 백엔드에서 status 받아오기
    return (
        <div className="eca-dashboard-detail-page">
            <div className="eca-dashboard-detail-head">
                <h1>OK friends 16기</h1> {/** 대외활동명 */}
                <button type="button" className="eca-dashboard-more-button" aria-label="더보기">
                    ···
                </button>
            </div>

            <section className="eca-dashboard-summary-grid">
                <article className="eca-dashboard-summary-card">
                    <div className="eca-dashboard-summary-top">
                        <span>활동 진행률</span>
                        <span className={`eca-dashboard-status-badge eca-dashboard-status--${status}`}>
                            {status}
                        </span>
                    </div>
                    <strong>80%</strong>
                </article>

                <article className="eca-dashboard-summary-card">
                    <span>활동 수료율</span>
                    <strong>60%</strong>
                </article>

                <article className="eca-dashboard-summary-card">
                    <span>전체 참여자 수</span>
                    <strong>50명</strong>
                </article>
            </section>

            <div className="eca-dashboard-main-grid">
                <div className="eca-dashboard-left-column">
                    <section className="eca-dashboard-panel">
                        <div className="eca-dashboard-panel-head">
                            <h2>과제 제출 현황</h2>
                            <div className="eca-dashboard-panel-actions">
                                <button type="button" aria-label="이전">‹</button>
                                <button type="button" aria-label="다음">›</button>
                            </div>
                        </div>

                        <div className="eca-dashboard-list">
                            {assignments.map((item) => (
                                <button type="button" className="eca-dashboard-assignment-row" key={item.id}>
                                    <span>{item.title}</span>
                                    <span className="eca-dashboard-count-badge">{item.count}개</span>
                                    <span className="eca-dashboard-row-arrow">›</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="eca-dashboard-panel">
                        <div className="eca-dashboard-panel-head">
                            <h2>출석 현황</h2>
                        </div>

                        <div className="eca-dashboard-list">
                            {attendances.map((item) => (
                                <button type="button" className="eca-dashboard-attendance-row" key={item.id}>
                                    <strong>{item.date}</strong>
                                    <span>{item.activityName}</span>
                                    <span>
                                        <b>{item.attendedCount}명</b> / {item.totalCount}명
                                    </span>
                                    <span className="eca-dashboard-row-arrow">›</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="eca-dashboard-right-column">
                    <section className="eca-dashboard-panel eca-dashboard-side-panel">
                        <div className="eca-dashboard-panel-head">
                            <h2>참여자</h2>
                            <button type="button" className="eca-dashboard-search-button" aria-label="참여자 검색">
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-dashboard-list">
                            {participants.map((item) => (
                                <button type="button" className="eca-dashboard-person-row" key={item.id}>
                                    <span className="eca-dashboard-avatar-wrap">
                                        <span className="eca-dashboard-avatar" />
                                        {item.status === "active" ? <span className="eca-dashboard-active-dot" /> : null}
                                    </span>
                                    <span className="eca-dashboard-person-info">
                                        <strong>{item.name}</strong>
                                        <span>{item.school}</span>
                                    </span>
                                    <span className="eca-dashboard-send-icon">▷</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="eca-dashboard-panel eca-dashboard-side-panel">
                        <div className="eca-dashboard-panel-head">
                            <h2>팀</h2>
                            <button type="button" className="eca-dashboard-search-button" aria-label="팀 검색">
                                <img src="/icons/search-01-a0.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-dashboard-list">
                            {teams.map((item) => (
                                <button type="button" className="eca-dashboard-team-row" key={item.id}>
                                    <span className="eca-dashboard-avatar" />
                                    <span className="eca-dashboard-person-info">
                                        <strong>{item.name}</strong>
                                        <span>{item.members}</span>
                                    </span>
                                    <span className={item.status === "active" ? "eca-dashboard-team-status eca-dashboard-team-status--active" : "eca-dashboard-team-status"}>
                                        <span />
                                        {item.statusText}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}