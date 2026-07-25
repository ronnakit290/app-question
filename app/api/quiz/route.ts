import {
  answerQuestion,
  nextQuestion,
  quizState,
  skipQuestion,
  startQuiz,
  stopQuiz,
} from "@/app/lib/quiz";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ state: quizState() });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const action = body.action;

  switch (action) {
    case "start": {
      const setId = typeof body.setId === "string" ? body.setId : "";
      if (!setId) return Response.json({ error: "setId required" }, { status: 400 });
      const result = startQuiz(setId);
      if (!result.ok) return Response.json({ error: result.error }, { status: 404 });
      break;
    }
    case "stop":
      stopQuiz();
      break;
    case "skip":
      skipQuestion();
      break;
    case "next":
      nextQuestion();
      break;
    case "answer": {
      const clientId = typeof body.clientId === "string" ? body.clientId : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 32) : "";
      const choice = Number(body.choice);
      if (!clientId || !name || !Number.isInteger(choice))
        return Response.json({ error: "missing fields" }, { status: 400 });
      const result = answerQuestion({ clientId, name, choice });
      if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
      return Response.json({ state: quizState(), correct: result.correct });
    }
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }

  return Response.json({ state: quizState() });
}
