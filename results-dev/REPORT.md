# compress-bench report

Generated 2026-11-17T15:27:51.277Z · split **dev** (seed 20261116) · 234 tasks · 14 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `622e4cb247173418` · 2,930,033 input tokens per arm · bench uncommitted

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **supercompress-fast** | 1 | 234 | 95.7% [92%–98%] | 95.7% | 55.5% [46%–65%] | 48.9% | +18.4 pp* | 0 | 7.94 |
| 2 | **probe0-tool-compact** | 2 | 234 | 73.1% [67%–78%] | 67.1% | 85.9% [84%–87%] | 48.5% | -3.5 pp | 0 | 0.76 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 234 | 100.0% [98%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 234 | 33.8% [28%–40%] | 32.1% | 65.3% | -0.1% |
| truncate-tail-35 | 234 | 31.6% [26%–38%] | 31.6% | 64.8% | -3.4% |
| random-lines-35 | 234 | 25.2% [20%–31%] | 15.8% | 57.8% | -15.0% |
| bm25-5 | 234 | 62.0% [56%–68%] | 56.0% | 96.1% | 67.3% |
| bm25-10 | 234 | 70.1% [64%–76%] | 61.1% | 92.9% | 65.7% |
| bm25-20 | 234 | 76.5% [71%–81%] | 65.0% | 87.1% | 62.4% |
| bm25-35 | 234 | 76.9% [71%–82%] | 67.9% | 79.4% | 54.8% |
| bm25-50 | 234 | 76.9% [71%–82%] | 69.2% | 72.8% | 48.1% |
| bm25-70 | 234 | 76.9% [71%–82%] | 69.2% | 65.3% | 40.6% |
| bm25-90 | 234 | 77.4% [72%–82%] | 69.7% | 58.6% | 34.0% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (2,930,033 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $35.16 | $20.51 | $10.26 | $0.66 |
| supercompress-fast | 51.1% of raw | $17.96 | $10.48 | $5.24 | $0.34 |
| probe0-tool-compact | 51.5% of raw | $18.12 | $10.57 | $5.29 | $0.34 |
| bm25-35 | 45.2% of raw | $15.91 | $9.28 | $4.64 | $0.30 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| supercompress-fast | $3.6k | $3.4k | $41.1k | $35.8k | $34.2k | $410.9k | $357.6k | $342.4k | $4.11M |
| probe0-tool-compact | $3.6k | $3.4k | $40.7k | $36.1k | $33.9k | $407.1k | $360.8k | $339.2k | $4.07M |
| bm25-35 | $3.2k | $3.8k | $46.0k | $31.7k | $38.3k | $459.9k | $316.7k | $383.3k | $4.60M |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| supercompress-fast | $1.8k | $1.7k | $20.5k | $17.9k | $17.1k | $205.5k | $178.8k | $171.2k | $2.05M |
| probe0-tool-compact | $1.8k | $1.7k | $20.4k | $18.0k | $17.0k | $203.5k | $180.4k | $169.6k | $2.04M |
| bm25-35 | $1.6k | $1.9k | $23.0k | $15.8k | $19.2k | $230.0k | $158.4k | $191.6k | $2.30M |

Projections scale this corpus's recall and cut linearly. Real savings depend on how much of your traffic looks like these task families.

## Primary recall by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| truncate-head-35 | 39% | 33% | 33% | 33% | 33% | 33% | 67% | 0% | 33% | 33% | 33% | 33% | 33% | 33% |
| truncate-tail-35 | 33% | 33% | 33% | 33% | 33% | 33% | 11% | 11% | 33% | 33% | 33% | 33% | 33% | 33% |
| random-lines-35 | 17% | 17% | 28% | 33% | 28% | 11% | 33% | 0% | 11% | 50% | 28% | 33% | 28% | 28% |
| bm25-35 | 50% | 50% | 100% | 100% | 61% | 100% | 0% | 100% | 50% | 100% | 100% | 100% | 89% | 50% |
| supercompress-fast | 100% | 50% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 94% | 100% | 100% |
| probe0-tool-compact | 56% | 72% | 100% | 72% | 78% | 100% | 56% | 89% | 44% | 67% | 100% | 44% | 44% | 100% |

## Cut by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| truncate-head-35 | 67% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| truncate-tail-35 | 61% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| random-lines-35 | 55% | 60% | 59% | 59% | 53% | 61% | 61% | 58% | 49% | 48% | 58% | 54% | 56% | 57% |
| bm25-35 | 80% | 78% | 80% | 60% | 68% | 80% | 100% | 64% | 79% | 63% | 79% | 97% | 74% | 99% |
| supercompress-fast | 18% | 99% | 0% | 49% | 47% | 99% | 100% | 0% | 56% | 0% | 0% | 89% | 22% | 99% |
| probe0-tool-compact | 88% | 85% | 86% | 85% | 85% | 85% | 86% | 86% | 80% | 84% | 86% | 87% | 90% | 86% |

## Primary recall / cut by needle position

| Arm | head | middle | tail |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 96% / 65% | 5% / 65% | 0% / 65% |
| truncate-tail-35 | 0% / 65% | 0% / 65% | 95% / 65% |
| random-lines-35 | 23% / 58% | 28% / 58% | 24% / 58% |
| bm25-35 | 76% / 80% | 77% / 79% | 78% / 79% |
| supercompress-fast | 96% / 56% | 96% / 55% | 95% / 56% |
| probe0-tool-compact | 83% / 86% | 65% / 86% | 71% / 86% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 35% / 66% | 33% / 65% | 33% / 65% |
| truncate-tail-35 | 31% / 66% | 32% / 65% | 32% / 65% |
| random-lines-35 | 29% / 57% | 14% / 58% | 32% / 58% |
| bm25-35 | 77% / 75% | 77% / 79% | 77% / 80% |
| supercompress-fast | 96% / 48% | 95% / 54% | 96% / 56% |
| probe0-tool-compact | 100% / 3% | 71% / 73% | 49% / 93% |

## Primary recall / cut by query style

| Arm | lexical | paraphrase |
|---|---:|---:|
| raw | 100% / 0% | 100% / 0% |
| truncate-head-35 | 32% / 65% | 36% / 65% |
| truncate-tail-35 | 32% / 65% | 32% / 65% |
| random-lines-35 | 23% / 57% | 27% / 58% |
| bm25-35 | 100% / 70% | 54% / 88% |
| supercompress-fast | 100% / 50% | 91% / 61% |
| probe0-tool-compact | 77% / 86% | 69% / 86% |

## Faithfulness and side effects

*Fidelity* = share of output lines that appear verbatim in the input (omission markers excluded). *Novel lines* are text the compressor wrote that is not in the input. *Distractors kept* = near-miss look-alikes per task (keeping them is fine; keeping them instead of the gold is the failure mode recall measures).

| Arm | Fidelity | Tasks w/ novel lines | Novel lines | Out-of-order | Untouched | Expanded | Distractors kept / task | p95 latency | Determinism |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100.0% | 0 | 0 | 0 | 234 | 0 | 1.15 | 0.01 | 234/234 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.41 | 0.20 | 234/234 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.35 | 0.19 | 234/234 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.44 | 0.30 | 234/234 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.77 | 5.71 | 234/234 identical |
| supercompress-fast | 100.0% | 0 | 0 | 0 | 73 | 0 | 1.07 | 60 | 234/234 identical |
| probe0-tool-compact | 100.0% | 0 | 0 | 0 | 71 | 0 | 0.75 | 14 | 234/234 identical |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 96.1% | 62.0% | 56.0% |
| 10% | 92.9% | 70.1% | 61.1% |
| 20% | 87.1% | 76.5% | 65.0% |
| 35% | 79.4% | 76.9% | 67.9% |
| 50% | 72.8% | 76.9% | 69.2% |
| 70% | 65.3% | 76.9% | 69.2% |
| 90% | 58.6% | 77.4% | 69.7% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | probe0-tool-compact | supercompress-fast | 234 | 58 | 5 | <0.001 | <0.001 | worse |

## Misses (primary answer lost), product arms

- **supercompress-fast** (10): py-traceback ×9, code-file ×1
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/webhooks/manifest_rules.py", line 704`, `ValueError: currency mismatch on apply_bundle_credit: SEK != USD`
  - `py-traceback.small.middle.paraphrase.r0` missing: `File "/app/services/notify/schema_ops.py", line 158`, `ValueError: currency mismatch on apply_ticket_credit: SEK != GBP`
  - `py-traceback.small.tail.paraphrase.r0` missing: `File "/app/services/webhooks/schema_ops.py", line 86`, `ValueError: currency mismatch on apply_invoice_adjustment: USD != CHF`
  - `py-traceback.medium.head.paraphrase.r0` missing: `File "/app/services/audit/schema_ops.py", line 474`, `ValueError: currency mismatch on apply_policy_adjustment: JPY != CHF`
- **probe0-tool-compact** (63): git-diff ×10, code-file ×10, docs-rag ×10, ci-log ×8, json-records ×6, py-traceback ×5, grep-def ×5, find-paths ×4, multi-hop ×4, aggregate-fails ×1
  - `ci-log.medium.middle.lexical.r0` missing: `FAIL  src/session/index-emits.test.ts`, `Expected: 8398`
  - `ci-log.medium.middle.paraphrase.r0` missing: `FAIL  src/profile/tenant-rotates.test.ts`, `Expected: 6898`
  - `ci-log.medium.tail.paraphrase.r0` missing: `FAIL  src/audit/cache-validates.test.ts`, `Expected: 8672`
  - `ci-log.large.head.paraphrase.r0` missing: `FAIL  src/sync/policy-rejects.test.ts`, `Expected: 5527`

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
| ci-log | bash | 18 | 7,254 | 29,144 | Jest CI run: hundreds of PASS lines, one FAIL block, a flaky-retry near-miss, coverage table tail. |
| py-traceback | bash | 18 | 12,169 | 47,958 | Worker log with one fatal Python traceback (deep library frames) and one handled near-miss traceback. |
| tsc-errors | bash | 18 | 9,201 | 37,957 | Build output dominated by warnings from the same file; exactly one hard error (TS2345). |
| grep-def | bash | 18 | 8,537 | 34,802 | ripgrep output where every line mentions the symbol; only one is the definition. Mock with a prefix-sharing name is the near miss. |
| find-paths | bash | 18 | 4,227 | 16,980 | `find` listing of an infra repo. Gold path has env/region/resource siblings that differ in one segment. |
| service-logs | bash | 18 | 12,796 | 51,504 | Interleaved multi-service access/app logs. One ERROR with request id; WARN retries carry adjacent ids. |
| multi-hop | bash | 9 | 13,913 | 56,251 | Two-hop: the error line names a session id; a separate auth line maps that session to a user. Both are needed. |
| aggregate-fails | bash | 9 | 7,030 | 27,977 | Global question: list EVERY failing test. 4-9 failures scattered through a pytest -v run; all must survive. |
| git-diff | bash | 18 | 2,533 | 9,695 | Multi-file unified diff. Gold is a -/+ pair in one hunk; other hunks change similar config keys. |
| json-records | tool | 18 | 2,759 | 10,865 | Pretty-printed JSON API response (one field per line). Answer needs the id line and sibling fields of the same object. |
| sql-table | tool | 18 | 7,295 | 29,461 | psql aligned table output. Gold row must survive; header row needed to interpret it. Ids differ by digit transposition. |
| code-file | read | 18 | 4,551 | 18,436 | Source file read. Gold constant lives inside the current function; a *Legacy twin holds a different value. |
| docs-rag | rag | 18 | 6,037 | 24,152 | Markdown product docs (RAG chunk dump). Paraphrase queries share almost no words with the gold sentence. |
| chat-transcript | chat | 18 | 6,173 | 24,832 | Long agent/user transcript. A decision is made once; a rejected alternative appears later. |

See README.md for methodology, threats to validity and how to reproduce.
