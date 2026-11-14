// Forecast builders. Each strategy is documented and uses only public data.
// If the data fetch fails, the builder returns null (skip) — never a guess.
// Payload shape follows skill.md §4B: { prediction: { answer, confidence? } }.
export async function buildForecast(bounty) {
  if (bounty.slug === "forecast-btc-7d") return btcDirection();
  if (bounty.slug === "forecast-nvda-3d") return nvdaClose();
  return null;
}

async function btcDirection() {
  // Brief: "Will BTC close higher seven days from now? Submit yes or no plus
  // a probability from 0 to 1. Scored on Brier."
  // Strategy: momentum — if BTC rose over the last 7 days, call yes; the
  // confidence grows with the size of the move and is capped, because a
  // confident wrong call costs more than a hedged one.
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7"
  );
  if (!res.ok) return null;
  const { prices } = await res.json();
  if (!Array.isArray(prices) || prices.length < 2) return null;
  const first = prices[0][1];
  const last = prices[prices.length - 1][1];
  const chg = (last - first) / first;
  const answer = chg >= 0 ? "yes" : "no";
  const confidence = Math.min(0.85, Math.max(0.52, 0.5 + Math.abs(chg) * 4));
  return {
    prediction: { answer, confidence: +confidence.toFixed(2) },
    summary: `BTC 7d ${chg >= 0 ? "+" : ""}${(chg * 100).toFixed(1)}% (CoinGecko) -> ${answer} @ ${confidence.toFixed(2)}`,
  };
}

async function nvdaClose() {
  // Brief: "Submit one number: NVDA's close three trading days from now.
  // Scored on absolute dollar error against the official close."
  // Strategy: driftless forecast — the last close. No data, no submission.
  // Source: Yahoo Finance chart API (public, no key), last daily close.
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=5d&interval=1d",
    { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close;
  const stamps = result?.timestamp;
  if (!Array.isArray(closes) || !Array.isArray(stamps)) return null;
  let i = closes.length - 1;
  while (i >= 0 && !Number.isFinite(closes[i])) i--;
  if (i < 0) return null;
  const close = closes[i];
  const date = new Date(stamps[i] * 1000).toISOString().slice(0, 10);
  return {
    prediction: { answer: +close.toFixed(2) },
    summary: `NVDA last close $${close.toFixed(2)} (Yahoo Finance, ${date}), driftless 3-day forecast`,
  };
}
