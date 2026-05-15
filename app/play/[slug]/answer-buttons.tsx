"use client";

import { useState } from "react";

type Option = { id: string; label: string; position: number; is_correct: boolean };

type Result = { picked: Option; correct: Option } | null;

export function AnswerButtons({ questionId, options }: { questionId: string; options: Option[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(option: Option) {
    if (pending || result) return;
    setError(null);
    setPending(option.id);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, optionId: option.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const correct = options.find((o) => o.is_correct) ?? option;
      setResult({ picked: option, correct });
    } catch (e) {
      console.error(e);
      setError("Konnte die Antwort nicht senden. Bitte nochmal versuchen.");
      setPending(null);
    }
  }

  if (result) {
    const isRight = result.picked.id === result.correct.id;
    return (
      <section
        className={`mt-4 flex flex-1 flex-col justify-center gap-6 rounded-2xl p-6 text-center ${
          isRight ? "bg-emerald-600/20 ring-2 ring-emerald-500" : "bg-rose-600/20 ring-2 ring-rose-500"
        }`}
        aria-live="polite"
      >
        <div
          className={`text-5xl font-bold sm:text-6xl ${
            isRight ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {isRight ? "Richtig!" : "Leider falsch."}
        </div>
        {!isRight && (
          <div className="text-lg text-slate-200">
            Richtig wäre gewesen:{" "}
            <span className="font-semibold text-white">{result.correct.label}</span>
          </div>
        )}
        <div className="text-sm text-slate-400">
          Auf der Bühne geht&apos;s gleich weiter — der Moderator löst auf.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-2 flex flex-1 flex-col gap-3">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => submit(o)}
          disabled={pending !== null}
          className="flex min-h-[88px] w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-4 text-xl font-medium text-slate-50 ring-1 ring-slate-700 transition active:scale-[0.98] hover:bg-slate-700 disabled:opacity-50"
        >
          {pending === o.id ? "Sende…" : o.label}
        </button>
      ))}
      {error && <p className="mt-2 text-center text-sm text-rose-400">{error}</p>}
    </section>
  );
}
