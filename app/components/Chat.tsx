"use client";

import { useEffect, useRef, useState } from "react";
import NameForm from "./NameForm";
import PlusMenu from "./PlusMenu";
import Modal from "./Modal";
import AiSettingsModal from "./AiSettingsModal";
import GenerateModal from "./GenerateModal";
import QuizPanel from "./QuizPanel";
import { useChat } from "../hooks/useChat";
import { useViewportHeight } from "../hooks/useViewportHeight";
import Scoreboard from "./Scoreboard";
import MathText from "./MathText";
import { QUIZ_BOT_ID } from "../lib/quiz-shared";
import {
  Bot,
  Loader2,
  LogOut,
  SendHorizontal,
  Settings2,
  SkipForward,
  Sparkles,
  Square,
} from "lucide-react";

const time = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

const colorFor = (key: string) => {
  // โทนกลางๆ หรูๆ: กราไฟต์ · โทป · ทอง · เขียวเข้ม · เบอร์กันดี · น้ำเงินหมึก
  const palette = [
    "bg-[#2b2d33]",
    "bg-[#8a7a68]",
    "bg-[#b08d4f]",
    "bg-[#3f5a4c]",
    "bg-[#6d4a4a]",
    "bg-[#3b4a63]",
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
  onLeave,
}: {
  name: string;
  onChangeName: (name: string) => void;
  onLeave: () => void;
}) {
  const {
    messages,
    users,
    status,
    send,
    clientId,
    quiz,
    quizAction,
    answer,
    disconnect,
  } = useChat(name);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<null | "settings" | "generate">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leavingBusy, setLeavingBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useViewportHeight();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const run = (body: Record<string, unknown>) =>
    quizAction(body).catch((e: Error) => setToast(e.message));

  const quizRunning = quiz != null && quiz.phase !== "idle";

  // ตอบด้วยการพิมพ์ A/B/C/D หรือ 1/2/3/4 ในช่องแชทระหว่างเล่น
  const answerShortcut = (text: string): number | null => {
    if (!quiz || quiz.phase !== "asking" || !quiz.question) return null;
    const t = text.trim().toUpperCase();
    if (/^[A-F]$/.test(t)) return t.charCodeAt(0) - 65;
    if (/^[1-6]$/.test(t)) return Number(t) - 1;
    return null;
  };

  /** กด Leave = ตัดการเชื่อมต่อจริงก่อน แล้วค่อยกลับหน้ากรอกชื่อ */
  const leaveRoom = async () => {
    if (leavingBusy) return;
    setLeavingBusy(true);
    await disconnect();
    onLeave();
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const shortcut = answerShortcut(text);
    setDraft("");
    if (shortcut !== null && shortcut < (quiz?.question?.choices.length ?? 0)) {
      void answer(shortcut).catch((e: Error) => setToast(e.message));
      return;
    }
    void send(text);
  };

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3 sm:gap-4 sm:p-6"
      style={{ height: "var(--app-h, 100dvh)" }}
    >
      {/* Header */}
      <header className="glass gilded flex shrink-0 items-center gap-3.5 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${colorFor(
            clientId || name,
          )} text-base font-medium text-white`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-0.5">Quiz Room</div>
          <div className="display truncate text-[15px] font-semibold text-[var(--ink)]">
            ห้องแชทรวม
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "online"
                  ? "bg-[var(--good)]"
                  : status === "connecting"
                    ? "bg-[var(--gold)]"
                    : "bg-[var(--bad)]"
              }`}
            />
            <span className="truncate">
              {status === "online"
                ? `กำลังเชื่อมต่อ ${users.length} คน`
                : statusLabel[status]}
            </span>
          </div>
        </div>
        {/* คนที่กำลังเชื่อมต่ออยู่จริง */}
        {users.length > 0 && (
          <div className="hidden shrink-0 items-center sm:flex">
            {users.slice(0, 5).map((u, i) => (
              <span
                key={u.clientId}
                title={u.name}
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
                className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white ${colorFor(
                  u.clientId,
                )} text-[10px] font-medium text-white`}
              >
                {u.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {users.length > 5 && (
              <span
                style={{ marginLeft: -8 }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.06] text-[10px] font-medium text-[var(--muted)] ring-2 ring-white"
              >
                +{users.length - 5}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => setEditing(true)}
          className="field shrink-0 rounded-full px-3.5 py-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          {name}
        </button>

        <button
          onClick={() => setLeaving(true)}
          aria-label="ออกจากห้อง"
          title="ออกจากห้อง"
          className="field flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--faint)] transition hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </header>

      {/* Messages */}
      <div className="glass chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--faint)]">
            ยังไม่มีข้อความ เริ่มทักทายกันได้เลย
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const mine = m.clientId === clientId;
              const bot = m.clientId === QUIZ_BOT_ID;
              if (bot) {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="flex max-w-[88%] items-start gap-2.5 rounded-xl border border-[var(--line)] bg-white/70 px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--muted)]">
                      <Bot
                        size={14}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-[var(--gold)]"
                      />
                      <span>
                        <MathText>{m.text}</MathText>
                      </span>
                    </div>
                  </div>
                );
              }
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
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "rounded-br-sm bg-[var(--accent)] text-white"
                        : "glass-soft rounded-bl-sm text-[var(--ink)]",
                    ].join(" ")}
                  >
                    {showAuthor && (
                      <div className="mb-0.5 text-[11px] font-semibold text-[var(--muted)]">
                        {m.name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      <MathText>{m.text}</MathText>
                    </p>
                    <div
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-[var(--faint)]"
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

      {/* Scoreboard เรียลไทม์ */}
      {quiz && quiz.phase !== "idle" && (
        <div className="shrink-0">
          <Scoreboard state={quiz} clientId={clientId} />
        </div>
      )}

      {/* Quiz */}
      {quiz && quiz.phase !== "idle" && (
        <QuizPanel
          state={quiz}
          clientId={clientId}
          onAnswer={(c) => void answer(c).catch((e: Error) => setToast(e.message))}
          onSkip={() => void run({ action: "skip" })}
          onStop={() => void run({ action: "stop" })}
        />
      )}

      {/* Composer */}
      <div className="glass flex shrink-0 items-end gap-2 rounded-2xl p-2.5">
        <PlusMenu
          items={[
            {
              key: "generate",
              icon: <Sparkles size={17} strokeWidth={1.75} />,
              label: "Generate คำถาม",
              hint: "ให้ AI ออกข้อสอบแล้วเล่นด้วยกัน",
            },
            {
              key: "settings",
              icon: <Settings2 size={17} strokeWidth={1.75} />,
              label: "ตั้งค่า AI",
              hint: "โมเดล · API Key · เวลาต่อข้อ",
            },
            ...(quizRunning
              ? [
                  {
                    key: "skip",
                    icon: <SkipForward size={17} strokeWidth={1.75} />,
                    label: "ข้ามข้อนี้",
                  },
                  {
                    key: "stop",
                    icon: <Square size={17} strokeWidth={1.75} />,
                    label: "หยุดควิซ",
                    danger: true,
                  },
                ]
              : []),
          ]}
          onSelect={(key) => {
            if (key === "generate" || key === "settings") setModal(key);
            else void run({ action: key });
          }}
        />
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            // รอคีย์บอร์ดเด้งเสร็จก่อนค่อยเลื่อน
            setTimeout(
              () => bottomRef.current?.scrollIntoView({ block: "end" }),
              250,
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            quiz?.phase === "asking"
              ? "พิมพ์ A/B/C/D เพื่อตอบ หรือคุยต่อได้เลย…"
              : "พิมพ์ข้อความ…"
          }
          maxLength={2000}
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-[var(--ink)] placeholder:text-[var(--faint)] outline-none"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-25"
          aria-label="ส่ง"
        >
          <SendHorizontal size={17} strokeWidth={1.75} />
        </button>
      </div>

      {modal === "settings" && <AiSettingsModal onClose={() => setModal(null)} />}

      {modal === "generate" && (
        <GenerateModal
          onClose={() => setModal(null)}
          onStart={(setId) => void run({ action: "start", setId })}
          onOpenSettings={() => setModal("settings")}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 animate-[fadeUp_.2s_ease-out] rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] text-white shadow-[var(--shadow-lg)]">
          {toast}
        </div>
      )}

      {leaving && (
        <Modal
          title="ออกจากห้อง"
          subtitle="ระบบจะตัดการเชื่อมต่อออกจากห้องทันที คนอื่นจะเห็นว่าคุณออฟไลน์ แล้วพากลับไปหน้ากรอกชื่อ"
          onClose={() => setLeaving(false)}
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => setLeaving(false)}
                className="field flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                อยู่ต่อ
              </button>
              <button
                onClick={() => void leaveRoom()}
                disabled={leavingBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--bad)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {leavingBusy ? (
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" />
                ) : (
                  <LogOut size={15} strokeWidth={2} />
                )}
                ตัดการเชื่อมต่อ
              </button>
            </div>
          }
        >
          <div className="flex items-center gap-3 rounded-xl bg-black/[0.025] px-4 py-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ${colorFor(
                clientId || name,
              )} text-sm font-medium text-white`}
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-[var(--ink)]">
                {name}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                กำลังเชื่อมต่ออยู่ {users.length} คนในห้องนี้
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <div className="backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,21,26,0.32)] p-4 backdrop-blur-[3px]">
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
