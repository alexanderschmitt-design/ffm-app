import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { adminBoothSlug } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Game, Question, AnswerOption } from "@/lib/types";
import { GPC_CATEGORIES } from "@/lib/gpc-categories";
import { OptionsEditor } from "./options-editor";

export const dynamic = "force-dynamic";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);
const STORAGE_BUCKET = "question-images";
const STORAGE_PATH_MARKER = `/object/public/${STORAGE_BUCKET}/`;

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

function readOptionLabels(formData: FormData): string[] {
  return formData
    .getAll("option_label")
    .map((v) => String(v).trim());
}

function validateOptions(labels: string[], correctIndex: number): void {
  if (labels.length < MIN_OPTIONS || labels.length > MAX_OPTIONS) {
    throw new Error(
      `Bitte zwischen ${MIN_OPTIONS} und ${MAX_OPTIONS} Antwortoptionen angeben.`,
    );
  }
  if (labels.some((l) => !l)) {
    throw new Error("Antwortoptionen dürfen nicht leer sein.");
  }
  if (
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= labels.length
  ) {
    throw new Error("Bitte eine korrekte Antwort auswählen.");
  }
}

async function uploadQuestionImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Nicht unterstütztes Bildformat.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Bild zu groß (max 20 MB).");
  }
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "bin").toLowerCase();
  const path = `${nanoid(16)}.${ext}`;
  const sb = supabaseAdmin();
  const { error } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(STORAGE_PATH_MARKER);
  return i === -1 ? null : url.slice(i + STORAGE_PATH_MARKER.length);
}

async function deleteStorageObjectByUrl(url: string | null | undefined): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  const sb = supabaseAdmin();
  // Best-effort: ignore Storage errors so DB consistency wins.
  await sb.storage.from(STORAGE_BUCKET).remove([path]);
}

