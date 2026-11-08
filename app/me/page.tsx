"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIdeasBy, type Idea } from "@/lib/napkin";
import { isChainConfigured, shortAddress } from "@/lib/chain";
import { useWallet } from "@/lib/wallet";
import { Nav, Footer } from "@/components/site";

export default function MePage() {
  const { account } = useWallet();
  const configured = isChainConfigured();

  const mineQ = useQuery({
    queryKey: ["mine", account],
    queryFn: () => fetchIdeasBy(account!),
    enabled: configured && !!account,
  });
  const mine: Idea[] = mineQ.data ?? [];
  const best = mine.length ? Math.max(...mine.map((m) => m.overall)) : 0;

  return (
    <>
      <div className="dots">
        <div className="wrap">
          <Nav />
          <section style={{ borderTop: 0, paddingTop: 24 }}>
            <h2 className="t">My <em>napkins</em></h2>
            <p className="sub">
              {account
                ? `Every idea you have pitched, across all weeks. Best score: ${mine.length ? best : "—"}.`
                : "Connect your wallet to see your pitches, best score and prizes."}
            </p>
            {!account && (
              <div className="notice">
                <b>No wallet connected.</b> Use the Connect wallet button in the top bar.
              </div>
            )}
            {account && mineQ.isLoading && <div className="notice">Loading your napkins…</div>}
            {account && mineQ.isError && <div className="notice"><b>Could not load your ideas.</b> Try refreshing.</div>}
            {account && mine.length === 0 && !mineQ.isLoading && (
              <div className="notice">No napkins yet — <a href="/pitch" style={{ textDecoration: "underline" }}>pitch your first idea</a>.</div>
            )}
            <div className="archive">
              {mine
                .sort((a, b) => b.id - a.id)
                .map((idea) => (
                  <a className="lrow" href={`/idea/${idea.id}`} key={idea.id}>
                    <span className="rk">#{idea.id}</span>
                    <div className="q">
                      {idea.text.length > 90 ? idea.text.slice(0, 88).trimEnd() + "…" : idea.text}
                      <small>week {idea.week} · {idea.category} · {shortAddress(idea.author)}</small>
                    </div>
                    <span className="s">{idea.overall}</span>
                    <span className="p" />
                  </a>
                ))}
            </div>
          </section>
          <Footer />
        </div>
      </div>
    </>
  );
}
