// evalExpr(s) — tiny arithmetic language: + - * /, decimals, parentheses,
// normal precedence. Recursive descent; also handles unary +/- and spaces.
// Entry point for the code-golf-expr challenge (module.exports per its spec).
// Verified against the challenge's public cases (see evalExpr.cases.json)
// plus extra edge cases, by the test in src/builders/code.mjs.
function evalExpr(s) {
  s = String(s).replace(/\s+/g, "");
  let i = 0;
  const peek = () => s[i];
  const expr = () => {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = () => {
    let v = factor();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const r = factor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const factor = () => {
    if (peek() === "(") {
      i++;
      const v = expr();
      i++;
      return v;
    }
    if (peek() === "-") {
      i++;
      return -factor();
    }
    if (peek() === "+") {
      i++;
      return factor();
    }
    const m = /^[0-9]*\.?[0-9]+/.exec(s.slice(i));
    if (!m) throw new Error("unexpected char at " + i);
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const v = expr();
  if (i !== s.length) throw new Error("trailing input at " + i);
  return v;
}

module.exports = { evalExpr };
