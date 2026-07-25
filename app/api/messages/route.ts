import { publish } from "@/app/lib/bus";
import { insertMessage, listMessages } from "@/app/lib/db";

export const dynamic = "force-dynamic";

const MAX_LEN = 2000;

export async function GET() {
  return Response.json({ messages: listMessages(100) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { clientId, name, text } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof clientId !== "string" ||
    typeof name !== "string" ||
    typeof text !== "string"
  ) {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }

  const trimmed = text.trim();
  const trimmedName = name.trim().slice(0, 32);
  if (!trimmed || !trimmedName) {
    return Response.json({ error: "empty message or name" }, { status: 400 });
  }
  if (trimmed.length > MAX_LEN) {
    return Response.json({ error: "message too long" }, { status: 413 });
  }

  const message = insertMessage({
    clientId,
    name: trimmedName,
    text: trimmed,
  });
  publish({ type: "message", message });

  return Response.json({ message }, { status: 201 });
}
