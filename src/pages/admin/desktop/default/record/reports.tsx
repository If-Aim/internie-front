// src/pages/admin/desktop/default/record/reports.tsx
// 보고서 화면(탭)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers, getAdminUserCalendar, getAdminEventDayDetail, deleteAdminUserRecord, checkIsCaptain, type AdminUserCalendarResponse,type AdminEventDayDetailResponse, getClientAdminStudentRecordCount, } from "../../../../../api/client";
import "./reports.css";

type CalCell = { key: string; day: number | null; dateStr: string | null };
function pad2(n: number) {
	return String(n).padStart(2, "0");
}
function ymd(y: number, m: number, d: number) {
	// m: 1~12
	return `${y}-${pad2(m)}-${pad2(d)}`;
}

function buildMonthCells(year: number, month1to12: number): CalCell[] {
	const monthIndex = month1to12 - 1;
	const first = new Date(year, monthIndex, 1);
	const lastDay = new Date(year, monthIndex + 1, 0).getDate();

	const jsDow = first.getDay(); 
	const mondayStartOffset = (jsDow + 6) % 7; 

	const cells: CalCell[] = [];

	for (let i = 0; i < mondayStartOffset; i++) {
		cells.push({ key: `e-${year}-${month1to12}-${i}`, day: null, dateStr: null });
	}

	for (let d = 1; d <= lastDay; d++) {
		cells.push({
			key: `d-${year}-${month1to12}-${d}`,
			day: d,
			dateStr: ymd(year, month1to12, d),
		});
	}

	while (cells.length % 7 !== 0) {
		cells.push({ key: `t-${year}-${month1to12}-${cells.length}`, day: null, dateStr: null });
	}

	return cells;
}

export function monthLabel(year: number, month1to12: number): string {
	const date = new Date(year, month1to12 - 1, 1);

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
	}).format(date);
}

