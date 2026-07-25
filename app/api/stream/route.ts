import { currentPresence, subscribe } from "@/app/lib/bus";
import type { StreamEvent } from "@/app/lib/types";
import { syncExpected } from "@/app/lib/quiz";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.slice(0, 64);
  const name = url.searchParams.get("name")?.trim().slice(0, 32);

  if (!clientId || !name) {
    return Response.json({ error: "clientId and name required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (event: StreamEvent) =>
        write(`data: ${JSON.stringify(event)}\n\n`);

      write(": connected\n\n");
      send(currentPresence());

      let unsubscribe: (() => void) | null = null;
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
        // คนออกจากห้องแล้ว ควิซไม่ต้องรอคนนี้ตอบ
        syncExpected();
        try {
          controller.close();
        } catch {}
      };

      unsubscribe = subscribe({ clientId, name, send, close: cleanup });

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
