"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { wilson, mcnemarExact, holm, bootstrap, pairedBinary } = require("../src/stats");

const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("wilson matches reference values", () => {
  // 81/263 -> [0.2553, 0.3662] (Wilson 1927 / statsmodels proportion_confint method='wilson')
  const w = wilson(81, 263);
  close(w.lo, 0.2553);
  close(w.hi, 0.3662);
  const all = wilson(10, 10);
  close(all.hi, 1);
  close(all.lo, 0.7225);
});

test("exact McNemar", () => {
  assert.equal(mcnemarExact(0, 0), 1);
  close(mcnemarExact(0, 5), 0.0625); // 2 * 0.5^5
  close(mcnemarExact(1, 9), 0.02148, 1e-4);
  close(mcnemarExact(5, 5), 1);
});

test("holm adjustment", () => {
  const adj = holm([0.01, 0.04, 0.03, 0.005]);
  close(adj[3], 0.02);
  close(adj[0], 0.03);
  close(adj[2], 0.06);
  close(adj[1], 0.06);
});

test("bootstrap is seeded and brackets the estimate", () => {
  const rows = Array.from({ length: 200 }, (_, i) => ({ v: i % 3 === 0 ? 1 : 0 }));
  const mean = (rs) => rs.reduce((s, r) => s + r.v, 0) / rs.length;
  const a = bootstrap(rows, mean, { B: 500, seed: 3 });
  const b = bootstrap(rows, mean, { B: 500, seed: 3 });
  assert.deepEqual(a, b);
  assert.ok(a.lo <= a.est && a.est <= a.hi);
  assert.ok(a.hi - a.lo < 0.15);
});

test("pairedBinary counts discordant pairs by id", () => {
  const A = [{ id: 1, h: true }, { id: 2, h: true }, { id: 3, h: false }, { id: 4, h: true }];
  const B = [{ id: 1, h: false }, { id: 2, h: true }, { id: 3, h: true }, { id: 9, h: true }];
  const r = pairedBinary(A, B, "h");
  assert.equal(r.n, 3);
  assert.equal(r.aOnly, 1);
  assert.equal(r.bOnly, 1);
});
