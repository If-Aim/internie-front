// src/pages/admin/desktop/jump/analysis/users.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
    ApiError,
    getJumpAdminStudents,
    getJumpAdminStudentCalendar,
    type JumpAdminStudent,
    type JumpAdminStudentCalendarResponse,
} from "../../../../../api/client";
import "./users.css";

function normalizeText(v: unknown): string {
    return String(v ?? "").trim();
}

function getOrgName(u: JumpAdminStudent): string {
    const org = u.jumpOrganization?.name;
    return normalizeText(org) || "-";
}

function matchQuery(u: JumpAdminStudent, q: string): boolean {
    const query = q.trim().toLowerCase();
    if (!query) return true;

    const name = normalizeText(u.name).toLowerCase();
    const nick = normalizeText(u.nickname).toLowerCase();
    const org = getOrgName(u).toLowerCase();

    return name.includes(query) || nick.includes(query) || org.includes(query);
}

function getSchoolName(u: JumpAdminStudent): string {
    return normalizeText(u.school?.name) || "-";
}

export default function JumpAdminUsersPage(): React.ReactElement {
    const navigate = useNavigate();

    const [students, setStudents] = React.useState<JumpAdminStudent[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const [orgFilter, setOrgFilter] = React.useState<string>("ALL");
    const [query, setQuery] = React.useState<string>("");
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const [calendarLoading, setCalendarLoading] = React.useState<boolean>(false);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [calendar, setCalendar] = React.useState<JumpAdminStudentCalendarResponse | null>(null);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg(null);

                const list = await getJumpAdminStudents();
                if (!mounted) return;

                setStudents(Array.isArray(list) ? list : []);
                setSelectedId((prev) => {
                    if (prev == null) return null;
                    return list.some((u) => u.userId === prev) ? prev : null;
                });
            } catch (e) {
                if (!mounted) return;

                if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
                    setErrorMsg("권한이 없거나 로그인 정보가 만료되었습니다.");
                } else {
                    setErrorMsg("참가자 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const orgOptions = React.useMemo(() => {
        const set = new Set<string>();
        for (const u of students) {
            const org = getOrgName(u);
            if (org && org !== "-") set.add(org);
        }
        return ["ALL", ...Array.from(set)];
    }, [students]);

    const filtered = React.useMemo(() => {
        const byOrg = students.filter((u) => {
            if (orgFilter === "ALL") return true;
            return getOrgName(u) === orgFilter;
        });
        return byOrg.filter((u) => matchQuery(u, query));
    }, [students, orgFilter, query]);

    const selected = React.useMemo(() => {
        if (selectedId == null) return null;
        return students.find((u) => u.userId === selectedId) ?? null;
    }, [students, selectedId]);

    React.useEffect(() => {
        let mounted = true;

        if (!selected) {
            setCalendar(null);
            setCalendarError(null);
            setCalendarLoading(false);
            return () => {
                mounted = false;
            };
        }

        (async () => {
            try {
                setCalendarLoading(true);
                setCalendarError(null);

                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1;

                const data = await getJumpAdminStudentCalendar(selected.userId, year, month);
                if (!mounted) return;

                setCalendar(data);
            } catch (e) {
                if (!mounted) return;
                setCalendar(null);
                setCalendarError("기록 수를 불러오지 못했습니다.");
            } finally {
                if (mounted) setCalendarLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [selected?.userId]);

    const recordCountText = React.useMemo(() => {
        if (!selected) return "-";
        if (calendarLoading) return "불러오는 중...";
        if (calendarError) return "-";
        if (!calendar) return "-";
        return `${calendar.totalRecordedDays}건`;
    }, [selected, calendarLoading, calendarError, calendar]);

    const unrecordedCountText = "-"; // TODO: 백엔드 준비되면 연결
    const volunteerTimeText = "-"; // TODO: 백엔드 준비되면 연결

    const handleClickRecordView = () => {
        if (!selected) return;

        // TODO: 실제 라우트가 정해지면 변경
        // 예: navigate(`/jump-admin/reports?studentId=${selected.userId}`);
        navigate("/jump-admin/reports");
    };

    return (
        <div className="jump-admin-grid">
            {/* LEFT */}
            <section>
                <div className="jump-admin-section-head">
                    <div>
						<div className="jump-admin-section-title-badge"><img src="/jump-logo.png"></img></div>
                        <div className="jump-admin-section-title">2026 상생지락 ALTogether</div>
                    </div>
                </div>

                <div className="jump-users-filters">
                    <div className="jump-users-filter">
                        <select
                            className="jump-users-select"
                            value={orgFilter}
                            onChange={(e) => setOrgFilter(e.target.value)}
                            aria-label="organization filter"
                        >
                            {orgOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt === "ALL" ? "전체" : opt}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="jump-users-search">
                        <input
                            className="jump-users-search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="검색"
                            aria-label="search"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="jump-users-state">불러오는 중...</div>
                ) : errorMsg ? (
                    <div className="jump-users-state">{errorMsg}</div>
                ) : (
                    <div className="jump-admin-list" role="list">
                        {filtered.map((u, idx) => {
                            const isSelected = selectedId === u.userId;
                            const displayName = normalizeText(u.name) || normalizeText(u.nickname) || "-";
                            const orgName = getOrgName(u);

                            return (
                                <button
                                    key={u.userId}
                                    type="button"
                                    className={isSelected ? "jump-admin-list-item jump-admin-list-item--selected" : "jump-admin-list-item"}
                                    onClick={() => setSelectedId(u.userId)}
                                    role="listitem"
                                >
                                    <div className="jump-admin-badge">{idx + 1}</div>
                                    <div className="jump-admin-user-name">{displayName}</div>
                                    <div className="jump-admin-user-org">{orgName}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* RIGHT */}
            <section>
                <div className="jump-users-detail-card">
                    {!selected ? (
                        <div className="jump-users-empty"></div>
                    ) : (
                        <div className="jump-users-detail">
                            <div className="jump-users-detail-head">
                                <div className="jump-users-detail-title">
                                    {normalizeText(selected.name) || "-"} 님
                                </div>
                                <button type="button" className="jump-users-trash" aria-label="delete">
                                    <img src="/trash-red-01.svg" alt="" />
                                </button>
                            </div>

                            <div className="jump-users-info">
                                <div className="jump-users-info-row">
                                    <div className="jump-users-info-label">소속</div>
                                    <div className="jump-users-info-value">{getSchoolName(selected)}</div>
                                </div>

                                <div className="jump-users-info-row">
                                    <div className="jump-users-info-label">기관</div>
                                    <div className="jump-users-info-value">{getOrgName(selected)}</div>
                                </div>

                                <div className="jump-users-info-row">
                                    <div className="jump-users-info-label">봉사 일시</div>
                                    <div className="jump-users-info-value">{volunteerTimeText}</div>
                                </div>

                                <div className="jump-users-info-row">
                                    <div className="jump-users-info-label">기록 수</div>
                                    <div className="jump-users-info-value">{recordCountText}</div>
                                </div>

                                <div className="jump-users-info-row">
                                    <div className="jump-users-info-label">미기록 수</div>
                                    <div className="jump-users-info-value">{unrecordedCountText}</div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="jump-users-record-btn"
                                onClick={handleClickRecordView}
                            >
                                기록 보기
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}