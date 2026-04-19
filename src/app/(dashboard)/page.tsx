import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { email: true } }, _count: { select: { sessions: true } } },
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Your Activities</h1>
          <p className="text-muted text-sm">
            Coaching sessions you&apos;ve configured for students.
          </p>
        </div>
        <Link
          href="/activities/new"
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New Activity
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-light mx-auto mb-4 flex items-center justify-center">
            <span className="text-accent text-lg">+</span>
          </div>
          <p className="text-foreground font-medium mb-2">No activities yet</p>
          <p className="text-muted text-sm mb-6">
            Create your first Socratic coaching activity to get started.
          </p>
          <Link
            href="/activities/new"
            className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Activity
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a: any) => (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="group block bg-surface border border-border rounded-xl p-6 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg text-foreground truncate">{a.name}</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${
                        a.published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {a.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-3 line-clamp-1">{a.briefContext}</p>
                  <div className="flex gap-5 text-xs text-muted">
                    <span className="px-2 py-0.5 bg-background rounded">{a.subjectTag}</span>
                    <span>{a.rigor.replace("_", " ").toLowerCase()}</span>
                    <span>{a.turnLimit} turns</span>
                    <span>{a.attemptsAllowed >= 1000 ? "∞" : a.attemptsAllowed} attempt{a.attemptsAllowed !== 1 ? "s" : ""}</span>
                    <span>{a._count.sessions} session{a._count.sessions !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="text-xs text-muted ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
