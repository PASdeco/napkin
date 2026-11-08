# Napkin — Build Decisions

Recorded decisions and VERIFIED deviations from the blueprint (blueprint date:
2026-10), verified against docs.genlayer.com and installed genlayer-test 0.29.2.

## 1. Equivalence method — custom `run_nondet_unsafe`, not `prompt_comparative`

Docs (developers/intelligent-contracts/equivalence-principle) now present
`gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` as the primary pattern and
call `prompt_comparative`/`prompt_non_comparative` convenience wrappers most
contracts outgrow. The validator independently re-runs the leader prompt and
consensus accepts when: spam flags agree, overall within 8 points, verdict
label equal, all four axes within 15. Matches the blueprint's intent with full
control over the gate semantics.

## 2. "Five judges" honesty

One LLM call returns five **judging lenses**; every validator in the network
independently re-runs the same prompt and must agree within tolerance before
the score is stored. UI copy must say "five judging lenses, checked by
independent validators" — never "five validators each scored it".

## 3. Time source — transaction timestamp (VERIFIED)

GenVM pins the Python clock to the transaction datetime
(`docs/.../transaction-context`): `int(datetime.now(timezone.utc).timestamp())`
is deterministic across validators. Weeks are real 7-day windows
(`starts_at` + `ends_at` stored per week); `submit_idea` rejects after the
deadline; `finalize_week(week)` is callable by anyone once `now >= ends_at`.
No owner-driven countdown needed. Non-finalized weeks simply block new pitches
until someone finalizes (which also opens the next week).

## 4. Prizes — in-contract credits ledger for v1

**Choice: credits, not native escrow.** Rationale: payable writes exist on the
network (`@gl.public.write.payable`), but paying prizes out to EOAs uses
external messages that only execute `on='finalized'`, and prize flows via
internal messages do not return value if the child tx fails — a bad first
experience on a testnet. Also worth noting: on real Studionet the wallet
already needs fee/quote handling; keeping prizes in contract credits decouples
contest math from fee accounting. Settlement paths are identical (top-3
distinct authors, floor-divided prizes, remainder carried into the next week),
so switching `fund_pool`/payouts to native value later is a small change.
UI must label these as **testnet credits**.

Token-unit decision: credits are wei-like u256 (1 credit-GEN = 1e18 base
units); starter credits default 150. Pool example: 2400 (GEN) = 2400e18 base.

## 5. Prize split

Blueprint's reference splits 1,200/700/300 of 2,400 = 50%/29.166%/12.5%. Exact
fractions aren't representable permille-wise; default split is
500/292/125 ‰ with integer floor division; the rounding remainder (and
unused slots when fewer than three distinct winners exist) is **carried into
the next week's pool** so credits in vs credits out always balance. Split is
owner-configurable (`set_pool_split`).

## 6. Practice mode (wallet-free scoring) — removed for v1

Real scoring requires a signed write transaction; a client-side heuristic
estimate would contradict "the panel scored this on-chain". Pitching requires a
connected wallet; copy updated accordingly ("Free on testnet. Connect a wallet
to pitch.").

## 7. Events — none in v1

No documented `emit_event` API was confirmable at build time, so v1 is
view-driven (the UI reads `get_week_board` / `get_idea`), and no indexer
depends on events. Revisit when the events API is documented.

## 8. Storage layout

Per blueprint: ideas/weeks/indexes are JSON strings in TreeMaps
(`TreeMap[u256, str]`), plus `TreeMap[Address, str]` author index,
`TreeMap[str, u256]` per-week per-address counters, and `TreeMap[Address,
u256]` credits. `get_week_board` sorts in-memory (no `sorted`/`for`/`lambda`)
by overall desc with oldest-id tie-break, matching the reference UI rule.

## 9. Address-parameter convention

genlayer-test 0.29.2 passes `Address`-typed calldata args into contracts as
raw bytes, which breaks TreeMap key comparisons. Public methods therefore
take addresses as `str` and convert with `Address(...)` internally — this also
matches the official value-transfers examples.

## 10. Toolchain notes

- Runner header is **pinned** to the SDK hash
  `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` per docs
  (an alias like `latest` is a deploy-killer flagged by the linter).
- `exec_prompt(..., response_format="json")` may return a parsed dict, not
  just a string — parsing handles both shapes.
- genlayer-test 0.29.2 Windows bug (temp msg file unlink while fd 0 open) is
  hotfixed locally in site-packages; documented in README.
- `direct_vm.warp(ISO)` cheatcode exists and is used for finalize-week timing
  tests.
- Some mocks with same-treeMap keys: `get_ideas_by` accepts hex string; tests
  compare addresses case-insensitively (checksum vs bytes fixtures).

## 11. Frontend — implemented

Next.js 15 (App Router) + TypeScript. `genlayer-js` with the `studionet` chain
object as the single source of truth for network constants. Reads use a
wallet-free client; writes use the connected EIP-1193 provider with
`parseAccount(sender)` — `writeContract` expects a viem `Account` object, not a
raw hex string (passing a string yields `Address "undefined" is invalid`).

Wallet layer: EIP-6963 discovery with the brand wallets (MetaMask, Rabby, OKX)
ordered first, optional WalletConnect, `accountsChanged`/`chainChanged`
listeners, `wallet_addEthereumChain` fallback, and silent reconnect.

Transaction UX polls `getTransaction` through the real consensus ladder and
verifies `txExecutionResultName` — `FINALIZED` alone does not prove success,
since `FINISHED_WITH_ERROR` also finalizes.

## 12. Read-layer response shape

Contract views return JSON **strings** (`json.dumps`), which `genlayer-js`
surfaces as `CalldataEncodable`. `lib/napkin.ts` therefore normalizes
(parse → unwrap `{data: …}` → zod) before use. Treating the response as an
already-parsed object produces `Expected object, received string`.

## Status

All blueprint phases are complete: contract, tests, deploy, client library,
wallet/network layer, routes, polish, and a live Vercel deployment.

Remaining optional work:

- Native escrow flip (see §4) once fee/quote paths are validated on Studionet.
- Event emission + an indexer once GenVM's events API is documented (§7).
- Owner dashboard for `flag_idea` / `finalize_week` (currently CLI-only).
