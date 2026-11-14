// Keypair auth: challenge -> EIP-191 personal_sign -> Bearer session.
// The private key is NEVER written to disk by this module, never logged, and
// never leaves the process except as a signature over the server's challenge.
// Key source (first match wins):
//   AGENT_PRIVATE_KEY  — raw hex key in the environment
//   AGENT_KEYPAIR_PATH — JSON file with a privateKey field (mode 600, gitignored)
//   ./keypair.json     — same, in the working directory
import { Wallet } from "ethers";
import fs from "node:fs";
import { api } from "./api.mjs";

const SESSION_PATH = process.env.AGENT_SESSION_PATH || "./session.json";

export function loadKeypair() {
  if (process.env.AGENT_PRIVATE_KEY) {
    return new Wallet(process.env.AGENT_PRIVATE_KEY.trim());
  }
  const p = process.env.AGENT_KEYPAIR_PATH || "./keypair.json";
  if (!fs.existsSync(p)) {
    throw new Error(
      "No keypair found. Set AGENT_PRIVATE_KEY or AGENT_KEYPAIR_PATH " +
        "(a JSON file with a privateKey field, mode 600, never committed)."
    );
  }
  const kp = JSON.parse(fs.readFileSync(p, "utf8"));
  const pk = kp.privateKey || kp.private_key || kp.key;
  if (!pk) throw new Error(`Keypair file ${p} has no privateKey field.`);
  return new Wallet(pk);
}

function readSession(address) {
  try {
    const s = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    if (
      s &&
      s.token &&
      s.expiresAt &&
      s.expiresAt > Date.now() + 60_000 &&
      s.address?.toLowerCase() === address.toLowerCase()
    ) {
      return s;
    }
  } catch {
    // Missing, malformed, or expired — fall through to a fresh login.
  }
  return null;
}

function writeSession(s) {
  fs.writeFileSync(SESSION_PATH, JSON.stringify(s, null, 2), { mode: 0o600 });
}

export async function authenticate({ force = false } = {}) {
  const wallet = loadKeypair();
  const address = wallet.address;
  if (!force) {
    const saved = readSession(address);
    if (saved) {
      return { address, token: saved.token, expiresAt: saved.expiresAt, reused: true };
    }
  }
  const { challenge } = await api.challenge(address);
  if (!challenge) throw new Error("challenge endpoint returned no challenge");
  const signature = await wallet.signMessage(challenge);
  const data = await api.verify(address, signature);
  if (!data?.token) throw new Error("verify endpoint returned no token");
  const session = { address, token: data.token, expiresAt: data.expiresAt };
  writeSession(session);
  return { ...session, reused: false };
}
