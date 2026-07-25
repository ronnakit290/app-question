"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ChatMessage, QuizState, StreamEvent } from "../lib/types";
import { randomId } from "../lib/uuid";

const CLIENT_ID_KEY = "chat:clientId";

let clientIdCache: string | null = null;

/** Stable per-browser id, so two people sharing a name still render correctly. */
function ensureClientId(): string {
  if (clientIdCache) return clientIdCache;
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      clientIdCache = existing;
      return existing;
    }
    const id = randomId();
    localStorage.setItem(CLIENT_ID_KEY, id);
    clientIdCache = id;
    return id;
  } catch {
    clientIdCache = randomId();
    return clientIdCache;
  }
}

const noopSubscribe = () => () => {};

function useClientId() {
  return useSyncExternalStore(
    noopSubscribe,
    ensureClientId,
    () => "",
  );
}

export type ChatStatus = "connecting" | "online" | "offline";

export function useChat(name: string) {
  const clientId = useClientId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  const upsert = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id)
        ? prev
        : [...prev, incoming].sort((a, b) => a.createdAt - b.createdAt),
    );
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    fetch("/api/messages")
      .then((r) => r.json())
      .then((data: { messages?: ChatMessage[] }) => {
        if (cancelled) return;
        for (const m of data.messages ?? []) upsert(m);
      })
      .catch(() => {});

    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data: { state?: QuizState }) => {
        if (!cancelled && data.state) setQuiz(data.state);
      })
      .catch(() => {});

    const source = new EventSource(
      `/api/stream?clientId=${encodeURIComponent(clientId)}&name=${encodeURIComponent(name)}`,
    );

    source.onopen = () => setStatus("online");
    source.onerror = () => setStatus("offline");
    source.onmessage = (e) => {
      setStatus("online");
      const event = JSON.parse(e.data) as StreamEvent;
      if (event.type === "message") upsert(event.message);
      else if (event.type === "presence") setUsers(event.users);
      else if (event.type === "quiz") setQuiz(event.state);
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [clientId, name, upsert]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !clientId) return;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name, text: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message: ChatMessage };
        upsert(data.message);
      }
    },
    [clientId, name, upsert],
  );

  const quizAction = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { state?: QuizState; error?: string };
      if (data.state) setQuiz(data.state);
      if (!res.ok) throw new Error(data.error ?? "quiz action failed");
      return data;
    },
    [],
  );

  const answer = useCallback(
    (choice: number) => quizAction({ action: "answer", clientId, name, choice }),
    [quizAction, clientId, name],
  );

  return { messages, users, status, send, clientId, quiz, quizAction, answer };
}
