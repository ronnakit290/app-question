"use client";

import { useEffect, useState } from "react";
import Modal, { Field, inputClass } from "./Modal";
import {
  Brain,
  Clapperboard,
  Code2,
  Dumbbell,
  FlaskConical,
  Landmark,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";
import type { AiSettingsPublic, QuestionSet } from "../lib/types";

const PRESETS = [
  { icon: Brain, label: "ความรู้รอบตัว", prompt: "คำถามความรู้รอบตัวทั่วไป ระดับกลาง สนุกๆ เล่นกับเพื่อน" },
  { icon: Code2, label: "เขียนโปรแกรม", prompt: "คำถามเกี่ยวกับ JavaScript/TypeScript และ React ระดับ intermediate" },
  { icon: Landmark, label: "ประวัติศาสตร์ไทย", prompt: "คำถามประวัติศาสตร์ไทยตั้งแต่สุโขทัยถึงรัตนโกสินทร์" },
  { icon: Clapperboard, label: "หนัง & ซีรีส์", prompt: "คำถามเกี่ยวกับภาพยนตร์และซีรีส์ยอดนิยม" },
  { icon: FlaskConical, label: "วิทยาศาสตร์", prompt: "คำถามวิทยาศาสตร์ระดับมัธยมปลาย ฟิสิกส์ เคมี ชีววิทยา" },
  { icon: Dumbbell, label: "กีฬา", prompt: "คำถามเกี่ยวกับกีฬาและนักกีฬาชื่อดังระดับโลก" },
];

export default function GenerateModal({
  onClose,
  onStart,
  onOpenSettings,
}: {
  onClose: () => void;
  onStart: (setId: string) => void;
  onOpenSettings: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null);

  const loadSets = () =>
    fetch("/api/question-sets")
      .then((r) => r.json())
      .then((d: { sets: QuestionSet[] }) => setSets(d.sets ?? []))
      .catch(() => {});

  useEffect(() => {
    void loadSets();
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d: { settings: AiSettingsPublic }) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  const generate = async (start: boolean) => {
    const p = prompt.trim();
    if (!p) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, count }),
      });
      const data = (await res.json()) as { set?: QuestionSet; error?: string };
      if (!res.ok || !data.set) throw new Error(data.error ?? "สร้างคำถามไม่สำเร็จ");
      await loadSets();
      if (start) {
        onStart(data.set.id);
        onClose();
      } else {
        setPrompt("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างคำถามไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/question-sets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    void loadSets();
  };

  return (
    <Modal
      title="Generate คำถาม"
      subtitle="บอก AI ว่าอยากได้คำถามแนวไหน ระบบจะสร้างครบทุกข้อแล้วเก็บไว้ก่อนเริ่มเล่น"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            onClick={() => generate(false)}
            disabled={busy || !prompt.trim()}
            className="glass-soft flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-black/[0.03] disabled:opacity-40"
          >
            สร้างเก็บไว้
          </button>
          <button
            onClick={() => generate(true)}
            disabled={busy || !prompt.trim()}
            className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
                กำลังสร้าง…
              </span>
            ) : (
              "สร้าง & เริ่มเล่น"
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-2xl bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
            {error}
            {error.includes("API Key") && (
              <button
                onClick={onOpenSettings}
                className="ml-2 font-semibold underline"
              >
                เปิดตั้งค่า
              </button>
            )}
          </div>
        )}

        <Field label="อยากได้คำถามแนวไหน">
          <textarea
            autoFocus
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="เช่น คำถามเกี่ยวกับระบบสุริยะ ระดับ ม.ต้น ภาษาไทย ให้มีตัวเลือกหลอกที่ใกล้เคียง"
            maxLength={1000}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPrompt(p.prompt)}
              className="field flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              <p.icon size={13} strokeWidth={1.75} />
              {p.label}
            </button>
          ))}
        </div>

        <Field
          label={`จำนวนข้อ — ${count} ข้อ`}
          hint={
            settings
              ? `ข้อละ ${settings.choicesPerQuestion} ตัวเลือก (แก้ได้ในเมนูตั้งค่า AI)`
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) =>
                setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
              }
              className={`${inputClass} w-20 text-center`}
            />
          </div>
        </Field>

        {sets.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              ชุดคำถามที่เก็บไว้
            </div>
            <div className="flex flex-col gap-2">
              {sets.map((s) => (
                <div
                  key={s.id}
                  className="glass-soft flex items-center gap-2 rounded-xl px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--ink)]">
                      {s.title}
                    </div>
                    <div className="truncate text-[11px] text-[var(--muted)]">
                      {s.count} ข้อ ·{" "}
                      {new Date(s.createdAt).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onStart(s.id);
                      onClose();
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-ink)] transition hover:opacity-90"
                  >
                    <Play size={12} strokeWidth={2} />
                    เล่น
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    aria-label="ลบ"
                    className="shrink-0 rounded-full p-1.5 text-[var(--faint)] transition hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
