import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export const maxDuration = 60;

const SYSTEM = `You are Crisa, a smart, friendly and helpful AI assistant.

How to answer:
- Think carefully before answering. Give correct, specific and useful answers, not vague ones.
- Match the user's language and tone. Be warm and natural.
- Keep simple answers short. Go deeper only when the question needs it.
- For explanations, start with the direct answer, then give the reasoning or steps.
- For code, give complete working code in markdown code blocks and briefly explain it.
- For math or logic, work through it step by step and double-check the result.
- If a request is unclear, make a sensible assumption and say so, or ask one short question.
- If you don't know something or aren't sure, say so honestly. Never make things up.
- Use markdown (lists, bold, headings) only when it makes the answer easier to read.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(process.env.MODEL_ID ?? "gemini-3.5-flash"),
    system: process.env.SYSTEM_PROMPT ?? SYSTEM,
    messages: convertToModelMessages(messages),
    maxRetries: 0,
    onError({ error }) {
      console.error("Gemini error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    // Send the real error to the browser instead of hanging forever
    onError: (error) =>
      error instanceof Error ? error.message : "Unknown error",
  });
}
