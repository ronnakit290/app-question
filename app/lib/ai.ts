import type { AiProvider, AiSettings } from "./types";

export const PROVIDERS: Record<
  AiProvider,
  { label: string; baseUrl: string; models: string[] }
> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
    ],
  },
  anthropic: {
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    models: [
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
      "claude-opus-4-1",
      "claude-3-5-haiku-latest",
    ],
  },
  google: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  },
};

export type GeneratedQuestion = {
  text: string;
  choices: string[];
  answer: number;
  explain: string;
};

const SYSTEM = `คุณคือผู้ออกข้อสอบปรนัย ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นหรือ markdown fence
รูปแบบ:
{"title":"ชื่อชุดคำถามสั้นๆ","questions":[{"text":"โจทย์","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"answer":0,"explain":"เหตุผลสั้นๆ ว่าทำไมข้อนี้ถูก"}]}
กติกา:
- แต่ละข้อมี 4 ตัวเลือกเสมอ และมีคำตอบถูกเพียงข้อเดียว
- "answer" คือ index (0-3) ของตัวเลือกที่ถูก และต้องกระจายตำแหน่งคำตอบให้หลากหลาย
- ห้ามถามซ้ำ ห้ามใส่เลขข้อไว้ใน "text"
- ใช้ภาษาเดียวกับที่ผู้ใช้ระบุในคำสั่ง ถ้าไม่ระบุให้ใช้ภาษาไทย`;

function stripFence(s: string): string {
  const t = s.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) return fence[1];
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

async function callModel(
  settings: AiSettings,
  apiKey: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const base = (settings.baseUrl || PROVIDERS[settings.provider].baseUrl).replace(
    /\/+$/,
    "",
  );

  if (settings.provider === "anthropic") {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return (data.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
  }

  if (settings.provider === "google") {
    const url = `${base}/v1beta/models/${encodeURIComponent(
      settings.model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
  }

  // openai / openrouter — OpenAI-compatible
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateQuestions(opts: {
  settings: AiSettings;
  apiKey: string;
  prompt: string;
  count: number;
  signal?: AbortSignal;
}): Promise<{ title: string; questions: GeneratedQuestion[] }> {
  const userPrompt = `สร้างคำถามปรนัยจำนวน ${opts.count} ข้อ ตามโจทย์นี้:\n\n${opts.prompt}`;

  const raw = await callModel(
    opts.settings,
    opts.apiKey,
    userPrompt,
    opts.signal,
  );

  let parsed: { title?: string; questions?: unknown };
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    throw new Error("โมเดลตอบกลับไม่ใช่ JSON ที่อ่านได้");
  }

  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: GeneratedQuestion[] = [];

  for (const item of list) {
    const q = item as Partial<GeneratedQuestion>;
    const choices = (Array.isArray(q.choices) ? q.choices : [])
      .map((c) => String(c).trim())
      .filter(Boolean);
    const text = typeof q.text === "string" ? q.text.trim() : "";
    const answer = Number(q.answer);
    if (!text || choices.length < 2) continue;
    questions.push({
      text,
      choices: choices.slice(0, 6),
      answer: Number.isInteger(answer) && answer >= 0 && answer < choices.length ? answer : 0,
      explain: typeof q.explain === "string" ? q.explain.trim() : "",
    });
  }

  if (questions.length === 0) throw new Error("โมเดลไม่ได้สร้างคำถามที่ใช้ได้เลย");

  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 80)
        : opts.prompt.slice(0, 40),
    questions: questions.slice(0, opts.count),
  };
}
