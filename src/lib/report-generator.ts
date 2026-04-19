import { prisma } from "./db";
import { generateStructuredAnalysis } from "./anthropic";
import { ANALYSIS_SYSTEM_PROMPT } from "./socratic-prompt";
import { z } from "zod";

const AnalysisSchema = z.object({
  elementsAddressed: z.array(z.string()),
  elementsMissed: z.array(z.string()),
  depthReached: z.string(),
  reasoningQuality: z.string(),
  gapsFlagged: z.array(z.string()),
});

export async function generateSessionReport(sessionId: string) {
  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      activity: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  const transcript = session.messages
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "STUDENT" : "COACH"}: ${m.content}`)
    .join("\n\n");

  const userPrompt = `
ASSIGNMENT:
${session.activity.assignmentText}

COACH SCOPE (brief context):
${session.activity.briefContext}

TRANSCRIPT:
${transcript}

Produce the JSON analysis now.`;

  const raw = await generateStructuredAnalysis({
    system: ANALYSIS_SYSTEM_PROMPT,
    user: userPrompt,
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));

  return prisma.sessionReport.upsert({
    where: { sessionId },
    create: {
      sessionId,
      analysisJson: parsed,
      elementsAddressed: parsed.elementsAddressed,
      elementsMissed: parsed.elementsMissed,
      depthReached: parsed.depthReached,
      reasoningQuality: parsed.reasoningQuality,
      gapsFlagged: parsed.gapsFlagged,
    },
    update: {
      analysisJson: parsed,
      elementsAddressed: parsed.elementsAddressed,
      elementsMissed: parsed.elementsMissed,
      depthReached: parsed.depthReached,
      reasoningQuality: parsed.reasoningQuality,
      gapsFlagged: parsed.gapsFlagged,
    },
  });
}
