"use strict";
/**
 * Cost model. Compression only changes INPUT tokens, so only input-side prices matter.
 *
 * Prices: Anthropic first-party API list prices, $ per 1M tokens, as listed in Anthropic's
 * Claude API reference (snapshot 2026-11-03). Override with --prices path/to/prices.json.
 * Cache write is modelled at 1.25x base input (5-minute TTL). Haiku 5.5's cache-read price is
 * not in the snapshot; 0.1x base input is assumed and flagged.
 *
 * Agent context model: a compressed tool result enters the context once (cache write) and is
 * then re-read from cache on each later turn of the session (`rereads`, default 10). Each
 * context token therefore costs  write + rereads * cacheRead.
 */
const PRICES_AS_OF = "2026-11-03";
const MODELS = [
  { id: "claude-fable-5-2", name: "Fable 5.2", input: 8.0, cacheRead: 0.2 },
  { id: "claude-opus-5-5", name: "Opus 5.5", input: 4.0, cacheRead: 0.2 },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", input: 2.0, cacheRead: 0.1 },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", input: 0.1, cacheRead: 0.01, assumed: "cache read assumed 0.1x input" },
];

/**
 * Usage scenarios in tool-output tokens per month entering agent context, before compression.
 * Team: ~50 engineers x ~20 agent sessions/day x ~50k tool-output tokens x 21 workdays ≈ 1B.
 */
const SCENARIOS = [
  { id: "team", name: "Team (1x)", tokensPerMonth: 1e9, note: "≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days" },
  { id: "enterprise-10x", name: "Enterprise (10x)", tokensPerMonth: 1e10, note: "≈500 engineers, same usage" },
  { id: "enterprise-100x", name: "Enterprise (100x)", tokensPerMonth: 1e11, note: "≈5,000 engineers, or heavy autonomous agents" },
];

function perTokenUsd(model, rereads = 10) {
  return (model.input * 1.25 + rereads * model.cacheRead) / 1e6;
}

/**
 * Cost for one arm. `keepFrac` = share of raw tokens that still has to be paid for, using the
 * recovery-adjusted figure (misses pay for a raw re-read), i.e. 1 - eff_cut.
 */
function armCosts(summary, { models = MODELS, scenarios = SCENARIOS, rereads = 10 } = {}) {
  const keepFrac = 1 - summary.eff_cut.est;
  const keepFracNaive = 1 - summary.cut.est;
  const out = { keepFrac, keepFracNaive, corpus: {}, monthly: {} };
  for (const m of models) {
    const p = perTokenUsd(m, rereads);
    out.corpus[m.id] = summary.tokens_in * keepFrac * p;
    out.monthly[m.id] = {};
    for (const s of scenarios) {
      const raw = s.tokensPerMonth * p;
      const cost = s.tokensPerMonth * keepFrac * p;
      out.monthly[m.id][s.id] = { raw, cost, saved: raw - cost };
    }
  }
  return out;
}

function loadPrices(file) {
  if (!file) return MODELS;
  const data = JSON.parse(require("fs").readFileSync(file, "utf8"));
  return data.models || data;
}

module.exports = { MODELS, SCENARIOS, PRICES_AS_OF, perTokenUsd, armCosts, loadPrices };
