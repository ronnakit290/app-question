import { participants, publish } from "./bus";
import { getAiSettings, getQuestionSet, getQuestions, insertMessage } from "./db";
import type { AnswerResult, Question, QuizState, Score } from "./types";
import { QUIZ_BOT_ID, QUIZ_BOT_NAME } from "./quiz-shared";

export { QUIZ_BOT_ID, QUIZ_BOT_NAME };

type Engine = {
  setId: string | null;
  title: string;
  questions: Question[];
  index: number;
  phase: QuizState["phase"];
  endsAt: number | null;
  durationMs: number | null;
  answered: Map<string, number>;
  /** ชื่อ ณ เวลาที่ตอบ (คนที่ตอบแล้วอาจหลุดจาก presence ทีหลัง) */
  names: Map<string, string>;
  /** รายชื่อที่ต้องตอบในข้อนี้ (ล็อกตอนเริ่มข้อ) */
  expected: Map<string, string>;
  /** คะแนนที่ได้จากข้อปัจจุบัน */
  gains: Map<string, number>;
  firstCorrect: string | null;
  scores: Map<string, Score>;
  timer: ReturnType<typeof setTimeout> | null;
  /** เพิ่มทุกครั้งที่เปลี่ยนสถานะ เพื่อกัน timer เก่ายิงซ้อน */
  epoch: number;
};

const globalForQuiz = globalThis as unknown as { __quizEngine?: Engine };

const engine: Engine = (globalForQuiz.__quizEngine ??= {
  setId: null,
  title: "",
  questions: [],
  index: -1,
  phase: "idle",
  endsAt: null,
  durationMs: null,
  answered: new Map(),
  names: new Map(),
  expected: new Map(),
  gains: new Map(),
  firstCorrect: null,
  scores: new Map(),
  timer: null,
  epoch: 0,
});

function clearTimer() {
  if (engine.timer) clearTimeout(engine.timer);
  engine.timer = null;
}

/** ตั้งเวลาทำงานถัดไป พร้อมกันไม่ให้ timer รอบเก่ายิงซ้อน */
function schedule(ms: number, fn: () => void) {
  clearTimer();
  const epoch = engine.epoch;
  engine.timer = setTimeout(
    () => {
      if (engine.epoch !== epoch) return;
      fn();
    },
    Math.max(0, ms),
  );
}

function sortedScores(): Score[] {
  return [...engine.scores.values()].sort((a, b) => b.score - a.score);
}

function nameOf(clientId: string): string {
  return (
    engine.names.get(clientId) ??
    engine.expected.get(clientId) ??
    engine.scores.get(clientId)?.name ??
    "ผู้เล่น"
  );
}

/** ผลรายคนของข้อปัจจุบัน — เรียงคนตอบถูกขึ้นก่อน */
function results(): AnswerResult[] {
  const q = engine.questions[engine.index];
  if (!q) return [];
  const ids = new Set([...engine.expected.keys(), ...engine.answered.keys()]);
  return [...ids]
    .map((clientId) => {
      const choice = engine.answered.get(clientId);
      return {
        clientId,
        name: nameOf(clientId),
        choice: choice ?? null,
        correct: choice === q.answer,
        gained: engine.gains.get(clientId) ?? 0,
        total: engine.scores.get(clientId)?.score ?? 0,
      };
    })
    .sort((a, b) => b.gained - a.gained || a.name.localeCompare(b.name));
}

export function quizState(): QuizState {
  const q = engine.questions[engine.index];
  const reveal = engine.phase === "reveal";
  const live = engine.phase !== "idle" && engine.phase !== "done";
  return {
    phase: engine.phase,
    setId: engine.setId,
    title: engine.title,
    index: engine.index,
    total: engine.questions.length,
    question:
      q && live
        ? { id: q.id, index: q.index, text: q.text, choices: q.choices }
        : null,
    endsAt: engine.endsAt,
    durationMs: engine.durationMs,
    answer: reveal && q ? q.answer : null,
    explain: reveal && q ? q.explain : null,
    answered: Object.fromEntries(engine.answered),
    expected: engine.expected.size,
    firstCorrect: engine.firstCorrect,
    results: reveal ? results() : [],
    scores: sortedScores(),
  };
}

