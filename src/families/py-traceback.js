"use strict";
const U = require("./_util");

module.exports = {
  name: "py-traceback",
  kind: "bash",
  description: "Worker log with one fatal Python traceback (deep library frames) and one handled near-miss traceback.",
  styles: ["lexical", "paraphrase"],
  generate(rng, { size, position, style }) {
    const n = U.SIZES[size];
    const mod = rng.pick(U.MODULES);
    const fn = `apply_${rng.pick(U.NOUNS)}_${rng.pick(["adjustment", "transfer", "rollover", "credit"])}`;
    const appFile = `/app/services/${mod}/${rng.pick(U.NOUNS)}_${rng.pick(["ops", "core", "rules"])}.py`;
    const appLine = rng.int(80, 900);
    const cur = rng.pickN(["EUR", "USD", "GBP", "JPY", "CHF", "SEK", "BRL"], 2);
    const exc = `ValueError: currency mismatch on ${fn}: ${cur[0]} != ${cur[1]}`;
    const lines = [];
    let ms = 0;
    const ts = U.isoTime(rng);
    for (let i = 0; i < n; i++) {
      ms += rng.int(5, 900);
      lines.push(`${ts(ms)} INFO  worker[${rng.int(1, 8)}] ${rng.pick(U.MODULES)}.${rng.pick(U.NOUNS)} ${rng.pick(U.VERBS)} id=${rng.hex(8)} took=${rng.int(1, 400)}ms`);
    }
    const libFrames = [];
    for (let i = 0; i < rng.int(6, 14); i++) {
      const lib = rng.pick(["sqlalchemy/orm/session.py", "celery/app/trace.py", "kombu/messaging.py", "pydantic/main.py", "django/db/transaction.py"]);
      libFrames.push(`  File "/usr/local/lib/python3.12/site-packages/${lib}", line ${rng.int(10, 3000)}, in ${rng.pick(["__call__", "execute", "_run", "invoke", "flush", "commit"])}`);
      libFrames.push(`    ${rng.pick(["return fn(*args, **kwargs)", "self._flush(objects)", "result = self._execute(stmt)", "R = retval = fun(*args, **kwargs)"])}`);
    }
    const fatal = [
      `${ts(ms + 1)} ERROR worker[3] task ${mod}.${fn} crashed; marking job failed`,
      `Traceback (most recent call last):`,
      ...libFrames,
      `  File "${appFile}", line ${appLine}, in ${fn}`,
      `    raise ValueError(f"currency mismatch on ${fn}: {a.currency} != {b.currency}")`,
      exc,
    ];
    const nearFile = `/app/services/${rng.pick(U.MODULES)}/region_lookup.py`;
    const handled = [
      `${ts(ms + 2)} WARNING worker[5] handled exception, retrying in 2s`,
      `Traceback (most recent call last):`,
      `  File "${nearFile}", line ${rng.int(10, 79)}, in resolve_region`,
      `    return REGIONS[key]`,
      `KeyError: 'region'`,
    ];
    U.insertAt(lines, fatal, U.fracFor(rng, position));
    U.insertAt(lines, handled, rng.float(0.15, 0.85));
    const query =
      style === "lexical"
        ? `What exception crashed ${fn}, and at which file and line in our code was it raised?`
        : `What took the worker down, and where in our own code (not a library) did it originate?`;
    return {
      text: lines.join("\n"),
      query,
      primary: [`File "${appFile}", line ${appLine}`],
      golds: [`File "${appFile}", line ${appLine}`, exc],
      distractors: [nearFile, "KeyError: 'region'"],
    };
  },
};
