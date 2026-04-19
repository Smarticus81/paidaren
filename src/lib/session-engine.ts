import { prisma } from "./db";
import type { CoachSession, Activity } from "@/generated/prisma/client";

const MINIMUM_TURNS_FOR_ATTEMPT = 3;

export async function canStudentStartSession(params: {
  activityId: string;
  studentLtiSub: string;
}): Promise<{ allowed: boolean; reason?: string; attemptsUsed: number; attemptsAllowed: number }> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: params.activityId },
  });

  const attemptsUsed = await prisma.coachSession.count({
    where: {
      activityId: params.activityId,
      studentLtiSub: params.studentLtiSub,
      countsAsAttempt: true,
    },
  });

  if (attemptsUsed >= activity.attemptsAllowed) {
    return {
      allowed: false,
      reason: "You have completed all available attempts for this activity.",
      attemptsUsed,
      attemptsAllowed: activity.attemptsAllowed,
    };
  }

  return { allowed: true, attemptsUsed, attemptsAllowed: activity.attemptsAllowed };
}

export async function resumableSession(params: {
  activityId: string;
  studentLtiSub: string;
}): Promise<CoachSession | null> {
  return prisma.coachSession.findFirst({
    where: {
      activityId: params.activityId,
      studentLtiSub: params.studentLtiSub,
      completedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function shouldEndSession(params: {
  session: CoachSession;
  activity: Activity;
}): { end: boolean; reason?: "TURN_LIMIT" | "TIMER" } {
  if (params.session.turnCount >= params.activity.turnLimit) {
    return { end: true, reason: "TURN_LIMIT" };
  }
  if (params.activity.timerMinutes && params.session.startedAt) {
    const elapsedMs = Date.now() - params.session.startedAt.getTime();
    const limitMs = params.activity.timerMinutes * 60 * 1000;
    if (elapsedMs >= limitMs) {
      return { end: true, reason: "TIMER" };
    }
  }
  return { end: false };
}

export async function promoteToAttemptIfEligible(sessionId: string) {
  const session = await prisma.coachSession.findUniqueOrThrow({ where: { id: sessionId } });
  if (!session.countsAsAttempt && session.turnCount >= MINIMUM_TURNS_FOR_ATTEMPT) {
    await prisma.coachSession.update({
      where: { id: sessionId },
      data: { countsAsAttempt: true },
    });
  }
}
