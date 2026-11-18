import raw from "./bench.json";

export type CI = { p?: number; est?: number; lo: number; hi: number };
export type Break = Record<string, { n: number; primary: number; all: number; cut: number; eff_cut: number }>;
export type Summary = {
  n: number;
  errors: number;
  primary: { p: number; lo: number; hi: number };
  all: number;
  cut: { est: number; lo: number; hi: number };
  eff_cut: { est: number; lo: number; hi: number };
  tokens_in: number;
  tokens_out: number;
  fidelity: number | null;
  novel_lines: number;
  tasks_with_novel: number;
  out_of_order: number;
  untouched: number;
  expanded: number;
  distractors: number;
  ms_p50: number | null;
  ms_p95: number | null;
};
export type Arm = {
  name: string;
  type: "local" | "remote" | "worker";
  reference: boolean;
  frontier: number | null;
  queryAware: boolean;
  description: string;
  provenance: Record<string, string>;
  determinism: { checked: number; nondeterministic: number } | null;
  summary: Summary;
  full: { n: number; primary: number; cut: number; eff_cut: number } | null;
  frontier_lift: { at: number; lift: number; clamped: boolean } | null;
  by_family: Break;
  by_size: Break;
  by_position: Break;
  by_style: Break;
  misses: { id: string; family: string; missing: string[]; error: string | null; cut: number }[];
};
export type Model = { id: string; name: string; input: number; cacheRead: number; assumed?: string };
export type Scenario = { id: string; name: string; tokensPerMonth: number; note: string };

type Bench = {
  meta: {
    split: string;
    seed: number;
    n_tasks: number;
    n_corpus: number;
    n_sample: number;
    sample_per_cell: number;
    tokenizer: string;
    ratio: number;
    corpus_tokens: number;
    corpus_sha: string;
    bench_sha: string;
    generated_at: string;
    bootstrap_B: number;
    families: string[];
    family_stats: { name: string; kind: string; description: string; n: number; median_tokens: number; max_tokens: number }[];
    prices: Model[];
    prices_as_of: string;
    scenarios: Scenario[];
    rereads: number;
  };
  arms: Arm[];
  tiers: {
    order: { arm: string; tier: number }[];
    comparisons: { step: number; arm: string; vs: string; n: number; aOnly: number; bOnly: number; p: number; p_holm: number }[];
  };
  skipped: { name: string; reason: string }[];
  grid: {
    arms: string[];
    tasks: { id: string; family: string; size: string; position: string; style: string; tokens: number }[];
    hit: number[][];
    cut: number[][];
  };
  seeds: { split: string; seed: number; arms: Record<string, { n: number; primary: number; cut: number; eff_cut: number }> }[];
  example: {
    id: string;
    family: string;
    query: string;
    tokens: number;
    lines: string[];
    golds: { text: string; line: number; primary: boolean }[];
    distractors: { text: string; line: number }[];
    traces: Record<string, { kept: string; tokens_out: number; primary_hit: boolean }>;
  };
};

export const bench = raw as unknown as Bench;
export const meta = bench.meta;
export const arms = bench.arms;
export const armBy = (n: string) => arms.find((a) => a.name === n)!;
export const ranked = bench.tiers.order.map((t) => ({ ...armBy(t.arm), tier: t.tier }));
export const frontier = arms.filter((a) => a.frontier != null).sort((a, b) => a.frontier! - b.frontier!);

/** Display names. The bench ids stay visible in mono next to them. */
export const LABEL: Record<string, string> = {
  "supercompress-fast": "SuperCompress Fast",
  "supercompress-live": "SuperCompress API",
  "probe0-tool-compact": "Probe0",
  "caveman-cloud": "Caveman Cloud",
  "headroom-kompress": "Headroom Kompress",
  "litellm-compression": "LiteLLM compression",
  raw: "No compression",
  "truncate-head-35": "head -n (35%)",
  "truncate-tail-35": "tail -n (35%)",
  "random-lines-35": "Random lines (35%)",
  "bm25-35": "BM25 (35%)",
};
export const label = (n: string) => LABEL[n] ?? n.replace(/^bm25-(\d+)$/, "BM25 ($1%)");

/** One-line context per product, from what the run actually showed. */
export const NOTE: Record<string, string> = {
  "supercompress-fast": "Local engine. Only misses: 4 Python tracebacks asked in paraphrase.",
  "caveman-cloud": "Its API takes no query. It returned every input unchanged: 0% cut.",
  "probe0-tool-compact": "Port of Probe0 CLI 0.1.19 tool compaction. Cuts hard, drops answers.",
  "supercompress-live": "Hosted API. 8 inputs rejected over its 120k-character limit; 39s p50.",
  "headroom-kompress": "Token pruning model. Rewrites text, so evidence stops matching.",
  "litellm-compression": "litellm.compression.compress at the same 35% budget.",
};

// ------------------------------------------------------------------ formatting
export const pct = (x: number | null | undefined, d = 1) => (x == null || Number.isNaN(x) ? "—" : `${(100 * x).toFixed(d)}%`);
export const pp = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(100 * x).toFixed(1)} pp`;
export const num = (x: number) => x.toLocaleString("en-US");
export const ms = (x: number | null) => (x == null ? "—" : x < 10 ? `${x.toFixed(1)} ms` : x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(1)} s`);
export function usd(x: number, digits = 1) {
  const a = Math.abs(x);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(digits)}k` : `$${a.toFixed(0)}`;
  return x < 0 ? `−${s}` : s;
}
export const tokensShort = (x: number) => (x >= 1e12 ? `${x / 1e12}T` : x >= 1e9 ? `${+(x / 1e9).toFixed(1)}B` : `${+(x / 1e6).toFixed(0)}M`);

// ------------------------------------------------------------------ cost model (mirrors src/pricing.js)
export const perTokenUsd = (m: Model, rereads: number) => (m.input * 1.25 + rereads * m.cacheRead) / 1e6;
export function monthly(a: Arm, m: Model, tokens: number, rereads: number) {
  const keep = 1 - a.summary.eff_cut.est;
  const rawCost = tokens * perTokenUsd(m, rereads);
  const cost = rawCost * keep;
  return { keep, rawCost, cost, saved: rawCost - cost };
}
