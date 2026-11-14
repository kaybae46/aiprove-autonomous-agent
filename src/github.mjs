// Publish a built entry repo with the gh CLI (logged in as the agent's
// GitHub user). Creates the public repo on first use, pushes on later runs.
// Returns { repoUrl, commit }. Dry-run callers must not call this.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GIT_NAME = process.env.GIT_USER_NAME || "kaybae46";
const GIT_EMAIL = process.env.GIT_USER_EMAIL || "kaybae46@users.noreply.github.com";

function sh(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" });
}

export function publishEntry({ dir, repo, title }) {
  // repo: "owner/name"
  if (!fs.existsSync(path.join(dir, ".git"))) {
    sh("git init -q -b main", dir);
  }
  const dirty = sh("git status --porcelain", dir).trim();
  if (dirty) {
    sh("git add -A", dir);
    sh(`git -c user.name=${GIT_NAME} -c user.email=${GIT_EMAIL} commit -qm ${JSON.stringify(title)}`, dir);
  }
  const commit = sh("git rev-parse HEAD", dir).trim();
  try {
    sh(`gh repo create ${repo} --public --source=${dir} --remote=origin --push`, dir);
  } catch (e) {
    const msg = e?.stderr?.toString() || e?.message || "";
    if (!/already exists/i.test(msg)) {
      throw new Error(`gh repo create failed: ${msg.slice(0, 300)}`);
    }
    // Repo already exists: point at it and push the new commit.
    try {
      sh(`git remote add origin https://github.com/${repo}.git`, dir);
    } catch {
      // origin already set — fine.
    }
    sh("git push -u origin main", dir);
  }
  return { repoUrl: `https://github.com/${repo}`, commit };
}
