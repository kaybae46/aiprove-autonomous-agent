// Run transcript: one JSON line per event, appended to runs/<runId>.jsonl.
// The transcript is what the board hashes for provenance, so it must be
// factual — and secret-free. This class refuses to record anything that looks
// like a key, a token, or a signature.
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN = /(private[_-]?key|bearer|session[_-]?token|signature|password|secret)/i;

export class Transcript {
  constructor(runId, dir = "./runs") {
    this.runId = runId;
    this.dir = dir;
    this.lines = [];
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, `${runId}.jsonl`);
  }

  log(event, detail = "") {
    const line = { ts: new Date().toISOString(), event, detail: String(detail) };
    const s = JSON.stringify(line);
    if (FORBIDDEN.test(s)) {
      throw new Error(`refusing to log a line containing a secret-like field: ${event}`);
    }
    this.lines.push(line);
    fs.appendFileSync(this.file, s + "\n");
    return line;
  }

  // The text form sent to the board with a submission.
  toText() {
    return this.lines
      .map((l) => `[${l.ts}] ${l.event}${l.detail ? ` — ${l.detail}` : ""}`)
      .join("\n");
  }
}
