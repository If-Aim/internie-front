import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getNotifications, markNotificationRead } from "../../../../../../api/ea";
import type { NotificationResponse } from "../../../../../../api/ea";
import { connectNotificationSocket } from "../../../../../../api/notificationSocket";
import "./notification.css";

type NotificationGroup = {
    dateKey: string;
    dateLabel: string;
    notifications: NotificationResponse[];
};

function getSafeDate(value?: string | null): Date | null {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value: string): string {
    const date = getSafeDate(value);

    if (!date) return "unknown";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatNotificationDate(value: string, language: string): string {
    const date = getSafeDate(value);

    if (!date) return "-";

    if (isEnglishLanguage(language)) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        }).format(date);
    }

    return new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(date);
}
function sortNotifications(a: NotificationResponse, b: NotificationResponse): number {
    return (getSafeDate(b.createdAt)?.getTime() ?? 0) - (getSafeDate(a.createdAt)?.getTime() ?? 0);
}

function isCurrentActivityNotification(notification: NotificationResponse, externalActivityId?: string): boolean {
    if (!externalActivityId) return true;
    if (!notification.externalActivityId) return true;

    return String(notification.externalActivityId) === externalActivityId;
}

function mergeNotification(list: NotificationResponse[], notification: NotificationResponse): NotificationResponse[] {
    return [notification, ...list.filter((item) => item.notificationId !== notification.notificationId)].sort(sortNotifications);
}

function groupNotifications(notifications: NotificationResponse[], language: string): NotificationGroup[] {
    const groupMap = new Map<string, NotificationGroup>();

    notifications.forEach((notification) => {
        const dateKey = getDateKey(notification.createdAt);
        const group = groupMap.get(dateKey) ?? {
            dateKey,
            dateLabel: formatNotificationDate(notification.createdAt, language),
            notifications: [],
        };

        group.notifications.push(notification);
        groupMap.set(dateKey, group);
    });

    return Array.from(groupMap.values());
}

function isEnglishLanguage(language: string): boolean {
    return language.toLowerCase().startsWith("en");
}

function getLocalizedNotificationTitle(notification: NotificationResponse, language: string): string {
    if (isEnglishLanguage(language)) {
        return notification.titleEn?.trim() || notification.title?.trim() || notification.titleKo?.trim() || "-";
    }

    return notification.titleKo?.trim() || notification.title?.trim() || notification.titleEn?.trim() || "-";
}

function getLocalizedNotificationBody(notification: NotificationResponse, language: string): string {
    if (isEnglishLanguage(language)) {
        return notification.bodyEn?.trim() || notification.body?.trim() || notification.bodyKo?.trim() || "-";
    }

    return notification.bodyKo?.trim() || notification.body?.trim() || notification.bodyEn?.trim() || "-";
}

function getNotificationMessage(notification: NotificationResponse, language: string): string {
    const body = getLocalizedNotificationBody(notification, language);
    const title = getLocalizedNotificationTitle(notification, language);

    return body !== "-" ? body : title;
}

function getNotificationTargetPath(notification: NotificationResponse, externalActivityId?: string): string | null {
    const activityId = notification.externalActivityId ?? externalActivityId;
    const targetType = notification.targetType.toUpperCase();

    if (!activityId) return null;

    if (
        targetType.includes("LEADERBOARD") ||
        notification.type === "LEADERBOARD_MISSION_APPROVED" ||
        notification.type === "LEADERBOARD_MISSION_REJECTED"
    ) {
        return `/student/activities/${activityId}/leaderboard`;
    }

    if (
        notification.targetId &&
        (targetType.includes("ASSIGNMENT") || notification.type === "ASSIGNMENT_CREATED" || notification.type === "ASSIGNMENT_EVALUATED")
    ) {
        return `/student/activities/${activityId}/assignment/${notification.targetId}`;
    }

    if (
        notification.targetId &&
        (targetType.includes("ATTENDANCE") || notification.type === "ATTENDANCE_CHECK_IN_OPENED")
    ) {
        return `/student/activities/${activityId}/attendance/${notification.targetId}`;
    }

    return null;
}

type HeaderProps = {
    title: string;
    onBackClick: () => void;
};

function Header({ title, onBackClick }: HeaderProps): React.ReactElement {
    return (
        <div className="topbar topbar-main">
            <button className="iconbtn" aria-label="back" onClick={onBackClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M14 17L9 12L14 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            <div className="app-title">{title}</div>

            <div style={{ display: "block", width: 24, height: 24 }} aria-hidden="true" />
        </div>
    );
}


export default function EcaStudentMobileNotification(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { externalActivityId } = useParams<{ externalActivityId?: string }>();

    const [notifications, setNotifications] = React.useState<NotificationResponse[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
    const notificationGroups = React.useMemo(() => groupNotifications(notifications, currentLanguage), [notifications, currentLanguage]);

    React.useEffect(() => {
        let mounted = true;

        async function fetchNotifications(): Promise<void> {
            setLoading(true);
            setError("");

            try {
                const data = await getNotifications({ page: 0, size: 50 });
                const nextNotifications = data.notifications
                    .filter((notification) => isCurrentActivityNotification(notification, externalActivityId))
                    .sort(sortNotifications);

                if (!mounted) return;

                setNotifications(nextNotifications);
            } catch (e) {
                console.error(e);

                if (!mounted) return;

                setNotifications([]);
                setError(t("ecaStudent.notificationPage.loadFailed"));
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchNotifications();

        return () => {
            mounted = false;
        };
    }, [externalActivityId, t]);

    React.useEffect(() => {
        const disconnect = connectNotificationSocket((notification) => {
            if (!isCurrentActivityNotification(notification, externalActivityId)) return;

            setNotifications((prev) => mergeNotification(prev, notification));
        });

        return disconnect;
    }, [externalActivityId]);

    function handleBackClick(): void {
        navigate(-1);
    }

    async function handleNotificationClick(notification: NotificationResponse): Promise<void> {
        const targetPath = getNotificationTargetPath(notification, externalActivityId);

        if (!notification.read) {
            try {
                const updatedNotification = await markNotificationRead(notification.notificationId);

                setNotifications((prev) =>
                    prev.map((item) => item.notificationId === updatedNotification.notificationId ? updatedNotification : item)
                );
            } catch (e) {
                console.error(e);
            }
        }

        if (targetPath) {
            navigate(targetPath);
        }
    }

    return (
        <main className="eca-mobile-student-notification-page">
            <Header title={t("ecaStudent.notificationPage.title")} onBackClick={handleBackClick} />

            <section className="eca-mobile-student-notification-content">
                {loading ? (
                    <p className="eca-mobile-student-notification-empty">{t("ecaStudent.notificationPage.loading")}</p>
                ) : error ? (
                    <p className="eca-mobile-student-notification-empty">{error}</p>
                ) : notificationGroups.length === 0 ? (
                    <p className="eca-mobile-student-notification-empty">{t("ecaStudent.notificationPage.empty")}</p>
                ) : (
                    notificationGroups.map((group) => (
                        <section className="eca-mobile-student-notification-group" key={group.dateKey}>
                            <h2>{group.dateLabel}</h2>
                            <div className="eca-mobile-student-notification-list">
                                {group.notifications.map((notification) => (
                                    <button
                                        type="button"
                                        className={notification.read ? "eca-mobile-student-notification-item is-read" : "eca-mobile-student-notification-item"}
                                        key={notification.notificationId}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        {getNotificationMessage(notification, currentLanguage)}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </section>
        </main>
    );
}