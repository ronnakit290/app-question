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
      className="glass w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-1 text-2xl font-semibold tracking-tight text-blue-950">
        {title}
      </div>
      <p className="mb-6 text-sm text-blue-900/70">
        กรอกชื่อของคุณ ระบบจะจำไว้ใช้ทุกครั้งจนกว่าคุณจะเปลี่ยนเอง
      </p>

      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-blue-900/60">
        ชื่อของคุณ
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="เช่น Ronnakit"
        maxLength={32}
        className="glass-soft w-full rounded-2xl px-4 py-3 text-blue-950 placeholder:text-blue-900/40 outline-none transition focus:border-white focus:ring-2 focus:ring-blue-400/50"
      />

      <div className="mt-6 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="glass-soft flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-blue-900 transition hover:bg-white/70"
          >
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="flex-1 rounded-2xl bg-blue-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
