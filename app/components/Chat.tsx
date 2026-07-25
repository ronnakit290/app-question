"use client";

import { useEffect, useRef, useState } from "react";
import NameForm from "./NameForm";
import { useChat } from "../hooks/useChat";

const time = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

const colorFor = (key: string) => {
  const palette = [
    "bg-sky-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-teal-500",
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const statusLabel = {
  connecting: "กำลังเชื่อมต่อ…",
  online: "เชื่อมต่อแล้ว",
  offline: "ขาดการเชื่อมต่อ",
} as const;

export default function Chat({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (name: string) => void;
}) {
  const { messages, users, status, send, clientId } = useChat(name);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void send(text);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <header className="glass flex items-center gap-3 rounded-3xl px-5 py-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colorFor(
            clientId || name,
          )} text-lg font-semibold text-white shadow-lg shadow-blue-700/25`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-blue-950">
            ห้องแชทรวม
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-900/60">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "online"
                  ? "bg-emerald-500"
                  : status === "connecting"
                    ? "bg-amber-400"
                    : "bg-rose-500"
              }`}
            />
            <span className="truncate">
              {status === "online"
                ? `ออนไลน์ ${users.length} คน${users.length ? ` · ${users.join(", ")}` : ""}`
                : statusLabel[status]}
            </span>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="glass-soft shrink-0 rounded-xl px-3 py-2 text-xs font-medium text-blue-900 transition hover:bg-white/75"
        >
          {name} · เปลี่ยนชื่อ
        </button>
      </header>

      {/* Messages */}
      <div className="glass chat-scroll flex-1 overflow-y-auto rounded-3xl p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-blue-900/50">
            ยังไม่มีข้อความ เริ่มทักทายกันได้เลย
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const mine = m.clientId === clientId;
              const showAuthor =
                !mine && messages[i - 1]?.clientId !== m.clientId;
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine && (
                    <div
                      className={`mt-auto h-7 w-7 shrink-0 rounded-full ${
                        showAuthor ? colorFor(m.clientId) : "bg-transparent"
                      } flex items-center justify-center text-[11px] font-semibold text-white`}
                    >
                      {showAuthor ? m.name.charAt(0).toUpperCase() : ""}
                    </div>
                  )}
                  <div
                    className={[
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                      mine
                        ? "rounded-br-md bg-blue-600/90 text-white shadow-blue-700/20"
                        : "glass-soft rounded-bl-md text-blue-950",
                    ].join(" ")}
                  >
                    {showAuthor && (
                      <div className="mb-0.5 text-[11px] font-semibold text-blue-800/80">
                        {m.name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-blue-900/50"
                      }`}
                    >
                      {time(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="glass flex items-end gap-2 rounded-3xl p-3">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="พิมพ์ข้อความ…"
          maxLength={2000}
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-blue-950 placeholder:text-blue-900/40 outline-none"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="rounded-2xl bg-blue-600/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-600 disabled:opacity-40"
        >
          ส่ง
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/20 p-4 backdrop-blur-sm">
          <NameForm
            initialValue={name}
            title="เปลี่ยนชื่อ"
            submitLabel="บันทึก"
            onCancel={() => setEditing(false)}
            onSubmit={(v) => {
              onChangeName(v);
              setEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