async function deleteQuestion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  if (!id || !gameId) return;
  await assertAdminOwnsGame(gameId);
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("questions")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  await sb.from("questions").delete().eq("id", id);
  if (existing?.image_url) {
    await deleteStorageObjectByUrl(existing.image_url as string);
  }
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
  const labels = readOptionLabels(formData);
  if (!gameId || !prompt) return;
  validateOptions(labels, correctIndex);
  await assertAdminOwnsGame(gameId);

  const imageEntry = formData.get("image");
  const imageFile =
    imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const imageUrl = imageFile ? await uploadQuestionImage(imageFile) : null;

  // Only the GPC form renders the dropdown; for other booths "category" is
  // absent and stays null.
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = categoryRaw && (GPC_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? categoryRaw
    : null;

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
      image_url: imageUrl,
      category,
    })
    .select("id")
    .single();
  if (qErr || !q) {
    // Roll back the uploaded blob so we don't leave orphans in storage.
    if (imageUrl) await deleteStorageObjectByUrl(imageUrl);
    throw new Error(qErr?.message ?? "Frage konnte nicht angelegt werden.");
  }

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
  const labels = readOptionLabels(formData);
  const removeImage = formData.get("remove_image") === "on";
  if (!questionId || !gameId || !prompt) return;
  validateOptions(labels, correctIndex);
  await assertAdminOwnsGame(gameId);

  const sb = supabaseAdmin();

  const { data: current, error: curErr } = await sb
    .from("questions")
    .select("image_url")
    .eq("id", questionId)
    .maybeSingle();
  if (curErr) throw new Error(curErr.message);

  const imageEntry = formData.get("image");
  const imageFile =
    imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

  let nextImageUrl: string | null | undefined = undefined; // undefined = keep
  let uploadedThisCall: string | null = null;
  if (imageFile) {
    const url = await uploadQuestionImage(imageFile);
    uploadedThisCall = url;
    nextImageUrl = url;
  } else if (removeImage) {
    nextImageUrl = null;
  }

  const updatePayload: Record<string, unknown> = { prompt };
  if (nextImageUrl !== undefined) updatePayload.image_url = nextImageUrl;

  // Only persist category when the form actually rendered the dropdown
  // (GPC admin). Empty string from the "— keine —" option clears it to null.
  if (formData.has("category")) {
    const categoryRaw = String(formData.get("category") ?? "").trim();
    updatePayload.category =
      categoryRaw && (GPC_CATEGORIES as readonly string[]).includes(categoryRaw)
        ? categoryRaw
        : null;
  }

  const { error: qErr } = await sb
    .from("questions")
    .update(updatePayload)
    .eq("id", questionId);
  if (qErr) {
    if (uploadedThisCall) await deleteStorageObjectByUrl(uploadedThisCall);
    throw new Error(qErr.message);
  }

  // Old image cleanup (after successful DB update so we don't strand the row).
  if (nextImageUrl !== undefined && current?.image_url) {
    await deleteStorageObjectByUrl(current.image_url as string);
  }

  // Diff-based option update: keep IDs stable where possible so historical
  // vote rows remain linked instead of cascading away on a delete-and-reinsert.
  const { data: existingOptions, error: fetchErr } = await sb
    .from("answer_options")
    .select("id, position")
    .eq("question_id", questionId)
    .order("position", { ascending: true });
  if (fetchErr) throw new Error(fetchErr.message);

  const existing = existingOptions ?? [];
  const max = Math.max(existing.length, labels.length);
  for (let i = 0; i < max; i++) {
    const newLabel = labels[i];
    const existingRow = existing[i];
    if (newLabel !== undefined && existingRow) {
      const { error: uErr } = await sb
        .from("answer_options")
        .update({
          label: newLabel,
          is_correct: i === correctIndex,
          position: i,
        })
        .eq("id", existingRow.id);
      if (uErr) throw new Error(uErr.message);
    } else if (newLabel !== undefined) {
      const { error: iErr } = await sb.from("answer_options").insert({
        question_id: questionId,
        label: newLabel,
        is_correct: i === correctIndex,
        position: i,
      });
      if (iErr) throw new Error(iErr.message);
    } else if (existingRow) {
      const { error: dErr } = await sb
        .from("answer_options")
        .delete()
        .eq("id", existingRow.id);
      if (dErr) throw new Error(dErr.message);
    }
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
                  <form
                    action={updateQuestion}
                    encType="multipart/form-data"
                    className="mt-3 space-y-4"
                  >
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

                    <div className="space-y-2">
                      <span className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                        Bild (optional, nur Moderator-Screen · max 20 MB)
                      </span>
                      {q.image_url && (
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={q.image_url}
                            alt=""
                            className="h-20 w-auto border border-slate-200 object-contain"
                          />
                          <label className="flex items-center gap-2 text-sm text-ink-muted">
                            <input
                              type="checkbox"
                              name="remove_image"
                              className="h-4 w-4 accent-brand"
                            />
                            Bild entfernen
                          </label>
                        </div>
                      )}
                      <input
                        type="file"
                        name="image"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
                        className="block w-full text-sm text-ink-muted file:mr-3 file:cursor-pointer file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
                      />
                      {q.image_url && (
                        <p className="text-xs text-ink-muted">
                          Neue Datei ersetzt das vorhandene Bild.
                        </p>
                      )}
                    </div>

                    {adminSlug === "gpc" && (
                      <label className="block">
                        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                          Kategorie (GPC-Workflow)
                        </span>
                        <select
                          name="category"
                          defaultValue={q.category ?? ""}
                          className="w-full border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand"
                        >
                          <option value="">— keine —</option>
                          {GPC_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <OptionsEditor
                      initialLabels={opts
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((o) => o.label)}
                      initialCorrectIndex={Math.max(
                        0,
                        opts
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .findIndex((o) => o.is_correct),
                      )}
                    />

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
                    <div className="mt-1 flex items-start gap-4">
                      {q.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={q.image_url}
                          alt=""
                          className="h-16 w-16 flex-shrink-0 border border-slate-200 object-cover"
                        />
                      )}
                      <div className="text-lg font-medium">{q.prompt}</div>
                    </div>
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
        <form
          action={addQuestion}
          encType="multipart/form-data"
          className="mt-5 space-y-4"
        >
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

          <div className="space-y-2">
            <span className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Bild (optional, nur Moderator-Screen · max 20 MB)
            </span>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
              className="block w-full text-sm text-ink-muted file:mr-3 file:cursor-pointer file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
            />
          </div>

          {adminSlug === "gpc" && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                Kategorie (GPC-Workflow)
              </span>
              <select
                name="category"
                defaultValue=""
                className="w-full border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand"
              >
                <option value="">— keine —</option>
                {GPC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          <OptionsEditor />

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
