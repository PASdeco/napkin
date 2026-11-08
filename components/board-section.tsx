"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBoard, fetchCurrentWeek, fetchStats, prizeFor, type Idea } from "@/lib/napkin";
import { isChainConfigured, shortAddress } from "@/lib/chain";
import { Countdown } from "@/components/countdown";

export default function BoardSection({ myId = null }: { myId?: number | null }) {
  const configured = isChainConfigured();
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: fetchStats, enabled: configured, refetchInterval: 20000 });
  const weekQ = useQuery({ queryKey: ["week"], queryFn: fetchCurrentWeek, enabled: configured, refetchInterval: 20000 });
  const boardQ = useQuery({
    queryKey: ["board", weekQ.data?.week_id],
    queryFn: () => fetchBoard(weekQ.data!.week_id, 20),
    enabled: configured && weekQ.data != null,
    refetchInterval: 20000,
  });

  const pool = weekQ.data?.pool ?? statsQ.data?.week_pool ?? 0;
  const board: Idea[] = boardQ.data ?? [];

  return (
    <div className="lb">
      <div className="board">
        <div className="bh">
          <strong>Top ideas</strong>
          <span>{boardQ.isLoading ? "loading…" : `${board.length} idea${board.length === 1 ? "" : "s"} entered`}</span>
        </div>
        {!configured ? (
          <div className="empty">Contract not deployed yet — run <code>python scripts/deploy.py</code>.</div>
        ) : boardQ.isError ? (
          <div className="empty">Could not load the board. The napkin drawer may be being restocked — try again shortly.</div>
        ) : board.length === 0 ? (
          <div className="empty">The napkin drawer is empty — be the first to pitch this week.</div>
        ) : (
          board.map((idea, i) => {
            const mine = myId !== null && idea.id === myId;
            const p = prizeFor(i + 1, pool);
            return (
              <a className={`lrow ${mine ? "me" : ""}`} href={`/idea/${idea.id}`} key={idea.id}>
                <span className="rk">{i + 1}</span>
                <div className="q">
                  {idea.text.length > 90 ? idea.text.slice(0, 88).trimEnd() + "…" : idea.text}
                  <small>{idea.category} · {shortAddress(idea.author)}{mine ? " (you)" : ""}</small>
                </div>
                <span className="s">{idea.overall}</span>
                <span className="p">{p > 0 ? `${p.toLocaleString()} GEN` : ""}</span>
              </a>
            );
          })
        )}
      </div>

      <aside className="pool">
        <small>Prize pool this week</small>
        <div className="big">{pool.toLocaleString()} <span style={{ fontSize: 26 }}>GEN</span></div>
        <small>{weekQ.data ? `Week ${weekQ.data.week_id}` : "Loading…"}{weekQ.data?.finalized ? " · finalized" : ""}</small>
        {weekQ.data && <Countdown endsAt={weekQ.data.ends_at} />}
        <div className="split">
          <div><span>1st place</span><b>{Math.floor((pool * 500) / 1000).toLocaleString()} GEN</b></div>
          <div><span>2nd place</span><b>{Math.floor((pool * 292) / 1000).toLocaleString()} GEN</b></div>
          <div><span>3rd place</span><b>{Math.floor((pool * 125) / 1000).toLocaleString()} GEN</b></div>
        </div>
      </aside>
    </div>
  );
}
