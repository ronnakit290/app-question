export type ChatMessage = {
  id: string;
  clientId: string;
  name: string;
  text: string;
  createdAt: number;
};

/** ---------- AI / Quiz ---------- */

export type AiProvider = "openai" | "openrouter" | "anthropic" | "google";

export type AiSettings = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  /** วินาทีต่อข้อ (0 = ไม่จับเวลา) */
  secondsPerQuestion: number;
  /** หน่วงก่อนเปลี่ยนข้อถัดไป (ms) หลังมีคนตอบ/เฉลย */
  revealDelayMs: number;
  /** ตอบถูกแล้วข้ามไปข้อถัดไปอัตโนมัติ */
  autoNext: boolean;
};

export type AiSettingsPublic = AiSettings & { hasKey: boolean };

export type Question = {
  id: string;
  setId: string;
  index: number;
  text: string;
  choices: string[];
  answer: number;
  explain: string;
};

/** คำถามเวอร์ชันที่ส่งให้ client ระหว่างเล่น (ไม่มีเฉลย) */
export type QuestionPublic = {
  id: string;
  index: number;
  text: string;
  choices: string[];
};

export type QuestionSet = {
  id: string;
  title: string;
  prompt: string;
  count: number;
  createdAt: number;
};

export type Score = {
  clientId: string;
  name: string;
  score: number;
  streak: number;
};

/**
 * idle → asking (รอทุกคนตอบ/หมดเวลา) → prereveal (หน่วงก่อนเฉลย)
 * → reveal (โชว์เฉลย + คำตอบทุกคน) → asking ข้อถัดไป … → done
 */
export type QuizPhase = "idle" | "asking" | "prereveal" | "reveal" | "done";

/** ผลของแต่ละคนในข้อปัจจุบัน */
export type AnswerResult = {
  clientId: string;
  name: string;
  /** null = ไม่ได้ตอบทันเวลา */
  choice: number | null;
  correct: boolean;
  /** คะแนนที่ได้จากข้อนี้ */
  gained: number;
  /** คะแนนรวมสะสม */
  total: number;
};

export type QuizState = {
  phase: QuizPhase;
  setId: string | null;
  title: string;
  index: number;
  total: number;
  question: QuestionPublic | null;
  /** epoch ms ที่หมดเวลาข้อนี้ (null = ไม่จับเวลา) */
  endsAt: number | null;
  /** ความยาวเวลาเต็มของข้อนี้ (ms) */
  durationMs: number | null;
  /** เปิดเฉพาะตอน phase === "reveal" */
  answer: number | null;
  explain: string | null;
  /** clientId -> index ที่เลือก */
  answered: Record<string, number>;
  /** จำนวนคนที่ต้องตอบทั้งหมดในข้อนี้ */
  expected: number;
  firstCorrect: string | null;
  /** ผลรายคนของข้อนี้ — มีเฉพาะตอน phase === "reveal" */
  results: AnswerResult[];
  scores: Score[];
};

export type StreamEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "presence"; users: string[] }
  | { type: "quiz"; state: QuizState };
