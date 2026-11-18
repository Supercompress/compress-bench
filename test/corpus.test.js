"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCorpus, validateTask, stratifiedSample, norm } = require("../src/corpus");
const { FAMILIES } = require("../src/families");
const { occurrences } = require("../src/families/_util");

const dev = buildCorpus({ split: "dev" });
const testSplit = buildCorpus({ split: "test" });

test("corpus is deterministic for a split", () => {
  const again = buildCorpus({ split: "dev" });
  assert.deepEqual(again.tasks.map((t) => t.sha256), dev.tasks.map((t) => t.sha256));
});

test("dev and test splits share no task text", () => {
  const a = new Set(dev.tasks.map((t) => t.sha256));
  assert.equal(testSplit.tasks.filter((t) => a.has(t.sha256)).length, 0);
});

test("full grid: every family x size x position x style is present", () => {
  for (const f of FAMILIES) {
    const n = dev.tasks.filter((t) => t.family === f.name).length;
    assert.equal(n, 3 * 3 * f.styles.length, f.name);
  }
});

test("every task satisfies the validation contract across many seeds", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const c = buildCorpus({ seed, sizes: ["small", "medium"] });
    for (const t of c.tasks) assert.deepEqual(validateTask(t), [], t.id);
  }
});

test("each gold occurs exactly once; distractors present and never contain a gold", () => {
  for (const t of [...dev.tasks, ...testSplit.tasks]) {
    const text = norm(t.text);
    for (const g of t.golds) assert.equal(occurrences(text, norm(g)), 1, `${t.id}: ${g}`);
    for (const d of t.distractors) {
      assert.ok(text.includes(norm(d)), `${t.id}: distractor ${d}`);
      for (const g of t.golds) assert.ok(!norm(d).includes(norm(g)));
    }
  }
});

test("queries never contain the primary answer", () => {
  for (const t of [...dev.tasks, ...testSplit.tasks]) {
    for (const p of t.primary) assert.ok(!norm(t.query).includes(norm(p)), t.id);
  }
});

test("needle position is honoured (first gold lands in the requested third)", () => {
  // aggregate-fails scatters by design; multi-hop pins its second hop elsewhere.
  const skip = new Set(["aggregate-fails", "multi-hop", "json-records"]);
  for (const t of dev.tasks.filter((x) => !skip.has(x.family) && x.size !== "small")) {
    const at = norm(t.text).indexOf(norm(t.primary[0])) / norm(t.text).length;
    const [lo, hi] = { head: [0, 0.34], middle: [0.3, 0.7], tail: [0.66, 1] }[t.position];
    assert.ok(at >= lo && at <= hi, `${t.id}: at ${at.toFixed(2)}`);
  }
});

test("sizes scale: large tasks are much bigger than small", () => {
  for (const f of FAMILIES) {
    const tok = (s) => dev.tasks.filter((t) => t.family === f.name && t.size === s).map((t) => t.tokens);
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
    assert.ok(med(tok("large")) > 8 * med(tok("small")), f.name);
  }
});

test("paraphrase queries avoid the distinctive gold tokens", () => {
  const distinct = (s) => (s.toLowerCase().match(/[a-z0-9_]{4,}/g) || []).filter((w) => /\d/.test(w));
  for (const t of dev.tasks.filter((x) => x.style === "paraphrase")) {
    const q = t.query.toLowerCase();
    for (const p of t.primary) for (const w of distinct(p)) assert.ok(!q.includes(w), `${t.id}: ${w}`);
  }
});

test("stratified sample is deterministic and balanced", () => {
  const a = stratifiedSample(dev.tasks, 2, 5);
  const b = stratifiedSample(dev.tasks, 2, 5);
  assert.deepEqual(a.map((t) => t.id), b.map((t) => t.id));
  assert.equal(a.length, FAMILIES.length * 3 * 2);
});

test("validateTask catches broken tasks", () => {
  const base = { text: "alpha beta gamma", query: "q?", golds: ["beta"], primary: ["beta"], distractors: [] };
  assert.deepEqual(validateTask(base), []);
  assert.ok(validateTask({ ...base, golds: ["zeta"], primary: ["zeta"] }).length);
  assert.ok(validateTask({ ...base, text: "beta beta" }).length);
  assert.ok(validateTask({ ...base, query: "where is beta?" }).length);
  assert.ok(validateTask({ ...base, distractors: ["alpha beta"] }).length);
});
