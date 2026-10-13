"use client";

import { useMemo, useState } from "react";

export type Question = {
  id: string;
  scenario?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

const FILTERS = ["ALL", "EASY", "MEDIUM", "HARD"] as const;
const LETTERS = "ABCD";

export default function Quiz({ items, kind }: { items: Question[]; kind: "mcq" | "case" }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const shown = useMemo(() => (filter === "ALL" ? items : items.filter((q) => q.difficulty === filter)), [items, filter]);
  const answered = shown.filter((q) => q.id in answers);
  const correct = answered.filter((q) => answers[q.id] === q.correctIndex).length;

  return (
    <>
      <div className="quiz-bar">
        {FILTERS.map((f) => (
          <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)} id={`${kind}-filter-${f}`}>
            {f === "ALL" ? `All (${items.length})` : `${f[0] + f.slice(1).toLowerCase()} (${items.filter((q) => q.difficulty === f).length})`}
          </button>
        ))}
        <button className="chip" onClick={() => setAnswers({})} id={`${kind}-reset`}>↺ Reset</button>
        <span className="score">
          {correct} / {answered.length} correct {answered.length > 0 && `· ${Math.round((correct / answered.length) * 100)}%`}
        </span>
      </div>

      {shown.map((q, n) => {
        const picked = answers[q.id];
        const done = picked !== undefined;
        return (
          <article className="q" key={q.id} style={{ animationDelay: `${Math.min(n, 10) * 30}ms` }}>
            <div className="q-head">
              <b>{kind === "case" ? "Case" : "Q"}{n + 1}</b>
              <span className={`badge d-${q.difficulty}`}>{q.difficulty}</span>
            </div>
            {q.scenario && <div className="scenario">{q.scenario}</div>}
            <div className="q-text">{q.question}</div>
            <div className="opts">
              {q.options.map((o, k) => {
                const cls = done ? (k === q.correctIndex ? "correct" : k === picked ? "wrong" : "") : "";
                return (
                  <button
                    key={k}
                    className={`opt ${cls}`}
                    disabled={done}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: k }))}
                    id={`${kind}-${q.id}-opt-${k}`}
                  >
                    <span className="opt-letter">{LETTERS[k]}</span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
            {done && (
              <div className="explain">
                <b>{picked === q.correctIndex ? "✅ Correct." : `❌ Answer: ${LETTERS[q.correctIndex]}.`}</b> {q.explanation}
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}
