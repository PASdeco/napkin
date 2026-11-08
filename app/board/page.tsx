"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBoard, fetchCurrentWeek, fetchWeek } from "@/lib/napkin";
import { isChainConfigured, shortAddress } from "@/lib/chain";
import { Nav, Footer } from "@/components/site";
import BoardSection from "@/components/board-section";

function useArchive(currentWeek: number | undefined) {
  return useQuery({
    queryKey: ["archive", currentWeek],
    queryFn: async () => {
      const weeks: { id: number; pool: number; finalized: boolean; winners: { author: string; idea_id: number; prize: number }[]; top: { id: number; text: string; overall: number }[] }[] = [];
      if (currentWeek == null) return weeks;
      // Walk backwards until the contract says the week doesn't exist.
      for (let w = currentWeek; w >= 0 && weeks.length < 12; w--) {
        try {
          const week = await fetchWeek(w);
          const board = await fetchBoard(w, 3);
          weeks.push({
            id: w,
            pool: week.pool,
            finalized: week.finalized,
            winners: (week as unknown as { winners?: { author: string; idea_id: number; prize: number }[] }).winners ?? [],
            top: board.map((b) => ({ id: b.id, text: b.text, overall: b.overall })),
          });
        } catch {
          break; // week not found — stop
        }
      }
      return weeks;
    },
    enabled: currentWeek != null,
  });
}

export default function BoardPage() {
  const configured = isChainConfigured();
  const weekQ = useQuery({ queryKey: ["week"], queryFn: fetchCurrentWeek, enabled: configured });
  const archiveQ = useArchive(weekQ.data?.week_id);
  const archive = archiveQ.data ?? [];

  return (
    <>
      <div className="dots">
        <div className="wrap">
          <Nav />
          <section style={{ borderTop: 0, paddingTop: 24 }}>
            <h2 className="t">This week’s <em>board</em></h2>
            <p className="sub">Score is the consensus verdict. Ties go to whoever pitched first.</p>
            <BoardSection />
          </section>

          <section>
            <h2 className="t">Past <em>weeks</em></h2>
            <p className="sub">Winners and their winning napkins, straight from the contract.</p>
            {archiveQ.isLoading && <div className="notice">Loading the archive…</div>}
            {archive.length === 0 && !archiveQ.isLoading && (
              <div className="notice">No finished weeks yet. The first crowned napkin is still up for grabs.</div>
            )}
            <div className="archive">
              {archive.map((w) => (
                <div className="week-card" key={w.id}>
                  <div className="wk-head">
                    <strong>Week {w.id}</strong>
                    <span>{w.finalized ? "finalized" : "awaiting finalization"} · pool {w.pool.toLocaleString()} GEN</span>
                  </div>
                  {w.top.length === 0 ? (
                    <div className="empty">No ideas were pitched this week.</div>
                  ) : (
                    w.top.map((t, i) => (
                      <a className="lrow" href={`/idea/${t.id}`} key={t.id}>
                        <span className="rk">{i + 1}</span>
                        <div className="q">{t.text.length > 80 ? t.text.slice(0, 78).trimEnd() + "…" : t.text}</div>
                        <span className="s">{t.overall}</span>
                        <span className="p" />
                      </a>
                    ))
                  )}
                  {w.winners?.length > 0 && (
                    <div className="wk-winners">
                      {w.winners.map((win, i) => (
                        <span key={i}>{["🥇", "🥈", "🥉"][i]} {shortAddress(win.author)} — {Number(win.prize).toLocaleString()} GEN</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <Footer />
        </div>
      </div>
    </>
  );
}
