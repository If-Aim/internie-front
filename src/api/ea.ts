import { api, apiUpload, apiBlob, buildQueryString } from "./client";

/* - EA 관련 공통 타입 - */
export type ExternalActivityProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "DELAYED";
export type ExternalActivityNoticeRequest = {
    title: string;
    content: string;
};

export type ExternalActivityNoticeFileResponse = {
    fileId: string;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
};

export type ExternalActivityNoticeType =
    | "GENERAL"
    | "ASSIGNMENT_NON_SUBMISSION";

export type ExternalActivityNoticeResponse = {
    noticeId: number;
    externalActivityId: number;
    authorId: number;
    authorName: string;
    title: string;
    content: string;
    noticeType: ExternalActivityNoticeType;
    files: ExternalActivityNoticeFileResponse[];
    createdAt: string;
    updatedAt: string;
};

export type CreateExternalActivityNoticeInput = ExternalActivityNoticeRequest & {
    files?: File[];
};

export type UpdateExternalActivityNoticeInput = ExternalActivityNoticeRequest & {
    files?: File[];
    keepFileIds?: string[];
};

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

export type AttendanceEventCore = {
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
};

export type AttendanceEventResponse = AttendanceEventCore & {
    attendanceRatePercent: number;
};

export type MyAttendanceEventResponse = AttendanceEventCore & {
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

export type ParticipantProfile = {
    userId: number;
    name: string;
    nickname?: string | null;
    profileImage?: string | null;
    linkedinUrl?: string | null;
};

export type AttendanceEventParticipantRecordResponse = ParticipantProfile & {
    recordId: number;
    status: AttendanceStatus;
    score: number;
    checkedAt?: string | null;
    selfieUrl?: string | null;
};

export type AttendanceEventDetailResponse = AttendanceEventCore & {
    records: AttendanceEventParticipantRecordResponse[];
};

export type MyAttendanceSelfieResponse = {
    recordId: number;
    name: string;
    selfieUrl?: string | null;
};

export type MyAttendanceEventDetailResponse = Pick<
    AttendanceEventCore,
    "eventId" | "name" | "roundNumber" | "type" | "eventDate" | "uploadWindowStart" | "uploadWindowEnd" | "progress"
> & {
    records: MyAttendanceSelfieResponse[];
};

export type AttendanceParticipantRateResponse = ParticipantProfile & {
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


/* - LeaderBoard 관련 공통 타입 - */
export type LeaderboardScope = "individual" | "team";
export type LeaderboardSort = "score" | "latest";
export type LeaderboardApprovalSort = "latest" | "oldest";
export type LeaderboardApprovalStatus = "pending" | "approved" | "rejected" | "all";
export type LeaderboardMissionCategory = "ELICIT" | "DISCOVER" | "INSIGHT" | "SYNTHESIZE" | "OWN" | "NURTURE";
export type LeaderboardEvidenceType = "IMAGE" | "LINK" | "DOCUMENT" | "VIDEO" | "OTHER";
export type LeaderboardTrendDirection = "UP" | "DOWN" | "SAME";
export type LeaderboardSubmissionEvidenceSubmitType = "FILE" | "LINK";

export const LEADERBOARD_MISSION_CATEGORY_OPTIONS: { value: LeaderboardMissionCategory; label: string }[] = [
    { value: "ELICIT", label: "E - Elicit" },
    { value: "DISCOVER", label: "D - Discover" },
    { value: "INSIGHT", label: "I - Insight" },
    { value: "SYNTHESIZE", label: "S - Synthesize" },
    { value: "OWN", label: "O - Own" },
    { value: "NURTURE", label: "N - Nurture" },
];

export type ExternalActivityPersonalLeaderboardRanking = {
    rank: number;
    userId: number;
    displayName: string;
    profileImage?: string | null;
    score: number;
    lastPointEarnedAt?: string | null;
};

export type ExternalActivityLeaderboardResponse<T> = {
    externalActivityId: number;
    tieBreakPolicy: string;
    rankings: T[];
};

export type ExternalActivityTeamLeaderboardRanking = {
    rank: number;
    teamId: number;
    teamName: string;
    score: number;
    lastPointEarnedAt?: string | null;
};

export type ExternalActivityPersonalLeaderboardResponse = ExternalActivityLeaderboardResponse<ExternalActivityPersonalLeaderboardRanking>;
export type ExternalActivityTeamLeaderboardResponse = ExternalActivityLeaderboardResponse<ExternalActivityTeamLeaderboardRanking>;

export type LeaderboardApiResponse<T> = {
    data: T;
    timestamp: string;
};

export type LeaderboardPage = {
    page: number;
    size: number;
    totalCount: number;
};

export type LeaderboardStudentSummary = {
    studentId: number;
    studentName: string;
    studentNickname?: string | null;
    profileImage?: string | null;
};

export type LeaderboardScoreBreakdown = {
    totalScore: number;
    attendanceScore: number;
    assignmentScore: number;
    participationScore: number;
};

export type LeaderboardEvidenceFields = {
    evidenceUrl?: string | null;
    evidences?: LeaderboardSubmissionEvidenceResponse[] | null;
};

export type LeaderboardRankingResponse = LeaderboardStudentSummary & LeaderboardScoreBreakdown & {
    rank: number;
    lastReviewedAt?: string | null;
    trendDirection?: LeaderboardTrendDirection | null;
    trendValue?: number | null;
};

export type LeaderboardResponse = LeaderboardPage & {
    externalActivityId: number;
    scope: LeaderboardScope;
    sort: LeaderboardSort;
    rankings: LeaderboardRankingResponse[];
    lastUpdate?: string | null;
};

export type LeaderboardSnapshotRebuildResponse = {
    externalActivityId: number;
    scope: LeaderboardScope;
    snapshotId: number;
    entryCount: number;
    lastUpdate: string;
};

export type LeaderboardSubmissionResponse = LeaderboardStudentSummary & LeaderboardEvidenceFields & {
    submissionId: number;
    missionId: number;
    missionName: string;
    category?: LeaderboardMissionCategory | null;
    points?: number | null;
    status: LeaderboardApprovalStatus;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    rejectReason?: string | null;
};

export type LeaderboardApprovalsResponse = LeaderboardPage & {
    externalActivityId: number;
    status: LeaderboardApprovalStatus;
    sort: LeaderboardApprovalSort;
    submissions: LeaderboardSubmissionResponse[];
};

export type LeaderboardStudentDetailResponse = LeaderboardScoreBreakdown & Pick<LeaderboardStudentSummary, "studentId" | "studentName"> & {
    externalActivityId: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    recentSubmissions: LeaderboardSubmissionResponse[];
};

export type LeaderboardCompletedMissionResponse = LeaderboardEvidenceFields & {
    submissionId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    score: number;
    completedAt?: string | null;
};

export type LeaderboardCompletedMissionsResponse = LeaderboardPage & {
    externalActivityId: number;
    studentId: number;
    missions: LeaderboardCompletedMissionResponse[];
};

export type LeaderboardSubmissionDetailResponse = LeaderboardEvidenceFields & Pick<LeaderboardStudentSummary, "studentId" | "studentName"> & {
    submissionId: number;
    externalActivityId: number;
    missionId: number;
    missionName: string;
    category: LeaderboardMissionCategory;
    status: LeaderboardApprovalStatus;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    score?: number | null;
    rejectReason?: string | null;
};

export type LeaderboardSubmissionEvidenceResponse = {
    evidenceId?: number | null;
    submitType?: LeaderboardSubmissionEvidenceSubmitType | null;
    evidenceUrl: string;
    originalFileName?: string | null;
    contentType?: string | null;
    sizeBytes?: number | null;
};

export type LeaderboardEvidenceInput = {
    file?: File | null;
    files?: File[] | null;
    evidenceUrl?: string | null;
    evidenceUrls?: string[] | null;
};

export type LeaderboardReviewRequest = {
    adjustPoint?: number | null;
};

export type LeaderboardRejectRequest = {
    reason: string;
};

export type LeaderboardReviewResponse = {
    submissionId: number;
    status: LeaderboardApprovalStatus;
    reviewedAt?: string | null;
    approvedPoint?: number | null;
    adjustPoint?: number | null;
    rejectReason?: string | null;
};

export type LeaderboardMissionResponse = {
    missionId: number;
    externalActivityId: number;
    name: string;
    description?: string | null;
    category: LeaderboardMissionCategory;
    points: number;
    maximumPerStudent: number;
    evidenceName?: string | null;
    evidenceTypes: LeaderboardEvidenceType[];
    evidenceType?: LeaderboardEvidenceType | null;
    autoReflect: boolean;
};

export type LeaderboardMissionListResponse = {
    externalActivityId: number;
    totalCount: number;
    missions: LeaderboardMissionResponse[];
};

export type LeaderboardMissionRequest = Omit<LeaderboardMissionResponse, "missionId" | "externalActivityId">;

export type LeaderboardScoringRuleItemResponse = {
    ruleItemId: number;
    category: LeaderboardMissionCategory;
    itemName: string;
    points: number;
    active: boolean;
};

export type LeaderboardScoringRuleResponse = {
    externalActivityId: number;
    attendanceWeight: number;
    assignmentWeight: number;
    participationWeight: number;
    items: LeaderboardScoringRuleItemResponse[];
};

export type LeaderboardScoringRuleItemRequest = Pick<LeaderboardScoringRuleItemResponse, "category" | "itemName" | "points">;

export type LeaderboardScoringRuleRequest = Omit<LeaderboardScoringRuleResponse, "externalActivityId" | "items"> & {
    items: LeaderboardScoringRuleItemRequest[];
};

export type StudentLeaderboardResponse = Omit<LeaderboardResponse, "scope" | "sort"> & {
    studentId: number;
    myRank?: number | null;
    myTotalScore: number;
    myTrendDirection?: LeaderboardTrendDirection | null;
    myTrendValue?: number | null;
};

export type StudentLeaderboardLogResponse = Pick<
    LeaderboardSubmissionDetailResponse,
    "submissionId" | "missionId" | "missionName" | "category" | "status" | "score" | "submittedAt" | "reviewedAt"
>;

export type StudentLeaderboardLogsResponse = LeaderboardPage & {
    externalActivityId: number;
    studentId: number;
    logs: StudentLeaderboardLogResponse[];
};

export type StudentLeaderboardEvidenceResponse = LeaderboardEvidenceFields & {
    externalActivityId: number;
    submissionId: number;
    studentId: number;
    submittedAt: string;
};

export type StudentLeaderboardSubmitResponse = LeaderboardEvidenceFields & Pick<
    LeaderboardSubmissionDetailResponse,
    "submissionId" | "externalActivityId" | "missionId" | "studentId" | "status" | "submittedAt" | "reviewedAt"
> & Pick<LeaderboardReviewResponse, "approvedPoint" | "adjustPoint"> & {
    autoReflected: boolean;
};

function appendJsonBlob(formData: FormData, key: string, value: unknown): void {
    formData.append(key, new Blob([JSON.stringify(value)], { type: "application/json" }));
}

function appendFiles(formData: FormData, key: string, files?: File[] | null): void {
    files
        ?.filter((file) => file.size > 0)
        .forEach((file) => {
            formData.append(key, file);
        });
}

function appendTrimmedValues(formData: FormData, key: string, values?: Array<string | number> | null): void {
    values
        ?.map((value) => String(value).trim())
        .filter(Boolean)
        .forEach((value) => {
            formData.append(key, value);
        });
}

function buildLeaderboardEvidenceForm(input: LeaderboardEvidenceInput): FormData {
    const formData = new FormData();

    if (input.file && input.file.size > 0) {
        formData.append("file", input.file);
    }

    appendFiles(formData, "files", input.files);

    if (input.evidenceUrl?.trim()) {
        formData.append("evidenceUrl", input.evidenceUrl.trim());
    }

    appendTrimmedValues(formData, "evidenceUrls", input.evidenceUrls);

    return formData;
}


/* 알림 */
export type NotificationType = "ASSIGNMENT_CREATED" | "ASSIGNMENT_EVALUATED" | "ATTENDANCE_CHECK_IN_OPENED" | "EXTERNAL_ACTIVITY_NOTICE" | "LEADERBOARD_MISSION_APPROVED" | "LEADERBOARD_MISSION_REJECTED";

export type NotificationResponse = {
    notificationId: number;
    recipientId: number;
    senderId?: number | null;
    externalActivityId?: number | null;
    type: NotificationType;
    title: string;
    body: string;
    titleKo?: string | null;
    bodyKo?: string | null;
    titleEn?: string | null;
    bodyEn?: string | null;
    targetType: string;
    targetId?: number | null;
    read: boolean;
    readAt?: string | null;
    createdAt: string;
};

export type NotificationListResponse = {
    page: number;
    size: number;
    totalCount: number;
    unreadCount: number;
    notifications: NotificationResponse[];
};

export type NotificationDeleteAllResponse = {
    deletedCount: number;
};

function buildExternalActivityNoticeForm(
    input: CreateExternalActivityNoticeInput | UpdateExternalActivityNoticeInput
): FormData {
    const formData = new FormData();

    appendJsonBlob(formData, "meta", {
        title: input.title,
        content: input.content,
    });

    appendFiles(formData, "files", input.files);

    if ("keepFileIds" in input) {
        appendTrimmedValues(formData, "keepFileIds", input.keepFileIds);
    }

    return formData;
}

async function apiWrappedData<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await api<LeaderboardApiResponse<T>>(path, init);

    return response.data;
}

async function apiUploadWrappedData<T>(path: string, formData: FormData, init: RequestInit = {}): Promise<T> {
    const response = await apiUpload<LeaderboardApiResponse<T>>(path, formData, init);

    return response.data;
}

export async function getNotifications(query?: { unreadOnly?: boolean; page?: number; size?: number }): Promise<NotificationListResponse> {
    const queryString = buildQueryString({
        unreadOnly: query?.unreadOnly,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return api<NotificationListResponse>(`/notifications${queryString}`, { method: "GET" });
}

export async function markNotificationRead(notificationId: number | string): Promise<NotificationResponse> {
    return api<NotificationResponse>(`/notifications/${notificationId}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
    return api<{ updatedCount: number }>("/notifications/read-all", { method: "PATCH" });
}

export async function deleteAllNotifications(): Promise<NotificationDeleteAllResponse> {
    return api<NotificationDeleteAllResponse>("/notifications", { method: "DELETE" });
}

/* - LeaderBoard 관련 (ExternalActivity 공통) - */
export async function getExternalActivityPersonalLeaderboard(
    externalActivityId: number | string
): Promise<ExternalActivityPersonalLeaderboardResponse> {
    return api<ExternalActivityPersonalLeaderboardResponse>(
        `/externalActivities/${externalActivityId}/leaderboard/personal`,
        { method: "GET" }
    );
}

export async function getExternalActivityTeamLeaderboard(
    externalActivityId: number | string
): Promise<ExternalActivityTeamLeaderboardResponse> {
    return api<ExternalActivityTeamLeaderboardResponse>(
        `/externalActivities/${externalActivityId}/leaderboard/teams`,
        { method: "GET" }
    );
}

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
export type SubmissionStatus = "SUBMITTED" | "REVIEWED" | "REJECTED";
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
    evaluationCompleted: boolean;
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

    appendJsonBlob(formData, "meta", meta);
    appendFiles(formData, "files", input.files);
    appendTrimmedValues(formData, "urls", input.urls);

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

    appendJsonBlob(formData, "meta", meta);
    appendTrimmedValues(formData, "keepFileIds", input.keepFileIds);
    appendFiles(formData, "files", input.files);
    appendTrimmedValues(formData, "urls", input.urls);

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


/* - LeaderBoard 관련 (Student) - */
export async function getMyLeaderboard(
    externalActivityId: number | string,
    query?: { page?: number; size?: number }
): Promise<StudentLeaderboardResponse> {
    const queryString = buildQueryString({
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<StudentLeaderboardResponse>(
        `/student/externalActivities/${externalActivityId}/leaderboard${queryString}`,
        { method: "GET" }
    );
}

export async function getMyLeaderboardMissions(
    externalActivityId: number | string,
    category?: LeaderboardMissionCategory | null
): Promise<LeaderboardMissionListResponse> {
    const queryString = buildQueryString({ category });

    return apiWrappedData<LeaderboardMissionListResponse>(
        `/student/externalActivities/${externalActivityId}/missions${queryString}`,
        { method: "GET" }
    );
}

export async function getMyLeaderboardMissionLogs(
    externalActivityId: number | string,
    query?: { category?: LeaderboardMissionCategory | null; page?: number; size?: number }
): Promise<StudentLeaderboardLogsResponse> {
    const queryString = buildQueryString({
        category: query?.category,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<StudentLeaderboardLogsResponse>(
        `/student/externalActivities/${externalActivityId}/missions/logs${queryString}`,
        { method: "GET" }
    );
}

export async function updateMyLeaderboardEvidence(
    externalActivityId: number | string,
    submissionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardEvidenceResponse> {
    return apiUploadWrappedData<StudentLeaderboardEvidenceResponse>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/evidence`,
        buildLeaderboardEvidenceForm(input),
        { method: "PATCH" }
    );
}

export async function getMyLeaderboardSubmissions(
    externalActivityId: number | string,
    query?: { status?: LeaderboardApprovalStatus; page?: number; size?: number }
): Promise<LeaderboardApprovalsResponse> {
    const queryString = buildQueryString({
        status: query?.status ?? "all",
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<LeaderboardApprovalsResponse>(
        `/student/externalActivities/${externalActivityId}/submissions${queryString}`,
        { method: "GET" }
    );
}

export async function resubmitMyLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardEvidenceResponse> {
    return apiUploadWrappedData<StudentLeaderboardEvidenceResponse>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/resubmit`,
        buildLeaderboardEvidenceForm(input),
        { method: "PATCH" }
    );
}

export async function deleteMyRejectedLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string
): Promise<void> {
    await api<void>(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/rejected`,
        { method: "DELETE" }
    );
}

export async function submitLeaderboardMission(
    externalActivityId: number | string,
    missionId: number | string,
    input: LeaderboardEvidenceInput
): Promise<StudentLeaderboardSubmitResponse> {
    return apiUploadWrappedData<StudentLeaderboardSubmitResponse>(
        `/externalActivities/${externalActivityId}/missions/${missionId}/submissions`,
        buildLeaderboardEvidenceForm(input),
        { method: "POST" }
    );
}

export async function getStudentLeaderboardCompletedMissions(
    externalActivityId: number | string,
    studentId: number | string,
    query?: { category?: LeaderboardMissionCategory | null; page?: number; size?: number }
): Promise<LeaderboardCompletedMissionsResponse> {
    const queryString = buildQueryString({
        category: query?.category,
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<LeaderboardCompletedMissionsResponse>(
        `/student/externalActivities/${externalActivityId}/students/${studentId}/missions/completed${queryString}`,
        { method: "GET" }
    );
}

export async function downloadMyLeaderboardEvidenceFile(
    externalActivityId: number | string,
    submissionId: number | string,
    fileName?: string | null
): Promise<void> {
    const blob = await apiBlob(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/evidence/download`,
        { method: "GET" }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `leaderboard-evidence-${submissionId}`;

    saveBlob(blob, safeFileName);
}

export async function downloadMyLeaderboardEvidenceFileById(
    externalActivityId: number | string,
    submissionId: number | string,
    evidenceId: number | string,
    fallbackFileName = "evidence-file"
): Promise<void> {
    const blob = await apiBlob(
        `/student/externalActivities/${externalActivityId}/submissions/${submissionId}/evidences/${evidenceId}/download`,
        { method: "GET" }
    );

    const safeFileName = fallbackFileName.trim()
        ? sanitizeDownloadName(fallbackFileName)
        : `leaderboard-evidence-${evidenceId}`;

    saveBlob(blob, safeFileName);
}


/* - 공지 관련 (Student) - */
export async function getMyExternalActivityNotices(
    externalActivityId: number | string
): Promise<ExternalActivityNoticeResponse[]> {
    return api<ExternalActivityNoticeResponse[]>(
        `/externalActivities/${externalActivityId}/notices/me`,
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

    appendJsonBlob(formData, "meta", request);

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

    appendJsonBlob(formData, "meta", request);

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
    const queryString = buildQueryString({
        status: query?.status,
        year: query?.year,
        name: query?.name?.trim(),
    });

    return api<ExternalActivityResponse[]>(
        `/organizations/${organizationId}/externalActivities${queryString}`,
        { method: "GET" }
    );
}

export async function getExternalActivitiesByStatus( // 기관 대외활동 진행 상태별 조회
    organizationId: number | string,
    query?: ExternalActivitiesByStatusQuery
): Promise<ExternalActivitiesByStatusResponse> {
    const queryString = buildQueryString({
        year: query?.year,
        name: query?.name?.trim(),
    });

    return api<ExternalActivitiesByStatusResponse>(
        `/organizations/${organizationId}/externalActivities/by-status${queryString}`,
        { method: "GET" }
    );
}

export async function getMyManagedExternalActivities( // 나의 대외활동 조회(관리자)
    query?: MyManagedExternalActivitiesQuery
): Promise<ExternalActivityResponse[]> {
    const queryString = buildQueryString({
        status: query?.status,
        year: query?.year,
        name: query?.name?.trim(),
    });

    return api<ExternalActivityResponse[]>(
        `/users/me/externalActivities${queryString}`,
        { method: "GET" }
    );
}

export async function getMyManagedExternalActivitiesByStatus( //나의 대외활동 진행상태별 조회
    query?: ExternalActivitiesByStatusQuery
): Promise<ExternalActivitiesByStatusResponse> {
    const queryString = buildQueryString({
        year: query?.year,
        name: query?.name?.trim(),
    });

    return api<ExternalActivitiesByStatusResponse>(
        `/users/me/externalActivities/by-status${queryString}`,
        { method: "GET" }
    );
}

export async function createExternalActivityNotice(
    externalActivityId: number | string,
    input: CreateExternalActivityNoticeInput
): Promise<ExternalActivityNoticeResponse> {
    return apiUpload<ExternalActivityNoticeResponse>(
        `/externalActivities/${externalActivityId}/notices`,
        buildExternalActivityNoticeForm(input),
        { method: "POST" }
    );
}

export async function createAssignmentNonSubmissionNotice(
    externalActivityId: number | string,
    assignmentId: number | string,
    body: ExternalActivityNoticeRequest
): Promise<ExternalActivityNoticeResponse> {
    return api<ExternalActivityNoticeResponse>(
        `/externalActivities/${externalActivityId}/assignments/${assignmentId}/non-submission-notices`,
        {
            method: "POST",
            body: JSON.stringify(body),
        }
    );
}

export async function getExternalActivityNotices(
    externalActivityId: number | string
): Promise<ExternalActivityNoticeResponse[]> {
    return api<ExternalActivityNoticeResponse[]>(
        `/externalActivities/${externalActivityId}/notices`,
        { method: "GET" }
    );
}

export async function getExternalActivityNotice(
    externalActivityId: number | string,
    noticeId: number | string
): Promise<ExternalActivityNoticeResponse> {
    return api<ExternalActivityNoticeResponse>(
        `/externalActivities/${externalActivityId}/notices/${noticeId}`,
        { method: "GET" }
    );
}

export async function updateExternalActivityNotice(
    externalActivityId: number | string,
    noticeId: number | string,
    input: UpdateExternalActivityNoticeInput
): Promise<ExternalActivityNoticeResponse> {
    return apiUpload<ExternalActivityNoticeResponse>(
        `/externalActivities/${externalActivityId}/notices/${noticeId}`,
        buildExternalActivityNoticeForm(input),
        { method: "PATCH" }
    );
}

export async function deleteExternalActivityNotice(
    externalActivityId: number | string,
    noticeId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/notices/${noticeId}`,
        { method: "DELETE" }
    );
}

export async function downloadExternalActivityNoticeFile(
    externalActivityId: number | string,
    noticeId: number | string,
    fileId: string,
    fileName?: string | null
): Promise<void> {
    const blob = await apiBlob(
        `/externalActivities/${externalActivityId}/notices/${noticeId}/files/${encodeURIComponent(fileId)}/download`,
        { method: "GET" }
    );

    saveBlob(
        blob,
        fileName?.trim()
            ? sanitizeDownloadName(fileName)
            : `notice-file-${fileId}`
    );
}

/* - Assignment 관련 (Admin) - */
export type EvaluationScoreSource = "MANUAL" | "DEFAULT" | "NONE";

export type CreateAssignmentRequest = {
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    deadlineAt?: string | null;
    resultForms: AssignmentResultForm[];
    systemForm: AssignmentSystemForm;
    maxAutoTeams?: number | null;
    assigneeUserIds: number[];
    teamIds?: number[];
    inlineTeams?: InlineTeamCreateRequest[];
};

export type AssignmentEvaluationCriterionResponse = {
    criterionId: number;
    name: string;
    displayOrder: number;
    maxScore: number;
};

export type AssignmentEvaluationCriterionRequest = {
    criterionId?: number | null;
    name: string;
    maxScore?: number | null;
};

export type AssignmentEvaluationCriteriaUpdateRequest = {
    criteria: AssignmentEvaluationCriterionRequest[];
};

export type AssignmentEvaluationScoreRequest = {
    criterionId: number;
    score: number;
};

export type AssignmentEvaluationSaveRequest = {
    feedback?: string | null;
    scores: AssignmentEvaluationScoreRequest[];
};

export type AssignmentEvaluationItemResponse = {
    criterionId: number;
    name: string;
    displayOrder: number;
    maxScore: number;
    score: number;
};

export type AssignmentSubmissionEvaluationResponse = {
    evaluationId?: number | null;
    submissionId: number;
    assignmentId: number;
    participantId: number;
    lateOnSubmission: boolean;
    evaluatorUserId?: number | null;
    evaluatorName?: string | null;
    feedback?: string | null;
    evaluatedAt?: string | null;
    updatedAt?: string | null;
    criteria: AssignmentEvaluationItemResponse[];
};

export type AssignmentEvaluationOverviewSummary = {
    participantCount: number;
    evaluatedCount: number;
    averageTotalScore?: number | null;
    highestTotalScore?: number | null;
    lowestTotalScore?: number | null;
};

export type AssignmentEvaluationOverviewScore = {
    criterionId: number;
    criterionName: string;
    displayOrder: number;
    maxScore: number;
    score?: number | null;
};

export type AssignmentEvaluationOverviewRow = {
    participantId: number;
    submissionId?: number | null;
    participantType: AssignmentParticipantType;
    participantName: string;
    teamName?: string | null;
    submissionStatus: AssignmentParticipantStatus;
    lateSubmitted: boolean;
    totalScore?: number | null;
    submittedAt?: string | null;
    evaluatedAt?: string | null;
    scores: AssignmentEvaluationOverviewScore[];
};

export type AssignmentEvaluationOverviewResponse = {
    assignmentId: number;
    assignmentName: string;
    criteria: AssignmentEvaluationCriterionResponse[];
    summary: AssignmentEvaluationOverviewSummary;
    rows: AssignmentEvaluationOverviewRow[];
};

export type ExternalActivityEvaluationOverviewSummary = {
    totalAssignmentCount: number;
    toGradeAssignmentCount: number;
    toGradeSubmissionCount: number;
    participantCount: number;
    averageStudentTotalScore?: number | null;
};

export type ExternalActivityEvaluationAssignmentOption = {
    assignmentId: number;
    assignmentName: string;
};

export type ExternalActivityEvaluationOverviewScore = {
    criterionId: number;
    criterionName: string;
    displayOrder: number;
    maxScore: number;
    score?: number | null;
    scoreSource: EvaluationScoreSource;
};

export type ExternalActivityEvaluationOverviewRow = {
    participantId: number;
    participantType: AssignmentParticipantType;
    userId?: number | null;
    teamId?: number | null;
    participantName: string;
    teamName?: string | null;
    profileImage?: string | null;
    submittedAssignmentCount: number;
    totalAssignmentCount: number;
    evaluatedAssignmentCount: number;
    submittedCount: number;
    totalScore?: number | null;
    selectedSubmissionId?: number | null;
    submissionStatus: AssignmentParticipantStatus;
    lateSubmitted: boolean;
    scores: ExternalActivityEvaluationOverviewScore[];
};

export type ExternalActivityEvaluationOverviewResponse = {
    externalActivityId: number;
    externalActivityName: string;
    selectedAssignmentId?: number | null;
    assignments: ExternalActivityEvaluationAssignmentOption[];
    criteria: AssignmentEvaluationCriterionResponse[];
    summary: ExternalActivityEvaluationOverviewSummary;
    rows: ExternalActivityEvaluationOverviewRow[];
};

export type EvaluationTargetType = "USER" | "TEAM";

export type ExternalActivityEvaluationTargetAssignmentRow = {
    assignmentId: number;
    assignmentName: string;
    participantId: number;
    submissionId: number;
    submissionStatus: AssignmentParticipantStatus;
    lateSubmitted: boolean;
    totalScore?: number | null;
    submittedAt?: string | null;
    evaluatedAt?: string | null;
    scores: ExternalActivityEvaluationOverviewScore[];
};

export type ExternalActivityEvaluationTargetDetailResponse = {
    externalActivityId: number;
    externalActivityName: string;
    targetType: EvaluationTargetType;
    targetId: number;
    targetName: string;
    profileImage?: string | null;
    studentNumber?: string | null;
    linkedinUrl?: string | null;
    rows: ExternalActivityEvaluationTargetAssignmentRow[];
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

export async function getAssignmentEvaluationCriteria(
    assignmentId: number | string
): Promise<AssignmentEvaluationCriterionResponse[]> {
    return api<AssignmentEvaluationCriterionResponse[]>(
        `/assignments/${assignmentId}/evaluation-criteria`,
        { method: "GET" }
    );
}

export async function getAssignmentEvaluationOverview(
    assignmentId: number | string
): Promise<AssignmentEvaluationOverviewResponse> {
    return api<AssignmentEvaluationOverviewResponse>(
        `/assignments/${assignmentId}/evaluations/overview`,
        { method: "GET" }
    );
}

export type UpdateAssignmentMetaRequest = {
    name?: string | null;
    description?: string | null;
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

export async function getExternalActivityEvaluationOverview(
    externalActivityId: number | string,
    assignmentId?: number | string | null
): Promise<ExternalActivityEvaluationOverviewResponse> {
    const queryString = buildQueryString({ assignmentId });

    return api<ExternalActivityEvaluationOverviewResponse>(
        `/externalActivities/${externalActivityId}/evaluations/overview${queryString}`,
        { method: "GET" }
    );
}

export async function getExternalActivityEvaluationTargetDetail(
    externalActivityId: number | string,
    targetType: EvaluationTargetType,
    targetId: number | string
): Promise<ExternalActivityEvaluationTargetDetailResponse> {
    return api<ExternalActivityEvaluationTargetDetailResponse>(
        `/externalActivities/${externalActivityId}/evaluations/targets/${targetType}/${targetId}`,
        { method: "GET" }
    );
}

export async function getSubmissionEvaluation(
    submissionId: number | string
): Promise<AssignmentSubmissionEvaluationResponse> {
    return api<AssignmentSubmissionEvaluationResponse>(
        `/submissions/${submissionId}/evaluation`,
        { method: "GET" }
    );
}

export async function saveSubmissionEvaluation(
    submissionId: number | string,
    request: AssignmentEvaluationSaveRequest
): Promise<AssignmentSubmissionEvaluationResponse> {
    return api<AssignmentSubmissionEvaluationResponse>(
        `/submissions/${submissionId}/evaluation`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        }
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

export async function downloadLeaderboardEvidenceFile(
    externalActivityId: number | string,
    submissionId: number | string,
    fileName?: string | null
): Promise<void> {
    const blob = await apiBlob(
        `/externalActivities/${externalActivityId}/submissions/${submissionId}/evidence/download`,
        { method: "GET" }
    );

    const safeFileName = fileName?.trim()
        ? sanitizeDownloadName(fileName)
        : `leaderboard-evidence-${submissionId}`;

    saveBlob(blob, safeFileName);
}

export async function downloadLeaderboardEvidenceFileById(
    externalActivityId: number | string,
    submissionId: number | string,
    evidenceId: number | string,
    fallbackFileName = "evidence-file"
): Promise<void> {
    const blob = await apiBlob(
        `/externalActivities/${externalActivityId}/submissions/${submissionId}/evidences/${evidenceId}/download`,
        { method: "GET" }
    );

    const safeFileName = fallbackFileName.trim()
        ? sanitizeDownloadName(fallbackFileName)
        : `leaderboard-evidence-${evidenceId}`;

    saveBlob(blob, safeFileName);
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
    return api<AttendanceEventResponse[]>(
        `/externalActivities/${externalActivityId}/attendance-events${buildQueryString({ sort })}`,
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
    const queryString = buildQueryString({
        search: query?.search?.trim(),
        sort: query?.sort,
    });

    return api<AttendanceParticipantRateResponse[]>(
        `/externalActivities/${externalActivityId}/attendance/participants${queryString}`,
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


/* - LeaderBoard 관련 (Admin) - */
export async function getLeaderboard(
    externalActivityId: number | string,
    query?: { scope?: LeaderboardScope; sort?: LeaderboardSort; page?: number; size?: number }
): Promise<LeaderboardResponse> {
    const queryString = buildQueryString({
        scope: query?.scope ?? "individual",
        sort: query?.sort ?? "score",
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<LeaderboardResponse>(
        `/externalActivities/${externalActivityId}/leaderboard${queryString}`,
        { method: "GET" }
    );
}

export async function rebuildLeaderboardSnapshot(
    externalActivityId: number | string,
    scope: LeaderboardScope = "individual"
): Promise<LeaderboardSnapshotRebuildResponse> {
    const queryString = buildQueryString({ scope });

    return api<LeaderboardSnapshotRebuildResponse>(
        `/externalActivities/${externalActivityId}/leaderboard/snapshots/rebuild${queryString}`,
        { method: "POST" }
    );
}

export async function getLeaderboardApprovals(
    externalActivityId: number | string,
    query?: { status?: LeaderboardApprovalStatus; sort?: LeaderboardApprovalSort; page?: number; size?: number }
): Promise<LeaderboardApprovalsResponse> {
    const queryString = buildQueryString({
        status: query?.status ?? "pending",
        sort: query?.sort ?? "latest",
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<LeaderboardApprovalsResponse>(
        `/externalActivities/${externalActivityId}/approvals${queryString}`,
        { method: "GET" }
    );
}

export async function getLeaderboardStudentDetail(
    externalActivityId: number | string,
    studentId: number | string
): Promise<LeaderboardStudentDetailResponse> {
    return api<LeaderboardStudentDetailResponse>(
        `/externalActivities/${externalActivityId}/students/${studentId}`,
        { method: "GET" }
    );
}

export async function getLeaderboardStudentCompletedMissions(
    externalActivityId: number | string,
    studentId: number | string,
    query?: { page?: number; size?: number }
): Promise<LeaderboardCompletedMissionsResponse> {
    const queryString = buildQueryString({
        page: query?.page ?? 0,
        size: query?.size ?? 20,
    });

    return apiWrappedData<LeaderboardCompletedMissionsResponse>(
        `/externalActivities/${externalActivityId}/students/${studentId}/missions/completed${queryString}`,
        { method: "GET" }
    );
}

export async function getLeaderboardSubmissionDetail(
    externalActivityId: number | string,
    submissionId: number | string
): Promise<LeaderboardSubmissionDetailResponse> {
    return api<LeaderboardSubmissionDetailResponse>(
        `/externalActivities/${externalActivityId}/submissions/${submissionId}`,
        { method: "GET" }
    );
}

export async function deleteLeaderboardCompletedMission(
    externalActivityId: number | string,
    studentId: number | string,
    submissionId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/students/${studentId}/missions/completed/${submissionId}`,
        { method: "DELETE" }
    );
}

export async function approveLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string,
    request: LeaderboardReviewRequest
): Promise<LeaderboardReviewResponse> {
    return api<LeaderboardReviewResponse>(
        `/externalActivities/${externalActivityId}/approvals/${submissionId}/approve`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function rejectLeaderboardSubmission(
    externalActivityId: number | string,
    submissionId: number | string,
    request: LeaderboardRejectRequest
): Promise<LeaderboardReviewResponse> {
    return api<LeaderboardReviewResponse>(
        `/externalActivities/${externalActivityId}/approvals/${submissionId}/reject`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function getLeaderboardMissions(
    externalActivityId: number | string
): Promise<LeaderboardMissionListResponse> {
    return apiWrappedData<LeaderboardMissionListResponse>(
        `/externalActivities/${externalActivityId}/missions`,
        { method: "GET" }
    );
}

export async function createLeaderboardMission(
    externalActivityId: number | string,
    request: LeaderboardMissionRequest
): Promise<LeaderboardMissionResponse> {
    return apiWrappedData<LeaderboardMissionResponse>(
        `/externalActivities/${externalActivityId}/missions`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function updateLeaderboardMission(
    externalActivityId: number | string,
    missionId: number | string,
    request: LeaderboardMissionRequest
): Promise<LeaderboardMissionResponse> {
    return apiWrappedData<LeaderboardMissionResponse>(
        `/externalActivities/${externalActivityId}/missions/${missionId}`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function deleteLeaderboardMission(
    externalActivityId: number | string,
    missionId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/missions/${missionId}`,
        { method: "DELETE" }
    );
}

export async function getLeaderboardScoringRules(
    externalActivityId: number | string
): Promise<LeaderboardScoringRuleResponse> {
    return api<LeaderboardScoringRuleResponse>(
        `/externalActivities/${externalActivityId}/scoring-rules`,
        { method: "GET" }
    );
}

export async function saveLeaderboardScoringRules(
    externalActivityId: number | string,
    request: LeaderboardScoringRuleRequest
): Promise<LeaderboardScoringRuleResponse> {
    return api<LeaderboardScoringRuleResponse>(
        `/externalActivities/${externalActivityId}/scoring-rules`,
        {
            method: "POST",
            body: JSON.stringify(request),
        }
    );
}

export async function updateLeaderboardScoringRuleItem(
    externalActivityId: number | string,
    ruleItemId: number | string,
    request: LeaderboardScoringRuleItemRequest
): Promise<LeaderboardScoringRuleItemResponse> {
    return api<LeaderboardScoringRuleItemResponse>(
        `/externalActivities/${externalActivityId}/scoring-rules/items/${ruleItemId}`,
        {
            method: "PATCH",
            body: JSON.stringify(request),
        }
    );
}

export async function deleteLeaderboardScoringRuleItem(
    externalActivityId: number | string,
    ruleItemId: number | string
): Promise<void> {
    await api<void>(
        `/externalActivities/${externalActivityId}/scoring-rules/items/${ruleItemId}`,
        { method: "DELETE" }
    );
}
