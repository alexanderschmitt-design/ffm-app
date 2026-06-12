import { redirect } from "next/navigation";
import { isAdmin, loginWithPassword } from "@/lib/auth";
import { SiteHeader } from "@/app/site-header";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Booth } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("booth") ?? "").trim();
  const pw = String(formData.get("password") ?? "");
  if (!slug) {
    redirect("/admin/login?error=1");
  }
  const ok = await loginWithPassword(slug, pw);
  if (!ok) {
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}

export default async function LoginPage(props: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const sp = await props.searchParams;
  const showError = sp?.error === "1";

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("booths")
    .select("*")
    .order("created_at", { ascending: true });
  const booths = (data ?? []) as Booth[];

  return (
    <main className="flex min-h-dvh flex-col bg-surface-muted">
      <SiteHeader title="Admin" />
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
            Wähle deinen Stand und gib dein Stand-Passwort ein.
          </p>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Stand
            </span>
            <select
              name="booth"
              required
              defaultValue=""
              className="w-full border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand"
            >
              <option value="" disabled>
                Stand wählen…
              </option>
              {booths.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
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
            <p className="text-sm text-rose-600">
              Falsches Passwort oder unbekannter Stand.
            </p>
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
