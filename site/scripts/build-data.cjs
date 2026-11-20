#!/usr/bin/env node
"use strict";
/**
 * Flattens the benchmark results into the one JSON file the site reads.
 *
 *   node site/scripts/build-data.cjs            (from the repo root)
 *
 * Inputs:  results/ (held-out test split, all arms), results-dev/, results-fresh/ (local arms)
 * Output:  site/src/data/bench.json
 *
 * The guided-scroll example task is regenerated from the seeded corpus and run through the
 * local arms. Running supercompress-fast and the Probe0 port needs SC_ROOT; without it those
 * two traces are copied from the existing bench.json so the site still builds in CI.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(__dirname, "..", "src", "data", "bench.json");
const { buildCorpus } = require(path.join(ROOT, "src/corpus"));
const { baselineArms, MARK } = require(path.join(ROOT, "src/arms/baselines"));
const { scFastArm, probe0Arm } = require(path.join(ROOT, "src/arms/products"));
const { countTokens } = require(path.join(ROOT, "src/tokenize"));
const pricing = require(path.join(ROOT, "src/pricing"));
const { FAMILIES } = require(path.join(ROOT, "src/families"));

const read = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, d, "results.json"), "utf8"));
const r3 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const trim = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function slimSummary(s) {
  return {
    n: s.n,
    errors: s.errors,
    primary: { p: r3(s.primary.p), lo: r3(s.primary.lo), hi: r3(s.primary.hi) },
    all: r3(s.all.p),
    cut: { est: r3(s.cut.est), lo: r3(s.cut.lo), hi: r3(s.cut.hi) },
    eff_cut: { est: r3(s.eff_cut.est), lo: r3(s.eff_cut.lo), hi: r3(s.eff_cut.hi) },
    tokens_in: s.tokens_in,
    tokens_out: s.tokens_out,
    fidelity: r3(s.fidelity_mean),
    novel_lines: s.novel_lines_total,
    tasks_with_novel: s.tasks_with_novel_lines,
    out_of_order: s.out_of_order,
    untouched: s.untouched,
    expanded: s.expanded,
    distractors: r3(s.distractor_rate),
    ms_p50: s.ms_p50 == null ? null : Math.round(s.ms_p50 * 100) / 100,
    ms_p95: s.ms_p95 == null ? null : Math.round(s.ms_p95 * 100) / 100,
  };
}

const slimBreak = (b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { n: v.n, primary: r3(v.primary), all: r3(v.all), cut: r3(v.cut), eff_cut: r3(v.eff_cut) }]));

function errorKind(e) {
  if (!e) return null;
  if (/too long/i.test(e)) return "input over the API's 120k-character limit (HTTP 422)";
  return trim(e.replace(/"request_id":"[^"]+"/, ""), 90);
}

const test = read("results");
const seeds = [
  ["dev", read("results-dev")],
  ["test", test],
  ["fresh", read("results-fresh")],
];

const arms = test.arms.map((a) => ({
  name: a.name,
  type: a.type,
  reference: a.reference,
  frontier: a.frontier,
  queryAware: a.queryAware,
  description: a.description,
  provenance: a.provenance,
  determinism: a.determinism,
  summary: slimSummary(a.summary),
  full: a.full_corpus ? { n: a.full_corpus.n, primary: r3(a.full_corpus.primary.p), cut: r3(a.full_corpus.cut.est), eff_cut: r3(a.full_corpus.eff_cut.est) } : null,
  frontier_lift: a.frontier_lift ? { at: r3(a.frontier_lift.bm25_recall_at_cut), lift: r3(a.frontier_lift.lift), clamped: a.frontier_lift.clamped } : null,
  by_family: slimBreak(a.by_family),
  by_size: slimBreak(a.by_size),
  by_position: slimBreak(a.by_position),
  by_style: slimBreak(a.by_style),
  misses: a.reference
    ? []
    : a.rows
        .filter((r) => !r.primary_hit)
        .map((r) => ({ id: r.id, family: r.family, missing: r.golds_missing.slice(0, 2).map((g) => trim(g, 90)), error: errorKind(r.error), cut: r3(r.cut) })),
}));

// Per-task outcome matrix for the dot grid: one row per task, one cell per ranked/reference arm.
const gridArms = ["supercompress-fast", "caveman-cloud", "probe0-tool-compact", "supercompress-live", "headroom-kompress", "litellm-compression", "bm25-35", "truncate-head-35", "random-lines-35"];
const tasksIdx = test.arms[0].rows.map((r) => ({ id: r.id, family: r.family, size: r.size, position: r.position, style: r.style, tokens: r.tokens_in }));
const grid = {
  arms: gridArms,
  tasks: tasksIdx,
  hit: gridArms.map((n) => {
    const a = test.arms.find((x) => x.name === n);
    const m = new Map(a.rows.map((r) => [r.id, r]));
    return tasksIdx.map((t) => {
      const r = m.get(t.id);
      return r.error ? 2 : r.primary_hit ? 1 : 0;
    });
  }),
  cut: gridArms.map((n) => {
    const a = test.arms.find((x) => x.name === n);
    const m = new Map(a.rows.map((r) => [r.id, r]));
    return tasksIdx.map((t) => r3(m.get(t.id).cut));
  }),
};

const seedTable = seeds.map(([split, res]) => ({
  split,
  seed: res.meta.seed,
  n: null,
  arms: Object.fromEntries(
    ["supercompress-fast", "probe0-tool-compact", "bm25-10", "bm25-35", "truncate-head-35"].map((n) => {
      const a = res.arms.find((x) => x.name === n);
      const s = a.full_corpus || a.summary;
      return [n, { n: s.n, primary: r3(s.primary.p), cut: r3(s.cut.est), eff_cut: r3(s.eff_cut.est) }];
    })
  ),
}));

// --------------------------------------------------------------- real-world splits
// Tool outputs from real agent runs. Sealed splits ship scores only (no task ids), so this block
// keeps per-arm aggregates and per-family recall and nothing else.
const REAL = [
  ["real-dev", "Public dev", "SWE-agent, public. Tuning allowed."],
  ["real-test", "Sealed test", "SWE-agent, sealed by salted hash. Never tuned on."],
  ["real-external", "External harness", "OpenHands, a different agent. The generalisation gate."],
];
const realArms = ["supercompress-fast", "probe0-tool-compact", "bm25-35", "bm25-50", "bm25-70", "bm25-90", "truncate-tail-35", "truncate-head-35", "random-lines-35"];
const real = REAL.filter(([d]) => fs.existsSync(path.join(ROOT, `results-${d}`, "results.json"))).map(([d, label, note]) => {
  const res = read(`results-${d}`);
  return {
    split: d,
    label,
    note,
    n: res.meta.n_tasks,
    sealed: Boolean(res.meta.sealed),
    bench_sha: res.meta.bench_sha,
    families: Object.fromEntries(Object.entries(res.arms[0].by_family).map(([k, v]) => [k, v.n])),
    arms: realArms
      .map((n) => res.arms.find((a) => a.name === n))
      .filter(Boolean)
      .map((a) => {
        const s = a.summary;
        const cr = s.compressed_recall || {};
        return {
          name: a.name,
          provenance: a.provenance,
          primary: { p: r3(s.primary.p), lo: r3(s.primary.lo), hi: r3(s.primary.hi) },
          cut: { est: r3(s.cut.est), lo: r3(s.cut.lo), hi: r3(s.cut.hi) },
          eff_cut: { est: r3(s.eff_cut.est), lo: r3(s.eff_cut.lo), hi: r3(s.eff_cut.hi) },
          abstain: r3(s.abstain_rate),
          compressed: cr.n ? { p: r3(cr.p), lo: r3(cr.lo), hi: r3(cr.hi), n: cr.n } : null,
          by_family: Object.fromEntries(Object.entries(a.by_family).map(([k, v]) => [k, { n: v.n, primary: r3(v.primary), cut: r3(v.cut) }])),
        };
      }),
  };
});

// --------------------------------------------------------------- the guided-scroll example
function keptMask(input, output) {
  const lines = input.split("\n");
  const kept = new Array(lines.length).fill(0);
  let cur = 0;
  for (const l of output.split("\n")) {
    if (l.startsWith("[…") || !l.trim()) continue;
    for (let j = cur; j < lines.length; j++) {
      if (lines[j].trim() === l.trim()) {
        kept[j] = 1;
        cur = j + 1;
        break;
      }
    }
  }
  return kept;
}

async function example(prev) {
  const corpus = buildCorpus({ split: "test" });
  const want = process.env.EXAMPLE_ID || "ci-log.medium.middle.paraphrase.r0";
  const task = corpus.tasks.find((t) => t.id === want);
  if (!task) throw new Error(`no task ${want}`);
  const lines = task.text.split("\n");
  const at = (s) => lines.findIndex((l) => l.toLowerCase().includes(s.toLowerCase()));
  const base = Object.fromEntries(baselineArms({ ratio: 0.35 }).map((a) => [a.name, a]));
  const runs = {};
  for (const n of ["truncate-head-35", "random-lines-35", "bm25-35"]) runs[n] = (await base[n].compress(task)).text;
  for (const arm of [scFastArm({ ratio: 0.35 }), probe0Arm({ ratio: 0.35 })]) {
    if (arm.available().ok) {
      if (arm.init) await arm.init();
      runs[arm.name] = (await arm.compress(task)).text;
      if (arm.stop) arm.stop();
    }
  }
  const traces = {};
  for (const [n, out] of Object.entries(runs)) {
    const low = out.toLowerCase().replace(/\s+/g, " ");
    traces[n] = {
      kept: keptMask(task.text, out).join(""),
      tokens_out: countTokens(out),
      primary_hit: task.primary.every((g) => low.includes(g.toLowerCase().replace(/\s+/g, " "))),
    };
  }
  for (const n of ["supercompress-fast", "probe0-tool-compact"]) if (!traces[n] && prev?.example?.traces?.[n]) traces[n] = prev.example.traces[n];
  return {
    id: task.id,
    family: task.family,
    query: task.query,
    tokens: task.tokens,
    lines,
    golds: task.golds.map((g) => ({ text: g, line: at(g), primary: task.primary.includes(g) })),
    distractors: task.distractors.map((d) => ({ text: d, line: at(d) })),
    traces,
  };
}

(async () => {
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
  const famDesc = Object.fromEntries(FAMILIES.map((f) => [f.name, { kind: f.kind, description: f.description }]));
  const out = {
    meta: {
      ...test.meta,
      family_stats: test.meta.family_stats.map((f) => ({ ...f, ...famDesc[f.name] })),
      prices: pricing.MODELS,
      prices_as_of: pricing.PRICES_AS_OF,
      scenarios: pricing.SCENARIOS,
      rereads: 10,
    },
    arms,
    tiers: test.tiers,
    skipped: test.skipped,
    grid,
    seeds: seedTable,
    real,
    example: await example(prev),
    marker: MARK(0).replace("0", "N"),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const ex = out.example;
  console.error(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB); example ${ex.id}: ${ex.lines.length} lines, ` + Object.entries(ex.traces).map(([n, t]) => `${n}=${t.primary_hit ? "hit" : "miss"}`).join(" "));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
