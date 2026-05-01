import React from "react";
import { useNavigate } from "react-router-dom";
import { createExternalActivity, } from "../../../../../api/client";
import "./createEca.css"; 

type Manager = {
    id: number;
    name: string;
    position: string;
};

type CenterInfo = {
    id: number;
    name: string;
};

const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const CENTER_ID = 1;
function toApiDate(value: string): string {
    return value.replaceAll(".", "-");
}
function stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMonthGrid(cursor: Date): { month: number; days: Date[] } {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDate = new Date(year, month, 1);
    const firstDay = firstDate.getDay();
    const mondayIndex = firstDay === 0 ? 6 : firstDay - 1;
    const startDate = new Date(year, month, 1 - mondayIndex);
    const lastDate = new Date(year, month + 1, 0);
    const lastDay = lastDate.getDay();
    const sundayIndex = lastDay === 0 ? 0 : 7 - lastDay;
    const totalDays = mondayIndex + lastDate.getDate() + sundayIndex;
    const normalizedTotalDays = totalDays <= 35 ? 35 : 42;
    const days = Array.from({ length: normalizedTotalDays }, (_, index) => new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index));

    return { month, days };
}

function CalendarRange({
    mode,
    startDate,
    endDate,
    onChangeStart,
    onChangeEnd,
    onClose,
    resetKey,
}: {
    mode: "range" | "startOnly" | "endOnly";
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onClose: () => void;
    resetKey: number;
}): React.ReactElement {
    const s = stripTime(startDate);
    const e = stripTime(endDate);
    const sameDay = isSameDay(s, e);
    const [cursor, setCursor] = React.useState(() => new Date(s.getFullYear(), s.getMonth(), 1));
    const [focus, setFocus] = React.useState<"start" | "end">("start");

    React.useEffect(() => {
        setFocus("start");
    }, [resetKey]);

    React.useEffect(() => {
        setCursor(new Date(s.getFullYear(), s.getMonth(), 1));
    }, [s.getFullYear(), s.getMonth()]);

    React.useEffect(() => {
        if (mode === "range") setFocus("start");
        if (mode === "startOnly") setFocus("start");
        if (mode === "endOnly") setFocus("end");
    }, [mode]);

    const { month, days } = getMonthGrid(cursor);
    const isSixWeeks = days.length === 42;
    const monthLabel = cursor.toLocaleString("en-US", { month: "long" });
    const title = `${monthLabel} ${cursor.getFullYear()}`;

    const inRange = (d: Date): boolean => {
        const x = stripTime(d).getTime();
        return x >= s.getTime() && x <= e.getTime();
    };

    const handlePick = (picked: Date): void => {
        const pickedDate = stripTime(picked);

        if (mode === "startOnly") {
            onChangeStart(pickedDate);
            onClose();
            return;
        }

        if (mode === "endOnly") {
            if (pickedDate.getTime() < s.getTime()) {
                onChangeStart(pickedDate);
                onChangeEnd(pickedDate);
                onClose();
                return;
            }

            onChangeEnd(pickedDate);
            onClose();
            return;
        }

        if (focus === "start") {
            onChangeStart(pickedDate);
            onChangeEnd(pickedDate);
            setFocus("end");
            return;
        }

        if (pickedDate.getTime() < s.getTime()) {
            onChangeStart(pickedDate);
            onChangeEnd(s);
            setFocus("end");
            return;
        }

        onChangeEnd(pickedDate);
        setFocus("start");
    };

    return (
        <div className={"cal" + (isSixWeeks ? " cal--6w" : " cal--5w")}>
            <div className="cal-header">
                <div className="cal-header-bottom">
                    <div className="cal-title">{title}</div>
                    <div className="cal-nav">
                        <button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="이전 달">
                            <img className="icon" src="/icons/Previous (Stroke).svg" alt="" />
                        </button>
                        <button type="button" className="cal-nav-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="다음 달">
                            <img className="icon" src="/icons/Next (Stroke).svg" alt="" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="cal-body">
                <div className="cal-week">
                    {WEEK_LABELS.map((w) => (
                        <div key={w} className="cal-weekday">{w}</div>
                    ))}
                </div>

                <div className="cal-grid">
                    {days.map((d) => {
                        const inMonth = d.getMonth() === month;
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

                        if (!inMonth) {
                            return <div key={key} className="cal-cell cal-cell--empty" aria-hidden="true" />;
                        }

                        const day = stripTime(d);
                        const isStart = isSameDay(day, s);
                        const isEnd = isSameDay(day, e);
                        const between = !sameDay && inRange(day);
                        const showRange = !sameDay && (between || isStart || isEnd);

                        return (
                            <div key={key} className={"cal-cell" + (between ? " is-inrange" : "") + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "")}>
                                {showRange && <div className="cal-range" aria-hidden="true" />}
                                <button type="button" className={"cal-day" + ((sameDay && isSameDay(day, s)) ? " is-selected" : "") + (isStart || isEnd ? " is-selected" : "")} onClick={() => handlePick(day)}>
                                    {day.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function EcaActivityCreatePage(): React.ReactElement {
    const navigate = useNavigate();
    const [center, setCenter] = React.useState<CenterInfo | null>(null);
    const [managers, setManagers] = React.useState<Manager[]>([]);
    const [selectedManagerIds, setSelectedManagerIds] = React.useState<number[]>([]);
    const [managerModalOpen, setManagerModalOpen] = React.useState(false);
    const [managerSearch, setManagerSearch] = React.useState("");
    const [managerDropdownOpen, setManagerDropdownOpen] = React.useState(false);
    const [managerInputFocused, setManagerInputFocused] = React.useState(false);

    const [activityName, setActivityName] = React.useState("");
    const [startDate, setStartDate] = React.useState<string | null>(null);
    const [endDate, setEndDate] = React.useState<string | null>(null);

    const [datePickerTarget, setDatePickerTarget] = React.useState<"start" | "end" | null>(null);
    const calendarWrapRef = React.useRef<HTMLDivElement | null>(null);
    const managerSearchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const [planFile, setPlanFile] = React.useState<File | null>(null);
    const planFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [submitError, setSubmitError] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        async function fetchInitData(): Promise<void> {
            setManagers([
                { id: 1, name: "담당자B", position: "행복기획팀 팀장" },
                { id: 2, name: "담당자C", position: "전략기획팀 팀장" },
                { id: 3, name: "담당자D", position: "혁신전략팀 매니저" },
                { id: 4, name: "담당자E", position: "미래기획팀 책임자" },
                { id: 5, name: "담당자F", position: "미래전략본부장" },
            ]);

            // try {
            //     // TODO: 백엔드 연결 예정
            //     // const centerRes = await api("/centers/me");
            //     // const managersRes = await api("/centers/me/managers");

            //     // setCenter(centerRes);
            //     // setManagers(managersRes);

            // } catch (e) {
            //     console.error(e);
            // }
        }

        fetchInitData();
    }, []);

    React.useEffect(() => {
        if (!datePickerTarget) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!calendarWrapRef.current) return;
            if (calendarWrapRef.current.contains(e.target as Node)) return;
            setDatePickerTarget(null);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [datePickerTarget]);


    function toggleManager(id: number): void {
        setSelectedManagerIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
        setManagerSearch("");
    }

    function clearManagers(): void {
        setSelectedManagerIds([]);
        setManagerSearch("");
    }

    function selectAllManagers(): void {
        setSelectedManagerIds(managers.map((manager) => manager.id));
        setManagerSearch("");
    }

    function getSelectedManagerText(): string {
        if (selectedManagerIds.length === 0) return "담당자를 선택하세요";

        const selectedManagers = managers.filter((manager) => selectedManagerIds.includes(manager.id));

        if (selectedManagers.length === 0) return "담당자를 선택하세요";
        if (selectedManagers.length === 1) return selectedManagers[0].name;

        return `${selectedManagers[0].name} 외 ${selectedManagers.length - 1}명`;
    }
    function getSelectedManagerInputValue(): string {
        const selectedManagers = managers.filter((manager) => selectedManagerIds.includes(manager.id));

        return selectedManagers.map((manager) => `@ ${manager.name}`).join(", ");
    }

    const filteredManagers = managers.filter((manager) =>
        manager.name.toLowerCase().includes(managerSearch.trim().toLowerCase()) ||
        manager.position.toLowerCase().includes(managerSearch.trim().toLowerCase())
    );

    function handlePlanFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0] ?? null;

        setPlanFile(file);
    }

    async function handleSubmit(): Promise<void> {
        if (!activityName.trim()) {
            setSubmitError("대외활동명을 입력해주세요.");
            return;
        }

        if (!startDate || !endDate) {
            setSubmitError("활동 기간을 선택해주세요.");
            return;
        }

        if (selectedManagerIds.length === 0) {
            setSubmitError("담당자를 선택해주세요.");
            return;
        }

        if (!planFile) {
            setSubmitError("활동 계획서를 업로드해주세요.");
            return;
        }

        setSubmitting(true);
        setSubmitError("");

        try {
            await createExternalActivity(CENTER_ID, {
                name: activityName.trim(),
                description: null,
                startDate: toApiDate(startDate),
                endDate: toApiDate(endDate),
                activityPlanUrl: null,
                participantUserIds: [],
                managerUserIds: selectedManagerIds,
            });

            navigate("/eca-admin");
        } catch (error) {
            setSubmitError("대외활동 생성에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    function formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}.${month}.${day}`;
    }

    function parseDate(value: string | null, fallback?: string | null): Date {
        const target = value ?? fallback;

        if (!target) return new Date();

        const [year, month, day] = target.split(".").map(Number);

        return new Date(year, month - 1, day);
    }

    function closeManagerModal(): void {
        setManagerSearch("");
        setManagerDropdownOpen(false);
        setManagerModalOpen(false);
    }

    function handleManagerModalMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
        e.stopPropagation();

        if (!managerDropdownOpen) return;
        if (managerSearchWrapRef.current?.contains(e.target as Node)) return;

        setManagerInputFocused(false);
        setManagerDropdownOpen(false);
    }


    return (
        <>
            <div className="eca-create-page">
                <section className="eca-create-header">
                    <h1>{center?.name ?? ""}</h1>
                    <div className="eca-create-title-row">
                        <h2>대외활동 생성</h2>
                        <button type="button" className="eca-create-temp-button" disabled>임시저장</button>
                    </div>
                </section>

                <section className="eca-create-card">
                    <div className="eca-create-step-bars">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>

                    <p className="eca-create-step-text">1/4 단계</p>

                    <div className="eca-create-form">
                        <label className="eca-create-field">
                            <span>대외활동명<b>*</b></span>
                            <input
                                type="text"
                                value={activityName}
                                onChange={(e) => setActivityName(e.target.value)}
                                placeholder="내용을 입력하세요"
                            />
                        </label>

                        <div className="eca-create-field">
                            <span>활동 기간<b>*</b></span>
                            <div className="eca-create-date-row" ref={calendarWrapRef}>
                                <div className="eca-create-date-input-wrap">
                                    <button type="button" className={"eca-create-date-button" + (startDate ? " is-filled" : "")} onClick={() => setDatePickerTarget((prev) => prev === "start" ? null : "start")}>
                                        <span>{startDate ?? "시작일"}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "start" ? (
                                        <div className="eca-create-calendar-popover">
                                            <CalendarRange
                                                mode="startOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
                                                onChangeStart={(date) => {
                                                    const next = formatDate(date);
                                                    setStartDate(next);

                                                    if (endDate && parseDate(endDate).getTime() < date.getTime()) {
                                                        setEndDate(next);
                                                    }

                                                    setDatePickerTarget(null);
                                                }}
                                                onChangeEnd={(date) => setEndDate(formatDate(date))}
                                                onClose={() => setDatePickerTarget(null)}
                                                resetKey={datePickerTarget === "start" ? 1 : 0}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                <span className="eca-create-date-separator">~</span>

                                <div className="eca-create-date-input-wrap">
                                    <button type="button" className={"eca-create-date-button" + (endDate ? " is-filled" : "")} onClick={() => setDatePickerTarget((prev) => prev === "end" ? null : "end")}>
                                        <span>{endDate ?? "종료일"}</span>
                                        <img src="/icons/calendar-07-80.svg" alt="" />
                                    </button>

                                    {datePickerTarget === "end" ? (
                                        <div className="eca-create-calendar-popover eca-create-calendar-popover--end">
                                            <CalendarRange
                                                mode="endOnly"
                                                startDate={parseDate(startDate)}
                                                endDate={parseDate(endDate, startDate)}
                                                onChangeStart={(date) => setStartDate(formatDate(date))}
                                                onChangeEnd={(date) => {
                                                    setEndDate(formatDate(date));
                                                    setDatePickerTarget(null);
                                                }}
                                                onClose={() => setDatePickerTarget(null)}
                                                resetKey={datePickerTarget === "end" ? 1 : 0}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="eca-create-field eca-create-field--manager">
                            <span>담당자 지정<b>*</b></span>

                            <button type="button" className={"eca-create-manager-box" + (selectedManagerIds.length > 0 ? " is-filled" : "")} onClick={() => setManagerModalOpen(true)}>
                                <span className="eca-create-manager-placeholder">
                                    {getSelectedManagerText()}
                                </span>

                                <span className="eca-create-manager-head">
                                    <span className="eca-create-manager-button-text">
                                        {selectedManagerIds.length > 0 ? "편집" : "선택"}
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="eca-create-field">
                            <span>활동 계획서<b>*</b></span>

                            <input
                                ref={planFileInputRef}
                                type="file"
                                className="eca-create-file-input"
                                onChange={handlePlanFileChange}
                                accept=".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx"
                            />

                            <button
                                type="button"
                                className={"eca-create-upload-button" + (planFile ? " is-filled" : "")}
                                onClick={() => planFileInputRef.current?.click()}
                            >
                                {planFile ? planFile.name : "업로드 하기"}
                            </button>
                        </div>
                    </div>

                    <div className="eca-create-bottom">
                        {submitError ? (
                            <p className="eca-create-submit-error">{submitError}</p>
                        ) : null}
                        <button type="button" onClick={handleSubmit} className="eca-create-save-button" disabled={submitting}>
                            {submitting ? "저장 중" : "저장"}
                        </button>
                    </div>
                </section>
            </div>
            {managerModalOpen ? (
                <div className="eca-manager-modal-backdrop" onMouseDown={closeManagerModal}>
                    <div className="eca-manager-modal" onMouseDown={handleManagerModalMouseDown}>
                        <div className="eca-manager-modal-header">
                            <h3>담당자 지정</h3>

                            <button type="button" className="eca-manager-modal-close" onClick={closeManagerModal} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <div className="eca-manager-modal-body">
                            <strong className="eca-manager-modal-title">담당자를 선택하세요</strong>

                            <div className="eca-manager-search-wrap" ref={managerSearchWrapRef}>
                                <input
                                    type="text"
                                    value={managerInputFocused ? managerSearch : getSelectedManagerInputValue()}
                                    onFocus={() => {
                                        setManagerInputFocused(true);
                                        setManagerSearch("");
                                        setManagerDropdownOpen(true);
                                    }}
                                    onBlur={() => {
                                        setManagerInputFocused(false);
                                    }}
                                    onChange={(e) => {
                                        setManagerSearch(e.target.value);
                                        setManagerDropdownOpen(true);
                                    }}
                                    placeholder="@ 담당자A"
                                />

                                {managerDropdownOpen ? (
                                    <div className="eca-manager-dropdown">
                                        <div className="eca-manager-dropdown-top">
                                            <span>{selectedManagerIds.length}명 / {managers.length}명</span>

                                            <div className="eca-manager-dropdown-actions">
                                                <button type="button" onClick={clearManagers}>초기화</button>
                                                <button type="button" onClick={selectAllManagers}>전체선택</button>
                                            </div>
                                        </div>

                                        <div className="eca-manager-dropdown-list">
                                            {filteredManagers.map((manager) => {
                                                const checked = selectedManagerIds.includes(manager.id);

                                                return (
                                                    <label key={manager.id} className={"eca-manager-option" + (checked ? " is-selected" : "")}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleManager(manager.id)} />

                                                        <span className="eca-manager-avatar" />

                                                        <strong>{manager.name}</strong>

                                                        <small>{manager.position}</small>
                                                    </label>
                                                );
                                            })}

                                            {filteredManagers.length === 0 ? (
                                                <p className="eca-manager-empty">검색 결과가 없습니다.</p>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="eca-manager-modal-footer">
                            <button type="button" className="eca-manager-confirm-button" onClick={closeManagerModal}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}