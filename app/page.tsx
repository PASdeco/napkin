"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/napkin";
import { isChainConfigured } from "@/lib/chain";
import { Nav, Footer } from "@/components/site";
import NapkinForm from "@/components/napkin-form";
import BoardSection from "@/components/board-section";

export default function Home() {
  const configured = isChainConfigured();
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: fetchStats, enabled: configured, refetchInterval: 20000 });

  return (
    <>
      <div className="dots">
        <div className="wrap">
          <Nav />
          <header className="hero" id="top">
            <div>
              <h1>Every big idea starts on a <em>napkin.</em></h1>
              <p className="lede">
                Scribble your idea in a few lines. Five judging lenses — checked by independent validators — score it on
                originality, feasibility, market pull and clarity. The best ideas of the week{" "}
                <span className="hl">share the prize pool.</span>
              </p>
              <div className="cta">
                <a className="btn pen" href="/pitch">Pitch an idea</a>
                <a className="btn ghost" href="/board">See this week’s board</a>
              </div>
              <div className="facts">
                <div><b>5</b>judging lenses</div>
                <div><b>{statsQ.data ? statsQ.data.week_pool.toLocaleString() : "—"}</b>GEN weekly pool</div>
                <div><b>{statsQ.data ? statsQ.data.total_ideas : "—"}</b>ideas judged</div>
              </div>
            </div>
            <div className="stage" id="napkin">
              <NapkinForm />
            </div>
          </header>
        </div>
      </div>

      <section id="how"><div className="wrap">
        <h2 className="t">From scribble to <em>scorecard</em></h2>
        <p className="sub">Judged by the bench, recorded on-chain, so the leaderboard can’t be quietly edited.</p>
        <div className="steps">
          <div className="step"><div className="n">1</div><h3>Scribble</h3><p>Write your idea in 400 characters or fewer. Pick a category and send it.</p></div>
          <div className="step"><div className="n">2</div><h3>Get judged</h3><p>Validators independently re-run the same scoring call and only agree when their scores land within tolerance. One verdict, reached by consensus.</p></div>
          <div className="step"><div className="n">3</div><h3>Climb the board</h3><p>Connect a wallet to enter. At the end of the week the top three ideas split the prize pool.</p></div>
        </div>
      </div></section>

      <section id="board"><div className="wrap">
        <h2 className="t">This week’s <em>board</em></h2>
        <p className="sub">Score is the consensus verdict. Ties go to whoever pitched first.</p>
        <BoardSection />
      </div></section>

      <section id="panel"><div className="wrap">
        <h2 className="t">Five judges, <em>five</em> instincts</h2>
        <p className="sub">Each lens weighs an idea differently — the Operator wants revenue, the Dreamer wants upside. To win, convince all of them.</p>
        <div className="bench">
          <div className="jc"><div className="av">O</div><b>The Operator</b><span>Can this make money soon?</span></div>
          <div className="jc"><div className="av">S</div><b>The Skeptic</b><span>What already exists?</span></div>
          <div className="jc"><div className="av">D</div><b>The Designer</b><span>Would people love using it?</span></div>
          <div className="jc"><div className="av">E</div><b>The Engineer</b><span>Can it be built now?</span></div>
          <div className="jc"><div className="av">V</div><b>The Dreamer</b><span>Is the upside huge?</span></div>
        </div>
      </div></section>

      <div className="wrap" style={{ paddingBottom: 20 }}>
        <div className="band">
          <h2>Got a napkin? Bring it.</h2>
          <p>Free on testnet. Connect a wallet to pitch.</p>
          <a className="btn" href="/pitch">Pitch an idea</a>
        </div>
        <Footer />
      </div>
    </>
  );
}
