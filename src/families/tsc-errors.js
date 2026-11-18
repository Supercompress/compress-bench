"use strict";
const U = require("./_util");

module.exports = {
  name: "tsc-errors",
  kind: "bash",
  description: "Build output dominated by warnings from the same file; exactly one hard error (TS2345).",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const mod = rng.pick(U.MODULES);
    const file = `src/${mod}/${rng.pick(U.NOUNS)}-store.ts`;
    const ln = rng.int(10, 600);
    const col = rng.int(3, 70);
    const lines = [`$ npm run build`, `> app@4.2.0 build`, `> tsc -p tsconfig.build.json && vite build`, ``];
    for (let i = 0; i < n; i++) {
      const f = rng.chance(0.3) ? file : `src/${rng.pick(U.MODULES)}/${rng.pick(U.NOUNS)}-${rng.pick(U.VERBS)}.ts`;
      const roll = rng.next();
      if (roll < 0.5) lines.push(`${f}:${rng.int(1, 900)}:${rng.int(1, 80)} - warning: '${rng.pick(U.NOUNS)}${rng.int(1, 9)}' is declared but its value is never read. (6133)`);
      else if (roll < 0.8) lines.push(`vite v6.0.${rng.int(1, 9)} transforming (${rng.int(1, 3000)}) ${f}`);
      else lines.push(`(!) ${f} is dynamically imported by ${rng.pick(U.MODULES)}/index.ts but also statically imported; dynamic import will not move module into another chunk.`);
    }
    const err = `${file}:${ln}:${col} - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.`;
    U.insertAt(lines, [err, `    ${ln} |   return client.fetch${mod[0].toUpperCase() + mod.slice(1)}(opts.id);`, `             ${" ".repeat(col)}~~~~~~~`], U.fracFor(rng, position));
    lines.push(``, `Found 1 error in ${file}:${ln}`);
    return {
      text: lines.join("\n"),
      query:
        style === "lexical"
          ? `What TypeScript error (code and location) broke the build in ${file}?`
          : `The build is failing — what's the actual compile error and where is it? Ignore warnings.`,
      primary: [`${file}:${ln}:${col} - error TS2345`],
      golds: [`${file}:${ln}:${col} - error TS2345`, `is not assignable to parameter of type 'string'`],
      distractors: [],
    };
  },
};
