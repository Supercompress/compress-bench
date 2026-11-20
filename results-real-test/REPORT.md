# compress-bench report

Generated 2026-11-20T04:01:27.165Z · split **real-test** (seed 1468998094) · 175 tasks · 0 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `ccbf1e2a975183b7` · 258,588 input tokens per arm · bench 3c0f487+dirty

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | Abstained | Recall when it compressed | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **probe0-tool-compact** | 1 | 175 | 96.0% [92%–98%] | 96.0% | 33.3% [19%–46%] | 15.5% | 85.1% | 73.1% (n=26) | +42.9 pp* | 0 | 0.16 |
| 2 | **supercompress-fast** | 2 | 175 | 68.6% [61%–75%] | 66.9% | 43.0% [33%–52%] | 13.4% | 39.4% | 48.1% (n=106) | +18.4 pp | 0 | 3.54 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

"Abstained" is the share of tasks returned with under 5% cut. Passing input through always keeps the answer, so read recall next to it; "recall when it compressed" scores only the tasks the arm actually cut.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 175 | 100.0% [98%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 175 | 28.6% [22%–36%] | 26.3% | 65.0% | -3.2% |
| truncate-tail-35 | 175 | 36.6% [30%–44%] | 33.1% | 66.0% | 7.8% |
| random-lines-35 | 175 | 29.7% [23%–37%] | 24.0% | 52.4% | -10.8% |
| bm25-5 | 175 | 5.7% [3%–10%] | 5.7% | 93.1% | -0.4% |
| bm25-10 | 175 | 13.7% [9%–20%] | 12.0% | 87.3% | -1.3% |
| bm25-20 | 175 | 24.0% [18%–31%] | 20.0% | 77.3% | -1.1% |
| bm25-35 | 175 | 35.4% [29%–43%] | 31.4% | 65.1% | -6.8% |
| bm25-50 | 175 | 40.0% [33%–47%] | 36.6% | 55.0% | -14.1% |
| bm25-70 | 175 | 48.6% [41%–56%] | 44.0% | 45.1% | -17.3% |
| bm25-90 | 175 | 53.1% [46%–60%] | 48.6% | 39.2% | -18.4% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (258,588 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $3.10 | $1.81 | $0.91 | $0.06 |
| probe0-tool-compact | 84.5% of raw | $2.62 | $1.53 | $0.77 | $0.05 |
| supercompress-fast | 86.6% of raw | $2.69 | $1.57 | $0.78 | $0.05 |
| bm25-35 | 106.8% of raw | $3.31 | $1.93 | $0.97 | $0.06 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| probe0-tool-compact | $5.9k | $1.1k | $13.0k | $59.2k | $10.8k | $129.9k | $591.8k | $108.2k | $1.30M |
| supercompress-fast | $6.1k | $939.95 | $11.3k | $60.6k | $9.4k | $112.8k | $606.0k | $94.0k | $1.13M |
| bm25-35 | $7.5k | −$474.73 | −$5.7k | $74.7k | −$4.7k | −$57.0k | $747.5k | −$47.5k | −$569.7k |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| probe0-tool-compact | $3.0k | $541.08 | $6.5k | $29.6k | $5.4k | $64.9k | $295.9k | $54.1k | $649.3k |
| supercompress-fast | $3.0k | $469.98 | $5.6k | $30.3k | $4.7k | $56.4k | $303.0k | $47.0k | $564.0k |
| bm25-35 | $3.7k | −$237.36 | −$2.8k | $37.4k | −$2.4k | −$28.5k | $373.7k | −$23.7k | −$284.8k |

Projections scale this corpus's recall and cut linearly. Real savings depend on how much of your traffic looks like these task families.

## Primary recall by family

| Arm |
|---|
| raw |
| truncate-head-35 |
| truncate-tail-35 |
| random-lines-35 |
| bm25-35 |
| supercompress-fast |
| probe0-tool-compact |

## Cut by family

| Arm |
|---|
| raw |
| truncate-head-35 |
| truncate-tail-35 |
| random-lines-35 |
| bm25-35 |
| supercompress-fast |
| probe0-tool-compact |

## Primary recall / cut by needle position

| Arm | head | middle | tail |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 64% / 65% | 9% / 65% | 0% / 65% |
| truncate-tail-35 | 4% / 66% | 11% / 67% | 97% / 66% |
| random-lines-35 | 22% / 53% | 33% / 52% | 36% / 52% |
| bm25-35 | 36% / 67% | 31% / 62% | 38% / 64% |
| supercompress-fast | 60% / 45% | 67% / 38% | 81% / 43% |
| probe0-tool-compact | 96% / 31% | 96% / 11% | 97% / 47% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 24% / 65% | 47% / 65% | 14% / 65% |
| truncate-tail-35 | 37% / 67% | 26% / 66% | 64% / 65% |
| random-lines-35 | 31% / 51% | 21% / 53% | 43% / 53% |
| bm25-35 | 42% / 62% | 26% / 64% | 14% / 68% |
| supercompress-fast | 74% / 28% | 53% / 50% | 71% / 53% |
| probe0-tool-compact | 99% / 3% | 95% / 10% | 71% / 77% |

## Primary recall / cut by query style

| Arm | lexical | paraphrase |
|---|---:|---:|
| raw | — | — |
| truncate-head-35 | — | — |
| truncate-tail-35 | — | — |
| random-lines-35 | — | — |
| bm25-35 | — | — |
| supercompress-fast | — | — |
| probe0-tool-compact | — | — |

## Faithfulness and side effects

*Fidelity* = share of output lines that appear verbatim in the input (omission markers excluded). *Novel lines* are text the compressor wrote that is not in the input. *Distractors kept* = near-miss look-alikes per task (keeping them is fine; keeping them instead of the gold is the failure mode recall measures).

| Arm | Fidelity | Tasks w/ novel lines | Novel lines | Out-of-order | Untouched | Expanded | Distractors kept / task | p95 latency | Determinism |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100.0% | 0 | 0 | 0 | 175 | 0 | 0.00 | 0.01 | 171/175 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.07 | 171/175 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.07 | 171/175 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.21 | 171/175 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 1.17 | 171/175 identical |
| supercompress-fast | 100.0% | 0 | 0 | 1 | 66 | 0 | 0.00 | 13 | 171/175 identical |
| probe0-tool-compact | 100.0% | 1 | 1 | 1 | 147 | 0 | 0.00 | 1.34 | 171/175 identical |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 93.1% | 5.7% | 5.7% |
| 10% | 87.3% | 13.7% | 12.0% |
| 20% | 77.3% | 24.0% | 20.0% |
| 35% | 65.1% | 35.4% | 31.4% |
| 50% | 55.0% | 40.0% | 36.6% |
| 70% | 45.1% | 48.6% | 44.0% |
| 90% | 39.2% | 53.1% | 48.6% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | supercompress-fast | probe0-tool-compact | 175 | 50 | 3 | <0.001 | <0.001 | worse |

## Misses (primary answer lost), product arms

- **supercompress-fast** (55): file-view ×23, test-run ×11, search ×11, traceback ×4, find ×3, shell ×3
- **probe0-tool-compact** (7): test-run ×2, search ×2, shell ×2, find ×1

## Arms

- **raw** (local, query not used): No compression (recall ceiling, 0% cut). — `{}`
- **truncate-head-35** (local, query not used): Keep the first 35% of characters (line-aligned). — `{}`
- **truncate-tail-35** (local, query not used): Keep the last 35% of characters (line-aligned). — `{}`
- **random-lines-35** (local, query not used): Seeded random 35% of lines, original order. — `{}`
- **bm25-35** (local, query-aware): BM25 line ranking against the query, 35% character budget. — `{}`
- **supercompress-fast** (local, query-aware): SuperCompress Fast engine run in-process (budgetRatio 0.35). Reference for the hosted API; not the billed product path. — `{"path":"$SC_ROOT/packages/proxy/src/fast-compress.js","sha256":"bb2912e77657bf1e"}`
- **probe0-tool-compact** (local, query-aware): Port of Probe0 CLI 0.1.19 agent tool-output compaction (bash fold/focus, read head/tail, web head). Kind mapped per family. — `{"path":"$SC_ROOT/scripts/bench_vs_probe0/probe0_tool_compact.js","sha256":"630e4300feca6f15"}`

## Corpus

| Family | Kind | Tasks | Median tokens | Max tokens | What it tests |
|---|---:|---:|---:|---:|---:|

See README.md for methodology, threats to validity and how to reproduce.
