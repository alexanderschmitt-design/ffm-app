import Link from "next/link";
import type { ReactNode } from "react";

const SECTION_TITLES: Record<string, string> = {
  gpc: "Product Configuration Solutions",
  tax: "Global Tax Team",
};

export function titleForBoothSlug(slug?: string | null): string {
  if (!slug) return "Güntner Company Market";
  return SECTION_TITLES[slug] ?? "Güntner Company Market";
}

export function SiteHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative">
      <div className="bg-gradient-to-r from-[#0a1f5c] via-[#15348c] to-[#2b58c8]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-6 sm:px-10 sm:py-8">
          <h1 className="font-display text-base font-bold uppercase tracking-[0.18em] text-white sm:text-2xl md:text-3xl">
            {title}
          </h1>
          <Link
            href="/"
            aria-label="Güntner Group home"
            className="flex items-center gap-3 text-white transition hover:opacity-90 sm:gap-5"
          >
            <span
              aria-hidden
              className="block h-9 w-px bg-[#f5c518] sm:h-14"
            />
            <span className="text-right font-sans text-sm font-bold leading-[1.05] sm:text-lg md:text-2xl">
              <span className="block">Güntner</span>
              <span className="block">Group</span>
            </span>
          </Link>
        </div>
      </div>
      <div aria-hidden className="h-1 w-full bg-[#f5c518]" />
      {action && (
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-6 py-3 sm:px-10">
            {action}
          </div>
        </div>
      )}
    </header>
  );
}
