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
function handleAuthFail(res: Response) {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("accessToken");
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
}

export async function apiPublic(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...getAuthHeader(),
  };

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  handleAuthFail(res);
  return res;
}

//auth
export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...getAuthHeader(),
  };

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  handleAuthFail(res);

  if (res.status === 204) { return undefined as T;}

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
  }

  return (await res.json()) as T;
}

export async function logout(): Promise<void> {
  await api<void>("/auth/logout", { method: "POST" });
}

// 업로드용 API
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...getAuthHeader(),
  };

  const res = await fetch(buildUrl(path), {
    ...init,
    method: init.method ?? "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  handleAuthFail(res);

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "");
    return bodyText as unknown as T;
  }

  return (await res.json()) as T;
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

export type UserMe = {
  userId: number;
  name: string;
  profileImage: string;
};

export async function getUserMe(): Promise<UserMe> {
  return api<UserMe>("/users/me");
}

// 최근 기록한 일정 관련
export type Transcription = {
  id: number;
  text: string;
  audioUrl?: string;
};

export type EventDay = {
  eventDayId: number;
  title: string;
  eventId: string | number;
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  memo?: string | null;
  completed: boolean;
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
export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(status: number, message: string, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}