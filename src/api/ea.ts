import { api, apiUpload, apiBlob } from "./client";

/* - EA 관련 공통 타입 - */
export type ExternalActivityProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "DELAYED";

/* - Assignment 공통 타입 - */
export type AssignmentSystemForm = "INDIVIDUAL" | "TEAM";
export type AssignmentResultForm = "WRITING" | "IMAGE" | "VIDEO" | "LINK" | "ETC";
export type AssignmentParticipantType = "USER" | "TEAM";
export type AssignmentParticipantStatus = "NOT_SUBMITTED" | "SUBMITTED" | "LATE_SUBMITTED" | "LATE";
export type TeamRole = "LEADER" | "MEMBER";

export type AssignmentParticipantResponse = {
    assignmentParticipantId: number;
    participantType: AssignmentParticipantType;
    userId?: number | null;
    userName?: string | null;
    userNickname?: string | null;
    userLinkedinUrl?: string | null;
    teamId?: number | null;
    teamName?: string | null;
    status: AssignmentParticipantStatus;
};

export type AssignmentResponse = {
    assignmentId: number;
    name: string;
    description?: string | null;
    externalActivityId: number;
    systemForm: AssignmentSystemForm;
    resultForms: AssignmentResultForm[];
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt: string;
    maxAutoTeams?: number | null;
    assigneeUserIds: number[];
    teamMemberConfigurationLocked: boolean;
    participants: AssignmentParticipantResponse[];
};

/* - Attendance 관련 공통 타입 - */
export type AttendanceEventProgress = "SCHEDULED" | "OPEN" | "CLOSED";
export type AttendanceEventType = "CLASS_START" | "CLASS_END";
export type AttendanceStatus = "NOT_CHECKED" | "PRESENT" | "LATE" | "VERY_LATE" | "EARLY_LEAVE" | "VERY_EARLY_LEAVE" | "ABSENT";

export type AttendanceEventSort = "latest" | "oldest" | "rateAsc" | "rateDesc";
export type AttendanceParticipantSort = "rateDesc" | "rateAsc" | "nameAsc";

export type AttendanceEventCreateRequest = {
    roundNumber: number;
    name: string;
    eventDate: string;
    type: AttendanceEventType;
    uploadWindowStart: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes?: number | null;
    partialCreditThresholdMinutes?: number | null;
    halfCreditThresholdMinutes?: number | null;
};

export type AttendanceEventResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    attendanceRatePercent: number;
};

export type MyAttendanceEventResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    status: AttendanceStatus;
    score: number;
    checkedAt?: string | null;
};

export type AttendanceCheckInResponse = {
    status: AttendanceStatus;
    score: number;
    selfieUrl?: string | null;
    checkedAt: string;
};

export type AttendanceSummaryResponse = {
    totalParticipantCount: number;
    attendanceMinimumRate?: number | null;
    averageAttendanceRate: number;
    belowThresholdCount: number;
};

export type AttendanceEventParticipantRecordResponse = {
    recordId: number;
    userId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
    status: AttendanceStatus;
    score: number;
    checkedAt?: string | null;
    selfieUrl?: string | null;
};

export type AttendanceEventDetailResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    scoreReferenceAt: string;
    durationMinutes: number;
    fullCreditThresholdMinutes: number;
    partialCreditThresholdMinutes: number;
    halfCreditThresholdMinutes: number;
    progress: AttendanceEventProgress;
    records: AttendanceEventParticipantRecordResponse[];
};

export type MyAttendanceSelfieResponse = {
    recordId: number;
    name: string;
    selfieUrl?: string | null;
};

export type MyAttendanceEventDetailResponse = {
    eventId: number;
    name: string;
    roundNumber: number;
    type: AttendanceEventType;
    eventDate: string;
    uploadWindowStart: string;
    uploadWindowEnd: string;
    progress: AttendanceEventProgress;
    records: MyAttendanceSelfieResponse[];
};

