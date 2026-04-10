// src/pages/admin/desktop/default/studentIdCard/users.tsx
// 사용자 목록 페이지 (PC)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers, approveAdminUser, rejectAdminUser, getStudentIdImg, grantAdminRole, revokeAdminRole, checkIsCaptain, type GrantableAdminRole, } from "../../../../../api/client";
import "./users.css";
import "../admin.css";

const REJECT_REASON_OPTIONS = [
	"사진이 선명하지 않습니다.",
	"이름이 일치하지 않습니다.",
	"만료된 학생증입니다.",
	"직접 입력",
] as const;

function statusLabel(status: string) {
	switch (status) {
		case "APPROVED":
			return "인증완료";
		case "PENDING":
			return "인증대기";
		case "REJECTED":
			return "인증거절";
		default:
			return status;
	}
}

function statusClass(status: string) {
	switch (status) {
		case "APPROVED":
			return "status--approved";
		case "PENDING":
			return "status--pending";
		case "REJECTED":
			return "status--rejected";
		default:
			return "status--etc";
	}
}

function displaySchoolname(u: AdminUser) {
	if (u.school && u.school.name) {
		return u.school.name;
	}
	return "-";
}

export default function AdminUsersPage(): React.ReactElement {
	const [users, setUsers] = React.useState<AdminUser[]>([]);
	const [selectedId, setSelectedId] = React.useState<number | null>(null);

	const [loading, setLoading] = React.useState(true);
	const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
	const [actionLoading, setActionLoading] = React.useState(false);
	const selectedUser = React.useMemo(
		() => users.find((u) => u.userId === selectedId) ?? null,
		[users, selectedId]
	);

	const [verificationUrl, setVerificationUrl] = React.useState<string>("");
	const [verificationLoading, setVerificationLoading] = React.useState(false);
	const [verificationError, setVerificationError] = React.useState<string | null>(null);
	const [isCaptain, setIsCaptain] = React.useState(false);

	const [rejectReasonType, setRejectReasonType] = React.useState<string>(REJECT_REASON_OPTIONS[0]);
	const [customRejectReason, setCustomRejectReason] = React.useState("");

	const [roleLoading, setRoleLoading] = React.useState(false);
	const [selectedAdminRole, setSelectedAdminRole] = React.useState<GrantableAdminRole>("ROLE_ADMIN");

	const totalCount = users.length;
	const approvedCount = users.filter((u) => u.status === "APPROVED").length;

	React.useEffect(() => { // CAPTAIN 여부 로드
		let mounted = true;

		(async () => {
			try {
				const captain = await checkIsCaptain();
				if (!mounted) return;
				setIsCaptain(captain);
			} catch (e) {
				console.error(e);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				setLoading(true);
				setErrorMsg(null);
				const list = await getAdminUsers(); 
				if (!mounted) return;

				setUsers(list);
				setSelectedId((prev) => (prev && list.some((u) => u.userId === prev) ? prev : list[0]?.userId ?? null));
			} catch (e) {
				if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
					setErrorMsg("관리자 권한이 필요합니다.");
					return;
				}
				setErrorMsg("사용자 목록을 불러오지 못했습니다.");
				console.error(e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => {
		let mounted = true;

		(async () => {
			if (!selectedId) {
				setVerificationUrl("");
				setVerificationError(null);
				return;
			}

			setVerificationLoading(true);
			setVerificationError(null);

			try {
				const res = await getStudentIdImg(selectedId);
				if (!mounted) return;

				setVerificationUrl(res.url ?? "");
			} catch (e) {
				if (!mounted) return;

				if (e instanceof ApiError) {
					if (e.status === 404) setVerificationError("학생증 이미지가 없습니다.");
					else if (e.status === 401 || e.status === 403) setVerificationError("권한이 없습니다.");
					else setVerificationError("학생증 이미지를 불러오지 못했습니다.");
				} else {
					setVerificationError("학생증 이미지를 불러오지 못했습니다.");
				}
				setVerificationUrl("");
			} finally {
				if (mounted) setVerificationLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [selectedId]);

	const patchUserInList = (updated: AdminUser) => {
		setUsers((prev) =>
			prev.map((u) => (u.userId === updated.userId ? { ...u, ...updated } : u))
		);
	};

	const handleApprove = async () => {
		if (!selectedUser) return;
		if (actionLoading) return;
		if (selectedUser.status !== "PENDING") return; 

		setActionLoading(true);
		try {
			const updated = await approveAdminUser(selectedUser.userId);
			patchUserInList(updated); 
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.status === 404) alert("사용자를 찾을 수 없습니다.");
				else if (e.status === 403) alert("접근 권한이 없습니다.");
				else alert("승인 처리에 실패했습니다.");
			} else {
				alert("승인 처리에 실패했습니다.");
			}
			console.error(e);
		} finally {
			setActionLoading(false);
		}
	};

	const rejectReason = React.useMemo(() => { // 거절 사유 문자열 계산
		if (rejectReasonType === "직접 입력") {
			return customRejectReason.trim();
		}
		return rejectReasonType;
	}, [rejectReasonType, customRejectReason]);

	const handleReject = async () => {
		if (!selectedUser) return;
		if (actionLoading) return;
		if (selectedUser.status !== "PENDING") return;

		if (!rejectReason) {
			alert("거절 사유를 입력해주세요.");
			return;
		}

		setActionLoading(true);
		try {
			const updated = await rejectAdminUser(selectedUser.userId, { reason: rejectReason });
			patchUserInList(updated);
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.status === 404) alert("사용자를 찾을 수 없습니다.");
				else if (e.status === 403) alert("접근 권한이 없습니다.");
				else alert("거절 처리에 실패했습니다.");
			} else {
				alert("거절 처리에 실패했습니다.");
			}
			console.error(e);
		} finally {
			setActionLoading(false);
		}
	};
	
	const handleGrantAdminRole = async () => { // 관리자 권한 부여
		if (!selectedUser) return;
		if (!isCaptain) return;
		if (roleLoading) return;

		setRoleLoading(true);
		try {
			const updated = await grantAdminRole(selectedUser.userId, { role: selectedAdminRole });
			patchUserInList(updated);
		} catch (e) {
			console.error(e);
			if (e instanceof ApiError && e.status === 403) {
				alert("CAPTAIN 권한이 필요합니다.");
			} else {
				alert("관리자 권한 부여에 실패했습니다.");
			}
		} finally {
			setRoleLoading(false);
		}
	};

	const handleRevokeAdminRole = async () => { // 관리자 권한 회수
		if (!selectedUser) return;
		if (!isCaptain) return;
		if (roleLoading) return;

		setRoleLoading(true);
		try {
			const updated = await revokeAdminRole(selectedUser.userId, { role: selectedAdminRole });
			patchUserInList(updated);
		} catch (e) {
			console.error(e);
			if (e instanceof ApiError && e.status === 403) {
				alert("CAPTAIN 권한이 필요합니다.");
			} else {
				alert("관리자 권한 회수에 실패했습니다.");
			}
		} finally {
			setRoleLoading(false);
		}
	};

	// const canAct = !!selectedUser && selectedUser.status === "PENDING" && !actionLoading; 

	return (
		<div className="admin-grid">
			{/* 목록 */}
			<section className="admin-col admin-col--left">
				<div className="admin-section-head">
					<div className="admin-section-title">전체 사용자</div>
					<div className="admin-section-count">
						<span className="admin-count-strong">{approvedCount}명</span>
						<span className="admin-count-total">/{totalCount}명</span>
					</div>
				</div>

				<div className="admin-list">
					{loading ? (
						<p className="loading">불러오는 중…</p>
					) : errorMsg ? (
						<p className="error">{errorMsg}</p>
					) : users.length === 0 ? (
						<p className="empty">등록된 사용자가 없습니다.</p>
					) : (
						users.map((u, idx) => {
							const isSelected = u.userId === selectedId;
							return (
								<button key={u.userId} type="button" className={isSelected ? "admin-list-item admin-list-item--selected" : "admin-list-item"} onClick={() => setSelectedId(u.userId)} >
									<span className="admin-badge">{idx + 1}</span>
									<span className="admin-user-name">{u.name}</span>
									<span className="admin-user-school">{displaySchoolname(u)}</span>
									<span className={`admin-user-status-pill ${statusClass(u.status)}`}>
										{statusLabel(u.status)}
									</span>
									<span className="admin-chevron"><img src="/icons/chevron-right.svg" alt="" /></span>
								</button>
							);
						})
					)}
				</div>
			</section>

			{/* 상세 */}
			<section className="admin-col admin-col--right">
				<div className="admin-detail-card">
					{!selectedUser ? (
						<div style={{ padding: 8, textAlign: "center", fontWeight: 700 }}> 사용자를 선택해주세요. </div>
					) : (
						<>
						<h2 className="admin-detail-name">{selectedUser.name}</h2>

						{/* 학생증 이미지 */}
						<div className="admin-detail-photo">
							{verificationLoading ? (
								<span>불러오는 중…</span>
							) : verificationUrl ? (
								<img className="student-id-img-area" src={verificationUrl} alt="verification" />
							) : (
								<span>{verificationError ?? "(학생증 사진 없음)"}</span>
							)}
						</div>

						<div className="admin-detail-actions">
							<div className="admin-reject-reason-box">
								<div className="admin-reject-reason-title">거절 사유</div>

								<select
									className="admin-select"
									value={rejectReasonType}
									onChange={(e) => setRejectReasonType(e.target.value)}
									disabled={actionLoading}
								>
									{REJECT_REASON_OPTIONS.map((opt) => (
										<option key={opt} value={opt}>{opt}</option>
									))}
								</select>

								{rejectReasonType === "직접 입력" && (
									<textarea
										className="admin-textarea"
										value={customRejectReason}
										onChange={(e) => setCustomRejectReason(e.target.value)}
										placeholder="거절 사유를 입력해주세요."
										rows={4}
									/>
								)}
							</div>
							<button className="admin-btn admin-btn--ghost" type="button" onClick={handleReject} disabled={actionLoading} > 
								{actionLoading ? "처리 중…" : "거절"}
							</button>
							<button className="admin-btn admin-btn--primary" type="button" onClick={handleApprove} disabled={actionLoading} >
								{actionLoading ? "처리 중…" : "승인"}
							</button>
						</div>

						{isCaptain && selectedUser && (
							<div className="admin-role-box">
								<div className="admin-reject-reason-title">관리자 권한 설정</div>

								<select
									className="admin-select"
									value={selectedAdminRole}
									onChange={(e) => setSelectedAdminRole(e.target.value as GrantableAdminRole)}
									disabled={roleLoading}
								>
									<option value="ROLE_ADMIN">ROLE_ADMIN</option>
									<option value="ROLE_JUMP_ADMIN">ROLE_JUMP_ADMIN</option>
									<option value="ROLE_KAKAO_ADMIN">ROLE_KAKAO_ADMIN</option>
								</select>

								<div className="admin-detail-actions">
									<button
										className="admin-btn admin-btn--ghost"
										type="button"
										onClick={handleRevokeAdminRole}
										disabled={roleLoading}
									>
										{roleLoading ? "처리 중…" : "권한 회수"}
									</button>
									<button
										className="admin-btn admin-btn--primary"
										type="button"
										onClick={handleGrantAdminRole}
										disabled={roleLoading}
									>
										{roleLoading ? "처리 중…" : "권한 부여"}
									</button>
								</div>
							</div>
						)}
						</>
					)}
				</div>
			</section>
		</div>
	);
}