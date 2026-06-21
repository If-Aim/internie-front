import { Client } from "@stomp/stompjs";
import { buildWebSocketUrl, getAccessToken, refreshAccessToken } from "./client";
import type { NotificationResponse } from "./ea";

export function connectNotificationSocket(onNotification: (notification: NotificationResponse) => void): () => void {
    const client = new Client({
        webSocketFactory: () => new WebSocket(buildWebSocketUrl("/ws")),
        reconnectDelay: 5000,
        debug: () => undefined,
        beforeConnect: async () => {
            let token = getAccessToken();

            if (!token) {
                token = await refreshAccessToken().catch(() => null);
            }

            client.connectHeaders = token ? { Authorization: token } : {};
        },
        onConnect: () => {
            client.subscribe("/user/queue/notifications", (message) => {
                if (!message.body) {
                    return;
                }

                onNotification(JSON.parse(message.body) as NotificationResponse);
            });
        },
    });

    client.activate();

    return () => {
        void client.deactivate();
    };
}