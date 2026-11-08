import { Nav, Footer } from "@/components/site";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <div className="dots"><div className="wrap">
      <Nav />
      <section style={{ borderTop: 0, paddingTop: 24, maxWidth: 720 }}>
        <h2 className="t">Privacy</h2>
        <div className="legal">
          <p><b>What we store.</b> Your wallet address, your pitch text, and the scores it receives — all publicly on GenLayer Studionet. Blockchains are public; anyone can read them.</p>
          <p><b>What we don’t collect.</b> No cookies for tracking, no analytics profiles, no email addresses. Your private key never leaves your wallet.</p>
          <p><b>AI processing.</b> Your pitch text is sent to the validators’ LLM models for scoring. It is wrapped as untrusted input and used only to produce a score.</p>
          <p><b>Theme preference</b> (light/dark) is stored in your browser’s localStorage only.</p>
        </div>
      </section>
      <Footer />
    </div></div>
  );
}
