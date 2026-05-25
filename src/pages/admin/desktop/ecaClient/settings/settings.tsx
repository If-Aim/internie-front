import React from "react";
import { createOrganizationInvite, getMyOrganizations, getOrganizationMembers, transferOrganizationOwner } from "../../../../../api/organizationClient";
import type { MyOrganizationResponse, OrganizationMemberResponse, OrganizationMemberRole } from "../../../../../api/organizationClient";
import "./settings.css";

function getRoleLabel(role: OrganizationMemberRole): string {
    if (role === "OWNER") return "Owner";
    return "Member";
}

function buildInviteUrl(token: string): string {
    return `${window.location.origin}/invite/organization/${token}`;
}

export default function EcaAdminSettingsPage(): React.ReactElement {
    const [organizations, setOrganizations] = React.useState<MyOrganizationResponse[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = React.useState<number | null>(null);
    const [members, setMembers] = React.useState<OrganizationMemberResponse[]>([]);
    const [memberInviteOpen, setMemberInviteOpen] = React.useState(false);
    const [memberInviteUrl, setMemberInviteUrl] = React.useState("");

    const [ownerTransferTarget, setOwnerTransferTarget] = React.useState<OrganizationMemberResponse | null>(null);
    const [ownerTransferring, setOwnerTransferring] = React.useState(false);

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

    const refreshOrganizationManagementData = React.useCallback(async (): Promise<void> => {
        if (!selectedOrganizationId) {
            setMembers([]);
            return;
        }

        if (!canManageOrganization) {
            setMembers([]);
            return;
        }

        setManagementLoading(true);

        try {
            const memberData = await getOrganizationMembers(selectedOrganizationId);
            setMembers(memberData);
        } catch (error) {
            console.error(error);
            setMembers([]);
        } finally {
            setManagementLoading(false);
        }
    }, [selectedOrganizationId, canManageOrganization]);

    React.useEffect(() => {
        void refreshOrganizationManagementData();
    }, [refreshOrganizationManagementData]);

    function handleChangeOrganization(e: React.ChangeEvent<HTMLSelectElement>): void {
        const nextId = Number(e.target.value);
        setSelectedOrganizationId(Number.isNaN(nextId) ? null : nextId);
    }

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
            window.alert("초대 링크 생성에 실패했습니다.");
        } finally {
            setInviteCreating(false);
        }
    }

    async function handleCopyInviteLink(): Promise<void> {
        if (!memberInviteUrl) return;

        try {
            await navigator.clipboard.writeText(memberInviteUrl);
            window.alert("초대 링크를 복사했습니다.");
        } catch (error) {
            console.error(error);
            window.alert("초대 링크 복사에 실패했습니다.");
        }
    }

    function openOwnerTransferModal(member: OrganizationMemberResponse): void {
        if (!canManageOrganization) return;
        if (member.role === "OWNER") return;

        setOwnerTransferTarget(member);
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

            window.alert("Owner 권한을 이전했습니다.");
        } catch (error) {
            console.error(error);
            window.alert("Owner 권한 이전에 실패했습니다.");
        } finally {
            setOwnerTransferring(false);
        }
    }

    return (
        <div className="eca-settings-page">
            <header className="eca-settings-header">
                <h1>설정</h1>
            </header>

            {!selectedOrganization ? (
                <section className="eca-settings-card">
                    <div className="eca-settings-empty">
                        {organizationLoading ? "기관 정보를 불러오는 중입니다." : "소속된 기관이 없습니다."}
                    </div>
                </section>
            ) : (
                <section className="eca-settings-card eca-settings-member-management-card">
                    <div className="eca-settings-member-management-head">
                        <div>
                            <label className="eca-settings-form-label">
                                기관명<span>*</span>
                            </label>

                            <div className="eca-settings-organization-select-wrap">
                                <select
                                    className="eca-settings-organization-name-select"
                                    value={selectedOrganizationId ?? ""}
                                    onChange={handleChangeOrganization}
                                    disabled={organizations.length <= 1}
                                >
                                    {organizations.map((organization) => (
                                        <option key={organization.organizationId} value={organization.organizationId}>
                                            {organization.organizationName}
                                        </option>
                                    ))}
                                </select>

                                {organizations.length > 1 ? (
                                    <span className="eca-settings-organization-select-arrow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M4 6L8 10L12 6" stroke="#808080" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="eca-settings-form-label">
                                나의 권한<span>*</span>
                            </label>

                            <div className="eca-settings-role-select-wrap">
                                <select className="eca-settings-role-select" value={getRoleLabel(selectedOrganization.memberRole)} disabled>
                                    <option>{getRoleLabel(selectedOrganization.memberRole)}</option>
                                </select>

                                <span className="eca-settings-role-select-arrow">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M15 8L10 13L5 8" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="eca-settings-manager-section">
                        <strong className="eca-settings-manager-title">관리자 명단</strong>

                        {canManageOrganization ? (
                            <button type="button" className="eca-settings-add-member-button" onClick={() => void handleCreateInvite()} disabled={inviteCreating}>
                                {inviteCreating ? "생성 중" : "추가하기"}
                            </button>
                        ) : null}
                    </div>

                    {!canManageOrganization ? (
                        <div className="eca-settings-empty eca-settings-empty--large">
                            멤버는 초대 권한이 없습니다.
                        </div>
                    ) : managementLoading ? (
                        <div className="eca-settings-empty">멤버 목록을 불러오는 중입니다.</div>
                    ) : members.length === 0 ? (
                        <div className="eca-settings-empty">등록된 멤버가 없습니다.</div>
                    ) : (
                        <div className="eca-settings-member-list">
                            {members.map((member) => (
                                <article
                                    className={"eca-settings-member-row" + (canManageOrganization && member.role !== "OWNER" ? " is-clickable" : "")}
                                    key={member.organizationMemberId}
                                    onClick={() => openOwnerTransferModal(member)}
                                >
                                    <span className="eca-settings-member-name">{member.userName ?? "이름 없음"}</span>
                                    <span className="eca-settings-member-email">{member.email ?? "이메일 없음"}</span>
                                    <span className={`eca-settings-member-role eca-settings-member-role--${member.role.toLowerCase()}`}>
                                        {getRoleLabel(member.role)}
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {memberInviteOpen ? (
                <div className="eca-settings-invite-modal-backdrop" onMouseDown={() => setMemberInviteOpen(false)}>
                    <div className="eca-settings-invite-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="eca-settings-invite-modal-head">
                            <h3>담당자 추가</h3>
                            <button type="button" className="eca-settings-invite-modal-close" onClick={() => setMemberInviteOpen(false)} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <strong className="eca-settings-invite-modal-guide">
                            아래 링크를 새로운 담당자에게 보내주세요
                        </strong>

                        <div className="eca-settings-invite-modal-linkbox">
                            <span>{memberInviteUrl || "http://"}</span>
                            <button type="button" onClick={() => void handleCopyInviteLink()}>
                                복사하기
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {ownerTransferTarget ? (
                <div className="eca-settings-owner-transfer-modal-backdrop" onMouseDown={() => setOwnerTransferTarget(null)}>
                    <div className="eca-settings-owner-transfer-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="eca-settings-owner-transfer-modal-head">
                            <h3>Owner 권한 이전</h3>
                            <button type="button" className="eca-settings-owner-transfer-modal-close" onClick={() => setOwnerTransferTarget(null)} aria-label="닫기">
                                <img src="/icons/x-01.svg" alt="" />
                            </button>
                        </div>

                        <p className="eca-settings-owner-transfer-message">
                            <strong>{ownerTransferTarget.userName ?? "선택한 멤버"}</strong>님에게 Owner 권한을 넘기시겠습니까?
                        </p>

                        <p className="eca-settings-owner-transfer-desc">
                            권한 이전 후 현재 계정은 Member로 변경되며, 기관 초대 및 멤버 관리 권한을 사용할 수 없습니다.
                        </p>

                        <div className="eca-settings-owner-transfer-actions">
                            <button type="button" className="eca-settings-owner-transfer-cancel" onClick={() => setOwnerTransferTarget(null)} disabled={ownerTransferring}>
                                취소
                            </button>
                            <button type="button" className="eca-settings-owner-transfer-confirm" onClick={() => void handleTransferOwner()} disabled={ownerTransferring}>
                                {ownerTransferring ? "이전 중" : "권한 넘기기"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}