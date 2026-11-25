# compress-bench report

Generated 2026-11-25T18:42:52.600Z · split **real-dev** (seed 2407798777) · 193 tasks · 0 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `fa4e4053573cfc77` · 310,860 input tokens per arm · bench 84daeb7

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | Abstained | Recall when it compressed | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **supercompress-fast** | 1 | 193 | 94.3% [90%–97%] | 92.7% | 35.4% [24%–46%] | 12.8% | 74.1% | 78.0% (n=50) | +39.9 pp* | 0 | 0.03 |
| 2 | **probe0-tool-compact** | 1 | 193 | 93.8% [89%–96%] | 93.3% | 35.7% [22%–46%] | 9.1% | 85.0% | 58.6% (n=29) | +39.4 pp* | 0 | 0.06 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

"Abstained" is the share of tasks returned with under 5% cut. Passing input through always keeps the answer, so read recall next to it; "recall when it compressed" scores only the tasks the arm actually cut.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 193 | 100.0% [98%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 193 | 33.2% [27%–40%] | 28.0% | 65.4% | -7.5% |
| truncate-tail-35 | 193 | 33.2% [27%–40%] | 32.1% | 65.8% | 8.1% |
| random-lines-35 | 193 | 28.0% [22%–35%] | 22.8% | 54.4% | -19.5% |
| bm25-5 | 193 | 9.3% [6%–14%] | 8.3% | 93.4% | 1.6% |
| bm25-10 | 193 | 19.7% [15%–26%] | 18.7% | 87.5% | 4.1% |
| bm25-20 | 193 | 28.0% [22%–35%] | 27.5% | 77.0% | -1.8% |
| bm25-35 | 193 | 39.4% [33%–46%] | 36.8% | 63.4% | -7.6% |
| bm25-50 | 193 | 43.5% [37%–51%] | 40.4% | 53.3% | -15.5% |
| bm25-70 | 193 | 49.7% [43%–57%] | 45.1% | 44.8% | -11.3% |
| bm25-90 | 193 | 54.4% [47%–61%] | 51.8% | 39.4% | -14.3% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (310,860 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $3.73 | $2.18 | $1.09 | $0.07 |
| supercompress-fast | 87.2% of raw | $3.25 | $1.90 | $0.95 | $0.06 |
| probe0-tool-compact | 90.9% of raw | $3.39 | $1.98 | $0.99 | $0.06 |
| bm25-35 | 107.6% of raw | $4.01 | $2.34 | $1.17 | $0.08 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| supercompress-fast | $6.1k | $897.84 | $10.8k | $61.0k | $9.0k | $107.7k | $610.2k | $89.8k | $1.08M |
| probe0-tool-compact | $6.4k | $635.19 | $7.6k | $63.6k | $6.4k | $76.2k | $636.5k | $63.5k | $762.2k |
| bm25-35 | $7.5k | −$529.49 | −$6.4k | $75.3k | −$5.3k | −$63.5k | $752.9k | −$52.9k | −$635.4k |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| supercompress-fast | $3.1k | $448.92 | $5.4k | $30.5k | $4.5k | $53.9k | $305.1k | $44.9k | $538.7k |
| probe0-tool-compact | $3.2k | $317.60 | $3.8k | $31.8k | $3.2k | $38.1k | $318.2k | $31.8k | $381.1k |
| bm25-35 | $3.8k | −$264.75 | −$3.2k | $37.6k | −$2.6k | −$31.8k | $376.5k | −$26.5k | −$317.7k |

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
| truncate-head-35 | 71% / 65% | 10% / 66% | 0% / 66% |
| truncate-tail-35 | 2% / 66% | 6% / 65% | 100% / 66% |
| random-lines-35 | 25% / 54% | 24% / 52% | 36% / 56% |
| bm25-35 | 39% / 67% | 45% / 59% | 36% / 61% |
| supercompress-fast | 93% / 35% | 96% / 22% | 95% / 44% |
| probe0-tool-compact | 95% / 38% | 90% / 24% | 95% / 39% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 37% / 65% | 26% / 66% | 24% / 65% |
| truncate-tail-35 | 29% / 67% | 33% / 66% | 57% / 65% |
| random-lines-35 | 27% / 52% | 29% / 53% | 33% / 57% |
| bm25-35 | 44% / 61% | 31% / 61% | 29% / 66% |
| supercompress-fast | 99% / 5% | 88% / 31% | 76% / 57% |
| probe0-tool-compact | 99% / 1% | 95% / 7% | 57% / 69% |

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
| raw | 100.0% | 0 | 0 | 0 | 193 | 0 | 0.00 | 0.00 | 188/193 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.01 | 188/193 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.01 | 188/193 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.04 | 188/193 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.43 | 188/193 identical |
| supercompress-fast | 100.0% | 0 | 0 | 1 | 142 | 0 | 0.00 | 6.25 | 188/193 identical |
| probe0-tool-compact | 100.0% | 1 | 1 | 0 | 160 | 0 | 0.00 | 0.67 | 188/193 identical |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 93.4% | 9.3% | 8.3% |
| 10% | 87.5% | 19.7% | 18.7% |
| 20% | 77.0% | 28.0% | 27.5% |
| 35% | 63.4% | 39.4% | 36.8% |
| 50% | 53.3% | 43.5% | 40.4% |
| 70% | 44.8% | 49.7% | 45.1% |
| 90% | 39.4% | 54.4% | 51.8% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | probe0-tool-compact | supercompress-fast | 193 | 8 | 7 | 1.000 | 1.000 | not distinguishable |

## Misses (primary answer lost), product arms

- **supercompress-fast** (11): traceback ×4, shell ×3, file-view ×2, test-run ×1, search ×1
  - `real.UC-Davis-molecular-computing__scadnano-python-package-288.s11` missing: `16:as well as making large-scale changes to them that are easier to de`, `100:# not currently used since this way of implementing it is has a bu`
  - `real.asottile__pyupgrade-142.s13` missing: `tests/pyupgrade_test.py::test_fix_fstrings["{}{{}}{}".format(escaped, `
  - `real.docker__docker-py-1167.s25` missing: `ConnectionRefusedError: [Errno 111] Connection refused`
  - `real.ebroecker__canmatrix-470.s33` missing: `import xlsxwriter`, `ModuleNotFoundError: No module named 'xlsxwriter'`
- **probe0-tool-compact** (12): shell ×5, test-run ×3, traceback ×2, search ×2
  - `real.airspeed-velocity__asv-702.s7` missing: `"pythons": ["2.7"],`, `//     Python version, as in the *pythons* variable above.`
  - `real.asottile__pyupgrade-142.s13` missing: `tests/pyupgrade_test.py::test_fix_fstrings["{}{{}}{}".format(escaped, `
  - `real.astropenguin__pandas-dataclasses-120.s21` missing: `__pandas_factory__: Callable[..., TPandas]`, `def find_annotated(tp: Any) -> Iterable[Any]:`
  - `real.destag__at-date-17.s17` missing: `/opt/conda/envs/at-date/lib/python3.9/site-packages/lark/parsers/xearl`

## Arms

- **raw** (local, query not used): No compression (recall ceiling, 0% cut). — `{}`
- **truncate-head-35** (local, query not used): Keep the first 35% of characters (line-aligned). — `{}`
- **truncate-tail-35** (local, query not used): Keep the last 35% of characters (line-aligned). — `{}`
- **random-lines-35** (local, query not used): Seeded random 35% of lines, original order. — `{}`
- **bm25-35** (local, query-aware): BM25 line ranking against the query, 35% character budget. — `{}`
- **supercompress-fast** (local, query-aware): SuperCompress Fast engine run in-process (budgetRatio 0.35). Reference for the hosted API; not the billed product path. — `{"path":"~/Downloads/sc-fast-engine/packages/proxy/src/fast-compress.js","sha256":"814f2d87299fe0e0"}`
- **probe0-tool-compact** (local, query-aware): Port of Probe0 CLI 0.1.19 agent tool-output compaction (bash fold/focus, read head/tail, web head). Kind mapped per family. — `{"path":"~/Downloads/supercompress/scripts/bench_vs_probe0/probe0_tool_compact.js","sha256":"630e4300feca6f15"}`

## Corpus

| Family | Kind | Tasks | Median tokens | Max tokens | What it tests |
|---|---:|---:|---:|---:|---:|

See README.md for methodology, threats to validity and how to reproduce.
