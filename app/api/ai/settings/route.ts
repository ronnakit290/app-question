import { PROVIDERS } from "@/app/lib/ai";
import {
  getAiSettings,
  hasApiKey,
  saveAiSettings,
  saveApiKey,
} from "@/app/lib/db";
import type { AiProvider, AiSettings } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const isProvider = (v: unknown): v is AiProvider =>
  typeof v === "string" && v in PROVIDERS;

export async function GET() {
  return Response.json({
    settings: { ...getAiSettings(), hasKey: hasApiKey() },
    providers: PROVIDERS,
  });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Partial<AiSettings> = {};

  if (isProvider(body.provider)) patch.provider = body.provider;
  if (typeof body.baseUrl === "string") patch.baseUrl = body.baseUrl.trim();
  if (typeof body.model === "string") patch.model = body.model.trim();
  if (typeof body.secondsPerQuestion === "number")
    patch.secondsPerQuestion = Math.min(
      600,
      Math.max(0, Math.round(body.secondsPerQuestion)),
    );
  if (typeof body.revealDelayMs === "number")
    patch.revealDelayMs = Math.min(
      60_000,
      Math.max(0, Math.round(body.revealDelayMs)),
    );
  if (typeof body.autoNext === "boolean") patch.autoNext = body.autoNext;
  if (typeof body.choicesPerQuestion === "number")
    patch.choicesPerQuestion = Math.min(
      6,
      Math.max(2, Math.round(body.choicesPerQuestion)),
    );

  const settings = saveAiSettings(patch);

  // ส่ง apiKey เป็น "" เพื่อล้างคีย์ / ไม่ส่งเลย = ไม่แตะ
  if (typeof body.apiKey === "string") saveApiKey(body.apiKey.trim());

  return Response.json({ settings: { ...settings, hasKey: hasApiKey() } });
}
