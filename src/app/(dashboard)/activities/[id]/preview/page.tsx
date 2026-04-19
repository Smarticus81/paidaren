import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { StudentPreview } from "@/components/dashboard/StudentPreview";

export default async function ActivityPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) notFound();

  // Create a test session for the preview
  const coachSession = await prisma.coachSession.create({
    data: {
      activityId: activity.id,
      isTest: true,
      testerId: session.user.id,
      studentLtiSub: `preview-${session.user.id}-${Date.now()}`,
      startedAt: new Date(),
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Floating back bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/activities/${id}`}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              ← Back to editor
            </Link>
            <span className="text-border">|</span>
            <span className="text-xs font-medium text-accent bg-accent-light px-2.5 py-1 rounded-full">
              Student View Preview
            </span>
          </div>
          <span className="text-xs text-muted">{activity.name}</span>
        </div>
      </div>

      {/* The actual student experience */}
      <div className="pt-14">
        <StudentPreview
          sessionId={coachSession.id}
          activityName={activity.name}
          assignmentText={activity.assignmentText}
          briefContext={activity.briefContext}
          coachName={activity.coachName}
          turnLimit={activity.turnLimit}
          timerMinutes={activity.timerMinutes}
        />
      </div>
    </div>
  );
}
