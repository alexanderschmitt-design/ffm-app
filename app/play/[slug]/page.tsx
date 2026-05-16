import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
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
    throw new Error("Frage konnte nicht geladen werden.");
  }
  const row = (data ?? [])[0] as
    | { question_id: string; game_id: string; prompt: string; options_json: Option[] }
    | undefined;
  if (!row) notFound();

  const options = (row.options_json ?? []).sort((a, b) => a.position - b.position);

  return (
    <main className="flex min-h-dvh flex-col items-stretch bg-white p-5 text-ink">
      <header className="mb-5 border-b border-slate-200 pb-4">
        <p className="font-display text-[10px] uppercase tracking-[0.25em] text-brand">
          Güntner · FFM 2026 · Marktstand
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
          {row.prompt}
        </h1>
        <span className="headline-accent mt-3" />
      </header>
      <AnswerButtons questionId={row.question_id} options={options} />
      <footer className="mt-6 text-center text-xs text-ink-muted">
        Tipp einfach eine Antwort an &mdash; die Auflösung siehst du gleich am Stand.
      </footer>
    </main>
  );
}
