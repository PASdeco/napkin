"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  MAX_PITCH,
  MIN_PITCH,
  fetchIdea,
  writes,
  type Idea,
} from "@/lib/napkin";
import { useWallet } from "@/lib/wallet";
import { runWrite, type TxState } from "@/components/tx-sheet";
import ResultPanel from "@/components/result-panel";

const SAMPLES = [
  "A roommate app that splits bills by who actually used what, using smart plugs and receipts, for students in shared flats paying too much for Wi-Fi and power.",
  "A live map of the best street food stalls, rated by locals with photo proof, for travellers who keep ending up in tourist traps and overpaying.",
  "A refund bot that reads your receipts, finds the return window, and files the claim for you, for busy people who lose about $200 a year to missed deadlines.",
];

export default function NapkinForm() {
  const { account, provider, setWalletModalOpen } = useWallet();
  const router = useRouter();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [tx, setTx] = useState<TxState | null>(null);
  const [result, setResult] = useState<Idea | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const submit = async () => {
    const clean = text.trim();
    if (clean.length < MIN_PITCH) {
      showToast("Add a little more detail — at least 30 characters.");
      return;
    }
    if (!provider || !account) {
      setWalletModalOpen(true);
      return;
    }
    const state: TxState = { phase: "idle", hash: null, status: null, error: null };
    setTx(state);
    try {
      const outcome = await runWrite(provider, () => writes.submitIdea(provider, account, category, clean), (s) =>
        setTx((prev) => ({ ...(prev ?? state), ...s })),
      );
      // The write returns {idea_id, week, overall, verdict} — fetch the full card.
      const parsed = outcome.result as { idea_id?: number | string } | null;
      if (parsed?.idea_id != null) {
        const idea = await fetchIdea(Number(parsed.idea_id));
        setResult(idea);
        router.refresh();
      }
      setText("");
    } catch {
      // TxSheet already shows the error.
    }
  };

  return (
    <>
      <div className="napkin">
        <div className="nk-top"><span>Your napkin</span><small>{text.length} / {MAX_PITCH}</small></div>
        <textarea
          maxLength={MAX_PITCH}
          aria-label="Your startup idea"
          placeholder="A one-line idea, who it’s for, and why now…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="cats" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={`chip ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="nk-foot">
          <span>Be specific. Vague napkins score low.</span>
          <button className="btn pen" onClick={submit} disabled={tx?.phase === "signing" || tx?.phase === "consensus"}>
            {tx?.phase === "signing" || tx?.phase === "consensus" ? "Judging…" : "Send to the panel"}
          </button>
        </div>
      </div>
      <div className="try">
        <span>Need a spark?</span>
        {SAMPLES.map((s, i) => (
          <button key={i} type="button" className="chip" onClick={() => setText(s)}>Sample {i + 1}</button>
        ))}
      </div>
      {result && <ResultPanel idea={result} rank={0} entered={false} />}
      <div className={`toast ${toast ? "on" : ""}`} role="status">{toast}</div>
    </>
  );
}
