"use client";

import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Coins,
  Cpu,
  Database,
  Download,
  Globe,
  Inbox,
  Mail,
  MessageSquareHeart,
  RefreshCw,
  ScanSearch,
  Server,
  Star,
  TrendingDown,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/stores/session";
import { VerdictBars } from "@/components/risk/VerdictBars";
import { Button, Card, CardHeader, cx, DecisionBadge, Skeleton, Spinner, TierBadge } from "@/components/ui";
import { EmptyState, PageHeader, StatTile } from "@/components/ui/page";
import { useApi } from "@/hooks/useApi";
import { admin } from "@/lib/api-client";
import { downloadCsv, isoTime } from "@/lib/csv";
import { ago, duration, shortDate, usd } from "@/lib/formatters";
import type { AdminOverview, HealthState, ServiceHealth } from "@/types";

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "users", label: "Users", icon: Users },
  { key: "investigations", label: "Investigations", icon: ScanSearch },
  { key: "feedback", label: "Feedback", icon: MessageSquareHeart },
  { key: "messages", label: "Messages", icon: Inbox },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const { user } = useSession();
  return (
    <div>
      <PageHeader eyebrow="Admin" title="System and usage">
        Whether every part of ProofBeforePay is up, how it&apos;s being used, and what people are saying.
      </PageHeader>
      {user?.demo && (
        <p className="-mt-4 mb-6 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-bone-300">
          <span className="font-semibold text-bone-100">Demo admin view.</span> Everything here is live, but people&apos;s names and email addresses are masked.
        </p>
      )}
      <div className="scroll-slim -mx-1 mb-6 flex gap-1 overflow-x-auto px-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cx("relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors", tab === key ? "text-bone-50" : "text-bone-400 hover:text-bone-100")}
          >
            {tab === key && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08] ring-inset" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            <Icon className={cx("relative size-4", tab === key ? "text-brand-300" : "text-bone-500")} aria-hidden />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
          {tab === "overview" && <Overview />}
          {tab === "users" && <UsersTab />}
          {tab === "investigations" && <InvestigationsTab />}
          {tab === "feedback" && <FeedbackTab />}
          {tab === "messages" && <MessagesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const STATUS: Record<HealthState, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-brand-400", text: "text-brand-300", label: "Operational" },
  degraded: {
    dot: "bg-caution-400",
    text: "text-caution-300",
    label: "Degraded",
  },
  down: { dot: "bg-stop-400", text: "text-stop-300", label: "Down" },
  off: { dot: "bg-bone-600", text: "text-bone-400", label: "Not configured" },
};

const SERVICES: {
  key: keyof AdminOverview["health"];
  name: string;
  icon: LucideIcon;
}[] = [
  { key: "api", name: "API server", icon: Server },
  { key: "token_factory", name: "Nebius Token Factory", icon: Cpu },
  { key: "tavily", name: "Tavily", icon: Globe },
  { key: "database", name: "Supabase", icon: Database },
  { key: "email", name: "Resend email", icon: Mail },
];

function HealthCard({ name, icon: Icon, health, index }: { name: string; icon: LucideIcon; health: ServiceHealth; index: number }) {
  const s = STATUS[health.status];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="panel p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-bone-500" aria-hidden />
        <span className={cx("flex items-center gap-1.5 text-xs font-medium", s.text)}>
          <span className="relative flex size-2">
            {health.status === "ok" && <span className={cx("absolute inline-flex size-full animate-ping rounded-full opacity-60", s.dot)} />}
            <span className={cx("relative inline-flex size-2 rounded-full", s.dot)} />
          </span>
          {s.label}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-bone-50">{name}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-bone-500">{health.detail}</p>
      {health.latency_ms !== undefined && <p className="mt-2 font-mono text-[11px] text-bone-400">{health.latency_ms} ms</p>}
    </motion.div>
  );
}

