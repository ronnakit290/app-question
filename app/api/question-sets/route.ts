import { deleteQuestionSet, listQuestionSets } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ sets: listQuestionSets(20) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  deleteQuestionSet(id);
  return Response.json({ ok: true });
}
