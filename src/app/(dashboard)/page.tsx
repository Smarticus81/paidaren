import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { email: true } },
      _count: { select: { sessions: true } },
    },
  });

  const recentSessions = await prisma.coachSession.findMany({
    where: { isTest: false },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      activity: { select: { name: true, coachName: true, turnLimit: true } },
    },
  });

  const allSessions = await prisma.coachSession.findMany({
    where: { isTest: false },
    select: { completedAt: true, turnCount: true, activity: { select: { turnLimit: true } } },
  });

  // Stats
  const totalActivities = activities.length;
  const publishedActivities = activities.filter((a) => a.published).length;
  const totalSessions = allSessions.length;
  const completedSessions = allSessions.filter((s) => s.completedAt).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const activeSessions = totalSessions - completedSessions;

  const avgTurns =
    totalSessions > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.turnCount, 0) / totalSessions)
      : 0;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Dashboard</h1>
          <p className="text-muted text-sm">
            Overview of your Socratic coaching activities and student engagement.
          </p>
        </div>
        <Link
          href="/activities/new"
          className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Activity
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Activities" value={totalActivities} sub={`${publishedActivities} published`} />
        <StatCard label="Total Sessions" value={totalSessions} sub={`${activeSessions} active`} />
        <StatCard label="Completion" value={`${completionRate}%`} sub={`${completedSessions} completed`} />
        <StatCard label="Avg Turns" value={avgTurns} sub="per session" />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Activities list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-foreground font-serif">Activities</h2>
            <span className="text-xs text-muted">{totalActivities} total</span>
          </div>

          {activities.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 mx-auto mb-4 flex items-center justify-center">
                <span className="text-accent text-lg">+</span>
              </div>
              <p className="text-foreground font-medium mb-2">No activities yet</p>
              <p className="text-muted text-sm mb-6">
                Create your first Socratic coaching activity to get started.
              </p>
              <Link
                href="/activities/new"
                className="bg-accent text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create Activity
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="group block bg-surface border border-border rounded-2xl p-5 hover:border-accent/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className="text-sm font-medium text-foreground truncate">{a.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            a.published
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}
                        >
                          {a.published ? "Live" : "Draft"}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-1 mb-2">{a.briefContext}</p>
                      <div className="flex gap-3 text-[10px] text-muted">
                        <span className="px-2 py-0.5 bg-background rounded-full">{a.subjectTag}</span>
                        <span>{a.rigor.replace("_", " ").toLowerCase()}</span>
                        <span>{a.turnLimit} turns</span>
                        <span>{a._count.sessions} session{a._count.sessions !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions sidebar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-foreground font-serif">Recent Sessions</h2>
          </div>

          {recentSessions.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center">
              <p className="text-sm text-muted">No student sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="group block bg-surface border border-border rounded-2xl p-4 hover:border-accent/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {s.studentName ?? "Unnamed"}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        s.completedAt
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}
                    >
                      {s.completedAt ? "Done" : "Active"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted truncate mb-1.5">{s.activity.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full"
                        style={{ width: `${Math.min((s.turnCount / s.activity.turnLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted">
                      {s.turnCount}/{s.activity.turnLimit}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
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
