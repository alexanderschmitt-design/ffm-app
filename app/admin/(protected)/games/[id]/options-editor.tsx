"use client";

import { useState } from "react";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

type Props = {
  initialLabels?: string[];
  initialCorrectIndex?: number;
};

export function OptionsEditor({
  initialLabels,
  initialCorrectIndex = 0,
}: Props) {
  const starting =
    initialLabels && initialLabels.length >= MIN_OPTIONS
      ? initialLabels.slice(0, MAX_OPTIONS)
      : ["", "", ""];
  const [labels, setLabels] = useState<string[]>(starting);
  const [correctIndex, setCorrectIndex] = useState<number>(
    Math.min(initialCorrectIndex, starting.length - 1),
  );

  function updateLabel(i: number, value: string) {
    setLabels((prev) => prev.map((l, idx) => (idx === i ? value : l)));
  }

  function addRow() {
    if (labels.length >= MAX_OPTIONS) return;
    setLabels((prev) => [...prev, ""]);
  }

  function removeRow(i: number) {
    if (labels.length <= MIN_OPTIONS) return;
    setLabels((prev) => prev.filter((_, idx) => idx !== i));
    setCorrectIndex((prev) => {
      if (prev === i) return 0;
      if (prev > i) return prev - 1;
      return prev;
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
        Antwort-Optionen ({labels.length} · min {MIN_OPTIONS}, max {MAX_OPTIONS})
      </legend>
      {labels.map((label, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <input
            type="radio"
            name="correct"
            value={idx}
            checked={correctIndex === idx}
            onChange={() => setCorrectIndex(idx)}
            required
            className="h-4 w-4 accent-brand"
            aria-label={`Option ${idx + 1} ist korrekt`}
          />
          <input
            name="option_label"
            required
            value={label}
            onChange={(e) => updateLabel(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
            className="flex-1 border border-slate-300 px-3 py-2.5 outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => removeRow(idx)}
            disabled={labels.length <= MIN_OPTIONS}
            aria-label={`Option ${idx + 1} entfernen`}
            className="flex h-9 w-9 items-center justify-center border border-slate-300 text-lg leading-none text-ink-muted hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-ink-muted"
          >
            −
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addRow}
          disabled={labels.length >= MAX_OPTIONS}
          className="flex items-center gap-2 border border-slate-300 px-3 py-1.5 text-sm text-ink-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-ink-muted"
        >
          <span className="text-lg leading-none">+</span> Option hinzufügen
        </button>
        <p className="text-xs text-ink-muted">
          Radio-Button links neben der korrekten Antwort wählen.
        </p>
      </div>
    </fieldset>
  );
}
