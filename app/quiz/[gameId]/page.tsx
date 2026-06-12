import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SiteHeader, titleForBoothSlug } from "@/app/site-header";
import { QuizRunner, type QuizBonus } from "./quiz-runner";
import type { Question, AnswerOption } from "@/lib/types";
import { GPC_CATEGORIES } from "@/lib/gpc-categories";

export const dynamic = "force-dynamic";

// Per-booth bonus shown on the quiz summary screen.
const BOOTH_BONUSES: Record<string, QuizBonus> = {
  gpc: {
    downloads: [
      {
        href: "/Guentner_building_instructions.pdf",
        filename: "Guentner_building_instructions.pdf",
        label: "Download Building Plan",
      },
    ],
  },
};

export default async function QuizPage(props: PageProps<"/quiz/[gameId]">) {
  const { gameId } = await props.params;
  const sb = supabaseAdmin();

  // Folds the previously sequential booth lookup into the same query as
  // the game row via a Supabase nested select. Saves one Supabase roundtrip
  // per quiz pageview.
  const [{ data: game }, { data: questions }] = await Promise.all([
    sb
      .from("games")
      .select("id, name, status, booth_id, booths(slug)")
      .eq("id", gameId)
      .maybeSingle(),
    sb
      .from("questions")
      .select("*")
      .eq("game_id", gameId)
      .order("position", { ascending: true }),
  ]);

  if (!game) notFound();

  // Supabase returns the FK-joined `booths` as a single object at runtime
  // (many-to-one), but the inferred type is an array — cast through unknown.
  const boothJoin = (game as unknown as { booths: { slug: string } | null })
    .booths;
  const booth = boothJoin ? { slug: boothJoin.slug } : null;

  let qs = (questions ?? []) as Question[];

  // GPC booth: show exactly one question per category in fixed order.
  // If multiple questions exist for a category, pick one at random.
  // Categories without a tagged question are silently skipped.
  // Math.random is intentional here — this is a force-dynamic server component
  // that runs once per request; players should see a fresh draw each time.
  if (booth?.slug === "gpc") {
    qs = GPC_CATEGORIES.flatMap((cat) => {
      const pool = qs.filter((q) => q.category === cat);
      if (pool.length === 0) return [];
      // eslint-disable-next-line react-hooks/purity
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
    category: q.category,
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
    <main className="flex min-h-dvh flex-col items-stretch bg-white text-ink">
      <SiteHeader title={titleForBoothSlug(booth?.slug)} />
      <div className="flex flex-1 flex-col p-5">
        <QuizRunner questions={payload} bonus={bonus} />
      </div>
    </main>
  );
}
