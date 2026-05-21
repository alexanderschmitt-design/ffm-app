import Link from "next/link";
import { GuentnerLogo } from "./brand";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Booth } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("booths")
    .select("*")
    .order("created_at", { ascending: true });
  const booths = (data ?? []) as Booth[];

  return (
    <>
      <header className="border-b border-surface-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="bg-white px-8 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
              Güntner · FFM 2026
            </p>
            <h1 className="headline mt-4 text-4xl leading-[1.15] md:text-5xl">
              Trockene Zahlen,<br />live geraten.
            </h1>
            <span className="headline-accent" />
            <p className="mt-8 max-w-xl text-base leading-relaxed text-ink-muted">
              Pick the booth you&apos;re at — or use the QR code printed on the
              wall to jump straight into the right quiz.
            </p>

            {booths.length === 0 ? (
              <p className="mt-10 text-sm text-ink-muted">
                No booths configured yet.
              </p>
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                {booths.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/booth/${b.slug}`}
                      className="block border border-slate-200 bg-white p-6 transition hover:border-brand hover:shadow-sm"
                    >
                      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                        /booth/{b.slug}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-ink">
                        {b.name}
                      </h2>
                      {b.tagline && (
                        <p className="mt-2 text-sm text-ink-muted">
                          {b.tagline}
                        </p>
                      )}
                      <p className="mt-4 font-display text-xs uppercase tracking-[0.18em] text-brand">
                        Open booth →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-muted bg-surface-muted px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-ink-muted md:flex-row">
          <span>© Güntner · Booth Quiz · FFM 2026</span>
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
