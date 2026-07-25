import { Database } from "bun:sqlite";
import type { ChatMessage } from "./types";

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
    id: crypto.randomUUID(),
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
