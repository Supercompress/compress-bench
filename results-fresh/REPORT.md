# compress-bench report

Generated 2026-11-17T15:26:58.862Z · split **fresh** (seed 875713028) · 234 tasks · 14 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `ec8bf556e2ca49c0` · 2,931,374 input tokens per arm · bench uncommitted

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **supercompress-fast** | 1 | 234 | 96.6% [93%–98%] | 96.6% | 55.4% [46%–64%] | 49.0% | +17.9 pp* | 0 | 58 |
| 2 | **probe0-tool-compact** | 2 | 234 | 72.6% [67%–78%] | 66.2% | 85.9% [84%–87%] | 47.8% | -4.4 pp | 0 | 1.41 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 234 | 100.0% [98%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 234 | 33.3% [28%–40%] | 32.1% | 65.3% | -0.2% |
| truncate-tail-35 | 234 | 31.6% [26%–38%] | 30.3% | 64.8% | -5.6% |
| random-lines-35 | 234 | 32.9% [27%–39%] | 20.5% | 57.8% | -12.7% |
| bm25-5 | 234 | 61.5% [55%–68%] | 56.4% | 96.1% | 66.8% |
| bm25-10 | 234 | 69.7% [63%–75%] | 61.1% | 92.8% | 65.2% |
| bm25-20 | 234 | 76.9% [71%–82%] | 65.4% | 87.0% | 62.6% |
| bm25-35 | 234 | 78.2% [72%–83%] | 69.2% | 79.2% | 55.2% |
| bm25-50 | 234 | 78.2% [72%–83%] | 70.5% | 72.5% | 48.5% |
| bm25-70 | 234 | 78.2% [72%–83%] | 70.5% | 64.8% | 40.8% |
| bm25-90 | 234 | 78.6% [73%–83%] | 70.9% | 57.8% | 34.0% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (2,931,374 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $35.18 | $20.52 | $10.26 | $0.66 |
| supercompress-fast | 51.0% of raw | $17.93 | $10.46 | $5.23 | $0.34 |
| probe0-tool-compact | 52.2% of raw | $18.36 | $10.71 | $5.36 | $0.34 |
| bm25-35 | 44.8% of raw | $15.76 | $9.19 | $4.60 | $0.30 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| supercompress-fast | $3.6k | $3.4k | $41.2k | $35.7k | $34.3k | $411.8k | $356.8k | $343.2k | $4.12M |
| probe0-tool-compact | $3.7k | $3.3k | $40.1k | $36.5k | $33.5k | $401.5k | $365.5k | $334.5k | $4.01M |
| bm25-35 | $3.1k | $3.9k | $46.4k | $31.4k | $38.6k | $463.8k | $313.5k | $386.5k | $4.64M |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| supercompress-fast | $1.8k | $1.7k | $20.6k | $17.8k | $17.2k | $205.9k | $178.4k | $171.6k | $2.06M |
| probe0-tool-compact | $1.8k | $1.7k | $20.1k | $18.3k | $16.7k | $200.7k | $182.7k | $167.3k | $2.01M |
| bm25-35 | $1.6k | $1.9k | $23.2k | $15.7k | $19.3k | $231.9k | $156.8k | $193.2k | $2.32M |

Projections scale this corpus's recall and cut linearly. Real savings depend on how much of your traffic looks like these task families.

## Primary recall by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| truncate-head-35 | 33% | 33% | 33% | 33% | 33% | 33% | 67% | 0% | 33% | 33% | 33% | 33% | 33% | 33% |
| truncate-tail-35 | 33% | 33% | 33% | 33% | 33% | 33% | 0% | 0% | 39% | 33% | 33% | 39% | 33% | 33% |
| random-lines-35 | 44% | 22% | 33% | 44% | 44% | 39% | 33% | 0% | 22% | 33% | 22% | 44% | 44% | 17% |
| bm25-35 | 50% | 50% | 100% | 100% | 78% | 100% | 0% | 100% | 50% | 100% | 100% | 100% | 89% | 50% |
| supercompress-fast | 100% | 61% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 94% | 100% | 100% |
| probe0-tool-compact | 56% | 72% | 100% | 78% | 72% | 100% | 56% | 89% | 44% | 61% | 100% | 44% | 44% | 100% |

## Cut by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| truncate-head-35 | 67% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| truncate-tail-35 | 61% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| random-lines-35 | 56% | 61% | 59% | 59% | 53% | 61% | 61% | 58% | 50% | 48% | 58% | 54% | 56% | 57% |
| bm25-35 | 80% | 78% | 79% | 60% | 60% | 80% | 100% | 64% | 79% | 63% | 79% | 97% | 76% | 99% |
| supercompress-fast | 18% | 98% | 0% | 49% | 49% | 99% | 100% | 0% | 71% | 0% | 0% | 89% | 14% | 99% |
| probe0-tool-compact | 87% | 85% | 86% | 85% | 85% | 85% | 86% | 88% | 80% | 84% | 86% | 87% | 89% | 86% |

## Primary recall / cut by needle position

| Arm | head | middle | tail |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 96% / 65% | 4% / 65% | 0% / 65% |
| truncate-tail-35 | 0% / 65% | 3% / 65% | 92% / 65% |
| random-lines-35 | 35% / 58% | 37% / 58% | 27% / 58% |
| bm25-35 | 81% / 79% | 76% / 79% | 78% / 79% |
| supercompress-fast | 96% / 54% | 97% / 55% | 96% / 57% |
| probe0-tool-compact | 82% / 86% | 64% / 86% | 72% / 86% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 33% / 66% | 33% / 65% | 33% / 65% |
| truncate-tail-35 | 33% / 66% | 31% / 65% | 31% / 65% |
| random-lines-35 | 38% / 58% | 35% / 58% | 26% / 58% |
| bm25-35 | 77% / 76% | 79% / 79% | 78% / 79% |
| supercompress-fast | 99% / 49% | 95% / 54% | 96% / 56% |
| probe0-tool-compact | 100% / 3% | 71% / 73% | 47% / 93% |

## Primary recall / cut by query style

| Arm | lexical | paraphrase |
|---|---:|---:|
| raw | 100% / 0% | 100% / 0% |
| truncate-head-35 | 31% / 65% | 36% / 65% |
| truncate-tail-35 | 32% / 65% | 31% / 65% |
| random-lines-35 | 38% / 58% | 28% / 58% |
| bm25-35 | 100% / 71% | 56% / 87% |
| supercompress-fast | 100% / 49% | 93% / 62% |
| probe0-tool-compact | 77% / 86% | 68% / 86% |

## Faithfulness and side effects

*Fidelity* = share of output lines that appear verbatim in the input (omission markers excluded). *Novel lines* are text the compressor wrote that is not in the input. *Distractors kept* = near-miss look-alikes per task (keeping them is fine; keeping them instead of the gold is the failure mode recall measures).

| Arm | Fidelity | Tasks w/ novel lines | Novel lines | Out-of-order | Untouched | Expanded | Distractors kept / task | p95 latency | Determinism |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100.0% | 0 | 0 | 0 | 234 | 0 | 1.15 | 0.01 | 234/234 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.43 | 0.15 | 234/234 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.36 | 0.24 | 234/234 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.45 | 0.31 | 234/234 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.76 | 12 | 234/234 identical |
| supercompress-fast | 100.0% | 0 | 0 | 0 | 67 | 0 | 1.07 | 642 | 234/234 identical |
| probe0-tool-compact | 100.0% | 0 | 0 | 0 | 71 | 0 | 0.74 | 95 | 234/234 identical |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 96.1% | 61.5% | 56.4% |
| 10% | 92.8% | 69.7% | 61.1% |
| 20% | 87.0% | 76.9% | 65.4% |
| 35% | 79.2% | 78.2% | 69.2% |
| 50% | 72.5% | 78.2% | 70.5% |
| 70% | 64.8% | 78.2% | 70.5% |
| 90% | 57.8% | 78.6% | 70.9% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | probe0-tool-compact | supercompress-fast | 234 | 58 | 2 | <0.001 | <0.001 | worse |

## Misses (primary answer lost), product arms

- **supercompress-fast** (8): py-traceback ×7, code-file ×1
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/ingest/invoice_rules.py", line 83`, `ValueError: currency mismatch on apply_schema_adjustment: JPY != BRL`
  - `py-traceback.medium.head.paraphrase.r0` missing: `File "/app/services/audit/queue_core.py", line 175`, `ValueError: currency mismatch on apply_queue_credit: CHF != SEK`
  - `py-traceback.medium.middle.paraphrase.r0` missing: `File "/app/services/media/schema_core.py", line 415`, `ValueError: currency mismatch on apply_lease_rollover: SEK != GBP`
  - `py-traceback.medium.tail.paraphrase.r0` missing: `File "/app/services/billing/snapshot_core.py", line 209`, `ValueError: currency mismatch on apply_lease_credit: EUR != SEK`
- **probe0-tool-compact** (64): git-diff ×10, code-file ×10, docs-rag ×10, ci-log ×8, json-records ×7, py-traceback ×5, find-paths ×5, grep-def ×4, multi-hop ×4, aggregate-fails ×1
  - `ci-log.medium.middle.lexical.r0` missing: `FAIL  src/audit/bundle-reconciles.test.ts`, `Expected: 9468`
  - `ci-log.medium.middle.paraphrase.r0` missing: `FAIL  src/inventory/replica-rejects.test.ts`, `Expected: 3681`
  - `ci-log.large.head.lexical.r0` missing: `FAIL  src/inventory/snapshot-retries.test.ts`, `Expected: 7892`
  - `ci-log.large.head.paraphrase.r0` missing: `FAIL  src/search/cache-throttles.test.ts`, `Expected: 2875`

## Arms

- **raw** (local, query not used): No compression (recall ceiling, 0% cut). — `{}`
- **truncate-head-35** (local, query not used): Keep the first 35% of characters (line-aligned). — `{}`
- **truncate-tail-35** (local, query not used): Keep the last 35% of characters (line-aligned). — `{}`
- **random-lines-35** (local, query not used): Seeded random 35% of lines, original order. — `{}`
- **bm25-35** (local, query-aware): BM25 line ranking against the query, 35% character budget. — `{}`
- **supercompress-fast** (local, query-aware): SuperCompress Fast engine run in-process (budgetRatio 0.35). Reference for the hosted API; not the billed product path. — `{"path":"$SC_ROOT/packages/proxy/src/fast-compress.js","sha256":"48b1b7b11ee4e1bb"}`
- **probe0-tool-compact** (local, query-aware): Port of Probe0 CLI 0.1.19 agent tool-output compaction (bash fold/focus, read head/tail, web head). Kind mapped per family. — `{"path":"$SC_ROOT/scripts/bench_vs_probe0/probe0_tool_compact.js","sha256":"630e4300feca6f15"}`

## Corpus

| Family | Kind | Tasks | Median tokens | Max tokens | What it tests |
|---|---:|---:|---:|---:|---:|
| ci-log | bash | 18 | 7,309 | 29,135 | Jest CI run: hundreds of PASS lines, one FAIL block, a flaky-retry near-miss, coverage table tail. |
| py-traceback | bash | 18 | 12,228 | 47,885 | Worker log with one fatal Python traceback (deep library frames) and one handled near-miss traceback. |
| tsc-errors | bash | 18 | 9,317 | 37,254 | Build output dominated by warnings from the same file; exactly one hard error (TS2345). |
| grep-def | bash | 18 | 8,578 | 34,626 | ripgrep output where every line mentions the symbol; only one is the definition. Mock with a prefix-sharing name is the near miss. |
| find-paths | bash | 18 | 4,248 | 17,065 | `find` listing of an infra repo. Gold path has env/region/resource siblings that differ in one segment. |
| service-logs | bash | 18 | 12,806 | 51,509 | Interleaved multi-service access/app logs. One ERROR with request id; WARN retries carry adjacent ids. |
| multi-hop | bash | 9 | 13,932 | 56,412 | Two-hop: the error line names a session id; a separate auth line maps that session to a user. Both are needed. |
| aggregate-fails | bash | 9 | 7,004 | 27,992 | Global question: list EVERY failing test. 4-9 failures scattered through a pytest -v run; all must survive. |
| git-diff | bash | 18 | 2,556 | 9,848 | Multi-file unified diff. Gold is a -/+ pair in one hunk; other hunks change similar config keys. |
| json-records | tool | 18 | 2,759 | 10,891 | Pretty-printed JSON API response (one field per line). Answer needs the id line and sibling fields of the same object. |
| sql-table | tool | 18 | 7,293 | 29,495 | psql aligned table output. Gold row must survive; header row needed to interpret it. Ids differ by digit transposition. |
| code-file | read | 18 | 4,664 | 18,132 | Source file read. Gold constant lives inside the current function; a *Legacy twin holds a different value. |
| docs-rag | rag | 18 | 5,932 | 24,464 | Markdown product docs (RAG chunk dump). Paraphrase queries share almost no words with the gold sentence. |
| chat-transcript | chat | 18 | 6,167 | 24,780 | Long agent/user transcript. A decision is made once; a rejected alternative appears later. |

See README.md for methodology, threats to validity and how to reproduce.
