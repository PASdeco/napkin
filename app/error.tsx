"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="dots"><div className="wrap" style={{ paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(40px,6vw,80px)", marginBottom: 12 }}>The napkin drawer is being <em>restocked.</em></h1>
      <p className="lede" style={{ margin: "0 auto 12px" }}>
        Something went wrong — Studionet may have reset, or the contract moved. Try again, or redeploy with{" "}
        <code>python scripts/deploy.py</code>.
      </p>
      <p className="sub" style={{ margin: "0 auto 30px", fontSize: 13 }}>{error.message.slice(0, 160)}</p>
      <button className="btn pen" onClick={reset}>Try again</button>
    </div></div>
  );
}
