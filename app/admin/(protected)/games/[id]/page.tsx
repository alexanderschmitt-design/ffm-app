import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Game, Question, AnswerOption } from "@/lib/types";

export const dynamic = "force-dynamic";

async function deleteQuestion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  if (!id || !gameId) return;
  const sb = supabaseAdmin();
  await sb.from("questions").delete().eq("id", id);
  revalidatePath(`/admin/games/${gameId}`);
}

async function deleteGame(formData: FormData) {
  "use server";
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return;
  const sb = supabaseAdmin();
  await sb.from("games").delete().eq("id", gameId);
  redirect("/admin");
}

async function addQuestion(formData: FormData) {
  "use server";
  const gameId = String(formData.get("gameId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const correctIndex = Number(formData.get("correct"));
  const labels = [0, 1, 2].map((i) =>
    String(formData.get(`option_${i}`) ?? "").trim(),
  );
  if (!gameId || !prompt || labels.some((l) => !l) || ![0, 1, 2].includes(correctIndex)) {
    return;
  }

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("questions")
    .select("position")
    .eq("game_id", gameId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data: q, error: qErr } = await sb
    .from("questions")
    .insert({
      game_id: gameId,
      slug: nanoid(10),
      position: nextPos,
      prompt,
    })
    .select("id")
    .single();
  if (qErr || !q) throw new Error(qErr?.message ?? "Frage konnte nicht angelegt werden.");

  const optionsPayload = labels.map((label, i) => ({
    question_id: q.id,
    label,
    is_correct: i === correctIndex,
    position: i,
  }));
  const { error: oErr } = await sb.from("answer_options").insert(optionsPayload);
  if (oErr) throw new Error(oErr.message);

  revalidatePath(`/admin/games/${gameId}`);
}

export default async function AdminGameEditor(props: PageProps<"/admin/games/[id]">) {
  const { id } = await props.params;
  const sb = supabaseAdmin();

  const [{ data: game }, { data: questions }] = await Promise.all([
    sb.from("games").select("*").eq("id", id).maybeSingle(),
    sb.from("questions").select("*").eq("game_id", id).order("position", { ascending: true }),
  ]);
  if (!game) notFound();
  const qs = (questions ?? []) as Question[];

  const ids = qs.map((q) => q.id);
  let options: AnswerOption[] = [];
  if (ids.length > 0) {
    const { data } = await sb
      .from("answer_options")
      .select("*")
      .in("question_id", ids)
      .order("position", { ascending: true });
    options = (data ?? []) as AnswerOption[];
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  const baseUrl = `${proto}://${host}`;

  const enriched = await Promise.all(
    qs.map(async (q) => ({
      q,
      options: options.filter((o) => o.question_id === q.id),
      playUrl: `${baseUrl}/play/${q.slug}`,
      qr: await qrDataUrl(`${baseUrl}/play/${q.slug}`),
    })),
  );
  const g = game as Game;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/admin" className="text-sm text-slate-500 hover:underline">
            ← zurück zur Übersicht
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{g.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/present/${g.id}`}
            target="_blank"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Beamer öffnen ↗
          </Link>
          <form action={deleteGame}>
            <input type="hidden" name="gameId" value={g.id} />
            <button className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
              Spiel löschen
            </button>
          </form>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Fragen ({qs.length})
        </h2>
        {qs.length === 0 ? (
          <p className="text-slate-500">Noch keine Fragen. Lege unten die erste an.</p>
        ) : (
          <ul className="space-y-3">
            {enriched.map(({ q, options: opts, playUrl, qr }, i) => (
              <li
                key={q.id}
                className="grid grid-cols-[1fr_140px] gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Frage {i + 1}
                  </div>
                  <div className="mt-1 text-lg font-medium">{q.prompt}</div>
                  <ul className="mt-3 space-y-1">
                    {opts.map((o) => (
                      <li key={o.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-block h-4 w-4 rounded-full ${
                            o.is_correct ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                        <span className={o.is_correct ? "font-medium" : ""}>{o.label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{playUrl}</span>
                    <form action={deleteQuestion} className="inline">
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="gameId" value={g.id} />
                      <button className="text-rose-600 hover:underline">Löschen</button>
                    </form>
                  </div>
                </div>
                <a
                  href={qr}
                  download={`qr-${q.slug}.png`}
                  title="QR-Code herunterladen"
                  className="flex flex-col items-center gap-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR-Code" className="h-32 w-32 rounded-lg ring-1 ring-slate-200" />
                  <span className="text-xs text-slate-500 hover:underline">PNG ↓</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Neue Frage hinzufügen</h2>
        <form action={addQuestion} className="space-y-4">
          <input type="hidden" name="gameId" value={g.id} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Frage-Text</span>
            <textarea
              name="prompt"
              required
              rows={2}
              placeholder="z.B. Ordne den Gewinn von 2.000.000 € dem richtigen Land zu."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Antwort-Optionen (3 Stück)</legend>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct"
                  value={i}
                  required
                  className="h-4 w-4"
                  aria-label={`Option ${i + 1} ist korrekt`}
                />
                <input
                  name={`option_${i}`}
                  required
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Wähle den Radio-Button links neben der korrekten Antwort.
            </p>
          </fieldset>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            Frage speichern
          </button>
        </form>
      </section>
    </div>
  );
}
