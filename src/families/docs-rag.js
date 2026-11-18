"use strict";
const U = require("./_util");

const FACTS = [
  {
    gold: (v) => `Idle sessions are revoked after ${v} minutes without activity.`,
    span: (v) => `${v} minutes`,
    near: (v) => `Refresh tokens expire after ${v + 3} days and must be re-issued.`,
    lex: "After how many minutes are idle sessions revoked?",
    para: "How long can a login sit unused before we kill it?",
    range: [11, 59],
  },
  {
    gold: (v) => `Exports larger than ${v} MB are split into gzip parts and delivered by signed URL.`,
    span: (v) => `${v} MB`,
    near: (v) => `Uploads larger than ${v + 100} MB require the multipart endpoint.`,
    lex: "Above what size in MB are exports split into gzip parts?",
    para: "At what file size does a data download get chopped into several compressed pieces?",
    range: [120, 900],
  },
  {
    gold: (v) => `Webhook deliveries are retried up to ${v} times with exponential backoff before the endpoint is disabled.`,
    span: (v) => `up to ${v} times`,
    near: (v) => `Email bounces are retried ${v + 2} times before the address is suppressed.`,
    lex: "How many times are webhook deliveries retried before the endpoint is disabled?",
    para: "If a customer's callback URL keeps failing, how many attempts do we make before switching it off?",
    range: [4, 19],
  },
  {
    gold: (v) => `Audit records are retained for ${v} days in hot storage before moving to cold archive.`,
    span: (v) => `${v} days in hot storage`,
    near: (v) => `Debug traces are retained for ${v + 1} hours only.`,
    lex: "How many days are audit records retained in hot storage?",
    para: "How long do compliance logs stay quickly searchable before they get archived?",
    range: [31, 400],
  },
];

const SENT = [
  (r) => `The ${r.pick(U.MODULES)} subsystem ${r.pick(U.VERBS)} each ${r.pick(U.NOUNS)} before it is persisted.`,
  (r) => `Operators can override the default ${r.pick(U.NOUNS)} ${r.pick(["limit", "timeout", "policy"])} per workspace in the admin console.`,
  (r) => `When a ${r.pick(U.NOUNS)} is ${r.pick(["stale", "missing", "corrupt"])}, the ${r.pick(U.SERVICES)} falls back to the previous ${r.pick(U.NOUNS)}.`,
  (r) => `See the ${r.pick(U.MODULES)} runbook for escalation contacts and paging rules.`,
  (r) => `All ${r.pick(U.NOUNS)} operations are idempotent and keyed by a client-supplied request id.`,
  (r) => `Rate limits apply per API key and are reported in the X-RateLimit headers.`,
  (r) => `Changes to ${r.pick(U.NOUNS)} configuration propagate to every region within a few minutes.`,
];

module.exports = {
  name: "docs-rag",
  kind: "rag",
  description: "Markdown product docs (RAG chunk dump). Paraphrase queries share almost no words with the gold sentence.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const fact = rng.pick(FACTS);
    const v = rng.int(...fact.range);
    const lines = [];
    let sec = 0;
    while (lines.length < n) {
      const m = rng.pick(U.MODULES);
      lines.push(``, `## ${m[0].toUpperCase()}${m.slice(1)}: ${rng.pick(U.NOUNS)} handling (${++sec})`, ``);
      const para = [];
      for (let k = 0; k < rng.int(3, 7); k++) para.push(rng.pick(SENT)(rng));
      lines.push(para.join(" "));
    }
    const gp = [`${rng.pick(SENT)(rng)} ${fact.gold(v)} ${rng.pick(SENT)(rng)}`];
    U.insertAt(lines, gp, U.fracFor(rng, position));
    U.insertAt(lines, [`${rng.pick(SENT)(rng)} ${fact.near(v)}`], rng.float(0.05, 0.95));
    return {
      text: `# Platform reference\n` + lines.join("\n"),
      query: style === "lexical" ? fact.lex : fact.para,
      primary: [fact.span(v)],
      golds: [fact.span(v)],
      distractors: [fact.near(v)],
    };
  },
};
