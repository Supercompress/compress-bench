"use strict";
const U = require("./_util");

module.exports = {
  name: "grep-def",
  kind: "bash",
  description: "ripgrep output where every line mentions the symbol; only one is the definition. Mock with a prefix-sharing name is the near miss.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const noun = rng.pick(U.NOUNS);
    const owner = rng.pick(["tenant", "account", "workspace", "org"]);
    const sym = U.camel("resolve", owner, noun, "limit");
    const defFile = `src/${rng.pick(U.MODULES)}/${noun}-limits.ts`;
    const defLine = rng.int(10, 300);
    const def = `${defFile}:${defLine}:export async function ${sym}(${owner}Id: string, opts: LimitOpts = {}) {`;
    const lines = [`$ rg -n "${sym}" src test`];
    const callFile = U.uniq(rng, (r) => `src/${r.pick(U.MODULES)}/${r.pick(U.NOUNS)}-${r.pick(U.VERBS)}.ts:${r.int(1, 999)}`);
    for (let i = 0; i < n; i++) {
      const v = rng.pick(["limit", "cap", "max", "quota"]);
      const shape = rng.int(0, 3);
      if (shape === 0) lines.push(`${callFile()}:  const ${v} = await ${sym}(ctx.${owner}Id);`);
      else if (shape === 1) lines.push(`${callFile()}:    ${v}: await ${sym}(${owner}.id, { fresh: true }),`);
      else if (shape === 2) lines.push(`${callFile()}:import { ${sym} } from "../${noun}-limits";`);
      else lines.push(`${callFile()}:  if ((await ${sym}(id)).${v} < used) throw new LimitError();`);
    }
    U.insertAt(lines, [def], U.fracFor(rng, position));
    const mock = `test/__mocks__/${noun}-limits.ts:${rng.int(3, 30)}:export function ${sym}Mock(${owner}Id: string) {`;
    U.insertAt(lines, [mock], rng.float(0.1, 0.9));
    const query =
      style === "lexical"
        ? `Where is ${sym} defined? Give the file and line of the definition, not call sites.`
        : `Where does the real implementation live for the function that looks up a ${owner}'s ${noun} limit? I want the definition, not usages or mocks.`;
    return {
      text: lines.join("\n"),
      query,
      primary: [`${defFile}:${defLine}:`],
      golds: [`${defFile}:${defLine}:`, `export async function ${sym}(`],
      distractors: [`${sym}Mock(`],
    };
  },
};
