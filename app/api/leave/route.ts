import { disconnectClient } from "@/app/lib/bus";
import { syncExpected } from "@/app/lib/quiz";

export const dynamic = "force-dynamic";

/** ตัดการเชื่อมต่อของผู้ใช้ทันทีเมื่อกด Leave (ไม่ต้องรอ SSE timeout) */
export async function POST(request: Request) {
  let clientId = "";
  try {
    const body = (await request.json()) as { clientId?: unknown };
    if (typeof body.clientId === "string") clientId = body.clientId.slice(0, 64);
  } catch {}

  if (!clientId)
    return Response.json({ error: "clientId required" }, { status: 400 });

  const removed = disconnectClient(clientId);
  // ควิซไม่ต้องรอคนที่ออกไปแล้ว
  syncExpected();

  return Response.json({ ok: true, removed });
}
