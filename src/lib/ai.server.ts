import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Streams a Responses call through Lovable AI Gateway and returns the final text. */
export async function generate(instructions: string, prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured.", 500);
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    messages: [{ role: "user", content: prompt }],
    maxRetries: 0,
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await Promise.resolve(result.text).catch((e: unknown) => {
    streamError ??= e;
    return "";
  });
  if (streamError) {
    const status = (streamError as { statusCode?: number }).statusCode ?? 500;
    const msg =
      status === 429
        ? "Too many requests right now. Please wait a minute and try again."
        : status === 402
          ? "AI credits are used up for this workspace. Add credits to continue."
          : status === 403
            ? "AI access is currently blocked for this workspace."
            : "The AI service had a problem. Please try again.";
    console.error("AI error", streamError);
    throw new AiError(msg, status);
  }
  if (!text.trim()) throw new AiError("The AI returned an empty response. Try rephrasing your input.", 500);
  return text;
}
