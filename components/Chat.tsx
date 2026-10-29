"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Explain something in simple words",
  "Help me write a message",
  "Give me ideas for a project",
  "Teach me how to code",
];

const STORAGE_KEY = "crisa-chats-v1";

type StoredChat = {
  id: string;
  title: string;
  messages: UIMessage[];
};

function newId() {
  return crypto.randomUUID();
}

function titleFrom(messages: UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const text =
    first?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "New chat";
  return clean.length > 40 ? clean.slice(0, 40) + "…" : clean;
}

/* ---------- Icons ---------- */
const SidebarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);

/* ---------- Root: sidebar + active chat ---------- */
export default function Chat() {
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  // Load saved chats once on the client
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChats(JSON.parse(raw));
    } catch {}
    setActiveId(newId());
    setOpen(window.innerWidth >= 768);
    setReady(true);
  }, []);

  // Save whenever chats change
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {}
  }, [chats, ready]);

  function handleUpdate(id: string, messages: UIMessage[]) {
    if (messages.length === 0) return;
    setChats((prev) => {
      const title = titleFrom(messages);
      if (prev.some((c) => c.id === id)) {
        return prev.map((c) => (c.id === id ? { ...c, title, messages } : c));
      }
      return [{ id, title, messages }, ...prev];
    });
  }

  function startNew() {
    setActiveId(newId());
    if (window.innerWidth < 768) setOpen(false);
  }

  function selectChat(id: string) {
    setActiveId(id);
    if (window.innerWidth < 768) setOpen(false);
  }

  function deleteChat(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(newId());
  }

  if (!ready) return <div className="h-dvh" />;

  const activeChat = chats.find((c) => c.id === activeId);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden border-pink-500/20 bg-neutral-950 transition-[width] duration-300 md:relative ${
          open ? "w-64 border-r" : "w-0 border-r-0"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="crisa-logo px-1 text-xl font-extrabold">Crisa</span>
            <button
              onClick={() => setOpen(false)}
              title="Close sidebar"
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-pink-500/10 hover:text-pink-300"
            >
              <SidebarIcon />
            </button>
          </div>

          <div className="px-3">
            <button
              onClick={startNew}
              className="flex w-full items-center gap-2 rounded-xl border border-pink-500/40 px-3 py-2 text-sm text-pink-200 transition hover:bg-pink-500/15"
            >
              <PlusIcon /> New chat
            </button>
          </div>

          <div className="mt-4 px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Chats
          </div>

          <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
            {chats.length === 0 && (
              <p className="px-2 py-3 text-sm text-neutral-600">
                No chats yet. Start one!
              </p>
            )}
            {chats.map((c) => (
              <div
                key={c.id}
                onClick={() => selectChat(c.id)}
                className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  c.id === activeId
                    ? "bg-pink-500/15 text-pink-100"
                    : "text-neutral-300 hover:bg-pink-500/10"
                }`}
              >
                <span className="truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  title="Delete chat"
                  className="ml-2 shrink-0 text-neutral-500 opacity-100 transition hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="min-w-0 flex-1">
        <ChatPane
          key={activeId}
          chatId={activeId}
          initialMessages={activeChat?.messages ?? []}
          onUpdate={handleUpdate}
          onNew={startNew}
          sidebarOpen={open}
          onToggleSidebar={() => setOpen((o) => !o)}
        />
      </main>
    </div>
  );
}

/* ---------- One conversation ---------- */
function ChatPane({
  chatId,
  initialMessages,
  onUpdate,
  onNew,
  sidebarOpen,
  onToggleSidebar,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  onUpdate: (id: string, messages: UIMessage[]) => void;
  onNew: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: chatId,
    messages: initialMessages,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // Keep latest callback without retriggering the effect
  const updateRef = useRef(onUpdate);
  updateRef.current = onUpdate;

  useEffect(() => {
    updateRef.current(chatId, messages);
  }, [messages, chatId]);

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
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              title="Open sidebar"
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-pink-500/10 hover:text-pink-300"
            >
              <SidebarIcon />
            </button>
          )}
          <h1 className="crisa-logo text-2xl font-extrabold tracking-wide">
            Crisa
          </h1>
        </div>
        <button
          onClick={onNew}
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
              Your AI, in black and pink. Ask me anything.
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
