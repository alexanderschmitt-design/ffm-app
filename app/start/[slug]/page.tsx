import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";

// Stable redirect target for printed posters. The booth-slug stays the same
// for the lifetime of the booth, while the underlying game UUID may change
// whenever the admin creates a new game. Visitors who scan a poster QR land
// here, get redirected to whichever game is currently live (or the newest
// one as fallback), and never see the dynamic /quiz/<uuid> URL.

export const dynamic = "force-dynamic";

export default async function StartPage(props: PageProps<"/start/[slug]">) {
  const { slug } = await props.params;
  const sb = supabaseAdmin();

  // One nested-select roundtrip replaces booth → live game → newest game.
  // We fetch all games for the booth in one shot and pick live/latest in JS.
  const { data: row } = await sb
    .from("booths")
    .select("id, games(id, status, created_at)")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) notFound();

  type GameRow = { id: string; status: string; created_at: string };
  const games = ((row as { games: GameRow[] | null }).games ?? [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const live = games.find((g) => g.status === "live");
  const gameId = (live ?? games[0])?.id;

  if (!gameId) {
    // No game exists yet — fall back to the booth landing page so the
    // printed URL never looks broken before FMM starts.
    redirect(`/booth/${slug}`);
  }

  redirect(`/quiz/${gameId}`);
}
