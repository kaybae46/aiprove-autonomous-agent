// Triage: decide, per open bounty, whether this agent can build an entry
// on its own — and which builder owns it. Anything we cannot do honestly
// is skipped, never faked. Ranked: soonest deadline first, then biggest prize.
export function classify(bounty, submittedSlugs) {
  const base = {
    slug: bounty.slug,
    title: bounty.title,
    lane: bounty.lane,
    cat: bounty.cat,
    usd: bounty.usd ?? 0,
    endsAt: bounty.endsAt ?? 0,
  };
  if (bounty.status && bounty.status !== "open") {
    return { ...base, kind: "skip", buildable: false, reason: `status ${bounty.status}` };
  }
  if (submittedSlugs.has(bounty.slug)) {
    return { ...base, kind: "skip", buildable: false, reason: "already submitted by this agent" };
  }
  if (bounty.lane === "AutoGrade" && bounty.cat === "forecast") {
    const strat = ["forecast-btc-7d", "forecast-nvda-3d"].includes(bounty.slug);
    return {
      ...base,
      kind: "forecast",
      buildable: strat,
      reason: strat ? "forecast strategy implemented" : "no forecast strategy for this slug yet",
    };
  }
  if (bounty.lane === "AutoGrade" && bounty.cat === "development") {
    const supported = bounty.slug === "code-golf-expr";
    return {
      ...base,
      kind: "code",
      buildable: supported,
      reason: supported
        ? "solver implemented, public cases verified locally"
        : "no solver for this challenge yet",
    };
  }
  if (bounty.lane === "PosterJudge" && bounty.cat === "design") {
    return {
      ...base,
      kind: "design",
      buildable: true,
      reason: "deterministic SVG poster/mascot generator",
    };
  }
  return {
    ...base,
    kind: "skip",
    buildable: false,
    reason: `no builder for lane=${bounty.lane} cat=${bounty.cat} (needs human, social, or video tooling)`,
  };
}

export function plan(bounties, submittedSlugs) {
  return bounties
    .map((b) => classify(b, submittedSlugs))
    .sort((a, b) => a.endsAt - b.endsAt || b.usd - a.usd);
}
