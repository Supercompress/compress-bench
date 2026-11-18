"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { armCosts, perTokenUsd, MODELS, SCENARIOS } = require("../src/pricing");

const opus = MODELS.find((m) => m.id === "claude-opus-5-5");

test("per-token cost = 1.25x write + rereads x cache read", () => {
  assert.ok(Math.abs(perTokenUsd(opus, 10) - (4 * 1.25 + 10 * 0.2) / 1e6) < 1e-15);
  assert.ok(Math.abs(perTokenUsd(opus, 0) - 5 / 1e6) < 1e-15);
});

test("raw arm saves nothing; costs scale linearly 1x/10x/100x", () => {
  const raw = armCosts({ tokens_in: 1000, cut: { est: 0 }, eff_cut: { est: 0 } });
  const m = raw.monthly["claude-opus-5-5"];
  assert.equal(m.team.saved, 0);
  assert.ok(Math.abs(m["enterprise-10x"].raw / m.team.raw - 10) < 1e-9);
  assert.ok(Math.abs(m["enterprise-100x"].raw / m.team.raw - 100) < 1e-9);
  assert.equal(SCENARIOS.length, 3);
});

test("savings use the recovery-adjusted cut, not the naive cut", () => {
  const c = armCosts({ tokens_in: 1000, cut: { est: 0.9 }, eff_cut: { est: 0.5 } });
  const m = c.monthly["claude-sonnet-5-5"].team;
  assert.ok(Math.abs(m.saved / m.raw - 0.5) < 1e-9);
});
