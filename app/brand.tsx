import Link from "next/link";

export function GuentnerMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="20" cy="20" r="18" stroke="#B8C2CC" strokeWidth="1.5" />
      <ellipse cx="20" cy="20" rx="18" ry="7" stroke="#B8C2CC" strokeWidth="1.5" />
      <ellipse cx="20" cy="20" rx="7" ry="18" stroke="#B8C2CC" strokeWidth="1.5" />
    </svg>
  );
}

export function GuentnerLogo({ subline }: { subline?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <GuentnerMark className="h-9 w-9" />
      <div className="leading-tight">
        <div className="text-2xl font-semibold tracking-tight text-brand">
          Güntner
        </div>
        {subline && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {subline}
          </div>
        )}
      </div>
    </Link>
  );
}