function ReportCalendar({
    year,
    month,
    selectedDate,
    recordedDateSet,
    onPrev,
    onNext,
    onSelectDate,
}: {
    year: number;
    month: number;
    selectedDate: string;
    recordedDateSet: Set<string>;
    onPrev: () => void;
    onNext: () => void;
    onSelectDate: (date: string) => void;
}): React.ReactElement {
    const cells = React.useMemo(() => buildMonthCells(year, month), [year, month]);

    return (
        <div className="admin-cal-card">
            <div className="admin-cal-head">
                <div className="admin-cal-title">{monthLabel(year, month)}</div>
                <div className="admin-cal-nav">
                    <button type="button" className="admin-cal-nav-btn" onClick={onPrev} aria-label="prev month">
                        <img src="/icons/Previous (Stroke).svg" alt="" />
                    </button>
                    <button type="button" className="admin-cal-nav-btn" onClick={onNext} aria-label="next month">
                        <img src="/icons/Next (Stroke).svg" alt="" />
                    </button>
                </div>
            </div>

            <div className="admin-cal-dow">
                <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
            </div>

            <div className="admin-cal-grid" role="grid" aria-label="calendar">
                {cells.map((c) => {
                    const isSelected = c.dateStr && c.dateStr === selectedDate;
                    const hasRecord = !!c.dateStr && recordedDateSet.has(c.dateStr);

                    return (
                        <button
                            key={c.key}
                            type="button"
                            className={[
                                "admin-cal-cell",
                                isSelected ? "admin-cal-cell--selected" : "",
                                hasRecord ? "admin-cal-cell--recorded" : "",
                            ].filter(Boolean).join(" ")}
                            disabled={c.day == null}
                            onClick={() => c.dateStr && onSelectDate(c.dateStr)}
                        >
                            {c.day ?? ""}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// function displaySchoolname(u: AdminUser) {
// 	if (u.school && u.school.name) {
// 		return u.school.name;
// 	}
// 	return "-";
// }

export default function AdminReportsPage(): React.ReactElement {
	const [users, setUsers] = React.useState<AdminUser[]>([]);
	const [selectedId, setSelectedId] = React.useState<number | null>(null);

	const today = new Date();
	const [year, setYear] = React.useState(today.getFullYear());
	const [month, setMonth] = React.useState(today.getMonth() + 1);
	const [selectedDate, setSelectedDate] = React.useState<string>(
		ymd(today.getFullYear(), today.getMonth() + 1, today.getDate())
	);

	const [isCaptain, setIsCaptain] = React.useState(false);
	const [calendarData, setCalendarData] = React.useState<AdminUserCalendarResponse | null>(null);
	const [calendarLoading, setCalendarLoading] = React.useState(false);

	const [selectedEventDayIds, setSelectedEventDayIds] = React.useState<number[]>([]);
	const [eventDayDetails, setEventDayDetails] = React.useState<AdminEventDayDetailResponse[]>([]);
	const [detailLoading, setDetailLoading] = React.useState(false);
	const [recordCountMap, setRecordCountMap] = React.useState<Record<number, number>>({});

	const [deleteLoadingId, setDeleteLoadingId] = React.useState<number | null>(null);
	
	const [loading, setLoading] = React.useState(true);
	const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

	const selectedUser = React.useMemo(
		() => users.find((u) => u.userId === selectedId) ?? null,
		[users, selectedId]
	);

	React.useEffect(() => { // Captain 여부 로드
		let mounted = true;

		(async () => {
			try {
				const captain = await checkIsCaptain();
				if (!mounted) return;
				setIsCaptain(captain);
			} catch (e) {
				console.error(e);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const list = await getAdminUsers(); // 전체 사용자 목록 
				if (!mounted) return;

				setUsers(list);
				const counts: Record<number, number> = {};

				await Promise.all(
					list.map(async (u) => {
						try {
							const res = await getClientAdminStudentRecordCount("jump", u.userId);
							counts[u.userId] = res.totalRecordCount;
						} catch {
							counts[u.userId] = 0;
						}
					})
				);

				if (!mounted) return;
				setRecordCountMap(counts);


				setSelectedId((prev) =>
					prev && list.some((u) => u.userId === prev) ? prev : list[0]?.userId ?? null
				);
			} catch (e) {
				if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
					setErrorMsg("관리자 권한이 필요합니다.");
					return;
				}
				setErrorMsg("사용자 목록을 불러오지 못했습니다.");
				console.error(e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => { // 사용자 월 변경 시 캘린더 조회
		let mounted = true;

		(async () => {
			if (!selectedId) {
				setCalendarData(null);
				return;
			}

			try {
				setCalendarLoading(true);
				const res = await getAdminUserCalendar(selectedId, year, month);
				if (!mounted) return;
				setCalendarData(res);
			} catch (e) {
				console.error(e);
				if (mounted) setCalendarData(null);
			} finally {
				if (mounted) setCalendarLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [selectedId, year, month]);

	React.useEffect(() => { // 선택한 날짜의 eventDayId 추출
		if (!calendarData) {
			setSelectedEventDayIds([]);
			return;
		}

		const found = calendarData.dailyStatuses.find((d) => d.date === selectedDate);
		setSelectedEventDayIds(found?.eventDayIds ?? []);
	}, [calendarData, selectedDate]);

	React.useEffect(() => { // eventDay 상세 조회
		let mounted = true;

		(async () => {
			if (selectedEventDayIds.length === 0) {
				setEventDayDetails([]);
				return;
			}

			try {
				setDetailLoading(true);
				const details = await Promise.all(
					selectedEventDayIds.map((id) => getAdminEventDayDetail(id))
				);
				if (!mounted) return;
				setEventDayDetails(details);
			} catch (e) {
				console.error(e);
				if (mounted) setEventDayDetails([]);
			} finally {
				if (mounted) setDetailLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [selectedEventDayIds]);

	function goPrevMonth() { // 이전 달
		setMonth((m) => {
			if (m === 1) {
				setYear((y) => y - 1);
				return 12;
			}
			return m - 1;
		});
	}

	function goNextMonth() { // 다음 달
		setMonth((m) => {
			if (m === 12) {
				setYear((y) => y + 1);
				return 1;
			}
			return m + 1;
		});
	}

	const handleDeleteRecord = async (eventDayId: number) => { // 기록 삭제
		if (!selectedUser) return;
		if (!isCaptain) return;

		const ok = window.confirm("이 기록을 삭제하시겠습니까?");
		if (!ok) return;

		setDeleteLoadingId(eventDayId);
		try {
			await deleteAdminUserRecord(selectedUser.userId, eventDayId);

			const refreshedCalendar = await getAdminUserCalendar(selectedUser.userId, year, month);
			setCalendarData(refreshedCalendar);

			const found = refreshedCalendar.dailyStatuses.find((d) => d.date === selectedDate);
			const nextIds = found?.eventDayIds ?? [];
			setSelectedEventDayIds(nextIds);

			if (nextIds.length === 0) {
				setEventDayDetails([]);
			} else {
				const details = await Promise.all(nextIds.map((id) => getAdminEventDayDetail(id)));
				setEventDayDetails(details);
			}
		} catch (e) {
			console.error(e);
			if (e instanceof ApiError && e.status === 403) {
				alert("CAPTAIN 권한이 필요합니다.");
			} else {
				alert("기록 삭제에 실패했습니다.");
			}
		} finally {
			setDeleteLoadingId(null);
		}
	};

	const recordedDateSet = React.useMemo(() => {
		return new Set((calendarData?.dailyStatuses ?? []).map((d) => String(d.date)));
	}, [calendarData]);

	return (
		<div className="admin-grid">
			{/* 목록 */}
			<section className="admin-col admin-col--left">
				<div className="admin-section-head">
					<div className="admin-section-title">사용자 목록</div>
				</div>

				<div className="admin-list">
					{loading ? (
						<p className="loading">불러오는 중…</p>
					) : errorMsg ? (
						<p className="error">{errorMsg}</p>
					) : users.length === 0 ? (
						<p className="empty">등록된 사용자가 없습니다.</p>
					) : (
						users.map((u, idx) => {
						const isSelected = u.userId === selectedId;
						return (
							<button
								key={u.userId}
								type="button"
								className={isSelected ? "admin-list-item admin-list-item--selected" : "admin-list-item"}
								onClick={() => setSelectedId(u.userId)}
							>
								<span className="admin-badge">{idx + 1}</span>
								<span className="admin-user-name">{u.name}</span>
								<span className="admin-user-school">{recordCountMap[u.userId] ?? 0}건</span>
								<span className="admin-user-status-pill"></span>
								<span className="admin-chevron"><img src="/icons/chevron-right.svg" alt="" /></span>
							</button>
						);
						})
					)}
					</div>
			</section>

			{/* 보고서 프리뷰 */}
			<section className="admin-col admin-col--right">
				<div className="report-card">
					{!selectedUser ? (
						<p className="admin-hint">목록에서 사용자를 선택해주세요.</p>
					) : (
						<>
							<ReportCalendar
								year={year}
								month={month}
								selectedDate={selectedDate}
								recordedDateSet={recordedDateSet}
								onPrev={goPrevMonth}
								onNext={goNextMonth}
								onSelectDate={setSelectedDate}
							/>

							<div className="report-detail-card">
								<div className="admin-section-title" style={{ marginTop: 16 }}>
									{selectedDate} 기록
								</div>

								{calendarLoading || detailLoading ? (
									<p className="loading">불러오는 중…</p>
								) : eventDayDetails.length === 0 ? (
									<p className="empty">선택한 날짜의 기록이 없습니다.</p>
								) : (
									<div className="report-record-list">
										{eventDayDetails.map((detail) => (
											<div key={detail.eventDayId} className="report-record-item">
												<div className="report-record-head">
													<div>
														<div><strong>{detail.eventDayTitle}</strong></div>
														<div>{detail.eventTitle}</div>
														<div>{detail.startTime ?? "-"} ~ {detail.endTime ?? "-"}</div>
													</div>

													{isCaptain && (
														<button
															type="button"
															className="admin-btn admin-btn--ghost"
															onClick={() => handleDeleteRecord(detail.eventDayId)}
															disabled={deleteLoadingId === detail.eventDayId}
														>
															{deleteLoadingId === detail.eventDayId ? "삭제 중…" : "기록 삭제"}
														</button>
													)}
												</div>

												<div className="report-record-body">
													<div>
														<strong>질문</strong>
														<div>
															{detail.question?.questionList?.length
																? detail.question.questionList.join(", ")
																: "-"}
														</div>
													</div>

													<div style={{ marginTop: 12 }}>
														<strong>전사 내용</strong>
														{detail.transcriptions?.length ? (
															detail.transcriptions.map((t) => (
																<div key={t.transcriptionId} style={{ marginTop: 8 }}>
																	{t.text}
																</div>
															))
														) : (
															<div>-</div>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</section>
		</div>
	);
}