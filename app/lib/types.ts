export type ChatMessage = {
  id: string;
  clientId: string;
  name: string;
  text: string;
  createdAt: number;
};

export type StreamEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "presence"; users: string[] };