function PerDay({ days }: { days: AdminOverview["stats"]["per_day"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  if (!days.length) return <p className="py-8 text-center text-sm text-bone-500">No checks yet.</p>;
  return (
    <div>
      <div className="relative flex h-40 items-end gap-1.5" aria-hidden>
        {days.map((d, i) => (
          <div key={d.day} className="relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <motion.div
              className={cx("w-full rounded-t-[4px] transition-colors", hover === i ? "bg-brand-300" : "bg-brand-500/80")}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              transition={{
                delay: 0.03 * i,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
            {hover === i && (
              <span className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-white/[0.1] bg-ink-850 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-bone-100 shadow-lg">
                {d.count} ·{" "}
                {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-white/[0.06] pt-2 font-mono text-[10.5px] text-bone-500">
        <span>
          {new Date(`${days[0]!.day}T00:00:00Z`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
        <span>{new Date(`${days[days.length - 1]!.day}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
      </div>
      <table className="sr-only">
        <caption>Checks per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Overview() {
  const { data, error, loading, reload } = useApi(() => admin.overview(), []);
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (!data) return loading ? <Skeleton className="h-[640px] rounded-2xl" /> : <p className="text-sm text-stop-300">{error}</p>;
  const { stats, budget } = data;
  const spentShare = Math.min(1, budget.spent_usd / budget.cap_usd);
  const reservedShare = Math.min(1 - spentShare, budget.reserved_usd / budget.cap_usd);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bone-500">Updated {ago(data.generated_at)}</p>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={reload} disabled={loading}>
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" aria-hidden />} Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {SERVICES.map((s, i) => (
          <HealthCard key={s.key} name={s.name} icon={s.icon} health={data.health[s.key]} index={i} />
        ))}
      </div>

      <Card>
        <CardHeader icon={<Coins className="size-4" />} title="Model budget" subtitle="Live checks pause before the ceiling; the examples keep working" />
        <div className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-3xl font-semibold tracking-[-0.04em] text-bone-50">
              {usd(budget.spent_usd)} <span className="text-base font-normal text-bone-500">of {usd(budget.cap_usd)}</span>
            </p>
            <p className="text-sm text-bone-400">{Math.round(spentShare * 100)}% used</p>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/[0.05]" role="img" aria-label={`${usd(budget.spent_usd)} spent of ${usd(budget.cap_usd)}`}>
            <motion.div
              className={cx("h-full", spentShare > 0.8 ? "bg-stop-400" : spentShare > 0.6 ? "bg-caution-400" : "bg-brand-400")}
              initial={{ width: 0 }}
              animate={{ width: `${spentShare * 100}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
            {reservedShare > 0 && <motion.div className="h-full bg-sand-300/50" initial={{ width: 0 }} animate={{ width: `${reservedShare * 100}%` }} title="Held back for checks in progress" />}
          </div>
          <p className="mt-2 text-xs text-bone-500">{budget.reserved_usd > 0 ? `${usd(budget.reserved_usd)} held back for checks in progress.` : "No checks in progress."}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Users" value={stats.users} hint={`${stats.verified_users} verified`} index={0} />
        <StatTile icon={ScanSearch} label="Investigations" value={stats.investigations} hint={`${stats.investigations_24h} in the last 24 hours`} index={1} />
        <StatTile icon={Clock3} label="Average time" value={stats.avg_duration_s} format={(n) => `${Math.round(n)}s`} index={2} />
        <StatTile icon={Coins} label="Average cost" value={stats.avg_cost_usd} format={(n) => usd(n)} hint={`${usd(stats.total_cost_usd)} in total`} index={3} />
        <StatTile icon={TrendingDown} label="Saved by routing" value={stats.avg_savings_pct} format={(n) => `${Math.round(n)}%`} tone="text-brand-300" index={4} />
        <StatTile icon={TriangleAlert} label="Didn't finish" value={stats.errors} tone={stats.errors ? "text-stop-300" : undefined} index={5} />
        <StatTile icon={Star} label="Average rating" value={stats.avg_rating} format={(n) => n.toFixed(1)} hint={`${stats.feedback} ratings`} index={6} />
        <StatTile icon={Inbox} label="Messages" value={stats.messages} index={7} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={<Activity className="size-4" />} title="Checks per day" subtitle="Last 14 days with activity" />
          <div className="p-5">
            <PerDay days={stats.per_day} />
          </div>
        </Card>
        <Card>
          <CardHeader icon={<ScanSearch className="size-4" />} title="Verdicts" />
          <div className="space-y-6 p-5">
            <VerdictBars counts={stats.by_decision} />
            <div>
              <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-bone-500 uppercase">Challenge outcomes</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {(["holds", "weakened", "overturned"] as const).map((k) => (
                  <span key={k} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-bone-300 ring-1 ring-white/[0.07] ring-inset">
                    {
                      {
                        holds: "Held up",
                        weakened: "Weakened",
                        overturned: "Changed",
                      }[k]
                    }{" "}
                    · <span className="font-mono text-bone-100">{stats.challenge_outcomes[k] ?? 0}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Cpu className="size-4" />} title="Models in use" />
          <ul className="divide-y divide-white/[0.05]">
            {data.models.map((m) => (
              <li key={m.name} className="space-y-1 px-5 py-3">
                <TierBadge tier={m.name} />
                <p className="truncate font-mono text-[11px] text-bone-400">{m.model}</p>
                <p className="font-mono text-[11px] text-bone-500">
                  ${m.input_price.toFixed(2)} in · ${m.output_price.toFixed(2)} out per 1M tokens
                </p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader icon={<ScanSearch className="size-4" />} title="Latest investigations" />
          <RunList runs={data.recent} />
        </Card>
      </div>
    </div>
  );
}

function RunList({ runs }: { runs: AdminOverview["recent"] }) {
  if (!runs.length)
    return (
      <div className="p-5">
        <EmptyState icon={ScanSearch} title="No investigations yet" />
      </div>
    );
  return (
    <ul className="divide-y divide-white/[0.05]">
      {runs.map((r) => (
        <li key={r.id}>
          <Link href={`/investigations?id=${encodeURIComponent(r.id)}`} className="group flex items-center gap-4 px-5 py-3 transition hover:bg-white/[0.02]">
            <span className="w-28 shrink-0">
              {r.decision ? <DecisionBadge decision={r.decision} /> : <span className={cx("text-xs", r.status === "error" ? "text-stop-300" : "text-bone-400")}>{r.status === "error" ? "Didn't finish" : "Running"}</span>}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-bone-200">{[r.role, r.company].filter(Boolean).join(" at ") || r.headline || r.id}</span>
            <span className="hidden font-mono text-[11px] text-bone-500 sm:block">{r.cost_usd ? usd(r.cost_usd) : ""}</span>
            <span className="font-mono text-[11px] text-bone-500">{ago(r.created_at)}</span>
            <ArrowUpRight className="size-3.5 text-bone-600 group-hover:text-bone-200" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={onClick}>
      <Download className="size-3.5" aria-hidden />
      Download CSV
    </Button>
  );
}

function UsersTab() {
  const { data, loading, error } = useApi(() => admin.users(), []);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => (data ?? []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase())), [data, query]);
  if (!data) return loading ? <Skeleton className="h-96 rounded-2xl" /> : <p className="text-sm text-stop-300">{error}</p>;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <p className="text-sm text-bone-400">
          <span className="font-semibold text-bone-50">{data.length}</span> accounts · {data.filter((u) => u.verified).length} verified
        </p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search name or email"
            className="h-9 w-full rounded-xl border border-white/[0.08] bg-ink-900 px-3 text-sm text-bone-50 placeholder:text-bone-600 focus:border-brand-500/60 focus:outline-none sm:w-64"
          />
          <CsvButton
            onClick={() =>
              downloadCsv("users", shown, [
                ["Name", (u) => u.name],
                ["Email", (u) => u.email],
                ["Role", (u) => u.role],
                ["Verified", (u) => (u.verified ? "yes" : "no")],
                ["Joined", (u) => isoTime(u.created_at)],
                ["Last sign-in", (u) => isoTime(u.last_login_at)],
                ["Checks", (u) => u.investigations],
              ])
            }
          />
        </div>
      </div>
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="font-mono text-[10.5px] tracking-[0.12em] text-bone-500 uppercase">
            <tr className="border-b border-white/[0.06]">
              {["Name", "Email", "Role", "Verified", "Joined", "Last sign-in", "Checks"].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((u, i) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                <td className="px-5 py-3 font-medium text-bone-100">{u.name || "—"}</td>
                <td className="px-5 py-3 text-bone-300">{u.email}</td>
                <td className="px-5 py-3">
                  {u.role === "admin" ? <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-300 ring-1 ring-brand-500/25 ring-inset">Admin</span> : <span className="text-bone-500">User</span>}
                </td>
                <td className="px-5 py-3">{u.verified ? <BadgeCheck className="size-4 text-brand-300" aria-label="Verified" /> : <span className="text-xs text-caution-300">Pending</span>}</td>
                <td className="px-5 py-3 text-bone-400">{u.created_at ? shortDate(u.created_at) : "—"}</td>
                <td className="px-5 py-3 text-bone-400">{u.last_login_at ? ago(u.last_login_at) : "—"}</td>
                <td className="px-5 py-3 font-mono text-bone-200">{u.investigations}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="py-10 text-center text-sm text-bone-500">No accounts match.</p>}
      </div>
    </Card>
  );
}

function InvestigationsTab() {
  const { data, loading, error } = useApi(() => admin.investigations(), []);
  if (!data) return loading ? <Skeleton className="h-96 rounded-2xl" /> : <p className="text-sm text-stop-300">{error}</p>;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<ScanSearch className="size-4" />}
        title={`${data.length} investigations`}
        subtitle="Newest first, signed-in and anonymous"
        right={
          <CsvButton
            onClick={() =>
              downloadCsv("investigations", data, [
                ["ID", (r) => r.id],
                ["When", (r) => isoTime(r.created_at)],
                ["Status", (r) => r.status],
                ["Verdict", (r) => r.decision],
                ["Company", (r) => r.company],
                ["Role", (r) => r.role],
                ["Challenge", (r) => r.challenge_outcome],
                ["Seconds", (r) => r.duration_s],
                ["Cost (USD)", (r) => r.cost_usd],
                ["Owner", (r) => ((r as { user_id?: string | null }).user_id ? "Account" : "Anonymous")],
              ])
            }
          />
        }
      />
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="font-mono text-[10.5px] tracking-[0.12em] text-bone-500 uppercase">
            <tr className="border-b border-white/[0.06]">
              {["When", "Verdict", "Offer", "Challenge", "Time", "Cost", "Owner"].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.015]">
                <td className="px-5 py-3 whitespace-nowrap text-bone-400">{ago(r.created_at)}</td>
                <td className="px-5 py-3">{r.decision ? <DecisionBadge decision={r.decision} /> : <span className="text-xs text-stop-300">{r.status}</span>}</td>
                <td className="max-w-[280px] truncate px-5 py-3">
                  <Link href={`/investigations?id=${encodeURIComponent(r.id)}`} className="text-bone-100 hover:text-brand-300">
                    {[r.role, r.company].filter(Boolean).join(" at ") || r.headline || r.id}
                  </Link>
                </td>
                <td className="px-5 py-3 text-bone-400">{r.challenge_outcome ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-bone-400">{r.duration_s ? duration(r.duration_s * 1000) : "—"}</td>
                <td className="px-5 py-3 font-mono text-bone-400">{r.cost_usd ? usd(r.cost_usd) : "—"}</td>
                <td className="px-5 py-3 text-bone-500">{(r as { user_id?: string | null }).user_id ? "Account" : "Anonymous"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && (
          <div className="p-5">
            <EmptyState icon={ScanSearch} title="No investigations yet" />
          </div>
        )}
      </div>
    </Card>
  );
}

function FeedbackTab() {
  const { data, loading, error } = useApi(() => admin.feedback(), []);
  if (!data) return loading ? <Skeleton className="h-96 rounded-2xl" /> : <p className="text-sm text-stop-300">{error}</p>;
  if (!data.length)
    return (
      <EmptyState icon={MessageSquareHeart} title="No feedback yet">
        Ratings from the bottom of every report show up here.
      </EmptyState>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-bone-400">
          <span className="font-semibold text-bone-50">{data.length}</span> ratings · average {(data.reduce((sum, f) => sum + f.rating, 0) / data.length).toFixed(1)} of 5
        </p>
        <CsvButton
          onClick={() =>
            downloadCsv("feedback", data, [
              ["When", (f) => isoTime(f.created_at)],
              ["Rating", (f) => f.rating],
              ["Comment", (f) => f.comment],
              ["Name", (f) => f.user_name],
              ["Email", (f) => f.user_email],
              ["Investigation", (f) => f.investigation_id],
            ])
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }} className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex gap-0.5" aria-label={`${f.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cx("size-4", n <= f.rating ? "fill-sand-300 text-sand-300" : "text-bone-700")} aria-hidden />
                ))}
              </span>
              <span className="text-xs text-bone-500">{ago(f.created_at)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-bone-200">{f.comment || <span className="text-bone-500">No comment.</span>}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-bone-500">
              <span>{f.user_email ? `${f.user_name ?? ""} · ${f.user_email}` : "Anonymous"}</span>
              {f.investigation_id && (
                <Link href={`/investigations?id=${encodeURIComponent(f.investigation_id)}`} className="inline-flex items-center gap-1 text-bone-400 hover:text-bone-50">
                  Report <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MessagesTab() {
  const { data, loading, error } = useApi(() => admin.messages(), []);
  if (!data) return loading ? <Skeleton className="h-96 rounded-2xl" /> : <p className="text-sm text-stop-300">{error}</p>;
  if (!data.length)
    return (
      <EmptyState icon={Inbox} title="No messages yet">
        Messages from the contact page show up here.
      </EmptyState>
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-bone-400">
          <span className="font-semibold text-bone-50">{data.length}</span> {data.length === 1 ? "message" : "messages"}
        </p>
        <CsvButton
          onClick={() =>
            downloadCsv("messages", data, [
              ["When", (m) => isoTime(m.created_at)],
              ["Topic", (m) => m.topic],
              ["Name", (m) => m.name],
              ["Email", (m) => m.email],
              ["Message", (m) => m.message],
            ])
          }
        />
      </div>
      {data.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }} className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sand-300/10 px-2.5 py-0.5 text-xs text-sand-200 capitalize ring-1 ring-sand-300/25 ring-inset">{m.topic}</span>
              <span className="text-sm font-semibold text-bone-50">{m.name}</span>
              <a href={`mailto:${m.email}`} className="text-sm text-bone-400 hover:text-brand-300">
                {m.email}
              </a>
            </div>
            <span className="text-xs text-bone-500">{ago(m.created_at)}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-bone-200">{m.message}</p>
        </motion.div>
      ))}
    </div>
  );
}
