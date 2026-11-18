"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { main } = require("../src/cli");

test("end-to-end run on a small slice writes a consistent report", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "compress-bench-"));
  const res = await main(["--split", "dev", "--sizes", "small", "--arms", "raw,truncate-tail-35,bm25-35,bm25-10,bm25-70", "--out", out, "--bootstrap", "100", "--quiet"]);
  const raw = res.arms.find((a) => a.name === "raw");
  assert.equal(raw.summary.primary.p, 1);
  assert.equal(raw.summary.cut.est, 0);
  assert.equal(raw.determinism.nondeterministic, 0);
  const tail = res.arms.find((a) => a.name === "truncate-tail-35");
  assert.ok(tail.by_position.tail.primary > 0.8 && tail.by_position.head.primary < 0.2, "tail truncation only finds tail needles");
  const md = fs.readFileSync(path.join(out, "REPORT.md"), "utf8");
  assert.match(md, /## Leaderboard/);
  assert.match(md, /## BM25 frontier/);
  const json = JSON.parse(fs.readFileSync(path.join(out, "results.json"), "utf8"));
  assert.equal(json.meta.n_tasks, res.meta.n_tasks);
  assert.equal(json.meta.seed, 20261116);
});
