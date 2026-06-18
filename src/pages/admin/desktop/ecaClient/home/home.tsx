import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getExternalActivitiesByOrganization, getExternalActivitiesByStatus, updateExternalActivityStatus } from "../../../../../api/ea";
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
const ORGANIZATION_DISPLAY_LABEL = "ecaAdmin.organizationDisplayLabel";

function formatDatePart(value: string, language: string): string {
    const [year, month, day] = value.split("-").map(Number);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    if (language.startsWith("en")) {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(new Date(year, month - 1, day));
    }

    return `${year}.${mm}.${dd}`;
}

function formatActivityDate(startDate: string, endDate: string, language: string): string {
    const separator = language.startsWith("en") ? " - " : " ~ ";

    return `${formatDatePart(startDate, language)}${separator}${formatDatePart(endDate, language)}`;
}

function parseApiDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function getCalculatedActivityStatus(activity: ExternalActivityResponse): ActivityStatus {
    if (activity.progressStatus === "UPCOMING") return "upcoming";
    if (activity.progressStatus === "ONGOING") return "ongoing";
    if (activity.progressStatus === "COMPLETED") return "completed";
    return "delayed";
}

function getActivityStatusLabel(status: ActivityStatus): string {
    if (status === "upcoming") return "ecaAdmin.status.upcoming";
    if (status === "ongoing") return "ecaAdmin.status.ongoing";
    if (status === "completed") return "ecaAdmin.status.completed";
    return "ecaAdmin.status.delayed";
}

