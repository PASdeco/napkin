"use client";

import { useEffect, useRef, useState } from "react";
import { EXPLORER_URL, getReadClient, type Eip1193Provider } from "@/lib/chain";

// Real GenLayer consensus ladder. APPEAL_* and *_TIMEOUT are terminal-ish
// error paths we surface as failures.
const STEPS = ["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED", "FINALIZED"] as const;
const FAIL_STATES = new Set(["UNDETERMINED", "CANCELED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"]);

export type TxPhase = "idle" | "signing" | "consensus" | "finalized" | "error";

export interface TxState {
  phase: TxPhase;
  hash: string | null;
  status: string | null;
  error: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface WriteOutcome {
  hash: string;
  /** The contract method's return value, JSON-parsed when possible. */
  result: unknown;
}

/**
 * Runs a write through the real status ladder: sign -> submit -> poll
 * getTransaction until FINALIZED, then verify the execution result —
 * FINALIZED alone does not prove the call succeeded (FINISHED_WITH_ERROR
 * also finalizes). Returns the method's return value when readable.
 */
export async function runWrite(
  provider: Eip1193Provider,
  doWrite: () => Promise<string>,
  onUpdate: (s: Partial<TxState>) => void,
  timeoutMs = 300000,
): Promise<WriteOutcome> {
  onUpdate({ phase: "signing", status: null, error: null });
  let hash: string;
  try {
    hash = await doWrite();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onUpdate({ phase: "error", error: /reject|denied/i.test(msg) ? "Signature rejected in wallet." : msg });
    throw e;
  }
  onUpdate({ hash, status: "PENDING" });

  const client = getReadClient();
  const started = Date.now();
  let tx: Record<string, unknown> | null = null;
  while (Date.now() - started < timeoutMs) {
    try {
      tx = (await client.getTransaction({ hash: hash as never })) as Record<string, unknown>;
    } catch {
      tx = null; // not indexed yet — keep polling
    }
    const status = tx ? String(tx.statusName ?? tx.status ?? "") : "";
    if (status) {
      if (status === "FINALIZED") {
        const execResult = String(tx?.txExecutionResultName ?? "");
        if (execResult === "FINISHED_WITH_ERROR") {
          const reason =
            ((tx?.data as Record<string, unknown> | undefined)?.error as string | undefined) ??
            (tx?.data as string | undefined) ??
            "the contract reverted";
          onUpdate({ phase: "error", status, error: `The contract rejected this napkin: ${String(reason).slice(0, 200)}` });
          throw new Error(String(reason));
        }
        let result: unknown = null;
        const data = tx?.data as Record<string, unknown> | undefined;
        const readable = (data?.calldata as Record<string, unknown> | undefined)?.readable;
        if (typeof readable === "string" && readable.trim().startsWith("{")) {
          try {
            result = JSON.parse(readable);
          } catch {}
        }
        onUpdate({ phase: "finalized", status });
        return { hash, result };
      }
      if (FAIL_STATES.has(status)) {
        const msg = `Consensus could not decide this transaction (${status}). No state change was confirmed.`;
        onUpdate({ phase: "error", status, error: msg });
        throw new Error(msg);
      }
      onUpdate({ status });
    }
    await sleep(3000);
  }
  const msg = "Timed out waiting for finalization. Check the explorer before retrying.";
  onUpdate({ phase: "error", error: msg });
  throw new Error(msg);
}

export default function TxSheet({ state, onClose }: { state: TxState | null; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const open = !!state && state.phase !== "idle";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !state) return null;

  const activeIdx = state.phase === "signing" ? -1 : STEPS.indexOf((state.status ?? "PENDING") as (typeof STEPS)[number]);
  const failed = state.phase === "error";
  const done = state.phase === "finalized";

  return (
    <div className="modal on" role="dialog" aria-modal="true" aria-labelledby="txt" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" ref={sheetRef}>
        <h3 id="txt">{failed ? "Transaction failed" : done ? "Confirmed on-chain" : "Sending to the panel"}</h3>
        <p>
          {failed
            ? state.error
            : done
              ? "Consensus finalized your transaction."
              : "Your napkin is moving through validator consensus. This usually takes under a minute."}
        </p>
        <ol className="tx-steps">
          {["Signature", ...STEPS].map((label, i) => {
            const cls =
              failed && i === 0 ? "fail" : i === 0 ? (state.phase === "signing" ? "now" : "done") : done ? "done" : i - 1 <= activeIdx ? "done" : i - 1 === activeIdx + 1 ? "now" : "";
            return (
              <li key={label} className={cls}>
                <span>{label[0] + label.slice(1).toLowerCase().replace("_", " ")}</span>
              </li>
            );
          })}
        </ol>
        {state.hash && (
          <p className="tx-hash">
            <a href={`${EXPLORER_URL.replace(/\/$/, "")}/tx/${state.hash}`} target="_blank" rel="noreferrer">
              View on explorer ↗
            </a>
          </p>
        )}
        <button className="x" onClick={onClose} disabled={!failed && !done}>
          {failed || done ? "Close" : "Working…"}
        </button>
      </div>
    </div>
  );
}
