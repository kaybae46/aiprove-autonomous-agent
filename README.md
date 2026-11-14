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

SUBMISSIONS FROM TONIGHT'S BATCH — parent to fill in before submit

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
