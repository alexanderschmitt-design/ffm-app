import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SiteHeader, titleForBoothSlug } from "@/app/site-header";
import { AnswerButtons } from "./answer-buttons";

type Option = {
  id: string;
  label: string;
  position: number;
  is_correct: boolean;
};

export const dynamic = "force-dynamic";

export default async function PlayPage(props: PageProps<"/play/[slug]">) {
  const { slug } = await props.params;
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("get_question_by_slug", { p_slug: slug });
  if (error) {
    console.error(error);
    throw new Error("Could not load question.");
  }
  const row = (data ?? [])[0] as
    | { question_id: string; game_id: string; prompt: string; options_json: Option[] }
    | undefined;
  if (!row) notFound();

  const options = (row.options_json ?? []).sort((a, b) => a.position - b.position);

  // Pull booth slug via a nested select instead of game → booth as two
  // sequential roundtrips.
  const { data: game } = await sb
    .from("games")
    .select("booth_id, booths(slug)")
    .eq("id", row.game_id)
    .maybeSingle();
  const boothJoin =
    (game as unknown as { booths: { slug: string } | null } | null)?.booths;
  const booth = boothJoin ? { slug: boothJoin.slug } : null;

  return (
    <main className="flex min-h-dvh flex-col items-stretch bg-white text-ink">
      <SiteHeader title={titleForBoothSlug(booth?.slug)} />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-5 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {row.prompt}
          </h1>
          <span className="headline-accent mt-3" />
        </div>
        <AnswerButtons questionId={row.question_id} options={options} />
        <footer className="mt-6 text-center text-xs text-ink-muted">
          Tap an answer &mdash; the reveal happens on the booth screen.
        </footer>
      </div>
    </main>
  );
}
