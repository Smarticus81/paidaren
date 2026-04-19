import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { streamClaude } from "@/lib/anthropic";
import { buildSocraticSystemPrompt } from "@/lib/socratic-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OpenSchema = z.object({ sessionId: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = OpenSchema.parse(body);

  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { activity: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session.studentName) {
    return new Response(
      JSON.stringify({ error: "Student name must be set before opening" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // If there are already messages, don't regenerate the opening
  if (session.messages.length > 0) {
    return new Response(
      JSON.stringify({ error: "Session already has messages" }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = buildSocraticSystemPrompt({
    activity: session.activity,
    turnCount: 0,
    turnLimit: session.activity.turnLimit,
    studentName: session.studentName,
  });

  // The coach initiates by posing a question based on the fact pattern
  const openingInstruction = [
    { role: "user" as const, content: "I'm ready to begin." },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = "";
      try {
        for await (const token of streamClaude({
          system: systemPrompt,
          messages: openingInstruction,
        })) {
          assistantContent += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }

        await prisma.message.create({
          data: { sessionId, role: "assistant", content: assistantContent },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
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
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
