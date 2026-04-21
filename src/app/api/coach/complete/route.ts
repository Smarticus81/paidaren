import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSessionReport } from "@/lib/report-generator";
import { logError, logEvent } from "@/lib/telemetry";

const CompleteSchema = z.object({
  sessionId: z.string(),
  endReason: z.enum(["TURN_LIMIT", "TIMER", "STUDENT_ENDED", "DISCONNECTED"]),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = await req.json();
  const { sessionId, endReason } = CompleteSchema.parse(body);

  const session = await prisma.coachSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (session.completedAt) {
    const report = await prisma.sessionReport.findUnique({ where: { sessionId } });
    return NextResponse.json({ already: true, reportReady: !!report });
  }

  await prisma.coachSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date(), endReason },
  });

  try {
    const report = await generateSessionReport(sessionId);
    await logEvent({
      kind: "coach.session.completed",
      severity: "INFO",
      path: "/api/coach/complete",
      durationMs: Date.now() - startedAt,
      metadata: {
        sessionId,
        endReason,
        turnCount: session.turnCount,
        isTest: session.isTest,
      },
    });
    return NextResponse.json({ reportReady: true, reportId: report.id });
  } catch (err) {
    await logError("coach.session.report_failed", err, {
      path: "/api/coach/complete",
      metadata: { sessionId, endReason },
    });
    throw err;
  }
}
