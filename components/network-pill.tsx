"use client";

import { CHAIN_ID, useWallet } from "@/lib/wallet";

export default function NetworkPill() {
  const { account, chainOk, switchToStudioNet } = useWallet();

  if (!account) return null;

  if (chainOk) {
    return (
      <span className="net"><i />Studionet</span>
    );
  }
  return (
    <button
      className="net wrong"
      onClick={() => void switchToStudioNet()}
      title={`This app runs on GenLayer Studionet (chain ${CHAIN_ID}). Click to switch.`}
    >
      <i />Wrong network — switch
    </button>
  );
}
