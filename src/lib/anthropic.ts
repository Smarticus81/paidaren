import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const SOCRATES_MODEL = "claude-sonnet-4-5";

export async function* streamClaude(params: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}) {
  const stream = getClient().messages.stream({
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
  const response = await getClient().messages.create({
    model: SOCRATES_MODEL,
    max_tokens: 1500,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response shape");
  return block.text;
}