function toHomeActivity(activity: ExternalActivityResponse, language: string): Activity {
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
        date: formatActivityDate(activity.startDate, activity.endDate, language),
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

function flattenByStatus(response: ExternalActivitiesByStatusResponse, selectedStatuses: ActivityStatus[], language: string): Activity[] {
    return selectedStatuses.flatMap((status) => response[status].map((activity) => toHomeActivity(activity, language)));
}

function getDisplayAdminName(me: EcaClientAdminOutletContext["me"]): string {
    if (!me) return "";

    const name = (me.name ?? "").trim();
    const nick = (me.nickname ?? "").trim();

    if (name && nick && name !== nick) return `${name} (${nick})`;

    return name || nick || "";
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
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const organizationDisplayLabel = t(ORGANIZATION_DISPLAY_LABEL);
    const { me, organizations, organization, selectedOrganizationId, organizationLoading, managedActivities, setSelectedOrganizationId, } = useOutletContext<EcaClientAdminOutletContext>();

    const [organizationSelectOpen, setOrganizationSelectOpen] = React.useState(false);
    const organizationSelectRef = React.useRef<HTMLDivElement | null>(null);

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
    const [draggingActivityId, setDraggingActivityId] = React.useState<number | null>(null);
    const draggedCardRef = React.useRef(false);

    const centerScrollRef = React.useRef<HTMLDivElement | null>(null);
    const managerPopoverRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!organizationSelectOpen) return;

        function handleMouseDown(e: MouseEvent): void {
            if (organizationSelectRef.current?.contains(e.target as Node)) return;

            setOrganizationSelectOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown, true);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
        };
    }, [organizationSelectOpen]);

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

    async function changeMyActivityCompletion(activityId: number, completed: boolean): Promise<void> {
        if (!organization?.organizationId) {
            return;
        }

        const previousActivities = myActivities;

        setMyActivities((prev) =>
            prev.map((item) =>
                item.id === activityId
                    ? {
                        ...item,
                        status: completed
                            ? "completed"
                            : item.status,
                    }
                    : item
            )
        );

        setStatusMenuActivityId(null);

        try {
            const updated = await updateExternalActivityStatus(organization.organizationId, activityId, {
                completed,
            });

            setMyActivities((prev) =>
                prev.map((item) =>
                    item.id === activityId
                        ? {
                            ...item,
                            status: getCalculatedActivityStatus(updated),
                        }
                        : item
                )
            );
        } catch (error) {
            console.error(error);
            setMyActivities(previousActivities);
            window.alert(t("ecaAdmin.updateActivityStatusFailed"));
        }
    }

    async function handleDropToStatus(status: ActivityStatus): Promise<void> {
        if (draggingActivityId === null) {
            return;
        }

        const draggingActivity = myActivities.find((activity) => activity.id === draggingActivityId);

        if (!draggingActivity) {
            setDraggingActivityId(null);
            return;
        }

        if (status === "completed") {
            await changeMyActivityCompletion(draggingActivityId, true);
            setDraggingActivityId(null);
            return;
        }

        if (draggingActivity.status === "completed") {
            await changeMyActivityCompletion(draggingActivityId, false);
        }

        setDraggingActivityId(null);
    }

    React.useEffect(() => {
        loadMyActivities();
    }, [managedActivities, selectedOrganizationId, selectedStatuses, selectedYear, searchKeyword, i18n.language]);

    React.useEffect(() => {
        loadCenterActivities();
    }, [organization?.organizationId, centerSelectedStatuses, centerSelectedYear, centerSearchKeyword, i18n.language]);

    function loadMyActivities(): void {
        const keyword = searchKeyword.trim().toLowerCase();

        const filtered = managedActivities
            .filter((activity) => !selectedOrganizationId || activity.organizationId === selectedOrganizationId)
            .filter((activity) => selectedStatuses.includes(getCalculatedActivityStatus(activity)))
            .filter((activity) => !keyword || activity.name.toLowerCase().includes(keyword))
            .filter((activity) => isActivityInYear(activity, selectedYear));

        setMyActivities(filtered.map((activity) => toHomeActivity(activity, i18n.language)));
    }
    const selectedOrganizationIdRef = React.useRef<number | null>(selectedOrganizationId);
    React.useEffect(() => {
        selectedOrganizationIdRef.current = selectedOrganizationId;
    }, [selectedOrganizationId]);

    async function loadCenterActivities(): Promise<void> {
        const requestOrganizationId = organization?.organizationId;

        if (!requestOrganizationId) {
            setCenterActivities([]);
            return;
        }

        setCenterActivities([]);

        try {
            const isAllStatusSelected = centerSelectedStatuses.length === activityStatuses.length;
            const name = centerSearchKeyword.trim() || undefined;
            const year = centerSelectedYear || undefined;

            if (isAllStatusSelected) {
                const result = await getExternalActivitiesByOrganization(requestOrganizationId, {
                    year,
                    name,
                });

                if (selectedOrganizationIdRef.current !== requestOrganizationId) return;

                setCenterActivities(result.map((activity) => toHomeActivity(activity, i18n.language)));
                return;
            }

            const result = await getExternalActivitiesByStatus(requestOrganizationId, {
                year,
                name,
            });

            if (selectedOrganizationIdRef.current !== requestOrganizationId) return;

            setCenterActivities(flattenByStatus(result, centerSelectedStatuses, i18n.language));
        } catch (error) {
            console.error(error);

            if (selectedOrganizationIdRef.current === requestOrganizationId) {
                setCenterActivities([]);
            }
        }
    }

    function handleMyActivityCardClick(activityId: number): void {
        if (draggedCardRef.current) {
            draggedCardRef.current = false;
            return;
        }

        navigate(`/program-admin/activities/${activityId}/dashboard`);
    }

    function handleCenterActivityCardClick(activityId: number): void {
        navigate(`/program-admin/activities/${activityId}/dashboard`);
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
                                    <span>{t(getActivityStatusLabel(status))}</span>
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
                            <input className="eca-home-search-input" value={searchKeyword} onChange={(e) => onChangeSearchKeyword(e.target.value)} autoFocus />
                            <button type="button" className="eca-home-search-reset" onClick={onResetSearchKeyword}>
                                {t("ecaAdmin.reset")}
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
                    {organizationLoading ? (
                        <h1>{t("ecaAdmin.organizationLoading", { organizationLabel: organizationDisplayLabel })}</h1>
                    ) : organizations.length > 1 ? (
                        <div className="eca-home-organization-select-wrap" ref={organizationSelectRef}>
                            <button type="button" className={"eca-home-organization-select-button" + (organizationSelectOpen ? " is-open" : "")} onClick={() => setOrganizationSelectOpen((prev) => !prev)} >
                                <span>{organization?.organizationName ?? t("ecaAdmin.organizationSelectPlaceholder", { organizationLabel: organizationDisplayLabel })}</span>
                                <img src="/icons/chevron-down-80.svg" alt="" />
                            </button>

                            {organizationSelectOpen ? (
                                <div className="eca-home-organization-select-menu">
                                    {organizations.map((item) => (
                                        <button
                                            type="button"
                                            key={item.organizationId}
                                            className={"eca-home-organization-select-option" + (item.organizationId === selectedOrganizationId ? " is-selected" : "")}
                                            onClick={() => {
                                                if (item.organizationId === selectedOrganizationId) {
                                                    setOrganizationSelectOpen(false);
                                                    return;
                                                }

                                                setSelectedOrganizationId(item.organizationId);
                                                setOrganizationSelectOpen(false);
                                                setStatusMenuActivityId(null);
                                                setManagerPopoverActivityId(null);
                                                setDraggingActivityId(null);
                                                setCenterActivities([]);
                                                setMyActivities([]);
                                            }}
                                        >
                                            {item.organizationName}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <h1>{organization?.organizationName ?? t("ecaAdmin.organizationNameFallback", { organizationLabel: organizationDisplayLabel })}</h1>                    )}
                </div>

                <div className="eca-home-header-bottom">
                    <p>{t("ecaAdmin.welcomeAdmin", { adminName: adminName || t("ecaAdmin.defaultAdminName") })}</p>

                    <button
                        type="button"
                        className="eca-home-add-button"
                        disabled={!organization?.organizationId}
                        onClick={() => {
                            if (!organization?.organizationId) {
                                window.alert(t("ecaAdmin.selectOrganizationFirst", { organizationLabel: organizationDisplayLabel }));
                                return;
                            }

                            navigate("/program-admin/activities/new");
                        }}
                    >
                        {t("ecaAdmin.createActivity")}
                    </button>
                </div>
            </section>

            <section className="eca-home-mypanel">
                <div className="eca-home-mypanel-head">
                    <h2>{t("ecaAdmin.myActivities")}</h2>
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
                                {t(getActivityStatusLabel(status))} ({getStatusCount(myActivities, status)})
                            </span>
                        </div>
                    ))}
                </div>

                <div className="eca-home-my-grid">
                    {myActivities.length === 0 ? (
                        <div className="eca-home-empty">{t("ecaAdmin.emptyData")}</div>
                    ) : (
                        selectedStatuses.map((status) => (
                            <div key={status} className="eca-home-card-column" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropToStatus(status)} >
                                {myActivities.filter((item) => item.status === status).map((item) => (
                                    <div key={item.id} className="eca-home-my-card" onClick={() => handleMyActivityCardClick(item.id)} > 
                                        <div
                                            className="eca-home-card-drag-handle"
                                            draggable
                                            onDragStart={() => {
                                                draggedCardRef.current = true;
                                                setDraggingActivityId(item.id);
                                            }}
                                            onDragEnd={() => {
                                                setDraggingActivityId(null);

                                                window.setTimeout(() => {
                                                    draggedCardRef.current = false;
                                                }, 0);
                                            }}
                                        />

                                        <div className={`eca-home-card-dot eca-home-card-dot--${item.status}`} />

                                        <button type="button" className="eca-home-card-menu-button" onClick={(e) => { e.stopPropagation(); setStatusMenuActivityId((prev) => prev === item.id ? null : item.id); }}>
                                            <img src="/icons/eca-home-card-menu-button.svg" alt="" />
                                        </button>

                                        {statusMenuActivityId === item.id ? (
                                            <div className="eca-home-status-menu" onClick={(e) => e.stopPropagation()} >
                                                {item.status === "completed" ? (
                                                    <button type="button" className="eca-home-status-menu-option eca-home-status-menu-option--delayed" onClick={(e) => { e.stopPropagation(); void changeMyActivityCompletion(item.id, false); }} >
                                                        {t("ecaAdmin.markIncomplete")}
                                                    </button>
                                                ) : (
                                                    <button type="button" className="eca-home-status-menu-option eca-home-status-menu-option--completed" onClick={(e) => { e.stopPropagation(); void changeMyActivityCompletion(item.id, true); }} >
                                                        {t("ecaAdmin.markCompleted")}
                                                    </button>
                                                )}
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
                    <h2>{t("ecaAdmin.organizationAllActivities", { organizationLabel: organizationDisplayLabel })}</h2>
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
                            <div key={item.id} className="eca-home-center-card" onClick={() => handleCenterActivityCardClick(item.id)} >
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
                                    <div className="eca-home-center-more-wrap" ref={managerPopoverActivityId === item.id ? managerPopoverRef : null} >
                                        <button type="button" className="eca-home-more-button" onClick={(e) => { e.stopPropagation(); setManagerPopoverActivityId((prev) => prev === item.id ? null : item.id); }} >
                                            <img className="eca-home-more-button-icon" src="/icons/eca-home-card-menu-button-00.svg" alt="" />
                                            <span className="eca-home-more-button-title">{t("ecaAdmin.more")}</span>
                                        </button>

                                        {managerPopoverActivityId === item.id ? (
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