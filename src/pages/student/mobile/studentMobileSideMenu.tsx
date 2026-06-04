import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { MyOrganizationResponse } from "../../../api/organizationClient";
import type { StudentExternalActivityResponse } from "../../../api/ea";

type StudentMobileSideMenuProps = {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    userEmail: string;
    userProfileImg: string;
    userRoleSet: string[];
    organizations: MyOrganizationResponse[];
    activities: StudentExternalActivityResponse[];
    onRequireAuth: (pathAfterLogin: string, action: () => void) => void;
};

export default function StudentMobileSideMenu({
    isOpen,
    onClose,
    userName,
    userEmail,
    userProfileImg,
    userRoleSet,
    organizations,
    activities,
    onRequireAuth,
}: StudentMobileSideMenuProps): React.ReactElement {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { t, i18n } = useTranslation();
    const widthRef = React.useRef<number>(Math.round(window.innerWidth * 0.95));
    const rafRef = React.useRef<number | null>(null);
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    const [x, setX] = React.useState<number>(() => -widthRef.current);
    const startXRef = React.useRef(0);
    const startPanelXRef = React.useRef(0);
    const lastXRef = React.useRef(0);
    const lastTRef = React.useRef(0);
    const vxRef = React.useRef(0);
    const [dragging, setDragging] = React.useState(false);
    const [closing, setClosing] = React.useState(false);
    const [openedActivityId, setOpenedActivityId] = React.useState<number | null>(null);

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    React.useEffect(() => {
        const w = panelRef.current?.offsetWidth ?? widthRef.current;
        widthRef.current = w;

        if (dragging) return;

        setX(isOpen ? 0 : -w);
    }, [isOpen, dragging]);

    const openProgress = React.useMemo(() => {
        const w = widthRef.current || 1;

        return clamp(1 - Math.abs(x) / w, 0, 1);
    }, [x]);

    const closeWithSnap = React.useCallback(() => {
        if (closing) return;

        const w = widthRef.current;

        setDragging(false);
        setClosing(true);
        setX(-w);

        window.setTimeout(() => {
            setClosing(false);
            onClose();
        }, 260);
    }, [onClose, closing]);

    const openWithSnap = React.useCallback(() => {
        setDragging(false);
        setX(0);
    }, []);

    function onPointerDown(e: React.PointerEvent): void {
        if (!panelRef.current) return;
        if (!isOpen) return;

        const target = e.target as HTMLElement;

        if (target.closest("button, a, input, textarea, select, [role='button']")) return;

        panelRef.current.setPointerCapture(e.pointerId);

        const w = panelRef.current.offsetWidth;
        widthRef.current = w;

        setDragging(true);
        startXRef.current = e.clientX;
        startPanelXRef.current = x;
        lastXRef.current = e.clientX;
        lastTRef.current = performance.now();
        vxRef.current = 0;
    }

    function onPointerMove(e: React.PointerEvent): void {
        if (!dragging) return;
        if (!panelRef.current) return;

        const now = performance.now();
        const dx = e.clientX - startXRef.current;
        const w = widthRef.current;
        const nextX = clamp(startPanelXRef.current + dx, -w, 0);
        const dt = now - lastTRef.current;

        if (dt > 0) {
            vxRef.current = (e.clientX - lastXRef.current) / dt;
            lastXRef.current = e.clientX;
            lastTRef.current = now;
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => setX(nextX));
    }

    function onPointerUpOrCancel(e: React.PointerEvent): void {
        if (!dragging) return;

        const w = widthRef.current;
        const progress = clamp(1 - Math.abs(x) / w, 0, 1);
        const flingLeft = vxRef.current < -0.6;
        const passedThreshold = progress < 0.6;

        setDragging(false);

        if (flingLeft || passedThreshold) {
            closeWithSnap();
        } else {
            openWithSnap();
        }

        try {
            panelRef.current?.releasePointerCapture(e.pointerId);
        } catch {}
    }

    const canInteract = isOpen || dragging || closing;
    const isKo = (i18n.resolvedLanguage ?? i18n.language).startsWith("ko");

    const hasActivities = activities.length > 0;
    
    const activityMenus = [
        { key: "dashboard", label: isKo ? "대시보드" : "Dashboard", path: "dashboard", disabled: false },
        { key: "assignment", label: isKo ? "과제 제출 현황" : "Assignment Status", path: "assignment", disabled: false },
        { key: "attendance", label: isKo ? "출석 현황" : "Attendance", path: "attendance", disabled: true },
        { key: "team-activity", label: isKo ? "팀 활동" : "Team Activity", path: "team-activity", disabled: true },
    ];

    function isActivityMenuActive(activityId: number, menuPath: string): boolean {
        return pathname === `/student/activities/${activityId}/${menuPath}`;
    }

    React.useEffect(() => {
        const activityIdFromPath = getActivityIdFromPath(pathname);

        if (activityIdFromPath === null) return;

        setOpenedActivityId(activityIdFromPath);
    }, [pathname]);

    function getActivityIdFromPath(pathnameValue: string): number | null {
        const match = pathnameValue.match(/^\/student\/activities\/(\d+)/);
        if (!match) return null;

        const activityId = Number(match[1]);

        return Number.isFinite(activityId) ? activityId : null;
    }    
    async function toggleLang(): Promise<void> {
        await i18n.changeLanguage(isKo ? "en" : "ko");
    }

    return (
        <>
            <div className="drawer-backdrop" onClick={() => { if (!canInteract) return; closeWithSnap(); }} aria-hidden="true"
                style={{ opacity: openProgress, pointerEvents: canInteract ? "auto" : "none", transition: dragging ? "none" : "opacity 220ms ease", }}
            />

            <div
                ref={panelRef}
                className="drawer-panel"
                style={{
                    transform: `translateX(${x}px)`,
                    transition: dragging ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
                    pointerEvents: canInteract ? "auto" : "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrCancel}
                onPointerCancel={onPointerUpOrCancel}
            >
                <div className="drawer-header">
                    <div className="profile-wrap">
                        <img src={userProfileImg} alt={t("menu.profile")} className="profile-img" />
                        <div className="profile-info">
                            <div className="name">{userName}</div>
                            <div className="email">{userEmail}</div>
                        </div>
                    </div>
                </div>

                                <div className="drawer-body">
                    <button className="drawer-menu-item drawer-home-item" onClick={() => { navigate("/student"); closeWithSnap(); }}>
                        <svg className="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M21 19V12.267C21 11.7245 20.8896 11.1876 20.6756 10.689C20.4616 10.1905 20.1483 9.74069 19.755 9.36701L13.378 3.31001C13.0063 2.9569 12.5132 2.76001 12.0005 2.76001C11.4878 2.76001 10.9947 2.9569 10.623 3.31001L4.245 9.36701C3.85165 9.74069 3.53844 10.1905 3.3244 10.689C3.11037 11.1876 3 11.7245 3 12.267V19C3 19.5304 3.21071 20.0392 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0392 21 19.5304 21 19Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t("menu.home")}</span>
                    </button>

                    {hasActivities && (
                        <div className="drawer-activity-list">
                            {activities.map((activity) => {
                                const isOpen = openedActivityId === activity.externalActivityId;
                                return (
                                    <section className="drawer-activity-section" key={activity.externalActivityId}>
                                        <button type="button" className="drawer-activity-title" onClick={() => setOpenedActivityId((prev) => prev === activity.externalActivityId ? null : activity.externalActivityId)}>  
                                            <div className={isOpen ? "drawer-activity-arrow open" : "drawer-activity-arrow"}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                            <span>{activity.name}</span>
                                        </button>

                                        {isOpen && (
                                            <div className="drawer-activity-menu-list">
                                                {activityMenus.map((menu) => (
                                                    <button
                                                        type="button"
                                                        className={"drawer-activity-menu-item" + (isActivityMenuActive(activity.externalActivityId, menu.path) ? " active" : "")}
                                                        key={menu.key}
                                                        onClick={() => {
                                                            if (menu.disabled) {
                                                                alert(isKo ? "서비스 준비중입니다." : "Coming Soon");
                                                                return;
                                                            }

                                                            onRequireAuth(`/student/activities/${activity.externalActivityId}/${menu.path}`, () => {
                                                                navigate(`/student/activities/${activity.externalActivityId}/${menu.path}`);
                                                                closeWithSnap();
                                                            });
                                                        }}
                                                    >
                                                        {menu.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ margin: "20px 0" }}>
                        {(userRoleSet.includes("ROLE_ADMIN") || userRoleSet.includes("ROLE_CAPTAIN")) && (
                            <button type="button" className="drawer-menu-item" onClick={() => { navigate("/system-admin/users"); closeWithSnap(); }}>
                                <img className="icon" src="/icons/chevron-right.svg" alt="" />
                                <span>인터니 관리자 페이지</span>
                            </button>
                        )}

                        {userRoleSet.includes("ROLE_JUMP_ADMIN") && (
                            <button className="drawer-menu-item" onClick={() => { onRequireAuth("/admin/jump/dashboard", () => { navigate("/admin/jump/dashboard"); closeWithSnap(); }); }}>
                                <img className="icon" src="/icons/chevron-right.svg" alt="" />
                                <span>JUMP 관리자 페이지</span>
                            </button>
                        )}

                        {userRoleSet.includes("ROLE_KAKAO_ADMIN") && (
                            <button className="drawer-menu-item" onClick={() => { onRequireAuth("/admin/kakao/dashboard", () => { navigate("/admin/kakao/dashboard"); closeWithSnap(); }); }}>
                                <img className="icon" src="/icons/chevron-right.svg" alt="" />
                                <span>KAKAO 관리자 페이지</span>
                            </button>
                        )}

                        {organizations.length > 0 && (
                            <button className="drawer-menu-item" onClick={() => { onRequireAuth("/eca-admin/home", () => { navigate("/eca-admin/home"); closeWithSnap(); }); }}>
                                <img className="icon" src="/icons/chevron-right.svg" alt="" />
                                <span>대외활동 관리자 페이지</span>
                            </button>
                        )}
                    </div>
                    <div className="drawer-bottom-menu">
                        <button className="drawer-menu-item" onClick={toggleLang}>
                            <div className="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M3.5 14.966C3.16814 14.0124 2.99911 13.0097 3 12C2.99922 10.9907 3.16825 9.98834 3.5 9.03503C4.11608 7.27196 5.26515 5.74409 6.78807 4.66303C8.31099 3.58197 10.1324 3.00122 12 3.00122C13.8676 3.00122 15.689 3.58197 17.2119 4.66303C18.7349 5.74409 19.8839 7.27196 20.5 9.03503C20.824 9.96303 21 10.961 21 12C21.0009 13.0097 20.8319 14.0124 20.5 14.966C19.8839 16.7291 18.7349 18.257 17.2119 19.338C15.689 20.4191 13.8676 20.9998 12 20.9998C10.1324 20.9998 8.31099 20.4191 6.78807 19.338C5.26515 18.257 4.11608 16.7291 3.5 14.966ZM20.5 9.03503H3.5M20.5 14.966H3.5" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12.0009 21C16.9709 16.03 16.9709 7.97 12.0009 3C7.03094 7.97 7.03094 16.03 12.0009 21Z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <span>{t("menu.language")}</span>
                        </button>

                        <button className="drawer-menu-item" onClick={() => { onRequireAuth("/student/mypage", () => { navigate("/student/mypage"); closeWithSnap(); }); }}>
                            <div className="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M13.6763 4.31627C13.2488 2.56124 10.7512 2.56124 10.3237 4.31627C10.2599 4.57999 10.1347 4.82492 9.95831 5.03112C9.78194 5.23732 9.55938 5.39897 9.30874 5.50291C9.0581 5.60684 8.78646 5.65014 8.51592 5.62927C8.24538 5.60839 7.9836 5.52394 7.75187 5.38279C6.20832 4.44227 4.44201 6.20855 5.38254 7.75207C5.99006 8.74884 5.45117 10.0494 4.31713 10.325C2.56096 10.7514 2.56096 13.25 4.31713 13.6753C4.58093 13.7392 4.8259 13.8645 5.03211 14.041C5.23831 14.2175 5.39991 14.4402 5.50375 14.691C5.6076 14.9418 5.65074 15.2135 5.62968 15.4841C5.60862 15.7547 5.52394 16.0165 5.38254 16.2482C4.44201 17.7917 6.20832 19.558 7.75187 18.6175C7.98356 18.4761 8.24536 18.3914 8.51597 18.3704C8.78658 18.3493 9.05834 18.3924 9.30912 18.4963C9.5599 18.6001 9.7826 18.7617 9.95911 18.9679C10.1356 19.1741 10.2609 19.4191 10.3248 19.6829C10.7512 21.439 13.2499 21.439 13.6752 19.6829C13.7393 19.4192 13.8647 19.1744 14.0413 18.9684C14.2178 18.7623 14.4405 18.6008 14.6912 18.497C14.9419 18.3932 15.2135 18.35 15.4841 18.3709C15.7546 18.3919 16.0164 18.4764 16.2481 18.6175C17.7917 19.558 19.558 17.7917 18.6175 16.2482C18.4763 16.0165 18.3918 15.7547 18.3709 15.4842C18.35 15.2136 18.3932 14.942 18.497 14.6913C18.6008 14.4406 18.7623 14.2179 18.9683 14.0414C19.1744 13.8648 19.4192 13.7394 19.6829 13.6753C21.439 13.2489 21.439 10.7502 19.6829 10.325C19.4191 10.2611 19.1741 10.1358 18.9679 9.95928C18.7617 9.78278 18.6001 9.56007 18.4962 9.3093C18.3924 9.05853 18.3493 8.78677 18.3703 8.51617C18.3914 8.24556 18.4761 7.98376 18.6175 7.75207C19.558 6.20855 17.7917 4.44227 16.2481 5.38279C16.0164 5.52418 15.7546 5.60886 15.484 5.62992C15.2134 5.65098 14.9417 5.60784 14.6909 5.504C14.4401 5.40016 14.2174 5.23856 14.0409 5.03236C13.8644 4.82616 13.7391 4.58119 13.6752 4.3174L13.6763 4.31627Z" stroke="#808080" strokeWidth="2"/>
                                    <path d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" stroke="#808080" strokeWidth="2"/>
                                </svg>
                            </div>
                            <span>{t("menu.settings")}</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}