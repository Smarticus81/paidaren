import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ActivitySessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        include: { report: { select: { id: true } } },
      },
    },
  });

  if (!activity) notFound();

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <Link href={`/activities/${id}`} className="text-sm text-muted hover:text-foreground transition-colors mb-2 block">
            ← Back to activity
          </Link>
          <h1 className="text-3xl text-foreground">Sessions</h1>
          <p className="text-sm text-muted mt-1">{activity.name}</p>
        </div>
      </div>

      {activity.sessions.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <p className="text-muted">No sessions yet. Students will appear here after they launch the activity.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">Turns</th>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">End Reason</th>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-muted font-medium text-xs uppercase tracking-wider">Report</th>
              </tr>
            </thead>
            <tbody>
              {activity.sessions.map((s: any) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                  <td className="px-6 py-3.5 text-foreground font-medium">
                    {s.studentName ?? "—"}
                    {s.isTest && <span className="ml-2 text-xs text-accent bg-accent-light px-1.5 py-0.5 rounded">test</span>}
                  </td>
                  <td className="px-6 py-3.5 text-muted">{s.turnCount} / {activity.turnLimit}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        s.completedAt
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {s.completedAt ? "Complete" : "In Progress"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-muted text-xs">{s.endReason?.replace("_", " ").toLowerCase() ?? "—"}</td>
                  <td className="px-6 py-3.5 text-muted text-xs">{s.createdAt.toLocaleDateString()}</td>
                  <td className="px-6 py-3.5">
                    {s.report ? (
                      <Link href={`/sessions/${s.id}`} className="text-accent hover:underline font-medium text-xs">
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
