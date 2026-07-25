"use client";

import { useEffect, useRef, useState } from "react";
import NameForm from "./NameForm";

type Message = {
  id: string;
  author: "me" | "bot";
  text: string;
  at: number;
};

const time = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Chat({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (name: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      author: "bot",
      text: `สวัสดี ${name} 👋 พิมพ์ข้อความได้เลย`,
      at: Date.now(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), author: "me", text, at: Date.now() },
    ]);
    setDraft("");
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <header className="glass flex items-center gap-3 rounded-3xl px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/90 text-lg font-semibold text-white shadow-lg shadow-blue-700/25">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-blue-950">{name}</div>
          <div className="text-xs text-blue-900/60">กำลังออนไลน์</div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="glass-soft rounded-xl px-3 py-2 text-xs font-medium text-blue-900 transition hover:bg-white/75"
        >
          เปลี่ยนชื่อ
        </button>
      </header>

      {/* Messages */}
      <div className="glass chat-scroll flex-1 overflow-y-auto rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const mine = m.author === "me";
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    mine
                      ? "rounded-br-md bg-blue-600/90 text-white shadow-blue-700/20"
                      : "glass-soft rounded-bl-md text-blue-950",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <div
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-blue-900/50"
                    }`}
                  >
                    {time(m.at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
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
              send();
            }
          }}
          placeholder="พิมพ์ข้อความ…"
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-blue-950 placeholder:text-blue-900/40 outline-none"
        />
        <button
          onClick={send}
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
