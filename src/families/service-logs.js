"use strict";
const U = require("./_util");

module.exports = {
  name: "service-logs",
  kind: "bash",
  description: "Interleaved multi-service access/app logs. One ERROR with request id; WARN retries carry adjacent ids.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const ts = U.isoTime(rng);
    const rid = U.uniq(rng, (r) => `r-${r.hex(8)}`);
    const goldReq = rid();
    const upstream = rng.pick(["stripe", "adyen", "braintree"]);
    const timeout = rng.pick([15000, 20000, 30000, 45000]);
    const lines = [];
    let ms = 0;
    for (let i = 0; i < n; i++) {
      ms += rng.int(1, 300);
      const svc = rng.pick(U.SERVICES);
      lines.push(`${ts(ms)} INFO  ${svc.padEnd(15)} req=${rid()} ${rng.pick(["GET", "POST", "PUT"])} ${rng.pick(U.ROUTES)} ${rng.pick([200, 200, 200, 201, 204, 304])} ${rng.int(2, 900)}ms`);
    }
    const err = `${ts(ms + 7)} ERROR payments-worker   req=${goldReq} charge failed: upstream timeout after ${timeout}ms (${upstream})`;
    U.insertAt(lines, [err], U.fracFor(rng, position));
    const near = [];
    for (let k = 0; k < 3; k++) {
      const r = goldReq.slice(0, -1) + "0123456789abcdef".replace(goldReq.slice(-1), "")[k];
      near.push(r);
      U.insertAt(lines, [`${ts(ms + 9 + k)} WARN  payments-worker   req=${r} charge slow: ${rng.int(2000, 9000)}ms (${upstream}), retrying`], rng.float(0.05, 0.95));
    }
    const query =
      style === "lexical"
        ? `What error did payments-worker log, and for which req id?`
        : `Why did the customer's card charge fail? Include the request ID so I can trace it.`;
    return {
      text: lines.join("\n"),
      query,
      primary: [`req=${goldReq}`],
      golds: [`req=${goldReq}`, `upstream timeout after ${timeout}ms`],
      distractors: near.map((r) => `req=${r}`),
    };
  },
};
