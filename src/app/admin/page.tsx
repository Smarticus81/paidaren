import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers24h,
    totalActivities,
    publishedActivities,
    totalSessions,
    sessionsLast24h,
    sessionsLast7d,
    completedSessions,
    errorsLast24h,
    recentEvents,
    eventKindCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeenAt: { gte: dayAgo } } }),
    prisma.activity.count(),
    prisma.activity.count({ where: { published: true } }),
    prisma.coachSession.count({ where: { isTest: false } }),
    prisma.coachSession.count({ where: { isTest: false, createdAt: { gte: dayAgo } } }),
    prisma.coachSession.count({ where: { isTest: false, createdAt: { gte: weekAgo } } }),
    prisma.coachSession.count({ where: { isTest: false, completedAt: { not: null } } }),
    prisma.telemetryEvent.count({ where: { severity: "ERROR", createdAt: { gte: dayAgo } } }),
    prisma.telemetryEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        kind: true,
        severity: true,
        message: true,
        userEmail: true,
        createdAt: true,
      },
    }),
    prisma.telemetryEvent.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: weekAgo } },
      _count: { _all: true },
      orderBy: { _count: { kind: "desc" } },
      take: 8,
    }),
  ]);

  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Observability</h1>
          <p className="text-muted text-sm">
            Platform health, telemetry, and usage at a glance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Users" value={totalUsers} sub={`${activeUsers24h} active 24h`} />
        <StatCard label="Activities" value={totalActivities} sub={`${publishedActivities} published`} />
        <StatCard label="Sessions" value={totalSessions} sub={`${sessionsLast24h} in 24h · ${sessionsLast7d} in 7d`} />
        <StatCard label="Completion" value={`${completionRate}%`} sub={`${completedSessions} completed`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-8">
        <HealthCard
          label="Errors (24h)"
          value={errorsLast24h}
          tone={errorsLast24h === 0 ? "good" : errorsLast24h < 5 ? "warn" : "bad"}
          sub="severity=ERROR events"
        />
        <HealthCard
          label="Event Volume (7d)"
          value={eventKindCounts.reduce((acc, e) => acc + e._count._all, 0)}
          tone="neutral"
          sub={`${eventKindCounts.length} distinct kinds`}
        />
        <HealthCard
          label="Avg Turns / Session"
          value={completedSessions > 0 ? "—" : "—"}
          tone="neutral"
          sub="see Telemetry for detail"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-foreground font-serif">Recent events</h2>
            <Link href="/admin/telemetry" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-12 text-center">
              <p className="text-sm text-muted">No telemetry recorded yet.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {recentEvents.map((e) => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-4">
                  <SeverityDot severity={e.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-foreground font-mono">{e.kind}</code>
                      {e.userEmail && (
                        <span className="text-[10px] text-muted truncate">{e.userEmail}</span>
                      )}
                    </div>
                    {e.message && (
                      <p className="text-xs text-muted truncate mt-0.5">{e.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {relativeTime(e.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-foreground font-serif">Top event kinds (7d)</h2>
          </div>
          {eventKindCounts.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-6 text-center">
              <p className="text-sm text-muted">No events in the last 7 days.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
              {eventKindCounts.map((e) => {
                const max = eventKindCounts[0]._count._all;
                const pct = Math.round((e._count._all / max) * 100);
                return (
                  <div key={e.kind}>
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs text-foreground font-mono truncate">{e.kind}</code>
                      <span className="text-[10px] text-muted">{e._count._all}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-accent/30 transition-colors">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium mb-2">{label}</div>
      <div className="text-2xl font-semibold text-foreground font-serif">{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : tone === "bad"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-background text-foreground border-border";
  return (
    <div className={`border rounded-2xl p-4 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.15em] font-medium mb-2">{label}</div>
      <div className="text-2xl font-semibold font-serif">{value}</div>
      <div className="text-[10px] opacity-80 mt-0.5">{sub}</div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: "DEBUG" | "INFO" | "WARN" | "ERROR" }) {
  const color =
    severity === "ERROR"
      ? "bg-rose-500"
      : severity === "WARN"
        ? "bg-amber-500"
        : severity === "DEBUG"
          ? "bg-slate-400"
          : "bg-emerald-500";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} title={severity} />;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
