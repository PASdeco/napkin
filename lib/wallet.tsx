"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  EXPLORER_URL,
  RPC_URL,
  ensureStudioNet,
  type Eip1193Provider,
} from "@/lib/chain";

// ---- EIP-6963 multi-wallet discovery --------------------------------------

export interface DiscoveredWallet {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
export const walletConnectEnabled = WC_PROJECT_ID.length > 10;

interface WalletCtx {
  wallets: DiscoveredWallet[];
  provider: Eip1193Provider | null;
  walletName: string | null;
  account: string | null;
  chainOk: boolean;
  connecting: boolean;
  connect: (w: DiscoveredWallet | "walletconnect") => Promise<void>;
  disconnect: () => void;
  switchToStudioNet: () => Promise<boolean>;
  walletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
}

const Ctx = createContext<WalletCtx | null>(null);

// Minimal EIP-1193 shim over WalletConnect's universal provider, loaded on demand.
async function walletConnectProvider(): Promise<Eip1193Provider | null> {
  try {
    const mod = await import("@walletconnect/ethereum-provider");
    const wc = await mod.default.init({
      projectId: WC_PROJECT_ID,
      showQrModal: true,
      chains: [CHAIN_ID],
      optionalChains: [CHAIN_ID],
      rpcMap: { [CHAIN_ID]: RPC_URL },
    });
    await wc.connect();
    return wc as unknown as Eip1193Provider;
  } catch (e) {
    console.error("WalletConnect failed", e);
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // EIP-6963 announceProvider discovery.
  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail as DiscoveredWallet;
      setWallets((prev) => {
        if (prev.some((w) => w.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const watchProvider = useCallback((p: Eip1193Provider, name: string) => {
    setProvider(p);
    setWalletName(name);
    p.on?.("accountsChanged", (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts?.length ? accounts[0] : null);
    });
    p.on?.("chainChanged", (...args: unknown[]) => {
      setChainOk(String(args[0]).toLowerCase() === CHAIN_ID_HEX.toLowerCase());
    });
  }, []);

  const connect = useCallback(
    async (w: DiscoveredWallet | "walletconnect") => {
      setConnecting(true);
      try {
        if (w === "walletconnect") {
          const p = await walletConnectProvider();
          if (!p) throw new Error("WalletConnect could not start. Try a browser wallet instead.");
          const accounts = (await p.request({ method: "eth_accounts" })) as string[];
          watchProvider(p, "WalletConnect");
          setAccount(accounts?.[0] ?? null);
          setChainOk(await ensureStudioNet(p));
          return;
        }
        // Ask for accounts first: most wallets reject wallet_switchEthereumChain
        // before the site has permission.
        const accounts = (await w.provider.request({ method: "eth_requestAccounts" })) as string[];
        watchProvider(w.provider, w.info.name);
        setAccount(accounts?.[0] ?? null);
        setChainOk(await ensureStudioNet(w.provider));
        try {
          localStorage.setItem("nk-wallet-rdns", w.info.rdns);
        } catch {}
      } finally {
        setConnecting(false);
      }
    },
    [watchProvider],
  );

  const disconnect = useCallback(() => {
    setProvider(null);
    setWalletName(null);
    setAccount(null);
    setChainOk(true);
    try {
      localStorage.removeItem("nk-wallet-rdns");
    } catch {}
  }, []);

  const switchToStudioNet = useCallback(async () => {
    if (!provider) return false;
    try {
      return await ensureStudioNet(provider);
    } catch {
      return false;
    }
  }, [provider]);

  // Silent auto-reconnect of the last-used injected wallet.
  useEffect(() => {
    if (provider || wallets.length === 0) return;
    let rdns: string | null = null;
    try {
      rdns = localStorage.getItem("nk-wallet-rdns");
    } catch {}
    const found = rdns ? wallets.find((w) => w.info.rdns === rdns) : undefined;
    if (!found) return;
    (async () => {
      try {
        const accounts = (await found.provider.request({ method: "eth_accounts" })) as string[];
        if (accounts?.length) {
          watchProvider(found.provider, found.info.name);
          setAccount(accounts[0]);
          const id = String(await found.provider.request({ method: "eth_chainId" }));
          setChainOk(id.toLowerCase() === CHAIN_ID_HEX.toLowerCase());
        }
      } catch {}
    })();
  }, [wallets, provider, watchProvider]);

  const value = useMemo(
    () => ({ wallets, provider, walletName, account, chainOk, connecting, connect, disconnect, switchToStudioNet, walletModalOpen, setWalletModalOpen }),
    [wallets, provider, walletName, account, chainOk, connecting, connect, disconnect, switchToStudioNet, walletModalOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

export { CHAIN_ID, RPC_URL, EXPLORER_URL };
