// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function buildUrl(path: string) {
    return path.startsWith("http")
		? path
		: `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
function getAuthHeader(): Record<string, string> {
	const token = localStorage.getItem("accessToken");
	if (!token) return {};
	return {
		Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
	};
}

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const res = await fetch(buildUrl("/auth/refresh"), {
            method: "POST",
            credentials: "include",
        });

        if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
        }

        const newAuth = res.headers.get("authorization") || res.headers.get("Authorization");

        if (!newAuth) {
            const bodyText = await res.text().catch(() => "");
            throw new ApiError(200, "No Authorization header in /auth/refresh response", bodyText);
        }

        localStorage.setItem("accessToken", newAuth);

        return newAuth;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}
async function requestWithAutoRefresh(
    path: string,
    init: RequestInit = {},
    opts?: { expectJson?: boolean; skipAuthRefresh?: boolean }
): Promise<Response> {
    const expectJson = opts?.expectJson ?? false;
    const skipAuthRefresh = opts?.skipAuthRefresh ?? false;

    const makeHeaders = (): Headers => {
        const isFormData = init.body instanceof FormData;
        const headers = new Headers(init.headers);

        Object.entries(getAuthHeader()).forEach(([key, value]) => {
            headers.set(key, value);
        });

        if (isFormData) {
            headers.delete("Content-Type");
            headers.delete("content-type");
            return headers;
        }

        if (expectJson && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        return headers;
    };

    const doFetch = async (): Promise<Response> => {
        return fetch(buildUrl(path), {
            ...init,
            headers: makeHeaders(),
            credentials: "include",
        });
    };

    let res = await doFetch();

    if (!skipAuthRefresh && (res.status === 401 || res.status === 403)) {
        try {
            await refreshAccessToken();
            res = await doFetch();
        } catch (e) {
            localStorage.removeItem("accessToken");
            throw e instanceof ApiError ? e : new ApiError(401, "Refresh failed");
        }

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("accessToken");
            const bodyText = await res.text().catch(() => "");
            throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
        }
    }

    return res;
}

export async function apiPublic(
    path: string,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(buildUrl(path), {
        ...init,
        credentials: "include",
    });
}

export async function apiPublicJson<T = unknown>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const res = await fetch(buildUrl(path), {
        ...init,
        credentials: "include",
    });

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as T;
}

export async function api<T = unknown>(
	path: string,
	init: RequestInit = {},
    opts?: { skipAuthRefresh?: boolean }
): Promise<T> {
	const res = await requestWithAutoRefresh(path, init, {
        expectJson: true,
        skipAuthRefresh: opts?.skipAuthRefresh ?? false,
    });

	if (res.status === 204) {
        return null as T;
    }

	if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

	const ct = res.headers.get("content-type") ?? "";
	if (!ct.includes("application/json")) {
		const bodyText = await res.text().catch(() => "");
		throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
	}

	return (await res.json()) as T;
}

/* Auth */ 
// 회원가입 요청
export type SignupRequest = {
    loginId: string;
    password: string;
    email?: string;
};

// 로그인 요청
export type LoginRequest = {
    loginId: string;
    password: string;
};

// 아이디 중복확인
export type LoginIdAvailabilityResponse = {
    available: boolean;
    message: string;
};

// 로그인 응답
export type LoginResponse = {
    onboardingCompleted: boolean;
    linkedToExistingAccount: boolean;
    message: string | null;
};

// 로컬 회원가입
export async function signup(input: SignupRequest): Promise<void> {
    const res = await fetch(buildUrl("/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            loginId: input.loginId,
            password: input.password,
            email: input.email ?? ""
        }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }
}

// 로컬 아이디 중복 확인
export async function checkLoginIdAvailability(
    loginId: string
): Promise<LoginIdAvailabilityResponse> {
    const qs = new URLSearchParams({
        loginId: loginId.trim(),
    }).toString();

    return apiPublicJson<LoginIdAvailabilityResponse>(`/auth/login-id/check?${qs}`, {
        method: "GET",
    });
}

// 로컬 로그인 
export async function loginWithLocal(input: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(buildUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            loginId: input.loginId,
            password: input.password,
        }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/login response", bodyText);
    }

    localStorage.setItem("accessToken", auth);

    return (await res.json()) as LoginResponse;
}

export type FindLoginIdCodeRequest = {
    email: string;
    language?: string;
};

export type FindLoginIdVerifyRequest = {
    email: string;
    code: string;
    language?: string;
};

export type FindLoginIdResponse = {
    maskedEmail: string;
    message: string;
};

export type SendResetPasswordCodeRequest = {
    loginId: string;
    email: string;
    language?: string;
};

export type VerifyResetPasswordCodeRequest = {
    loginId: string;
    email: string;
    code: string;
    language?: string;
};

export type ResetPasswordRequest = {
    loginId: string;
    email: string;
    resetToken: string;
    newPassword: string;
};

export type PasswordRecoveryResponse = {
    maskedEmail: string;
    message: string;
};

export type PasswordResetVerifyResponse = {
    maskedEmail: string;
    message: string;
    resetToken: string;
};

// 아이디 찾기
export async function sendFindLoginIdCode(
    email: string,
    language?: string
): Promise<FindLoginIdResponse> {
    const res = await apiPublic("/auth/login-id/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, language }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as FindLoginIdResponse;
}

export async function verifyFindLoginIdCode(
    email: string,
    code: string,
    language?: string
): Promise<FindLoginIdResponse> {
    const res = await apiPublic("/auth/login-id/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, language }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
    }

    return (await res.json()) as FindLoginIdResponse;
}

// 비밀번호 재설정
export async function sendResetPasswordCode(
    input: SendResetPasswordCodeRequest
): Promise<PasswordRecoveryResponse> {
    return apiPublicJson<PasswordRecoveryResponse>("/auth/password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            language: input.language,
        }),
    });
}

export async function verifyResetPasswordCode(
    input: VerifyResetPasswordCodeRequest
): Promise<PasswordResetVerifyResponse> {
    return apiPublicJson<PasswordResetVerifyResponse>("/auth/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            code: input.code.trim(),
            language: input.language,
        }),
    });
}

export async function resetPasswordWithToken(
    input: ResetPasswordRequest
): Promise<void> {
    await apiPublicJson<void>("/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            loginId: input.loginId.trim(),
            email: input.email.trim(),
            resetToken: input.resetToken.trim(),
            newPassword: input.newPassword,
        }),
    });
}


// 카카오 로그인
export async function loginWithKakao(code: string, redirectUri?: string): Promise<LoginResponse> {
    const body: any = redirectUri ? { code, redirectUri } : { code };

    const res = await fetch(buildUrl("/auth/kakao"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/kakao response", bodyText);
    }
    localStorage.setItem("accessToken", auth);

    return (await res.json()) as LoginResponse;
}

// 구글 로그인
export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const res = await fetch(buildUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);
        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const auth = res.headers.get("authorization") || res.headers.get("Authorization");
    if (!auth) {
        const bodyText = await res.text().catch(() => "");
        throw new ApiError(200, "No Authorization header in /auth/google response", bodyText);
    }

    localStorage.setItem("accessToken", auth);

    return (await res.json()) as LoginResponse;
}

// 로그아웃
export async function logout(): Promise<void> {
	const token = localStorage.getItem("accessToken");
	if (!token) return;

	await apiPublic("/auth/logout", {
		method: "POST",
		headers: {
			Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
		},
	});
}

// 회원가입용 이메일 인증
export async function sendEmailCode(
    email: string,
    language?: string
): Promise<SendEmailCodeResponse> {
    return apiPublicJson<SendEmailCodeResponse>("/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.trim(),
            language,
        }),
    });
}

export async function verifyEmailCode(
    email: string,
    code: string
): Promise<VerifyEmailCodeResponse> {
    return apiPublicJson<VerifyEmailCodeResponse>("/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
        }),
    });
}

// 로그인 후 이메일 인증
export async function sendMyEmailCode(
    email: string,
    language?: string
): Promise<SendEmailCodeResponse> {
    return api<SendEmailCodeResponse>("/users/me/email/send", {
        method: "POST",
        body: JSON.stringify({
            email: email.trim(),
            language,
        }),
    });
}

export async function verifyMyEmailCode(
    email: string,
    code: string
): Promise<VerifyEmailCodeResponse> {
    return api<VerifyEmailCodeResponse>("/users/me/email/verify", {
        method: "POST",
        body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
        }),
    });
}

// 회원 탈퇴
export type WithdrawRequest = {
    reason: string;
    detail?: string;
};

export async function withdraw(input: WithdrawRequest): Promise<void> {
    await api<void>("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({
            reason: input.reason,
            detail: input.detail ?? ""
        })
    });
}

// 업로드용 API
export async function apiUpload<T = unknown>(
    path: string,
    formData: FormData,
    init: RequestInit = {}
): Promise<T> {
    const res = await requestWithAutoRefresh(
        path,
        {
            ...init,
            method: init.method ?? "POST",
            body: formData,
            headers: init.headers,
        },
        { expectJson: false }
    );

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);

        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    const ct = res.headers.get("content-type") ?? "";

    if (ct.includes("application/json")) {
        return (await res.json()) as T;
    }

    return (await res.text()) as unknown as T;
}

// 다운로드용 API
export async function apiBlob(
    path: string,
    init: RequestInit = {},
    opts?: { skipAuthRefresh?: boolean }
): Promise<Blob> {
    const res = await requestWithAutoRefresh(path, init, {
        expectJson: false,
        skipAuthRefresh: opts?.skipAuthRefresh ?? false,
    });

    if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = parseErrorBody(bodyText);

        throw new ApiError(
            res.status,
            parsed.message ?? `HTTP ${res.status}`,
            bodyText,
            parsed.code
        );
    }

    return await res.blob();
}

// 맞춤 질문 조회
export type EventDayQuestionsResponse = {
	eventDayId: number;
	questionId: number;
	questionList: string[];
};

export async function getEventDayQuestions(eventDayId: string | number): Promise<EventDayQuestionsResponse> {
	return api<EventDayQuestionsResponse>(`/event-days/${eventDayId}/questions`);
}

// eventDay 상세
export type EventDayDetailResponse = {
	eventDayId: number;
	title: string;
	eventId: number;
	date: string;
	startTime?: string | null;
	endTime?: string | null;
	memo?: string | null;
	completed: boolean;
	transcriptions: Transcription[];
};

export async function getEventDayDetail(eventDayId: string | number): Promise<EventDayDetailResponse> {
	return api<EventDayDetailResponse>(`/event-days/${eventDayId}`);
}

// 이벤트 삭제
export async function deleteEvent(eventId: string | number): Promise<void> {
	return api<void>(`/events/${eventId}`, { method: "DELETE" });
}
export async function deleteEventDay(eventDayId: string | number): Promise<void> {
	return api<void>(`/event-days/${eventDayId}`, { method: "DELETE" });
}

/* - mypage관련 - */
// user 관련
export type UserSchool = {
	id: number;
	name: string;
	campus: string;
	region: string;
};
export type JumpOrganization = {
    id: number;
    name: string;
};
export type SubmitOnboardingInput = {
    name?: string | null;
	studentNumber?: string | null;
    interestJob?: string | null;
    interestCompany?: string | null;
    jumpOrganizationId?: number | null;
};
export type UserBase = {
	userId: number;
	email: string | null,
	emailVerified: boolean | null,
	name?: string | null;
	kakaoName?: string | null;

	nickname: string | null;
	profileImage: string | null;
	verificationImage: string | null;
	roleSet: string[];
	status: string;
    rejectionReason?: string | null;
	school: UserSchool | null;

	studentNumber?: string | null;

	interestJob?: string | null;
    interestCompany?: string | null;
	jumpOrganization?: JumpOrganization | null;

};

export type SubmitOnboardingResponse = UserBase;
export type UserMe = UserBase;
export type EmailSendStatus = "CODE_SENT" | "EXISTING_ACCOUNT_FOUND";
export type ExistingAccountType = "LOCAL" | "GOOGLE" | "KAKAO" | "UNKNOWN";

export type SendEmailCodeResponse = {
    status: EmailSendStatus;
    maskedEmail: string;
    existingAccountType: ExistingAccountType | null;
};

export type VerifyEmailCodeResponse = {
    verified: boolean;
    existingAccountFound: boolean;
    maskedEmail: string;
};

export function getUserIdFromAccessToken(): string | null {
	const token = localStorage.getItem("accessToken");
	if (!token) return null;

	const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
	const parts = raw.split(".");
	if (parts.length < 2) return null;

	try {
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
		atob(base64)
			.split("")
			.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
			.join("")
		);

		const payload = JSON.parse(json) as any;

		return (
			(payload.userId != null ? String(payload.userId) : null) ||
			(payload.id != null ? String(payload.id) : null) ||
			(payload.sub != null ? String(payload.sub) : null) ||
			null
		);
	} catch {
		return null;
	}
}

export async function getUserMe(): Promise<UserMe> {
	return api<UserMe>("/users/me");
}

// 온보딩 완료 판단
function normalizeNullableText(v: unknown): string {
    const s = String(v ?? "").trim();
    if (!s) return "";
    const lower = s.toLowerCase();
    if (lower === "null") return "";
    if (lower === "undefined") return "";
    return s;
}

export function getUserDisplayName(me: Partial<UserBase> | null | undefined): string {
    if (!me) return "";
    return normalizeNullableText((me as any).name) || normalizeNullableText((me as any).kakaoName);
}

export function isOnboardingDone(me: Partial<UserBase> | null | undefined): boolean {
    if (!me) return false;

    const name = normalizeNullableText((me as any).name);
    if (name.toUpperCase() === "NULL") return false;

    return name.length > 0;
}

export function routeAfterLoginFromLogin(
    login: LoginResponse
): "/student" | "/onboarding" {

    return login.onboardingCompleted ? "/student" : "/onboarding";
}

// 학교 조회
export async function searchSchools(keyword: string): Promise<UserSchool[]> {
	const q = keyword.trim();
	if (!q) return [];

	const qs = new URLSearchParams({ keyword: q }).toString();
	return api<UserSchool[]>(`/schools?${qs}`, { method: "GET" });
}

// 학교 선택
export type SelectMySchoolInput = {
	schoolId: number;
}; 
export type SelectMySchoolResponse = UserBase & {
	school: UserSchool | null;
};

export async function selectMySchool(input: SelectMySchoolInput): Promise<SelectMySchoolResponse> {
	if (input.schoolId == null || Number.isNaN(Number(input.schoolId))) {
		throw new ApiError(400, "schoolId가 올바르지 않습니다.");
	}

	return api<SelectMySchoolResponse>("/users/me/school", {
		method: "PATCH",
		body: JSON.stringify({ schoolId: Number(input.schoolId) } satisfies SelectMySchoolInput),
	});
}

// 재학생 인증
export type ApplyVerificationResponse = UserBase;

export async function applyMyVerification(
	file: File
): Promise<ApplyVerificationResponse> {
	const userId = getUserIdFromAccessToken();

	if (!userId) {
		throw new ApiError(401, "로그인 정보에서 userId를 찾을 수 없습니다.");
	}

	const formData = new FormData();
	formData.append("verificationImage", file); 

	return apiUpload<ApplyVerificationResponse>(
		`/users/${userId}/apply-verification`,
		formData,
		{ method: "POST" }
	);
}

// 각 업체별 사용자 인증
export async function verifyClientUser(
    code: string
): Promise<UserMe> {
    return api<UserMe>(
        "/users/me/code-verify",
        {
            method: "POST",
            body: JSON.stringify({ code } satisfies { code: string }),
        },
        {
            skipAuthRefresh: true,
        }
    );
}

// role reset - (개발용)
export async function resetUserRole(): Promise<UserMe> {
    return api<UserMe>("/users/me/reset-role", {
        method: "DELETE",
    });
}

// 프로필 수정
export type UpdateMyProfileInput = {
	name?: string | null;
	nickname?: string | null;
	imageFile?: File | null;
};

export type UpdateMyProfileJsonInput = {
    name?: string | null;
    nickname?: string | null;
    interestJob?: string | null;
    interestCompany?: string | null;
};

export async function updateMyProfile(input: UpdateMyProfileJsonInput): Promise<UserMe> {
    return api<UserMe>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
            name: (input.name ?? null),
            nickname: (input.nickname ?? null),
            interestJob: (input.interestJob ?? null),
            interestCompany: (input.interestCompany ?? null),
        }),
    });
}

// 프로필 사진 수정
export async function updateMyProfileImage(file: File): Promise<UserMe> {
    const formData = new FormData();

    formData.append("imageFile", file);

    return apiUpload<UserMe>("/users/me/profile-image", formData, { method: "PATCH" });
}

// 프로필 사진 삭제
export async function deleteMyProfileImage(): Promise<UserMe> {
    return api<UserMe>("/users/me/profile-image", {
        method: "DELETE",
    });
}


// 점프기관 목록 조회 (점프학생 전용)
export async function getMyJumpOrganizations(): Promise<JumpOrganization[]> {
    return api<JumpOrganization[]>("/users/me/jump-organizations", { method: "GET" });
}

// 온보딩
export async function submitMyOnboarding(
    input: SubmitOnboardingInput
): Promise<SubmitOnboardingResponse> {
    const name = (input.name ?? "").trim();
    const studentNumber = (input.studentNumber ?? "").trim();
    const interestJob = (input.interestJob ?? "").trim();
    const interestCompany = (input.interestCompany ?? "").trim();

    const payload: SubmitOnboardingInput = {
        ...(input.name != null ? { name } : {}),
        ...(input.studentNumber != null ? { studentNumber } : {}),
        ...(input.interestJob != null ? { interestJob } : {}),
        ...(input.interestCompany != null ? { interestCompany } : {}),
        ...(input.jumpOrganizationId != null && !Number.isNaN(Number(input.jumpOrganizationId))
            ? { jumpOrganizationId: Number(input.jumpOrganizationId) }
            : {}),
    };

    return api<SubmitOnboardingResponse>("/users/me/onboarding", {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

// 수료증 관련 타입
export type AdminUserFile = {
	fileId: number;
	url: string;
	filename: string;
};

// 관리자 업로드 파일 목록 조회
export async function getMyAdminFiles(): Promise<AdminUserFile[]> {
	return api<AdminUserFile[]>("/users/me/admin-files", { method: "GET" });
}

// 관리자 업로드 파일 다운로드
export async function getMyAdminFileDownloadUrl(
	fileId: number | string
): Promise<string> {
	const res = await api<{ url: string }>(`/users/me/admin-files/${fileId}`, {
		method: "GET",
	});

	return res.url;
}

/* - admin 관련 - */
export type AdminUser = UserBase;
export type AdminDailyStatus = {
    date: string;
    eventDayIds: number[];
};
export type AdminUserCalendarResponse = {
    year: number;
    month: number;
    totalRecordedDays: number;
    dailyStatuses: AdminDailyStatus[];
};
export type AdminEventDayDetailResponse = {
    eventDayId: number;
    eventDayTitle: string;
    eventTitle: string;
    startTime?: string | null;
    endTime?: string | null;
    transcriptions: ClientAdminTranscription[];
    question?: ClientAdminEventDayQuestions | null;
};
export type AdminUserRecordCountResponse = {
    studentId: number;
    totalRecordCount: number;
};

export async function checkIsCaptain(): Promise<boolean> { // Captain인지 확인
    try {
        const me = await getUserMe();
        return Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_CAPTAIN");
    } catch (e) {
        if (e instanceof ApiError && e.status == 401) return false;
        throw e;
    }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
	const res = await requestWithAutoRefresh("/admin/users", { method: "GET" }, { expectJson: true });
	const text = await res.clone().text();
	return JSON.parse(text) as AdminUser[];
}

/**
 *  학생증 인증
*/
// 학생증 제출자 목록 조회
export async function getAdminPendingUsers(): Promise<AdminUser[]> {
  	return api<AdminUser[]>("/admin/users/pending", { method: "GET" });
}

// 학생증 사진 조회
export type VerificationImageResponse = {
    url: string;
};
export async function getStudentIdImg(
    userId: number | string
): Promise<VerificationImageResponse> {
    return api<VerificationImageResponse>(`admin/users/${userId}/verification-image`, { method: "GET" } );
}

// 사용자 승인
export async function approveAdminUser(userId: number | string): Promise<AdminUser> {
  	return api<AdminUser>(`/admin/users/${userId}/approve`, { method: "PATCH" });
}

// 사용자 거절
export type RejectAdminUserInput = {
    reason: string;
};

export async function rejectAdminUser(
    userId: number | string,
    input: RejectAdminUserInput
): Promise<AdminUser> {
    return api<AdminUser>(`/admin/users/${userId}/reject`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

/**
 *  관리자 파일 (수료증)
*/
// 관리자 파일 업로드
export async function uploadAdminUserFile(
	userId: number,
	file: File
): Promise<AdminUserFile[]> {
	const form = new FormData();
	form.append("file", file);

	const res = await apiUpload(`/admin/users/${userId}/files`, form, { method: "POST" });

	if (Array.isArray(res)) {
		return res
		.filter((it: any) => it && typeof it.url === "string")
		.map((it: any) => ({
			fileId: Number(it.fileId),
			url: String(it.url),
			filename: String(it.filename ?? ""),
		}));
	}

	if (res && typeof res === "object" && typeof (res as any).url === "string") {
		return [
			{
				fileId: Number((res as any).fileId ?? 0),
				url: String((res as any).url),
				filename: String((res as any).filename ?? ""),
			},
		];
	}

	throw new Error(`Unexpected upload response: ${JSON.stringify(res)}`);
}

// 관리자 업로드 파일 목록 조회 
export async function getAdminUserFiles(userId: number | string): Promise<AdminUserFile[]> {
	return api<AdminUserFile[]>(`/admin/users/${userId}/files`, { method: "GET" });
}

// 관리자 업로드 파일 삭제
export async function deleteAdminUserFile(
  	userId: number | string,
  	fileId: number | string
): Promise<AdminUserFile[]> {
  	return api<AdminUserFile[]>(`/admin/users/${userId}/files/${fileId}`, {
   		method: "DELETE",
  	});
}

/**
 *  기록 확인
*/
export async function getAdminUserCalendar(
    userId: number | string,
    year: number | string,
    month: number | string
): Promise<AdminUserCalendarResponse> {
    return api<AdminUserCalendarResponse>(
        `/admin/users/${userId}/calendar/${year}/${month}`,
        { method: "GET" }
    );
}

export async function getAdminEventDayDetail(
    eventDayId: number | string
): Promise<AdminEventDayDetailResponse> {
    return api<AdminEventDayDetailResponse>(
        `/admin/event-days/${eventDayId}`,
        { method: "GET" }
    );
}

export async function getAdminUserRecordCount(
    userId: number | string
): Promise<AdminUserRecordCountResponse> {
    return api<AdminUserRecordCountResponse>(
        `/admin/users/${userId}/records/count`,
        { method: "GET" }
    );
}

export async function deleteAdminUserRecord(
    userId: number | string,
    eventDayId: number | string
): Promise<void> {
    return api<void>(
        `/admin/users/${userId}/event-days/${eventDayId}/records`,
        { method: "DELETE" }
    );
}

/**
 *  CAPTAIN용
*/
export type GrantableAdminRole = "ROLE_ADMIN" | "ROLE_JUMP_ADMIN" | "ROLE_KAKAO_ADMIN" | "ROLE_ESG_ADMIN";

export type AdminRoleUpdateInput = {
    role: GrantableAdminRole;
};

export async function grantAdminRole(
    userId: number | string,
    input: AdminRoleUpdateInput
): Promise<AdminUser> {
    return api<AdminUser>(`/admin/users/${userId}/roles`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function revokeAdminRole(
    userId: number | string,
    input: AdminRoleUpdateInput
): Promise<AdminUser> {
    return api<AdminUser>(`/admin/users/${userId}/roles`, {
        method: "DELETE",
        body: JSON.stringify(input),
    });
}


/* - client admin 관련 - */
// client 학생 목록
export type ClientType = "jump" | "kakao" | "esg";
export type ClientAdminStudent = UserBase;

export async function getClientAdminStudents(clientType: ClientType): Promise<ClientAdminStudent[]> {
  	return api<ClientAdminStudent[]>(`/admin-client/${clientType}/students`, { method: "GET" });
}

export type ClientAdminDailyStatus = {
	date: string; // YYYY-MM-DD
	eventDayIds: number[];
};

export type ClientAdminStudentCalendarResponse = {
	year: number;
	month: number;
	totalRecordedDays: number;
	dailyStatuses: ClientAdminDailyStatus[];
};

export async function getClientAdminStudentCalendar(
	clientType: ClientType,
    studentId: number | string,
	year: number | string,
	month: number | string
): Promise<ClientAdminStudentCalendarResponse> {
	return api<ClientAdminStudentCalendarResponse>(
		`/admin-client/${clientType}/students/${studentId}/calendar/${year}/${month}`,
		{ method: "GET" }
	);
}

// client 학생 eventDay 상세(질문/전사 포함)
export type ClientAdminTranscription = {
	transcriptionId: number;
	text: string;
	audioUrl?: string;
};

export type ClientAdminEventDayQuestions = {
	eventDayId: number;
	questionId: number;
	questionList: string[];
};

export type ClientAdminEventDayDetailResponse = {
	eventDayId: number;
	eventDayTitle: string;
	eventTitle: string;
	startTime?: string | null;
	endTime?: string | null;
	transcriptions: ClientAdminTranscription[];
	question?: ClientAdminEventDayQuestions | null;
};

export type ClientAdminStudentRecordCountResponse = {
    userId: number;
    totalRecordCount: number;
}

export async function getClientAdminEventDayDetail(
	clientType: ClientType,
    eventDayId: number | string
): Promise<ClientAdminEventDayDetailResponse> {
	return api<ClientAdminEventDayDetailResponse>(
        `/admin-client/${clientType}/event-days/${eventDayId}`, 
        { method: "GET", });
}

// 해당 학생 기록 총 갯수
export async function getClientAdminStudentRecordCount(
    clientType: ClientType,
    userId: number | string
): Promise<ClientAdminStudentRecordCountResponse> {
    return api<ClientAdminStudentRecordCountResponse>(
        `/admin-client/${clientType}/students/${userId}/records/count`,
        { method: "GET" }
    );
}


// 학생 삭제
export async function deleteClientAdminStudent(
    clientType: ClientType,
    userId: number | string
): Promise<void> {
    return api<void>(`/admin-client/${clientType}/students/${userId}`, { method: "DELETE" });
}


/**
 * 관리자 여부 확인
 */
export async function checkIsAdmin(): Promise<boolean> {
    try {
        const me = await getUserMe();
        return Array.isArray(me.roleSet) && (me.roleSet.includes("ROLE_ADMIN") || me.roleSet.includes("ROLE_CAPTAIN"));
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) return false;
        throw e;
    }
}

export async function checkIsClientAdmin(clientType: ClientType): Promise<boolean> {
    try {
        const me = await getUserMe();
        if (!Array.isArray(me.roleSet)) return false;
        if (clientType === "jump") return me.roleSet.includes("ROLE_JUMP_ADMIN");
        if (clientType === "kakao") return me.roleSet.includes("ROLE_KAKAO_ADMIN");
        if (clientType === "esg") return me.roleSet.includes("ROLE_ESG_ADMIN");
        return false;
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) return false;
        throw e;
    }
}

export async function checkIsEsgAdmin(): Promise<boolean> { // 우선 용산만, 추후 수정
    try {
        const me = await getUserMe();

        return Array.isArray(me.roleSet) && me.roleSet.includes("ROLE_ESG_ADMIN");
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) return false;
        throw e;
    }
}

export function getClientAdminTypes(roleSet: string[] | undefined | null): ClientType[] { // roleSet 로 clientType뽑기
    if (!Array.isArray(roleSet)) return [];
    const result: ClientType[] = [];
    if (roleSet.includes("ROLE_JUMP_ADMIN")) result.push("jump");
    if (roleSet.includes("ROLE_KAKAO_ADMIN")) result.push("kakao");
    if (roleSet.includes("ROLE_ESG_ADMIN")) result.push("esg");
    return result;
}

// 최근 기록한 일정 관련
export type Transcription = {
	id: number;
	text: string;
	audioUrl?: string;
};

export type EventDay = Omit<EventDayDetailResponse, "eventId" | "transcriptions"> & {
	eventId: string | number;
	transcriptions?: Transcription[];
};

export type EventDayMonthResponse = {
	totalCount: number;
	eventDayList: EventDay[];
};

export async function getEventDaysByMonth(y: string, m: string): Promise<EventDayMonthResponse> {
	return api<EventDayMonthResponse>(`/event-days/${y}/${m}`);
}

// 에러 처리
function parseErrorBody(bodyText: string): { message?: string; code?: string; path?: string; status?: number } {
    if (!bodyText) return {};
    try {
        const parsed = JSON.parse(bodyText);
        return {
            message: parsed?.message,
            code: parsed?.clientExceptionCode ?? parsed?.code ?? parsed?.error,
            path: parsed?.path,
            status: typeof parsed?.status === "number" ? parsed.status : undefined,
        };
    } catch {
        return {};
    }
}

export class ApiError extends Error {
    status: number;
    bodyText?: string;
    code?: string;
    path?: string;

    constructor(status: number, message: string, bodyText?: string, code?: string, path?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.bodyText = bodyText;
        this.code = code;
        this.path = path;
    }
}