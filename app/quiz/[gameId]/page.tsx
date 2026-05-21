import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GuentnerMark } from "@/app/brand";
import { QuizRunner, type QuizBonus } from "./quiz-runner";
import type { Question, AnswerOption } from "@/lib/types";

export const dynamic = "force-dynamic";

// Per-booth bonus shown on the quiz summary screen.
const BOOTH_BONUSES: Record<string, QuizBonus> = {
  gpc: {
    teaserSrc: "/lego-guentner-teaser.webp",
    teaserAlt: "Lego blueprint of a Güntner unit",
    headline: "Bonus: build it at home",
    body:
      "Thanks for playing. You just earned a Lego blueprint of a Güntner unit — " +
      "scan it onto your desk and rebuild what you saw at the booth.",
    downloadHref: "/lego-guentner-plan.pdf",
    downloadLabel: "Download Lego plan (PDF)",
    downloadFilename: "guentner-lego-plan.pdf",
  },
};

export default async function QuizPage(props: PageProps<"/quiz/[gameId]">) {
  const { gameId } = await props.params;
  const sb = supabaseAdmin();

  const [{ data: game }, { data: questions }] = await Promise.all([
    sb
      .from("games")
      .select("id, name, status, booth_id")
      .eq("id", gameId)
      .maybeSingle(),
    sb
      .from("questions")
      .select("*")
      .eq("game_id", gameId)
      .order("position", { ascending: true }),
  ]);

  if (!game) notFound();

  const { data: booth } = await sb
    .from("booths")
    .select("slug")
    .eq("id", game.booth_id)
    .maybeSingle();

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

  const bonus = booth?.slug ? BOOTH_BONUSES[booth.slug] : undefined;

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
      <QuizRunner questions={payload} bonus={bonus} />
    </main>
  );
}
