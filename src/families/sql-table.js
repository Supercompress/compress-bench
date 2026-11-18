"use strict";
const U = require("./_util");

module.exports = {
  name: "sql-table",
  kind: "tool",
  description: "psql aligned table output. Gold row must survive; header row needed to interpret it. Ids differ by digit transposition.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const acct = U.uniq(rng, (r) => `acct_${r.int(1000, 9999)}`);
    const bal = U.uniq(rng, (r) => `${r.int(10, 99)},${String(r.int(0, 999)).padStart(3, "0")}.${String(r.int(0, 99)).padStart(2, "0")}`);
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push([acct(), `${rng.pick(U.FIRST)} ${rng.pick(U.LAST)}`, rng.pick(["us", "de", "jp", "br", "in", "gb"]), bal(), rng.pick(["active", "active", "active", "past_due", "closed"])]);
    }
    const gi = Math.min(n - 1, Math.floor(n * U.fracFor(rng, position)));
    rows[gi][4] = "frozen";
    const goldAcct = rows[gi][0];
    const digits = goldAcct.slice(5);
    const swapped = digits[0] + digits[2] + digits[1] + digits[3];
    const nearAcct = swapped !== digits ? `acct_${swapped}` : `acct_${digits.slice(0, 3)}${(Number(digits[3]) + 1) % 10}`;
    const ni = gi > 0 ? gi - 1 : gi + 1;
    rows[ni][0] = nearAcct;
    rows[ni][4] = "past_due";
    const fmt = (r) => ` ${r[0].padEnd(9)} | ${r[1].padEnd(14)} | ${r[2]} | ${r[3].padStart(10)} | ${r[4]}`;
    const text = [
      `$ psql -c "select id, owner, region, balance, state from accounts order by created_at"`,
      `    id     |     owner      | region |  balance   | state`,
      `-----------+----------------+--------+------------+---------`,
      ...rows.map(fmt),
      `(${n} rows)`,
    ].join("\n");
    const query =
      style === "lexical"
        ? `What's the balance and state of ${goldAcct}?`
        : `Which account is frozen, and what's its balance?`;
    return {
      text,
      query,
      primary: [style === "lexical" ? rows[gi][3] : goldAcct],
      golds: [goldAcct, rows[gi][3], "| frozen"],
      distractors: [nearAcct],
    };
  },
};