function broadcast() {
  publish({ type: "quiz", state: quizState() });
}

function say(text: string) {
  const message = insertMessage({
    clientId: QUIZ_BOT_ID,
    name: QUIZ_BOT_NAME,
    text,
  });
  publish({ type: "message", message });
}

const LETTER = (i: number) => String.fromCharCode(65 + i);

/* ------------------------------------------------------------------ */

export function startQuiz(setId: string): { ok: true } | { ok: false; error: string } {
  const set = getQuestionSet(setId);
  const questions = getQuestions(setId);
  if (!set || questions.length === 0) return { ok: false, error: "ไม่พบชุดคำถาม" };

  engine.epoch++;
  clearTimer();
  engine.setId = setId;
  engine.title = set.title;
  engine.questions = questions;
  engine.index = -1;
  engine.scores = new Map();
  engine.names = new Map();
  engine.firstCorrect = null;

  say(`เริ่มควิซ "${set.title}" · ทั้งหมด ${questions.length} ข้อ เตรียมตัวให้พร้อม`);
  nextQuestion();
  return { ok: true };
}

export function nextQuestion() {
  engine.epoch++;
  clearTimer();
  engine.index += 1;
  engine.answered = new Map();
  engine.gains = new Map();
  engine.firstCorrect = null;

  if (engine.index >= engine.questions.length) return finish();

  // ล็อกรายชื่อผู้เล่นของข้อนี้จาก presence ปัจจุบัน
  engine.expected = new Map(
    participants()
      .filter((p) => p.clientId !== QUIZ_BOT_ID)
      .map((p) => [p.clientId, p.name] as const),
  );
  for (const [id, n] of engine.expected) engine.names.set(id, n);

  const settings = getAiSettings();
  const q = engine.questions[engine.index];
  engine.phase = "asking";
  engine.durationMs =
    settings.secondsPerQuestion > 0 ? settings.secondsPerQuestion * 1000 : null;
  engine.endsAt = engine.durationMs ? Date.now() + engine.durationMs : null;

  say(`ข้อ ${engine.index + 1}/${engine.questions.length} — ${q.text}`);
  broadcast();

  if (engine.endsAt) schedule(engine.durationMs!, () => reveal("หมดเวลา"));
}

/** ทุกคนตอบครบแล้ว → หน่วงก่อนเฉลย */
function beginPrereveal() {
  engine.epoch++;
  clearTimer();
  const delay = getAiSettings().revealDelayMs;

  engine.phase = "prereveal";
  engine.durationMs = delay;
  engine.endsAt = Date.now() + delay;
  broadcast();

  schedule(delay, () => reveal("ทุกคนตอบครบแล้ว"));
}

/** บวกคะแนนของข้อปัจจุบันเข้าคะแนนรวม (เรียกครั้งเดียวตอนเฉลย) */
function commitScores(answer: number) {
  for (const clientId of new Set([
    ...engine.expected.keys(),
    ...engine.answered.keys(),
  ])) {
    const entry: Score = engine.scores.get(clientId) ?? {
      clientId,
      name: nameOf(clientId),
      score: 0,
      streak: 0,
    };
    const correct = engine.answered.get(clientId) === answer;
    if (correct) {
      entry.streak += 1;
      const gained =
        (engine.gains.get(clientId) ?? 0) +
        Math.min(200, (entry.streak - 1) * 50);
      entry.score += gained;
      engine.gains.set(clientId, gained);
    } else {
      entry.streak = 0;
      engine.gains.set(clientId, 0);
    }
    engine.scores.set(clientId, entry);
  }
}

