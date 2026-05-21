import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GuentnerMark } from "@/app/brand";
import { QuizRunner } from "./quiz-runner";
import type { Question, AnswerOption } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuizPage(props: PageProps<"/quiz/[gameId]">) {
  const { gameId } = await props.params;
  const sb = supabaseAdmin();

  const [{ data: game }, { data: questions }] = await Promise.all([
    sb.from("games").select("id, name, status").eq("id", gameId).maybeSingle(),
    sb
      .from("questions")
      .select("*")
      .eq("game_id", gameId)
      .order("position", { ascending: true }),
  ]);

  if (!game) notFound();
  const qs = (questions ?? []) as Question[];

  const ids = qs.map((q) => q.id);
  let options: AnswerOption[] = [];
  if (ids.length > 0) {
    const { data } = await sb
      .from("answer_options")
      .select("*")
      .in("question_id", ids)
      .order("position", { ascending: true });
    options = (data ?? []) as AnswerOption[];
  }

  const payload = qs.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: options
      .filter((o) => o.question_id === q.id)
      .map((o) => ({
        id: o.id,
        label: o.label,
        position: o.position,
        is_correct: o.is_correct,
      })),
  }));

  return (
    <main className="flex min-h-dvh flex-col items-stretch bg-white p-5 text-ink">
      <header className="mb-5 border-b border-slate-200 pb-4">
        <GuentnerMark className="h-10 w-auto" />
        <p className="mt-3 font-display text-[10px] uppercase tracking-[0.25em] text-brand">
          FMM 2026 · Booth
        </p>
        <h1 className="mt-3 text-xl font-semibold leading-tight sm:text-2xl">
          {game.name}
        </h1>
        <span className="headline-accent mt-3" />
      </header>
      <QuizRunner questions={payload} />
    </main>
  );
}
