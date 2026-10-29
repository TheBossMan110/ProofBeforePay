export type TierName = "ultra" | "super" | "nano";
export type StageKey = "intake" | "research" | "forensics" | "verify" | "judge" | "challenge" | "brief";
export type RunStatus = "queued" | "running" | "done" | "error";
export type Decision = "PROCEED" | "VERIFY_FIRST" | "STOP";
export type Polarity = "red" | "green" | "amber";
export type ClaimStatus = "pending" | "checking" | "verified" | "contradicted" | "inconclusive";

export interface Tier {
  name: TierName;
  label: string;
  model: string;
  input_price: number;
  output_price: number;
}

export interface Health {
  status: string;
  live: boolean;
  tiers: Tier[];
  examples: number;
  limits: { per_ip_per_hour: number };
  accounts?: boolean;
  email_test_mode?: boolean;
}

export interface LlmCall {
  step: string;
  tier: TierName;
  requested_tier: TierName;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  ttft_ms: number | null;
  cost_usd: number;
  baseline_cost_usd: number;
  estimated_usage: boolean;
}

export interface TavilyCall {
  kind: "search" | "exact" | "crawl" | "extract";
  step: string;
  purpose: string;
  query: string;
  depth: string;
  results: number;
  latency_ms: number;
  credits: number;
  ok: boolean;
  url?: string;
  domains?: string[];
}

export interface Source {
  id: string;
  url: string;
  title: string;
  domain: string;
  purposes: string[];
  snippet: string;
  retrieved_at?: number;
}

export interface Signal {
  id: string;
  kind: string;
  rule: string;
  polarity: Polarity;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  evidence: string;
  why: string;
}

export interface Claim {
  id: string;
  type: string;
  text: string;
  status: ClaimStatus;
  confidence?: number;
  source_id?: string | null;
  quote?: string;
  note?: string;
  source?: Source | null;
  checked_by?: TierName;
  escalated?: boolean;
}

export interface Contacts {
  emails: string[];
  urls: string[];
  phones: string[];
  domains: string[];
}

export interface Entities {
  company: string;
  recruiter_name: string;
  recruiter_title: string;
  role: string;
  compensation: string;
  work_mode: string;
  channel: string;
  requests: string[];
  fingerprint: string;
  contacts: Contacts;
}

export interface Finding {
  polarity: Polarity;
  text: string;
  refs: string[];
  /** Set when the challenger found the finding claims more than its sources say. */
  disputed?: string;
}

export interface Judgement {
  decision: Decision;
  confidence: number;
  headline: string;
  assessment: string;
  key_findings: Finding[];
  do_not: string[];
  next_step: string;
  verification_questions: string[];
  limitations: string;
  guardrail: string | null;
  challenge_effect?: string | null;
  decision_before_challenge?: Decision;
}

export interface Challenge {
  outcome: "holds" | "weakened" | "overturned";
  should_be: Decision;
  doubt: "none" | "some" | "serious";
  counter_hypothesis: string;
  searches: string[];
  strongest_counterpoint: string;
  alternative_explanations: string[];
  would_change: { if: string; check: string; then: Decision }[];
  unresolved: string[];
  sources: string[];
  disputed?: { finding: number; text: string; why: string }[];
  effect: string | null;
}

export interface LinkCheck {
  url: string;
  domain: string;
  official: boolean;
  reachable: boolean;
  unregistered: boolean;
  title: string | null;
  snippet: string;
  source_id: string | null;
  asks_for: { kind: string; label: string; quote: string }[];
  presents_as: string | null;
}

export interface Brief {
  tldr: string;
  reply: { subject: string; body: string };
}

export interface TierTotals {
  label: string;
  model: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  latency_ms: number;
}

export interface Telemetry {
  tiers: Record<TierName, TierTotals>;
  calls: LlmCall[];
  cost_usd: number;
  baseline_cost_usd: number;
  savings_pct: number;
  tavily: { calls: number; credits: number; by_kind: Record<string, number> };
  duration_s: number;
}

