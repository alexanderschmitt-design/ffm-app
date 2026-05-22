import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { adminBoothSlug } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Game, Question, AnswerOption } from "@/lib/types";

export const dynamic = "force-dynamic";

// Verifies the currently authenticated admin owns the booth that owns this game.
// Throws on mismatch so tampered form submissions can't cross-mutate booths.
async function assertAdminOwnsGame(gameId: string): Promise<void> {
  const slug = await adminBoothSlug();
  if (!slug) throw new Error("Not authenticated");
  const sb = supabaseAdmin();
  const { data: booth } = await sb
    .from("booths")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!booth) throw new Error("Booth not found");
  const { data: game } = await sb
    .from("games")
    .select("booth_id")
    .eq("id", gameId)
    .maybeSingle();
  if (!game || game.booth_id !== booth.id) throw new Error("Forbidden");
}

async function deleteQuestion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  if (!id || !gameId) return;
  await assertAdminOwnsGame(gameId);
  const sb = supabaseAdmin();
  await sb.from("questions").delete().eq("id", id);
  revalidatePath(`/admin/games/${gameId}`);
}

async function deleteGame(formData: FormData) {
  "use server";
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return;
  await assertAdminOwnsGame(gameId);
  const sb = supabaseAdmin();
  await sb.from("games").delete().eq("id", gameId);
  redirect("/admin");
}

