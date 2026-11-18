"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreOutput, lineFacts } = require("../src/scoring");
const { countTokens } = require("../src/tokenize");

const task = {
  id: "t", family: "f", size: "small", position: "head", style: "lexical",
  text: "line one here\nERROR the gold line\n},\nline four here\n},\ntail line",
  golds: ["the gold line", "line four"],
  primary: ["the gold line"],
  distractors: ["tail line"],
};
task.tokens = countTokens(task.text);

test("raw output keeps everything", () => {
  const r = scoreOutput(task, task.text);
  assert.equal(r.primary_hit, true);
  assert.equal(r.all_hit, true);
  assert.equal(r.cut, 0);
  assert.equal(r.fidelity, 1);
  assert.equal(r.in_order, true, "repeated lines must not count as reordering");
  assert.equal(r.distractors_kept, 1);
});

test("containment is whitespace/case-insensitive but not paraphrase-tolerant", () => {
  assert.equal(scoreOutput(task, "  error   THE   gold\tline ").primary_hit, true);
  assert.equal(scoreOutput(task, "the golden line").primary_hit, false);
});

test("partial recall", () => {
  const r = scoreOutput(task, "ERROR the gold line");
  assert.equal(r.primary_hit, true);
  assert.equal(r.all_hit, false);
  assert.equal(r.gold_recall, 0.5);
  assert.deepEqual(r.golds_missing, ["line four"]);
});

test("errors are misses with zero savings, never a free pass", () => {
  const r = scoreOutput(task, null, { error: "HTTP 500" });
  assert.equal(r.primary_hit, false);
  assert.equal(r.cut, 0);
  assert.equal(r.tokens_out, r.tokens_in);
});

test("novel text lowers fidelity; markers do not", () => {
  const f = lineFacts(task, "ERROR the gold line\n[… 3 lines omitted …]\nsummary: something failed");
  assert.equal(f.markers, 1);
  assert.equal(f.novel, 1);
  assert.equal(f.fidelity, 0.5);
});

test("reordering is detected", () => {
  assert.equal(lineFacts(task, "tail line\nline one here").inOrder, false);
  assert.equal(lineFacts(task, "line one here\ntail line").inOrder, true);
});

test("expansion is flagged", () => {
  const r = scoreOutput(task, task.text + "\n" + task.text);
  assert.equal(r.expanded, true);
  assert.ok(r.cut < 0);
});
