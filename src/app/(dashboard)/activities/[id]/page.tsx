import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ActivityForm } from "@/components/dashboard/ActivityForm";
import { publishActivity, unpublishActivity } from "../../actions";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { _count: { select: { sessions: true } } },
  });

  if (!activity) notFound();

  const boundPublish = publishActivity.bind(null, id);
  const boundUnpublish = unpublishActivity.bind(null, id);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors mb-2 block">
            ← Activities
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl text-foreground">{activity.name}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                activity.published
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {activity.published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            {activity._count.sessions} session{activity._count.sessions !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href={`/activities/${id}/sessions`}
            className="border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-muted transition-colors"
          >
            Sessions
          </Link>
          <form action={activity.published ? boundUnpublish : boundPublish}>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activity.published
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {activity.published ? "Unpublish" : "Publish"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
        {/* Edit form */}
        <div className="bg-surface border border-border rounded-xl p-8">
          <h2 className="text-xl text-foreground mb-6">Edit Activity</h2>
          <ActivityForm activity={activity} />
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Current Settings</h3>
            <dl className="space-y-3 text-sm">
              {[
                ["Subject", activity.subjectTag],
                ["Rigor", activity.rigor.replace("_", " ").toLowerCase()],
                ["Tone", activity.coachTone.replace("_", " ").toLowerCase()],
                ["Coach", activity.coachName],
                ["Turns", String(activity.turnLimit)],
                ["Timer", activity.timerMinutes ? `${activity.timerMinutes} min` : "Off"],
                ["Attempts", activity.attemptsAllowed >= 1000 ? "Unlimited" : String(activity.attemptsAllowed)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-foreground font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
