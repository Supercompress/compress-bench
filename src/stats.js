"use strict";
/** Small, dependency-free statistics used by the report. All resampling is seeded. */
const { Rng, hashSeed } = require("./rng");

/** Wilson score interval for a binomial proportion. */
function wilson(k, n, z = 1.959963984540054) {
  if (!n) return { p: NaN, lo: NaN, hi: NaN };
  const p = k / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Percentile bootstrap over rows. `stat(rows)` -> number. */
function bootstrap(rows, stat, { B = 2000, seed = 1, alpha = 0.05 } = {}) {
  if (!rows.length) return { est: NaN, lo: NaN, hi: NaN };
  const rng = new Rng(hashSeed("bootstrap", seed));
  const est = stat(rows);
  const vals = new Array(B);
  const sample = new Array(rows.length);
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < rows.length; i++) sample[i] = rows[Math.floor(rng.next() * rows.length)];
    vals[b] = stat(sample);
  }
  vals.sort((x, y) => x - y);
  return { est, lo: quantile(vals, alpha / 2), hi: quantile(vals, 1 - alpha / 2) };
}

function logChoose(n, k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

/** Exact two-sided McNemar test on discordant counts b (A hit, B miss) and c (A miss, B hit). */
function mcnemarExact(b, c) {
  const n = b + c;
  if (n === 0) return 1;
  const k = Math.min(b, c);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return Math.min(1, 2 * tail);
}

/** Holm–Bonferroni step-down adjustment. Returns adjusted p-values in input order. */
function holm(pvals) {
  const idx = pvals.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const m = pvals.length;
  const adj = new Array(m);
  let running = 0;
  idx.forEach(([p, i], rank) => {
    running = Math.max(running, Math.min(1, (m - rank) * p));
    adj[i] = running;
  });
  return adj;
}

/** Paired comparison of a boolean outcome between two arms over the same task ids. */
function pairedBinary(rowsA, rowsB, key) {
  const byId = new Map(rowsB.map((r) => [r.id, r]));
  let b = 0;
  let c = 0;
  let n = 0;
  for (const ra of rowsA) {
    const rb = byId.get(ra.id);
    if (!rb) continue;
    n++;
    if (ra[key] && !rb[key]) b++;
    else if (!ra[key] && rb[key]) c++;
  }
  return { n, aOnly: b, bOnly: c, p: mcnemarExact(b, c) };
}

module.exports = { wilson, bootstrap, quantile, mcnemarExact, holm, pairedBinary };
