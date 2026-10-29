# Crisa

A ChatGPT-style chat app built with Next.js, the Vercel AI SDK and Google's Gemini API (free tier).

Features: streaming responses, markdown and code rendering, stop and regenerate buttons, new chat.

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your real API key inside
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com choose **Add New Project** and import the repo.
3. Under **Environment Variables** add `GOOGLE_GENERATIVE_AI_API_KEY`.
4. Click **Deploy**.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Free key from aistudio.google.com |
| `MODEL_ID` | No | Model to use (default `gemini-2.5-flash`) |
| `SYSTEM_PROMPT` | No | Custom system prompt |

## Switching provider

Install another provider package (for example `@ai-sdk/anthropic`), then change the import and model line in `app/api/chat/route.ts`.

## Before making it public

Anyone who can open your site can spend your API credits. Add login and rate limiting (for example Auth.js or Clerk, plus Upstash Ratelimit) before sharing the link widely, and set a spending limit in your provider dashboard.