export interface OfferInput {
  message: string;
  sender: string;
  channel: string;
}

export interface Report {
  version: number;
  input: OfferInput;
  generated_at: number;
  entities: Entities;
  official_domain: string | null;
  signals: Signal[];
  claims: Claim[];
  judgement: Judgement;
  challenge?: Challenge | null;
  links?: LinkCheck[];
  brief: Brief;
  sources: Source[];
  telemetry: Telemetry;
}

export interface InvestigationSummary {
  id: string;
  status: RunStatus;
  example?: boolean;
  created_at: number;
  input?: OfferInput;
  error: string | null;
  decision: Decision | null;
  headline: string | null;
  confidence: number | null;
  company: string | null;
  role: string | null;
  challenge_outcome?: "holds" | "weakened" | "overturned" | null;
  cost_usd?: number | null;
  duration_s?: number | null;
  savings_pct?: number | null;
}

/** Anonymous numbers for the home page. */
export interface PublicStats {
  checks: number;
  avg_seconds: number;
  avg_cost_usd: number;
  avg_savings_pct: number;
  by_decision: Partial<Record<Decision, number>>;
}

// ── Accounts and admin ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  verified: boolean;
  created_at: string | null;
  /** One of the shared demo accounts judges sign in to; it can't be changed. */
  demo?: boolean;
}

export type HealthState = "ok" | "degraded" | "down" | "off";

export interface ServiceHealth {
  status: HealthState;
  detail: string;
  latency_ms?: number;
}

export interface AdminOverview {
  generated_at: number;
  health: Record<"api" | "token_factory" | "tavily" | "database" | "email", ServiceHealth>;
  models: Tier[];
  budget: { spent_usd: number; cap_usd: number; reserved_usd: number };
  stats: {
    users: number;
    verified_users: number;
    investigations: number;
    investigations_24h: number;
    errors: number;
    by_decision: Partial<Record<Decision, number>>;
    challenge_outcomes: Partial<Record<"holds" | "weakened" | "overturned", number>>;
    avg_cost_usd: number;
    total_cost_usd: number;
    avg_duration_s: number;
    avg_savings_pct: number;
    feedback: number;
    avg_rating: number | null;
    messages: number;
    per_day: { day: string; count: number }[];
  };
  recent: InvestigationSummary[];
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "user" | "admin";
  verified: boolean;
  created_at: number | null;
  last_login_at: number | null;
  investigations: number;
}

export interface FeedbackItem {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  investigation_id: string | null;
  rating: number;
  comment: string | null;
  created_at: number;
}

export type ContactTopic = "question" | "feedback" | "partnership" | "press" | "bug" | "other";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  created_at: number;
}

export interface InvestigationDetail extends InvestigationSummary {
  input: OfferInput;
  report: Report | null;
}

export type RunEvent = { seq: number; t: number } & (
  | { type: "status"; status: RunStatus; message?: string }
  | { type: "stage"; stage: StageKey; state: "start" | "done" | "error"; duration_ms?: number }
  | { type: "log"; stage?: StageKey; level: "info" | "warn"; message: string }
  | { type: "stream"; step: string; tier: TierName; kind: "thinking" | "content"; text: string }
  | { type: "llm_call"; call: LlmCall }
  | { type: "tavily_call"; call: TavilyCall }
  | { type: "source"; source: Source }
  | { type: "signal"; signal: Signal }
  | { type: "entities"; entities: Entities; claims: Pick<Claim, "id" | "type" | "text">[] }
  | { type: "official"; domain: string }
  | { type: "claim"; claim: Claim }
  | { type: "judgement"; judgement: Judgement }
  | { type: "challenge"; challenge: Challenge }
  | { type: "link"; link: LinkCheck }
  | { type: "report"; report: Report }
  | { type: "error"; message: string }
);
