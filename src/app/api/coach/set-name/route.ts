import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SetNameSchema = z.object({
  sessionId: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer")
    .transform((n) => n.replace(/[<>]/g, ""))
    .refine((n) => n.length > 0, "Name is required"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, name } = SetNameSchema.parse(body);

  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
  });

  if (session.studentName) {
    return NextResponse.json(
      { error: "Name already set for this session" },
      { status: 409 },
    );
  }

  await prisma.coachSession.update({
    where: { id: sessionId },
    data: { studentName: name },
  });

  return NextResponse.json({ ok: true, studentName: name });
}
