"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { QuizState } from "../lib/types";
import MathText from "./MathText";
import {
  Check,
  CircleCheck,
  CircleX,
  Crown,
  Flag,
  Lightbulb,
  Medal,
  SkipForward,
  Square,
  Timer,
  TimerOff,
  Zap,
} from "lucide-react";

/** สุ่มแบบมี seed — คนละ client ได้ลำดับต่างกัน แต่คงที่ตลอดข้อเดียวกัน */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): number[] {
  const order = items.map((_, i) => i);
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const subscribeTick = (onChange: () => void) => {
  const id = setInterval(onChange, 100);
  return () => clearInterval(id);
};
const noSubscribe = () => () => {};
const nowSnapshot = () => Math.floor(Date.now() / 100) * 100;
const serverSnapshot = () => 0;

/** เหลืออีกกี่ ms — อัปเดตทุก 100ms ผ่าน external store (ไม่ setState ใน effect) */
function useCountdown(endsAt: number | null) {
  const now = useSyncExternalStore(
    endsAt ? subscribeTick : noSubscribe,
    nowSnapshot,
    serverSnapshot,
  );
  if (!endsAt || !now) return 0;
  return Math.max(0, endsAt - now);
}

export default function QuizPanel({
  state,
  clientId,
  onAnswer,
  onSkip,
  onStop,
}: {
  state: QuizState;
  clientId: string;
  onAnswer: (choice: number) => void;
  onSkip: () => void;
  onStop: () => void;
}) {
  const left = useCountdown(state.endsAt);
  const q = state.question;


  const reveal = state.phase === "reveal";
  const prereveal = state.phase === "prereveal";
  const myChoice = state.answered[clientId];
  const locked = myChoice !== undefined || reveal || prereveal;
  const answeredCount = Object.keys(state.answered).length;
  const waiting = Math.max(0, state.expected - answeredCount);
  const votes = (q?.choices ?? []).map(
    (_, i) => state.results.filter((r) => r.choice === i).length,
  );

  const fun = state.fun;
  const seed = hash(`${clientId}:${q?.id ?? ""}`);

  /** ลำดับที่จะแสดง (index จริงของตัวเลือก) */
  const order = useMemo(() => {
    const n = q?.choices.length ?? 0;
    const base = Array.from({ length: n }, (_, i) => i);
    return fun.shuffleChoices ? seededShuffle(base, seed) : base;
  }, [q?.choices.length, fun.shuffleChoices, seed]);

  /** ข้อนี้พลิกกระจกไหม — สุ่มจาก seed ของข้อ (ทุกคนเห็นเหมือนกัน) */
  const mirrored = fun.mirrorMode && hash(q?.id ?? "") % 3 === 0;

  /** ตัวเลือกหดลงตามเวลาที่เหลือ */
  const shrink =
    fun.shrinkChoices && state.phase === "asking" && state.durationMs
      ? Math.max(0.62, 0.62 + 0.38 * (left / state.durationMs))
      : 1;

  if (state.phase === "idle") return null;

  if (state.phase === "done") {

    return (
      <div className="elevated gilded chat-scroll max-h-[52dvh] shrink-0 animate-[fadeUp_.24s_ease-out] overflow-y-auto rounded-2xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1 flex items-center gap-1.5">
              <Flag size={11} strokeWidth={2} />
              Final Standings
            </div>
            <div className="display text-lg font-semibold text-[var(--ink)]">
              {state.title}
            </div>
          </div>
          <button
            onClick={onStop}
            className="field rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            ปิด
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {state.scores.length === 0 && (
            <div className="text-sm text-[var(--muted)]">ไม่มีใครตอบเลย 😅</div>
          )}
          {state.scores.map((s, i) => (
            <div
              key={s.clientId}
              className={[
                "flex items-center gap-3 rounded-xl px-4 py-2.5",
                i === 0
                  ? "bg-[var(--gold-soft)] ring-1 ring-[rgba(176,141,79,0.25)]"
                  : "glass-soft",
              ].join(" ")}
            >
              <span className="flex w-7 justify-center">
                {i === 0 ? (
                  <Crown size={16} strokeWidth={2} className="text-[var(--gold)]" />
                ) : i < 3 ? (
                  <Medal size={16} strokeWidth={2} className="text-[var(--muted)]" />
                ) : (
                  <span className="text-xs text-[var(--faint)]">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">
                {s.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">
                {s.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pct = state.durationMs
    ? Math.max(0, Math.min(100, (left / state.durationMs) * 100))
    : 100;

  return (
    <div className="elevated chat-scroll max-h-[52dvh] shrink-0 animate-[fadeUp_.24s_ease-out] overflow-x-hidden overflow-y-auto rounded-2xl">
      {/* progress bar */}
      <div className="sticky top-0 z-10 h-[3px] w-full bg-black/[0.05]">
        <div
          className={[
            "h-full transition-[width] duration-100 ease-linear",
            reveal
              ? "bg-[var(--good)]"
              : prereveal
                ? "bg-[var(--gold)]"
                : left < 5000
                  ? "bg-[var(--bad)]"
                  : "bg-[var(--accent)]",
          ].join(" ")}
          style={{ width: state.endsAt ? `${pct}%` : "100%" }}
        />
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-[11px] font-medium tabular-nums text-[var(--ink)]">
            {state.index + 1} / {state.total}
          </span>
          {state.doubled && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--gold)]">
              <Zap size={11} strokeWidth={2.5} />
              x2
            </span>
          )}
          {mirrored && (
            <span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
              กระจก
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
            {prereveal
              ? `ทุกคนตอบครบแล้ว · เฉลยใน ${Math.ceil(left / 1000)}s`
              : reveal
                ? state.endsAt
                  ? `เฉลย · ข้อถัดไปใน ${Math.ceil(left / 1000)}s`
                  : "เฉลย"
                : state.expected > 0
                  ? `ตอบแล้ว ${answeredCount}/${state.expected}${waiting ? ` · รออีก ${waiting} คน` : ""}`
                  : state.title}
          </span>
          {state.endsAt && !prereveal && !reveal && (
            <span
              className={[
                "text-sm font-semibold tabular-nums",
                left < 5000 ? "text-[var(--bad)]" : "text-[var(--ink)]",
              ].join(" ")}
            >
              <Timer size={13} strokeWidth={2} className="mr-1 inline-block align-[-2px]" />
              {Math.ceil(left / 1000)}s
            </span>
          )}
          <button
            onClick={onSkip}
            className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-black/[0.035] hover:text-[var(--ink)]"
            aria-label="ข้ามข้อนี้"
          >
            <SkipForward size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={onStop}
            className="rounded-full p-1.5 text-[var(--faint)] transition hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
            aria-label="หยุดควิซ"
          >
            <Square size={14} strokeWidth={1.75} />
          </button>
        </div>

        <p
          key={`${q?.id}-q`}
          className={[
            "display mb-5 text-[17px] leading-relaxed font-medium text-[var(--ink)]",
            fun.blurQuestion && state.phase === "asking" ? "q-deblur" : "",
            mirrored ? "mirrored" : "",
          ].join(" ")}
        >
          <MathText>{q?.text ?? ""}</MathText>
        </p>

        <div
          className="grid gap-2 transition-all duration-200 sm:grid-cols-2"
          style={shrink < 1 ? { fontSize: `${shrink * 100}%` } : undefined}
        >
          {order.map((i, slot) => {
            const c = q?.choices[i] ?? "";
            const isMine = myChoice === i;
            const isAnswer = reveal && state.answer === i;
            const isWrongMine = reveal && isMine && state.answer !== i;
            return (
              <button
                key={i}
                disabled={locked}
                onClick={() => onAnswer(i)}
                className={[
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition duration-200",
                  isAnswer
                    ? "border-transparent bg-[var(--good)] text-white"
                    : isWrongMine
                      ? "border-transparent bg-[var(--bad)] text-white"
                      : isMine
                        ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "border-[var(--line-strong)] bg-white text-[var(--ink)] hover:border-[rgba(17,17,17,0.28)] hover:bg-[var(--surface-2)]",
                  locked && !isMine && !isAnswer ? "opacity-55" : "",
                  fun.floatingChoices && state.phase === "asking" && !locked
                    ? "choice-float"
                    : "",
                ].join(" ")}
                style={
                  fun.floatingChoices
                    ? ({
                        "--fx": `${((seed >> (slot * 3)) % 22) - 11}px`,
                        "--fy": `${((seed >> (slot * 5)) % 16) - 8}px`,
                        "--fr": `${((seed >> (slot * 7)) % 7) - 3}deg`,
                        "--fd": `${3.2 + (slot % 4) * 0.7}s`,
                        "--fdelay": `${(slot % 5) * 0.25}s`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    isAnswer || isWrongMine || isMine
                      ? "bg-white/25 text-white"
                      : "bg-black/[0.06] text-[var(--ink)]",
                  ].join(" ")}
                >
                  {LETTERS[slot]}
                </span>
                <span
                  className={`min-w-0 flex-1 ${mirrored ? "mirrored" : ""}`}
                >
                  <MathText>{c}</MathText>
                </span>
                {reveal && votes[i] > 0 && (
                  <span className="shrink-0 rounded-lg bg-black/10 px-1.5 py-0.5 text-[11px] font-semibold">
                    {votes[i]}
                  </span>
                )}
                {isAnswer && <Check size={15} strokeWidth={2.5} className="shrink-0" />}
              </button>
            );
          })}
        </div>

        {reveal && state.explain && (
          <div className="mt-4 rounded-xl border-l-2 border-[var(--good)] bg-[var(--good-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--good)]">
            <span className="flex gap-2">
              <Lightbulb size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>
                <MathText>{state.explain}</MathText>
              </span>
            </span>
          </div>
        )}

        {reveal && state.results.length > 0 && (
          <div className="mt-4">
            <div className="eyebrow mb-2">Answers</div>
            <div className="flex flex-col gap-1.5">
              {state.results.map((r) => (
                <div
                  key={r.clientId}
                  className={[
                    "flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm",
                    r.correct
                      ? "bg-[var(--good-soft)] text-[var(--good)]"
                      : r.choice === null
                        ? "bg-black/[0.025] text-[var(--muted)]"
                        : "bg-[var(--bad-soft)] text-[var(--bad)]",
                  ].join(" ")}
                >
                  <span className="flex w-5 justify-center">
                    {r.correct ? (
                      <CircleCheck size={15} strokeWidth={2} />
                    ) : r.choice === null ? (
                      <TimerOff size={15} strokeWidth={2} />
                    ) : (
                      <CircleX size={15} strokeWidth={2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.name}
                    {r.clientId === clientId && (
                      <span className="ml-1 text-[11px] opacity-60">(คุณ)</span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-lg bg-black/5 px-2 py-0.5 text-[11px] font-semibold">
                    {r.choice === null ? "—" : LETTERS[r.choice]}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                    {r.gained > 0 ? `+${r.gained}` : "+0"}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--ink)]">
                    {r.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!reveal && myChoice !== undefined && (
          <div className="mt-4 text-center text-xs text-[var(--muted)] pulse-soft">
            {prereveal
              ? `ทุกคนตอบครบแล้ว — เฉลยใน ${Math.ceil(left / 1000)} วินาที`
              : waiting > 0
                ? `ล็อกคำตอบแล้ว · รออีก ${waiting} คน`
                : "ล็อกคำตอบแล้ว รอเพื่อนๆ อีกนิด…"}
          </div>
        )}

      </div>
    </div>
  );
}
