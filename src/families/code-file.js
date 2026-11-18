"use strict";
const U = require("./_util");

module.exports = {
  name: "code-file",
  kind: "read",
  description: "Source file read. Gold constant lives inside the current function; a *Legacy twin holds a different value.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const nFns = Math.max(4, Math.round(U.SIZES[size] / 12));
    const graceDays = rng.int(3, 29);
    const legacyDays = graceDays + rng.int(30, 60);
    const pct = rng.int(2, 9);
    const fnName = U.uniq(rng, (r) => U.camel(r.pick(["build", "load", "map", "parse", "sync", "score"]), r.pick(U.NOUNS), r.pick(["for", "from", "with"]), r.pick(U.MODULES)));
    const fns = [];
    for (let i = 0; i < nFns; i++) {
      const name = fnName();
      const body = [`export function ${name}(input: Input, ctx: Ctx): Output {`];
      for (let k = 0; k < rng.int(5, 12); k++) {
        body.push(`  const ${rng.pick(U.NOUNS)}${k} = ctx.${rng.pick(U.NOUNS)}.${rng.pick(["get", "map", "filter", "find"])}((x) => x.${rng.pick(U.NOUNS)} ${rng.pick(["===", ">", "<"])} ${rng.int(0, 500)});`);
      }
      body.push(`  return { ...input, ${rng.pick(U.NOUNS)}: ${rng.pick(U.NOUNS)}0 };`, `}`, ``);
      fns.push(body);
    }
    const gold = [
      `/** Late fee for an unpaid invoice. Current policy (2026). */`,
      `export function computeLateFee(invoice: Invoice, now: Date): Money {`,
      `  const GRACE_DAYS = ${graceDays};`,
      `  const FEE_PCT = ${pct};`,
      `  const overdue = daysBetween(invoice.dueAt, now) - GRACE_DAYS;`,
      `  if (overdue <= 0) return Money.zero(invoice.currency);`,
      `  return invoice.total.percent(FEE_PCT);`,
      `}`,
      ``,
    ];
    const legacy = [
      `/** @deprecated pre-2024 policy, kept for replaying old invoices. */`,
      `export function computeLateFeeLegacy(invoice: Invoice, now: Date): Money {`,
      `  const GRACE_DAYS_V1 = ${legacyDays};`,
      `  return daysBetween(invoice.dueAt, now) > GRACE_DAYS_V1 ? invoice.total.percent(10) : Money.zero(invoice.currency);`,
      `}`,
      ``,
    ];
    const gi = Math.min(fns.length, Math.round(fns.length * U.fracFor(rng, position)));
    fns.splice(gi, 0, gold);
    fns.splice(rng.int(0, fns.length), 0, legacy);
    const header = [`// src/billing/fees.ts`, `import { Money } from "../money";`, `import { daysBetween } from "../dates";`, ``];
    const query =
      style === "lexical"
        ? `In computeLateFee, what are GRACE_DAYS and FEE_PCT?`
        : `Under the current billing rules, how many days after the due date before a customer gets a late penalty, and what percentage is it?`;
    return {
      text: [...header, ...fns.flat()].join("\n"),
      query,
      primary: [`GRACE_DAYS = ${graceDays};`],
      golds: [`function computeLateFee(`, `GRACE_DAYS = ${graceDays};`, `FEE_PCT = ${pct};`],
      distractors: [`GRACE_DAYS_V1 = ${legacyDays};`],
    };
  },
};
