"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { summarize, tiers, frontierLift, effCutOf, cutOf } = require("../src/aggregate");

const mk = (hits, out = 30) => hits.map((h, i) => ({ id: i, primary_hit: h, all_hit: h, gold_recall: h ? 1 : 0, tokens_in: 100, tokens_out: out, cut: 1 - out / 100, distractors_kept: 0, fidelity: 1, novel_lines: 0, in_order: true, ms: 1, error: null, expanded: false }));

test("recovery-adjusted cut charges a full re-read per miss", () => {
  const rows = mk([true, false], 30);
  assert.equal(cutOf(rows), 0.7);
  assert.equal(effCutOf(rows), 1 - (30 + 130) / 200);
});

test("tiers: clearly worse arm drops a tier, indistinguishable arm stays", () => {
  const good = { name: "good", rows: mk(Array(60).fill(true), 50) };
  const same = { name: "same", rows: mk([...Array(58).fill(true), false, false], 20) };
  const bad = { name: "bad", rows: mk([...Array(30).fill(true), ...Array(30).fill(false)], 10) };
  for (const a of [good, same, bad]) a.summary = summarize(a.rows, { B: 100 });
  const t = tiers([good, same, bad]);
  const tierOf = Object.fromEntries(t.order.map((x) => [x.arm, x.tier]));
  assert.equal(tierOf.good, 1);
  assert.equal(tierOf.same, 1);
  assert.equal(tierOf.bad, 2);
  // Inside tier 1 the cheaper arm ranks first.
  assert.equal(t.order[0].arm, "same");
  assert.ok(t.comparisons.some((c) => c.arm === "bad" && c.p_holm < 0.05));
});

test("frontier lift interpolates between BM25 points", () => {
  const f = (cut, p) => ({ summary: { cut: { est: cut }, primary: { p } } });
  const pts = [f(0.5, 0.9), f(0.9, 0.5)];
  const r = frontierLift(f(0.7, 0.8), pts);
  assert.ok(Math.abs(r.bm25_recall_at_cut - 0.7) < 1e-9);
  assert.ok(Math.abs(r.lift - 0.1) < 1e-9);
  assert.equal(r.clamped, false);
  assert.equal(frontierLift(f(0.95, 0.4), pts).clamped, true);
});
