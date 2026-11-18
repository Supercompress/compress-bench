# compress-bench report

Generated 2026-11-17T04:29:53.808Z · split **test** (seed 7340033) · 84 tasks · 14 families · tokenizer o200k_base · budget ratio 0.35

Corpus fingerprint `21d805ada11a1ade` · 1,085,111 input tokens per arm · bench b225168

Remote/worker arms ran on a stratified sample (2 per family×size, n=84). Every comparison between arms below is computed on the tasks both arms ran.

## Leaderboard

Ranking rule (fixed before the run): correctness tiers first, then recovery-adjusted cut. Tier 1 holds the arm with the best primary-answer recall and every arm not significantly worse than it (paired exact McNemar, Holm-corrected, α=0.05). Lower tiers repeat the procedure on what remains. Reference baselines are shown but not ranked.

| # | Arm | Tier | n | Primary recall [95% CI] | All-gold recall | Cut [95% CI] | Recovery-adj. cut | vs BM25 @ same cut | Errors | p50 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | **supercompress-fast** | 1 | 84 | 95.2% [88%–98%] | 95.2% | 56.6% [40%–70%] | 50.6% | +14.3 pp* | 0 | 10 |
| 2 | **caveman-cloud** | 1 | 84 | 100.0% [96%–100%] | 100.0% | 0.0% [0%–0%] | 0.0% | +19.0 pp* | 0 | 281 |
| 3 | **probe0-tool-compact** | 2 | 84 | 71.4% [61%–80%] | 65.5% | 86.3% [83%–88%] | 44.5% | -8.6 pp | 0 | 1.22 |
| 4 | **supercompress-live** | 2 | 84 | 72.6% [62%–81%] | 72.6% | 59.3% [45%–74%] | 18.4% | -8.3 pp* | 8 | 39.1s |
| 5 | **headroom-kompress** | 2 | 84 | 70.2% [60%–79%] | 51.2% | 6.3% [4%–10%] | -4.4% | -10.7 pp* | 0 | 8.5s |
| 6 | **litellm-compression** | 3 | 84 | 52.4% [42%–63%] | 47.6% | 62.8% [60%–66%] | 16.8% | -28.6 pp | 0 | 6.00 |

\* arm's cut is outside the measured BM25 range; compared against the nearest BM25 point.

### Reference baselines

| Arm | n | Primary recall | All-gold | Cut | Recovery-adj. cut |
|---|---:|---:|---:|---:|---:|
| raw | 84 | 100.0% [96%–100%] | 100.0% | 0.0% | 0.0% |
| truncate-head-35 | 84 | 32.1% [23%–43%] | 29.8% | 65.3% | 9.8% |
| truncate-tail-35 | 84 | 29.8% [21%–40%] | 28.6% | 64.8% | -12.5% |
| random-lines-35 | 84 | 29.8% [21%–40%] | 22.6% | 58.1% | -20.2% |
| bm25-5 | 84 | 60.7% [50%–70%] | 58.3% | 96.3% | 64.1% |
| bm25-10 | 84 | 75.0% [65%–83%] | 67.9% | 93.3% | 67.6% |
| bm25-20 | 84 | 79.8% [70%–87%] | 70.2% | 87.7% | 64.7% |
| bm25-35 | 84 | 81.0% [71%–88%] | 73.8% | 80.3% | 57.3% |
| bm25-50 | 84 | 81.0% [71%–88%] | 73.8% | 73.9% | 51.0% |
| bm25-70 | 84 | 81.0% [71%–88%] | 73.8% | 66.2% | 43.3% |
| bm25-90 | 84 | 81.0% [71%–88%] | 73.8% | 59.9% | 37.0% |

## Cost

Compression only changes input tokens. Each context token is priced as one cache write (1.25× input) plus 10 cache re-reads over the rest of the agent session (`--rereads`). Costs use the **recovery-adjusted** cut: a lost answer pays for a raw re-read. Anthropic API list prices as of 2026-11-03, $/1M tokens: Fable 5.2 8 in / 0.2 cache read · Opus 5.5 4 in / 0.2 cache read · Sonnet 5.5 2 in / 0.1 cache read · Haiku 5.5 0.1 in / 0.01 cache read (cache read assumed 0.1x input). Compressor vendor fees are not included.

### This corpus (1,085,111 raw input tokens per arm)

