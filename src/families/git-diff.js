"use strict";
const U = require("./_util");

module.exports = {
  name: "git-diff",
  kind: "bash",
  description: "Multi-file unified diff. Gold is a -/+ pair in one hunk; other hunks change similar config keys.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const nFiles = Math.max(3, Math.round(U.SIZES[size] / 22));
    const svc = rng.pick(["ledger", "inventory", "geocode", "fraud-score", "tax-rates"]);
    const before = rng.pick([2000, 5000, 8000]);
    const after = rng.pick([42000, 60000, 90000, 120000]);
    const goldFile = `src/clients/${svc}-client.ts`;
    const hunks = [];
    const fname = U.uniq(rng, (r) => `src/${r.pick(U.MODULES)}/${r.pick(U.NOUNS)}-${r.pick(U.VERBS)}.ts`);
    const ctx = (r) => `   ${r.pick(["const", "let"])} ${r.pick(U.NOUNS)}${r.int(1, 99)} = ${r.pick(["await load", "parse", "normalize", "build"])}(${r.pick(U.NOUNS)});`;
    for (let i = 0; i < nFiles; i++) {
      const f = fname();
      const h = [`diff --git a/${f} b/${f}`, `index ${rng.hex(7)}..${rng.hex(7)} 100644`, `--- a/${f}`, `+++ b/${f}`, `@@ -${rng.int(1, 300)},${rng.int(6, 14)} +${rng.int(1, 300)},${rng.int(6, 14)} @@`];
      for (let k = 0; k < rng.int(6, 22); k++) {
        const roll = rng.next();
        if (roll < 0.7) h.push(" " + ctx(rng));
        else if (roll < 0.85) h.push("-" + ctx(rng));
        else h.push("+" + ctx(rng));
      }
      hunks.push(h);
    }
    const goldHunk = [
      `diff --git a/${goldFile} b/${goldFile}`,
      `index ${rng.hex(7)}..${rng.hex(7)} 100644`,
      `--- a/${goldFile}`,
      `+++ b/${goldFile}`,
      `@@ -${rng.int(10, 80)},7 +${rng.int(10, 80)},7 @@ export function create${svc.replace(/-./g, (m) => m[1].toUpperCase()).replace(/^./, (c) => c.toUpperCase())}Client(cfg: ClientConfig) {`,
      `   return new HttpClient({`,
      `     baseUrl: cfg.baseUrl,`,
      `-    timeoutMs: ${before},`,
      `+    timeoutMs: ${after},`,
      `     retries: 2,`,
      `   });`,
      ` }`,
    ];
    const nearFile = `src/clients/${rng.pick(["search", "avatar", "email"])}-client.ts`;
    const nearHunk = [`diff --git a/${nearFile} b/${nearFile}`, `--- a/${nearFile}`, `+++ b/${nearFile}`, `@@ -12,5 +12,5 @@`, `   return new HttpClient({`, `-    retries: 3,`, `+    retries: 5,`, `     timeoutMs: 1500,`, `   });`];
    const gi = Math.min(hunks.length, Math.round(hunks.length * U.fracFor(rng, position)));
    hunks.splice(gi, 0, goldHunk);
    hunks.splice(rng.int(0, hunks.length), 0, nearHunk);
    const query =
      style === "lexical"
        ? `In this diff, what did timeoutMs in ${goldFile} change from and to?`
        : `After this change, how long will we wait on the ${svc} service before giving up, and what was it before?`;
    return {
      text: `$ git diff main...HEAD\n` + hunks.flat().join("\n"),
      query,
      primary: [`+    timeoutMs: ${after},`],
      golds: [`+++ b/${goldFile}`, `-    timeoutMs: ${before},`, `+    timeoutMs: ${after},`],
      distractors: [`+++ b/${nearFile}`],
    };
  },
};
