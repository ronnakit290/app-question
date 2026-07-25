import { Database } from "bun:sqlite";
import type { AiSettings, ChatMessage, Question, QuestionSet } from "./types";
import { randomId } from "./uuid";

const DB_PATH = process.env.CHAT_DB_PATH ?? "chat.sqlite";

type Row = {
  id: string;
  client_id: string;
  name: string;
  text: string;
  created_at: number;
};

// Keep a single connection across dev hot reloads.
const globalForDb = globalThis as unknown as { __chatDb?: Database };

function init(): Database {
  const db = new Database(DB_PATH, { create: true });
  db.run("PRAGMA journal_mode = WAL;");
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      client_id  TEXT NOT NULL,
      name       TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);",
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS question_sets (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      prompt     TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id      TEXT PRIMARY KEY,
      set_id  TEXT NOT NULL,
      idx     INTEGER NOT NULL,
      text    TEXT NOT NULL,
      choices TEXT NOT NULL,
      answer  INTEGER NOT NULL,
      explain TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_questions_set ON questions (set_id, idx);",
  );
  return db;
}

const db: Database = (globalForDb.__chatDb ??= init());

const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  text: r.text,
  createdAt: r.created_at,
});

export function listMessages(limit = 100): ChatMessage[] {
  const rows = db
    .query<Row, [number]>(
      "SELECT * FROM messages ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit);
  return rows.reverse().map(toMessage);
}

export function insertMessage(input: {
  clientId: string;
  name: string;
  text: string;
}): ChatMessage {
  const message: ChatMessage = {
    id: randomId(),
    clientId: input.clientId,
    name: input.name,
    text: input.text,
    createdAt: Date.now(),
  };
  db.query<never, [string, string, string, string, number]>(
    "INSERT INTO messages (id, client_id, name, text, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    message.id,
    message.clientId,
    message.name,
    message.text,
    message.createdAt,
  );
  return message;
}

/* ------------------------------------------------------------------ */
/* Settings (key/value)                                                */
/* ------------------------------------------------------------------ */

const SETTINGS_KEY = "ai";
const API_KEY_KEY = "ai:apiKey";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  secondsPerQuestion: 30,
  revealDelayMs: 4000,
  autoNext: true,
};

function getRaw(key: string): string | null {
  const row = db
    .query<{ value: string }, [string]>(
      "SELECT value FROM settings WHERE key = ?",
    )
    .get(key);
  return row?.value ?? null;
}

function setRaw(key: string, value: string) {
  db.query<never, [string, string]>(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

export function getAiSettings(): AiSettings {
  const raw = getRaw(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_AI_SETTINGS };
  try {
    return { ...DEFAULT_AI_SETTINGS, ...(JSON.parse(raw) as AiSettings) };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAiSettings(patch: Partial<AiSettings>): AiSettings {
  const next = { ...getAiSettings(), ...patch };
  setRaw(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function getApiKey(): string {
  return getRaw(API_KEY_KEY) ?? process.env.AI_API_KEY ?? "";
}

export function saveApiKey(key: string) {
  setRaw(API_KEY_KEY, key);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

/* ------------------------------------------------------------------ */
/* Question sets                                                       */
/* ------------------------------------------------------------------ */

type QuestionRow = {
  id: string;
  set_id: string;
  idx: number;
  text: string;
  choices: string;
  answer: number;
  explain: string;
};

const toQuestion = (r: QuestionRow): Question => ({
  id: r.id,
  setId: r.set_id,
  index: r.idx,
  text: r.text,
  choices: JSON.parse(r.choices) as string[],
  answer: r.answer,
  explain: r.explain,
});

export function insertQuestionSet(input: {
  title: string;
  prompt: string;
  questions: { text: string; choices: string[]; answer: number; explain: string }[];
}): { set: QuestionSet; questions: Question[] } {
  const setId = randomId();
  const createdAt = Date.now();

  db.query<never, [string, string, string, number]>(
    "INSERT INTO question_sets (id, title, prompt, created_at) VALUES (?, ?, ?, ?)",
  ).run(setId, input.title, input.prompt, createdAt);

  const stmt = db.query<never, [string, string, number, string, string, number, string]>(
    "INSERT INTO questions (id, set_id, idx, text, choices, answer, explain) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const questions: Question[] = input.questions.map((q, i) => {
    const id = randomId();
    stmt.run(id, setId, i, q.text, JSON.stringify(q.choices), q.answer, q.explain);
    return { id, setId, index: i, ...q };
  });

  return {
    set: {
      id: setId,
      title: input.title,
      prompt: input.prompt,
      count: questions.length,
      createdAt,
    },
    questions,
  };
}

export function listQuestionSets(limit = 20): QuestionSet[] {
  return db
    .query<
      { id: string; title: string; prompt: string; created_at: number; count: number },
      [number]
    >(
      `SELECT s.id, s.title, s.prompt, s.created_at,
              (SELECT COUNT(*) FROM questions q WHERE q.set_id = s.id) AS count
         FROM question_sets s
        ORDER BY s.created_at DESC
        LIMIT ?`,
    )
    .all(limit)
    .map((r) => ({
      id: r.id,
      title: r.title,
      prompt: r.prompt,
      count: r.count,
      createdAt: r.created_at,
    }));
}

export function getQuestions(setId: string): Question[] {
  return db
    .query<QuestionRow, [string]>(
      "SELECT * FROM questions WHERE set_id = ? ORDER BY idx",
    )
    .all(setId)
    .map(toQuestion);
}

export function getQuestionSet(setId: string): QuestionSet | null {
  const r = db
    .query<{ id: string; title: string; prompt: string; created_at: number }, [string]>(
      "SELECT * FROM question_sets WHERE id = ?",
    )
    .get(setId);
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    prompt: r.prompt,
    count: getQuestions(setId).length,
    createdAt: r.created_at,
  };
}

export function deleteQuestionSet(setId: string) {
  db.query<never, [string]>("DELETE FROM questions WHERE set_id = ?").run(setId);
  db.query<never, [string]>("DELETE FROM question_sets WHERE id = ?").run(setId);
}
