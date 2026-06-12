"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ResultAnswer = {
  category?: string | null;
  prompt: string;
  pickedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
};

export type ResultBonus = {
  downloads: Array<{ href: string; filename: string; label: string }>;
};

const FALLBACK_DOWNLOADS = [
  {
    href: "/Guentner_building_instructions.pdf",
    filename: "Guentner_building_instructions.pdf",
    label: "Download Building Plan",
  },
];

const BAR_DURATION_MS = 1600;
const CONFETTI_START_MS = 1700;
const CONFETTI_LIFE_MS = 2200;
// Final view fades in right after the confetti burst clears.
const FINAL_VIEW_DELAY_MS = CONFETTI_START_MS + CONFETTI_LIFE_MS - 200;
const PASS_THRESHOLD = 4;

const CONFETTI_COLORS = [
  "#2666e1",
  "#1abc9c",
  "#F2701D",
  "#f5c518",
  "#e63946",
];

const MOCK_QUESTIONS = [
  {
    category: "CAD Design",
    prompt: "Which CAD system does Güntner use for product design?",
    correctAnswer: "Siemens Solid Edge",
  },
  {
    category: "Articles / Items",
    prompt: "Where are master article data managed at Güntner?",
    correctAnswer: "CONTACT Software PDM",
  },
  {
    category: "Product Knowledge and Rules",
    prompt: "Which system stores Güntner's configurable product rules?",
    correctAnswer: "KDB — Knowledge Database",
  },
  {
    category: "Sales Configuration",
    prompt: "Which configurator do sales teams use to specify dry coolers?",
    correctAnswer: "myGPC",
  },
  {
    category: "Production Configuration",
    prompt: "Which ERP generates the Bill of Materials for production?",
    correctAnswer: "Infor LN with PCF",
  },
  {
    category: "CAD Configuration",
    prompt: "What document is automatically generated for the customer?",
    correctAnswer: "Customer Drawing (PDF / DWG)",
  },
];

