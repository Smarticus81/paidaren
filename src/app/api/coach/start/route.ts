import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/telemetry";

const StartSchema = z.object({ sessionId: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = StartSchema.parse(body);

  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { activity: true },
  });

  if (!session.startedAt) {
    await prisma.coachSession.update({
      where: { id: sessionId },
      data: { startedAt: new Date() },
    });
    await logEvent({
      kind: "coach.session.started",
      severity: "INFO",
      path: "/api/coach/start",
      metadata: {
        sessionId,
        activityId: session.activityId,
        isTest: session.isTest,
      },
    });
  }

  return NextResponse.json({
    sessionId,
    activityName: session.activity.name,
    assignmentText: session.activity.assignmentText,
    briefContext: session.activity.briefContext,
    coachName: session.activity.coachName,
    turnLimit: session.activity.turnLimit,
    timerMinutes: session.activity.timerMinutes,
    studentName: session.studentName,
  });
}
