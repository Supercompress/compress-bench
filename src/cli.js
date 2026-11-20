#!/usr/bin/env node
"use strict";
/**
 * compress-bench CLI.
 *
 *   node src/cli.js [--split test|dev|fresh] [--seed N] [--reps 1] [--arms a,b,c]
 *                   [--families f1,f2] [--sizes small,medium,large] [--ratio 0.35]
 *                   [--sample K] [--concurrency 3] [--out results] [--no-cache]
 *                   [--save-outputs] [--list]
 *
 * --sample K runs remote/worker arms on a stratified K-per-(family,size) subset; local arms
 * always run on everything. The leaderboard is computed on the task ids every ranked arm ran.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const { buildCorpus, stratifiedSample } = require("./corpus");
const { FAMILIES } = require("./families");
const { baselineArms } = require("./arms/baselines");
const { productArms } = require("./arms/products");
const { runArm, determinism } = require("./runner");
const { summarize, breakdown, tiers, frontierLift } = require("./aggregate");
const { render } = require("./report");
const { tokenizer } = require("./tokenize");
const pricing = require("./pricing");
const os = require("os");

/** Provenance is published: replace machine-specific prefixes so no local path or username leaks. */
function redact(v) {
  if (typeof v === "string") {
    let s = v;
    if (process.env.SC_ROOT) s = s.split(path.resolve(process.env.SC_ROOT)).join("$SC_ROOT");
    return s.split(os.homedir()).join("~");
  }
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x)]));
  return v;
}

function parseArgs(argv) {
  const a = { rereads: 10, split: "test", reps: 1, ratio: 0.35, concurrency: 3, out: path.join(__dirname, "..", "results"), cache: true, B: 2000 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--split") a.split = v();
    else if (k === "--seed") a.seed = Number(v());
    else if (k === "--reps") a.reps = Number(v());
    else if (k === "--arms") a.arms = v().split(",");
    else if (k === "--families") a.families = v().split(",");
    else if (k === "--sizes") a.sizes = v().split(",");
    else if (k === "--ratio") a.ratio = Number(v());
    else if (k === "--sample") a.sample = Number(v());
    else if (k === "--concurrency") a.concurrency = Number(v());
    else if (k === "--out") a.out = path.resolve(v());
    else if (k === "--no-cache") a.cache = false;
    else if (k === "--save-outputs") a.saveOutputs = true;
    else if (k === "--bootstrap") a.B = Number(v());
    else if (k === "--list") a.list = true;
    else if (k === "--rereads") a.rereads = Number(v());
    else if (k === "--prices") a.prices = path.resolve(v());
    else if (k === "--quiet") a.quiet = true;
    else throw new Error(`unknown flag ${k}`);
  }
  return a;
}

// Sealed splits publish scores only. Task ids name the held-out issues and gold text would hand
// them over, so both are replaced before anything is written next to the repo.
const SEALED = new Set(["real-test", "real-external"]);
function seal(out) {
  out.meta.sealed = true;
  for (const a of out.arms) {
    a.rows = a.rows.map((r, i) => {
      const { id, golds_missing, novel_samples, out_sha, ...rest } = r;
      return { ...rest, id: `sealed.${crypto.createHash("sha256").update(id).digest("hex").slice(0, 10)}`, golds_missing: [], novel_samples: [] };
    });
  }
}

