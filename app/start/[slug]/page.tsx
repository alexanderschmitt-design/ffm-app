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

  const { data: booth } = await sb
    .from("booths")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!booth) notFound();

  const { data: live } = await sb
    .from("games")
    .select("id")
    .eq("booth_id", booth.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let gameId = live?.id as string | undefined;
  if (!gameId) {
    const { data: newest } = await sb
      .from("games")
      .select("id")
      .eq("booth_id", booth.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    gameId = newest?.id as string | undefined;
  }

  if (!gameId) {
    // No game exists yet — fall back to the booth landing page so the
    // printed URL never looks broken before FMM starts.
    redirect(`/booth/${slug}`);
  }

  redirect(`/quiz/${gameId}`);
}
