"use strict";
/** Renders results.json into REPORT.md. Pure function of the results object. */
const pricing = require("./pricing");

const pct = (x, d = 1) => (x == null || Number.isNaN(x) ? "—" : `${(100 * x).toFixed(d)}%`);
const ci = (o) => `${pct(o.p ?? o.est)} [${pct(o.lo, 0)}–${pct(o.hi, 0)}]`;
const ms = (x) => (x == null || Number.isNaN(x) ? "—" : x < 10 ? x.toFixed(2) : x < 1000 ? x.toFixed(0) : `${(x / 1000).toFixed(1)}s`);
const fmtP = (p) => (p < 0.001 ? "<0.001" : p.toFixed(3));

function table(head, rows) {
  return [`| ${head.join(" | ")} |`, `|${head.map((h, i) => (i ? "---:" : "---")).join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function render(res) {
  const L = [];
  const m = res.meta;
  const arms = res.arms;
  const products = arms.filter((a) => !a.reference);
  const shown = arms.filter((a) => !a.frontier || a.name === m.bm25_headline);
  L.push(`# compress-bench report`, ``);
  L.push(`Generated ${m.generated_at} · split **${m.split}** (seed ${m.seed}) · ${m.n_tasks} tasks · ${m.families.length} families · tokenizer ${m.tokenizer} · budget ratio ${m.ratio}`);
  L.push(``, `Corpus fingerprint \`${m.corpus_sha}\` · ${m.corpus_tokens.toLocaleString()} input tokens per arm · bench ${m.bench_sha || "uncommitted"}`);
  if (m.sampled) L.push(``, `Remote/worker arms ran on a stratified sample (${m.sample_per_cell} per family×size, n=${m.n_sample}). Every comparison between arms below is computed on the tasks both arms ran.`);

  L.push(``, `## Leaderboard`, ``);
  L.push(`Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.`, ``);
  const tierOf = new Map(res.tiers.order.map((t) => [t.arm, t.tier]));
  const rank = res.tiers.order.map((t) => arms.find((a) => a.name === t.arm));
  L.push(
    table(
      ["#", "Arm", "Tier", "n", "Primary recall [95% CI]", "All-gold recall", "Cut [95% CI]", "Recovery-adj. cut", "vs BM25 @ same cut", "Errors", "p50"],
      rank.map((a, i) => [
        i + 1,
        `**${a.name}**`,
        tierOf.get(a.name),
        a.summary.n,
        ci(a.summary.primary),
        pct(a.summary.all.p),
        ci(a.summary.cut),
        pct(a.summary.eff_cut.est),
        a.frontier_lift ? `${a.frontier_lift.lift >= 0 ? "+" : ""}${(100 * a.frontier_lift.lift).toFixed(1)} pp${a.frontier_lift.clamped ? "*" : ""}` : "—",
        a.summary.errors,
        ms(a.summary.ms_p50),
      ])
    )
  );
  L.push(``, `\\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.`);

  L.push(``, `### Reference baselines`, ``);
  L.push(
    table(
      ["Arm", "n", "Primary recall", "All-gold", "Cut", "Recovery-adj. cut"],
      arms.filter((a) => a.reference).map((a) => [a.name, a.summary.n, ci(a.summary.primary), pct(a.summary.all.p), pct(a.summary.cut.est), pct(a.summary.eff_cut.est)])
    )
  );

  // ------------------------------------------------------------------ cost
  const models = m.prices || pricing.MODELS;
  const scen = m.scenarios || pricing.SCENARIOS;
  const rereads = m.rereads ?? 10;
  const usd = (x) => {
    const a = Math.abs(x);
    const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}k` : `$${a.toFixed(2)}`;
    return x < 0 ? `−${s}` : s;
  };
  const costArms = [arms.find((a) => a.name === "raw"), ...rank, arms.find((a) => a.name === m.bm25_headline)].filter(Boolean);
  L.push(``, `## Cost`, ``);
  L.push(`Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus ${rereads} cache re-reads over the rest of the agent session (\`--rereads\`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of ${m.prices_as_of || pricing.PRICES_AS_OF}, $/1M tokens: ${models.map((x) => `${x.name} ${x.input} in / ${x.cacheRead} cache read${x.assumed ? ` (${x.assumed})` : ""}`).join(" · ")}. Compressor vendor fees are not included.`, ``);
  L.push(`### This corpus (${m.corpus_tokens.toLocaleString()} raw input tokens per arm)`, ``);
  L.push(table(["Arm", "Tokens paid (recovery-adj.)", ...models.map((x) => x.name)], costArms.map((a) => {
    const c = pricing.armCosts(a.summary, { models, scenarios: scen, rereads });
    return [a.name, `${pct(c.keepFrac)} of raw`, ...models.map((x) => usd(c.corpus[x.id]))];
  })));
  for (const x of models.filter((mm) => ["claude-opus-5-5", "claude-sonnet-5-5"].includes(mm.id))) {
    L.push(``, `### Monthly projection on ${x.name}`, ``);
    L.push(scen.map((s) => `- **${s.name}**: ${(s.tokensPerMonth / 1e9).toLocaleString()}B tool-output tokens/month (${s.note})`).join("\n"), ``);
    L.push(table(["Arm", ...scen.flatMap((s) => [`${s.name} cost`, "saved / mo", "saved / yr"])], costArms.map((a) => {
      const c = pricing.armCosts(a.summary, { models: [x], scenarios: scen, rereads }).monthly[x.id];
      return [a.name, ...scen.flatMap((s) => [usd(c[s.id].cost), usd(c[s.id].saved), usd(12 * c[s.id].saved)])];
    })));
  }
  L.push(``, `Projections scale this corpus's recall and cut linearly. Real savings depend on how much of your traffic looks like these task families.`);

  L.push(``, `## Primary recall by family`, ``);
  const fams = m.families;
  L.push(table(["Arm", ...fams], shown.map((a) => [a.name, ...fams.map((f) => (a.by_family[f] ? pct(a.by_family[f].primary, 0) : "—"))])));
  L.push(``, `## Cut by family`, ``);
  L.push(table(["Arm", ...fams], shown.map((a) => [a.name, ...fams.map((f) => (a.by_family[f] ? pct(a.by_family[f].cut, 0) : "—"))])));

  for (const [key, title, order] of [
    ["by_position", "needle position", ["head", "middle", "tail"]],
    ["by_size", "input size", ["small", "medium", "large"]],
    ["by_style", "query style", ["lexical", "paraphrase"]],
  ]) {
    L.push(``, `## Primary recall / cut by ${title}`, ``);
    L.push(table(["Arm", ...order], shown.map((a) => [a.name, ...order.map((k) => (a[key][k] ? `${pct(a[key][k].primary, 0)} / ${pct(a[key][k].cut, 0)}` : "—"))])));
  }

  L.push(``, `## Faithfulness and side effects`, ``);
  L.push(`*Fidelity* = share of output lines that appear verbatim in the input (omission markers excluded). *Novel lines* are text the compressor wrote that is not in the input. *Distractors kept* = near-miss look-alikes per task (keeping them is fine; keeping them instead of the gold is the failure mode recall measures).`, ``);
  L.push(
    table(
      ["Arm", "Fidelity", "Tasks w/ novel lines", "Novel lines", "Out-of-order", "Untouched", "Expanded", "Distractors kept / task", "p95 latency", "Determinism"],
      shown.map((a) => [
        a.name,
        pct(a.summary.fidelity_mean),
        a.summary.tasks_with_novel_lines,
        a.summary.novel_lines_total,
        a.summary.out_of_order,
        a.summary.untouched,
        a.summary.expanded,
        a.summary.distractor_rate.toFixed(2),
        ms(a.summary.ms_p95),
        a.determinism ? `${a.determinism.checked - a.determinism.nondeterministic}/${a.determinism.checked} identical` : "n/a (remote)",
      ])
    )
  );

  L.push(``, `## BM25 frontier`, ``, `The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.`, ``);
  L.push(table(["Budget", "Cut", "Primary recall", "All-gold"], arms.filter((a) => a.frontier).sort((a, b) => a.frontier - b.frontier).map((a) => [pct(a.frontier, 0), pct(a.summary.cut.est), pct(a.summary.primary.p), pct(a.summary.all.p)])));

  L.push(``, `## Pairwise significance (primary recall)`, ``, `Exact McNemar on discordant task pairs; Holm-corrected within each tier step.`, ``);
  L.push(table(["Step", "Arm", "vs (step leader)", "Paired n", "Only leader kept answer", "Only arm kept answer", "p", "p (Holm)", "Verdict"], res.tiers.comparisons.map((c) => [c.step, c.arm, c.vs, c.n, c.aOnly, c.bOnly, fmtP(c.p), fmtP(c.p_holm), c.p_holm < 0.05 && c.aOnly > c.bOnly ? "worse" : "not distinguishable"])));

  L.push(``, `## Misses (primary answer lost), product arms`, ``);
  for (const a of products) {
    const miss = a.rows.filter((r) => !r.primary_hit);
    if (!miss.length) {
      L.push(`- **${a.name}**: none`);
      continue;
    }
    const byFam = {};
    for (const r of miss) byFam[r.family] = (byFam[r.family] || 0) + 1;
    L.push(`- **${a.name}** (${miss.length}): ${Object.entries(byFam).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ×${n}`).join(", ")}`);
    for (const r of miss.slice(0, 4)) L.push(`  - \`${r.id}\`${r.error ? ` error: ${r.error.slice(0, 120)}` : ` missing: ${r.golds_missing.slice(0, 2).map((g) => `\`${g.slice(0, 70)}\``).join(", ")}`}`);
  }

  L.push(``, `## Arms`, ``);
  for (const a of arms.filter((x) => !x.frontier || x.name === m.bm25_headline)) {
    L.push(`- **${a.name}** (${a.type}${a.queryAware ? ", query-aware" : ", query not used"}): ${a.description}${a.provenance ? ` — \`${JSON.stringify(a.provenance)}\`` : ""}`);
  }
  if (res.skipped.length) {
    L.push(``, `Skipped arms:`, ...res.skipped.map((s) => `- ${s.name}: ${s.reason}`));
  }

  L.push(``, `## Corpus`, ``);
  L.push(table(["Family", "Kind", "Tasks", "Median tokens", "Max tokens", "What it tests"], m.family_stats.map((f) => [f.name, f.kind, f.n, f.median_tokens.toLocaleString(), f.max_tokens.toLocaleString(), f.description])));
  L.push(``, `See README.md for methodology, threats to validity and how to reproduce.`);
  return L.join("\n") + "\n";
}

module.exports = { render };
