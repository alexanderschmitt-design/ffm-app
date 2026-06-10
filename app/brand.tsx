import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/guentner-group-logo.png";
const LOGO_WIDTH = 595;
const LOGO_HEIGHT = 271;

export function GuentnerMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Güntner"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className={className}
    />
  );
}

export function GuentnerLogo({ subline }: { subline?: string }) {
  return (
    <Link href="/" className="flex items-center gap-4">
      <GuentnerMark className="h-12 w-auto" />
      {subline && (
        <>
          <span aria-hidden className="h-8 w-px bg-slate-300" />
          <div className="font-display text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {subline}
          </div>
        </>
      )}
    </Link>
  );
}
