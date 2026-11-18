"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateHead, truncateTail, randomLines, bm25, bm25Terms } = require("../src/arms/baselines");
const { withRetry } = require("../src/arms/products");

const text = Array.from({ length: 100 }, (_, i) => `line ${i} filler words here`).join("\n");

test("truncation respects the budget and the right end", () => {
  const h = truncateHead(text, 0.3);
  const t = truncateTail(text, 0.3);
  assert.ok(h.startsWith("line 0 "));
  assert.ok(t.endsWith("line 99 filler words here"));
  for (const s of [h, t]) assert.ok(s.length <= text.length * 0.3 + 30);
});

test("random-lines is seeded per key", () => {
  assert.equal(randomLines(text, 0.3, "a"), randomLines(text, 0.3, "a"));
  assert.notEqual(randomLines(text, 0.3, "a"), randomLines(text, 0.3, "b"));
});

test("bm25 terms split camelCase and drop stopwords", () => {
  assert.deepEqual(bm25Terms("Where is resolveTenantQuota defined?"), ["resolve", "tenant", "quota", "defined"]);
});

test("bm25 keeps the matching line and stays within budget", () => {
  const t = text.replace("line 57 filler words here", "ERROR payments-worker charge failed upstream timeout");
  const out = bm25(t, "why did the payments charge fail", 0.1);
  assert.ok(out.includes("ERROR payments-worker charge failed"));
  assert.ok(out.length < t.length * 0.2);
});

test("withRetry retries transient errors and stops on fatal ones", async () => {
  let n = 0;
  const v = await withRetry(async () => {
    if (++n < 3) throw new Error("flaky");
    return "ok";
  }, { baseMs: 1 });
  assert.equal(v, "ok");
  assert.equal(n, 3);
  let m = 0;
  await assert.rejects(withRetry(async () => {
    m++;
    throw Object.assign(new Error("401"), { fatal: true });
  }, { baseMs: 1 }));
  assert.equal(m, 1);
});
