#!/usr/bin/env node
// aiprove-agent — the autonomous loop.
//   1. read skill.md                4. triage open bounties by lane
//   2. sign in (own keypair)        5. build each buildable entry
//   3. list open bounties           6. submit repo@commit+transcript+link
//                                      (or a prediction payload)
//
// Usage:
//   AGENT_KEYPAIR_PATH=./keypair.json node src/index.mjs [--dry-run] [--limit N] [--bounty slug]
//   AGENT_PRIVATE_KEY=0x...          node src/index.mjs --dry-run
//
// --dry-run runs the whole loop except publishing repos and submitting.
// Exit code 0 even when some bounties are skipped — skips are logged, not errors.
import fs from "node:fs";
import path from "node:path";
import { api } from "./api.mjs";
import { authenticate } from "./auth.mjs";
import { readSkill } from "./skill.mjs";
import { plan } from "./triage.mjs";
import { Transcript } from "./transcript.mjs";
import { submitEntry } from "./submit.mjs";
import { publishEntry } from "./github.mjs";
import { builders } from "./builders/index.mjs";

const HANDLE = process.env.AGENT_HANDLE || "kay-goblog";
const GH_OWNER = process.env.GH_OWNER || "kaybae46";

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : Infinity;
  const bountyIdx = argv.indexOf("--bounty");
  const onlySlug = bountyIdx >= 0 ? argv[bountyIdx + 1] : null;
  return { dryRun, limit, onlySlug };
}

async function main() {
  const { dryRun, limit, onlySlug } = parseArgs(process.argv.slice(2));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const t = new Transcript(runId);
  const workdir = path.resolve(`./work/${runId}`);
  fs.mkdirSync(workdir, { recursive: true });
  console.log(`run ${runId} (dry-run: ${dryRun})`);
  t.log("run started", `dry-run=${dryRun} limit=${limit} bounty=${onlySlug || "all"}`);

  // 1. Read the board's instructions.
  const skill = await readSkill();
  t.log("skill.md read", `${skill.lines} lines, endpoints: ${skill.endpoints.join(", ")}`);
  console.log(`skill.md: ${skill.lines} lines`);

  // 2. Sign in with our own keypair (session reused while valid).
  let auth = null;
  try {
    auth = await authenticate();
    t.log(
      "authenticated",
      `${auth.address} (session ${auth.reused ? "reused" : "fresh"}, expires ${new Date(auth.expiresAt).toISOString()})`
    );
    console.log(`signed in as ${auth.address}`);
  } catch (e) {
    console.log(`auth unavailable, continuing public-only: ${e.message}`);
    t.log("auth unavailable", e.message);
  }

  // 3. List open bounties + our submissions so far.
  const { bounties } = await api.bounties("open");
  let submittedSlugs = new Set();
  if (auth) {
    const { submissions } = await api.mySubmissions(auth.token);
    submittedSlugs = new Set((submissions || []).map((s) => s.bountySlug));
    t.log("submissions fetched", `${submittedSlugs.size} already submitted: ${[...submittedSlugs].join(", ")}`);
  } else {
    t.log("submissions check skipped", "no session — already-submitted filter inactive");
  }
  console.log(`${bounties.length} open bounties`);

  // 4. Triage.
  let todo = plan(bounties, submittedSlugs);
  if (onlySlug) todo = todo.filter((p) => p.slug === onlySlug);
  for (const p of todo) {
    console.log(`  - ${p.slug} [${p.kind}] ${p.buildable ? "BUILD" : "skip"}: ${p.reason}`);
    t.log(`triage ${p.slug}`, `${p.kind} buildable=${p.buildable} — ${p.reason}`);
  }

  // 5–6. Build + submit, soonest deadline first.
  const results = [];
  for (const item of todo.slice(0, limit)) {
    if (!item.buildable) continue;
    const builder = builders[item.kind];
    if (!builder) {
      t.log(`build ${item.slug} skipped`, `no builder for kind ${item.kind}`);
      continue;
    }
    try {
      const bounty = bounties.find((b) => b.slug === item.slug);
      const built = await builder(bounty, workdir);
      if (!built) {
        t.log(`build ${item.slug} skipped`, "builder returned nothing (missing data or strategy)");
        console.log(`  ${item.slug}: builder skipped`);
        continue;
      }
      t.log(`built ${item.slug}`, built.summary);
      console.log(`  ${item.slug}: ${built.summary}`);

      if (dryRun) {
        results.push({ slug: item.slug, status: "dry-run-built" });
        continue;
      }
      if (!auth) throw new Error("no session — cannot submit");

      let repoUrl;
      let commit;
      let link;
      if (built.dir) {
        const repoName = `${GH_OWNER}/${item.slug}-entry`;
        const published = publishEntry({
          dir: built.dir,
          repo: repoName,
          title: `AIProve entry: ${item.slug}`,
        });
        repoUrl = published.repoUrl;
        commit = published.commit;
        link = `${repoUrl.replace("github.com", "raw.githubusercontent.com")}/${commit}/${built.linkFile || "README.md"}`;
        t.log(`published ${item.slug}`, `${repoUrl}@${commit.slice(0, 7)}`);
      }
      const res = await submitEntry({
        slug: item.slug,
        token: auth.token,
        handle: HANDLE,
        repoUrl,
        commit,
        link,
        transcript: t.toText(),
        prediction: built.prediction,
      });
      t.log(`submitted ${item.slug}`, `id=${res.id} status=${res.status}`);
      console.log(`  ${item.slug}: SUBMITTED ${res.id} (${res.status})`);
      results.push({ slug: item.slug, status: res.status, id: res.id });
    } catch (e) {
      t.log(`failed ${item.slug}`, e.message);
      console.log(`  ${item.slug}: FAILED — ${e.message}`);
      results.push({ slug: item.slug, status: "failed", error: e.message });
    }
  }

  const done = results.filter((r) => r.status === "provenance_ok" || r.status === "dry-run-built").length;
  console.log(`done: ${done} built/submitted, ${results.length - done} failed/skipped`);
  t.log("run finished", `${done}/${results.length} ok`);
  console.log(`transcript: ${t.file}`);
}

main().catch((e) => {
  console.error(`fatal: ${e.message}`);
  process.exit(1);
});
