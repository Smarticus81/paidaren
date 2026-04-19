import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const SOCRATES_MODEL = "claude-sonnet-4-5";

export async function* streamClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}) {
  const stream = anthropic.messages.stream({
    model: SOCRATES_MODEL,
    max_tokens: params.maxTokens ?? 400,
    system: params.system,
    messages: params.messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

export async function generateStructuredAnalysis(params: {
  system: string;
  user: string;
}) {
  const response = await anthropic.messages.create({
    model: SOCRATES_MODEL,
    max_tokens: 1500,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response shape");
  return block.text;
}
