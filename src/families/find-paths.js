"use strict";
const U = require("./_util");

const REGIONS = [
  ["eu-west-1", "Ireland"],
  ["eu-central-1", "Frankfurt"],
  ["ap-northeast-1", "Tokyo"],
  ["sa-east-1", "São Paulo"],
  ["ap-southeast-2", "Sydney"],
  ["ca-central-1", "Canada"],
];
const RES = [
  ["rds.tf", "relational database"],
  ["elasticache.tf", "Redis cache"],
  ["alb.tf", "load balancer"],
  ["sqs.tf", "message queues"],
];

module.exports = {
  name: "find-paths",
  kind: "bash",
  description: "`find` listing of an infra repo. Gold path has env/region/resource siblings that differ in one segment.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const [region, place] = rng.pick(REGIONS);
    const [res, what] = rng.pick(RES);
    const gold = `./infra/terraform/prod/${region}/${res}`;
    const otherRegion = rng.pick(REGIONS.filter((r) => r[0] !== region))[0];
    const near = [`./infra/terraform/staging/${region}/${res}`, `./infra/terraform/prod/${otherRegion}/${res}`];
    const p = U.uniq(rng, (r) => {
      const roll = r.next();
      if (roll < 0.5) return `./src/${r.pick(U.MODULES)}/${r.pick(U.NOUNS)}/${r.pick(U.VERBS)}_${r.int(1, 500)}.go`;
      if (roll < 0.8) return `./infra/terraform/${r.pick(["dev", "staging", "sandbox"])}/${r.pick(REGIONS)[0]}/${r.pick(U.NOUNS)}-${r.int(1, 60)}.tf`;
      return `./docs/${r.pick(U.MODULES)}/${r.pick(U.NOUNS)}-${r.int(1, 200)}.md`;
    });
    const lines = [];
    for (let i = 0; i < n; i++) lines.push(p());
    U.insertAt(lines, [gold], U.fracFor(rng, position));
    for (const d of near) U.insertAt(lines, [d], rng.float(0.05, 0.95));
    lines.unshift(`$ find . -type f -not -path '*/node_modules/*'`);
    const query =
      style === "lexical"
        ? `What's the path of the prod ${region} ${res} terraform file?`
        : `Which file configures the production ${what} for our ${place} region?`;
    return { text: lines.join("\n"), query, primary: [gold], golds: [gold], distractors: near };
  },
};
