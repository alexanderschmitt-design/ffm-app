import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Body = { questionId?: unknown; optionId?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const optionId = typeof body.optionId === "string" ? body.optionId : "";
  if (!questionId || !optionId) {
    return NextResponse.json({ error: "questionId und optionId sind erforderlich." }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Verify the option actually belongs to this question (prevents tampering).
  const { data: opt, error: optErr } = await sb
    .from("answer_options")
    .select("id")
    .eq("id", optionId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (optErr) {
    console.error(optErr);
    return NextResponse.json({ error: "Server-Fehler" }, { status: 500 });
  }
  if (!opt) {
    return NextResponse.json({ error: "Option passt nicht zur Frage." }, { status: 400 });
  }

  const { error: insErr } = await sb.from("votes").insert({
    question_id: questionId,
    option_id: optionId,
  });
  if (insErr) {
    console.error(insErr);
    return NextResponse.json({ error: "Vote konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