function benchSha() {
  try {
    const dirty = execSync("git status --porcelain -- .", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const s = execSync("git rev-parse --short HEAD", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${s}+dirty` : s;
  } catch {
    return null;
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const log = args.quiet ? () => {} : (s) => process.stderr.write(s + "\n");
  const allArms = [...baselineArms({ ratio: args.ratio }), ...productArms({ ratio: args.ratio })];
  if (args.list) {
    for (const a of allArms) {
      const av = a.available();
      console.log(`${a.name.padEnd(22)} ${a.type.padEnd(7)} ${av.ok ? "available" : `unavailable: ${av.reason}`}`);
    }
    return null;
  }
  const corpus = buildCorpus({ split: args.split, seed: args.seed, families: args.families, sizes: args.sizes, reps: args.reps });
  const tasks = corpus.tasks;
  log(`compress-bench: split=${corpus.split} seed=${corpus.seed} tasks=${tasks.length} tokenizer=${tokenizer.name}`);

  const wanted = args.arms ? allArms.filter((a) => args.arms.includes(a.name)) : allArms;
  if (args.arms) {
    const unknown = args.arms.filter((n) => !allArms.some((a) => a.name === n));
    if (unknown.length) throw new Error(`unknown arms: ${unknown.join(", ")}`);
  }
  const sample = args.sample ? stratifiedSample(tasks, args.sample, corpus.seed) : null;
  const results = [];
  const skipped = [];
  for (const arm of wanted) {
    const av = arm.available();
    if (!av.ok) {
      skipped.push({ name: arm.name, reason: av.reason });
      log(`skip ${arm.name}: ${av.reason}`);
      continue;
    }
    const armTasks = arm.type !== "local" && sample ? sample : tasks;
    log(`run ${arm.name} on ${armTasks.length} tasks`);
    let initInfo = null;
    try {
      if (arm.init) initInfo = await arm.init();
    } catch (e) {
      skipped.push({ name: arm.name, reason: String(e.message || e).slice(0, 200) });
      log(`skip ${arm.name}: ${e.message}`);
      if (arm.stop) arm.stop();
      continue;
    }
    try {
      const { rows, outputs } = await runArm(arm, armTasks, {
        concurrency: args.concurrency,
        cacheDir: args.cache ? path.join(args.out, "cache") : null,
        log,
        keepOutputs: args.saveOutputs,
      });
      const det = await determinism(arm, armTasks, rows);
      if (outputs) {
        fs.mkdirSync(path.join(args.out, "outputs"), { recursive: true });
        fs.writeFileSync(path.join(args.out, "outputs", `${arm.name}.json`), JSON.stringify(outputs));
      }
      results.push({
        name: arm.name,
        type: arm.type,
        description: arm.description,
        queryAware: arm.queryAware,
        reference: Boolean(arm.reference),
        frontier: arm.frontier || null,
        provenance: redact({ ...(arm.available().provenance || av.provenance || {}), ...(initInfo || {}) }),
        determinism: det,
        allRows: rows,
      });
    } finally {
      if (arm.stop) arm.stop();
    }
  }

  // Evaluation set: task ids every non-skipped arm ran (= sample if any remote arm sampled).
  const idSets = results.map((r) => new Set(r.allRows.map((x) => x.id)));
  const evalIds = new Set(tasks.map((t) => t.id).filter((id) => idSets.every((s) => s.has(id))));
  const evalTasks = tasks.filter((t) => evalIds.has(t.id));
  const seed = corpus.seed;
  for (const r of results) {
    r.rows = r.allRows.filter((x) => evalIds.has(x.id));
    r.summary = summarize(r.rows, { seed, B: args.B });
    r.by_family = breakdown(r.rows, "family");
    r.by_size = breakdown(r.rows, "size");
    r.by_position = breakdown(r.rows, "position");
    r.by_style = breakdown(r.rows, "style");
    if (r.allRows.length !== r.rows.length) r.full_corpus = summarize(r.allRows, { seed, B: args.B });
    delete r.allRows;
  }
  const frontierArms = results.filter((r) => r.frontier);
  const bm25Headline = frontierArms.find((r) => Math.abs(r.frontier - args.ratio) < 1e-9)?.name || frontierArms[0]?.name || null;
  for (const r of results) if (!r.reference) r.frontier_lift = frontierLift(r, frontierArms);
  const ranked = results.filter((r) => !r.reference);
  const tierList = ranked.length ? tiers(ranked) : { order: [], comparisons: [] };

  const famStats = FAMILIES.filter((f) => evalTasks.some((t) => t.family === f.name)).map((f) => {
    const toks = evalTasks.filter((t) => t.family === f.name).map((t) => t.tokens).sort((a, b) => a - b);
    return { name: f.name, kind: f.kind, description: f.description, n: toks.length, median_tokens: toks[toks.length >> 1], max_tokens: toks[toks.length - 1] };
  });
  const out = {
    meta: {
      bench: "compress-bench",
      version: 1,
      generated_at: new Date().toISOString(),
      bench_sha: benchSha(),
      node: process.version,
      split: corpus.split,
      seed: corpus.seed,
      ratio: args.ratio,
      reps: args.reps,
      tokenizer: tokenizer.name,
      n_tasks: evalTasks.length,
      n_corpus: tasks.length,
      sampled: Boolean(sample) && evalTasks.length !== tasks.length,
      sample_per_cell: args.sample || null,
      n_sample: sample ? sample.length : null,
      families: famStats.map((f) => f.name),
      family_stats: famStats,
      corpus_tokens: evalTasks.reduce((s, t) => s + t.tokens, 0),
      corpus_sha: crypto.createHash("sha256").update(evalTasks.map((t) => t.sha256).join(",")).digest("hex").slice(0, 16),
      bm25_headline: bm25Headline,
      bootstrap_B: args.B,
      rereads: args.rereads,
      prices: pricing.loadPrices(args.prices),
      prices_as_of: args.prices ? `custom (${path.basename(args.prices)})` : pricing.PRICES_AS_OF,
      scenarios: pricing.SCENARIOS,
    },
    arms: results,
    tiers: tierList,
    skipped,
  };
  if (SEALED.has(corpus.split)) seal(out);
  fs.mkdirSync(args.out, { recursive: true });
  fs.writeFileSync(path.join(args.out, "results.json"), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(args.out, "REPORT.md"), render(out));
  log(`wrote ${path.join(args.out, "REPORT.md")}`);
  return out;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.stack || e);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };
