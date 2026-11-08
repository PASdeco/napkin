"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWallet, walletConnectEnabled, type DiscoveredWallet } from "@/lib/wallet";

// The wallets the brand recognises, in the order we want them listed.
const PREFERRED = ["io.metamask", "io.rabby", "com.okex.wallet"];
const PREFERRED_NAMES = ["metamask", "rabbit", "rabby", "okx"];

function isPreferred(w: DiscoveredWallet): boolean {
  const rdns = w.info.rdns.toLowerCase();
  const name = w.info.name.toLowerCase();
  return PREFERRED.some((p) => rdns.includes(p)) || PREFERRED_NAMES.some((p) => name.includes(p));
}

function WalletConnectIcon() {
  return (
    <svg viewBox="0 0 40 40" width={34} height={34} aria-hidden="true" style={{ flex: "none" }}>
      <rect width="40" height="40" rx="10" fill="#3B99FC" />
      <path
        d="M12.4 16.1c4.2-4.1 11-4.1 15.2 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.9-7.7-2.9-10.6 0l-.8.7c-.1.1-.3.1-.4 0L11.8 17c-.2-.2-.2-.5 0-.7l.6-.2Zm18.8 2.7 1.5 1.5c.2.2.2.5 0 .7l-6.9 6.8c-.2.2-.5.2-.7 0l-4.9-4.8c-.1-.1-.2-.1-.2 0l-4.9 4.8c-.2.2-.5.2-.7 0L7.5 21c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.9 4.8c.1.1.2.1.2 0l4.9-4.8c.2-.2.5-.2.7 0l4.9 4.8c.1.1.2.1.2 0l4.9-4.8c.2-.2.5-.2.7 0Z"
        fill="#fff"
      />
    </svg>
  );
}

export default function WalletModal() {
  const { wallets, connect, connecting, walletModalOpen, setWalletModalOpen } = useWallet();
  const open = walletModalOpen;
  const onClose = () => setWalletModalOpen(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => {
    const preferred = wallets.filter(isPreferred);
    const rest = wallets.filter((w) => !isPreferred(w));
    return [...preferred, ...rest];
  }, [wallets]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)");
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = async (w: DiscoveredWallet | "walletconnect") => {
    try {
      await connect(w);
      onClose();
    } catch {
      // Provider surfaces its own error; keep the sheet open so the user can retry.
    }
  };

  return (
    <div
      className="modal on"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wmt"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet" ref={sheetRef}>
        <h3 id="wmt">Connect a wallet</h3>
        <p>Choose a wallet to pitch ideas and receive prizes on GenLayer Studionet.</p>

        {ordered.map((w) => (
          <button
            className="wopt"
            key={w.info.uuid}
            onClick={() => void pick(w)}
            disabled={connecting}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.info.icon} alt="" width={34} height={34} />
            <div>
              {w.info.name}
              <small>Browser extension</small>
            </div>
          </button>
        ))}

        {walletConnectEnabled && (
          <button className="wopt" onClick={() => void pick("walletconnect")} disabled={connecting}>
            <WalletConnectIcon />
            <div>
              WalletConnect
              <small>Scan with any mobile wallet</small>
            </div>
          </button>
        )}

        <button className="x" onClick={onClose} disabled={connecting}>
          Cancel
        </button>
      </div>
    </div>
  );
}
