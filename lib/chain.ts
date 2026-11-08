import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID ?? 61999);
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);
export const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER ?? "https://explorer-studio.genlayer.com";
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export function isChainConfigured(): boolean {
  return CONTRACT_ADDRESS.length > 10;
}

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

export function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Eip1193Provider };
  return w.ethereum ?? null;
}

export function getReadClient() {
  return createClient({ chain: studionet });
}

export function getWalletClient(provider: Eip1193Provider) {
  return createClient({ chain: studionet, provider: provider as never });
}

export async function ensureStudioNet(provider: Eip1193Provider): Promise<boolean> {
  const current = String((await provider.request({ method: "eth_chainId" })) ?? "").toLowerCase();
  if (current === CHAIN_ID_HEX.toLowerCase()) return true;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "GenLayer StudioNet",
            nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
      return true;
    }
    throw err;
  }
}

export async function waitFinalized(
  client: ReturnType<typeof getReadClient>,
  hash: `0x${string}`,
) {
  return client.waitForTransactionReceipt({
    hash: hash as never,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 400,
  });
}

export function assertFinalizedSuccess(receipt: unknown): void {
  const r = (receipt ?? {}) as {
    statusName?: string;
    txExecutionResultName?: string;
    resultName?: string;
    revert_reason?: string;
  };
  if (r.statusName && r.statusName !== TransactionStatus.FINALIZED) {
    throw new Error(`Transaction stopped at ${r.statusName}, not FINALIZED. Refresh before retrying.`);
  }
  if (r.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
    const detail = r.revert_reason ? ` Reason: ${r.revert_reason}` : "";
    throw new Error(`Finalized with an execution error. No state change was confirmed.${detail}`);
  }
  if (r.statusName === TransactionStatus.CANCELED) {
    throw new Error("Transaction was canceled on-chain. No state change was confirmed.");
  }
  if (r.resultName === "FAILURE") {
    throw new Error("Transaction result is FAILURE. No state change was confirmed.");
  }
}

export function shortAddress(a: string): string {
  return a.length > 12 ? a.slice(0, 6) + "…" + a.slice(-4) : a;
}

export function txErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied/i.test(msg)) return "Signature rejected in wallet.";
  if (/\[EXPECTED\]/.test(msg)) {
    const m = msg.match(/\[EXPECTED\]\s*([^\n]+)/);
    return m ? m[1].trim() : msg;
  }
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}
