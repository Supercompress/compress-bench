"use strict";
const U = require("./_util");

module.exports = {
  name: "json-records",
  kind: "tool",
  description: "Pretty-printed JSON API response (one field per line). Answer needs the id line and sibling fields of the same object.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const nObj = Math.max(6, Math.round(U.SIZES[size] / 9));
    const id = U.uniq(rng, (r) => `ord_${r.alnum(6, true)}`);
    const amt = U.uniq(rng, (r) => r.int(1000, 999999));
    const statuses = ["paid", "paid", "paid", "refunded", "pending", "shipped"];
    const objs = [];
    for (let i = 0; i < nObj; i++) {
      objs.push({ order_id: id(), status: rng.pick(statuses), amount_cents: amt(), currency: rng.pick(["usd", "eur", "gbp"]), customer: `${rng.pick(U.FIRST)}.${rng.pick(U.LAST)}@example.com`, created_at: U.isoTime(rng)(rng.int(0, 9e8)) });
    }
    const goldIdx = Math.min(nObj - 1, Math.floor(nObj * U.fracFor(rng, position)));
    const g = objs[goldIdx];
    g.status = "chargeback";
    // Near miss: id differs only in the last character, refunded not charged back.
    const nearId = g.order_id.slice(0, -1) + (g.order_id.endsWith("Z") ? "Y" : "Z");
    const nearIdx = goldIdx > 0 ? goldIdx - 1 : goldIdx + 1;
    objs[nearIdx].order_id = nearId;
    objs[nearIdx].status = "refunded";
    const text = `$ curl -s https://api.internal/v2/orders?limit=${nObj} | jq .\n` + JSON.stringify({ data: objs, has_more: true, next_cursor: rng.hex(24) }, null, 2);
    const query =
      style === "lexical"
        ? `What is the status and amount_cents of order ${g.order_id}?`
        : `Which order got charged back, and for how much?`;
    const idLine = `"order_id": "${g.order_id}"`;
    const amtLine = `"amount_cents": ${g.amount_cents},`;
    return {
      text,
      query,
      primary: style === "lexical" ? [amtLine] : [idLine],
      golds: [idLine, `"status": "chargeback"`, amtLine],
      distractors: [`"order_id": "${nearId}"`],
    };
  },
};
