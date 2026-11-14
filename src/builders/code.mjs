// Code builder. Ships one complete, verified solver (code-golf-expr) and a
// documented extension point for other challenges: add a solver file under
// src/builders/solvers/, a case file, and a branch here. The solver is
// verified against the challenge's public cases BEFORE anything is packaged —
// a failing solver is never submitted.
//
// Note: the solver file is CommonJS (module.exports) per the challenge spec,
// while this agent is an ESM package — so verification runs it in a vm
// sandbox with a `module` shim instead of require().
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const SOLVER = path.join(HERE, "solvers", "evalExpr.js");
const CASES = JSON.parse(
  fs.readFileSync(path.join(HERE, "solvers", "evalExpr.cases.json"), "utf8")
);

// Extra edge cases beyond the public set (unary minus, spaces, decimals).
const EXTRA_CASES = [
  { in: "-5+3", out: -2 },
  { in: "2*-3", out: -6 },
  { in: " 1 + 2 ", out: 3 },
  { in: "0.5*8", out: 4 },
  { in: "10/3", out: 10 / 3 },
];

function loadEvalExpr() {
  const src = fs.readFileSync(SOLVER, "utf8");
  const sandbox = { module: { exports: {} }, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "evalExpr.js" });
  const { evalExpr } = sandbox.module.exports;
  if (typeof evalExpr !== "function") throw new Error("solver did not export evalExpr");
  return evalExpr;
}

export function verifyEvalExpr() {
  const evalExpr = loadEvalExpr();
  const all = [...CASES, ...EXTRA_CASES];
  const failed = all.filter(({ in: input, out }) => Math.abs(evalExpr(input) - out) > 1e-9);
  if (failed.length > 0) {
    throw new Error(`evalExpr failed ${failed.length} case(s): ${JSON.stringify(failed)}`);
  }
  return { passed: all.length, public: CASES.length };
}

export function buildCode(bounty, workdir) {
  if (bounty.slug !== "code-golf-expr") return null;
  const { passed, public: nPublic } = verifyEvalExpr();
  const dir = path.join(workdir, bounty.slug);
  fs.mkdirSync(dir, { recursive: true });
  const src = fs.readFileSync(SOLVER, "utf8");
  fs.writeFileSync(path.join(dir, "evalExpr.js"), src);
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# code-golf-expr — expression evaluator\n\n` +
      `Implements \`evalExpr(s)\` for a tiny arithmetic language (+ - * /, decimals,\n` +
      `parentheses, precedence), per https://github.com/AIProveRH/aiprove/tree/main/challenges/code-golf-expr.\n\n` +
      `Built autonomously by the AIProve agent (handle kay-goblog). The solver is\n` +
      `verified locally before packaging: ${passed} cases pass (${nPublic} public\n` +
      `cases from the challenge repo plus ${passed - nPublic} extra edge cases).\n\n` +
      `Entry: a single file exporting \`evalExpr\` (\`module.exports = { evalExpr }\`).\n` +
      `Source size: ${src.length} bytes.\n\n` +
      `Run the check: \`node -e "const {evalExpr}=require('./evalExpr.js'); console.log(evalExpr('1+2*3'))"  // 7\`\n`
  );
  return {
    dir,
    linkFile: "evalExpr.js",
    summary: `evalExpr: ${passed}/${passed} cases pass (${nPublic} public), ${src.length} bytes`,
  };
}
