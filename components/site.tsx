"use client";

import { useEffect, useState } from "react";
import ThemeLogo from "@/components/theme-logo";
import NetworkPill from "@/components/network-pill";
import WalletModal from "@/components/wallet-modal";
import { useWallet } from "@/lib/wallet";
import { shortAddress } from "@/lib/chain";

export function Nav() {
  const { account, connecting, disconnect, setWalletModalOpen } = useWallet();

  return (
    <nav>
      <a className="logo" href="/" aria-label="Napkin home">
        <ThemeLogo variant="full" className="logo-img" priority />
      </a>
      <div className="links">
        <a className="l" href="/#how">How it works</a>
        <a className="l" href="/board">Leaderboard</a>
        <a className="l" href="/me">My napkins</a>
        <NetworkPill />
        {account ? (
          <>
            <button
              className="btn pen"
              onClick={() => {
                void navigator.clipboard?.writeText(account);
              }}
              title="Copy address"
            >
              {shortAddress(account)}
            </button>
            <button className="btn ghost" onClick={disconnect}>Disconnect</button>
          </>
        ) : (
          <button className="btn ghost" onClick={() => setWalletModalOpen(true)} disabled={connecting}>
            Connect wallet
          </button>
        )}
        <ThemeToggle />
      </div>
      <WalletModal />
    </nav>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") setTheme(t);
  }, []);
  const toggle = () => {
    const dark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme:dark)").matches;
    const next = dark ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nk-theme", next);
    } catch {}
  };
  return (
    <button className="icon" onClick={toggle} aria-label="Switch between light and dark mode">
      <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    </button>
  );
}

export function Footer() {
  return (
    <footer>
      <span className="foot-brand">
        <ThemeLogo variant="symbol" className="foot-mark" />
        Napkin — judged on GenLayer Studionet by validator consensus.
      </span>
      <span className="foot-links">
        <a href="/how-it-works">How it works</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
      </span>
    </footer>
  );
}