export function ResultAnimation({
  correct,
  total,
  quizAnswers,
  bonus,
  onPlayAgain,
}: {
  correct: number;
  total: number;
  quizAnswers?: ResultAnswer[];
  bonus?: ResultBonus;
  onPlayAgain?: () => void;
}) {
  const effectiveTotal = quizAnswers?.length ?? total;
  const effectiveCorrect = quizAnswers
    ? quizAnswers.filter((a) => a.isCorrect).length
    : correct;
  const target = effectiveTotal > 0 ? (effectiveCorrect / effectiveTotal) * 100 : 0;
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);
  const [finalView, setFinalView] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(() => setProgress(target), 50);
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [target]);

  useEffect(() => {
    if (effectiveCorrect <= 0) return;
    const step = BAR_DURATION_MS / effectiveCorrect;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= effectiveCorrect) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, [effectiveCorrect]);

  useEffect(() => {
    const id = setTimeout(() => setFinalView(true), FINAL_VIEW_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const legoRef = useRef<HTMLDivElement>(null);
  const [confettiOn, setConfettiOn] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const startId = setTimeout(() => {
      const el = legoRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setConfettiOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      setConfettiOn(true);
    }, CONFETTI_START_MS);
    const stopId = setTimeout(
      () => setConfettiOn(false),
      CONFETTI_START_MS + CONFETTI_LIFE_MS,
    );
    return () => {
      clearTimeout(startId);
      clearTimeout(stopId);
    };
  }, []);

  const confettiPieces = useMemo(() => {
    return Array.from({ length: 72 }, (_, i) => {
      const rnd = (seed: number) =>
        ((Math.sin(i * 9301 + seed * 49297) + 1) / 2) % 1;
      const angle = rnd(1) * Math.PI * 2;
      const distance = 220 + rnd(2) * 320;
      const gravity = 60 + rnd(3) * 160;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + gravity;
      const delay = rnd(4) * 80;
      const duration = 700 + rnd(5) * 700;
      const color = CONFETTI_COLORS[Math.floor(rnd(6) * CONFETTI_COLORS.length)];
      const rotateStart = rnd(7) * 360;
      const rotateEnd = rotateStart + (rnd(8) - 0.5) * 1440;
      const width = 6 + rnd(9) * 6;
      const height = 10 + rnd(0) * 8;
      return {
        id: i,
        dx,
        dy,
        delay,
        duration,
        color,
        rotateStart,
        rotateEnd,
        width,
        height,
      };
    });
  }, []);

  const passed = effectiveCorrect >= PASS_THRESHOLD;
  const subline = passed
    ? "Ready to build? Download the official blueprint and pick up your Güntner Flat Compact Kit right here at our booth."
    : "That can be better — we'd be happy to help!";

  const answers = quizAnswers
    ? quizAnswers.map((a, i) => ({
        index: i,
        isCorrect: a.isCorrect,
        category: a.category ?? null,
        prompt: a.prompt,
        pickedAnswer: a.pickedLabel,
        correctAnswer: a.correctLabel,
        showPicked: true,
      }))
    : MOCK_QUESTIONS.slice(0, effectiveTotal).map((q, i) => ({
        index: i,
        isCorrect: i < effectiveCorrect,
        category: q.category as string | null,
        prompt: q.prompt,
        pickedAnswer: "",
        correctAnswer: q.correctAnswer,
        showPicked: false,
      }));

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-2 py-8">
      <style>{`
        @keyframes hero-rise {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-bobble {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        .hero-line-1 {
          opacity: 0;
          animation: hero-rise 500ms ease-out 100ms forwards;
        }
        .hero-line-2 {
          opacity: 0;
          animation: hero-rise 600ms ease-out 450ms forwards;
        }
        .hero-bobble {
          display: inline-block;
          animation: hero-bobble 2.4s ease-in-out 1.2s infinite;
        }
        @keyframes confetti-burst {
          0% {
            transform: translate(-50%, -50%) rotate(var(--rot-start)) scale(0.4);
            opacity: 1;
          }
          8% {
            transform: translate(calc(-50% + (var(--dx) * 0.55)), calc(-50% + (var(--dy) * 0.4))) rotate(calc(var(--rot-start) + (var(--rot-end) - var(--rot-start)) * 0.45)) scale(1.05);
            opacity: 1;
          }
          70% { opacity: 1; }
          100% {
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot-end)) scale(1);
            opacity: 0;
          }
        }
        .confetti-piece {
          position: absolute;
          will-change: transform, opacity;
          animation: confetti-burst var(--dur) cubic-bezier(.08,.9,.25,1)
            var(--delay) both;
        }
      `}</style>

      {confettiOn && confettiOrigin && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          {confettiPieces.map((p) => (
            <span
              key={p.id}
              className="confetti-piece"
              style={
                {
                  left: `${confettiOrigin.x}px`,
                  top: `${confettiOrigin.y}px`,
                  width: `${p.width}px`,
                  height: `${p.height}px`,
                  background: p.color,
                  "--rot-start": `${p.rotateStart}deg`,
                  "--rot-end": `${p.rotateEnd}deg`,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  "--dur": `${p.duration}ms`,
                  "--delay": `${p.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Animation panel — headline + bar + score. Collapses (height 0 +
          opacity 0) once finalView triggers, so the final panel can take
          over the same screen real estate without layout shift hanging
          around. */}
      <div
        className={`flex w-full flex-col items-center gap-6 overflow-hidden transition-all duration-500 ease-out ${
          finalView
            ? "pointer-events-none max-h-0 opacity-0"
            : "max-h-[800px] opacity-100"
        }`}
      >
        <h1 className="text-center font-display text-3xl font-bold italic leading-tight tracking-tight text-ink sm:text-5xl">
          <span className="hero-line-1 block">Congrats !!!</span>
          <span className="hero-line-2 mt-2 block">
            From <span style={{ color: "#2666e1" }}>Zero</span> to{" "}
            <span style={{ color: "#F2701D" }}>
              <span className="hero-bobble">HERO</span>
            </span>
          </span>
        </h1>

        <div className="relative h-24 w-full">
          <div className="absolute inset-x-0 bottom-0 h-3 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${progress}%`,
                transition: `width ${BAR_DURATION_MS}ms ease-out`,
              }}
            />
          </div>
          <div
            ref={legoRef}
            className="absolute bottom-3"
            style={{
              left: `${progress}%`,
              width: "120px",
              transform: "translateX(-50%)",
              transition: `left ${BAR_DURATION_MS}ms ease-out`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-pusher-preview.webp"
              alt=""
              width={300}
              height={238}
              className="block h-auto w-full"
            />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
            Your result
          </p>
          <p className="mt-2 text-6xl font-semibold text-brand">
            {count}{" "}
            <span className="text-2xl text-ink-muted">/ {effectiveTotal}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">correct</p>
        </div>
      </div>

      {/* Final panel — fades in after the confetti burst clears. Same horizontal
          rhythm as the animation panel, so the swap feels in-place. */}
      <div
        className={`flex w-full flex-col items-center gap-5 transition-opacity duration-500 ease-out ${
          finalView
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
        style={{
          transitionProperty: "opacity, transform",
        }}
      >
        {finalView && (
          <div className="w-full max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/final_screen.webp"
              alt=""
              decoding="async"
              className="block h-auto w-full"
            />
          </div>
        )}

        <p
          className={`max-w-lg px-2 text-center font-display text-xl font-bold italic leading-snug tracking-tight sm:text-2xl ${
            passed ? "text-ink" : "text-rose-600"
          }`}
        >
          {subline}
        </p>

        {passed && (
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {(bonus?.downloads ?? FALLBACK_DOWNLOADS).map((d) => (
              <a
                key={d.href}
                href={d.href}
                download={d.filename}
                className="inline-flex items-center gap-2 bg-brand px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-dark"
              >
                Download LEGO Plan ↓
              </a>
            ))}
          </div>
        )}

          <ol className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
            {answers.map((a) => (
              <li
                key={a.index}
                className={`flex items-center justify-between border-l-4 px-3 py-2 text-xs ${
                  a.isCorrect
                    ? "border-accent bg-accent/5"
                    : "border-rose-500 bg-rose-50"
                }`}
              >
                <span className="font-display uppercase tracking-wider text-ink-muted">
                  Q{a.index + 1}
                </span>
                <span
                  aria-label={a.isCorrect ? "correct" : "wrong"}
                  className={
                    a.isCorrect
                      ? "font-semibold text-accent"
                      : "font-semibold text-rose-600"
                  }
                >
                  {a.isCorrect ? "✓" : "✗"}
                </span>
              </li>
            ))}
          </ol>

          <ol className="flex w-full flex-col gap-3">
            {answers.map((a) => (
              <li
                key={a.index}
                className={`border-l-4 p-3 ${
                  a.isCorrect
                    ? "border-accent bg-accent/5"
                    : "border-rose-500 bg-rose-50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-[10px] uppercase tracking-wider text-ink-muted">
                    Question {a.index + 1} · {a.category}
                  </div>
                  <span
                    aria-label={a.isCorrect ? "correct" : "wrong"}
                    className={
                      a.isCorrect
                        ? "font-semibold text-accent"
                        : "font-semibold text-rose-600"
                    }
                  >
                    {a.isCorrect ? "✓" : "✗"}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium text-ink">
                  {a.prompt}
                </div>
                {a.showPicked && (
                  <div className="mt-2 text-sm">
                    <span className="text-ink-muted">Your answer: </span>
                    <span
                      className={
                        a.isCorrect
                          ? "font-semibold text-accent"
                          : "font-semibold text-rose-600"
                      }
                    >
                      {a.pickedAnswer}
                    </span>
                  </div>
                )}
                {(!a.showPicked || !a.isCorrect) && (
                  <div className={a.showPicked ? "text-sm" : "mt-2 text-sm"}>
                    <span className="text-ink-muted">Correct answer: </span>
                    <span className="font-semibold text-ink">
                      {a.correctAnswer}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="mt-2 bg-brand px-5 py-3 text-base font-medium text-white transition hover:bg-brand-dark"
            >
              Play again
            </button>
          )}
      </div>
    </section>
  );
}


