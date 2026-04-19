"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ActivitySchema = z.object({
  name: z.string().min(1).max(200),
  subjectTag: z.string().min(1).max(100),
  assignmentText: z.string().min(10),
  briefContext: z.string().min(1).max(500),
  rigor: z.enum(["INTRODUCTORY", "STANDARD", "RIGOROUS", "EXAM_LEVEL"]),
  focusInstructions: z.string().optional().nullable(),
  turnLimit: z.coerce.number().int().min(6).max(20),
  timerMinutes: z.coerce.number().int().optional().nullable(),
  attemptsAllowed: z.coerce.number().int().min(1).max(1000),
  coachName: z.string().min(1).max(100),
  coachTone: z.enum(["FORMAL", "CONVERSATIONAL", "EXAM_STYLE"]),
});

export async function publishActivity(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.activity.update({ where: { id }, data: { published: true } });
  revalidatePath(`/activities/${id}`);
}

export async function unpublishActivity(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await prisma.activity.update({ where: { id }, data: { published: false } });
  revalidatePath(`/activities/${id}`);
}

export async function saveDraftAndTest(
  existingActivityId: string | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ActivitySchema.parse({
    name: formData.get("name"),
    subjectTag: formData.get("subjectTag"),
    assignmentText: formData.get("assignmentText"),
    briefContext: formData.get("briefContext"),
    rigor: formData.get("rigor"),
    focusInstructions: formData.get("focusInstructions") || null,
    turnLimit: formData.get("turnLimit"),
    timerMinutes: formData.get("timerMinutes") || null,
    attemptsAllowed: formData.get("attemptsAllowed"),
    coachName: formData.get("coachName"),
    coachTone: formData.get("coachTone"),
  });

  let activityId: string;

  if (existingActivityId) {
    await prisma.activity.update({
      where: { id: existingActivityId },
      data: parsed,
    });
    activityId = existingActivityId;
  } else {
    const activity = await prisma.activity.create({
      data: { ...parsed, createdById: session.user.id },
    });
    activityId = activity.id;
  }

  const coachSession = await prisma.coachSession.create({
    data: {
      activityId,
      isTest: true,
      testerId: session.user.id,
      studentLtiSub: `test-${session.user.id}`,
      studentName: session.user.name ?? "Instructor",
      startedAt: new Date(),
    },
  });

  return {
    activityId,
    sessionId: coachSession.id,
    coachName: parsed.coachName,
    studentName: session.user.name ?? "Instructor",
  };
}

export async function finishActivity(
  activityId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = ActivitySchema.parse({
    name: formData.get("name"),
    subjectTag: formData.get("subjectTag"),
    assignmentText: formData.get("assignmentText"),
    briefContext: formData.get("briefContext"),
    rigor: formData.get("rigor"),
    focusInstructions: formData.get("focusInstructions") || null,
    turnLimit: formData.get("turnLimit"),
    timerMinutes: formData.get("timerMinutes") || null,
    attemptsAllowed: formData.get("attemptsAllowed"),
    coachName: formData.get("coachName"),
    coachTone: formData.get("coachTone"),
  });

  await prisma.activity.update({ where: { id: activityId }, data: parsed });
  revalidatePath("/");
  redirect(`/activities/${activityId}`);
}
