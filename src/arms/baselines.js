"use strict";
/**
 * Reference arms that any real compressor has to beat:
 *   raw            – no compression (upper bound on recall, 0% cut)
 *   truncate-head  – keep the first r of the text (what naive "head -n" does)
 *   truncate-tail  – keep the last r of the text (what naive "tail -n" does)
 *   random-lines   – keep a seeded random r of lines, in order (chance baseline)
 *   bm25           – query-aware BM25 line ranking under a budget of r (a strong, dumb,
 *                    20-line lexical baseline; the "frontier" every product should clear)
 */
const { Rng, hashSeed } = require("../rng");

const MARK = (n) => `[… ${n} lines omitted …]`;

function linesWithin(lines, ratio) {
  const total = lines.reduce((s, l) => s + l.length + 1, 0);
  return Math.max(1, Math.floor(total * ratio));
}

function truncateHead(text, ratio) {
  const lines = text.split("\n");
  const budget = linesWithin(lines, ratio);
  const out = [];
  let used = 0;
  for (const l of lines) {
    if (used + l.length + 1 > budget && out.length) break;
    out.push(l);
    used += l.length + 1;
  }
  return out.join("\n");
}

function truncateTail(text, ratio) {
  const lines = text.split("\n");
  const budget = linesWithin(lines, ratio);
  const out = [];
  let used = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (used + lines[i].length + 1 > budget && out.length) break;
    out.unshift(lines[i]);
    used += lines[i].length + 1;
  }
  return out.join("\n");
}

function renderKept(lines, keep) {
  const out = [];
  let gap = 0;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (gap) out.push(MARK(gap));
      gap = 0;
      out.push(lines[i]);
    } else gap++;
  }
  if (gap) out.push(MARK(gap));
  return out.join("\n");
}

function randomLines(text, ratio, seedKey) {
  const lines = text.split("\n");
  const rng = new Rng(hashSeed("random-lines", seedKey));
  const order = rng.shuffle(lines.map((_, i) => i));
  const budget = linesWithin(lines, ratio);
  const keep = new Array(lines.length).fill(false);
  let used = 0;
  for (const i of order) {
    if (used + lines[i].length + 1 > budget) continue;
    keep[i] = true;
    used += lines[i].length + 1;
  }
  return renderKept(lines, keep);
}

const STOP = new Set(
  "a an and are as at be by can did do does for from how i in is it of on or that the their this to was were what when where which who why with would me my our we us give get got what's whats".split(" ")
);

function bm25Terms(s) {
  return String(s)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function bm25(text, query, ratio, { k1 = 1.2, b = 0.75 } = {}) {
  const lines = text.split("\n");
  const docs = lines.map(bm25Terms);
  const q = [...new Set(bm25Terms(query))];
  const N = docs.length;
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(N, 1) || 1;
  const df = new Map();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const idf = (t) => {
    const n = df.get(t) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };
  const scores = docs.map((d) => {
    if (!d.length) return 0;
    const tf = new Map();
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      s += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
    }
    return s;
  });
  const budget = linesWithin(lines, ratio);
  const keep = new Array(N).fill(false);
  let used = 0;
  const order = scores.map((s, i) => [s, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (const [s, i] of order) {
    if (s <= 0) break;
    if (used + lines[i].length + 1 > budget) continue;
    keep[i] = true;
    used += lines[i].length + 1;
  }
  // Nothing matched: degrade to head+tail so the arm is still a fair budgeted baseline.
  if (!keep.some(Boolean)) {
    let i = 0;
    let j = N - 1;
    while (i <= j && used < budget) {
      keep[i] = true;
      used += lines[i++].length + 1;
      if (i <= j && used < budget) {
        keep[j] = true;
        used += lines[j--].length + 1;
      }
    }
  }
  return renderKept(lines, keep);
}

function localArm(name, description, fn, extra = {}) {
  return {
    name,
    type: "local",
    description,
    queryAware: false,
    available: () => ({ ok: true }),
    async compress(task) {
      return { text: fn(task) };
    },
    ...extra,
  };
}

function baselineArms({ ratio = 0.35, frontier = [0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9] } = {}) {
  const pct = (r) => Math.round(r * 100);
  const arms = [
    localArm("raw", "No compression (recall ceiling, 0% cut).", (t) => t.text, { reference: true }),
    localArm(`truncate-head-${pct(ratio)}`, `Keep the first ${pct(ratio)}% of characters (line-aligned).`, (t) => truncateHead(t.text, ratio), { reference: true }),
    localArm(`truncate-tail-${pct(ratio)}`, `Keep the last ${pct(ratio)}% of characters (line-aligned).`, (t) => truncateTail(t.text, ratio), { reference: true }),
    localArm(`random-lines-${pct(ratio)}`, `Seeded random ${pct(ratio)}% of lines, original order.`, (t) => randomLines(t.text, ratio, t.id), { reference: true }),
  ];
  for (const r of frontier) {
    arms.push(
      localArm(`bm25-${pct(r)}`, `BM25 line ranking against the query, ${pct(r)}% character budget.`, (t) => bm25(t.text, t.query, r), {
        queryAware: true,
        reference: true,
        frontier: r,
      })
    );
  }
  return arms;
}

module.exports = { baselineArms, truncateHead, truncateTail, randomLines, bm25, bm25Terms, renderKept, MARK };
