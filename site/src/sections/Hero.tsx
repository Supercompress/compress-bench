import { DitherWord } from "@/components/brand/DitherWord";
import { SprayUnderline } from "@/components/brand/SprayUnderline";
import { HeroField } from "@/components/brand/HeroField";
import { Terminal, C } from "@/components/ascii/Terminal";
import type { Line } from "@/components/ascii/Terminal";
import { armBy, bench, label, meta, num, pct } from "@/data/bench";

export const REPO = "https://github.com/Supercompress/compress-bench";

const lbArms = ["supercompress-fast", "caveman-cloud", "probe0-tool-compact", "supercompress-live", "headroom-kompress", "litellm-compression", "bm25-35"];

function script(): Line[] {
  const L: Line[] = [];
  L.push({ at: 0.2, type: true, segs: [{ text: "$ ", color: C.blue }, { text: "node src/cli.js --split test --sample 2" }] });
  L.push({ at: 1.6, segs: [{ text: "corpus  ", color: C.dim }, { text: `test · seed ${meta.seed} · ${meta.n_corpus} tasks · ${meta.tokenizer}` }] });
  L.push({ at: 1.8, segs: [{ text: "sample  ", color: C.dim }, { text: `${meta.n_sample} tasks, stratified by family × size × position` }] });
  L.push({ at: 2.0, segs: [{ text: "" }] });
  L.push({ at: 2.1, segs: [{ text: "arm".padEnd(22), color: C.dim }, { text: "answer kept", color: C.dim }] });
  lbArms.forEach((n, i) => {
    const a = armBy(n);
    const p = a.summary.primary.p;
    const col = p >= 0.9 ? C.green : p >= 0.7 ? C.blue : C.amber;
    L.push({ at: 2.4 + i * 0.55, segs: [{ text: n.padEnd(22).slice(0, 22), color: a.reference ? C.dim : C.ink }], bar: { width: 22, to: p, dur: 0.9, color: col, suffix: `${pct(p)}  cut ${pct(a.summary.cut.est, 0)}` } });
  });
  const t = 2.4 + lbArms.length * 0.55 + 1.1;
  L.push({ at: t, segs: [{ text: "" }] });
  L.push({ at: t + 0.1, segs: [{ text: "tiers   ", color: C.dim }, { text: "McNemar exact, Holm-corrected" }] });
  bench.tiers.order
    .reduce<number[]>((acc, o) => (acc.includes(o.tier) ? acc : [...acc, o.tier]), [])
    .forEach((tier, i) =>
      L.push({ at: t + 0.4 + i * 0.3, segs: [{ text: `  ${tier}  `, color: tier === 1 ? C.green : C.dim }, { text: bench.tiers.order.filter((o) => o.tier === tier).map((o) => o.arm).join("  ") }] })
    );
  L.push({ at: t + 1.6, segs: [{ text: "✓ ", color: C.green }, { text: "wrote results/REPORT.md, results/results.json" }] });
  return L;
}

export function Hero() {
  const fast = armBy("supercompress-fast");
  return (
    <header className="hero" id="top">
      <HeroField />
      <div className="wrap hero-grid">
        <div className="reveal-hero" style={{ display: "grid", gap: 28 }}>
          <span className="eyebrow">
            <i /> compress-bench · open benchmark · v1
          </span>
          <h1 className="display">
            Compress the context.
            <br />
            Make sure the answer <DitherWord>survives</DitherWord>.
          </h1>
          <p className="lede">
            Coding agents read more tool output than anything else, and every compressor claims to cut it. compress-bench checks the part that matters: after the cut, is the{" "}
            <SprayUnderline>evidence still there</SprayUnderline>? {num(meta.n_corpus)} seeded tasks, 14 families, held-out and fresh seeds, paired significance tests, priced at enterprise scale.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="#story">
              Walk through one task <span className="k">↓</span>
            </a>
            <a className="btn" href="#leaderboard">
              Leaderboard
            </a>
            <a className="btn" href={REPO}>
              GitHub
            </a>
          </div>
          <div className="stats tnum">
            <div>
              <b>{pct(fast.summary.primary.p)}</b>
              <span>answers kept by {label(fast.name)}</span>
            </div>
            <div>
              <b>{num(meta.n_corpus)}</b>
              <span>tasks per split, 3 seeds</span>
            </div>
            <div>
              <b>{(meta.corpus_tokens / 1e6).toFixed(2)}M</b>
              <span>tokens per split ({meta.tokenizer})</span>
            </div>
            <div>
              <b>{bench.tiers.order.length}</b>
              <span>products, 11 reference arms</span>
            </div>
          </div>
        </div>
        <div className="reveal-hero">
          <Terminal lines={script()} title="compress-bench — test split" height={300} />
          <p className="small" style={{ marginTop: 12 }}>
            Replayed from <span className="mono">results/results.json</span>, drawn with asciicn. Bars show the share of tasks whose primary evidence survived.
          </p>
        </div>
      </div>
    </header>
  );
}