| Arm | Tokens paid (recovery-adj.) | Fable 5.2 | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---:|---:|---:|---:|---:|
| raw | 100.0% of raw | $13.02 | $7.60 | $3.80 | $0.24 |
| supercompress-fast | 49.4% of raw | $6.43 | $3.75 | $1.88 | $0.12 |
| caveman-cloud | 100.0% of raw | $13.02 | $7.60 | $3.80 | $0.24 |
| probe0-tool-compact | 55.5% of raw | $7.22 | $4.21 | $2.11 | $0.14 |
| supercompress-live | 81.6% of raw | $10.63 | $6.20 | $3.10 | $0.20 |
| headroom-kompress | 104.4% of raw | $13.60 | $7.93 | $3.97 | $0.25 |
| litellm-compression | 83.2% of raw | $10.84 | $6.32 | $3.16 | $0.20 |
| bm25-35 | 42.7% of raw | $5.56 | $3.24 | $1.62 | $0.10 |

### Monthly projection on Opus 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| supercompress-fast | $3.5k | $3.5k | $42.5k | $34.6k | $35.4k | $425.0k | $345.9k | $354.1k | $4.25M |
| caveman-cloud | $7.0k | $0.00 | $0.00 | $70.0k | $0.00 | $0.00 | $700.0k | $0.00 | $0.00 |
| probe0-tool-compact | $3.9k | $3.1k | $37.4k | $38.8k | $31.2k | $374.1k | $388.2k | $311.8k | $3.74M |
| supercompress-live | $5.7k | $1.3k | $15.4k | $57.1k | $12.9k | $154.3k | $571.4k | $128.6k | $1.54M |
| headroom-kompress | $7.3k | −$309.08 | −$3.7k | $73.1k | −$3.1k | −$37.1k | $730.9k | −$30.9k | −$370.9k |
| litellm-compression | $5.8k | $1.2k | $14.1k | $58.3k | $11.7k | $140.9k | $582.6k | $117.4k | $1.41M |
| bm25-35 | $3.0k | $4.0k | $48.2k | $29.9k | $40.1k | $481.6k | $298.7k | $401.3k | $4.82M |

### Monthly projection on Sonnet 5.5

- **Team (1x)**: 1B tool-output tokens/month (≈50 engineers × 20 sessions/day × 50k tool tokens × 21 days)
- **Enterprise (10x)**: 10B tool-output tokens/month (≈500 engineers, same usage)
- **Enterprise (100x)**: 100B tool-output tokens/month (≈5,000 engineers, or heavy autonomous agents)

| Arm | Team (1x) cost | saved / mo | saved / yr | Enterprise (10x) cost | saved / mo | saved / yr | Enterprise (100x) cost | saved / mo | saved / yr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| supercompress-fast | $1.7k | $1.8k | $21.2k | $17.3k | $17.7k | $212.5k | $172.9k | $177.1k | $2.12M |
| caveman-cloud | $3.5k | $0.00 | $0.00 | $35.0k | $0.00 | $0.00 | $350.0k | $0.00 | $0.00 |
| probe0-tool-compact | $1.9k | $1.6k | $18.7k | $19.4k | $15.6k | $187.1k | $194.1k | $155.9k | $1.87M |
| supercompress-live | $2.9k | $642.95 | $7.7k | $28.6k | $6.4k | $77.2k | $285.7k | $64.3k | $771.5k |
| headroom-kompress | $3.7k | −$154.54 | −$1.9k | $36.5k | −$1.5k | −$18.5k | $365.5k | −$15.5k | −$185.4k |
| litellm-compression | $2.9k | $587.04 | $7.0k | $29.1k | $5.9k | $70.4k | $291.3k | $58.7k | $704.4k |
| bm25-35 | $1.5k | $2.0k | $24.1k | $14.9k | $20.1k | $240.8k | $149.3k | $200.7k | $2.41M |

Projections scale this corpus's recall and cut linearly. Real savings depend on how much of your traffic looks like these task families.

