"use strict";
const U = require("./_util");

module.exports = {
  name: "multi-hop",
  kind: "bash",
  description: "Two-hop: the error line names a session id; a separate auth line maps that session to a user. Both are needed.",
  styles: ["paraphrase"],
  generate(rng, { size, position }) {
    const n = U.SIZES[size];
    const ts = U.isoTime(rng);
    const sid = U.uniq(rng, (r) => `sess_${r.alnum(10)}`);
    const goldSid = sid();
    const email = `${rng.pick(U.FIRST)}.${rng.pick(U.LAST)}${rng.int(10, 99)}@${rng.pick(["acme.io", "globex.com", "initech.dev"])}`;
    const lines = [];
    let ms = 0;
    const sessionsSeen = [];
    for (let i = 0; i < n; i++) {
      ms += rng.int(1, 400);
      if (rng.chance(0.25)) {
        const s = sid();
        sessionsSeen.push(s);
        lines.push(`${ts(ms)} INFO  auth-service    login ok session=${s} user=${rng.pick(U.FIRST)}.${rng.pick(U.LAST)}${rng.int(10, 99)}@example.com mfa=${rng.pick(["totp", "webauthn", "none"])}`);
      } else {
        lines.push(`${ts(ms)} INFO  ${rng.pick(U.SERVICES).padEnd(15)} session=${rng.pick(sessionsSeen.length ? sessionsSeen : [sid()])} ${rng.pick(["GET", "POST"])} ${rng.pick(U.ROUTES)} 200 ${rng.int(2, 700)}ms`);
      }
    }
    const loginLine = `${ts(1)} INFO  auth-service    login ok session=${goldSid} user=${email} mfa=totp`;
    const errLine = `${ts(ms + 5)} ERROR checkout-api    session=${goldSid} checkout failed: inventory reservation expired (order total 412.90 EUR)`;
    // Login line lands early-ish; error line at the requested position (always after the login).
    const loginFrac = Math.max(0.01, U.fracFor(rng, position) - rng.float(0.2, 0.4));
    U.insertAt(lines, [loginLine], position === "head" ? 0.01 : loginFrac);
    U.insertAt(lines, [errLine], U.fracFor(rng, position));
    return {
      text: lines.join("\n"),
      query: "Which customer's checkout failed? I need their email address and the reason.",
      primary: [`user=${email}`],
      golds: [`user=${email}`, `session=${goldSid} checkout failed`, `inventory reservation expired`],
      distractors: [],
    };
  },
};
