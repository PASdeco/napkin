"use client";

import { useEffect, useState } from "react";
import {
  AXES,
  LENSES,
  VERDICT_BLURB,
  VERDICT_LABEL,
  prizeFor,
  type Idea,
} from "@/lib/napkin";

const RING_CIRCUMFERENCE = 289;

export default function ResultPanel({ idea, rank, entered }: { idea: Idea; rank: number; entered: boolean }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, [idea.id]);

  const label = VERDICT_LABEL[idea.verdict] ?? idea.verdict;
  const blurb = VERDICT_BLURB[idea.verdict] ?? "";
  const prize = prizeFor(rank, 0);

  return (
    <div className="result on" aria-live="polite">
      <div className="rtop">
        <div className="ring">
          <svg width="112" height="112" viewBox="0 0 112 112">
            <circle className="bg" cx="56" cy="56" r="46" />
            <circle
              className="fg"
              cx="56" cy="56" r="46"
              style={{ strokeDashoffset: revealed ? RING_CIRCUMFERENCE * (1 - idea.overall / 100) : RING_CIRCUMFERENCE }}
            />
          </svg>
          <b>{idea.overall}</b>
        </div>
        <div>
          <h2>{label}</h2>
          <p>{blurb}</p>
        </div>
      </div>

      <div className="axes">
        {AXES.map((a) => (
          <div className="ax" key={a}>
            <div><span>{a[0].toUpperCase() + a.slice(1)}</span><b>{idea.axes[a] ?? 0}</b></div>
            <div className="t"><i style={{ width: revealed ? `${idea.axes[a] ?? 0}%` : "0%" }} /></div>
          </div>
        ))}
      </div>

      <div className="jl">
        {LENSES.map((l, i) => {
          const score = idea.lenses[l.key] ?? 0;
          const comment = idea.comments[l.key] ?? "";
          return (
            <div className={`jr ${revealed ? "on" : ""}`} key={l.key} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="av">{l.letter}</div>
              <div><b>{l.name}</b><span>{comment}</span></div>
              <em>{score}</em>
            </div>
          );
        })}
      </div>

      <div className="rfoot">
        <span>
          Idea #{idea.id} · week {idea.week} · on-chain{entered && rank > 0 ? ` · currently #${rank}${prize ? ` · in the money` : ""}` : ""}
        </span>
        <a className="btn ghost" href="#board" style={{ padding: "9px 18px", fontSize: 14 }}>
          See the board
        </a>
      </div>
    </div>
  );
}
