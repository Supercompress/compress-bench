import { useState } from "react";
import { Section } from "@/components/Section";
import { asset } from "@/components/brand/brand";
import { meta } from "@/data/bench";
import { REPO } from "./Hero";

type Fig = { id: string; n: string; title: string; note: string; wide?: boolean };

const FIGS: Fig[] = [
  {
    id: "fig1-recall-vs-cut",
    n: "Figure 1",
    title: "Recall vs. cut against the BM25 frontier",
    note: "Every product on one plane, with 95% intervals on both axes. Points below the shaded envelope keep fewer answers than a free lexical ranker at the same cut.",
    wide: true,
  },
  {
    id: "fig2-recall-forest",
    n: "Figure 2",
    title: "Primary recall, intervals and tiers",
    note: "Forest plot of recall with 95% Wilson intervals. Tiers come from paired exact McNemar tests, Holm-corrected.",
  },
  {
    id: "fig3-recall-by-family",
    n: "Figure 3",
    title: "Recall by task family",
    note: "Fourteen families, six tasks per cell. This is where each compressor breaks.",
  },
  {
    id: "fig4-recovery-adjusted-cut",
    n: "Figure 4",
    title: "What the cut is worth after misses",
    note: "Each miss pays a raw re-read. The arrow runs from the raw cut to the recovery-adjusted cut.",
  },
  {
    id: "fig5-seed-stability",
    n: "Figure 5",
    title: "Three seeds, same ranking",
    note: "Dev, held-out test and a fresh post-freeze seed, all 234 tasks per split for local arms.",
  },
  {
    id: "fig6-robustness",
    n: "Figure 6",
    title: "Robustness by position, phrasing and size",
    note: "Recall within each stratum. Flat lines mean the compressor does not care where the evidence sits or how the question is worded.",
  },
  {
    id: "fig7-annual-savings",
    n: "Figure 7",
    title: "Annual savings at enterprise scale",
    note: "10B tool tokens a month on Opus 5.5 list prices, using the recovery-adjusted cut.",
  },
  {
    id: "fig8-real-world",
    n: "Figure 8",
    title: "Real agent output, with passthrough removed",
    note: "Recall on every task against recall on only the tasks each arm cut, on SWE-agent dev, the sealed test split and OpenHands.",
    wide: true,
  },
  {
    id: "card-real-drop",
    n: "Social card · real world",
    title: "Synthetic to real: recall on inputs each tool actually cut",
    note: "Same engine and metric from our synthetic test to public dev, the sealed test and a different agent harness. 16:9 for X and LinkedIn.",
  },
  {
    id: "card-passthrough",
    n: "Social card · passthrough",
    title: "Headline recall, split into passthrough and real compression",
    note: "How much each product returns unchanged, and how much it keeps on the inputs it does cut. 16:9.",
  },
];

const BIBTEX = `@misc{compressbench2026,
  title  = {compress-bench: a seeded, held-out benchmark for context compressors},
  author = {{SuperCompress}},
  year   = {2026},
  note   = {Split ${meta.split}, seed ${meta.seed}, bench ${meta.bench_sha}},
  url    = {https://github.com/Supercompress/compress-bench}
}`;

function Downloads({ id }: { id: string }) {
  return (
    <div className="fig-dl">
      {(["svg", "png", "pdf"] as const).map((ext) => (
        <a key={ext} href={asset(`figures/${id}.${ext}`)} download>
          {ext.toUpperCase()}
        </a>
      ))}
    </div>
  );
}

function FigureCard({ f }: { f: Fig }) {
  return (
    <figure className={`card fig-card ${f.wide ? "fig-wide" : ""}`} data-reveal>
      <a className="fig-img" href={asset(`figures/${f.id}.svg`)} target="_blank" rel="noreferrer" aria-label={`Open ${f.n} full size`}>
        <img src={asset(`figures/${f.id}.png`)} alt={`${f.n}: ${f.title}`} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        <div>
          <span className="mono blue" style={{ fontSize: 12 }}>
            {f.n}
          </span>
          <div className="fig-title">{f.title}</div>
          <p className="fig-note">{f.note}</p>
        </div>
        <Downloads id={f.id} />
      </figcaption>
    </figure>
  );
}

export function Figures() {
  const [copied, setCopied] = useState(false);
  return (
    <Section
      id="figures"
      n="11"
      kicker="Figures"
      title={
        <>
          Publication-ready <span className="blue">figures</span>
        </>
      }
      lede="Every chart on this page, drawn as a static figure for papers, posts and slides. Each one carries its own sample size, interval method and commit hash. They are vector SVG and PDF, plus 2× PNG, and all of them are regenerated from results.json by one script."
    >
      <div className="fig-grid">
        {FIGS.map((f) => (
          <FigureCard key={f.id} f={f} />
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 20, alignItems: "stretch" }}>
        <figure className="card fig-card" data-reveal>
          <a className="fig-img" href={asset("figures/card-headline.png")} target="_blank" rel="noreferrer" aria-label="Open the social card full size">
            <img src={asset("figures/card-headline.png")} alt="Social card: recall against cut, with SuperCompress Fast, Probe0 and BM25 headline numbers" loading="lazy" decoding="async" />
          </a>
          <figcaption>
            <div>
              <span className="mono blue" style={{ fontSize: 12 }}>
                Social card · 16:9
              </span>
              <div className="fig-title">The headline, sized for X and LinkedIn</div>
            </div>
            <Downloads id="card-headline" />
          </figcaption>
        </figure>
        <div className="card card-pad" data-reveal style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fig-title">Cite and regenerate</div>
          <pre className="codeblock" style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {BIBTEX}
          </pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                navigator.clipboard?.writeText(BIBTEX).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? "Copied" : "Copy BibTeX"}
            </button>
            <a className="btn" href={`${REPO}/tree/main/figures`} target="_blank" rel="noreferrer">
              figures/make_figures.py
            </a>
          </div>
          <p className="faint" style={{ fontSize: 13, margin: 0 }}>
            <span className="mono">python3 figures/make_figures.py</span> rebuilds every file from <span className="mono">site/src/data/bench.json</span>. It needs matplotlib, and the Geist fonts (OFL) ship with it.
          </p>
        </div>
      </div>
    </Section>
  );
}
