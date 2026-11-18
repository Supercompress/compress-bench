"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Rng, hashSeed } = require("../src/rng");

test("same seed -> identical stream", () => {
  const a = new Rng(42);
  const b = new Rng(42);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
});

test("different seeds diverge and stay in [0,1)", () => {
  const a = new Rng(1);
  const b = new Rng(2);
  let same = 0;
  for (let i = 0; i < 1000; i++) {
    const x = a.next();
    assert.ok(x >= 0 && x < 1);
    if (x === b.next()) same++;
  }
  assert.ok(same < 5);
});

test("int() covers both bounds and is roughly uniform", () => {
  const r = new Rng(7);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60000; i++) counts[r.int(0, 5)]++;
  for (const c of counts) assert.ok(c > 9000 && c < 11000, `count ${c}`);
});

test("hashSeed is stable and order-sensitive", () => {
  assert.equal(hashSeed("a", 1), hashSeed("a", 1));
  assert.notEqual(hashSeed("a", 1), hashSeed(1, "a"));
});
