"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { SiteHeader, titleForBoothSlug } from "@/app/site-header";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Game, AnswerOption } from "@/lib/types";

type PresentationQuestion = {
  id: string;
  slug: string;
  prompt: string;
  position: number;
  image_url: string | null;
  qrDataUrl: string;
  playUrl: string;
  options: AnswerOption[];
};

type Props = {
  game: Game;
  questions: PresentationQuestion[];
  boothSlug?: string | null;
};

export function PresentClient({ game, questions, boothSlug }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const current: PresentationQuestion | undefined = questions[index];
  const currentId = current?.id;

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
      <main className="flex min-h-dvh items-center justify-center bg-white text-ink">
        <p className="text-2xl">This game doesn&apos;t have any questions yet.</p>
      </main>
    );
  }

  if (!current) return null;

  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <main className="flex min-h-dvh flex-col bg-white text-ink">
      <SiteHeader
        title={titleForBoothSlug(boothSlug)}
        action={
          <div className="flex w-full items-center justify-between">
            <span className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
              {game.name}
            </span>
            <span className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
              Question {index + 1} / {questions.length}
            </span>
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-[1fr_360px] gap-12 px-12 py-10">
        <section className="flex flex-col gap-8">
          <div>
            <h1 className="text-5xl font-semibold leading-tight">{current.prompt}</h1>
            <span className="headline-accent mt-4 !w-16 !h-[3px]" />
          </div>

          {current.image_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={current.image_url}
              alt=""
              className="max-h-[40vh] w-auto object-contain"
            />
          )}

          <ul className="flex flex-col gap-4">
            {current.options.map((o) => {
              const count = counts[o.id] ?? 0;
              const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
              const barPct = revealed ? Math.round((count / maxCount) * 100) : 0;
              const highlight = revealed && o.is_correct;
              return (
                <li
                  key={o.id}
                  className={`relative overflow-hidden border px-6 py-5 text-3xl transition ${
                    highlight
                      ? "border-accent bg-accent/10"
                      : "border-slate-200 bg-surface-muted"
                  }`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${
                      highlight ? "bg-accent/30" : "bg-brand/20"
                    }`}
                    style={{ width: revealed ? `${barPct}%` : "0%" }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="font-medium">
                      {highlight && (
                        <span className="mr-3 inline-block bg-accent px-2 py-1 text-sm font-bold text-white">
                          ✓
                        </span>
                      )}
                      {o.label}
                    </span>
                    {revealed && (
                      <span className="font-mono text-2xl text-ink">
                        {count}{" "}
                        <span className="text-base text-ink-muted">({pct}%)</span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {!revealed && (
            <div className="mt-2 text-2xl text-ink-muted">
              Answers received:{" "}
              <span className="font-mono text-3xl text-brand">{totalAnswers}</span>
            </div>
          )}
        </section>

        <aside className="flex flex-col items-center gap-4">
          <div className="border border-slate-200 bg-white p-3">
            <Image
              src={current.qrDataUrl}
              alt="QR code to answer screen"
              width={320}
              height={320}
              unoptimized
            />
          </div>
          <div className="font-display text-center text-xs uppercase tracking-[0.18em] text-ink-muted">
            Scan with your phone<br />and answer
          </div>
          <div className="break-all text-center font-mono text-xs text-ink-muted">
            {current.playUrl}
          </div>
        </aside>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-surface-muted px-12 py-4 text-sm text-ink-muted">
        <div className="font-display text-xs uppercase tracking-[0.18em]">
          <kbd className="border border-slate-300 bg-white px-2 py-1">←</kbd>{" "}
          <kbd className="border border-slate-300 bg-white px-2 py-1">→</kbd>{" "}
          Change question &middot;{" "}
          <kbd className="border border-slate-300 bg-white px-2 py-1">Space</kbd>{" "}
          reveal
        </div>
        <div className="flex gap-3">
          <button
            onClick={prev}
            disabled={index === 0}
            className="border border-slate-300 bg-white px-5 py-2 hover:border-brand hover:text-brand disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            onClick={toggleReveal}
            className={`px-5 py-2 font-medium ${
              revealed
                ? "border border-slate-300 bg-white hover:border-brand"
                : "bg-accent text-white hover:bg-accent/85"
            }`}
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button
            onClick={next}
            disabled={index === questions.length - 1}
            className="bg-brand px-5 py-2 text-white hover:bg-brand-dark disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </footer>
    </main>
  );
}
