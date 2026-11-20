import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/Section";
import { Terminal, C } from "@/components/ascii/Terminal";
import type { Line } from "@/components/ascii/Terminal";
import { LedMark } from "@/components/brand/LedMark";
import { B4, asset } from "@/components/brand/brand";
import { armBy, meta, pct } from "@/data/bench";
import { REPO } from "./Hero";

const reproLines = (): Line[] => {
  const fast = armBy("supercompress-fast");
  const bm = armBy("bm25-35");
  return [
    { at: 0.2, type: true, segs: [{ text: "$ ", color: C.blue }, { text: "git clone https://github.com/Supercompress/compress-bench" }] },
    { at: 2.0, type: true, segs: [{ text: "$ ", color: C.blue }, { text: "cd compress-bench && npm test" }] },
    { at: 3.0, segs: [{ text: "✓ ", color: C.green }, { text: "39 tests passed", color: C.ink }, { text: " (offline, no deps)", color: C.dim }] },
    { at: 3.6, type: true, segs: [{ text: "$ ", color: C.blue }, { text: "node src/cli.js --split fresh --arms bm25-35" }] },
    { at: 5.2, segs: [{ text: "seed    ", color: C.dim }, { text: "drawn from the clock, recorded in the report" }] },
    { at: 5.4, segs: [{ text: "bm25-35".padEnd(20), color: C.ink }], bar: { width: 20, to: bm.full?.primary ?? bm.summary.primary.p, dur: 1.1, color: C.blue, suffix: "done" } },
    { at: 7.0, type: true, segs: [{ text: "$ ", color: C.blue }, { text: "SC_ROOT=../supercompress node src/cli.js --split test" }] },
    { at: 9.0, segs: [{ text: "supercompress-fast".padEnd(20), color: C.ink }], bar: { width: 20, to: fast.full?.primary ?? fast.summary.primary.p, dur: 1.1, color: C.green, suffix: pct(fast.full?.primary ?? fast.summary.primary.p) } },
    { at: 10.6, segs: [{ text: "✓ ", color: C.green }, { text: "results/REPORT.md" }] },
  ];
};

export function Reproduce() {
  return (
    <Section
      id="reproduce"
      n="12"
      kicker="Reproduce"
      title={
        <>
          Don’t trust us. <span className="blue">Run it.</span>
        </>
      }
      lede={
        <>
          Node 20, no dependencies, offline by default. Reference arms run anywhere. Product arms need their own access: an API key, a Python package, or for the two local engines, a checkout pointed to by <span className="mono">SC_ROOT</span>. Every arm’s
          version and file hash are written into the report.
        </>
      }
    >
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div data-reveal>
          <Terminal lines={reproLines()} title="~/compress-bench" height={250} loop={14} />
        </div>
        <div style={{ display: "grid", gap: 14 }} data-reveal>
          <div className="codeblock">
            <span className="c"># list arms and why each can or can’t run here</span>
            {"\n"}node src/cli.js <span className="p">--list</span>
            {"\n\n"}
            <span className="c"># dev / held-out test / fresh seed</span>
            {"\n"}node src/cli.js <span className="p">--split dev</span>
            {"\n"}node src/cli.js <span className="p">--split test --sample 2</span>
            {"\n"}node src/cli.js <span className="p">--split fresh</span>
            {"\n\n"}
            <span className="c"># price it for your volume and model</span>
            {"\n"}node src/cli.js <span className="p">--rereads 20 --prices prices.json</span>
          </div>
          <div className="card card-pad small">
            Corpus <span className="mono">{meta.corpus_sha.slice(0, 16)}</span> · bench <span className="mono">{meta.bench_sha.slice(0, 16)}</span> · tokenizer {meta.tokenizer} · {meta.bootstrap_B} bootstrap samples · generated{" "}
            {meta.generated_at.slice(0, 10)}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Cta() {
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="cta" data-reveal>
          <LedMark />
          <div style={{ position: "relative", maxWidth: 620, display: "grid", gap: 22 }}>
            <h2 className="h2" style={{ color: "#fff" }}>
              Put your compressor on the board.
            </h2>
            <p style={{ margin: 0, fontSize: 18, color: "rgba(255,255,255,.82)" }}>
              An arm is a small object with a <span className="mono">compress(task)</span> function. Add yours, run the held-out split and a fresh seed, and open a pull request with the report.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="btn btn-white" href={REPO}>
                Star on GitHub
              </a>
              <a className="btn btn-ghost" href={`${REPO}/blob/main/src/arms/baselines.js`}>
                See an arm
              </a>
              <a className="btn btn-ghost" href="https://supercompress.dev">
                supercompress.dev
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap" style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <img src={asset("img/lockup-horizontal-light.svg")} alt="SuperCompress" style={{ height: 22, width: "auto" }} />
        <span>
          compress-bench is MIT licensed. Results are from {meta.generated_at.slice(0, 10)}; prices as of {meta.prices_as_of}.
        </span>
        <span style={{ display: "flex", gap: 16 }}>
          <a href={REPO}>GitHub</a>
          <a href={`${REPO}/blob/main/results/REPORT.md`}>Full report</a>
          <a href={`${REPO}/blob/main/results/results.json`}>results.json</a>
        </span>
      </div>
    </footer>
  );
}

/** Nav with a Bayer-dithered scroll progress bar. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    let last = -1;
    const draw = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? scrollY / max : 0;
      setScrolled(scrollY > 20);
      if (Math.abs(p - last) < 0.001) return;
      last = p;
      const w = c.clientWidth;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(3 * dpr);
      }
      const x = c.getContext("2d")!;
      x.clearRect(0, 0, c.width, c.height);
      x.fillStyle = "#0566ff";
      const cell = Math.max(1, Math.round(dpr));
      const end = p * c.width;
      const fade = 90 * dpr;
      for (let px = 0; px < end; px += cell)
        for (let py = 0; py < c.height; py += cell) {
          const v = Math.min(1, (end - px) / fade + 0.25);
          if (v > B4[(py / cell) & 3][(px / cell) & 3]) x.fillRect(px, py, cell, cell);
        }
    };
    draw();
    addEventListener("scroll", draw, { passive: true });
    addEventListener("resize", draw);
    return () => {
      removeEventListener("scroll", draw);
      removeEventListener("resize", draw);
    };
  }, []);
  return (
    <nav className="nav" data-scrolled={scrolled}>
      <div className="wrap nav-in">
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }} aria-label="compress-bench home">
          <img src={asset("sc-mark.svg")} alt="" width={22} height={22} />
          <span style={{ fontSize: 15 }}>
            compress<span className="faint">-</span>
            <span className="blue">bench</span>
          </span>
        </a>
        <div style={{ display: "flex", gap: 22, marginLeft: "auto", alignItems: "center" }} className="nav-links">
          <a className="link" href="#story">
            Walkthrough
          </a>
          <a className="link" href="#leaderboard">
            Leaderboard
          </a>
          <a className="link" href="#cost">
            Cost
          </a>
          <a className="link" href="#method">
            Method
          </a>
          <a className="btn" style={{ height: 34, fontSize: 13.5 }} href={REPO}>
            GitHub
          </a>
        </div>
      </div>
      <canvas ref={cv} className="nav-progress" style={{ width: "100%", height: 3 }} aria-hidden="true" />
    </nav>
  );
}
