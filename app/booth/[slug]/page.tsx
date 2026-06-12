import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, titleForBoothSlug } from "@/app/site-header";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { siteBaseUrl } from "@/lib/site-url";
import type { Booth } from "@/lib/types";
import type { ReactNode } from "react";

export const revalidate = 60;

// Prerender both booth slugs (gpc, tax) at build time; new slugs added via
// the admin would still be rendered on-demand and ISR-cached for 60s.
export async function generateStaticParams() {
  const sb = supabaseAdmin();
  const { data } = await sb.from("booths").select("slug");
  return (data ?? []).map((b) => ({ slug: b.slug as string }));
}

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
      src: "/myGPC-Home.webp",
      alt: "myGPC product configurator home screen",
      aspectClass: "aspect-[16/10]",
    },
    variant: "gpc-cards",
  },
};

async function getBoothAndGame(slug: string) {
  const sb = supabaseAdmin();

  // Single nested select replaces the previous 3–4 sequential roundtrips:
  // booth → games (live, with fallback) → questions count. Supabase returns
  // the booth row with its games array; the live/latest pick happens in JS.
  type GameRow = {
    id: string;
    name: string;
    status: string;
    created_at: string;
    questions: { id: string }[] | null;
  };
  const { data: row } = await sb
    .from("booths")
    .select("*, games(id, name, status, created_at, questions(id))")
    .eq("slug", slug)
    .maybeSingle();

  if (!row) return null;

  const { games, ...boothFields } = row as Booth & { games: GameRow[] | null };
  const booth = boothFields as Booth;
  const sorted = (games ?? []).slice().sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
  const live = sorted.find((g) => g.status === "live");
  const picked = live ?? sorted[0] ?? null;
  const game = picked
    ? { id: picked.id, name: picked.name, status: picked.status }
    : null;
  const hasQuestions = picked ? (picked.questions?.length ?? 0) > 0 : false;

  return { booth, game, hasQuestions };
}

export default async function BoothLandingPage(
  props: PageProps<"/booth/[slug]">,
) {
  const { slug } = await props.params;
  const target = await getBoothAndGame(slug);
  if (!target) notFound();

  // Static, poster-safe URL: stays valid across new games so printed QR
  // codes never expire. /start/<slug> resolves to the current live game.
  const baseUrl = await siteBaseUrl();
  const playUrl = `${baseUrl}/start/${target.booth.slug}`;
  const qr = await qrDataUrl(playUrl);

  const copy = BOOTH_COPY[target.booth.slug] ?? BOOTH_COPY.tax;

  return (
    <>
      <SiteHeader title={titleForBoothSlug(target.booth.slug)} />

      <main className="flex flex-1 flex-col">
        <section
          className={`bg-white pt-0 pb-20 ${
            copy.variant === "gpc-cards" ? "px-0" : "px-0"
          }`}
        >
          {copy.variant === "gpc-cards" ? (
            <div className="flex flex-col items-center">
              <div
                className="relative w-full overflow-hidden bg-white"
                style={{ aspectRatio: "1000 / 1264" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/work/Plakat.SVG"
                  alt="Product Configuration Solutions poster"
                  decoding="async"
                  fetchPriority="high"
                  className="absolute left-0 top-0 block w-full"
                  style={{
                    aspectRatio: "1000 / 1414",
                    transform: "translateY(-10.6082%)",
                  }}
                />
              </div>
              <a
                href={playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 break-all px-4 text-center font-mono text-[11px] text-ink-muted underline-offset-4 hover:text-brand hover:underline sm:text-xs"
              >
                {playUrl}
              </a>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-8 px-4">
              <div className="w-full max-w-3xl">
                <Image
                  src="/headline-ready-to-test.svg"
                  alt='Ready to test your "tax auditor logic"?'
                  width={502}
                  height={54}
                  className="h-auto w-full"
                  priority
                />
              </div>

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

              <a
                href={playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all px-4 text-center font-mono text-[11px] text-ink-muted underline-offset-4 hover:text-brand hover:underline"
              >
                {playUrl}
              </a>

              <div className="w-[96%]">
                <Image
                  src="/cbcr-karte-tabelle_v2.svg"
                  alt=""
                  width={1000}
                  height={520}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="w-full max-w-3xl">
                <Image
                  src="/headline-lets-talk-global-tax.svg"
                  alt="Let's talk about Global Tax!"
                  width={368}
                  height={49}
                  className="h-auto w-full"
                />
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
