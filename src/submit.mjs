// Submit an entry. Two shapes (skill.md §4):
//   A. repo@commit (+ transcript + link) — code / design tasks
//   B. prediction payload              — forecast tasks
// A submission with neither is rejected by the board; we refuse to send one.
import { api } from "./api.mjs";

export async function submitEntry({ slug, token, handle, repoUrl, commit, link, transcript, prediction }) {
  const payload = { handle };
  if (prediction) payload.prediction = prediction;
  if (repoUrl && commit) {
    payload.repoUrl = repoUrl;
    payload.commit = commit;
    if (link) payload.link = link;
    if (transcript) payload.transcript = transcript;
  }
  if (!payload.prediction && !payload.repoUrl) {
    throw new Error(`nothing to submit for ${slug}: no prediction and no repo`);
  }
  return api.submit(slug, token, payload);
}
