"use client";

import { Crown, Flame, Medal, TrendingUp } from "lucide-react";
import type { QuizState } from "../lib/types";

const RING = [
  "ring-[rgba(176,141,79,0.45)]",
  "ring-[rgba(17,17,17,0.18)]",
  "ring-[rgba(17,17,17,0.12)]",
];

export default function Scoreboard({
  state,
  clientId,
}: {
  state: QuizState;
  clientId: string;
}) {
  const answeredNow = new Set(Object.keys(state.answered));
  const live = state.phase === "asking" || state.phase === "prereveal";
  const gains = new Map(state.results.map((r) => [r.clientId, r.gained]));

  if (state.scores.length === 0 && !live) return null;

  return (
    <div className="glass flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-1.5 text-[var(--muted)]">
        <TrendingUp size={14} strokeWidth={1.75} />
        <span className="eyebrow">Live</span>
      </div>

      <div className="chat-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pt-1.5 pb-0.5">
        {state.scores.length === 0 ? (
          <span className="text-xs text-[var(--faint)]">ยังไม่มีใครทำคะแนน</span>
        ) : (
          state.scores.map((s, i) => {
            const me = s.clientId === clientId;
            const gained = gains.get(s.clientId) ?? 0;
            return (
              <div
                key={s.clientId}
                className={[
                  "relative flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-all duration-300",
                  i < 3 ? `ring-1 ${RING[i]}` : "ring-1 ring-transparent",
                  i === 0 ? "bg-[var(--gold-soft)]" : "bg-black/[0.035]",
                  me ? "font-semibold" : "font-medium",
                ].join(" ")}
              >
                {i === 0 ? (
                  <Crown size={13} strokeWidth={2} className="text-[var(--gold)]" />
                ) : i < 3 ? (
                  <Medal size={13} strokeWidth={2} className="text-[var(--muted)]" />
                ) : (
                  <span className="w-3 text-center text-[10px] text-[var(--faint)]">
                    {i + 1}
                  </span>
                )}

                <span className="max-w-28 truncate text-[var(--ink)]">
                  {s.name}
                  {me && (
                    <span className="ml-1 text-[10px] text-[var(--faint)]">
                      (คุณ)
                    </span>
                  )}
                </span>

                <span className="tabular-nums text-[var(--ink)]">
                  {s.score.toLocaleString()}
                </span>

                {s.streak > 1 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[var(--gold)]">
                    <Flame size={11} strokeWidth={2} />
                    {s.streak}
                  </span>
                )}

                {/* จุดบอกว่าตอบข้อปัจจุบันแล้วหรือยัง */}
                {live && (
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      answeredNow.has(s.clientId)
                        ? "bg-[var(--good)]"
                        : "pulse-soft bg-[var(--faint)]",
                    ].join(" ")}
                  />
                )}

                {state.phase === "reveal" && gained > 0 && (
                  <span className="absolute -top-2 right-2 animate-[fadeUp_.35s_ease-out] rounded-full bg-[var(--good)] px-1.5 text-[10px] font-semibold text-white">
                    +{gained}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
