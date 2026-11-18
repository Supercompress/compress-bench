"use strict";
/**
 * Token counting. Uses o200k_base via js-tiktoken when resolvable (local node_modules or
 * $BENCH_DEPS/node_modules), else a chars/4 estimate. The tokenizer in use is recorded in
 * every report so numbers are never silently mixed.
 */
const path = require("path");

function load() {
  const candidates = ["js-tiktoken"];
  if (process.env.BENCH_DEPS) candidates.push(path.join(process.env.BENCH_DEPS, "node_modules", "js-tiktoken"));
  candidates.push("/tmp/bench-deps/node_modules/js-tiktoken");
  for (const c of candidates) {
    try {
      const { getEncoding } = require(c);
      const enc = getEncoding("o200k_base");
      return { name: "o200k_base", count: (s) => enc.encode(String(s ?? "")).length };
    } catch {
      /* try next */
    }
  }
  return { name: "chars/4-estimate", count: (s) => Math.ceil(String(s ?? "").length / 4) };
}

const tokenizer = load();
module.exports = { tokenizer, countTokens: tokenizer.count };
