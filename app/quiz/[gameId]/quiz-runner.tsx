"use client";

import { useState } from "react";

type Option = { id: string; label: string; position: number; is_correct: boolean };
type Q = { id: string; prompt: string; options: Option[] };

export type QuizBonus = {
  teaserSrc: string;
  teaserAlt: string;
  headline: string;
  body: string;
  downloadHref: string;
  downloadLabel: string;
  downloadFilename: string;
};

type Answer = {
  questionId: string;
  prompt: string;
  picked: Option;
  correct: Option;
  isCorrect: boolean;
};

export function QuizRunner({
  questions,
  bonus,
}: {
  questions: Q[];
  bonus?: QuizBonus;
}) {
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center text-center text-ink-muted">
        <p>This game doesn&apos;t have any questions yet.</p>
      </section>
    );
  }

  if (index >= questions.length) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    return (
      <section className="mt-2 flex flex-1 flex-col gap-5" aria-live="polite">
        <div className="flex flex-col items-center bg-surface-muted p-6 text-center">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
            Your result
          </p>
          <p className="mt-2 text-5xl font-semibold text-brand">
            {correctCount}{" "}
            <span className="text-2xl text-ink-muted">/ {answers.length}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">correct</p>
        </div>

        <ol className="flex flex-col gap-3">
          {answers.map((a, i) => (
            <li
              key={a.questionId}
              className={`border-l-4 p-4 ${
                a.isCorrect
                  ? "border-accent bg-accent/5"
                  : "border-rose-500 bg-rose-50"
              }`}
            >
              <div className="font-display text-[10px] uppercase tracking-wider text-ink-muted">
                Question {i + 1}
              </div>
              <div className="mt-1 font-medium">{a.prompt}</div>
              <div className="mt-2 text-sm">
                <span className="text-ink-muted">Your answer: </span>
                <span
                  className={
                    a.isCorrect
                      ? "font-semibold text-accent"
                      : "font-semibold text-rose-600"
                  }
                >
                  {a.picked.label}
                </span>
              </div>
              {!a.isCorrect && (
                <div className="text-sm">
                  <span className="text-ink-muted">Correct answer: </span>
                  <span className="font-semibold text-ink">{a.correct.label}</span>
                </div>
              )}
            </li>
          ))}
        </ol>

        {bonus && (
          <section className="mt-4 overflow-hidden border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bonus.teaserSrc}
              alt={bonus.teaserAlt}
              className="block h-auto w-full"
            />
            <div className="p-5">
              <h3 className="headline text-lg">{bonus.headline}</h3>
              <span className="headline-accent" />
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                {bonus.body}
              </p>
              <a
                href={bonus.downloadHref}
                download={bonus.downloadFilename}
                className="mt-5 inline-flex items-center gap-2 bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent/85"
              >
                {bonus.downloadLabel} ↓
              </a>
            </div>
          </section>
        )}

        <button
          onClick={() => {
            setIndex(0);
            setAnswers([]);
            setError(null);
          }}
          className="mt-2 bg-brand px-5 py-3 text-base font-medium text-white transition hover:bg-brand-dark"
        >
          Play again
        </button>
      </section>
    );
  }

  const q = questions[index];
  const currentAnswer = answers[index];

  async function submit(option: Option) {
    if (pending || currentAnswer) return;
    setError(null);
    setPending(option.id);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, optionId: option.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const correct = q.options.find((o) => o.is_correct) ?? option;
      const answer: Answer = {
        questionId: q.id,
        prompt: q.prompt,
        picked: option,
        correct,
        isCorrect: option.id === correct.id,
      };
      setAnswers((prev) => [...prev, answer]);
      setPending(null);
    } catch (e) {
      console.error(e);
      setError("Couldn't send your answer. Please try again.");
      setPending(null);
    }
  }

  return (
    <section className="mt-2 flex flex-1 flex-col gap-4">
      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        Question {index + 1} / {questions.length}
      </div>
      <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
        {q.prompt}
      </h2>
      <span className="headline-accent" />

      {currentAnswer ? (
        <>
          <div
            className={`mt-3 flex flex-col gap-2 p-5 text-center ${
              currentAnswer.isCorrect
                ? "bg-accent/10 ring-2 ring-accent"
                : "bg-rose-50 ring-2 ring-rose-500"
            }`}
          >
            <div
              className={`headline text-2xl ${
                currentAnswer.isCorrect ? "text-accent" : "text-rose-600"
              }`}
            >
              {currentAnswer.isCorrect ? "Correct!" : "Not quite."}
            </div>
            {!currentAnswer.isCorrect && (
              <div className="text-base">
                Correct answer:{" "}
                <span className="font-semibold">{currentAnswer.correct.label}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIndex(index + 1)}
            className="mt-2 bg-brand px-5 py-4 text-lg font-medium text-white transition hover:bg-brand-dark"
          >
            {index + 1 < questions.length
              ? "Next question →"
              : "See result →"}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {q.options.map((o) => (
            <button
              key={o.id}
              onClick={() => submit(o)}
              disabled={pending !== null}
              className="flex min-h-[72px] w-full items-center justify-center bg-brand px-4 py-4 text-lg font-medium text-white transition active:scale-[0.98] hover:bg-brand-dark disabled:opacity-50"
            >
              {pending === o.id ? "Sending…" : o.label}
            </button>
          ))}
          {error && (
            <p className="mt-2 text-center text-sm text-rose-600">{error}</p>
          )}
        </div>
      )}
    </section>
  );
}
