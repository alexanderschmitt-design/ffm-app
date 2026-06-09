import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GuentnerLogo } from "@/app/brand";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Booth } from "@/lib/types";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type BoothCopy = {
  kicker: string;
  headline: ReactNode;
  intro: ReactNode;
  image: { src: string; alt: string; aspectClass: string };
  variant?: "standard" | "gpc-cards";
};

const BOOTH_COPY: Record<string, BoothCopy> = {
  tax: {
    kicker: "Güntner Company Market 2026",
    headline: (
      <>
        Test Your Güntner Pulse —<br />A Quick Executive Challenge
      </>
    ),
    intro: (
      <>
        Are you ready for a brief data check? We have compiled eight
        strategic questions covering the internal metrics of the Güntner
        Group — from headcount and revenue to tax structures spanning
        Brazil to Singapore. Spoiler alert: our footprint in China might
        look completely different than you expect.
      </>
    ),
    image: {
      src: "/InnovationStories.webp",
      alt: "Inside Güntner production",
      aspectClass: "aspect-[4/3]",
    },
  },
  gpc: {
    kicker: "GPC · FMM 2026",
    headline: (
      <>
        Test your Product Knowledge.
      </>
    ),
    intro: (
      <>
        Are you curious about the numbers behind Güntner product
        configuration? We have prepared eight strategic questions covering
        our product range — from the count of configurable variants and
        the components inside each unit to how digitalization is
        reshaping the way we configure Güntner products.
      </>
    ),
    image: {
      src: "/myGPC-Home.png",
      alt: "myGPC product configurator home screen",
      aspectClass: "aspect-[16/10]",
    },
    variant: "gpc-cards",
  },
};

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

  // Static, poster-safe URL: stays valid across new games so printed QR
  // codes never expire. /start/<slug> resolves to the current live game.
  const playUrl = `${baseUrl}/start/${target.booth.slug}`;
  const qr = await qrDataUrl(playUrl);

  const copy = BOOTH_COPY[target.booth.slug] ?? BOOTH_COPY.tax;

  return (
    <>
      <header className="border-b border-surface-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section
          className={`bg-white px-8 pb-20 ${
            copy.variant === "gpc-cards" ? "pt-0" : "pt-20"
          }`}
        >
          {copy.variant === "gpc-cards" ? (
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
              <div className="relative w-full">
                <Image
                  src="/Header_Gaming.png"
                  alt="Gaming Header"
                  width={1920}
                  height={400}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="relative w-full">
                <Image
                  src="/1_row.png"
                  alt="GPC Categories — upper row"
                  width={1920}
                  height={500}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="flex w-full items-center justify-center gap-6">
                <div className="w-[70%]">
                  <Image
                    src="/Lego_Bridge.png"
                    alt=""
                    width={1920}
                    height={120}
                    className="h-auto w-full"
                  />
                </div>
                {qr && playUrl ? (
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="border border-slate-200 bg-white p-3 shadow-sm">
                      <Image
                        src={qr}
                        alt="QR code to play"
                        width={200}
                        height={200}
                        unoptimized
                        priority
                      />
                    </div>
                    <div className="font-display text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
                      Scan me and play
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative w-full">
                <Image
                  src="/2_row.png"
                  alt="GPC Categories — lower row"
                  width={1920}
                  height={500}
                  className="h-auto w-full"
                />
              </div>

              {playUrl && (
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-center font-mono text-[11px] text-ink-muted underline-offset-4 hover:text-brand hover:underline"
                >
                  {playUrl}
                </a>
              )}
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {copy.kicker}
                </p>
                <h1 className="headline mt-4 text-4xl leading-[1.15] md:text-5xl">
                  {copy.headline}
                </h1>
                <span className="headline-accent" />
                <p className="mt-8 max-w-md text-base leading-relaxed text-ink">
                  {copy.intro}
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
                <div
                  className={`relative w-full overflow-hidden ${copy.image.aspectClass}`}
                >
                  <Image
                    src={copy.image.src}
                    alt={copy.image.alt}
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
          )}
        </section>
      </main>

      <footer className="border-t border-surface-muted bg-surface-muted px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-ink-muted md:flex-row">
          <span>Copyright © 2026 Güntner GmbH &amp; Co. KG</span>
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
