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

    const [query, setQuery] = React.useState<string>("");
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const [calendarLoading, setCalendarLoading] = React.useState<boolean>(false);
    const [calendarError, setCalendarError] = React.useState<string | null>(null);
    const [calendar, setCalendar] = React.useState<JumpAdminStudentCalendarResponse | null>(null);

	const [selectedOrg, setSelectedOrg] = React.useState<string>(""); 
	const [open, setOpen] = React.useState<boolean>(false);
	const orgRef = React.useRef<HTMLDivElement | null>(null);

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
		return Array.from(set);
	}, [students]);

    const filtered = React.useMemo(() => {
		const byOrg = students.filter((u) => {
			if (!selectedOrg.trim()) return true;
			return getOrgName(u) === selectedOrg;
		});
		return byOrg.filter((u) => matchQuery(u, query));
	}, [students, selectedOrg, query]);

    const selected = React.useMemo(() => {
        if (selectedId == null) return null;
        return students.find((u) => u.userId === selectedId) ?? null;
    }, [students, selectedId]);

	React.useEffect(() => { // 필터 바깥쪽 클릭 시 닫힘
		if (!open) return;

		function onDocMouseDown(e: MouseEvent) {
			const el = orgRef.current;
			if (!el) return;

			if (e.target instanceof Node && !el.contains(e.target)) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [open]);

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
        navigate("/jump-admin/reports");
    };

    return (
		<div className="jump-users-page">
			{/* HEAD */}
			<div className="jump-admin-section-head">
				<div className="jump-admin-section-title-wrap">
					<div className="jump-admin-section-title-badge">
						<img src="/jump-logo.png" alt="" />
					</div>
					<div className="jump-admin-section-title">2026 상생지락 ALTogether</div>
				</div>
			</div>

			{/* GRID */}
			<div className="jump-admin-grid">
				{/* LEFT CARD */}
				<section className="jump-users-left-card">
					<div className="jump-users-filters">
						<div className="jump-users-filter">
							<div ref={orgRef} className={`jump-users-org ${open ? "is-open" : ""}`}>
								<button type="button" className={`jump-users-org-trigger ${!selectedOrg ? "is-all" : ""}`} onClick={() => setOpen((prev) => !prev)} aria-label="organization filter" >
									<img className="jump-users-org-filter" src={selectedOrg ? "/mynaui_filter.svg" : "/mynaui_filter_6b.svg"} alt="" />
									<span className="jump-users-org-text">{selectedOrg || "전체"}</span>
									<img className="jump-users-org-arrow" src={selectedOrg ? "/chevron-right.svg" : "/chevron-right-6b.svg"} alt="" />
								</button>

								{open && (
									<div className="jump-users-org-menu">
										<button type="button" className="jump-users-org-item" onClick={() => { setSelectedOrg(""); setOpen(false); }} >
											전체
										</button>

										{orgOptions.map((org) => (
											<button key={org} type="button" className="jump-users-org-item" onClick={() => { setSelectedOrg(org); setOpen(false); }}>
												{org}
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						<div className={`jump-users-search ${!query.trim() ? "is-empty" : "is-typing"}`}>
							<img className="jump-users-search-icon" src={!query.trim() ? "/search-6b-01.svg" : "/search-00-01.svg"} alt="" />
							<input className="jump-users-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" aria-label="search" />
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

				{/* RIGHT CARD */}
				<section className="jump-users-right-card">
					<div className="jump-users-detail-card">
						{!selected ? (
							<div className="jump-users-empty">
								<img src="/internie_mascot_normal.png" alt="" />
								<span className="jump-users-empty-title">학생을 선택해주세요!</span>
							</div>
						) : (
							<div className="jump-users-detail">
								<div className="jump-users-detail-head">
									<div className="jump-users-detail-title">{normalizeText(selected.name) || "-"} 님</div>
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

								<button type="button" className="jump-users-record-btn" onClick={handleClickRecordView}>
									기록 보기
								</button>
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}