## Primary recall by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| truncate-head-35 | 83% | 83% | 33% | 0% | 33% | 50% | 50% | 0% | 0% | 0% | 33% | 17% | 17% | 50% |
| truncate-tail-35 | 0% | 17% | 17% | 33% | 50% | 33% | 17% | 0% | 50% | 17% | 17% | 50% | 83% | 33% |
| random-lines-35 | 0% | 0% | 67% | 50% | 50% | 33% | 17% | 0% | 33% | 50% | 33% | 0% | 33% | 50% |
| bm25-35 | 67% | 33% | 100% | 100% | 83% | 100% | 0% | 100% | 50% | 100% | 100% | 100% | 100% | 100% |
| supercompress-fast | 100% | 33% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| supercompress-live | 67% | 50% | 67% | 33% | 83% | 100% | 17% | 100% | 50% | 83% | 100% | 100% | 67% | 100% |
| probe0-tool-compact | 67% | 67% | 100% | 67% | 83% | 100% | 50% | 100% | 33% | 50% | 100% | 50% | 33% | 100% |
| caveman-cloud | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| headroom-kompress | 100% | 67% | 50% | 100% | 100% | 100% | 100% | 100% | 0% | 17% | 100% | 0% | 67% | 83% |
| litellm-compression | 83% | 83% | 50% | 0% | 83% | 83% | 50% | 0% | 33% | 50% | 33% | 67% | 50% | 67% |

## Cut by family

| Arm | ci-log | py-traceback | tsc-errors | grep-def | find-paths | service-logs | multi-hop | aggregate-fails | git-diff | json-records | sql-table | code-file | docs-rag | chat-transcript |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| truncate-head-35 | 67% | 66% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| truncate-tail-35 | 61% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% | 65% |
| random-lines-35 | 56% | 60% | 59% | 59% | 53% | 61% | 61% | 57% | 49% | 48% | 58% | 54% | 56% | 56% |
| bm25-35 | 65% | 78% | 95% | 60% | 70% | 81% | 100% | 64% | 79% | 65% | 66% | 97% | 81% | 99% |
| supercompress-fast | 18% | 99% | 0% | 49% | 57% | 99% | 100% | 0% | 75% | 0% | 0% | 92% | 6% | 99% |
| supercompress-live | 25% | 91% | 19% | 13% | 66% | 92% | 22% | 89% | 79% | 90% | 97% | 82% | 20% | 95% |
| probe0-tool-compact | 87% | 85% | 86% | 86% | 84% | 85% | 86% | 92% | 80% | 84% | 86% | 87% | 89% | 86% |
| caveman-cloud | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| headroom-kompress | 4% | 1% | 4% | 3% | 0% | 1% | 1% | 2% | 35% | 43% | 2% | 34% | 12% | 11% |
| litellm-compression | 58% | 56% | 71% | 72% | 61% | 52% | 55% | 68% | 67% | 60% | 57% | 68% | 79% | 76% |

## Primary recall / cut by needle position

| Arm | head | middle | tail |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 89% / 65% | 7% / 65% | 0% / 65% |
| truncate-tail-35 | 0% / 65% | 3% / 65% | 89% / 65% |
| random-lines-35 | 25% / 59% | 31% / 57% | 33% / 58% |
| bm25-35 | 79% / 81% | 86% / 78% | 78% / 82% |
| supercompress-fast | 89% / 66% | 100% / 51% | 96% / 49% |
| supercompress-live | 75% / 72% | 76% / 55% | 67% / 44% |
| probe0-tool-compact | 86% / 88% | 66% / 85% | 63% / 86% |
| caveman-cloud | 100% / 0% | 100% / 0% | 100% / 0% |
| headroom-kompress | 89% / 2% | 55% / 12% | 67% / 6% |
| litellm-compression | 86% / 61% | 24% / 62% | 48% / 66% |

## Primary recall / cut by input size

| Arm | small | medium | large |
|---|---:|---:|---:|
| raw | 100% / 0% | 100% / 0% | 100% / 0% |
| truncate-head-35 | 25% / 66% | 36% / 65% | 36% / 65% |
| truncate-tail-35 | 36% / 66% | 25% / 65% | 29% / 65% |
| random-lines-35 | 29% / 58% | 43% / 58% | 18% / 58% |
| bm25-35 | 79% / 76% | 82% / 81% | 82% / 80% |
| supercompress-fast | 93% / 54% | 96% / 57% | 96% / 57% |
| supercompress-live | 79% / 61% | 82% / 78% | 57% / 54% |
| probe0-tool-compact | 100% / 4% | 68% / 75% | 46% / 93% |
| caveman-cloud | 100% / 0% | 100% / 0% | 100% / 0% |
| headroom-kompress | 57% / 19% | 71% / 15% | 82% / 3% |
| litellm-compression | 61% / 58% | 54% / 64% | 43% / 63% |

## Primary recall / cut by query style