async function renameGame(formData: FormData) {
  "use server";
  const gameId = String(formData.get("gameId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!gameId || !name) return;
  await assertAdminOwnsGame(gameId);
  const sb = supabaseAdmin();
  const { error } = await sb.from("games").update({ name }).eq("id", gameId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/${gameId}`);
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
  await assertAdminOwnsGame(gameId);

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

async function updateQuestion(formData: FormData) {
  "use server";
  const questionId = String(formData.get("questionId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const correctIndex = Number(formData.get("correct"));
  const labels = [0, 1, 2].map((i) =>
    String(formData.get(`option_${i}`) ?? "").trim(),
  );
  if (
    !questionId ||
    !gameId ||
    !prompt ||
    labels.some((l) => !l) ||
    ![0, 1, 2].includes(correctIndex)
  ) {
    return;
  }
  await assertAdminOwnsGame(gameId);

  const sb = supabaseAdmin();

  const { error: qErr } = await sb
    .from("questions")
    .update({ prompt })
    .eq("id", questionId);
  if (qErr) throw new Error(qErr.message);

  const { data: existingOptions, error: fetchErr } = await sb
    .from("answer_options")
    .select("id, position")
    .eq("question_id", questionId)
    .order("position", { ascending: true });
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existingOptions || existingOptions.length !== 3) {
    throw new Error("Antwort-Optionen für diese Frage sind in einem inkonsistenten Zustand.");
  }

  for (const opt of existingOptions) {
    const i = opt.position as number;
    const { error: uErr } = await sb
      .from("answer_options")
      .update({
        label: labels[i],
        is_correct: i === correctIndex,
      })
      .eq("id", opt.id);
    if (uErr) throw new Error(uErr.message);
  }

  revalidatePath(`/admin/games/${gameId}`);
  redirect(`/admin/games/${gameId}`);
}

export default async function AdminGameEditor(props: PageProps<"/admin/games/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const editingId =
    typeof searchParams?.edit === "string" ? searchParams.edit : null;

  const adminSlug = await adminBoothSlug();
  if (!adminSlug) redirect("/admin/login");

  const sb = supabaseAdmin();
  const { data: adminBooth } = await sb
    .from("booths")
    .select("id")
    .eq("slug", adminSlug)
    .maybeSingle();
  if (!adminBooth) redirect("/admin/login");

  const [{ data: game }, { data: questions }] = await Promise.all([
    sb.from("games").select("*").eq("id", id).maybeSingle(),
    sb.from("questions").select("*").eq("game_id", id).order("position", { ascending: true }),
  ]);
  // 404 also when game exists but belongs to another booth — don't leak existence.
  if (!game || game.booth_id !== adminBooth.id) notFound();
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
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <Link
            href="/admin"
            className="font-display text-xs uppercase tracking-[0.18em] text-ink-muted hover:text-brand"
          >
            ← zurück zur Übersicht
          </Link>
          <form
            action={renameGame}
            className="mt-3 flex items-baseline gap-3"
          >
            <input type="hidden" name="gameId" value={g.id} />
            <input
              name="name"
              defaultValue={g.name}
              required
              aria-label="Spielname"
              className="headline w-full max-w-md border-0 border-b border-transparent bg-transparent px-0 py-1 text-2xl text-ink outline-none transition hover:border-slate-300 focus:border-brand"
            />
            <button
              type="submit"
              className="font-display text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-brand"
            >
              Umbenennen
            </button>
          </form>
          <span className="headline-accent" />
        </div>
        <div className="flex gap-2">
          <Link
            href={`/present/${g.id}`}
            target="_blank"
            className="bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Stand-Display öffnen ↗
          </Link>
          <form action={deleteGame}>
            <input type="hidden" name="gameId" value={g.id} />
            <button className="border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100">
              Spiel löschen
            </button>
          </form>
        </div>
      </header>

      <section>
        <h2 className="headline text-sm">Fragen ({qs.length})</h2>
        <span className="headline-accent mb-5" />
        {qs.length === 0 ? (
          <p className="text-ink-muted">Noch keine Fragen. Lege unten die erste an.</p>
        ) : (
          <ul className="space-y-3">
            {enriched.map(({ q, options: opts, playUrl, qr }, i) =>
              editingId === q.id ? (
                <li
                  key={q.id}
                  className="bg-white p-6 shadow-sm ring-2 ring-brand"
                >
                  <div className="font-display text-xs uppercase tracking-wider text-brand">
                    Frage {i + 1} · bearbeiten
                  </div>
                  <form action={updateQuestion} className="mt-3 space-y-4">
                    <input type="hidden" name="questionId" value={q.id} />
                    <input type="hidden" name="gameId" value={g.id} />
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                        Frage-Text
                      </span>
                      <textarea
                        name="prompt"
                        required
                        rows={2}
                        defaultValue={q.prompt}
                        className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
                      />
                    </label>
                    <fieldset className="space-y-2">
                      <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
                        Antwort-Optionen
                      </legend>
                      {[0, 1, 2].map((idx) => {
                        const existing = opts.find((o) => o.position === idx);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="correct"
                              value={idx}
                              required
                              defaultChecked={existing?.is_correct ?? false}
                              className="h-4 w-4 accent-brand"
                              aria-label={`Option ${idx + 1} ist korrekt`}
                            />
                            <input
                              name={`option_${idx}`}
                              required
                              defaultValue={existing?.label ?? ""}
                              placeholder={`Option ${idx + 1}`}
                              className="flex-1 border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
                            />
                          </div>
                        );
                      })}
                      <p className="text-xs text-ink-muted">
                        Radio-Button neben der korrekten Antwort wählen.
                      </p>
                    </fieldset>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
                      >
                        Speichern
                      </button>
                      <Link
                        href={`/admin/games/${g.id}`}
                        className="border border-slate-300 px-5 py-2.5 text-sm font-medium text-ink-muted hover:border-brand hover:text-brand"
                      >
                        Abbrechen
                      </Link>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={q.id}
                  className="grid grid-cols-[1fr_140px] gap-4 bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div>
                    <div className="font-display text-xs uppercase tracking-wider text-ink-muted">
                      Frage {i + 1}
                    </div>
                    <div className="mt-1 text-lg font-medium">{q.prompt}</div>
                    <ul className="mt-3 space-y-1">
                      {opts.map((o) => (
                        <li key={o.id} className="flex items-center gap-2 text-sm">
                          <span
                            className={`inline-block h-3 w-3 ${
                              o.is_correct ? "bg-accent" : "bg-slate-200"
                            }`}
                          />
                          <span className={o.is_correct ? "font-medium" : ""}>{o.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
                      <span className="font-mono">{playUrl}</span>
                      <Link
                        href={`/admin/games/${g.id}?edit=${q.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        Bearbeiten
                      </Link>
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
                    <img src={qr} alt="QR-Code" className="h-32 w-32 ring-1 ring-slate-200" />
                    <span className="text-xs text-ink-muted hover:text-brand">PNG ↓</span>
                  </a>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="headline text-lg">Neue Frage hinzufügen</h2>
        <span className="headline-accent mb-5" />
        <form action={addQuestion} className="mt-5 space-y-4">
          <input type="hidden" name="gameId" value={g.id} />
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Frage-Text
            </span>
            <textarea
              name="prompt"
              required
              rows={2}
              placeholder="z.B. Ordne den Gewinn von 2.000.000 € dem richtigen Land zu."
              className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
              Antwort-Optionen (3 Stück)
            </legend>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct"
                  value={i}
                  required
                  className="h-4 w-4 accent-brand"
                  aria-label={`Option ${i + 1} ist korrekt`}
                />
                <input
                  name={`option_${i}`}
                  required
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
                />
              </div>
            ))}
            <p className="text-xs text-ink-muted">
              Wähle den Radio-Button links neben der korrekten Antwort.
            </p>
          </fieldset>
          <button
            type="submit"
            className="bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
          >
            Frage speichern
          </button>
        </form>
      </section>
    </div>
  );
}