export type AttendanceParticipantRateResponse = {
    userId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
    cumulativeRate: number;
    thresholdMet: boolean;
};

export type AttendanceWindowOpenRequest = {
    type: AttendanceEventType;
    openAt: string;
    scoreReferenceAt: string;
};

export type AttendanceWindowCloseRequest = {
    closedAt: string;
};

export type AttendanceRecordStatusUpdateRequest = {
    status: AttendanceStatus;
};

export type AttendanceCheckInEligibilityResponse = {
    eligible: boolean;
    alreadyChecked: boolean;
};


/* - Team 공통 타입 - */
export type TeamMemberResponse = {
    teamMemberId: number;
    userId: number;
    userName: string;
    profileImage?: string | null;
    role: TeamRole;
    joinedAt: string;
};

export type TeamResponse = {
    teamId: number;
    externalActivityId: number;
    name: string;
    description?: string | null;
    members: TeamMemberResponse[];
};

export type TeamCreateRequest = {
    name: string;
    description?: string | null;
    memberUserIds: number[];
    leaderUserId?: number | null;
};

export type TeamUpdateRequest = {
    name?: string | null;
    description?: string | null;
};

export type TeamMemberRequest = {
    userId: number;
    role?: TeamRole | null;
};

export type InlineTeamCreateRequest = TeamCreateRequest;

export type TeamMemberMoveRequest = {
    targetTeamId: number;
};

/* - EA 관련 (Student) - */
export type StudentExternalActivityResponse = {
    externalActivityId: number;
    organizationId: number;
    organizationName: string;
    name: string;
    startDate: string;
    endDate: string;
    progressStatus: ExternalActivityProgressStatus;
};

export type StudentExternalActivityDetailResponse = StudentExternalActivityResponse & {
    managers: ExternalActivityManager[];
};

export async function getMyParticipatingExternalActivities(): Promise<StudentExternalActivityResponse[]> { // 나의 대외활동 조회 (학생용)
    return api<StudentExternalActivityResponse[]>("/users/me/externalActivities/participating");
}

export async function getMyParticipatingExternalActivity(
    externalActivityId: number | string
): Promise<StudentExternalActivityDetailResponse> {
    return api<StudentExternalActivityDetailResponse>(
        `/users/me/externalActivities/participating/${externalActivityId}`,
        { method: "GET" }
    );
}

/* - Assignment 관련 (Student) - */
export type SubmissionStatus = "SUBMITTED";
export type StudentAssignmentTeam = {
    teamId: number;
    name: string;
    role: TeamRole;
};

export type StudentAssignmentResponse = {
    assignmentId: number;
    name: string;
    description?: string | null;
    externalActivityId: number;
    resultForms: AssignmentResultForm[];
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt: string;
    submittedAt?: string | null;
    isTeamAssignment: boolean;
    myTeam?: StudentAssignmentTeam | null;
    status: AssignmentParticipantStatus;
};

export type SubmissionFileSubmitType = "FILE" | "LINK";

export type SubmissionFileResponse = {
    submissionFileId: number;
    url?: string | null;
    submitType?: SubmissionFileSubmitType | null;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
};

export type SubmissionFilePreviewResponse = {
    submissionFileId: number;
    previewUrl: string;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
    expiresInSeconds: number;
};

export type AssignmentSubmissionResponse = {
    submissionId: number;
    assignmentId: number;
    participantId: number;
    submitterUserId: number;
    submitterName: string;
    submittedAt: string;
    updatedAt?: string | null;
    lateOnSubmission: boolean;
    description?: string | null;
    status: SubmissionStatus;
    files: SubmissionFileResponse[];
};

export type SubmitAssignmentInput = {
    description?: string;
    participantId?: number | null;
    files?: File[];
    urls?: string[];
};

export async function getMyExternalActivityAssignments(externalActivityId: number | string): Promise<StudentAssignmentResponse[]> {
    return api<StudentAssignmentResponse[]>(`/externalActivities/${externalActivityId}/assignments/me`);
}


