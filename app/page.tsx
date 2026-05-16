import Link from "next/link";
import { GuentnerLogo } from "./brand";

export default function Home() {
  return (
    <>
      <header className="border-b border-surface-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="bg-white px-8 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                Güntner · FFM 2026 · Marktstand
              </p>
              <h1 className="headline mt-4 text-4xl leading-[1.15] md:text-5xl">
                Trockene Zahlen,<br />live geraten.
              </h1>
              <span className="headline-accent" />
              <p className="mt-8 max-w-md text-base leading-relaxed text-ink-muted">
                Am Güntner-Stand auf der FFM 2026: Scann den QR-Code, beantworte die Frage
                auf deinem Handy — und komm mit uns ins Gespräch über Kalkulation und
                Steuern bei Güntner.
              </p>
              <p className="mt-4 text-sm text-ink-muted">
                Du betreust den Stand und willst Fragen verwalten?
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-block bg-brand px-7 py-3 font-medium text-white transition hover:bg-brand-dark"
              >
                Zum Admin-Bereich
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="aspect-square bg-gradient-to-br from-brand/10 via-accent/10 to-brand/5 p-12">
                <div className="flex h-full w-full items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full max-w-xs">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#0084ca" strokeWidth="1.5" opacity="0.4" />
                    <ellipse cx="100" cy="100" rx="90" ry="35" fill="none" stroke="#0084ca" strokeWidth="1.5" opacity="0.4" />
                    <ellipse cx="100" cy="100" rx="35" ry="90" fill="none" stroke="#0084ca" strokeWidth="1.5" opacity="0.4" />
                    <ellipse cx="100" cy="100" rx="90" ry="60" fill="none" stroke="#1abc9c" strokeWidth="1.5" opacity="0.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-surface-muted px-8 py-6 text-center text-xs text-ink-muted">
        © Güntner · Marktstand-Quiz · FFM 2026
      </footer>
    </>
  );
}
