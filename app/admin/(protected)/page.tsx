import Link from "next/link";
import { redirect } from "next/navigation";
import { adminBoothSlug } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createGameAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const slug = await adminBoothSlug();
  if (!slug) redirect("/admin/login");

  const sb = supabaseAdmin();
  const { data: booth } = await sb
    .from("booths")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!booth) redirect("/admin/login");

  const { data, error } = await sb
    .from("games")
    .insert({ name, booth_id: booth.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/games/${data.id}`);
}

export default async function AdminGamesList() {
  const slug = await adminBoothSlug();
  if (!slug) redirect("/admin/login");

  const sb = supabaseAdmin();
  const { data: booth } = await sb
    .from("booths")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!booth) redirect("/admin/login");

  const { data } = await sb
    .from("games")
    .select("*")
    .eq("booth_id", booth.id)
    .order("created_at", { ascending: false });
  const games = (data ?? []) as Game[];

  return (
    <div className="space-y-10">
      <section className="bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="headline text-lg">Neues Spiel anlegen</h2>
        <span className="headline-accent mb-5" />
        <form action={createGameAction} className="mt-5 flex gap-3">
          <input
            name="name"
            required
            placeholder="z.B. Tax Sudoku — FFM 2026"
            className="flex-1 border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark"
          >
            Anlegen
          </button>
        </form>
      </section>

      <section>
        <h2 className="headline text-lg">Vorhandene Spiele</h2>
        <span className="headline-accent mb-5" />
        {games.length === 0 ? (
          <p className="mt-4 text-ink-muted">Noch keine Spiele für diesen Stand.</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-200 overflow-hidden bg-white ring-1 ring-slate-200">
            {games.map((g) => (
              <li key={g.id} className="flex items-center justify-between p-5">
                <div>
                  <Link
                    href={`/admin/games/${g.id}`}
                    className="font-medium text-ink hover:text-brand"
                  >
                    {g.name}
                  </Link>
                  <div className="font-display mt-1 text-xs uppercase tracking-wider text-ink-muted">
                    {new Date(g.created_at).toLocaleString("de-DE")} · {g.status}
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/present/${g.id}`}
                    target="_blank"
                    className="border border-slate-300 px-4 py-2 text-ink hover:border-brand hover:text-brand"
                  >
                    Stand-Display öffnen ↗
                  </Link>
                  <Link
                    href={`/admin/games/${g.id}`}
                    className="bg-brand px-4 py-2 text-white hover:bg-brand-dark"
                  >
                    Bearbeiten
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
