import { generateQuestions } from "@/app/lib/ai";
import { getAiSettings, getApiKey, insertQuestionSet } from "@/app/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const count = Math.min(50, Math.max(1, Math.round(Number(body.count) || 5)));

  if (!prompt) return Response.json({ error: "กรุณาใส่ prompt" }, { status: 400 });

  const settings = getAiSettings();
  const apiKey = getApiKey();
  if (!apiKey)
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า API Key — เปิดเมนู + → ตั้งค่า AI" },
      { status: 400 },
    );
  if (!settings.model)
    return Response.json({ error: "ยังไม่ได้เลือกโมเดล" }, { status: 400 });

  try {
    const { title, questions } = await generateQuestions({
      settings,
      apiKey,
      prompt,
      count,
      signal: request.signal,
    });
    const saved = insertQuestionSet({ title, prompt, questions });
    return Response.json({ set: saved.set }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
