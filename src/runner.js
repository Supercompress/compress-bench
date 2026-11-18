"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { scoreOutput } = require("./scoring");

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

function cacheFor(dir, arm) {
  if (!dir) return { get: () => null, set: () => {}, flush: () => {} };
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${arm.name}.json`);
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* fresh cache */
  }
  let dirty = 0;
  const flush = () => {
    fs.writeFileSync(file, JSON.stringify(data));
    dirty = 0;
  };
  return {
    get: (key) => data[key] || null,
    set: (key, v) => {
      data[key] = v;
      if (++dirty >= 5) flush();
    },
    flush,
  };
}

const cacheKey = (t) => `${t.id}|${t.sha256}|${sha(t.query)}`;

/**
 * Run one arm over all tasks. Local arms are timed in-process and never cached.
 * Remote/worker arms are cached by (task id, text hash, query hash) so an interrupted run
 * resumes without re-billing; errors are never cached, so they are retried next run.
 */
async function runArm(arm, tasks, { concurrency = 3, cacheDir = null, log = () => {}, keepOutputs = false } = {}) {
  const cache = arm.type === "local" ? cacheFor(null) : cacheFor(cacheDir, arm);
  const outputs = keepOutputs ? {} : null;
  let done = 0;
  const one = async (t) => {
    const key = cacheKey(t);
    const hit = cache.get(key);
    let text;
    let ms;
    let mode = null;
    let error = null;
    if (hit) {
      ({ text, ms, mode } = hit);
    } else {
      const t0 = process.hrtime.bigint();
      try {
        const r = await arm.compress(t);
        text = r.text;
        mode = r.mode ?? null;
      } catch (e) {
        error = e && e.message ? e.message : String(e);
      }
      ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (!error) cache.set(key, { text, ms, mode });
    }
    done++;
    if (arm.type !== "local" && (done % 10 === 0 || done === tasks.length)) log(`  ${arm.name} ${done}/${tasks.length}`);
    if (outputs && !error) outputs[t.id] = text;
    return { ...scoreOutput(t, text, { ms, error, mode }), out_sha: error ? null : sha(text), cached: Boolean(hit) };
  };
  const rows = arm.type === "remote" ? await mapPool(tasks, concurrency, one) : await mapPool(tasks, 1, one);
  cache.flush();
  return { rows, outputs };
}

/** Second pass for local arms: same input must give byte-identical output. */
async function determinism(arm, tasks, firstRows) {
  if (arm.type !== "local") return null;
  const byId = new Map(firstRows.map((r) => [r.id, r.out_sha]));
  let diff = 0;
  for (const t of tasks) {
    let s = null;
    try {
      s = sha((await arm.compress(t)).text);
    } catch {
      s = null;
    }
    if (s !== byId.get(t.id)) diff++;
  }
  return { checked: tasks.length, nondeterministic: diff };
}

module.exports = { runArm, determinism, mapPool, sha };
