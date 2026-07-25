import type { StreamEvent } from "./types";

type Subscriber = {
  clientId: string;
  name: string;
  send: (event: StreamEvent) => void;
  /** ปิด stream ฝั่งเซิร์ฟเวอร์ (ใส่โดย route ของ SSE) */
  close?: () => void;
};

// Single in-process pub/sub hub. Survives dev hot reloads.
const globalForBus = globalThis as unknown as {
  __chatSubscribers?: Set<Subscriber>;
};

const subscribers: Set<Subscriber> = (globalForBus.__chatSubscribers ??=
  new Set());

export function publish(event: StreamEvent) {
  for (const sub of subscribers) {
    try {
      sub.send(event);
    } catch {
      subscribers.delete(sub);
    }
  }
}

/** ผู้ที่กำลังเชื่อมต่ออยู่จริง (unique ตาม clientId) */
export function participants(): { clientId: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const s of subscribers) seen.set(s.clientId, s.name);
  return [...seen].map(([clientId, name]) => ({ clientId, name }));
}

function presence(): StreamEvent {
  return { type: "presence", users: participants() };
}

export function subscribe(sub: Subscriber): () => void {
  subscribers.add(sub);
  publish(presence());
  return () => {
    subscribers.delete(sub);
    publish(presence());
  };
}

/** ตัดสายของ clientId ทิ้งทันที (ใช้ตอนกด Leave) */
export function disconnectClient(clientId: string): number {
  let removed = 0;
  for (const sub of [...subscribers]) {
    if (sub.clientId !== clientId) continue;
    subscribers.delete(sub);
    removed++;
    try {
      sub.close?.();
    } catch {}
  }
  if (removed) publish(presence());
  return removed;
}

export function currentPresence() {
  return presence();
}

