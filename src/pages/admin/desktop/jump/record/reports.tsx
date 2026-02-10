// src/pages/admin/desktop/jump/record/reports.tsx
import React from "react";
import { ApiError, type JumpAdminStudent, getJumpAdminStudents, getJumpAdminStudentCalendar, getJumpAdminEventDayDetail, type JumpAdminEventDayDetailResponse, type JumpAdminDailyStatus, } from "../../../../../api/client";

// 닉네임대신 학교명 
function displaySchoolOrNickname(u: JumpAdminStudent) {
    return (u.nickname ?? "").trim() || "-";
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function toYmd(y: number, m: number, d: number) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
}


// 달력 생성용
function getMonthMatrix(year: number, month1to12: number) {
    const first = new Date(year, month1to12 - 1, 1);
    const last = new Date(year, month1to12, 0);
    const daysInMonth = last.getDate();

    const jsDow = first.getDay();
    const mondayStartOffset = (jsDow + 6) % 7; 

    const cells: Array<{ y: number; m: number; d: number; inMonth: boolean }> = [];

    for (let i = 0; i < mondayStartOffset; i++) {
        const d = new Date(year, month1to12 - 1, 1 - (mondayStartOffset - i));
        cells.push({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ y: year, m: month1to12, d, inMonth: true });
    }

    while (cells.length % 7 !== 0) {
        const lastCell = cells[cells.length - 1];
        const next = new Date(lastCell.y, lastCell.m - 1, lastCell.d + 1);
        cells.push({ y: next.getFullYear(), m: next.getMonth() + 1, d: next.getDate(), inMonth: false });
    }

    const weeks: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

export default function JumpAdminReportsPage(): React.ReactElement {
    const [students, setStudents] = React.useState<JumpAdminStudent[]>([]);
    const [loadingStudents, setLoadingStudents] = React.useState(true);
    const [selectedStudentId, setSelectedStudentId] = React.useState<number | null>(null);

    const today = React.useMemo(() => new Date(), []);
    const [year, setYear] = React.useState<number>(today.getFullYear());
    const [month, setMonth] = React.useState<number>(today.getMonth() + 1);

    const [calendarLoading, setCalendarLoading] = React.useState(false);
    const [dailyStatuses, setDailyStatuses] = React.useState<JumpAdminDailyStatus[]>([]);
    const recordedMap = React.useMemo(() => {
        const m = new Map<string, number[]>();
        for (const ds of dailyStatuses) m.set(ds.date, ds.eventDayIds ?? []);
        return m;
    }, [dailyStatuses]);

    
    const [selectedDate, setSelectedDate] = React.useState<string | null>(null); // YYYY-MM-DD
    const [selectedEventDayId, setSelectedEventDayId] = React.useState<number | null>(null);

    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detail, setDetail] = React.useState<JumpAdminEventDayDetailResponse | null>(null);

    const [rightTab, setRightTab] = React.useState<"SCHEDULE" | "RESULT">("SCHEDULE");

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoadingStudents(true);
                const list = await getJumpAdminStudents();
                if (!mounted) return;

                setStudents(list);

                if (list.length > 0) {
                    setSelectedStudentId(list[0].userId);
                }
            } catch (e) {
                if (!mounted) return;
                console.error(e);
                setStudents([]);
            } finally {
                if (mounted) setLoadingStudents(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!selectedStudentId) return;

        let mounted = true;

        (async () => {
        try {
            setCalendarLoading(true);
            setDailyStatuses([]);
            setSelectedDate(null);
            setSelectedEventDayId(null);
            setDetail(null);

            const res = await getJumpAdminStudentCalendar(selectedStudentId, year, month);
            if (!mounted) return;

            setDailyStatuses(res.dailyStatuses ?? []);

            const dates = (res.dailyStatuses ?? []).map((x) => x.date).sort();
            const lastDate = dates.length ? dates[dates.length - 1] : null;
            if (lastDate) {
                setSelectedDate(lastDate);
                const ids = res.dailyStatuses.find((x) => x.date === lastDate)?.eventDayIds ?? [];
                if (ids.length) setSelectedEventDayId(ids[0]);
            }
        } catch (e) {
            if (!mounted) return;
            if (!(e instanceof ApiError)) console.error(e);
            setDailyStatuses([]);
        } finally {
            if (mounted) setCalendarLoading(false);
        }
        })();

        return () => {
            mounted = false;
        };
    }, [selectedStudentId, year, month]);

    // 선택 eventDayId 변경 시 상세 로드
    React.useEffect(() => {
        if (!selectedEventDayId) return;

        let mounted = true;

        (async () => {
            try {
                setDetailLoading(true);
                setDetail(null);

                const res = await getJumpAdminEventDayDetail(selectedEventDayId);
                if (!mounted) return;

                setDetail(res);
            } catch (e) {
                if (!mounted) return;
                if (!(e instanceof ApiError)) console.error(e);
                setDetail(null);
            } finally {
                if (mounted) setDetailLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [selectedEventDayId]);

    const selectedStudent = React.useMemo(() => {
        return students.find((s) => s.userId === selectedStudentId) ?? null;
    }, [students, selectedStudentId]);

    const weeks = React.useMemo(() => getMonthMatrix(year, month), [year, month]);

    function goPrevMonth() {
        const m = month - 1;
        if (m >= 1) {
            setMonth(m);
        } else {
            setYear(year - 1);
            setMonth(12);
        }
    }

    function goNextMonth() {
        const m = month + 1;
        if (m <= 12) {
            setMonth(m);
        } else {
            setYear(year + 1);
            setMonth(1);
        }
    }

    function onPickDay(y: number, m: number, d: number) {
        const ymd = toYmd(y, m, d);
        setSelectedDate(ymd);

        const ids = recordedMap.get(ymd) ?? [];
        setSelectedEventDayId(ids.length ? ids[0] : null);
        setDetail(null);
    }

    const eventDayIdsForSelectedDate = React.useMemo(() => {
        if (!selectedDate) return [];
        return recordedMap.get(selectedDate) ?? [];
    }, [selectedDate, recordedMap]);

    return (
        <div>
            <div className="jump-admin-section-head">
                <div className="jump-admin-section-title">Student List</div>

                <div className="jump-admin-section-count" aria-label="student count">
                    <span className="jump-admin-count-strong">{students.length}</span>
                    <span className="jump-admin-count-total"> / {students.length}</span>
                </div>
            </div>

            <div className="jump-admin-grid">
                {/* ===== 왼쪽 학생 목록 ===== */}
                <div>
                    {loadingStudents ? (
                        <div style={{ padding: 12 }}>로딩 중...</div>
                    ) : (
                        <div className="jump-admin-list" role="list">
                        {students.map((u, idx) => {
                            const selected = u.userId === selectedStudentId;
                            return (
                            <button
                                key={u.userId}
                                type="button"
                                className={selected ? "jump-admin-list-item jump-admin-list-item--selected" : "jump-admin-list-item"}
                                onClick={() => setSelectedStudentId(u.userId)}
                            >
                                <div className="jump-admin-badge">{idx + 1}</div>
                                <div className="jump-admin-user-name">{u.name}</div>
                                <div className="jump-admin-user-school">{displaySchoolOrNickname(u)}</div>
                                <div className="jump-admin-user-status-pill status--etc">{/* 필요 시 status 표시 */}</div>
                                <div className="jump-admin-chevron">
                                <img src="/chevron-down.svg" alt="" />
                                </div>
                            </button>
                            );
                        })}
                        </div>
                    )}
                </div>

                {/* ===== 오른쪽 캘린더 + 상세 ===== */}
                <div className="jump-admin-detail-card">
                {/* 캘린더 카드 */}
                    <div className="report-card report-card--calendar">
                        <div className="admin-cal-card">
                            <div className="admin-cal-head">
                                <div className="admin-cal-title">
                                    {new Date(year, month - 1, 1).toLocaleString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                    })}
                                </div>

                                <div className="admin-cal-nav">
                                    <button type="button" className="admin-cal-nav-btn" onClick={goPrevMonth} disabled={calendarLoading} aria-label="prev month" >
                                        <img src="/Precious (Strock).svg" alt="" />
                                    </button>

                                    <button type="button" className="admin-cal-nav-btn" onClick={goNextMonth} disabled={calendarLoading} aria-label="next month" >
                                        <img src="/Next (Strock).svg" alt="" />
                                    </button>
                                </div>
                            </div>

                            <div className="admin-cal-dow">
                                <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
                            </div>

                            <div className="admin-cal-grid">
                                {weeks.flat().map((c) => {
                                    const ymd = `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
                                    const isSelected = selectedDate === ymd;
                                    const isDisabled = !c.inMonth;
                                    const hasRecord = (recordedMap.get(ymd)?.length ?? 0) > 0;

                                    const style: React.CSSProperties | undefined =
                                        !isDisabled && hasRecord && !isSelected
                                            ? { background: "rgba(0, 102, 255, 0.2)" }
                                            : undefined;
                                    const className = [
                                        "admin-cal-cell",
                                        isDisabled ? "admin-cal-cell--disabled" : "",
                                        isSelected ? "admin-cal-cell--selected" : "",
                                        !isDisabled && hasRecord ? "admin-cal-cell--recorded" : "",
                                    ].filter(Boolean).join(" ");

                                    return (
                                    <button key={`${c.y}-${c.m}-${c.d}`} type="button" className={className} style={style} onClick={() => onPickDay(c.y, c.m, c.d)} disabled={calendarLoading || !selectedStudentId || isDisabled} aria-label={ymd}>
                                        {c.d}
                                    </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {selectedDate && eventDayIdsForSelectedDate.length > 1 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>해당 날짜 기록 선택</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {eventDayIdsForSelectedDate.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setSelectedEventDayId(id)}
                                    style={{
                                    height: 36,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    border: selectedEventDayId === id ? "2px solid var(--primary)" : "1px solid #ddd",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    }}
                                >
                                    eventDay #{id}
                                </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* (C) 우측 탭 */}
                    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <button
                        type="button"
                        onClick={() => setRightTab("SCHEDULE")}
                        style={{
                            height: 54,
                            borderRadius: 10,
                            border: "none",
                            fontWeight: 700,
                            cursor: "pointer",
                            background: rightTab === "SCHEDULE" ? "var(--primary)" : "#D2D2D2",
                            color: rightTab === "SCHEDULE" ? "#fff" : "#000",
                        }}
                        >
                        일정명
                        </button>

                        <button
                            type="button"
                            onClick={() => setRightTab("RESULT")}
                            style={{
                                height: 54,
                                borderRadius: 10,
                                border: "none",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: rightTab === "RESULT" ? "var(--primary)" : "#D2D2D2",
                                color: rightTab === "RESULT" ? "#fff" : "#000",
                            }}
                        >
                        기록 결과
                        </button>
                    </div>

                    {/* (D) 상세 본문 */}
                    <div style={{ marginTop: 16 }}>
                        {!selectedStudentId ? (
                            <div>학생을 선택해주세요.</div>
                            ) : !selectedDate ? (
                            <div>날짜를 선택해주세요.</div>
                            ) : !selectedEventDayId ? (
                            <div>선택한 날짜에는 기록이 없습니다.</div>
                            ) : detailLoading ? (
                            <div>상세 로딩 중...</div>
                            ) : !detail ? (
                            <div>상세 데이터가 없습니다.</div>
                            ) : (
                            <div>
                                {/* 상단 요약 */}
                                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
                                {selectedStudent?.name ?? "학생"} · {selectedDate}
                                </div>

                                {/* 탭별 내용 */}
                                {rightTab === "SCHEDULE" ? (
                                    <div>
                                        <div style={{ fontWeight: 700, marginBottom: 8 }}>
                                        {detail.eventDayTitle || detail.eventTitle || `eventDay #${detail.eventDayId}`}
                                        </div>

                                        <div style={{ background: "#f0f0f0", borderRadius: 10, padding: 16 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 10 }}>질문</div>
                                        {detail.question?.questionList?.length ? (
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {detail.question.questionList.map((q, i) => (
                                                <li key={i} style={{ marginBottom: 6 }}>
                                                {q}
                                                </li>
                                            ))}
                                            </ul>
                                        ) : (
                                            <div>질문 정보가 없습니다.</div>
                                        )}
                                        </div>
                                    </div>
                                    ) : (
                                    <div style={{ background: "#f0f0f0", borderRadius: 10, padding: 16 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 10 }}>기록(전사)</div>

                                        {detail.transcriptions?.length ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {detail.transcriptions.map((t, i) => (
                                                <div key={t.transcriptionId} style={{ background: "#fff", borderRadius: 10, padding: 12 }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Q{i + 1}</div>
                                                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{t.text}</div>

                                                    {t.audioUrl ? (
                                                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                                                        audio: {t.audioUrl}
                                                    </div>
                                                    ) : null}
                                                </div>
                                                ))}
                                            </div>
                                            ) : (
                                            <div>기록이 없습니다.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
