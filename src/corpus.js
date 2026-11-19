"use strict";
/**
 * Corpus builder. Every task is a pure function of (split seed, task id), so a run is
 * reproducible from its recorded seed and nothing else.
 *
 * Splits:
 *   dev   – fixed seed, fine to look at and tune against
 *   test  – fixed held-out seed, published numbers come from here
 *   fresh – seed derived from the wall clock at run time (recorded in the report); use it to
 *           check nobody (including us) overfit the fixed splits
 */
const crypto = require("crypto");
const { Rng, hashSeed } = require("./rng");
const { FAMILIES, byName } = require("./families");
const { SIZES, POSITIONS, occurrences } = require("./families/_util");
const { countTokens } = require("./tokenize");

const SPLIT_SEEDS = { dev: 20261116, test: 7_340_033 };

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Validation contract every generated task must satisfy. Returns a list of problems. */
function validateTask(t) {
  const problems = [];
  const text = norm(t.text);
  if (!t.query || !t.query.trim()) problems.push("empty query");
  for (const g of t.golds) {
    const c = occurrences(text, norm(g));
    if (c !== 1) problems.push(`gold occurs ${c}x: ${g}`);
  }
  for (const p of t.primary) {
    if (!t.golds.includes(p)) problems.push(`primary not in golds: ${p}`);
  }
  for (const d of t.distractors) {
    if (occurrences(text, norm(d)) < 1) problems.push(`distractor missing: ${d}`);
    for (const g of t.golds) {
      if (norm(d).includes(norm(g))) problems.push(`distractor contains gold: ${d} ⊇ ${g}`);
    }
  }
  // The answer must not be handed over in the question itself.
  for (const p of t.primary) {
    if (norm(t.query).includes(norm(p))) problems.push(`query leaks primary gold: ${p}`);
  }
  return problems;
}

function buildTask(family, { splitSeed, size, position, style, rep }) {
  const id = `${family.name}.${size}.${position}.${style}.r${rep}`;
  for (let attempt = 0; attempt < 25; attempt++) {
    const rng = new Rng(hashSeed(splitSeed, id, attempt));
    const g = family.generate(rng, { size, position, style });
    const t = {
      id,
      family: family.name,
      kind: family.kind,
      size,
      position,
      style,
      rep,
      attempt,
      text: g.text,
      query: g.query,
      golds: g.golds,
      primary: g.primary,
      distractors: g.distractors || [],
    };
    const problems = validateTask(t);
    if (!problems.length) {
      t.tokens = countTokens(t.text);
      t.sha256 = crypto.createHash("sha256").update(t.text).digest("hex").slice(0, 16);
      return t;
    }
    if (attempt === 24) throw new Error(`${id}: could not generate a valid task: ${problems.join("; ")}`);
  }
  return null;
}

/**
 * Real split: tool outputs from public SWE-agent runs (see scripts/build_real_split.py).
 *   real-dev   data/real/dev.jsonl.gz, public, fine to tune against
 *   real-test  sealed; read from $COMPRESS_BENCH_REAL_TEST (default ~/.config/compress-bench/real-test.jsonl.gz)
 */
function loadRealSplit(split) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const zlib = require("zlib");
  const local = (f) => path.join(os.homedir(), ".config", "compress-bench", f);
  const file = split === "real-dev"
    ? path.join(__dirname, "..", "data", "real", "dev.jsonl.gz")
    : split === "real-external"
      ? process.env.COMPRESS_BENCH_REAL_EXTERNAL || local("external-openhands.jsonl.gz")
      : process.env.COMPRESS_BENCH_REAL_TEST || local("real-test.jsonl.gz");
  if (!fs.existsSync(file)) throw new Error(`${split}: ${file} not found`);
  const blob = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  const tasks = [];
  for (const line of blob.split("\n")) {
    if (!line.trim()) continue;
    const t = JSON.parse(line);
    const problems = validateTask(t);
    if (problems.length) continue; // builder already filters; skip anything the scorer cannot judge
    t.tokens = countTokens(t.text);
    t.sha256 = crypto.createHash("sha256").update(t.text).digest("hex").slice(0, 16);
    tasks.push(t);
  }
  const seed = parseInt(crypto.createHash("sha256").update(blob).digest("hex").slice(0, 8), 16) >>> 0;
  return { split, seed, tasks, source_sha256: crypto.createHash("sha256").update(blob).digest("hex") };
}

function resolveSeed(split, seed) {
  if (seed != null) return Number(seed) >>> 0;
  if (split === "fresh") return hashSeed("fresh", Date.now()) >>> 0;
  if (!(split in SPLIT_SEEDS)) throw new Error(`unknown split ${split}`);
  return SPLIT_SEEDS[split];
}

function buildCorpus({
  split = "test",
  seed = null,
  families = null,
  sizes = Object.keys(SIZES),
  positions = Object.keys(POSITIONS),
  reps = 1,
} = {}) {
  if (String(split).startsWith("real-")) {
    const real = loadRealSplit(split);
    if (families) real.tasks = real.tasks.filter((t) => families.includes(t.family));
    real.tasks = real.tasks.filter((t) => sizes.includes(t.size));
    return real;
  }
  const splitSeed = resolveSeed(split, seed);
  const fams = families ? families.map((n) => {
    if (!byName[n]) throw new Error(`unknown family ${n}`);
    return byName[n];
  }) : FAMILIES;
  const tasks = [];
  for (const f of fams) {
    for (const size of sizes) {
      for (const position of positions) {
        for (const style of f.styles) {
          for (let rep = 0; rep < reps; rep++) {
            tasks.push(buildTask(f, { splitSeed, size, position, style, rep }));
          }
        }
      }
    }
  }
  return { split, seed: splitSeed, tasks };
}

/** Deterministic stratified subsample: `perCell` tasks per (family, size). */
function stratifiedSample(tasks, perCell, seed) {
  const cells = new Map();
  for (const t of tasks) {
    const k = `${t.family}|${t.size}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(t);
  }
  const rng = new Rng(hashSeed(seed, "sample"));
  const out = [];
  for (const list of cells.values()) out.push(...rng.shuffle(list.slice()).slice(0, perCell));
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  return out.sort((a, b) => order.get(a.id) - order.get(b.id));
}

module.exports = { buildCorpus, buildTask, validateTask, stratifiedSample, resolveSeed, SPLIT_SEEDS, norm };
