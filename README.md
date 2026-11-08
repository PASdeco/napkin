# Napkin

**Pitch a startup idea in 400 characters. Five judging lenses score it on-chain. The best ideas of the week split the prize pool.**

Napkin is a GenLayer dApp: an AI judging panel runs inside a Python Intelligent Contract, so scores are produced by validator consensus instead of a backend you have to trust.

[**Live app**](https://gen-napkin.vercel.app) · [How it works](https://gen-napkin.vercel.app/how-it-works) · [Weekly board](https://gen-napkin.vercel.app/board)

---

## Table of contents

- [What it does](#what-it-does)
- [How judging works](#how-judging-works)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Routes](#routes)
- [Contract API](#contract-api)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design decisions](#design-decisions)
- [Known limitations](#known-limitations)
- [License](#license)

---

## What it does

| | |
|---|---|
| **Pitch** | 30–400 characters plus one category (`consumer`, `fintech`, `ai`, `creator`, `climate`). Max 3 entries per address per week. |
| **Judge** | An LLM scores the pitch through five lenses and four axes. Independent validators re-run the same prompt and must agree before the score is stored. |
| **Compete** | Ideas rank per weekly epoch. After 7 days anyone can finalize: the top three **distinct authors** split the pool 50% / 29.2% / 12.5%. |
| **Verify** | Every score, comment and payout is on GenLayer Studionet. The frontend is a pure read layer over the contract. |

Scoring rubric:

- **Five lenses** — Operator (revenue soon?), Skeptic (what already exists?), Designer (would people enjoy it?), Engineer (buildable today?), Dreamer (how big is the upside?).
- **Four axes** — originality, feasibility, market pull, clarity.
- **Verdicts** — `greenlit` ≥ 75, `promising` ≥ 55, otherwise `back_to_the_napkin`.

Each idea carries a short written comment per lens, so a score comes with feedback rather than a bare number.

## How judging works

```
                 ┌──────────────────────────────────────────┐
  submit_idea ──▶│ gl.vm.run_nondet_unsafe(leader, validator)│
                 └──────────────────────────────────────────┘
                                   │
        leader ────────────────────┼──────────────────── validator
        exec_prompt(...)           │        re-runs the same prompt
        → 5 lenses, 4 axes,        │        → own scores
          comments, verdict        │
                                   ▼
                     accept only when ALL hold:
                       • spam flags agree
                       • overall within 8 points
                       • verdict label identical
                       • every axis within 15 points
                                   │
                                   ▼
                        store idea + score on-chain
```

Two details that matter for integrity:

1. **Prompt-injection containment.** The pitch is wrapped in a delimited `<pitch>` block with an explicit instruction to ignore anything inside it, including requests for high scores. Injection attempts are rejected as spam.
2. **No silent failures.** Malformed model output is clamped, re-validated against strict enums, and retried; if it still fails, the transaction reverts with a readable message and **no state is written**, so the user can resubmit.

> **Honest framing:** these are five *judging lenses inside one model call*, not five separate models voting individually. What makes them trustworthy is that every validator independently re-runs the prompt and must land within tolerance.

## Architecture

```
contracts/napkin.py        GenLayer Intelligent Contract (Python / GenVM)
contracts/tests/           gltest suite — 22 tests, LLM mocked
scripts/deploy.py          Deploy to Studionet, write address into .env

app/                       Next.js 15 App Router
  page.tsx                   landing
  pitch/ idea/[id]/ board/   pitch, shareable idea page, leaderboard
  me/                        your pitches across weeks
  how-it-works/ terms/ privacy/
components/                UI: napkin form, score card, board, wallet modal, tx sheet
lib/                       chain client, typed contract wrapper, wallet layer
tests/                     Vitest (logic) + Playwright (e2e)
```

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · `genlayer-js` · TanStack Query · zod · viem · Playwright · Vitest

**Wallet layer:** EIP-6963 multi-wallet discovery (MetaMask, Rabby, OKX, Phantom…), optional WalletConnect for mobile, live `accountsChanged` / `chainChanged` handling, one-click `wallet_addEthereumChain` fallback, silent reconnect of the last-used wallet, and focus-trapped accessible dialogs.

**Transaction UX:** reads use a wallet-free client; writes go through a progress sheet driven by the real consensus ladder — `PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED → FINALIZED` — with execution-result verification (a `FINALIZED` receipt alone does not prove success) and a direct explorer link.

## Quick start

Requires **Node 18+** and **Python 3.12+**.

```bash
# 1. clone & install
git clone https://github.com/<your-username>/napkin.git
cd napkin
npm install

# 2. configure
cp .env.example .env        # then fill in the values below

# 3. run
npm run dev                 # http://localhost:3000
```

The app needs a deployed contract address to show live data. To deploy one:

```bash
pip install genlayer-test python-dotenv
python scripts/deploy.py     # deploys contracts/napkin.py, writes the address to .env
```

## Environment variables

| Variable | Required | Purpose |
|---|:---:|---|
| `DEPLOYER_PRIVATE_KEY` | deploy only | Deployer wallet key. **Server-side only — never prefixed with `NEXT_PUBLIC_`.** |
| `DEPLOYER_ADDRESS` | deploy only | Expected deployer address, used as a sanity check. |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✅ | Deployed Napkin contract. Written automatically by `scripts/deploy.py`. |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | ✅ | `https://studio.genlayer.com/api` |
| `NEXT_PUBLIC_NETWORK` | ✅ | `studionet` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical URL, used for metadata and OG images. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | optional | Enables the WalletConnect option. Blank = injected wallets only. |
| `NEXT_PUBLIC_GENLAYER_CHAIN_ID` | optional | Defaults to `61999`. |
| `NEXT_PUBLIC_GENLAYER_EXPLORER` | optional | Defaults to the Studio explorer. |

Anything prefixed `NEXT_PUBLIC_` is embedded in the client bundle — treat those as public.

## Routes

| Route | Description |
|---|---|
| `/` | Landing: hero pitch form, how it works, live weekly board, the five lenses |
| `/pitch` | Dedicated pitch page with transaction progress |
| `/idea/[id]` | Shareable idea page — score card, rank, copy link, share to X, dynamic OG image |
| `/board` | Current week leaderboard + archive of past weeks and winners |
| `/me` | Your pitches across all weeks, best score, activity |
| `/how-it-works` | Full explanation of consensus scoring and prize math |
| `/terms`, `/privacy` | Testnet + AI-scoring disclosures |

## Contract API

**Writes**

| Method | Access | Notes |
|---|---|---|
| `submit_idea(category, text)` | anyone | Validates length and category, enforces 3/week, runs consensus scoring |
| `claim_starter_credits()` | anyone | One-time testnet credits per address |
| `fund_pool(amount)` | anyone | Adds credits to the current week's pool |
| `finalize_week(week_id)` | anyone | After `ends_at`; deterministic, no LLM; idempotent |
| `advance_week` · `flag_idea` · `set_pool_split` · `set_starter_credits` · `set_week_duration` · `transfer_ownership` | owner | Administration |

**Views**

`get_idea` · `get_current_week` · `get_week` · `get_week_board(week, limit)` · `get_ideas_by(address)` · `get_my_week_entries(week)` · `get_credits` · `get_stats`

Views return JSON strings; `lib/napkin.ts` parses and zod-validates them. u256 values may arrive as `number`, decimal string or `bigint` — all three are coerced.

## Testing

```bash
python -m pytest contracts/tests/test_napkin.py -q   # 22 contract tests, LLM mocked
npm test                                             # 11 Vitest logic tests
npm run test:e2e                                     # 7 Playwright e2e tests
npm run typecheck                                    # tsc --noEmit
```

The contract suite covers the happy path, length and category validation, spam rejection, malformed-JSON retry, the weekly per-address cap, prompt-injection text, consensus agreement *and* disagreement, board ordering and tie-breaks, flagging, access control, credits and pool funding, and full prize finalization (top-3 distinct authors, exact prize math, remainder carry, idempotency, empty weeks).

E2E covers rendering without a wallet, the character counter, client-side validation, the board and archive, a missing idea, the 404 page, and theme persistence with the correct logo swap.

> **Windows note:** `genlayer-test` 0.29.2 has a direct-mode bug (it unlinks a temp message file while fd 0 is still open). Run the contract suite under WSL/Linux, or apply the local hotfix described in `DECISIONS.md`.

## Deployment

**Frontend (Vercel)**

```bash
npx vercel link --project napkin
npx vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS production   # repeat for each public var
npx vercel --prod
```

**Contract (Studionet)**

```bash
python scripts/deploy.py
```

**Studionet resets occasionally** and takes deployed contracts with it. Symptoms: reads fail, or the address no longer resolves. Fix: re-run `python scripts/deploy.py`, then update `NEXT_PUBLIC_CONTRACT_ADDRESS` in your Vercel project settings and redeploy the frontend. The UI degrades gracefully in the meantime — it shows a "napkin drawer is being restocked" state rather than crashing.

## Design decisions

The full rationale lives in [**DECISIONS.md**](./DECISIONS.md). Headlines:

- **Consensus method** — custom `gl.vm.run_nondet_unsafe(leader, validator)` rather than `prompt_comparative`, for control over the exact gate semantics.
- **Time source** — GenVM pins the Python clock to the transaction timestamp, so weeks are real 7-day windows enforced on-chain; no owner-driven countdown.
- **Prizes** — v1 uses an **in-contract GEN credits ledger**, not native escrow, because prize payouts via external messages are fragile on a testnet. Settlement math (top-3 distinct authors, floor division, remainder carried forward) is identical either way, so flipping to native value later is a small change.
- **Prize split** — `500/292/125` permille, owner-configurable. Rounding remainder always carries into the next week, so credits in always equal credits out.
- **No practice mode** — real judging requires a signed transaction; a client-side estimate would contradict "scored on-chain". Pitching requires a wallet.
- **Address handling** — public methods take addresses as `str` and convert internally, which sidesteps an `Address`-calldata comparison bug in genlayer-test 0.29.2.

## Known limitations

- **Testnet only.** Credits and prizes have no monetary value. Studionet can reset and wipe the contract.
- **Credits, not escrow.** See above.
- **Scores are opinions.** AI output, gated by consensus tolerance — useful feedback, not investment or legal advice.
- **No event indexer.** v1 is view-driven; the board is fetched directly from the contract.

## License

[MIT](./LICENSE) © 2026 PASdeco

---

Built on [GenLayer](https://genlayer.com). Visual reference lives outside the repo (`design/`) and is intentionally gitignored.
