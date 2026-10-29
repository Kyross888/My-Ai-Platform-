import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(process.env.MODEL_ID ?? "gemini-2.5-flash"),
    system:
      process.env.SYSTEM_PROMPT ??
      "You are Crisa, a friendly and helpful AI assistant. Keep answers clear and concise. Use markdown for formatting and code blocks.",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
