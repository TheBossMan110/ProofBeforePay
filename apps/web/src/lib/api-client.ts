import type {
  AdminOverview,
  AdminUser,
  ContactMessage,
  ContactTopic,
  FeedbackItem,
  Health,
  InvestigationDetail,
  InvestigationSummary,
  OfferInput,
  User,
} from "@/types";

/** Empty everywhere: production serves the app from FastAPI, and the dev server proxies /api to it. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "",
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // Only send a JSON content type with a body, so plain GETs stay simple requests.
    const headers = init?.body ? { "content-type": "application/json" } : undefined;
    response = await fetch(apiUrl(`/api/v1${path}`), { credentials: "same-origin", ...init, headers });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (!response.ok) {
    let message = `Something went wrong (${response.status}). Please try again.`;
    let code = "";
    try {
      const { detail } = await response.json();
      if (typeof detail === "string") message = detail;
      else if (detail && typeof detail.message === "string") ({ message, code = "" } = detail);
      else if (Array.isArray(detail) && detail[0]?.msg) message = String(detail[0].msg).replace(/^Value error, /, "");
    } catch {
      // Non-JSON error body: keep the status-based message.
    }
    throw new ApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const eventsUrl = (id: string, replay?: number) =>
  apiUrl(`/api/v1/investigations/${encodeURIComponent(id)}/events${replay !== undefined ? `?replay=${replay}` : ""}`);

export const api = {
  health: () => request<Health>("/health"),
  examples: () => request<InvestigationSummary[]>("/examples"),
  get: (id: string) => request<InvestigationDetail>(`/investigations/${encodeURIComponent(id)}`),
  create: (input: OfferInput) => post<{ id: string }>("/investigations", input),
  feedback: (body: { investigation_id?: string; rating: number; comment?: string }) => post<{ status: string }>("/feedback", body),
  contact: (body: { name: string; email: string; topic: ContactTopic; message: string }) => post<{ status: string }>("/contact", body),
};

export const auth = {
  me: () => request<{ user: User | null }>("/auth/me"),
  signup: (body: { name: string; email: string; password: string }) => post<{ status: "verify"; email: string }>("/auth/signup", body),
  verify: (body: { email: string; code: string }) => post<{ user: User }>("/auth/verify", body),
  resend: (body: { email: string; purpose: "verify" | "reset" }) => post<{ status: string }>("/auth/resend", body),
  login: (body: { email: string; password: string }) => post<{ user: User }>("/auth/login", body),
  forgot: (body: { email: string }) => post<{ status: string }>("/auth/forgot", body),
  reset: (body: { email: string; code: string; password: string }) => post<{ user: User }>("/auth/reset", body),
  logout: () => post<{ status: string }>("/auth/logout"),
};

export const me = {
  investigations: () => request<InvestigationSummary[]>("/me/investigations"),
  rename: (name: string) => request<{ user: User }>("/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  remove: () => request<{ status: string }>("/me", { method: "DELETE" }),
};

export const admin = {
  overview: () => request<AdminOverview>("/admin/overview"),
  users: () => request<AdminUser[]>("/admin/users"),
  investigations: () => request<InvestigationSummary[]>("/admin/investigations"),
  feedback: () => request<FeedbackItem[]>("/admin/feedback"),
  messages: () => request<ContactMessage[]>("/admin/messages"),
};
