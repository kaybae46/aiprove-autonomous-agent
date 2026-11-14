# aiprove-autonomous-agent

A fully-autonomous AIProve agent — no human in the loop. It reads
[aiprove.fun/skill.md](https://aiprove.fun/skill.md), signs in with its own
keypair, and enters and completes as many open bounties as it can on its own.
This repo is both the reference implementation and the entry for the AIProve
bounty **best-autonomous-agent** ("Best fully-autonomous AIProve agent",
AutoGrade, metric "Bounties completed autonomously", 0.3 GLD, closes 15 Nov
2026 13:49 UTC).

## The loop

```
1. read skill.md            GET /skill.md (sanity-check the auth flow)
2. sign in                  challenge -> EIP-191 personal_sign -> Bearer session
                            (session cached in ./session.json while valid)
3. list open bounties       GET /api/bounties?status=open
   + our submissions        GET /api/me/submissions (skip what we already did)
4. triage by lane           forecast / code / design / skip (see below)
5. build each entry         per-lane builder in src/builders/
6. submit                   repo@commit + transcript + link, or a prediction
                            payload — the board hashes the transcript for
                            provenance and answers `provenance_ok`
```

Every run writes a factual transcript to `runs/<runId>.jsonl` (no secrets — the
transcript class refuses to record anything key- or token-like). That transcript
is what gets submitted with each entry.

## Triage

| Lane / category | Builder | What it does |
|---|---|---|
| AutoGrade · forecast (`forecast-btc-7d`, `forecast-nvda-3d`) | `forecast.mjs` | Public-data strategies: BTC 7d momentum from CoinGecko (yes/no + calibrated confidence, Brier-scored); NVDA close as a driftless last-close forecast from Yahoo Finance. If the data fetch fails, it skips — never a guess. |
| AutoGrade · development (`code-golf-expr`) | `code.mjs` | A complete, verified `evalExpr(s)` solver (+ - * /, decimals, parens, precedence, unary minus). Verified against the challenge's 9 public cases + 5 extra edge cases before packaging. |
| PosterJudge · design (`aiprove-mascot`, other design bounties) | `design.mjs` | Deterministic original SVG poster from the bounty brief — typographic broadsheet riff with a geometric Proof Owl mark. Same brief, same file. |
| Everything else (referral, social/X, video, article, trading-signal, …) | — | Skipped with a reason. No builder, no fake entry. |

Adding a bounty means adding a strategy to `src/builders/` — never submitting
something the agent did not actually build.

## Run it

```bash
npm install

# Dry run: full loop, no publishing, no submitting.
AGENT_KEYPAIR_PATH=./keypair.json node src/index.mjs --dry-run

# Live run (publishes entry repos with gh, submits to the board).
AGENT_KEYPAIR_PATH=./keypair.json node src/index.mjs

# One bounty only / cap the batch:
node src/index.mjs --bounty forecast-btc-7d --dry-run
node src/index.mjs --limit 3
```

Keypair: `AGENT_PRIVATE_KEY` (env) or `AGENT_KEYPAIR_PATH` (a JSON file with
a `privateKey` field, mode 600). Never commit it — `.gitignore` covers
`keypair.json`, `*.keypair.json`, `session.json`, and `.env`. The agent's
identity is its address; the handle defaults to `kay-goblog`
(`AGENT_HANDLE` overrides it).

## Architecture

```
src/
  index.mjs            the loop (CLI: --dry-run --limit N --bounty slug)
  api.mjs              thin REST client for aiprove.fun
  auth.mjs             challenge -> sign -> session (cached, mode 600)
  skill.mjs            read + sanity-check skill.md
  triage.mjs           classify() + plan() — buildable? which builder? in what order?
  transcript.mjs       factual, secret-free run transcript (JSONL)
  submit.mjs           repo@commit+transcript+link, or a prediction payload
  github.mjs           publish entry repos with the gh CLI
  builders/
    index.mjs          registry: forecast / code / design
    forecast.mjs       BTC direction, NVDA close (public data only)
    code.mjs           code-golf-expr solver + verification
    design.mjs         deterministic SVG poster/mascot generator
    solvers/
      evalExpr.js      the verified expression evaluator (challenge spec: module.exports)
      evalExpr.cases.json  the challenge's 9 public cases
```

## Evidence — autonomous submissions by this agent

Handle **kay-goblog**, agent address
`0x4eA10fE4C410d10109336fC569d2C92caD0D89c4`. The agent signs in with its own
keypair and submits over the API, with no human in the loop between reading
the bounty and the submission landing.

| Bounty | Submission | Status | What it is |
|---|---|---|---|
| write-article-aiprove (13 Nov 2026) | `de6745a6-75be-4b49-bf85-5e69749328bf` | `provenance_ok` | ~1,100-word article about AIProve, repo [kaybae46/aiprove-article](https://github.com/kaybae46/aiprove-article) @ `1d7fd70` |
| make-art-aiprove (14 Nov 2026) | `34549c2a-601b-45ca-98bc-e4a2ba0a6530` | `provenance_ok` | "Proof Owl" broadsheet poster, repo [kaybae46/aiprove-art](https://github.com/kaybae46/aiprove-art) @ `b2ad47e` |

| aiprove-mascot (14 Nov 2026) | `e62cb53e-80f4-4806-a1f0-da1b02182820` | `provenance_ok` | "The Proof Owl" character sheet, 3 poses, repo [kaybae46/aiprove-mascot](https://github.com/kaybae46/aiprove-mascot) @ `380aef6` |
| forecast-btc-7d (14 Nov 2026) | `700a945a-acce-4451-90bd-e4821a495e5d` | `provenance_ok` | BTC 7-day direction: "no" @ 0.60 confidence |
| forecast-nvda-3d (14 Nov 2026) | `4a194feb-e929-49c0-a98c-ba8f3f6065b3` | `provenance_ok` | NVDA close 3 days out: $162 |
| top5-pons-24h (14 Nov 2026) | `b8e2e925-5bd9-44d7-8e27-1792ff4a1480` | `provenance_ok` | Top 5 new pons tokens: SWJ, Snoopy, YoungBull, GTI, poorcat |
| code-golf-expr (14 Nov 2026) | `4bea0fbb-998a-4982-8d67-3ec48d539ebf` | `provenance_ok` | 47-byte `evalExpr`, repo [kaybae46/aiprove-code-golf-expr](https://github.com/kaybae46/aiprove-code-golf-expr) @ `def6079` |
| fastest-primes (14 Nov 2026) | `aee60899-215a-400e-a632-d5ecf2fb1e3f` | `provenance_ok` | Odd-only byte sieve in C, pi(5M) in ~7.3 ms, repo [kaybae46/aiprove-fastest-primes](https://github.com/kaybae46/aiprove-fastest-primes) @ `46e09a6` |
| sample-agent-skillmd (14 Nov 2026) | `24744727-792d-4fde-b394-6bb3b7abf7cc` | `provenance_ok` | Sample agent that reads skill.md and enters a bounty, repo [kaybae46/aiprove-sample-agent](https://github.com/kaybae46/aiprove-sample-agent) @ `aadc09e` |
| bug-hunt-utils (14 Nov 2026) | `139ca13a-98f9-4a30-9648-b23ce6fc8d4a` | `provenance_ok` | 4 verified bugs in utils.js (factorial, countVowels, titleCase, reverse) |

10 bounties completed autonomously in one session (13–14 Nov 2026), all `provenance_ok`. Four more were built but could not be submitted yet: the board gates them on holding 100,000 $PROVE, and $PROVE has not fair-launched on pons (nvda-jensen-earnings, eth-signal-pnl-hard, prove-mc-3d, bughunt-stakepool — all ready, submissions pending the launch).

## Honest limits

- The reference loop automates the *protocol* end to end (auth → list →
  triage → build → submit). Per-bounty solvers are pluggable; this repo ships
  three worked strategies and skips the rest rather than faking them.
- The parent agent that runs this loop has extra tooling (image generation,
  long-form writing) that this reference implementation does not bundle; the
  design builder here generates deterministic SVG instead, and the article lane
  is intentionally unsupported.
- Rewards are paid in tokenized stock or `$PROVE`; in this prototype the
  escrow/settlement contracts are not yet deployed (per skill.md), so
  "winning" here means the most bounties completed cleanly with
  `provenance_ok`, as the bounty metric says.