| Arm | lexical | paraphrase |
|---|---:|---:|
| raw | 100% / 0% | 100% / 0% |
| truncate-head-35 | 31% / 65% | 33% / 65% |
| truncate-tail-35 | 27% / 65% | 33% / 65% |
| random-lines-35 | 31% / 57% | 28% / 59% |
| bm25-35 | 100% / 71% | 59% / 89% |
| supercompress-fast | 100% / 49% | 90% / 64% |
| supercompress-live | 96% / 74% | 46% / 45% |
| probe0-tool-compact | 78% / 87% | 64% / 85% |
| caveman-cloud | 100% / 0% | 100% / 0% |
| headroom-kompress | 78% / 7% | 62% / 6% |
| litellm-compression | 53% / 63% | 51% / 62% |

## Faithfulness and side effects

*Fidelity* = share of output lines that appear verbatim in the input (omission markers excluded). *Novel lines* are text the compressor wrote that is not in the input. *Distractors kept* = near-miss look-alikes per task (keeping them is fine; keeping them instead of the gold is the failure mode recall measures).

| Arm | Fidelity | Tasks w/ novel lines | Novel lines | Out-of-order | Untouched | Expanded | Distractors kept / task | p95 latency | Determinism |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw | 100.0% | 0 | 0 | 0 | 84 | 0 | 1.07 | 0.00 | 234/234 identical |
| truncate-head-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.26 | 0.21 | 234/234 identical |
| truncate-tail-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.30 | 0.21 | 234/234 identical |
| random-lines-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.35 | 0.32 | 234/234 identical |
| bm25-35 | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.77 | 12 | 234/234 identical |
| supercompress-fast | 100.0% | 0 | 0 | 0 | 27 | 0 | 1.01 | 82 | 234/234 identical |
| supercompress-live | 100.0% | 0 | 0 | 0 | 0 | 0 | 0.82 | 80.3s | n/a (remote) |
| probe0-tool-compact | 100.0% | 0 | 0 | 0 | 25 | 0 | 0.68 | 27 | 234/234 identical |
| caveman-cloud | 100.0% | 0 | 0 | 0 | 84 | 0 | 1.07 | 848 | n/a (remote) |
| headroom-kompress | 51.9% | 54 | 8608 | 0 | 30 | 0 | 0.74 | 20.8s | n/a (remote) |
| litellm-compression | 100.0% | 0 | 0 | 0 | 6 | 0 | 0.31 | 35 | n/a (remote) |

## BM25 frontier

The same BM25 line ranker at several budgets. Any compressor should sit above this curve: if a 20-line lexical baseline gets the same recall at the same cut, the product adds nothing on this corpus.

| Budget | Cut | Primary recall | All-gold |
|---|---:|---:|---:|
| 5% | 96.3% | 60.7% | 58.3% |
| 10% | 93.3% | 75.0% | 67.9% |
| 20% | 87.7% | 79.8% | 70.2% |
| 35% | 80.3% | 81.0% | 73.8% |
| 50% | 73.9% | 81.0% | 73.8% |
| 70% | 66.2% | 81.0% | 73.8% |
| 90% | 59.9% | 81.0% | 73.8% |

## Pairwise significance (primary recall)

Exact McNemar on discordant task pairs; Holm-corrected within each tier step.

| Step | Arm | vs (step leader) | Paired n | Only leader kept answer | Only arm kept answer | p | p (Holm) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | supercompress-fast | caveman-cloud | 84 | 4 | 0 | 0.125 | 0.125 | not distinguishable |
| 1 | supercompress-live | caveman-cloud | 84 | 23 | 0 | <0.001 | <0.001 | worse |
| 1 | probe0-tool-compact | caveman-cloud | 84 | 24 | 0 | <0.001 | <0.001 | worse |
| 1 | headroom-kompress | caveman-cloud | 84 | 25 | 0 | <0.001 | <0.001 | worse |
| 1 | litellm-compression | caveman-cloud | 84 | 40 | 0 | <0.001 | <0.001 | worse |
| 2 | probe0-tool-compact | supercompress-live | 84 | 12 | 11 | 1.000 | 1.000 | not distinguishable |
| 2 | headroom-kompress | supercompress-live | 84 | 21 | 19 | 0.875 | 1.000 | not distinguishable |
| 2 | litellm-compression | supercompress-live | 84 | 27 | 10 | 0.008 | 0.023 | worse |

## Misses (primary answer lost), product arms

