import React from "react";
import { useLocation } from "react-router-dom";
import { getPendingGlobalModals, removePendingGlobalModal } from "./globalModalStorage";
import type { PendingGlobalModal } from "./globalModalStorage";
import OrganizationInviteModal from "./pages/admin/desktop/ecaClient/invite/organizationInviteModal";

export default function GlobalModalHost(): React.ReactElement | null {
    const location = useLocation();
    const [modals, setModals] = React.useState<PendingGlobalModal[]>([]);

    React.useEffect(() => {
        if (!location.pathname.startsWith("/invite")) {
            sessionStorage.setItem("globalModalPreviousPath", location.pathname + location.search);
        }
    }, [location.pathname, location.search]);

    React.useEffect(() => {
        function syncModals(): void {
            setModals(getPendingGlobalModals());
        }

        syncModals();

        window.addEventListener("pendingGlobalModalChanged", syncModals);
        window.addEventListener("storage", syncModals);

        return () => {
            window.removeEventListener("pendingGlobalModalChanged", syncModals);
            window.removeEventListener("storage", syncModals);
        };
    }, []);

    const currentModal = modals[0];

    if (!currentModal) return null;

    if (currentModal.type === "ORGANIZATION_INVITE") {
        return (
            <OrganizationInviteModal
                token={currentModal.token}
                onClose={() => removePendingGlobalModal(currentModal.id)}
            />
        );
    }

    return null;
}