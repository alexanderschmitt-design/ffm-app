import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { PresentClient } from "./present-client";
import type { Game, Question, AnswerOption } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PresentPage(props: PageProps<"/present/[gameId]">) {
  const { gameId } = await props.params;
  const sb = supabaseAdmin();

  const [{ data: game }, { data: questions }] = await Promise.all([
    sb.from("games").select("*").eq("id", gameId).maybeSingle(),
    sb.from("questions").select("*").eq("game_id", gameId).order("position", { ascending: true }),
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

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  const baseUrl = `${proto}://${host}`;

  const questionsWithQr = await Promise.all(
    qs.map(async (q) => ({
      ...q,
      qrDataUrl: await qrDataUrl(`${baseUrl}/play/${q.slug}`),
      playUrl: `${baseUrl}/play/${q.slug}`,
      options: options.filter((o) => o.question_id === q.id),
    })),
  );

  return (
    <PresentClient
      game={game as Game}
      questions={questionsWithQr}
    />
  );
}
