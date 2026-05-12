import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getExternalActivitiesByCenter, getExternalActivitiesByStatus } from "../../../../../api/ea";
import type { ExternalActivityResponse, ExternalActivitiesByStatusResponse } from "../../../../../api/ea";
import type { EcaClientAdminOutletContext } from "../ecaHome";
import "./home.css";

type ActivityStatus = "upcoming" | "ongoing" | "completed" | "delayed";

type ActivityManager = {
    userId?: number;
    name: string;
    profileImage?: string | null;
};

type Activity = {
    id: number;
    title: string;
    date: string;
    status: ActivityStatus;
    managers: ActivityManager[];
};

const activityStatuses: ActivityStatus[] = ["upcoming", "ongoing", "completed", "delayed"];

function formatActivityDate(startDate: string, endDate: string): string {
    return `${startDate.replaceAll("-", ".")} ~ ${endDate.replaceAll("-", ".")}`;
}

function parseApiDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function getTodayDateOnly(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCalculatedActivityStatus(activity: ExternalActivityResponse): ActivityStatus {
    if (activity.progressStatus === "COMPLETED") {
        return "completed";
    }

    const today = getTodayDateOnly();
    const startDate = parseApiDate(activity.startDate);
    const endDate = parseApiDate(activity.endDate);

    if (today.getTime() < startDate.getTime()) {
        return "upcoming";
    }

    if (today.getTime() <= endDate.getTime()) {
        return "ongoing";
    }

    return "delayed";
}

function toHomeActivity(activity: ExternalActivityResponse): Activity {
    const managers: ActivityManager[] = Array.isArray(activity.managers)
        ? activity.managers.map((manager) => ({
            userId: manager.userId,
            name: manager.name,
            profileImage: manager.profileImage ?? null,
        }))
        : Array.isArray(activity.managerNames)
            ? activity.managerNames.map((name) => ({
                name,
                profileImage: null,
            }))
            : [];

    return {
        id: activity.externalActivityId,
        title: activity.name,
        date: formatActivityDate(activity.startDate, activity.endDate),
        status: getCalculatedActivityStatus(activity),
        managers,
    };
}

function isActivityInYear(activity: ExternalActivityResponse, year: string): boolean {
    const yearNumber = Number(year);

    if (!Number.isFinite(yearNumber)) return true;

    const yearStart = new Date(yearNumber, 0, 1);
    const yearEnd = new Date(yearNumber, 11, 31);
    const startDate = parseApiDate(activity.startDate);
    const endDate = parseApiDate(activity.endDate);

    return startDate.getTime() <= yearEnd.getTime() && endDate.getTime() >= yearStart.getTime();
}

function flattenByStatus(response: ExternalActivitiesByStatusResponse, selectedStatuses: ActivityStatus[]): Activity[] {
    return selectedStatuses.flatMap((status) => response[status].map(toHomeActivity));
}

function getDisplayAdminName(me: EcaClientAdminOutletContext["me"]): string {
    if (!me) return "";
    const nick = (me.nickname ?? "").trim();
    const name = (me.name ?? "").trim();

    return nick || name || "";
}

function ManagerProfile({ manager }: { manager: ActivityManager }): React.ReactElement {
    return (
        <div className="eca-home-center-manager">
            <img
                className="eca-home-center-manager-avatar"
                src={manager.profileImage || "/internie_mascot_normal.png"}
                alt=""
            />
            <span>{manager.name}</span>
        </div>
    );
}

export default function EcaAdminHomePage(): React.ReactElement {
    const navigate = useNavigate();
    const { me, center, centerLoading, managedActivities } = useOutletContext<EcaClientAdminOutletContext>();

    const [myActivities, setMyActivities] = React.useState<Activity[]>([]);
    const [centerActivities, setCenterActivities] = React.useState<Activity[]>([]);
    const [selectedStatuses, setSelectedStatuses] = React.useState<ActivityStatus[]>(activityStatuses);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [yearOpen, setYearOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [selectedYear, setSelectedYear] = React.useState("2026");
    
    const [centerSelectedStatuses, setCenterSelectedStatuses] = React.useState<ActivityStatus[]>(activityStatuses);
    const [centerFilterOpen, setCenterFilterOpen] = React.useState(false);
    const [centerYearOpen, setCenterYearOpen] = React.useState(false);
    const [centerSelectedYear, setCenterSelectedYear] = React.useState("2026");
    const [centerSearchOpen, setCenterSearchOpen] = React.useState(false);
    const [centerSearchKeyword, setCenterSearchKeyword] = React.useState("");

    const [statusMenuActivityId, setStatusMenuActivityId] = React.useState<number | null>(null);
    const [managerPopoverActivityId, setManagerPopoverActivityId] = React.useState<number | null>(null);
    const [hoveredManagerPopoverActivityId, setHoveredManagerPopoverActivityId] = React.useState<number | null>(null);
    const [draggingActivityId, setDraggingActivityId] = React.useState<number | null>(null);
    
    const centerScrollRef = React.useRef<HTMLDivElement | null>(null);
    const managerPopoverRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        function handleWheel(e: WheelEvent): void {
            const el = centerScrollRef.current;
            if (!el) return;

            if (e.deltaY === 0) return;

            e.preventDefault();
            el.scrollLeft += e.deltaY;
        }

        const el = centerScrollRef.current;
        if (!el) return;

        el.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            el.removeEventListener("wheel", handleWheel);
        };
    }, []);

    React.useEffect(() => {
        if (managerPopoverActivityId === null) return;

        function handleMouseDown(e: MouseEvent): void {
            if (!managerPopoverRef.current) return;
            if (managerPopoverRef.current.contains(e.target as Node)) return;
            setManagerPopoverActivityId(null);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [managerPopoverActivityId]);

    function changeMyActivityStatus(activityId: number, status: ActivityStatus): void {
        setMyActivities((prev) => prev.map((item) => item.id === activityId ? { ...item, status } : item));
        setStatusMenuActivityId(null);
    }

    function handleDropToStatus(status: ActivityStatus): void {
        if (draggingActivityId === null) return;
        changeMyActivityStatus(draggingActivityId, status);
        setDraggingActivityId(null);
    }

    React.useEffect(() => {
        loadMyActivities();
    }, [managedActivities, selectedStatuses, selectedYear, searchKeyword]);

    React.useEffect(() => {
        loadCenterActivities();
    }, [center?.centerId, centerSelectedStatuses, centerSelectedYear, centerSearchKeyword]);

    function loadMyActivities(): void {
        const keyword = searchKeyword.trim().toLowerCase();

        const filtered = managedActivities
            .filter((activity) => selectedStatuses.includes(getCalculatedActivityStatus(activity)))
            .filter((activity) => !keyword || activity.name.toLowerCase().includes(keyword))
            .filter((activity) => isActivityInYear(activity, selectedYear));

        setMyActivities(filtered.map(toHomeActivity));
    }

    async function loadCenterActivities(): Promise<void> {
        if (!center?.centerId) {
            setCenterActivities([]);
            return;
        }

        try {
            const isAllStatusSelected = centerSelectedStatuses.length === activityStatuses.length;
            const name = centerSearchKeyword.trim() || undefined;
            const year = centerSelectedYear || undefined;

            if (isAllStatusSelected) {
                const result = await getExternalActivitiesByCenter(center.centerId, {
                    year,
                    name,
                });

                setCenterActivities(result.map(toHomeActivity));
                return;
            }

            const result = await getExternalActivitiesByStatus(center.centerId, {
                year,
                name,
            });

            setCenterActivities(flattenByStatus(result, centerSelectedStatuses));
        } catch (error) {
            setCenterActivities([]);
        }
    }

    interface HomeToolbarProps {
        selectedStatuses: ActivityStatus[];
        selectedYear: string;
        filterOpen: boolean;
        yearOpen: boolean;
        searchOpen: boolean;
        searchKeyword: string;
        onToggleFilter: () => void;
        onToggleYear: () => void;
        onToggleSearch: () => void;
        onToggleStatus: (status: ActivityStatus) => void;
        onSelectYear: (year: string) => void;
        onChangeSearchKeyword: (value: string) => void;
        onResetSearchKeyword: () => void;
        onClose: () => void;
    }

    function HomeToolbar({
        selectedStatuses,
        selectedYear,
        filterOpen,
        yearOpen,
        searchOpen,
        searchKeyword,
        onToggleFilter,
        onToggleYear,
        onToggleSearch,
        onToggleStatus,
        onSelectYear,
        onChangeSearchKeyword,
        onResetSearchKeyword,
        onClose,
    }: HomeToolbarProps): React.ReactElement {
        const toolbarRef = React.useRef<HTMLDivElement | null>(null);

        React.useEffect(() => {
            if (!filterOpen && !yearOpen && !searchOpen) return;

            function handleMouseDown(e: MouseEvent): void {
                if (!toolbarRef.current) return;
                if (toolbarRef.current.contains(e.target as Node)) return;
                onClose();
            }

            document.addEventListener("mousedown", handleMouseDown);

            return () => {
                document.removeEventListener("mousedown", handleMouseDown);
            };
        }, [filterOpen, yearOpen, searchOpen, onClose]);

        return (
            <div className="eca-home-toolbar" ref={toolbarRef}>
                <div className="eca-home-toolbar-item">
                    <button type="button" className="eca-home-icon-button" onClick={onToggleFilter} aria-label="필터 열기">
                        <img src={selectedStatuses.length === activityStatuses.length ? "/icons/mynaui_filter_a0.svg" : "/icons/mynaui_filter_dot_a0.svg"} alt="" />
                    </button>

                    {filterOpen ? (
                        <div className="eca-home-filter-popover">
                            {activityStatuses.map((status) => (
                                <button type="button" key={status} className="eca-home-filter-option" onClick={() => onToggleStatus(status)}>
                                    <img
                                        className="eca-home-filter-radio"
                                        src={
                                            selectedStatuses.length === activityStatuses.length
                                                ? "/icons/filter_selected_all.svg"
                                                : selectedStatuses.includes(status)
                                                    ? "/icons/filter_selected_one.svg"
                                                    : "/icons/filter_selected_none.svg"
                                        }
                                        alt=""
                                    />
                                    <span>{status}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="eca-home-search-wrap">
                    <button type="button" className="eca-home-icon-button" onClick={onToggleSearch} aria-label="검색">
                        <img src="/icons/search-01-a0.svg" alt="" />
                    </button>

                    {searchOpen ? (
                        <div className="eca-home-search-popover">
                            <input
                                className="eca-home-search-input"
                                value={searchKeyword}
                                onChange={(e) => onChangeSearchKeyword(e.target.value)}
                                autoFocus
                            />
                            <button type="button" className="eca-home-search-reset" onClick={onResetSearchKeyword}>
                                초기화
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="eca-home-year-wrap">
                    <button type="button" className={yearOpen ? "eca-home-year-button eca-home-year-button--open" : "eca-home-year-button"} onClick={onToggleYear}>
                        <span>{selectedYear}</span>
                        <img className="eca-home-year-arrow" src="/icons/chevron-down-80.svg" alt="" />
                    </button>

                    {yearOpen ? (
                        <div className="eca-home-year-popover">
                            {["2026", "2025", "2024"].map((year) => (
                                <button type="button" key={year} className={selectedYear === year ? "eca-home-year-option eca-home-year-option--active" : "eca-home-year-option"} onClick={() => onSelectYear(year)}>
                                    {year}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    function getStatusCount(activities: Activity[], status: ActivityStatus): number {
        return activities.filter((item) => item.status === status).length;
    }

    function toggleStatus(current: ActivityStatus[], status: ActivityStatus): ActivityStatus[] {
        const next = current.includes(status)
            ? current.filter((item) => item !== status)
            : [...current, status];

        return activityStatuses.filter((item) => next.includes(item));
    }

    const adminName = getDisplayAdminName(me);

    return (
        <div className="eca-home-page">
            <section className="eca-home-header">
                <div className="eca-home-header-top">
                    <h1>{centerLoading ? "센터 정보를 불러오는 중" : center?.name ?? "센터 이름"}</h1>
                </div>

                <div className="eca-home-header-bottom">
                    <p>환영합니다, {adminName ? `${adminName} 관리자님` : "관리자님"}</p>

                    <button type="button" className="eca-home-add-button" onClick={() => navigate("/eca-admin/activities/new")} >
                        + 대외활동 등록
                    </button>
                </div>
            </section>

            <section className="eca-home-mypanel">
                <div className="eca-home-mypanel-head">
                    <h2>나의 대외활동</h2>
                    <HomeToolbar
                        selectedStatuses={selectedStatuses}
                        selectedYear={selectedYear}
                        filterOpen={filterOpen}
                        yearOpen={yearOpen}
                        searchOpen={searchOpen}
                        searchKeyword={searchKeyword}
                        onToggleFilter={() => {
                            setFilterOpen((prev) => !prev);
                            setYearOpen(false);
                            setSearchOpen(false);
                        }}
                        onToggleYear={() => {
                            setYearOpen((prev) => !prev);
                            setFilterOpen(false);
                            setSearchOpen(false);
                        }}
                        onToggleSearch={() => {
                            setSearchOpen((prev) => !prev);
                            setFilterOpen(false);
                            setYearOpen(false);
                        }}
                        onToggleStatus={(status) => {
                            setSelectedStatuses((prev) => toggleStatus(prev, status));
                        }}
                        onSelectYear={(year) => {
                            setSelectedYear(year);
                            setYearOpen(false);
                        }}
                        onChangeSearchKeyword={setSearchKeyword}
                        onResetSearchKeyword={() => setSearchKeyword("")}
                        onClose={() => {
                            setFilterOpen(false);
                            setYearOpen(false);
                            setSearchOpen(false);
                        }}
                    />
                </div>

                <div className={selectedStatuses.length === activityStatuses.length ? "eca-home-status-row" : "eca-home-status-row eca-home-status-row--filtered"}>
                    {selectedStatuses.map((status) => (
                        <div
                            key={status}
                            className="eca-home-status-column"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropToStatus(status)}
                        >
                            <span className={`eca-home-status eca-home-status--${status}`}>
                                {status} ({getStatusCount(myActivities, status)})
                            </span>
                        </div>
                    ))}
                </div>

                <div className="eca-home-my-grid">
                    {myActivities.length === 0 ? (
                        <div className="eca-home-empty">데이터가 없습니다</div>
                    ) : (
                        selectedStatuses.map((status) => (
                            <div
                                key={status}
                                className="eca-home-card-column"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropToStatus(status)}
                            >
                                {myActivities.filter((item) => item.status === status).map((item) => (
                                    <div key={item.id} className="eca-home-my-card">
                                        <div
                                            className="eca-home-card-drag-handle"
                                            draggable
                                            onDragStart={() => setDraggingActivityId(item.id)}
                                            onDragEnd={() => setDraggingActivityId(null)}
                                        />

                                        <div className={`eca-home-card-dot eca-home-card-dot--${item.status}`} />

                                        <button
                                            type="button"
                                            className="eca-home-card-menu-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStatusMenuActivityId((prev) => prev === item.id ? null : item.id);
                                            }}
                                        >
                                            <img src="/icons/eca-home-card-menu-button.svg" alt="" />
                                        </button>

                                        {statusMenuActivityId === item.id ? (
                                            <div className="eca-home-status-menu">
                                                {activityStatuses.map((statusItem) => (
                                                    <button
                                                        type="button"
                                                        key={statusItem}
                                                        className={`eca-home-status-menu-option eca-home-status-menu-option--${statusItem}`}
                                                        onClick={() => changeMyActivityStatus(item.id, statusItem)}
                                                    >
                                                        {statusItem}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}

                                        <h3 className="eca-home-my-card-title">{item.title}</h3>
                                        <p className="eca-home-my-card-date">{item.date}</p>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="eca-home-centerpanel">
                <div className="eca-home-centerpanel-head">
                    <h2>센터 전체 대외활동</h2>
                    <HomeToolbar
                        selectedStatuses={centerSelectedStatuses}
                        selectedYear={centerSelectedYear}
                        filterOpen={centerFilterOpen}
                        yearOpen={centerYearOpen}
                        searchOpen={centerSearchOpen}
                        searchKeyword={centerSearchKeyword}
                        onToggleFilter={() => {
                            setCenterFilterOpen((prev) => !prev);
                            setCenterYearOpen(false);
                            setCenterSearchOpen(false);
                            setFilterOpen(false);
                            setYearOpen(false);
                            setSearchOpen(false);
                        }}
                        onToggleYear={() => {
                            setCenterYearOpen((prev) => !prev);
                            setCenterFilterOpen(false);
                            setCenterSearchOpen(false);
                            setFilterOpen(false);
                            setYearOpen(false);
                            setSearchOpen(false);
                        }}
                        onToggleSearch={() => {
                            setCenterSearchOpen((prev) => !prev);
                            setCenterFilterOpen(false);
                            setCenterYearOpen(false);
                            setFilterOpen(false);
                            setYearOpen(false);
                            setSearchOpen(false);
                        }}
                        onToggleStatus={(status) => {
                            setCenterSelectedStatuses((prev) => toggleStatus(prev, status));
                        }}
                        onSelectYear={(year) => {
                            setCenterSelectedYear(year);
                            setCenterYearOpen(false);
                        }}
                        onChangeSearchKeyword={setCenterSearchKeyword}
                        onResetSearchKeyword={() => setCenterSearchKeyword("")}
                        onClose={() => {
                            setCenterFilterOpen(false);
                            setCenterYearOpen(false);
                            setCenterSearchOpen(false);
                        }}
                    />
                </div>

                <div className="eca-home-center-scroll" ref={centerScrollRef}>
                    {centerActivities.length === 0 ? (
                        <div className="eca-home-empty">데이터가 없습니다</div>
                    ) : (
                        centerActivities.map((item) => (
                            <div key={item.id} className="eca-home-center-card">
                                <div className={`eca-home-card-dot eca-home-card-dot--${item.status}`} />
                                <h3>{item.title}</h3>
                                <p>{item.date}</p>
                                <div className="eca-home-center-manager-row">
                                    {item.managers.slice(0, 2).map((manager, index) => (
                                        <ManagerProfile
                                            key={`${item.id}-${manager.userId ?? manager.name}-${index}`}
                                            manager={manager}
                                        />
                                    ))}
                                </div>

                                {item.managers.length > 2 ? (
                                    <div
                                        className="eca-home-center-more-wrap"
                                        ref={managerPopoverActivityId === item.id ? managerPopoverRef : null}
                                        onMouseEnter={() => setHoveredManagerPopoverActivityId(item.id)}
                                        onMouseLeave={() => setHoveredManagerPopoverActivityId(null)}
                                    >
                                        <button
                                            type="button"
                                            className="eca-home-more-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setManagerPopoverActivityId((prev) => prev === item.id ? null : item.id);
                                            }}
                                        >
                                            <img className="eca-home-more-button-icon" src="/icons/eca-home-card-menu-button-00.svg" alt="" />
                                            <span className="eca-home-more-button-title">더보기</span>
                                        </button>

                                        {(managerPopoverActivityId === item.id || hoveredManagerPopoverActivityId === item.id) ? (
                                            <div className="eca-home-manager-popover">
                                                {item.managers.slice(2).map((manager, index) => (
                                                    <ManagerProfile
                                                        key={`${item.id}-${manager.userId ?? manager.name}-${index}`}
                                                        manager={manager}
                                                    />
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}