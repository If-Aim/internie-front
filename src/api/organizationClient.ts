import { api } from "./client";

/* - Organization 공통 타입 - */
export type OrganizationMemberRole = "OWNER" | "MEMBER";
export type OrganizationInviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELED";

export type OrganizationResponse = {
    organizationId: number;
    name: string;
    ownerUserId: number;
    ownerName: string | null;
};

export type MyOrganizationResponse = {
    organizationId: number;
    organizationName: string;
    memberRole: OrganizationMemberRole;
};

export type OrganizationInviteResponse = {
    organizationInviteId: number;
    organizationId: number;
    organizationName: string;
    token: string;
    status: OrganizationInviteStatus;
    expiresAt: string;
};

export type AcceptOrganizationInviteResponse = {
    organizationId: number;
    organizationName: string;
    organizationMemberId: number;
    memberRole: OrganizationMemberRole;
};

export type OrganizationMemberResponse = {
    organizationMemberId: number;
    userId: number;
    userName: string | null;
    email: string | null;
    role: OrganizationMemberRole;
};

export type CreateOrganizationRequest = {
    name: string;
    ownerUserId: number;
};

export type TransferOrganizationOwnerRequest = {
    nextOwnerMemberId: number;
};

/* - Organization 생성 / 조회 - */
export async function createOrganization(
    request: CreateOrganizationRequest
): Promise<OrganizationResponse> {
    return api<OrganizationResponse>(
        "/admin-client/organizations",
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function getOrganization(
    organizationId: number | string
): Promise<OrganizationResponse> {
    return api<OrganizationResponse>(
        `/admin-client/organizations/${organizationId}`,
        { method: "GET" }
    );
}

export async function getMyOrganizations(): Promise<MyOrganizationResponse[]> {
    return api<MyOrganizationResponse[]>(
        "/admin-client/organizations/me",
        { method: "GET" }
    );
}

/* - Organization 초대 - */
export async function createOrganizationInvite(
    organizationId: number | string
): Promise<OrganizationInviteResponse> {
    return api<OrganizationInviteResponse>(
        `/admin-client/organizations/${organizationId}/invites`,
        { method: "POST" }
    );
}

export async function getOrganizationInvites(
    organizationId: number | string
): Promise<OrganizationInviteResponse[]> {
    return api<OrganizationInviteResponse[]>(
        `/admin-client/organizations/${organizationId}/invites`,
        { method: "GET" }
    );
}

export async function deleteOrganizationInvite(
    organizationId: number | string,
    organizationInviteId: number | string
): Promise<void> {
    await api<void>(
        `/admin-client/organizations/${organizationId}/invites/${organizationInviteId}`,
        { method: "DELETE" }
    );
}

export async function acceptOrganizationInvite(
    token: string
): Promise<AcceptOrganizationInviteResponse> {
    return api<AcceptOrganizationInviteResponse>(
        `/admin-client/organizations/invites/${token}/accept`,
        { method: "POST" }
    );
}

/* - Organization 멤버 관리 - */
export async function getOrganizationMembers(
    organizationId: number | string
): Promise<OrganizationMemberResponse[]> {
    return api<OrganizationMemberResponse[]>(
        `/admin-client/organizations/${organizationId}/members`,
        { method: "GET" }
    );
}

export async function transferOrganizationOwner(
    organizationId: number | string,
    request: TransferOrganizationOwnerRequest
): Promise<OrganizationMemberResponse> {
    return api<OrganizationMemberResponse>(
        `/admin-client/organizations/${organizationId}/members/owner`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}