- **supercompress-fast** (4): py-traceback ×4
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/reports/batch_ops.py", line 586`, `ValueError: currency mismatch on apply_payload_transfer: CHF != JPY`
  - `py-traceback.small.tail.paraphrase.r0` missing: `File "/app/services/notify/shard_ops.py", line 205`, `ValueError: currency mismatch on apply_replica_adjustment: GBP != JPY`
  - `py-traceback.medium.head.paraphrase.r0` missing: `File "/app/services/reports/manifest_core.py", line 826`, `ValueError: currency mismatch on apply_shard_credit: JPY != CHF`
  - `py-traceback.large.head.paraphrase.r0` missing: `File "/app/services/media/tenant_rules.py", line 759`, `ValueError: currency mismatch on apply_batch_transfer: JPY != EUR`
- **supercompress-live** (23): multi-hop ×5, grep-def ×4, py-traceback ×3, git-diff ×3, ci-log ×2, tsc-errors ×2, docs-rag ×2, find-paths ×1, json-records ×1
  - `ci-log.small.head.paraphrase.r0` missing: `FAIL  src/pricing/index-renders.test.ts`, `Expected: 8488`
  - `ci-log.medium.head.paraphrase.r0` missing: `FAIL  src/session/shard-renders.test.ts`, `Expected: 6651`
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/reports/batch_ops.py", line 586`
  - `py-traceback.medium.head.paraphrase.r0` missing: `File "/app/services/reports/manifest_core.py", line 826`, `ValueError: currency mismatch on apply_shard_credit: JPY != CHF`
- **probe0-tool-compact** (24): git-diff ×4, docs-rag ×4, multi-hop ×3, json-records ×3, code-file ×3, ci-log ×2, py-traceback ×2, grep-def ×2, find-paths ×1
  - `ci-log.large.head.lexical.r0` missing: `FAIL  src/catalog/queue-parses.test.ts`, `Expected: 6712`
  - `ci-log.large.middle.lexical.r0` missing: `FAIL  src/session/ticket-loads.test.ts`, `Expected: 8399`
  - `py-traceback.medium.head.paraphrase.r0` missing: `File "/app/services/reports/manifest_core.py", line 826`, `ValueError: currency mismatch on apply_shard_credit: JPY != CHF`
  - `py-traceback.large.head.paraphrase.r0` missing: `File "/app/services/media/tenant_rules.py", line 759`, `ValueError: currency mismatch on apply_batch_transfer: JPY != EUR`
- **caveman-cloud**: none
- **headroom-kompress** (25): git-diff ×6, code-file ×6, json-records ×5, tsc-errors ×3, py-traceback ×2, docs-rag ×2, chat-transcript ×1
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/reports/batch_ops.py", line 586`, `ValueError: currency mismatch on apply_payload_transfer: CHF != JPY`
  - `py-traceback.small.tail.paraphrase.r0` missing: `File "/app/services/notify/shard_ops.py", line 205`, `ValueError: currency mismatch on apply_replica_adjustment: GBP != JPY`
  - `tsc-errors.small.middle.lexical.r0` missing: `src/ledger/manifest-store.ts:249:11 - error TS2345`, `is not assignable to parameter of type 'string'`
  - `tsc-errors.small.middle.paraphrase.r0` missing: `src/media/snapshot-store.ts:34:8 - error TS2345`, `is not assignable to parameter of type 'string'`
- **litellm-compression** (40): grep-def ×6, aggregate-fails ×6, git-diff ×4, sql-table ×4, tsc-errors ×3, multi-hop ×3, json-records ×3, docs-rag ×3, code-file ×2, chat-transcript ×2, ci-log ×1, py-traceback ×1, find-paths ×1, service-logs ×1
  - `ci-log.large.middle.lexical.r0` missing: `FAIL  src/session/ticket-loads.test.ts`, `Expected: 8399`
  - `py-traceback.small.head.paraphrase.r0` missing: `File "/app/services/reports/batch_ops.py", line 586`, `ValueError: currency mismatch on apply_payload_transfer: CHF != JPY`
  - `tsc-errors.small.middle.lexical.r0` missing: `src/ledger/manifest-store.ts:249:11 - error TS2345`, `is not assignable to parameter of type 'string'`
  - `tsc-errors.small.middle.paraphrase.r0` missing: `src/media/snapshot-store.ts:34:8 - error TS2345`, `is not assignable to parameter of type 'string'`

## Arms