function reveal(reason: string) {
  engine.epoch++;
  clearTimer();
  const q = engine.questions[engine.index];
  if (!q) return;

  commitScores(q.answer);

  const settings = getAiSettings();
  engine.phase = "reveal";
  engine.durationMs = settings.revealDelayMs;
  engine.endsAt = settings.autoNext ? Date.now() + settings.revealDelayMs : null;

  const rows = results();
  const summary = rows.length
    ? rows
        .map(
          (r) =>
            `${r.correct ? "ถูก" : r.choice === null ? "ไม่ทัน" : "ผิด"} · ${r.name} — ` +
            `${r.choice === null ? "ไม่ได้ตอบ" : LETTER(r.choice)}` +
            `${r.gained ? ` (+${r.gained})` : ""} · รวม ${r.total}`,
        )
        .join("\n")
    : "ยังไม่มีใครตอบ";

  say(
    `${reason} — เฉลยข้อ ${engine.index + 1}: ${LETTER(q.answer)}. ${q.choices[q.answer]}\n\n${summary}`,
  );
  broadcast();

  if (settings.autoNext) schedule(settings.revealDelayMs, () => nextQuestion());
}

function finish() {
  engine.epoch++;
  clearTimer();
  engine.phase = "done";
  engine.endsAt = null;
  engine.durationMs = null;

  const board = sortedScores();
  const lines = board.length
    ? board
        .slice(0, 10)
        .map((s, i) => `${i + 1}. ${s.name} — ${s.score.toLocaleString()} คะแนน`)
        .join("\n")
    : "ไม่มีใครทำคะแนนเลย";
  say(`จบควิซ "${engine.title}"\n\n${lines}`);
  broadcast();
}

export function stopQuiz() {
  if (engine.phase === "idle") return;
  engine.epoch++;
  clearTimer();
  const wasRunning = engine.phase !== "done";
  engine.phase = "idle";
  engine.endsAt = null;
  engine.durationMs = null;
  engine.index = -1;
  engine.questions = [];
  engine.answered = new Map();
  engine.expected = new Map();
  engine.gains = new Map();
  if (wasRunning) say("ควิซถูกหยุดแล้ว");
  broadcast();
}

export function skipQuestion() {
  if (engine.phase === "asking" || engine.phase === "prereveal") reveal("ข้ามข้อนี้");
  else if (engine.phase === "reveal") nextQuestion();
}

export function answerQuestion(input: {
  clientId: string;
  name: string;
  choice: number;
}): { ok: boolean; correct?: boolean; error?: string } {
  if (engine.phase !== "asking") return { ok: false, error: "ยังไม่ถึงเวลาตอบ" };
  const q = engine.questions[engine.index];
  if (!q) return { ok: false, error: "ไม่มีคำถาม" };
  if (engine.answered.has(input.clientId)) return { ok: false, error: "ตอบไปแล้ว" };
  if (input.choice < 0 || input.choice >= q.choices.length)
    return { ok: false, error: "ตัวเลือกไม่ถูกต้อง" };

  engine.answered.set(input.clientId, input.choice);
  engine.names.set(input.clientId, input.name);
  // คนที่เข้ามากลางคันก็นับรวมเป็นผู้เล่นของข้อนี้ด้วย
  if (!engine.expected.has(input.clientId))
    engine.expected.set(input.clientId, input.name);

  const entry: Score = engine.scores.get(input.clientId) ?? {
    clientId: input.clientId,
    name: input.name,
    score: 0,
    streak: 0,
  };
  entry.name = input.name;

  const correct = input.choice === q.answer;
  if (correct) {
    // คิดคะแนนดิบไว้ก่อน (ความเร็ว + โบนัสคนแรก) แต่ยังไม่บวกเข้าคะแนนรวม
    // เพื่อไม่ให้สกอร์บอร์ดแอบเฉลยว่าใครตอบถูกระหว่างที่คนอื่นยังตอบอยู่
    const total = engine.durationMs ?? 0;
    const left = engine.endsAt ? Math.max(0, engine.endsAt - Date.now()) : 0;
    const speed = total > 0 ? Math.round(500 + 500 * (left / total)) : 700;
    const first = engine.firstCorrect === null;
    engine.gains.set(input.clientId, speed + (first ? 100 : 0));
    if (first) engine.firstCorrect = input.clientId;
  }
  engine.scores.set(input.clientId, entry);

  // รอจนกว่าทุกคนในห้องจะตอบครบ แล้วค่อยหน่วงก่อนเฉลย
  const everyoneAnswered = [...engine.expected.keys()].every((id) =>
    engine.answered.has(id),
  );

  if (everyoneAnswered) beginPrereveal();
  else broadcast();

  return { ok: true, correct };
}
