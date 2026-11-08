import { parseAccount } from "viem/accounts";
import { z } from "zod";
import {
  CONTRACT_ADDRESS,
  getReadClient,
  getWalletClient,
  type Eip1193Provider,
} from "@/lib/chain";

// ---- Types ----------------------------------------------------------------

export const CATEGORIES = ["consumer", "fintech", "ai", "creator", "climate"] as const;
export type Category = (typeof CATEGORIES)[number];

export const MIN_PITCH = 30;
export const MAX_PITCH = 400;
export const MAX_PER_WEEK = 3;

export const VERDICT_LABEL: Record<string, string> = {
  greenlit: "Greenlit",
  promising: "Promising. Tighten it.",
  back_to_the_napkin: "Back to the napkin",
};

export const VERDICT_BLURB: Record<string, string> = {
  greenlit: "The panel agrees this is worth building.",
  promising: "There's something here. The judges want a sharper edge.",
  back_to_the_napkin: "Too vague or too crowded. Try a specific customer and a first step.",
};

export const LENSES = [
  { key: "operator", name: "The Operator", letter: "O" },
  { key: "skeptic", name: "The Skeptic", letter: "S" },
  { key: "designer", name: "The Designer", letter: "D" },
  { key: "engineer", name: "The Engineer", letter: "E" },
  { key: "dreamer", name: "The Dreamer", letter: "V" },
] as const;

export type LensKey = (typeof LENSES)[number]["key"];

export const AXES = ["originality", "feasibility", "market", "clarity"] as const;
export type AxisKey = (typeof AXES)[number];

const num = z.union([z.number(), z.string(), z.bigint()]).transform((v) => Number(String(v)));

export const IdeaSchema = z.object({
  id: num,
  week: num,
  author: z.string(),
  category: z.string(),
  text: z.string(),
  axes: z.record(z.string(), num),
  lenses: z.record(z.string(), num),
  comments: z.record(z.string(), z.string()),
  overall: num,
  verdict: z.string(),
  created_at: num,
  flagged: z.boolean().optional().transform((v) => v === true),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const WeekSchema = z.object({
  week_id: num,
  starts_at: num,
  ends_at: num,
  pool: num,
  finalized: z.boolean().optional().transform((v) => v === true),
});
export type Week = z.infer<typeof WeekSchema>;

export const StatsSchema = z.object({
  total_ideas: num,
  current_week: num,
  week_pool: num,
  categories: z.array(z.string()),
  week_duration: num,
});
export type Stats = z.infer<typeof StatsSchema>;

// ---- Reads ----------------------------------------------------------------

function addr(): `0x${string}` {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
    throw new Error("Contract address is not configured. Run: python scripts/deploy.py");
  }
  return CONTRACT_ADDRESS;
}

// Contract views return JSON *strings* (json.dumps). genlayer-js hands that
// string through as CalldataEncodable, so normalize to an object before zod.
// StudioNet may also wrap responses — unwrap common shapes defensively.
export function normalize(raw: unknown): unknown {
  let v = raw;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s === '""') throw new Error("Empty response from contract read.");
    try {
      v = JSON.parse(s);
    } catch {
      throw new Error(`Unparseable contract response: ${s.slice(0, 120)}`);
    }
  }
  if (v && typeof v === "object") {
    const rec = v as Record<string, unknown>;
    if (rec.data && typeof rec.data === "object" && !(rec instanceof Array)) return rec.data;
  }
  return v;
}

async function read<T>(functionName: string, args: (string | number | boolean | bigint)[]): Promise<T> {
  const client = getReadClient();
  const raw = (await client.readContract({ address: addr(), functionName, args: args as never[] })) as unknown;
  return normalize(raw) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// StudioNet consensus reads can be transiently stale right after writes.
async function readRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown = new Error("Empty response from contract read.");
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
    }
    await sleep(1500);
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function fetchStats(): Promise<Stats> {
  return readRetry(async () => StatsSchema.parse(await read<unknown>("get_stats", [])));
}

export async function fetchCurrentWeek(): Promise<Week> {
  return readRetry(async () => WeekSchema.parse(await read<unknown>("get_current_week", [])));
}

export async function fetchWeek(weekId: number): Promise<Week> {
  return readRetry(async () => WeekSchema.parse(await read<unknown>("get_week", [weekId])));
}

export async function fetchIdea(ideaId: number): Promise<Idea> {
  return readRetry(async () => IdeaSchema.parse(await read<unknown>("get_idea", [ideaId])));
}

export async function fetchBoard(weekId: number, limit = 20): Promise<Idea[]> {
  const raw = await readRetry(() => read<unknown>("get_week_board", [weekId, limit]));
  if (!Array.isArray(raw)) throw new Error("Unexpected board response shape.");
  return raw.map((i) => IdeaSchema.parse(i));
}

export async function fetchIdeasBy(author: string): Promise<Idea[]> {
  const raw = await readRetry(() => read<unknown>("get_ideas_by", [author]));
  if (!Array.isArray(raw)) throw new Error("Unexpected ideas response shape.");
  return raw.map((i) => IdeaSchema.parse(i));
}

// ---- Writes ---------------------------------------------------------------

export interface WriteResult {
  hash: string;
}

/** Sends the write and returns the tx hash; polling/finalization is the caller's job (TxSheet). */
async function sendWrite(
  provider: Eip1193Provider,
  sender: string,
  functionName: string,
  args: (string | number | boolean | bigint)[],
): Promise<string> {
  const client = getWalletClient(provider);
  const hash = (await client.writeContract({
    address: addr(),
    functionName,
    args: args as never[],
    value: 0n,
    // genlayer-js expects a viem Account object, not a raw hex string —
    // passing a string makes it read .address off it and fail with
    // 'Address "undefined" is invalid'.
    account: parseAccount(sender as `0x${string}`) as never,
  })) as unknown as `0x${string}`;
  return hash;
}

export const writes = {
  submitIdea: (p: Eip1193Provider, sender: string, category: string, text: string) =>
    sendWrite(p, sender, "submit_idea", [category, text]),
  claimStarterCredits: (p: Eip1193Provider, sender: string) =>
    sendWrite(p, sender, "claim_starter_credits", []),
  fundPool: (p: Eip1193Provider, sender: string, amount: number) =>
    sendWrite(p, sender, "fund_pool", [amount]),
  finalizeWeek: (p: Eip1193Provider, sender: string, weekId: number) =>
    sendWrite(p, sender, "finalize_week", [weekId]),
};

// ---- Prize split (contract defaults: 500/292/125 permille) ----------------

export const POOL_SPLIT = [500, 292, 125] as const;

export function prizeFor(rank: number, pool: number): number {
  if (rank < 1 || rank > 3) return 0;
  return Math.floor((pool * POOL_SPLIT[rank - 1]) / 1000);
}