- **raw** (local, query not used): No compression (recall ceiling, 0% cut). — `{}`
- **truncate-head-35** (local, query not used): Keep the first 35% of characters (line-aligned). — `{}`
- **truncate-tail-35** (local, query not used): Keep the last 35% of characters (line-aligned). — `{}`
- **random-lines-35** (local, query not used): Seeded random 35% of lines, original order. — `{}`
- **bm25-35** (local, query-aware): BM25 line ranking against the query, 35% character budget. — `{}`
- **supercompress-fast** (local, query-aware): SuperCompress Fast engine run in-process (budgetRatio 0.35). Reference for the hosted API; not the billed product path. — `{"path":"$SC_ROOT/packages/proxy/src/fast-compress.js","sha256":"48b1b7b11ee4e1bb"}`
- **supercompress-live** (remote, query-aware): Hosted SuperCompress API (www.supercompress.dev/api/v1/compress), context + query. — `{"url":"https://www.supercompress.dev/api/v1/compress"}`
- **probe0-tool-compact** (local, query-aware): Port of Probe0 CLI 0.1.19 agent tool-output compaction (bash fold/focus, read head/tail, web head). Kind mapped per family. — `{"path":"$SC_ROOT/scripts/bench_vs_probe0/probe0_tool_compact.js","sha256":"630e4300feca6f15"}`
- **caveman-cloud** (remote, query not used): Caveman Cloud /sdk/v1/compress. Its contract takes input only — the query is NOT sent (documented asymmetry). — `{"url":"https://gateway.caveman.so/sdk/v1/compress"}`
- **headroom-kompress** (worker, query-aware): Headroom KompressCompressor (ONNX, offline), target_ratio 0.35, question = query. — `{"python":"$SC_ROOT/local/bench-20261102/venvs/headroom/bin/python","script":"headroom_kompress_worker.py","implementation":"headroom-kompress","version":"0.42.0"}`
- **litellm-compression** (worker, query-aware): LiteLLM litellm.compression.compress on the tool message, compression_target = 0.35 of prompt tokens, no embedding model. — `{"python":"$SC_ROOT/local/bench-20261102/venvs/litellm/bin/python","script":"litellm_worker.py","implementation":"litellm-compression","version":"1.106.6"}`

## Corpus

| Family | Kind | Tasks | Median tokens | Max tokens | What it tests |
|---|---:|---:|---:|---:|---:|
| ci-log | bash | 6 | 7,289 | 29,110 | Jest CI run: hundreds of PASS lines, one FAIL block, a flaky-retry near-miss, coverage table tail. |
| py-traceback | bash | 6 | 12,125 | 47,785 | Worker log with one fatal Python traceback (deep library frames) and one handled near-miss traceback. |
| tsc-errors | bash | 6 | 9,396 | 37,076 | Build output dominated by warnings from the same file; exactly one hard error (TS2345). |
| grep-def | bash | 6 | 8,623 | 34,926 | ripgrep output where every line mentions the symbol; only one is the definition. Mock with a prefix-sharing name is the near miss. |
| find-paths | bash | 6 | 4,229 | 16,995 | `find` listing of an infra repo. Gold path has env/region/resource siblings that differ in one segment. |
| service-logs | bash | 6 | 12,839 | 51,476 | Interleaved multi-service access/app logs. One ERROR with request id; WARN retries carry adjacent ids. |
| multi-hop | bash | 6 | 13,907 | 56,292 | Two-hop: the error line names a session id; a separate auth line maps that session to a user. Both are needed. |
| aggregate-fails | bash | 6 | 7,052 | 27,962 | Global question: list EVERY failing test. 4-9 failures scattered through a pytest -v run; all must survive. |
| git-diff | bash | 6 | 2,564 | 9,647 | Multi-file unified diff. Gold is a -/+ pair in one hunk; other hunks change similar config keys. |
| json-records | tool | 6 | 2,765 | 10,863 | Pretty-printed JSON API response (one field per line). Answer needs the id line and sibling fields of the same object. |
| sql-table | tool | 6 | 7,276 | 29,416 | psql aligned table output. Gold row must survive; header row needed to interpret it. Ids differ by digit transposition. |
| code-file | read | 6 | 4,783 | 17,820 | Source file read. Gold constant lives inside the current function; a *Legacy twin holds a different value. |
| docs-rag | rag | 6 | 6,052 | 23,813 | Markdown product docs (RAG chunk dump). Paraphrase queries share almost no words with the gold sentence. |
| chat-transcript | chat | 6 | 6,187 | 24,790 | Long agent/user transcript. A decision is made once; a rejected alternative appears later. |

See README.md for methodology, threats to validity and how to reproduce.
