# compress-bench report

Generated 2026-11-20T04:01:43.662Z · split **real-external** (seed 3712860846) · 175 tasks · 0 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `a90d35d56983e6e5` · 544,995 input tokens per arm · bench 3c0f487+dirty

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | Abstained | Recall when it compressed | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **probe0-tool-compact** | 1 | 175 | 64.0% [57%–71%] | 58.3% | 59.7% [54%–64%] | 3.2% | 40.0% | 40.0% (n=105) | +26.5 pp | 0 | 0.27 |
| 2 | **supercompress-fast** | 1 | 175 | 57.7% [50%–65%] | 55.4% | 56.5% [48%–64%] | 2.6% | 42.3% | 26.7% (n=101) | +17.3 pp | 0 | 3.77 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

"Abstained" is the share of tasks returned with under 5% cut. Passing input through always keeps the answer, so read recall next to it; "recall when it compressed" scores only the tasks the arm actually cut.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 175 | 100.0% [98%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 175 | 33.1% [27%–40%] | 25.7% | 64.5% | 15.5% |
| truncate-tail-35 | 175 | 38.9% [32%–46%] | 37.1% | 66.0% | -8.9% |
| random-lines-35 | 175 | 20.0% [15%–27%] | 16.6% | 53.1% | -25.9% |
| bm25-5 | 175 | 0.6% [0%–3%] | 0.0% | 92.7% | -6.4% |
| bm25-10 | 175 | 9.7% [6%–15%] | 6.9% | 85.8% | -7.7% |
| bm25-20 | 175 | 29.1% [23%–36%] | 25.1% | 73.8% | -8.3% |
| bm25-35 | 175 | 35.4% [29%–43%] | 31.4% | 62.0% | -14.4% |
| bm25-50 | 175 | 42.3% [35%–50%] | 39.4% | 54.5% | -16.7% |
| bm25-70 | 175 | 48.6% [41%–56%] | 46.3% | 47.0% | -17.0% |
| bm25-90 | 175 | 52.6% [45%–60%] | 50.3% | 42.6% | -17.4% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (544,995 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $6.54 | $3.81 | $1.91 | $0.12 |
| probe0-tool-compact | 96.8% of raw | $6.33 | $3.69 | $1.85 | $0.12 |
| supercompress-fast | 97.4% of raw | $6.37 | $3.72 | $1.86 | $0.12 |
| bm25-35 | 114.4% of raw | $7.48 | $4.37 | $2.18 | $0.14 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| probe0-tool-compact | $6.8k | $225.86 | $2.7k | $67.7k | $2.3k | $27.1k | $677.4k | $22.6k | $271.0k |
| supercompress-fast | $6.8k | $179.29 | $2.2k | $68.2k | $1.8k | $21.5k | $682.1k | $17.9k | $215.1k |
| bm25-35 | $8.0k | −$1.0k | −$12.1k | $80.1k | −$10.1k | −$121.2k | $801.0k | −$101.0k | −$1.21M |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| probe0-tool-compact | $3.4k | $112.93 | $1.4k | $33.9k | $1.1k | $13.6k | $338.7k | $11.3k | $135.5k |
| supercompress-fast | $3.4k | $89.65 | $1.1k | $34.1k | $896.46 | $10.8k | $341.0k | $9.0k | $107.6k |
| bm25-35 | $4.0k | −$504.87 | −$6.1k | $40.0k | −$5.0k | −$60.6k | $400.5k | −$50.5k | −$605.8k |

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
| truncate-head-35 | 69% / 64% | 0% / 65% | 0% / 65% |
| truncate-tail-35 | 2% / 66% | 4% / 66% | 100% / 67% |
| random-lines-35 | 24% / 52% | 15% / 54% | 17% / 57% |
| bm25-35 | 24% / 62% | 15% / 62% | 58% / 63% |
| supercompress-fast | 42% / 65% | 54% / 44% | 80% / 37% |
| probe0-tool-compact | 49% / 67% | 65% / 45% | 83% / 44% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 16% / 66% | 28% / 65% | 58% / 64% |
| truncate-tail-35 | 63% / 66% | 32% / 66% | 19% / 66% |
| random-lines-35 | 26% / 54% | 13% / 56% | 21% / 52% |
| bm25-35 | 44% / 57% | 47% / 58% | 13% / 64% |
| supercompress-fast | 77% / 30% | 40% / 66% | 55% / 56% |
| probe0-tool-compact | 92% / 7% | 65% / 29% | 30% / 78% |

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
| raw | 100.0% | 0 | 0 | 0 | 175 | 0 | 0.00 | 0.00 | 175/175 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.05 | 175/175 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.08 | 175/175 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.20 | 175/175 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 2.63 | 175/175 identical |
| supercompress-fast | 100.0% | 0 | 0 | 0 | 38 | 0 | 0.00 | 18 | 175/175 identical |
| probe0-tool-compact | 97.8% | 15 | 154 | 1 | 45 | 0 | 0.00 | 4.45 | 175/175 identical |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 92.7% | 0.6% | 0.0% |
| 10% | 85.8% | 9.7% | 6.9% |
| 20% | 73.8% | 29.1% | 25.1% |
| 35% | 62.0% | 35.4% | 31.4% |
| 50% | 54.5% | 42.3% | 39.4% |
| 70% | 47.0% | 48.6% | 46.3% |
| 90% | 42.6% | 52.6% | 50.3% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | supercompress-fast | probe0-tool-compact | 175 | 35 | 24 | 0.193 | 0.193 | not distinguishable |

## Misses (primary answer lost), product arms

- **supercompress-fast** (74): shell ×56, traceback ×15, test-run ×3
- **probe0-tool-compact** (63): shell ×53, traceback ×7, test-run ×3

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
