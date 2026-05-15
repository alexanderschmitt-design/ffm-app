"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Game, AnswerOption } from "@/lib/types";

type PresentationQuestion = {
  id: string;
  slug: string;
  prompt: string;
  position: number;
  qrDataUrl: string;
  playUrl: string;
  options: AnswerOption[];
};

type Props = {
  game: Game;
  questions: PresentationQuestion[];
};

export function PresentClient({ game, questions }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const current: PresentationQuestion | undefined = questions[index];
  const currentId = current?.id;

  // Reset reveal + counts when the active question changes — using the
  // "store previous value" pattern so we don't need an effect for derived state.
  const [trackedId, setTrackedId] = useState<string | undefined>(currentId);
  if (currentId !== trackedId) {
    setTrackedId(currentId);
    setRevealed(false);
    setCounts({});
  }

  const totalAnswers = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  // Realtime subscription on votes for current question
  const channelRef = useRef<ReturnType<ReturnType<typeof supabaseBrowser>["channel"]> | null>(null);
  useEffect(() => {
    if (!currentId) return;
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`votes:${currentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `question_id=eq.${currentId}`,
        },
        (payload) => {
          const optionId = (payload.new as { option_id?: string }).option_id;
          if (!optionId) return;
          setCounts((prev) => ({ ...prev, [optionId]: (prev[optionId] ?? 0) + 1 }));
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentId]);

  // Polling fallback every 2s in case Realtime drops
  useEffect(() => {
    if (!currentId) return;
    const sb = supabaseBrowser();
    const tick = async () => {
      const { data } = await sb.rpc("get_vote_counts", { p_question_id: currentId });
      if (!data) return;
      const next: Record<string, number> = {};
      for (const row of data as { option_id: string; count: number }[]) {
        next[row.option_id] = Number(row.count);
      }
      setCounts((prev) => {
        const sumNext = Object.values(next).reduce((a, b) => a + b, 0);
        const sumPrev = Object.values(prev).reduce((a, b) => a + b, 0);
        return sumNext >= sumPrev ? next : prev;
      });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [currentId]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const toggleReveal = useCallback(() => {
    setRevealed((r) => !r);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggleReveal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggleReveal]);

  if (questions.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-2xl">Dieses Spiel hat noch keine Fragen.</p>
      </main>
    );
  }

  if (!current) return null;

  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex items-baseline justify-between border-b border-slate-800 px-10 py-4">
        <div className="text-sm uppercase tracking-widest text-slate-400">
          {game.name}
        </div>
        <div className="text-sm text-slate-400">
          Frage {index + 1} / {questions.length}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_360px] gap-10 px-10 py-8">
        <section className="flex flex-col gap-8">
          <h1 className="text-5xl font-bold leading-tight">{current.prompt}</h1>

          <ul className="flex flex-col gap-4">
            {current.options.map((o) => {
              const count = counts[o.id] ?? 0;
              const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              const barPct = revealed ? Math.round((count / maxCount) * 100) : 0;
              const highlight = revealed && o.is_correct;
              return (
                <li
                  key={o.id}
                  className={`relative overflow-hidden rounded-xl border px-6 py-5 text-3xl transition ${
                    highlight
                      ? "border-emerald-500 bg-emerald-600/10"
                      : "border-slate-700 bg-slate-900/60"
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${
                      highlight ? "bg-emerald-500/20" : "bg-slate-700/40"
                    }`}
                    style={{ width: revealed ? `${barPct}%` : "0%" }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="font-medium">
                      {highlight && (
                        <span className="mr-3 inline-block rounded bg-emerald-500 px-2 py-1 text-sm font-bold text-emerald-950">
                          ✓
                        </span>
                      )}
                      {o.label}
                    </span>
                    {revealed && (
                      <span className="font-mono text-2xl text-slate-300">
                        {count} <span className="text-base text-slate-500">({pct}%)</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {!revealed && (
            <div className="mt-2 text-2xl text-slate-300">
              Antworten eingegangen:{" "}
              <span className="font-mono text-3xl text-emerald-400">{totalAnswers}</span>
            </div>
          )}
        </section>

        <aside className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-3">
            <Image
              src={current.qrDataUrl}
              alt="QR-Code zur Antwortseite"
              width={320}
              height={320}
              unoptimized
            />
          </div>
          <div className="text-center text-sm text-slate-400">
            Mit dem Handy scannen<br />und antworten
          </div>
          <div className="break-all text-center font-mono text-xs text-slate-500">
            {current.playUrl}
          </div>
        </aside>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-800 px-10 py-4 text-sm text-slate-400">
        <div>
          <kbd className="rounded bg-slate-800 px-2 py-1">←</kbd>{" "}
          <kbd className="rounded bg-slate-800 px-2 py-1">→</kbd> Frage wechseln &middot;{" "}
          <kbd className="rounded bg-slate-800 px-2 py-1">Space</kbd> auflösen
        </div>
        <div className="flex gap-3">
          <button
            onClick={prev}
            disabled={index === 0}
            className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700 disabled:opacity-40"
          >
            ← Zurück
          </button>
          <button
            onClick={toggleReveal}
            className={`rounded px-4 py-2 font-medium ${
              revealed ? "bg-slate-700 hover:bg-slate-600" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {revealed ? "Verbergen" : "Auflösen"}
          </button>
          <button
            onClick={next}
            disabled={index === questions.length - 1}
            className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700 disabled:opacity-40"
          >
            Weiter →
          </button>
        </div>
      </footer>
    </main>
  );
}
