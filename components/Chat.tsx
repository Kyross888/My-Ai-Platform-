"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Explain something in simple words",
  "Help me write a message",
  "Give me ideas for a project",
  "Teach me how to code",
];

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, regenerate, setMessages, error } =
    useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b border-pink-500/20 px-4 py-3">
        <h1 className="crisa-logo text-2xl font-extrabold tracking-wide">
          Crisa
        </h1>
        <button
          onClick={() => setMessages([])}
          className="rounded-full border border-pink-500/60 px-4 py-1 text-sm text-pink-300 transition hover:bg-pink-500 hover:text-black"
        >
          New chat
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mt-16 text-center">
            <h2 className="crisa-logo text-5xl font-extrabold">Crisa</h2>
            <p className="mt-3 text-neutral-400">
              Your AI, Ask me anything.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-pink-500/30 bg-pink-500/5 px-4 py-3 text-left text-sm text-neutral-200 transition hover:border-pink-400 hover:bg-pink-500/15"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-pink-500 to-fuchsia-600 px-4 py-2 font-medium whitespace-pre-wrap text-white"
                  : "markdown max-w-full border-l-2 border-pink-500/60 pl-4"
              }
            >
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  m.role === "user" ? (
                    <span key={i}>{p.text}</span>
                  ) : (
                    <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                      {p.text}
                    </ReactMarkdown>
                  )
                ) : null
              )}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <div className="animate-pulse text-sm text-pink-400">Crisa is thinking…</div>
        )}
        {error && (
          <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
            Something went wrong. Check your API key and try again.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="px-4 pb-4">
        <div className="flex items-end gap-2 rounded-3xl border border-pink-500/40 bg-neutral-950 p-2 shadow-[0_0_24px_-8px_rgba(255,45,146,0.6)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={1}
            placeholder="Message Crisa..."
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 outline-none placeholder:text-neutral-500"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-full bg-neutral-200 px-4 py-2 text-sm font-semibold text-black"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
        {messages.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => regenerate()}
            className="mt-2 text-xs text-neutral-500 hover:text-pink-400"
          >
            Regenerate response
          </button>
        )}
      </form>
    </div>
  );
}
