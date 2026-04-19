import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CoachChat } from "@/components/coach/CoachChat";

export default async function CoachPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const session = await prisma.coachSession.findUnique({
    where: { id: sessionId },
    include: { activity: true, report: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <CoachChat
        sessionId={session.id}
        activityName={session.activity.name}
        assignmentText={session.activity.assignmentText}
        briefContext={session.activity.briefContext}
        coachName={session.activity.coachName}
        studentName={session.studentName}
        turnLimit={session.activity.turnLimit}
        timerMinutes={session.activity.timerMinutes}
        initialTurnCount={session.turnCount}
        initialMessages={session.messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content }))}
        startedAt={session.startedAt?.toISOString() ?? null}
        alreadyCompleted={!!session.completedAt}
        reportReady={!!session.report}
      />
    </div>
  );
}
