export type PendingGlobalModalType = "ORGANIZATION_INVITE" | "EXTERNAL_ACTIVITY_INVITE";

export type PendingGlobalModal = {
    id: string;
    type: PendingGlobalModalType;
    token: string;
};

const STORAGE_KEY = "pendingGlobalModals";

export function getPendingGlobalModals(): PendingGlobalModal[] {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function hasPendingGlobalModal(type?: PendingGlobalModalType): boolean {
    const modals = getPendingGlobalModals();

    if (!type) {
        return modals.length > 0;
    }

    return modals.some((modal) => modal.type === type);
}

export function addPendingGlobalModal(modal: PendingGlobalModal): void {
    const modals = getPendingGlobalModals();
    const alreadyExists = modals.some((item) => item.type === modal.type && item.token === modal.token);

    if (alreadyExists) return;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...modals, modal]));
    window.dispatchEvent(new Event("pendingGlobalModalChanged"));
}

export function removePendingGlobalModal(id: string): void {
    const modals = getPendingGlobalModals().filter((modal) => modal.id !== id);

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(modals));
    window.dispatchEvent(new Event("pendingGlobalModalChanged"));
}