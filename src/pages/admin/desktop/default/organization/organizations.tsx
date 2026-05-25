import React from "react";
import { ApiError, getAdminUsers, type AdminUser } from "../../../../../api/client";
import { createOrganization, type OrganizationResponse } from "../../../../../api/organizationClient";
import "./organizations.css";

function normalizeText(value: unknown): string {
    return String(value ?? "").trim();
}

function getUserDisplayName(user: AdminUser): string {
    return normalizeText(user.name) || normalizeText(user.nickname) || "이름 없음";
}

function getUserEmail(user: AdminUser): string {
    return normalizeText(user.email) || "이메일 없음";
}

export default function AdminOrganizationsPage(): React.ReactElement {
    const ownerPickerRef = React.useRef<HTMLDivElement | null>(null);

    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = React.useState(true);
    const [usersError, setUsersError] = React.useState<string | null>(null);

    const [organizationName, setOrganizationName] = React.useState("");
    const [ownerQuery, setOwnerQuery] = React.useState("");
    const [ownerPickerOpen, setOwnerPickerOpen] = React.useState(false);
    const [selectedOwnerId, setSelectedOwnerId] = React.useState<number | null>(null);

    const [submitting, setSubmitting] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [createdOrganization, setCreatedOrganization] = React.useState<OrganizationResponse | null>(null);

    React.useEffect(() => {
        let mounted = true;

        async function fetchUsers(): Promise<void> {
            setUsersLoading(true);
            setUsersError(null);

            try {
                const data = await getAdminUsers();

                if (!mounted) return;

                setUsers(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);

                if (!mounted) return;

                if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                    setUsersError("사용자 목록 조회 권한이 없습니다.");
                } else {
                    setUsersError("사용자 목록을 불러오지 못했습니다.");
                }
            } finally {
                if (mounted) {
                    setUsersLoading(false);
                }
            }
        }

        void fetchUsers();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!ownerPickerOpen) return;

        function handleMouseDown(event: MouseEvent): void {
            if (!ownerPickerRef.current) return;
            if (ownerPickerRef.current.contains(event.target as Node)) return;

            setOwnerPickerOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [ownerPickerOpen]);

    const selectedOwner = React.useMemo(() => {
        if (selectedOwnerId === null) return null;
        return users.find((user) => user.userId === selectedOwnerId) ?? null;
    }, [selectedOwnerId, users]);

    const filteredUsers = React.useMemo(() => {
        const keyword = ownerQuery.trim().toLowerCase();

        if (!keyword) return users;

        return users.filter((user) => {
            const name = getUserDisplayName(user).toLowerCase();
            const email = getUserEmail(user).toLowerCase();
            const userId = String(user.userId);

            return name.includes(keyword) || email.includes(keyword) || userId.includes(keyword);
        });
    }, [ownerQuery, users]);


    function handleSelectOwner(user: AdminUser): void {
        setSelectedOwnerId(user.userId);
        setOwnerQuery(`${getUserDisplayName(user)} · ${getUserEmail(user)}`);
        setOwnerPickerOpen(false);
        setSubmitError(null);
    }

    function resetForm(): void {
        setOrganizationName("");
        setOwnerQuery("");
        setSelectedOwnerId(null);
        setSubmitError(null);
    }

    async function handleCreateOrganization(): Promise<void> {
        if (submitting) return;

        const trimmedName = organizationName.trim();

        if (!trimmedName) {
            setSubmitError("기관명을 입력해주세요.");
            return;
        }

        if (selectedOwnerId === null) {
            setSubmitError("최초 Owner를 선택해주세요.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const response = await createOrganization({
                name: trimmedName,
                ownerUserId: selectedOwnerId,
            });

            setCreatedOrganization(response);

            resetForm();
        } catch (error) {
            console.error(error);

            if (error instanceof ApiError) {
                if (error.code === "ORGANIZATION_NAME_DUPLICATE") {
                    setSubmitError("이미 사용 중인 기관명입니다.");
                    return;
                }

                if (error.code === "USER_NOT_FOUND") {
                    setSubmitError("선택한 Owner 사용자를 찾을 수 없습니다.");
                    return;
                }
            }

            setSubmitError("기관 생성에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-organization-page">
            <section className="admin-organization-left">
                <div className="admin-organization-head">
                    <h1>기관 관리</h1>
                    <p>신규 기관을 생성하고 최초 Owner를 지정합니다.</p>
                </div>

                <div className="admin-organization-form-card">
                    <div className="admin-organization-field">
                        <label htmlFor="organization-name">기관명</label>
                        <input
                            id="organization-name"
                            type="text"
                            value={organizationName}
                            onChange={(event) => {
                                setOrganizationName(event.target.value);
                                setSubmitError(null);
                            }}
                            placeholder="예: 용산청소년센터"
                        />
                    </div>

                    <div className="admin-organization-field" ref={ownerPickerRef}>
                        <label htmlFor="organization-owner">최초 Owner</label>

                        <div className="admin-organization-owner-picker">
                            <input
                                id="organization-owner"
                                type="text"
                                value={ownerQuery}
                                onChange={(event) => {
                                    setOwnerQuery(event.target.value);
                                    setSelectedOwnerId(null);
                                    setOwnerPickerOpen(true);
                                    setSubmitError(null);
                                }}
                                onFocus={() => setOwnerPickerOpen(true)}
                                placeholder="사용자명, 이메일, userId 검색"
                            />

                            {ownerPickerOpen ? (
                                <div className="admin-organization-owner-dropdown">
                                    {usersLoading ? (
                                        <div className="admin-organization-owner-empty">사용자 목록을 불러오는 중입니다.</div>
                                    ) : usersError ? (
                                        <div className="admin-organization-owner-empty">{usersError}</div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="admin-organization-owner-empty">검색 결과가 없습니다.</div>
                                    ) : (
                                        filteredUsers.slice(0, 30).map((user) => (
                                            <button
                                                key={user.userId}
                                                type="button"
                                                className="admin-organization-owner-option"
                                                onClick={() => handleSelectOwner(user)}
                                            >
                                                <span className="admin-organization-owner-name">
                                                    {getUserDisplayName(user)}
                                                </span>
                                                <span className="admin-organization-owner-email">
                                                    {getUserEmail(user)}
                                                </span>
                                                <span className="admin-organization-owner-id">
                                                    ID {user.userId}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {selectedOwner ? (
                            <div className="admin-organization-selected-owner">
                                선택됨: <strong>{getUserDisplayName(selectedOwner)}</strong>
                                <span>{getUserEmail(selectedOwner)}</span>
                            </div>
                        ) : null}
                    </div>

                    {submitError ? (
                        <div className="admin-organization-error">{submitError}</div>
                    ) : null}

                    <div className="admin-organization-actions">
                        <button
                            type="button"
                            className="admin-organization-reset-button"
                            onClick={resetForm}
                            disabled={submitting}
                        >
                            초기화
                        </button>

                        <button
                            type="button"
                            className="admin-organization-submit-button"
                            onClick={() => void handleCreateOrganization()}
                            disabled={submitting}
                        >
                            {submitting ? "생성 중..." : "기관 생성"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="admin-organization-right">
                <div className="admin-organization-preview-card">
                    <div className="admin-organization-preview-head">
                        <h2>생성 결과</h2>
                        <p>기관 생성 완료 후 주요 정보가 표시됩니다.</p>
                    </div>

                    {!createdOrganization ? (
                        <div className="admin-organization-empty-result">
                            아직 생성한 기관이 없습니다.
                        </div>
                    ) : (
                        <div className="admin-organization-result">
                            <div className="admin-organization-result-row">
                                <span>기관 ID</span>
                                <strong>{createdOrganization.organizationId}</strong>
                            </div>

                            <div className="admin-organization-result-row">
                                <span>기관명</span>
                                <strong>{createdOrganization.name}</strong>
                            </div>

                            <div className="admin-organization-result-row">
                                <span>Owner</span>
                                <strong>
                                    {createdOrganization.ownerName ?? "이름 없음"}
                                    <em> · ID {createdOrganization.ownerUserId}</em>
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}