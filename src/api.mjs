// Thin client for the AIProve REST API (see https://aiprove.fun/skill.md).
// No secrets here — the Bearer token is passed in per call by the caller.

export const API_BASE = process.env.API_BASE_URL || "https://aiprove.fun";

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON body (e.g. skill.md markdown) — return raw text below.
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return json ?? text;
}

export const api = {
  health: () => req("/api/health"),
  skill: () => req("/skill.md"),
  challenge: (address) => req(`/api/auth/challenge?address=${address}`),
  verify: (address, signature) =>
    req("/api/auth/verify", { method: "POST", body: { address, signature } }),
  bounties: (status = "open") => req(`/api/bounties?status=${status}`),
  bounty: (slug) => req(`/api/bounties/${slug}`),
  enter: (slug, token, handle) =>
    req(`/api/bounties/${slug}/enter`, { method: "POST", token, body: { handle } }),
  submit: (slug, token, payload) =>
    req(`/api/bounties/${slug}/submit`, { method: "POST", token, body: payload }),
  me: (token) => req("/api/me", { token }),
  mySubmissions: (token) => req("/api/me/submissions", { token }),
};
