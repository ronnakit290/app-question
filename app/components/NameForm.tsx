"use client";

import { useState } from "react";

type Props = {
  initialValue?: string;
  title?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
};

export default function NameForm({
  initialValue = "",
  title = "ยินดีต้อนรับ",
  submitLabel = "เริ่มแชท",
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const disabled = value.trim().length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit(value);
      }}
      className="elevated gilded dialog-in w-full max-w-md rounded-2xl p-8"
    >
      <div className="display mb-1.5 text-2xl font-semibold text-[var(--ink)]">
        {title}
      </div>
      <p className="mb-6 text-sm text-[var(--muted)]">
        กรอกชื่อของคุณ ระบบจะจำไว้ใช้ทุกครั้งจนกว่าคุณจะเปลี่ยนเอง
      </p>

      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        ชื่อของคุณ
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="เช่น Ronnakit"
        maxLength={32}
        className="field w-full rounded-xl px-4 py-3 text-[var(--ink)] placeholder:text-[var(--faint)] outline-none"
      />

      <div className="mt-6 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="field flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
