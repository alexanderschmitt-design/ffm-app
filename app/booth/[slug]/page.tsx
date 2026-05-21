import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GuentnerLogo } from "@/app/brand";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Booth } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getBoothAndGame(slug: string) {
  const sb = supabaseAdmin();

  const { data: booth } = await sb
    .from("booths")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!booth) return null;

  const { data: live } = await sb
    .from("games")
    .select("id, name, status")
    .eq("booth_id", booth.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const game =
    live ??
    (
      await sb
        .from("games")
        .select("id, name, status")
        .eq("booth_id", booth.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;

  let hasQuestions = false;
  if (game) {
    const { count } = await sb
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id);
    hasQuestions = (count ?? 0) > 0;
  }

  return { booth: booth as Booth, game, hasQuestions };
}

export default async function BoothLandingPage(
  props: PageProps<"/booth/[slug]">,
) {
  const { slug } = await props.params;
  const target = await getBoothAndGame(slug);
  if (!target) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  const baseUrl = `${proto}://${host}`;

  const playUrl =
    target.game && target.hasQuestions
      ? `${baseUrl}/quiz/${target.game.id}`
      : null;
  const qr = playUrl ? await qrDataUrl(playUrl) : null;

  return (
    <>
      <header className="border-b border-surface-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="bg-white px-8 py-20">
          <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                Güntner Company Market 2026
              </p>
              <h1 className="headline mt-4 text-4xl leading-[1.15] md:text-5xl">
                Test Your Güntner Pulse —<br />A Quick Executive Challenge
              </h1>
              <span className="headline-accent" />
              <p className="mt-8 max-w-md text-base leading-relaxed text-ink">
                Are you ready for a brief data check? We have compiled eight
                strategic questions covering the internal metrics of the
                Güntner Group — from headcount and revenue to tax structures
                spanning Brazil to Singapore. Spoiler alert: our footprint in
                China might look completely different than you expect.
              </p>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
                Simply scan the QR code with your phone to benchmark your
                insights. The challenge takes less than two minutes, and you
                will receive your score instantly.
              </p>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
                We look forward to sharing the full story and detailed
                insights with you at our booth afterwards.
              </p>
              {target.game && (
                <p className="mt-6 font-display text-xs uppercase tracking-[0.18em] text-ink-muted">
                  Currently running: {target.game.name}
                  {target.game.status === "live" && (
                    <span className="ml-3 inline-block bg-accent px-2 py-0.5 text-[10px] text-white">
                      LIVE
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src="/InnovationStories.webp"
                  alt="Inside Güntner production"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                  priority
                />
              </div>

              {qr && playUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="border border-slate-200 bg-white p-4 shadow-sm">
                    <Image
                      src={qr}
                      alt="QR code to play"
                      width={240}
                      height={240}
                      unoptimized
                      priority
                    />
                  </div>
                  <div className="font-display text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
                    Scan me and play
                  </div>
                  <div className="break-all text-center font-mono text-[11px] text-ink-muted">
                    {playUrl}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-surface-muted p-8 text-center">
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                    No game ready
                  </p>
                  <p className="mt-3 text-sm text-ink-muted">
                    Create a game with at least one question in the admin
                    area — the QR code will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-muted bg-surface-muted px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-ink-muted md:flex-row">
          <span>© Güntner · {target.booth.name} · FFM 2026</span>
          <Link
            href="/admin"
            className="font-display uppercase tracking-[0.18em] hover:text-brand"
          >
            Admin →
          </Link>
        </div>
      </footer>
    </>
  );
}
