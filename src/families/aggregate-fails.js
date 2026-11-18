"use strict";
const U = require("./_util");

module.exports = {
  name: "aggregate-fails",
  kind: "bash",
  description: "Global question: list EVERY failing test. 4-9 failures scattered through a pytest -v run; all must survive.",
  styles: ["lexical"],
  generate(rng, { size, position }) {
    const n = U.SIZES[size];
    const name = U.uniq(rng, (r) => `tests/${r.pick(U.MODULES)}/test_${r.pick(U.NOUNS)}_${r.pick(U.VERBS)}.py::test_${r.pick(U.NOUNS)}_${r.int(1, 999)}`);
    const lines = [`$ pytest -v -p no:cacheprovider`, `============================= test session starts ==============================`];
    for (let i = 0; i < n; i++) lines.push(`${name()} PASSED${" ".repeat(rng.int(1, 8))}[${String(Math.round((100 * i) / n)).padStart(3)}%]`);
    const k = rng.int(4, 9);
    const fails = [];
    for (let j = 0; j < k; j++) {
      const f = name();
      fails.push(f);
      // Scatter uniformly; `position` only biases the first failure.
      const frac = j === 0 ? U.fracFor(rng, position) : rng.float(0.03, 0.97);
      U.insertAt(lines, [`${f} FAILED${" ".repeat(rng.int(1, 8))}[ ${rng.int(1, 99)}%]`], frac);
    }
    lines.push(`=========================== short test summary info ============================`, `========== ${k} failed, ${n} passed in ${rng.float(20, 400).toFixed(2)}s ==========`);
    return {
      text: lines.join("\n"),
      query: "List every test that failed in this run.",
      primary: fails.map((f) => `${f} FAILED`),
      golds: fails.map((f) => `${f} FAILED`),
      distractors: [],
    };
  },
};
