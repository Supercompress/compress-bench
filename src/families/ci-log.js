"use strict";
const U = require("./_util");

module.exports = {
  name: "ci-log",
  kind: "bash",
  description: "Jest CI run: hundreds of PASS lines, one FAIL block, a flaky-retry near-miss, coverage table tail.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const mod = rng.pick(U.MODULES);
    const a = rng.pick(U.NOUNS);
    const b = rng.pick(U.VERBS);
    const file = `src/${mod}/${a}-${b}.test.ts`;
    const near = `src/${mod}/${a}-${b}-legacy.test.ts`;
    const expected = rng.int(1000, 9999);
    let received = rng.int(1000, 9999);
    if (received === expected) received += 1;
    const line = rng.int(20, 400);
    const col = rng.int(5, 60);
    const files = U.uniq(rng, (r) => `src/${r.pick(U.MODULES)}/${r.pick(U.NOUNS)}-${r.pick(U.VERBS)}-${r.int(1, 99)}.test.ts`);
    const lines = [];
    for (let i = 0; i < n; i++) {
      const roll = rng.next();
      if (roll < 0.78) lines.push(` PASS  ${files()} (${rng.float(0.1, 4).toFixed(2)} s)`);
      else if (roll < 0.9) lines.push(`  console.log\n    [${rng.pick(U.MODULES)}] ${rng.pick(U.NOUNS)} ${rng.pick(U.VERBS)} ok (${rng.int(1, 900)}ms)`);
      else lines.push(`  ✓ ${rng.pick(U.VERBS)} the ${rng.pick(U.NOUNS)} when ${rng.pick(U.NOUNS)} is empty (${rng.int(1, 80)} ms)`);
    }
    const flat = lines.join("\n").split("\n");
    const caseName = `${a} ${b} › handles ${rng.pick(U.NOUNS)} boundary`;
    const block = [
      ` FAIL  ${file}`,
      `  ● ${caseName}`,
      ``,
      `    expect(received).toBe(expected) // Object.is equality`,
      ``,
      `    Expected: ${expected}`,
      `    Received: ${received}`,
      ``,
      `      at Object.<anonymous> (${file}:${line}:${col})`,
    ];
    U.insertAt(flat, block, U.fracFor(rng, position));
    // Near miss: a legacy suite that failed once then passed on retry.
    U.insertAt(flat, [` PASS  ${near} (retry 1 of 2, ${rng.float(1, 3).toFixed(2)} s)`], rng.float(0.2, 0.8));
    const cov = ["----------|---------|----------|---------|---------|", "File      | % Stmts | % Branch | % Funcs | % Lines |"];
    for (let i = 0; i < Math.round(n / 6); i++) {
      cov.push(`${rng.pick(U.NOUNS)}-${i}.ts | ${rng.float(40, 100).toFixed(2)} | ${rng.float(40, 100).toFixed(2)} | ${rng.float(40, 100).toFixed(2)} | ${rng.float(40, 100).toFixed(2)} |`);
    }
    const total = rng.int(n, n * 2);
    const text = [
      `$ npm test -- --ci --coverage`,
      ...flat,
      ``,
      `Test Suites: 1 failed, ${total} passed, ${total + 1} total`,
      ...cov,
    ].join("\n");
    const query =
      style === "lexical"
        ? `In the ${a} ${b} suite, which test file failed and what were Expected vs Received?`
        : `Why is CI red? Give me the failing spec file and the value it wanted versus what it got.`;
    return {
      text,
      query,
      primary: [`FAIL  ${file}`],
      golds: [`FAIL  ${file}`, `Expected: ${expected}`, `Received: ${received}`],
      distractors: [near],
    };
  },
};
