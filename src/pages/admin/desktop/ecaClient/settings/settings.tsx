import React from "react";
import { useTranslation } from "react-i18next";
import { approveOrganizationMember, createOrganizationInvite, getMyOrganizations, getOrganizationMembers, getPendingOrganizationMembers, rejectOrganizationMember, deleteOrganizationMember, transferOrganizationOwner, } from "../../../../../api/organizationClient";
import type { MyOrganizationResponse, OrganizationMemberResponse, OrganizationMemberRole, } from "../../../../../api/organizationClient"; 
import "./settings.css";

const SETTINGS_T = "ecaAdmin.settingsPage";

function getRoleLabel(role: OrganizationMemberRole, t: (key: string) => string): string {
    if (role === "OWNER") return t(`${SETTINGS_T}.role.owner`);
    return t(`${SETTINGS_T}.role.member`);
}

function buildInviteUrl(token: string): string {
    return `${window.location.origin}/invite/organization/${token}`;
}

export default function EcaAdminSettingsPage(): React.ReactElement {
    const { t } = useTranslation();

    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [organizationMenuOpen, setOrganizationMenuOpen] = React.useState(false);
    const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<number | null>(null);
    const [members, setMembers] = React.useState<OrganizationMemberResponse[]>([]);
    const [pendingMembers, setPendingMembers] = React.useState<OrganizationMemberResponse[]>([]);
    const [reviewingMemberId, setReviewingMemberId] = React.useState<number | null>(null);
    const [memberInviteOpen, setMemberInviteOpen] = React.useState(false);
    const [memberInviteUrl, setMemberInviteUrl] = React.useState("");
    const [deletingMemberId, setDeletingMemberId] = React.useState<number | null>(null);

    const [ownerTransferTarget, setOwnerTransferTarget] = React.useState<OrganizationMemberResponse | null>(null);
    const [ownerTransferring, setOwnerTransferring] = React.useState(false);
    const [roleMenuMemberId, setRoleMenuMemberId] = React.useState<number | null>(null);

    const [organizationLoading, setOrganizationLoading] = React.useState(false);
    const [managementLoading, setManagementLoading] = React.useState(false);
    const [inviteCreating, setInviteCreating] = React.useState(false);

    const selectedOrganization = React.useMemo(
        () => organizations.find((organization) => organization.organizationId === selectedOrganizationId) ?? null,
        [organizations, selectedOrganizationId]
    );

    const canManageOrganization = selectedOrganization?.memberRole === "OWNER";

    React.useEffect(() => {
        let mounted = true;

        async function fetchMyOrganizations(): Promise<void> {
            setOrganizationLoading(true);

            try {
                const data = await getMyOrganizations();

                if (!mounted) return;

                setOrganizations(data);

                const firstManageableOrganization = data.find((organization) => (
                    organization.memberRole === "OWNER"
                ));

                setSelectedOrganizationId(
                    firstManageableOrganization?.organizationId
                    ?? data[0]?.organizationId
                    ?? null
                );
            } catch (error) {
                console.error(error);

                if (mounted) {
                    setOrganizations([]);
                    setSelectedOrganizationId(null);
                }
            } finally {
                if (mounted) {
                    setOrganizationLoading(false);
                }
            }
        }

        void fetchMyOrganizations();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => { // 관리자 목록 권한 메뉴 바깥쪽 클릭 닫기
        function closeMenus(): void {
            setRoleMenuMemberId(null);
            setOrganizationMenuOpen(false);
        }

        window.addEventListener("mousedown", closeMenus);

        return () => {
            window.removeEventListener("mousedown", closeMenus);
        };
    }, []);

    // React.useEffect(() => { 
    //     function closeRoleMenu(): void {
    //         setRoleMenuMemberId(null);
    //     }

    //     window.addEventListener("mousedown", closeRoleMenu);

    //     return () => {
    //         window.removeEventListener("mousedown", closeRoleMenu);
    //     };
    // }, []);


    const refreshOrganizationManagementData = React.useCallback(async (): Promise<void> => {
        if (!selectedOrganizationId) {
            setMembers([]);
            setPendingMembers([]);
            return;
        }

        if (!canManageOrganization) {
            setMembers([]);
            setPendingMembers([]);
            return;
        }

        setManagementLoading(true);

        try {
            const [memberData, pendingMemberData] = await Promise.all([
                getOrganizationMembers(selectedOrganizationId),
                getPendingOrganizationMembers(selectedOrganizationId),
            ]);

            setMembers(memberData);
            setPendingMembers(pendingMemberData);
        } catch (error) {
            console.error(error);
            setMembers([]);
            setPendingMembers([]);
        } finally {
            setManagementLoading(false);
        }
    }, [selectedOrganizationId, canManageOrganization]);

    React.useEffect(() => {
        void refreshOrganizationManagementData();
    }, [refreshOrganizationManagementData]);

    async function handleCreateInvite(): Promise<void> {
        if (!selectedOrganizationId || inviteCreating) return;

        setInviteCreating(true);

        try {
            const createdInvite = await createOrganizationInvite(selectedOrganizationId);
            const inviteUrl = buildInviteUrl(createdInvite.token);

            setMemberInviteUrl(inviteUrl);
            setMemberInviteOpen(true);
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.inviteCreateFailed`));
        } finally {
            setInviteCreating(false);
        }
    }

    async function handleCopyInviteLink(): Promise<void> {
        if (!memberInviteUrl) return;

        try {
            await navigator.clipboard.writeText(memberInviteUrl);
            window.alert(t(`${SETTINGS_T}.alert.inviteCopySuccess`));
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.inviteCopyFailed`));
        }
    }

    function openOwnerTransferModal(member: OrganizationMemberResponse): void {
        if (!canManageOrganization) return;
        if (member.role === "OWNER") return;

        setOwnerTransferTarget(member);
    }

    async function handleApproveMember(member: OrganizationMemberResponse): Promise<void> {
        if (!selectedOrganizationId || reviewingMemberId) return;

        setReviewingMemberId(member.organizationMemberId);

        try {
            await approveOrganizationMember(selectedOrganizationId, member.organizationMemberId);
            await refreshOrganizationManagementData();
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.approveFailed`));
        } finally {
            setReviewingMemberId(null);
        }
    }

    async function handleRejectMember(member: OrganizationMemberResponse): Promise<void> {
        if (!selectedOrganizationId || reviewingMemberId) return;

        setReviewingMemberId(member.organizationMemberId);

        try {
            await rejectOrganizationMember(selectedOrganizationId, member.organizationMemberId);
            await refreshOrganizationManagementData();
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.rejectFailed`));
        } finally {
            setReviewingMemberId(null);
        }
    }

    async function handleTransferOwner(): Promise<void> {
        if (!selectedOrganizationId || !ownerTransferTarget || ownerTransferring) return;

        setOwnerTransferring(true);

        try {
            await transferOrganizationOwner(selectedOrganizationId, {
                nextOwnerMemberId: ownerTransferTarget.organizationMemberId,
            });

            const nextOrganizations = organizations.map((organization) => (
                organization.organizationId === selectedOrganizationId
                    ? { ...organization, memberRole: "MEMBER" as OrganizationMemberRole }
                    : organization
            ));

            setOrganizations(nextOrganizations);
            setMembers([]);
            setOwnerTransferTarget(null);

            window.alert(t(`${SETTINGS_T}.alert.ownerTransferSuccess`));
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.ownerTransferFailed`));
        } finally {
            setOwnerTransferring(false);
        }
    }

    async function handleDeleteMember(member: OrganizationMemberResponse): Promise<void> {
        if (!selectedOrganizationId || deletingMemberId) return;
        if (member.role === "OWNER") return;

        const confirmed = window.confirm(t(`${SETTINGS_T}.confirm.deleteMember`, {
            name: member.userName ?? t(`${SETTINGS_T}.selectedMember`),
        }));

        if (!confirmed) return;

        setDeletingMemberId(member.organizationMemberId);

        try {
            await deleteOrganizationMember(selectedOrganizationId, member.organizationMemberId);
            await refreshOrganizationManagementData();
        } catch (error) {
            console.error(error);
            window.alert(t(`${SETTINGS_T}.alert.deleteMemberFailed`));
        } finally {
            setDeletingMemberId(null);
        }
    }

    return (
        <div className="eca-settings-page">
            <header className="eca-settings-header">
                <h1>{t(`${SETTINGS_T}.title`)}</h1>
            </header>

            {!selectedOrganization ? (
                <section className="eca-settings-card">
                    <div className="eca-settings-empty">
                        {organizationLoading ? t(`${SETTINGS_T}.organizationLoading`) : t(`${SETTINGS_T}.noOrganization`)}
                    </div>
                </section>
            ) : (
                <section className="eca-settings-card eca-settings-member-management-card">
                    <div className="eca-settings-member-management-head">
                        <div>
                            <label className="eca-settings-form-label">
                                {t(`${SETTINGS_T}.organizationName`)}<span>*</span>
                            </label>

                            <div className="eca-settings-organization-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="eca-settings-organization-trigger"
                                    onClick={() => {
                                        if (organizations.length <= 1) return;
                                        setOrganizationMenuOpen((current) => !current);
                                    }}
                                    disabled={organizations.length <= 1}
                                >
                                    <span>{selectedOrganization?.organizationName ?? t(`${SETTINGS_T}.selectOrganization`)}</span>

                                    {organizations.length > 1 ? (
                                        <span className="eca-settings-organization-trigger-arrow" aria-hidden="true">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M4 6L8 10L12 6" stroke="#808080" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    ) : null}
                                </button>

                                {organizationMenuOpen ? (
                                    <div className="eca-settings-organization-menu">
                                        {organizations.map((organization) => (
                                            <button
                                                type="button"
                                                className={"eca-settings-organization-menu-item" + (organization.organizationId === selectedOrganizationId ? " is-selected" : "")}
                                                key={organization.organizationId}
                                                onClick={() => {
                                                    setSelectedOrganizationId(organization.organizationId);
                                                    setOrganizationMenuOpen(false);
                                                }}
                                            >
                                                {organization.organizationName}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="eca-settings-form-label">
                                {t(`${SETTINGS_T}.myRole`)}<span>*</span>
                            </label>

                            <div className="eca-settings-role-select-wrap">
                                <select className="eca-settings-role-select" value={getRoleLabel(selectedOrganization.memberRole, t)} disabled>
                                    <option>{getRoleLabel(selectedOrganization.memberRole, t)}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="eca-settings-manager-section">
                        <strong className="eca-settings-manager-title">{t(`${SETTINGS_T}.managerList`)}</strong>

                        {canManageOrganization ? (
                            <button type="button" className="eca-settings-add-member-button" onClick={() => void handleCreateInvite()} disabled={inviteCreating}>
                                {inviteCreating ? t(`${SETTINGS_T}.creating`) : t(`${SETTINGS_T}.add`)}
                            </button>
                        ) : null}
                    </div>

                    {!canManageOrganization ? (
                        <div className="eca-settings-empty eca-settings-empty--large">
                            {t(`${SETTINGS_T}.memberNoInvitePermission`)}
                        </div>
                    ) : managementLoading ? (
                        <div className="eca-settings-empty">{t(`${SETTINGS_T}.memberLoading`)}</div>
                    ) : members.length === 0 ? (
                        <div className="eca-settings-empty">{t(`${SETTINGS_T}.noMembers`)}</div>
                    ) : (
                        <div className="eca-settings-member-list">
                            <div className="eca-settings-member-list-head">
                                <span>{t(`${SETTINGS_T}.name`)}</span>
                                <span>{t(`${SETTINGS_T}.email`)}</span>
                                <span>{t(`${SETTINGS_T}.roleTitle`)}</span>
                                <span aria-hidden="true" />
                            </div>
                            {members.map((member) => (
                                <article className="eca-settings-member-row" key={member.organizationMemberId} >
                                    <span className="eca-settings-member-name">{member.userName ?? t(`${SETTINGS_T}.noName`)}</span>
                                    <span className="eca-settings-member-email">{member.email ?? t(`${SETTINGS_T}.noEmail`)}</span>

                                    <div className="eca-settings-member-role-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            className="eca-settings-member-role-trigger"
                                            onClick={() => {
                                                if (member.role === "OWNER") return;
                                                setRoleMenuMemberId((current) => current === member.organizationMemberId ? null : member.organizationMemberId);
                                            }}
                                            disabled={member.role === "OWNER"}
                                        >
                                            <span>{getRoleLabel(member.role, t)}</span>
                                            <span className="eca-settings-member-role-arrow" aria-hidden="true">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        </button>

                                        {roleMenuMemberId === member.organizationMemberId ? (
                                            <div className="eca-settings-member-role-menu">
                                                <button type="button" onClick={() => { setRoleMenuMemberId(null); openOwnerTransferModal(member); }} >
                                                    {t(`${SETTINGS_T}.role.owner`)}
                                                </button>
                                                <button type="button" onClick={() => setRoleMenuMemberId(null)} >
                                                    {t(`${SETTINGS_T}.role.member`)}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>

                                    <button
                                        type="button"
                                        className="eca-settings-member-delete-button"
                                        onClick={() => void handleDeleteMember(member)}
                                        disabled={member.role === "OWNER" || deletingMemberId === member.organizationMemberId}
                                        aria-label={t(`${SETTINGS_T}.deleteMember`)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M5 2C5 1.46957 5.21071 0.960859 5.58579 0.585786C5.96086 0.210714 6.46957 0 7 0H13C13.5304 0 14.0391 0.210714 14.4142 0.585786C14.7893 0.960859 15 1.46957 15 2V4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5C20 5.26522 19.8946 5.51957 19.7071 5.70711C19.5196 5.89464 19.2652 6 19 6H17.931L17.064 18.142C17.0281 18.6466 16.8023 19.1188 16.4321 19.4636C16.0619 19.8083 15.5749 20 15.069 20H4.93C4.42414 20 3.93707 19.8083 3.56688 19.4636C3.1967 19.1188 2.97092 18.6466 2.935 18.142L2.07 6H1C0.734784 6 0.48043 5.89464 0.292893 5.70711C0.105357 5.51957 0 5.26522 0 5C0 4.73478 0.105357 4.48043 0.292893 4.29289C0.48043 4.10536 0.734784 4 1 4H5V2ZM7 4H13V2H7V4ZM4.074 6L4.931 18H15.07L15.927 6H4.074ZM8 8C8.26522 8 8.51957 8.10536 8.70711 8.29289C8.89464 8.48043 9 8.73478 9 9V15C9 15.2652 8.89464 15.5196 8.70711 15.7071C8.51957 15.8946 8.26522 16 8 16C7.73478 16 7.48043 15.8946 7.29289 15.7071C7.10536 15.5196 7 15.2652 7 15V9C7 8.73478 7.10536 8.48043 7.29289 8.29289C7.48043 8.10536 7.73478 8 8 8ZM12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9V15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15V9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8Z" fill="#808080"/>
                                        </svg>
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}

                    {canManageOrganization ? (
                        <div className="eca-settings-pending-section">
                            <strong className="eca-settings-manager-title">{t(`${SETTINGS_T}.pendingTitle`)}</strong>
                            {managementLoading ? (
                                <div className="eca-settings-empty">{t(`${SETTINGS_T}.pendingLoading`)}</div>
                            ) : pendingMembers.length === 0 ? (
                                <div className="eca-settings-empty">{t(`${SETTINGS_T}.noPendingMembers`)}</div>
                            ) : (
                                <div className="eca-settings-pending-list">
                                    <div className="eca-settings-pending-list-head">
                                        <span>{t(`${SETTINGS_T}.name`)}</span>
                                        <span>{t(`${SETTINGS_T}.email`)}</span>
                                        <span>{t(`${SETTINGS_T}.roleTitle`)}</span>
                                        <span aria-hidden="true" />
                                    </div>
                                    {pendingMembers.map((member) => {
                                        const reviewing = reviewingMemberId === member.organizationMemberId;

                                        return (
                                            <article className="eca-settings-pending-row" key={member.organizationMemberId}>
                                                <span className="eca-settings-member-name">{member.userName ?? t(`${SETTINGS_T}.noName`)}</span>
                                                <span className="eca-settings-member-email">{member.email ?? t(`${SETTINGS_T}.noEmail`)}</span>
                                                <span className="eca-settings-member-role">{t(`${SETTINGS_T}.role.member`)}</span>

                                                <div className="eca-settings-pending-actions">
                                                    <button type="button" className="eca-settings-pending-approve" onClick={() => void handleApproveMember(member)} disabled={reviewing}> 
                                                        {t(`${SETTINGS_T}.approve`)}
                                                    </button>
                                                    <button type="button" className="eca-settings-pending-reject" onClick={() => void handleRejectMember(member)} disabled={reviewing}>
                                                        {t(`${SETTINGS_T}.reject`)}
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null}

                </section>
            )}

            {memberInviteOpen ? (
                <div className="eca-settings-invite-modal-backdrop" onMouseDown={() => setMemberInviteOpen(false)}>
                    <div className="eca-settings-invite-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="eca-settings-invite-modal-head">
                            <h3>{t(`${SETTINGS_T}.inviteModalTitle`)}</h3>
                            <button type="button" className="eca-settings-invite-modal-close" onClick={() => setMemberInviteOpen(false)} aria-label={t(`${SETTINGS_T}.close`)}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <strong className="eca-settings-invite-modal-guide">
                            {t(`${SETTINGS_T}.inviteModalGuide`)}
                        </strong>

                        <div className="eca-settings-invite-modal-linkbox">
                            <span>{memberInviteUrl || "http://"}</span>
                            <button type="button" onClick={() => void handleCopyInviteLink()}>
                                {t(`${SETTINGS_T}.copy`)}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {ownerTransferTarget ? (
                <div className="eca-settings-owner-transfer-modal-backdrop" onMouseDown={() => setOwnerTransferTarget(null)}>
                    <div className="eca-settings-owner-transfer-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="eca-settings-owner-transfer-modal-head">
                            <h3>{t(`${SETTINGS_T}.ownerTransferTitle`)}</h3>
                            <button type="button" className="eca-settings-owner-transfer-modal-close" onClick={() => setOwnerTransferTarget(null)} aria-label={t(`${SETTINGS_T}.close`)}>
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <p className="eca-settings-owner-transfer-message">
                            <strong>{ownerTransferTarget.userName ?? t(`${SETTINGS_T}.selectedMember`)}</strong>
                            {t(`${SETTINGS_T}.ownerTransferQuestionSuffix`)}
                        </p>

                       <p className="eca-settings-owner-transfer-desc">
                            {t(`${SETTINGS_T}.ownerTransferDesc`)}
                        </p>

                        <div className="eca-settings-owner-transfer-actions">
                            <button type="button" className="eca-settings-owner-transfer-cancel" onClick={() => setOwnerTransferTarget(null)} disabled={ownerTransferring}>
                                {t(`${SETTINGS_T}.cancel`)}
                            </button>
                            <button type="button" className="eca-settings-owner-transfer-confirm" onClick={() => void handleTransferOwner()} disabled={ownerTransferring}>
                                {ownerTransferring ? t(`${SETTINGS_T}.transferring`) : t(`${SETTINGS_T}.transferOwner`)}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}