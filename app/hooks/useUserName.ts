"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "chat:userName";

let cached: string | null = null;
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    cached = localStorage.getItem(STORAGE_KEY);
  } catch {
    cached = null;
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      read();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  listeners.forEach((cb) => cb());
}

/** Persisted display name. `ready` is false during SSR / first paint. */
export function useUserName() {
  const name = useSyncExternalStore(
    subscribe,
    () => (cached === null ? read() : cached),
    () => null,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const saveName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    cached = trimmed;
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {}
    emit();
  }, []);

  const clearName = useCallback(() => {
    cached = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    emit();
  }, []);

  return { name, ready, saveName, clearName };
}
