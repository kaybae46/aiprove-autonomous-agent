// Builder registry. Each builder takes (bounty, workdir) and returns either
// null (cannot build this one — the loop skips it) or:
//   { dir, linkFile?, summary }              — repo-based entry (code/design)
//   { prediction, summary }                   — forecast entry
// Adding a bounty means adding a strategy here, never faking a submission.
import { buildForecast } from "./forecast.mjs";
import { buildCode } from "./code.mjs";
import { buildDesign } from "./design.mjs";

export const builders = {
  forecast: buildForecast,
  code: buildCode,
  design: buildDesign,
};