export async function submitAssignment( // 과제 제출
    assignmentId: number | string,
    input: SubmitAssignmentInput
): Promise<AssignmentSubmissionResponse> {
    const formData = new FormData();

    const meta = {
        description: input.description ?? "",
        participantId: input.participantId ?? null,
    };

    formData.append(
        "meta",
        new Blob([JSON.stringify(meta)], { type: "application/json" })
    );

    input.files
        ?.filter((file) => file.size > 0)
        .forEach((file) => {
            formData.append("files", file);
        });

    input.urls?.forEach((url) => {
        const trimmedUrl = url.trim();

        if (trimmedUrl) {
            formData.append("urls", trimmedUrl);
        }
    });

    return apiUpload<AssignmentSubmissionResponse>(
        `/assignments/${assignmentId}/submissions`,
        formData,
        { method: "POST" }
    );
}

export type UpdateAssignmentSubmissionInput = {
    description?: string;
    files?: File[];
    keepFileIds?: number[];
    urls?: string[];
};

export async function updateAssignmentSubmission( // 제출한 과제 수정
    submissionId: number | string,
    input: UpdateAssignmentSubmissionInput
): Promise<AssignmentSubmissionResponse> {
    const formData = new FormData();

    const meta = {
        description: input.description ?? "",
    };

    formData.append(
        "meta",
        new Blob([JSON.stringify(meta)], { type: "application/json" })
    );

    input.keepFileIds?.forEach((fileId) => {
        formData.append("keepFileIds", String(fileId));
    });

    input.files
        ?.filter((file) => file.size > 0)
        .forEach((file) => {
            formData.append("files", file);
        });

    input.urls?.forEach((url) => {
        const trimmedUrl = url.trim();

        if (trimmedUrl) {
            formData.append("urls", trimmedUrl);
        }
    });

    return apiUpload<AssignmentSubmissionResponse>(
        `/submissions/${submissionId}`,
        formData,
        { method: "PATCH" }
    );
}

export async function getMyAssignmentSubmissions( // 제출한 과제 조회
    assignmentId: number | string
): Promise<AssignmentSubmissionResponse[]> {
    return api<AssignmentSubmissionResponse[]>(
        `/assignments/${assignmentId}/submissions/me`,
        { method: "GET" }
    );
}

export async function getSubmissionFilePreview(
    submissionFileId: number | string
): Promise<SubmissionFilePreviewResponse> {
    return api<SubmissionFilePreviewResponse>(
        `/submission-files/${submissionFileId}/preview`,
        { method: "GET" }
    );
}

export async function getSubmissionFilePreviewBlob(
    submissionFileId: number | string
): Promise<Blob> {
    return apiBlob(
        `/submission-files/${submissionFileId}/download`,
        { method: "GET" }
    );
}

export async function getAssignment(
    assignmentId: number | string
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}`,
        { method: "GET" }
    );
}

export async function deleteAssignmentSubmission( // 제출한 과제 삭제
    submissionId: number | string
): Promise<void> {
    await api<void>(
        `/submissions/${submissionId}`,
        { method: "DELETE" }
    );
}

/* - Attendance 관련 (Student) - */
export async function getMyAttendanceEvents(
    externalActivityId: number | string
): Promise<MyAttendanceEventResponse[]> {
    return api<MyAttendanceEventResponse[]>(
        `/externalActivities/${externalActivityId}/attendance-events/me`,
        { method: "GET" }
    );
}

export async function getMyAttendanceEventDetail(
    eventId: number | string
): Promise<MyAttendanceEventDetailResponse> {
    return api<MyAttendanceEventDetailResponse>(
        `/attendance-events/${eventId}/me`,
        { method: "GET" }
    );
}

export async function getAttendanceCheckInEligibility(
    eventId: number | string
): Promise<AttendanceCheckInEligibilityResponse> {
    return api<AttendanceCheckInEligibilityResponse>(
        `/attendance-events/${eventId}/check-in/eligibility`,
        { method: "GET" }
    );
}

export async function checkInAttendance(
    eventId: number | string,
    type: AttendanceEventType,
    selfie: File
): Promise<AttendanceCheckInResponse> {
    const formData = new FormData();

    formData.append("type", type);
    formData.append("selfie", selfie);

    return apiUpload<AttendanceCheckInResponse>(
        `/attendance-events/${eventId}/check-in`,
        formData,
        { method: "POST" }
    );
}

/* - Team 관련 (Student) - */
export async function getMyExternalActivityTeams(
    externalActivityId: number | string
): Promise<TeamResponse[]> {
    return api<TeamResponse[]>(
        `/externalActivities/${externalActivityId}/teams`,
        { method: "GET" }
    );
}

export async function getMyTeam(
    teamId: number | string
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}`,
        { method: "GET" }
    );
}

