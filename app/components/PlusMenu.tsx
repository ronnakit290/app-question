"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

type Item = {
  key: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
};

export default function PlusMenu({
  items,
  onSelect,
}: {
  items: Item[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      {open && (
        <div className="elevated gilded absolute bottom-full left-0 z-40 mb-3 w-64 origin-bottom-left animate-[popIn_.14s_ease-out] overflow-hidden rounded-2xl p-1.5">
          {items.map((item) => (
            <button
              key={item.key}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                onSelect(item.key);
              }}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:opacity-40",
                item.danger
                  ? "text-[var(--bad)] hover:bg-[var(--bad-soft)]"
                  : "text-[var(--ink)] hover:bg-black/[0.035]",
              ].join(" ")}
            >
              <span
                className={
                  item.danger ? "text-[var(--bad)]" : "text-[var(--muted)]"
                }
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{item.label}</span>
                {item.hint && (
                  <span className="block truncate text-[11px] text-[var(--muted)]">
                    {item.hint}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label="เมนูเพิ่มเติม"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full transition duration-200",
          open
            ? "rotate-45 bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-md)]"
            : "field text-[var(--muted)] hover:text-[var(--ink)]",
        ].join(" ")}
      >
        <Plus size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}
