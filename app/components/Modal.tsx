"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

const EXIT_MS = 180;

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [nudging, setNudging] = useState(false);

  /** เล่นอนิเมชันออกก่อนค่อยถอด component ออกจริง */
  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    // ล็อกไม่ให้พื้นหลังเลื่อนตอนเปิดไดอะล็อก
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [requestClose]);

  return (
    <div
      // กด backdrop ไม่ปิด — แค่สะกิดให้รู้ว่าต้องกดปุ่มปิด
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setNudging(true);
      }}
      className={[
        "fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,21,26,0.32)] p-4 backdrop-blur-[3px]",
        closing ? "backdrop-out" : "backdrop-in",
      ].join(" ")}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={() => setNudging(false)}
        className={[
          "elevated gilded flex max-h-[88dvh] w-full max-w-lg flex-col rounded-2xl",
          closing ? "dialog-out" : nudging ? "dialog-nudge" : "dialog-in",
        ].join(" ")}
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="min-w-0 flex-1">
            <h2 className="display text-xl font-semibold text-[var(--ink)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={requestClose}
            aria-label="ปิด"
            className="field -mt-1 h-8 w-8 shrink-0 rounded-full text-[var(--muted)] transition hover:rotate-90 hover:text-[var(--ink)]"
          >
            <X size={15} strokeWidth={1.75} className="mx-auto" />
          </button>
        </div>

        <div className="chat-scroll flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && <div className="px-6 pb-6">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-[var(--faint)]">{hint}</span>
      )}
    </label>
  );
}

export const inputClass =
  "field w-full rounded-xl px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--faint)] outline-none";