/* - EA 학생 초대코드 관련 - */
export type ExternalActivityStudentInviteStatus = "ACTIVE" | "DISABLED";

export type ExternalActivityStudentInviteResponse = {
    externalActivityStudentInviteId: number;
    externalActivityId: number;
    externalActivityName: string;
    code: string;
    token: string;
    status: ExternalActivityStudentInviteStatus;
    createdByUserId: number;
    createdByName: string;
    createdAt: string;
};

export type AcceptExternalActivityStudentInviteResponse = {
    externalActivityId: number;
    externalActivityName: string;
    organizationId: number;
    organizationName: string;
    participantUserId: number;
    participantName: string;
};

export async function createExternalActivityStudentInvite(
    externalActivityId: number | string
): Promise<ExternalActivityStudentInviteResponse> {
    return api<ExternalActivityStudentInviteResponse>(
        `/externalActivities/${externalActivityId}/student-invites`,
        { method: "POST" }
    );
}

export async function getExternalActivityStudentInvites(
    externalActivityId: number | string
): Promise<ExternalActivityStudentInviteResponse[]> {
    return api<ExternalActivityStudentInviteResponse[]>(
        `/externalActivities/${externalActivityId}/student-invites`,
        { method: "GET" }
    );
}

export async function disableExternalActivityStudentInvite(
    externalActivityId: number | string,
    externalActivityStudentInviteId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/student-invites/${externalActivityStudentInviteId}`,
        { method: "DELETE" }
    );
}

export async function acceptExternalActivityStudentInvite(
    token: string
): Promise<AcceptExternalActivityStudentInviteResponse> {
    return api<AcceptExternalActivityStudentInviteResponse>(
        `/student-invites/tokens/${encodeURIComponent(token.trim())}/accept`,
        { method: "POST" }
    );
}

/* - EA 관련 (Admin) - */
export type CreateExternalActivityRequest = {
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    attendanceMinimumRate?: number | null;
    progressStatus?: ExternalActivityProgressStatus | null;
    managerUserIds: number[];
};

export type UpdateExternalActivityRequest = {
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    attendanceMinimumRate?: number | null;
    participantUserIds?: number[] | null;
    managerUserIds: number[];
};

export type UpdateExternalActivityStatusRequest = {
    completed: boolean;
};

export type ExternalActivityParticipant = {
    userId?: number | null;
    name?: string | null;
    nickname?: string | null;
    schoolName?: string | null;
    email?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
};

export type ExternalActivityManager = {
    userId: number;
    name: string;
    profileImage?: string | null;
    roleSet?: string[];
};

export type ExternalActivityResponse = {
    externalActivityId: number;
    organizationId: number;
    name: string;
    description?: string | null;
    participantNames?: string[] | null;
    participants?: ExternalActivityParticipant[] | null;
    managerNames?: string[] | null;
    managers?: ExternalActivityManager[] | null;
    assignments?: AssignmentResponse[] | null;
    startDate: string;
    endDate: string;
    attendanceMinimumRate?: number | null;
    activityPlanUrl?: string | null;
    activityPlanOriginalFileName?: string | null;
    activityPlanSizeBytes?: number | null;
    progressStatus: ExternalActivityProgressStatus;
    manageableByMe: boolean;
};

export type ExternalActivitiesByStatusQuery = {
    year?: number | string;
    name?: string;
};

export type ExternalActivityListQuery = ExternalActivitiesByStatusQuery & {
    status?: ExternalActivityProgressStatus;
};

export type MyManagedExternalActivitiesQuery = ExternalActivityListQuery;

export type ExternalActivitiesByStatusResponse = {
    upcoming: ExternalActivityResponse[];
    ongoing: ExternalActivityResponse[];
    completed: ExternalActivityResponse[];
    delayed: ExternalActivityResponse[];
};

export async function createExternalActivity( // 대외활동 생성
    organizationId: number | string,
    request: CreateExternalActivityRequest,
    planFile?: File | null
): Promise<ExternalActivityResponse> {
    const formData = new FormData();

    formData.append(
        "meta",
        new Blob([JSON.stringify(request)], { type: "application/json" })
    );

    if (planFile) {
        formData.append("planFile", planFile);
    }

    return apiUpload<ExternalActivityResponse>(
        `/organizations/${organizationId}/externalActivities`,
        formData,
        { method: "POST" }
    );
}

export async function updateExternalActivity( // 대외활동 수정
    organizationId: number | string,
    externalActivityId: number | string,
    request: UpdateExternalActivityRequest,
    planFile?: File | null
): Promise<ExternalActivityResponse> {
    const formData = new FormData();

    formData.append(
        "meta",
        new Blob([JSON.stringify(request)], { type: "application/json" })
    );

    if (planFile) {
        formData.append("planFile", planFile);
    }

    return apiUpload<ExternalActivityResponse>(
        `/organizations/${organizationId}/externalActivities/${externalActivityId}`,
        formData,
        { method: "PATCH" }
    );
}

export async function updateExternalActivityStatus(
    organizationId: number | string,
    externalActivityId: number | string,
    request: UpdateExternalActivityStatusRequest
): Promise<ExternalActivityResponse> {
    return api<ExternalActivityResponse>(
        `/organizations/${organizationId}/externalActivities/${externalActivityId}/status`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function deleteExternalActivity( // 대외활동 삭제
    organizationId: number | string,
    externalActivityId: number | string
): Promise<void> {
    await api<void>(
        `/organizations/${organizationId}/externalActivities/${externalActivityId}`,
        { method: "DELETE" }
    );
}

export async function getExternalActivity( // 대외활동 상세 조회
    organizationId: number | string,
    externalActivityId: number | string
): Promise<ExternalActivityResponse> {
    return api<ExternalActivityResponse>(
        `/organizations/${organizationId}/externalActivities/${externalActivityId}`,
        { method: "GET" }
    );
}

export async function getExternalActivityManagers( // 기관별 대외활동 관리자 후보 조회
    organizationId: number | string
): Promise<ExternalActivityManager[]> {
    return api<ExternalActivityManager[]>(`/organizations/${organizationId}/managers`, { method: "GET" });
}

export async function getExternalActivitiesByOrganization( // 기관별 대외활동 전체 조회
    organizationId: number | string,
    query?: ExternalActivityListQuery
): Promise<ExternalActivityResponse[]> {
    const params = new URLSearchParams();

    if (query?.status) {
        params.set("status", query.status);
    }

    if (query?.year) {
        params.set("year", String(query.year));
    }

    if (query?.name?.trim()) {
        params.set("name", query.name.trim());
    }

    const queryString = params.toString();

    return api<ExternalActivityResponse[]>(
        `/organizations/${organizationId}/externalActivities${queryString ? `?${queryString}` : ""}`,
        { method: "GET" }
    );
}

export async function getExternalActivitiesByStatus( // 기관 대외활동 진행 상태별 조회
    organizationId: number | string,
    query?: ExternalActivitiesByStatusQuery
): Promise<ExternalActivitiesByStatusResponse> {
    const params = new URLSearchParams();

    if (query?.year) {
        params.set("year", String(query.year));
    }

    if (query?.name?.trim()) {
        params.set("name", query.name.trim());
    }

    const queryString = params.toString();

    return api<ExternalActivitiesByStatusResponse>(
        `/organizations/${organizationId}/externalActivities/by-status${queryString ? `?${queryString}` : ""}`,
        { method: "GET" }
    );
}

export async function getMyManagedExternalActivities( // 나의 대외활동 조회(관리자)
    query?: MyManagedExternalActivitiesQuery
): Promise<ExternalActivityResponse[]> {
    const params = new URLSearchParams();

    if (query?.status) {
        params.set("status", query.status);
    }

    if (query?.year) {
        params.set("year", String(query.year));
    }

    if (query?.name?.trim()) {
        params.set("name", query.name.trim());
    }

    const queryString = params.toString();

    return api<ExternalActivityResponse[]>(
        `/users/me/externalActivities${queryString ? `?${queryString}` : ""}`,
        { method: "GET" }
    );
}

export async function getMyManagedExternalActivitiesByStatus( //나의 대외활동 진행상태별 조회
    query?: ExternalActivitiesByStatusQuery
): Promise<ExternalActivitiesByStatusResponse> {
    const params = new URLSearchParams();

    if (query?.year) {
        params.set("year", String(query.year));
    }

    if (query?.name?.trim()) {
        params.set("name", query.name.trim());
    }

    const queryString = params.toString();

    return api<ExternalActivitiesByStatusResponse>(
        `/users/me/externalActivities/by-status${queryString ? `?${queryString}` : ""}`,
        { method: "GET" }
    );
}

/* - Assignment 관련 (Admin) - */
export type CreateAssignmentRequest = {
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
    progressStatus: ExternalActivityProgressStatus;
    resultForms: AssignmentResultForm[];
    systemForm: AssignmentSystemForm;
    maxAutoTeams?: number | null;
    assigneeUserIds: number[];
    teamIds?: number[];
    inlineTeams?: InlineTeamCreateRequest[];
};

export async function createAssignment( // 과제 생성
    externalActivityId: number | string,
    request: CreateAssignmentRequest
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/externalActivities/${externalActivityId}/assignments`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function getExternalActivityAssignments( // 과제 조회 
    externalActivityId: number | string
): Promise<AssignmentResponse[]> {
    return api<AssignmentResponse[]>(
        `/externalActivities/${externalActivityId}/assignments`,
        { method: "GET" }
    );
}

export async function getAssignmentSubmissions( // 과제 전체 제출물 조회
    assignmentId: number | string
): Promise<AssignmentSubmissionResponse[]> {
    return api<AssignmentSubmissionResponse[]>(
        `/assignments/${assignmentId}/submissions`,
        { method: "GET" }
    );
}

export type UpdateAssignmentMetaRequest = {
    name?: string | null;
    description?: string | null;
    progressStatus?: ExternalActivityProgressStatus | null;
    resultForms?: AssignmentResultForm[] | null;
    maxAutoTeams?: number | null;
};

export type UpdateAssignmentScheduleRequest = {
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
};

export type UpdateAssignmentAssigneesRequest = {
    assigneeUserIds: number[];
};

export async function updateAssignmentMeta(
    assignmentId: number | string,
    request: UpdateAssignmentMetaRequest
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function updateAssignmentSchedule(
    assignmentId: number | string,
    request: UpdateAssignmentScheduleRequest
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}/schedule`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function updateAssignmentAssignees(
    assignmentId: number | string,
    request: UpdateAssignmentAssigneesRequest
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}/assignees`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function deleteAssignment( // 과제 삭제
    assignmentId: number | string
): Promise<void> {
    await api<void>(
        `/assignments/${assignmentId}`,
        { method: "DELETE" }
    );
}

function getDownloadFileName(fileName: string): string {
    return fileName.replace(/[\\/:*?"<>|]/g, "_");
}

function sanitizeDownloadName(value: string): string {
    return value
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim();
}

function saveBlob(blob: Blob, fileName: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = getDownloadFileName(fileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
    }, 1000);
}

export async function downloadExternalActivityPlan( // 활동 계획서 다운
    organizationId: number | string,
    externalActivityId: number | string,
    fileName?: string | null
): Promise<void> {
    const blob = await apiBlob(
        `/organizations/${organizationId}/externalActivities/${externalActivityId}/plan/download`,
        { method: "GET" }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `activity-plan-${externalActivityId}`;

    saveBlob(blob, safeFileName);
}

export async function downloadSubmissionFile( // 개별 과제 다운
    file: SubmissionFileResponse
): Promise<void> {
    const blob = await apiBlob(
        `/submission-files/${file.submissionFileId}/download`,
        { method: "GET" }
    );

    saveBlob(
        blob,
        file.originalFileName ?? `submission-file-${file.submissionFileId}`
    );
}

export async function downloadAssignmentSubmissionsZip( // 과제 일괄 다운 (zip)
    assignmentId: number | string,
    fileName?: string
): Promise<void> {
    const blob = await apiBlob(
        `/assignments/${assignmentId}/submissions/download`,
        { method: "GET" }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `assignment-${assignmentId}-submissions`;

    saveBlob(blob, `${safeFileName}.zip`);
}

export async function downloadSubmissionZip(
    submissionId: number | string,
    fileName?: string
): Promise<void> {
    const blob = await apiBlob(
        `/submissions/${submissionId}/download`,
        { method: "GET" }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `submission-${submissionId}`;

    saveBlob(blob, `${safeFileName}.zip`);
}

/* - Attendance 관련 (Admin) - */
export async function createAttendanceEvent(
    externalActivityId: number | string,
    request: AttendanceEventCreateRequest
): Promise<AttendanceEventResponse> {
    return api<AttendanceEventResponse>(
        `/externalActivities/${externalActivityId}/attendance-events`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function openAttendanceWindow(
    eventId: number | string,
    request: AttendanceWindowOpenRequest
): Promise<AttendanceEventResponse> {
    return api<AttendanceEventResponse>(
        `/attendance-events/${eventId}/open-window`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function closeAttendanceWindow(
    eventId: number | string,
    request: AttendanceWindowCloseRequest
): Promise<AttendanceEventResponse> {
    return api<AttendanceEventResponse>(
        `/attendance-events/${eventId}/close-window`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function getAttendanceEvents(
    externalActivityId: number | string,
    sort: AttendanceEventSort = "latest"
): Promise<AttendanceEventResponse[]> {
    const params = new URLSearchParams();
    params.set("sort", sort);

    return api<AttendanceEventResponse[]>(
        `/externalActivities/${externalActivityId}/attendance-events?${params.toString()}`,
        { method: "GET" }
    );
}

export async function getAttendanceSummary(
    externalActivityId: number | string
): Promise<AttendanceSummaryResponse> {
    return api<AttendanceSummaryResponse>(
        `/externalActivities/${externalActivityId}/attendance/summary`,
        { method: "GET" }
    );
}

export async function getAttendanceEventDetail(
    eventId: number | string
): Promise<AttendanceEventDetailResponse> {
    return api<AttendanceEventDetailResponse>(
        `/attendance-events/${eventId}`,
        { method: "GET" }
    );
}

export async function deleteAttendanceEvent(
    eventId: number | string
): Promise<void> {
    await api<void>(
        `/attendance-events/${eventId}`,
        { method: "DELETE" }
    );
}

export async function getAttendanceParticipants(
    externalActivityId: number | string,
    query?: { search?: string; sort?: AttendanceParticipantSort }
): Promise<AttendanceParticipantRateResponse[]> {
    const params = new URLSearchParams();

    if (query?.search?.trim()) {
        params.set("search", query.search.trim());
    }

    if (query?.sort) {
        params.set("sort", query.sort);
    }

    const queryString = params.toString();

    return api<AttendanceParticipantRateResponse[]>(
        `/externalActivities/${externalActivityId}/attendance/participants${queryString ? `?${queryString}` : ""}`,
        { method: "GET" }
    );
}

export async function updateAttendanceRecordStatus(
    recordId: number | string,
    request: AttendanceRecordStatusUpdateRequest
): Promise<AttendanceEventParticipantRecordResponse> {
    return api<AttendanceEventParticipantRecordResponse>(
        `/attendance-records/${recordId}`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function downloadAttendanceExcel(
    externalActivityId: number | string,
    fileName?: string
): Promise<void> {
    const blob = await apiBlob(
        `/externalActivities/${externalActivityId}/attendance/export`,
        {
            method: "GET",
            headers: {
                Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
        }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `external-activity-${externalActivityId}-attendance`;

    saveBlob(blob, `${safeFileName}.xlsx`);
}

function toLocalDateTimePayload(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export async function startAttendanceEventNow(
    eventId: number | string,
    type: AttendanceEventType,
    scoreReferenceAt: string
): Promise<AttendanceEventResponse> {
    return openAttendanceWindow(eventId, {
        type,
        openAt: toLocalDateTimePayload(),
        scoreReferenceAt,
    });
}

export async function endAttendanceEventNow(
    eventId: number | string
): Promise<AttendanceEventResponse> {
    return closeAttendanceWindow(eventId, {
        closedAt: toLocalDateTimePayload(),
    });
}


/* - Team 관련 (Admin) - */
export async function createExternalActivityTeam( // 대외활동 팀 생성
    externalActivityId: number | string,
    request: TeamCreateRequest
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/externalActivities/${externalActivityId}/teams`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function getExternalActivityTeams( // 대외활동 팀 조회
    externalActivityId: number | string
): Promise<TeamResponse[]> {
    return api<TeamResponse[]>(
        `/externalActivities/${externalActivityId}/teams`,
        { method: "GET" }
    );
}

export type UpdateAssignmentTeamConfigurationTeamRequest = {
    teamId: number | null;
    name: string;
    memberUserIds: number[];
    leaderUserId?: number | null;
};

export type UpdateAssignmentTeamConfigurationRequest = {
    assigneeUserIds: number[];
    teams: UpdateAssignmentTeamConfigurationTeamRequest[];
};

export async function updateAssignmentTeamConfiguration( // 팀 구성 일괄 수정
    assignmentId: number | string,
    request: UpdateAssignmentTeamConfigurationRequest
): Promise<AssignmentResponse> {
    return api<AssignmentResponse>(
        `/assignments/${assignmentId}/team-configuration`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function getTeam( // 팀 조회
    teamId: number | string
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}`,
        { method: "GET" }
    );
}

export async function updateTeam( // 팀 수정
    teamId: number | string,
    request: TeamUpdateRequest
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function addTeamMember( // 팀원 추가
    teamId: number | string,
    request: TeamMemberRequest
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}/members`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function changeTeamLeader(
    teamId: number | string,
    userId: number | string
): Promise<TeamResponse> {
    return api<TeamResponse>(
        `/teams/${teamId}/members/${userId}/leader`,
        { method: "PATCH" }
    );
}

export async function moveTeamMember(
    teamId: number | string,
    userId: number | string,
    request: TeamMemberMoveRequest
): Promise<void> {
    await api<void>(
        `/teams/${teamId}/members/${userId}/move`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function removeTeamMember( // 팀원 삭제 
    teamId: number | string,
    userId: number | string
): Promise<void> {
    await api<void>(
        `/teams/${teamId}/members/${userId}`,
        { method: "DELETE" }
    );
}

export async function deleteTeam( // 팀 삭제
    teamId: number | string
): Promise<void> {
    await api<void>(
        `/teams/${teamId}`,
        { method: "DELETE" }
    );
}