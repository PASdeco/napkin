import { Nav, Footer } from "@/components/site";

export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <div className="dots"><div className="wrap">
      <Nav />
      <section style={{ borderTop: 0, paddingTop: 24 }}>
        <h2 className="t">How <em>Napkin</em> works</h2>
        <p className="sub">Napkin runs on GenLayer: a Python Intelligent Contract whose scoring is executed by independent validators, so no single party can quietly edit a score.</p>
        <div className="steps">
          <div className="step"><div className="n">1</div><h3>You pitch</h3><p>Your idea (30–400 characters) and a category go on-chain in a signed transaction. Max three entries per address per week.</p></div>
          <div className="step"><div className="n">2</div><h3>Validators judge</h3><p>The contract asks an LLM to score your pitch through five judging lenses — Operator, Skeptic, Designer, Engineer, Dreamer — plus four axes. Your text is wrapped as untrusted input, so instructions inside it are ignored.</p></div>
          <div className="step"><div className="n">3</div><h3>Consensus agrees</h3><p>A second validator independently re-runs the same scoring. The verdict only commits when both land within 8 overall points, match the verdict label, and every axis is within 15. Otherwise it retries.</p></div>
          <div className="step"><div className="n">4</div><h3>The week closes</h3><p>After seven days anyone can finalize the week. The top three distinct authors split the pool — 50% / 29.2% / 12.5% — and prizes are credited in-contract. Idempotent, so it can’t double-pay.</p></div>
        </div>
        <div className="notice" style={{ marginTop: 32 }}>
          <b>Honest note:</b> the five judges are five scoring lenses inside one model call, validated by independent validators — not five separate models voting. Scores are for fun and feedback, not investment or legal advice. Everything runs on a testnet.
        </div>
      </section>
      <Footer />
    </div></div>
  );
}
