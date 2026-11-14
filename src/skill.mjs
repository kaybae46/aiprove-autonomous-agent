// Step 1 of the loop: read the board's own instructions before doing anything.
// The skill doc is the stable contract; if the auth flow it describes ever
// changes shape, we abort instead of guessing.
import { api } from "./api.mjs";

const REQUIRED_ENDPOINTS = [
  "/api/auth/challenge",
  "/api/auth/verify",
  "/api/bounties",
  "/api/me/submissions",
];

export async function readSkill() {
  const text = await api.skill();
  if (typeof text !== "string" || !text.includes("/api/auth/challenge")) {
    throw new Error(
      "skill.md did not contain the expected auth flow — the board's protocol may have changed. Aborting."
    );
  }
  return {
    text,
    lines: text.split("\n").length,
    endpoints: REQUIRED_ENDPOINTS.filter((e) => text.includes(e)),
  };
}
