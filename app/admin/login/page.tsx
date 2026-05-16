import { redirect } from "next/navigation";
import { isAdmin, loginWithPassword } from "@/lib/auth";
import { GuentnerLogo } from "@/app/brand";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  const pw = String(formData.get("password") ?? "");
  const ok = await loginWithPassword(pw);
  if (!ok) {
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}

export default async function LoginPage(props: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const sp = await props.searchParams;
  const showError = sp?.error === "1";

  return (
    <main className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <GuentnerLogo subline="FFM 2026 · Marktstand-Quiz" />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <form
          action={loginAction}
          className="w-full max-w-sm space-y-5 bg-white p-10 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <h1 className="headline text-xl">Admin-Login</h1>
            <span className="headline-accent" />
          </div>
          <p className="text-sm text-ink-muted">
            Zum Verwalten der Spiele und Fragen.
          </p>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Passwort
            </span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
            />
          </label>
          {showError && (
            <p className="text-sm text-rose-600">Falsches Passwort.</p>
          )}
          <button
            type="submit"
            className="w-full bg-brand px-4 py-2.5 font-medium text-white transition hover:bg-brand-dark"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  );
}
