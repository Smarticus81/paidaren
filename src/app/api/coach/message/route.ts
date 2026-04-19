import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { streamClaude } from "@/lib/anthropic";
import { buildSocraticSystemPrompt } from "@/lib/socratic-prompt";
import { shouldEndSession, promoteToAttemptIfEligible } from "@/lib/session-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, content } = MessageSchema.parse(body);

  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { activity: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session.studentName) {
    return new Response(
      JSON.stringify({ error: "Student name must be set before dialogue begins" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (session.completedAt) {
    return new Response(JSON.stringify({ error: "Session already complete" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  await prisma.message.create({
    data: { sessionId, role: "user", content },
  });

  const updated = await prisma.coachSession.update({
    where: { id: sessionId },
    data: {
      turnCount: { increment: 1 },
      startedAt: session.startedAt ?? new Date(),
    },
    include: { activity: true },
  });

  await promoteToAttemptIfEligible(sessionId);

  const endCheck = shouldEndSession({ session: updated, activity: updated.activity });

  const systemPrompt = buildSocraticSystemPrompt({
    activity: updated.activity,
    turnCount: updated.turnCount,
    turnLimit: updated.activity.turnLimit,
    studentName: updated.studentName!,
  });

  const history = session.messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = "";
      try {
        for await (const token of streamClaude({ system: systemPrompt, messages: history })) {
          assistantContent += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }

        await prisma.message.create({
          data: { sessionId, role: "assistant", content: assistantContent },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              turnCount: updated.turnCount,
              sessionEnding: endCheck.end,
              endReason: endCheck.reason ?? null,
            })}\n\n`,
          ),
        );
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
