import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GuentnerMark } from "@/app/brand";
import { QuizRunner, type QuizBonus } from "./quiz-runner";
import type { Question, AnswerOption } from "@/lib/types";
import { GPC_CATEGORIES } from "@/lib/gpc-categories";

export const dynamic = "force-dynamic";

// Per-booth bonus shown on the quiz summary screen.
const BOOTH_BONUSES: Record<string, QuizBonus> = {
  gpc: {
    teaserSrc: "/lego-bauanleitung-teaser.png",
    teaserAlt: "Lego figures building a Güntner unit",
    headline: "You are a hero — enjoy building a Güntner Unit",
    body: "",
    downloadHref: "/lego-guentner-plan.pdf",
    downloadLabel: "Download building instructions (PDF)",
    downloadFilename: "guentner-bauanleitung.pdf",
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

  let qs = (questions ?? []) as Question[];

  // GPC booth: show exactly one question per category in fixed order.
  // If multiple questions exist for a category, pick one at random.
  // Categories without a tagged question are silently skipped.
  if (booth?.slug === "gpc") {
    qs = GPC_CATEGORIES.flatMap((cat) => {
      const pool = qs.filter((q) => q.category === cat);
      if (pool.length === 0) return [];
      return [pool[Math.floor(Math.random() * pool.length)]];
    });
  }

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
      </header>
      <QuizRunner questions={payload} bonus={bonus} />
    </main>
  );
}
