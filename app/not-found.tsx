export default function NotFound() {
  return (
    <div className="dots"><div className="wrap" style={{ paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
      <h1 style={{ fontSize: "clamp(48px,8vw,110px)", marginBottom: 12 }}>Nothing on this <em>napkin.</em></h1>
      <p className="lede" style={{ margin: "0 auto 30px" }}>The page you are looking for doesn’t exist — maybe the idea was never pitched, or the link is off by a scribble.</p>
      <a className="btn pen" href="/">Back to the napkin</a>
    </div></div>
  );
}
