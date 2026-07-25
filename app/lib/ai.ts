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

const systemPrompt = (choices: number) => `คุณคือผู้ออกข้อสอบปรนัย ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นหรือ markdown fence
รูปแบบ:
{"title":"ชื่อชุดคำถามสั้นๆ","questions":[{"text":"โจทย์","choices":[${Array.from(
  { length: choices },
  (_, i) => `"ตัวเลือก${i + 1}"`,
).join(",")}],"answer":0,"explain":"เหตุผลสั้นๆ ว่าทำไมข้อนี้ถูก"}]}
กติกา:
- แต่ละข้อมี ${choices} ตัวเลือกเสมอ และมีคำตอบถูกเพียงข้อเดียว
- "answer" คือ index (0-${choices - 1}) ของตัวเลือกที่ถูก และต้องกระจายตำแหน่งคำตอบให้หลากหลาย
- ตัวเลือกที่ผิดต้องดูสมเหตุสมผล ไม่ใช่ตัวเลือกหลอกที่ตัดทิ้งได้ทันที
- ห้ามถามซ้ำ ห้ามใส่เลขข้อไว้ใน "text"
- ใช้ภาษาเดียวกับที่ผู้ใช้ระบุในคำสั่ง ถ้าไม่ระบุให้ใช้ภาษาไทย

การเขียนสูตรคณิตศาสตร์/วิทยาศาสตร์ (ระบบเรนเดอร์ด้วย KaTeX):
- สูตรในบรรทัดให้คร่อมด้วย $...$ เช่น $x^2 + y^2 = r^2$, $\\frac{3}{4}$, $\\sqrt{2}$
- สูตรที่ต้องขึ้นบรรทัดใหม่ให้คร่อมด้วย $$...$$
- เศษส่วนใช้ \\frac{a}{b} ไม่ใช่ a/b · ยกกำลังใช้ ^ · ตัวห้อยใช้ _
- สูตรเคมีใช้ \\mathrm ครอบ เช่น $\\mathrm{H_2SO_4}$, $\\mathrm{CO_2}$
- หน่วยและตัวดำเนินการใช้สัญลักษณ์จริง เช่น $\\times$, $\\div$, $\\pm$, $\\approx$, $\\le$, $\\ge$, $\\pi$, $\\theta$, $\\Delta$, $^\\circ\\mathrm{C}$
- เขียน LaTeX ให้ถูกต้อง escape backslash ตามกติกาของ JSON (เช่น "\\\\frac{1}{2}")
- ถ้าไม่มีสูตรก็ไม่ต้องใส่ $ เลย`;

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
  system: string,
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
        system,
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
        systemInstruction: { parts: [{ text: system }] },
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
        { role: "system", content: system },
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
  const choices = Math.min(6, Math.max(2, opts.settings.choicesPerQuestion || 4));
  const userPrompt = `สร้างคำถามปรนัยจำนวน ${opts.count} ข้อ ข้อละ ${choices} ตัวเลือก ตามโจทย์นี้:\n\n${opts.prompt}`;

  const raw = await callModel(
    opts.settings,
    opts.apiKey,
    userPrompt,
    systemPrompt(choices),
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
      choices: choices.slice(0, choices.length),
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
