import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createGameAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("games")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/games/${data.id}`);
}

export default async function AdminGamesList() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });
  const games = (data ?? []) as Game[];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Neues Spiel anlegen</h2>
        <form action={createGameAction} className="flex gap-3">
          <input
            name="name"
            required
            placeholder="z.B. Kongress 2026"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            Anlegen
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Vorhandene Spiele</h2>
        {games.length === 0 ? (
          <p className="text-slate-500">Noch keine Spiele vorhanden.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {games.map((g) => (
              <li key={g.id} className="flex items-center justify-between p-4">
                <div>
                  <Link href={`/admin/games/${g.id}`} className="font-medium hover:underline">
                    {g.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {new Date(g.created_at).toLocaleString("de-DE")} · {g.status}
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/present/${g.id}`}
                    target="_blank"
                    className="rounded-lg bg-slate-100 px-3 py-1 hover:bg-slate-200"
                  >
                    Beamer öffnen ↗
                  </Link>
                  <Link
                    href={`/admin/games/${g.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-white hover:bg-slate-700"
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
