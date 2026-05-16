import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { GuentnerLogo } from "@/app/brand";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();
  if (!ok) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-surface-muted text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo subline="Kalkulations-Quiz · Admin" />
          <form action="/api/admin/logout" method="post">
            <button className="font-display text-xs uppercase tracking-[0.18em] text-ink-muted hover:text-brand">
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-10">{children}</main>
    </div>
  );
}
