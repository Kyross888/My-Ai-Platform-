"use client";

import { useChat } from "@ai-sdk/react";
import type { FileUIPart, UIMessage } from "ai";
import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Explain something in simple words",
  "Help me write a message",
  "Give me ideas for a project",
  "Teach me how to code",
];

const STORAGE_KEY = "crisa-chats-v1";
const MUSIC_KEY = "crisa-music-url-v1";
const MAX_IMAGES = 4;

type StoredChat = {
  id: string;
  title: string;
  messages: UIMessage[];
};

type Attachment = {
  id: string;
  name: string;
  mediaType: string;
  url: string;
};

function newId() {
  return crypto.randomUUID();
}

function msgText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function hasFile(m: UIMessage) {
  return m.parts.some((p) => p.type === "file");
}

function titleFrom(messages: UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const text = first ? msgText(first) : "";
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return first && hasFile(first) ? "Image" : "New chat";
  return clean.length > 40 ? clean.slice(0, 40) + "…" : clean;
}

/* Shrink an image in the browser so uploads stay small */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* Remove pictures from saved chats if the browser storage gets full */
function stripFiles(chats: StoredChat[]): StoredChat[] {
  return chats.map((c) => ({
    ...c,
    messages: c.messages.map((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.type === "file"
          ? { type: "text", text: "[image removed to save space]" }
          : p
      ) as UIMessage["parts"],
    })),
  }));
}

/* ---------- Crisa logo (the pink "C") ---------- */
function Logo({ size = 28 }: { size?: number }) {
  const gid = "cg" + useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label="Crisa logo"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7ac0" />
          <stop offset="1" stopColor="#ff2d92" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`}>
        <path d="M64 22 H178 L150 62 Q144 70 134 70 H98 Q84 70 84 84 V162 L22 126 V62 Q22 52 31 45 L52 29 Q57 22 64 22 Z" />
        <path d="M103 130 H136 Q146 130 152 138 L178 178 H96 V137 Q96 130 103 130 Z" />
      </g>
    </svg>
  );
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
const NewChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const ChatBubbleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);
const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const WaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
  </svg>
);
const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5-9 9" />
  </svg>
);
const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
const MusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const PrevIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="2.5" height="14" rx="1" />
    <path d="M19 5.5v13a1 1 0 0 1-1.6.8l-9-6.5a1 1 0 0 1 0-1.6l9-6.5a1 1 0 0 1 1.6.8Z" />
  </svg>
);
const NextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
    <path d="M5 5.5v13a1 1 0 0 0 1.6.8l9-6.5a1 1 0 0 0 0-1.6l-9-6.5A1 1 0 0 0 5 5.5Z" />
  </svg>
);

const railBtn =
  "flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition hover:bg-pink-500/15 hover:text-pink-300";

/* ---------- YouTube / YouTube Music player ---------- */
type MusicSource = { type: "video" | "playlist"; id: string };

function parseYouTube(input: string): MusicSource | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return { type: "video", id: s };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
    return null;
  }

  const list = url.searchParams.get("list");
  let v = url.searchParams.get("v");
  if (host === "youtu.be") v = url.pathname.slice(1).split("/")[0];
  else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
    v = url.pathname.split("/")[2];
  }

  if (list && (!v || /^(PL|OLAK|UU|FL)/.test(list))) {
    return { type: "playlist", id: list };
  }
  if (v && /^[\w-]{11}$/.test(v)) return { type: "video", id: v };
  return null;
}

function useYouTubeMusic(enabled: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const pendingRef = useRef<MusicSource | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasTrack, setHasTrack] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [volume, setVolumeState] = useState(70);
  const volumeRef = useRef(70);

  function loadSource(src: MusicSource) {
    const p = playerRef.current;
    if (!p) return;
    if (src.type === "video") p.loadVideoById(src.id);
    else p.loadPlaylist({ list: src.id, listType: "playlist", index: 0 });
  }

  // Load the YouTube IFrame API script once
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.YT && w.YT.Player) {
      setApiReady(true);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      setApiReady(true);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // Create the hidden player once the API and host element exist
  useEffect(() => {
    if (!apiReady || !enabled || !hostRef.current || playerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const el = document.createElement("div");
    hostRef.current.appendChild(el);

    playerRef.current = new w.YT.Player(el, {
      height: "200",
      width: "200",
      playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
      events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onReady: (e: any) => {
          e.target.setVolume(volumeRef.current);
          setPlayerReady(true);
          if (pendingRef.current) {
            loadSource(pendingRef.current);
            pendingRef.current = null;
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (e: any) => {
          const s = e.data; // 1 playing, 2 paused, 3 buffering, 5 cued, 0 ended
          setPlaying(s === 1 || s === 3);
          if (s === 1 || s === 3 || s === 5) {
            const t = e.target.getVideoData?.()?.title;
            if (t) setTitle(t);
          }
          if (s === 1) setError("");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (e: any) => {
          setPlaying(false);
          if (e.data === 101 || e.data === 150) {
            setError("This track can't be played outside YouTube. Try another link.");
          } else if (e.data === 100) {
            setError("Video not found or private.");
          } else {
            setError("Couldn't play that link.");
          }
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, enabled]);

  function play(input: string) {
    const src = parseYouTube(input);
    if (!src) {
      setError("Paste a valid YouTube or YouTube Music link.");
      return;
    }
    setError("");
    setHasTrack(true);
    setTitle("Loading…");
    if (playerReady) loadSource(src);
    else pendingRef.current = src;
  }

  function toggle() {
    const p = playerRef.current;
    if (!p || !hasTrack) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  function next() {
    playerRef.current?.nextVideo?.();
  }

  function prev() {
    const p = playerRef.current;
    if (!p) return;
    // restart the song if it's a few seconds in, otherwise go to previous
    if ((p.getCurrentTime?.() ?? 0) > 3) p.seekTo(0, true);
    else p.previousVideo?.();
  }

  function setVolume(v: number) {
    volumeRef.current = v;
    setVolumeState(v);
    playerRef.current?.setVolume?.(v);
  }

  return {
    hostRef,
    playing,
    hasTrack,
    title,
    error,
    volume,
    play,
    toggle,
    next,
    prev,
    setVolume,
  };
}

type Music = ReturnType<typeof useYouTubeMusic>;

function Equalizer({ active }: { active: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm bg-pink-400 ${active ? "animate-pulse" : ""}`}
          style={{
            height: active ? `${55 + ((i * 25) % 45)}%` : "30%",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

function MusicPanel({ music }: { music: Music }) {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(MUSIC_KEY) ?? "";
    } catch {
      return "";
    }
  });

  function go() {
    if (!url.trim()) return;
    try {
      localStorage.setItem(MUSIC_KEY, url.trim());
    } catch {}
    music.play(url);
  }

  const ctrl =
    "flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-pink-500/15 hover:text-pink-300 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="border-t border-pink-500/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <MusicIcon /> Music
        </span>
        <Equalizer active={music.playing} />
      </div>

      <p className="mb-2 truncate text-sm text-pink-100">
        {music.hasTrack ? music.title : "Paste a YouTube Music link"}
      </p>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder="music.youtube.com/..."
          className="min-w-0 flex-1 rounded-lg border border-pink-500/30 bg-black px-2 py-1.5 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-pink-400"
        />
        <button
          onClick={go}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-600 px-3 text-xs font-semibold text-white"
        >
          Play
        </button>
      </div>

      {music.error && <p className="mt-2 text-xs text-red-400">{music.error}</p>}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={music.prev} disabled={!music.hasTrack} className={ctrl} title="Previous">
