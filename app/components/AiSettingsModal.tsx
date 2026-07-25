"use client";

import { useEffect, useState } from "react";
import Modal, { Field, inputClass } from "./Modal";
import { Eye, EyeOff } from "lucide-react";
import type { AiProvider, AiSettingsPublic } from "../lib/types";

type ProviderInfo = Record<
  AiProvider,
  { label: string; baseUrl: string; models: string[] }
>;

export default function AiSettingsModal({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<ProviderInfo | null>(null);
  const [s, setS] = useState<AiSettingsPublic | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d: { settings: AiSettingsPublic; providers: ProviderInfo }) => {
        setS(d.settings);
        setProviders(d.providers);
      })
      .catch(() => setError("โหลดการตั้งค่าไม่สำเร็จ"));
  }, []);

  const patch = (p: Partial<AiSettingsPublic>) =>
    setS((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async () => {
    if (!s) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        provider: s.provider,
        baseUrl: s.baseUrl,
        model: s.model,
        secondsPerQuestion: s.secondsPerQuestion,
        choicesPerQuestion: s.choicesPerQuestion,
        revealDelayMs: s.revealDelayMs,
        autoNext: s.autoNext,
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "บันทึกไม่สำเร็จ");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="ตั้งค่า AI"
      subtitle="เลือกผู้ให้บริการ โมเดล และจังหวะการเล่นควิซ"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="field flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={!s || saving}
            className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-30"
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      }
    >
      {!s || !providers ? (
        <div className="py-10 text-center text-sm text-[var(--faint)]">กำลังโหลด…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {error && (
            <div className="rounded-xl bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
              {error}
            </div>
          )}

          <Field label="ผู้ให้บริการ">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(providers) as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() =>
                    patch({
                      provider: p,
                      baseUrl: providers[p].baseUrl,
                      model: providers[p].models[0],
                    })
                  }
                  className={[
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    s.provider === p
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "field text-[var(--muted)] hover:text-[var(--ink)]",
                  ].join(" ")}
                >
                  {providers[p].label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="โมเดล" hint="เลือกจากรายการหรือพิมพ์ชื่อโมเดลเองก็ได้">
            <input
              list="model-options"
              value={s.model}
              onChange={(e) => patch({ model: e.target.value })}
              className={inputClass}
              placeholder="เช่น gpt-4o-mini"
            />
            <datalist id="model-options">
              {providers[s.provider].models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>

          <Field
            label="API Key"
            hint={
              s.hasKey
                ? "มีคีย์บันทึกไว้แล้ว — เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน"
                : "คีย์ถูกเก็บฝั่งเซิร์ฟเวอร์ (sqlite) และไม่ถูกส่งกลับมาที่เบราว์เซอร์"
            }
          >
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={s.hasKey ? "••••••••••••••••" : "sk-…"}
                autoComplete="off"
                className={inputClass}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="field flex w-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                {showKey ? (
                  <EyeOff size={15} strokeWidth={1.75} />
                ) : (
                  <Eye size={15} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </Field>

          <Field label="Base URL" hint="เปลี่ยนได้ถ้าใช้ proxy, Ollama หรือ endpoint ส่วนตัว">
            <input
              value={s.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เวลาต่อข้อ (วินาที)" hint="0 = ไม่จับเวลา รอจนทุกคนตอบครบ">
              <input
                type="number"
                min={0}
                max={600}
                value={s.secondsPerQuestion}
                onChange={(e) =>
                  patch({ secondsPerQuestion: Number(e.target.value) })
                }
                className={inputClass}
              />
            </Field>
            <Field
              label="ดีเลย์ (วินาที)"
              hint="ใช้ทั้งช่วงหน่วงก่อนเฉลย และเวลาที่แสดงเฉลยก่อนเปลี่ยนข้อ"
            >
              <input
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={s.revealDelayMs / 1000}
                onChange={(e) =>
                  patch({ revealDelayMs: Math.round(Number(e.target.value) * 1000) })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="จำนวนตัวเลือกต่อข้อ"
            hint="ใช้ตอน Generate คำถามชุดใหม่ ชุดที่สร้างไว้แล้วไม่เปลี่ยนตาม"
          >
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => patch({ choicesPerQuestion: n })}
                  className={[
                    "rounded-xl py-2.5 text-sm font-medium transition",
                    s.choicesPerQuestion === n
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "field text-[var(--muted)] hover:text-[var(--ink)]",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <button
            onClick={() => patch({ autoNext: !s.autoNext })}
            className="field flex items-center justify-between rounded-xl px-4 py-3 text-left transition"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--ink)]">
                เปลี่ยนข้อใหม่อัตโนมัติ
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                เฉลยแล้วรอครบดีเลย์ จะไปข้อถัดไปเอง (ปิด = กด &quot;ข้าม&quot; เอง)
              </span>
            </span>
            <span
              className={[
                "ml-3 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                s.autoNext ? "bg-[var(--accent)]" : "bg-black/[0.12]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-5 w-5 rounded-full bg-white shadow transition",
                  s.autoNext ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </span>
          </button>
        </div>
      )}
    </Modal>
  );
}
