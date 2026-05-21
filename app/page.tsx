import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { GuentnerLogo } from "./brand";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

async function getStartTarget() {
  const sb = supabaseAdmin();

  const { data: live } = await sb
    .from("games")
    .select("id, name, status")
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;

  if (!game) return null;

  const { count } = await sb
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("game_id", game.id);

  return { game, hasQuestions: (count ?? 0) > 0 };
}

export default async function Home() {
  const target = await getStartTarget();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  const baseUrl = `${proto}://${host}`;

  const playUrl = target?.hasQuestions
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
                Güntner · FFM 2026 · Marktstand
              </p>
              <h1 className="headline mt-4 text-4xl leading-[1.15] md:text-5xl">
                Hi! Lust auf ein<br />kleines Zahlenspiel?
              </h1>
              <span className="headline-accent" />
              <p className="mt-8 max-w-md text-base leading-relaxed text-ink">
                Acht Fragen aus dem Güntner-Konzern — Mitarbeiter, Umsätze und
                Steuersätze von Brasilien bis Singapur. Spoiler: in China haben
                wir <em>deutlich</em> weniger Leute, als du denkst.
              </p>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
                Schnapp dir dein Handy, scann den QR und tipp dich durch. Dauert
                keine zwei Minuten — danach siehst du, wie nah du dran warst.
                Komm gern danach an den Stand für die ganze Story.
              </p>
              {target?.game && (
                <p className="mt-6 font-display text-xs uppercase tracking-[0.18em] text-ink-muted">
                  Aktuell: {target.game.name}
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
                  alt="Blick in die Güntner-Produktion"
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
                      alt="QR-Code zum Mitspielen"
                      width={240}
                      height={240}
                      unoptimized
                      priority
                    />
                  </div>
                  <div className="font-display text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
                    Scann mich und leg los
                  </div>
                  <div className="break-all text-center font-mono text-[11px] text-ink-muted">
                    {playUrl}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-surface-muted p-8 text-center">
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                    Kein Spiel bereit
                  </p>
                  <p className="mt-3 text-sm text-ink-muted">
                    Leg im Admin-Bereich ein Spiel mit mindestens einer Frage an,
                    dann erscheint hier der QR-Code zum Mitspielen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-muted bg-surface-muted px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-ink-muted md:flex-row">
          <span>© Güntner · Marktstand-Quiz · FFM 2026</span>
          <Link
            href="/admin"
            className="font-display uppercase tracking-[0.18em] hover:text-brand"
          >
            Admin-Bereich →
          </Link>
        </div>
      </footer>
    </>
  );
}
