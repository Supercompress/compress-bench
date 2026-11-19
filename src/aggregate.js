"use strict";
const { wilson, bootstrap, quantile, pairedBinary, holm } = require("./stats");

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

/** Token-weighted cut: 1 - Σout/Σin. */
const cutOf = (rows) => 1 - sum(rows, (r) => r.tokens_out) / Math.max(1, sum(rows, (r) => r.tokens_in));

/**
 * Recovery-adjusted cut: when the compressed context loses the answer, an agent has to go
 * back and read the raw output, so that task costs out + in tokens instead of out.
 * This is the single number that rewards savings and punishes lost evidence in the same unit.
 */
const effCutOf = (rows) =>
  1 - sum(rows, (r) => r.tokens_out + (r.primary_hit ? 0 : r.tokens_in)) / Math.max(1, sum(rows, (r) => r.tokens_in));

function summarize(rows, { seed = 1, B = 2000 } = {}) {
  const n = rows.length;
  const ok = rows.filter((r) => !r.error);
  const k = (f) => rows.filter(f).length;
  const lat = ok.map((r) => r.ms).sort((a, b) => a - b);
  const fid = ok.filter((r) => r.fidelity != null);
  return {
    n,
    errors: n - ok.length,
    primary: wilson(k((r) => r.primary_hit), n),
    all: wilson(k((r) => r.all_hit), n),
    gold_recall_micro: sum(rows, (r) => r.gold_recall) / Math.max(1, n),
    cut: bootstrap(rows, cutOf, { seed, B }),
    eff_cut: bootstrap(rows, effCutOf, { seed: seed + 1, B }),
    cut_task_median: quantile(rows.map((r) => r.cut).sort((a, b) => a - b), 0.5),
    tokens_in: sum(rows, (r) => r.tokens_in),
    tokens_out: sum(rows, (r) => r.tokens_out),
    distractor_rate: sum(rows, (r) => r.distractors_kept) / Math.max(1, n),
    fidelity_mean: fid.length ? sum(fid, (r) => r.fidelity) / fid.length : null,
    novel_lines_total: sum(ok, (r) => r.novel_lines || 0),
    tasks_with_novel_lines: ok.filter((r) => r.novel_lines > 0).length,
    out_of_order: ok.filter((r) => r.in_order === false).length,
    expanded: ok.filter((r) => r.expanded).length,
    untouched: ok.filter((r) => r.tokens_out >= r.tokens_in).length,
    // Abstention: tasks returned (nearly) whole. Passing input through is always "correct", so a
    // compressor can buy recall by abstaining. These two numbers make that visible.
    abstain_rate: ok.length ? ok.filter((r) => r.cut < 0.05).length / ok.length : 0,
    compressed_recall: (() => {
      const c = rows.filter((r) => !r.error && r.cut >= 0.05);
      return c.length ? { ...wilson(c.filter((r) => r.primary_hit).length, c.length), n: c.length } : null;
    })(),
    ms_p50: quantile(lat, 0.5),
    ms_p95: quantile(lat, 0.95),
  };
}

function breakdown(rows, key) {
  const groups = new Map();
  for (const r of rows) {
    const g = r[key];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  const out = {};
  for (const [g, rs] of groups) {
    out[g] = {
      n: rs.length,
      primary: rs.filter((r) => r.primary_hit).length / rs.length,
      all: rs.filter((r) => r.all_hit).length / rs.length,
      cut: cutOf(rs),
      eff_cut: effCutOf(rs),
    };
  }
  return out;
}

/**
 * Correctness tiers. Tier 1 = the arm with the highest primary recall plus every arm whose
 * recall is not significantly lower (paired exact McNemar, Holm-corrected, alpha 0.05).
 * Remove tier 1, repeat. Inside a tier, order by recovery-adjusted cut.
 */
function tiers(armResults, { alpha = 0.05 } = {}) {
  let pool = armResults.slice();
  const order = [];
  const comparisons = [];
  let tier = 1;
  while (pool.length) {
    const best = pool.slice().sort((a, b) => b.summary.primary.p - a.summary.primary.p || b.summary.eff_cut.est - a.summary.eff_cut.est)[0];
    const others = pool.filter((a) => a !== best);
    const tests = others.map((a) => pairedBinary(best.rows, a.rows, "primary_hit"));
    const adj = holm(tests.map((t) => t.p));
    const members = [best];
    others.forEach((a, i) => {
      const t = tests[i];
      comparisons.push({ step: tier, arm: a.name, vs: best.name, ...t, p_holm: adj[i] });
      // Significantly worse only if best wins more discordant pairs AND it survives correction.
      if (!(adj[i] < alpha && t.aOnly > t.bOnly)) members.push(a);
    });
    members.sort((a, b) => b.summary.eff_cut.est - a.summary.eff_cut.est);
    for (const m of members) order.push({ arm: m.name, tier });
    pool = pool.filter((a) => !members.includes(a));
    tier++;
  }
  return { order, comparisons };
}

/**
 * BM25 frontier lift: how much more primary recall an arm gets than the BM25 baseline would
 * at the *same* token cut (linear interpolation between the measured BM25 budget points).
 */
function frontierLift(arm, frontierArms) {
  const pts = frontierArms
    .map((a) => ({ cut: a.summary.cut.est, recall: a.summary.primary.p }))
    .sort((a, b) => a.cut - b.cut);
  if (pts.length < 2) return null;
  const c = arm.summary.cut.est;
  let clamped = false;
  let base;
  if (c <= pts[0].cut) {
    base = pts[0].recall;
    clamped = true;
  } else if (c >= pts[pts.length - 1].cut) {
    base = pts[pts.length - 1].recall;
    clamped = true;
  } else {
    for (let i = 1; i < pts.length; i++) {
      if (c <= pts[i].cut) {
        const a = pts[i - 1];
        const b = pts[i];
        base = a.recall + ((b.recall - a.recall) * (c - a.cut)) / (b.cut - a.cut || 1);
        break;
      }
    }
  }
  return { bm25_recall_at_cut: base, lift: arm.summary.primary.p - base, clamped };
}

module.exports = { summarize, breakdown, tiers, frontierLift, cutOf, effCutOf };
