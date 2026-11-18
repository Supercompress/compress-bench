"use strict";
const U = require("./_util");

module.exports = {
  name: "chat-transcript",
  kind: "chat",
  description: "Long agent/user transcript. A decision is made once; a rejected alternative appears later.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const ver = `${rng.pick([20, 22])}.${rng.int(1, 19)}.${rng.int(0, 9)}`;
    const rejected = `${rng.pick([18, 23, 24])}.${rng.int(1, 19)}.${rng.int(0, 9)}`;
    const lines = [];
    for (let i = 0; i < n; i++) {
      if (i % 2 === 0) lines.push(`[user]: can you check why ${rng.pick(U.MODULES)} ${rng.pick(U.VERBS)} the ${rng.pick(U.NOUNS)} twice?`);
      else lines.push(`[assistant]: I looked at ${rng.pick(U.MODULES)}/${rng.pick(U.NOUNS)}.ts — the ${rng.pick(U.NOUNS)} is ${rng.pick(U.VERBS)} on every ${rng.pick(U.NOUNS)} event; ${rng.pick(["I'll add a guard.", "I added a test.", "that looks intentional.", "fixed in the last commit."])}`);
    }
    const decision = [
      `[user]: the matrix is flaky on old runtimes, let's just pick one node version`,
      `[assistant]: Agreed — I'll pin Node ${ver} in .nvmrc and drop the older versions from the CI matrix.`,
      `[user]: 👍 ship it`,
    ];
    const near = [`[user]: someone on the team suggested Node ${rejected} instead`, `[assistant]: We discussed ${rejected} but rejected it — native modules don't build there yet. Keeping the pin.`];
    const di = U.insertAt(lines, decision, U.fracFor(rng, position));
    // Rejected alternative always comes after the decision.
    const after = di + decision.length;
    lines.splice(rng.int(after, lines.length), 0, ...near);
    return {
      text: lines.join("\n"),
      query:
        style === "lexical"
          ? `Which Node version did we pin in .nvmrc?`
          : `What runtime version did we settle on for the project in the end?`,
      primary: [`Node ${ver} in .nvmrc`],
      golds: [`Node ${ver} in .nvmrc`],
      distractors: [`Node ${rejected} instead`],
    };
  },
};
