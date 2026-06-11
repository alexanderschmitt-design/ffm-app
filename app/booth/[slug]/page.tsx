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
          className={`bg-white pt-0 pb-20 ${
            copy.variant === "gpc-cards" ? "px-8" : "px-0"
          }`}
        >
          {copy.variant === "gpc-cards" ? (
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-6">
              <div className="relative w-full">
                <Image
                  src="/Header_Gaming.png"
                  alt="Product Configuration Solutions — From Zero to Hero"
                  width={1920}
                  height={400}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div
                className="rounded-full px-6 py-2 font-display text-xs uppercase tracking-[0.2em] text-white sm:text-sm"
                style={{ backgroundColor: "#F2701D" }}
              >
                Operations — Deliverables
              </div>

              <div className="relative w-full">
                <Image
                  src="/2_row.png"
                  alt="GPC Operations — CAD Configuration, Production Configuration, Sales Configuration"
                  width={1920}
                  height={500}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="relative w-[80%]">
                <Image
                  src="/Lego_Bridge.png"
                  alt=""
                  width={1920}
                  height={400}
                  className="h-auto w-full"
                />
              </div>

              <div className="relative w-full">
                <Image
                  src="/1_row.png"
                  alt="GPC Engineering — CAD Design, Articles / Items, Product Knowledge and Rules"
                  width={1920}
                  height={500}
                  className="h-auto w-full"
                />
              </div>

              <div className="rounded-full bg-brand px-6 py-2 font-display text-xs uppercase tracking-[0.2em] text-white sm:text-sm">
                Engineering — Pillars
              </div>

              <h2 className="mt-4 text-center font-display text-3xl font-bold italic tracking-tight text-brand-dark sm:text-5xl">
                PLAY THE GAME!
              </h2>

              <div className="border border-slate-200 bg-white p-3 shadow-sm">
                <Image
                  src={qr}
                  alt="QR code to play"
                  width={240}
                  height={240}
                  unoptimized
                  priority
                />
              </div>

              {playUrl && (
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all px-4 text-center font-mono text-[11px] text-ink-muted underline-offset-4 hover:text-brand hover:underline"
                >
                  {playUrl}
                </a>
              )}

              <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-slate-200 pt-6 text-sm text-ink">
                <div className="flex items-center gap-2">
                  <span
                    className="block h-4 w-4"
                    style={{ backgroundColor: "#7A7A7A" }}
                  />
                  <span>Spark Radiance Software</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="block h-4 w-4"
                    style={{ backgroundColor: "#E03A3E" }}
                  />
                  <span>Infor LN</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="block h-4 w-4"
                    style={{ backgroundColor: "#1A2D7E" }}
                  />
                  <span>CONTACT PDM-System</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="block h-4 w-4"
                    style={{ backgroundColor: "#1ABC9C" }}
                  />
                  <span>Siemens CAD</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-8">
              <div className="w-[80%]">
                <Image
                  src="/ffm-tax-teaser.svg"
                  alt=""
                  width={1000}
                  height={600}
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
