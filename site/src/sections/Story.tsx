import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { bench, label, num } from "@/data/bench";
import { reducedMotion } from "@/components/brand/brand";

gsap.registerPlugin(ScrollTrigger);

const ex = bench.example;
const N = ex.lines.length;
const goldLines = [...new Set(ex.golds.map((g) => g.line))];
const ROW = 19;

type Row = { kind: "line"; i: number; dim?: boolean } | { kind: "gap"; n: number } | { kind: "lost"; i: number };
type Step = {
  key: string;
  kicker: string;
  title: string;
  body: React.ReactNode;
  arm?: string;
  rows: Row[];
  mask: number[];
};

const allRows = (): Row[] => ex.lines.map((_, i) => ({ kind: "line", i }));
const windowRows = (): Row[] => {
  const out: Row[] = [];
  const spans = goldLines.map((g) => [Math.max(0, g - 6), Math.min(N - 1, g + 6)]);
  let cur = 0;
  for (const [a, b] of spans) {
    if (a > cur) out.push({ kind: "gap", n: a - cur });
    for (let i = a; i <= b; i++) out.push({ kind: "line", i });
    cur = b + 1;
  }
  if (cur < N) out.push({ kind: "gap", n: N - cur });
  return out;
};
const outputRows = (kept: number[]): Row[] => {
  const out: Row[] = [];
  let gap = 0;
  let lost: number[] = [];
  const flush = () => {
    if (gap) out.push({ kind: "gap", n: gap });
    for (const i of lost) out.push({ kind: "lost", i });
    gap = 0;
    lost = [];
  };
  for (let i = 0; i < N; i++) {
    if (kept[i]) {
      flush();
      out.push({ kind: "line", i });
    } else {
      gap++;
      if (goldLines.includes(i)) lost.push(i);
    }
  }
  flush();
  return out;
};
const maskOf = (arm: string) => [...ex.traces[arm].kept].map(Number);

function buildSteps(): Step[] {
  const tr = (arm: string) => ex.traces[arm];
  const keptN = (arm: string) => maskOf(arm).reduce((a, b) => a + b, 0);
  const lostGold = (arm: string) => goldLines.filter((g) => !maskOf(arm)[g]);
  const armStep = (arm: string, kicker: string, title: string, body: React.ReactNode): Step => ({ key: arm, kicker, title, body, arm, rows: outputRows(maskOf(arm)), mask: maskOf(arm) });
  const ones = new Array(N).fill(1);
  return [
    {
      key: "task",
      kicker: "01 · the task",
      title: "A real-shaped log and a question about it",
      body: (
        <>
          <p>
            One of {num(bench.meta.n_corpus)} test tasks: <span className="mono">{ex.id}</span>. {num(N)} lines of service logs, {num(ex.tokens)} tokens. The agent asks:
          </p>
          <blockquote className="card card-pad" style={{ margin: "14px 0 0", fontSize: 18, letterSpacing: "-0.01em" }}>
            “{ex.query}”
          </blockquote>
        </>
      ),
      rows: allRows(),
      mask: ones,
    },
    {
      key: "hops",
      kicker: "02 · the evidence",
      title: "The answer needs two lines, 95 lines apart",
      body: (
        <p>
          Line {goldLines[1] + 1} says a checkout failed for <span className="mono">sess_nzx8p6zqm4</span>, and why. It never names the customer. Line {goldLines[0] + 1}, a login, ties that session to an email. Nothing on the login line shares a word
          with the question, so a compressor that matches words keeps the failure and drops the person. This is the <span className="mono">multi-hop</span> family.
        </p>
      ),
      rows: windowRows(),
      mask: ones,
    },
    armStep(
      "truncate-head-35",
      "03 · head -n",
      "Keep the first 35%",
      <p>
        The simplest compressor keeps the top of the file. {num(keptN("truncate-head-35"))} lines, {num(tr("truncate-head-35").tokens_out)} tokens. Both answer lines sit lower down, so they are gone. Position bias like this is why every task is built three
        times, with the evidence at the head, middle and tail.
      </p>
    ),
    armStep(
      "random-lines-35",
      "04 · random lines",
      "Keep a random 35%",
      <p>
        A seeded random sample at the same budget: {num(keptN("random-lines-35"))} lines. It is the floor any real compressor has to clear. Here it loses {lostGold("random-lines-35").length === goldLines.length ? "both" : "one of the"} evidence lines.
      </p>
    ),
    armStep(
      "bm25-35",
      "05 · BM25",
      "Rank lines by the question’s words",
      <p>
        The lexical baseline scores each line against the query. It keeps the line that says <span className="mono">checkout failed</span> and stops there: {num(tr("bm25-35").tokens_out)} tokens, a huge cut, and no email. BM25 runs at 7 budgets, and
        every product is compared with the BM25 point at its own cut. Beating BM25 is the bar.
      </p>
    ),
    armStep(
      "probe0-tool-compact",
      "06 · Probe0",
      "Probe0’s tool compaction",
      <p>
        A faithful port of the Probe0 CLI 0.1.19 compactor keeps {num(keptN("probe0-tool-compact"))} lines ({num(tr("probe0-tool-compact").tokens_out)} tokens): the first 37 and the last 43. The failure line happens to fall inside the tail window and survives. The
        login line, in the middle, does not.
      </p>
    ),
    armStep(
      "supercompress-fast",
      "07 · SuperCompress Fast",
      "Two lines. 95 tokens. Both hops.",
      <p>
        SuperCompress Fast follows the session id from the failure back to the login and keeps exactly those two lines: {num(tr("supercompress-fast").tokens_out)} tokens out of {num(ex.tokens)}, a {((1 - tr("supercompress-fast").tokens_out / ex.tokens) * 100).toFixed(1)}%
        cut, with the answer intact. One task proves nothing, though, so the next section scores all of them.
      </p>
    ),
    {
      key: "score",
      kicker: "08 · scoring",
      title: "Scored by exact containment, never by a judge",
      body: (
        <>
          <p>
            A task passes when every <em>primary</em> evidence string appears verbatim in the output (case and whitespace normalised). No LLM grades anything. Secondary strings and near-miss distractors are tracked separately, and a compressor that rewrites text
            can’t sneak by, because rewritten evidence no longer matches.
          </p>
          <ul className="small" style={{ margin: "14px 0 0", paddingLeft: 18, display: "grid", gap: 6 }}>
            {ex.golds.map((g) => (
              <li key={g.text}>
                <span className="mono">{g.text}</span> <span className={g.primary ? "blue" : "faint"}>{g.primary ? "primary" : "secondary"}</span>
              </li>
            ))}
          </ul>
        </>
      ),
      arm: "supercompress-fast",
      rows: outputRows(maskOf("supercompress-fast")),
      mask: maskOf("supercompress-fast"),
    },
  ];
}

function Minimap({ mask, step }: { mask: number[]; step: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Float32Array>(new Float32Array(N).fill(1));
  useEffect(() => {
    const c = cv.current!;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const x = c.getContext("2d")!;
    const from = cur.current.slice();
    const t0 = performance.now();
    const dur = reducedMotion() ? 0 : 520;
    let raf = 0;
    const maxLen = 142;
    const draw = (now: number) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = 1 - (1 - p) ** 3;
      x.clearRect(0, 0, c.width, c.height);
      const h = c.height / N;
      const pad = 8 * dpr;
      const w = c.width - pad * 2;
      for (let i = 0; i < N; i++) {
        const v = from[i] + (mask[i] - from[i]) * e;
        cur.current[i] = v;
        const len = Math.max(0.15, ex.lines[i].length / maxLen);
        const gold = goldLines.includes(i);
        x.fillStyle = gold ? (v > 0.5 ? "#0566ff" : "#b42318") : step >= 2 && v > 0.5 ? "#7aa7ff" : "#c9c3b9";
        x.globalAlpha = gold ? 1 : 0.18 + 0.82 * v;
        x.fillRect(pad, i * h, w * len, Math.max(1, h * 0.72));
        if (gold) x.fillRect(0, i * h - dpr, pad * 0.6, h + 2 * dpr);
      }
      x.globalAlpha = 1;
      if (p < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mask, step]);
  return (
    <div className="minimap" title={`All ${N} lines. Blue: kept. Red: evidence lost.`}>
      <canvas ref={cv} />
    </div>
  );
}

function highlight(text: string, on: boolean): React.ReactNode {
  if (!on) return text;
  for (const g of ex.golds) {
    const k = text.indexOf(g.text);
    if (k >= 0)
      return (
        <>
          {highlight(text.slice(0, k), on)}
          <mark style={{ background: g.primary ? "#0566ff" : "#cfe0ff", color: g.primary ? "#fff" : "#0f3fb8", borderRadius: 3, padding: "0 2px" }}>{g.text}</mark>
          {highlight(text.slice(k + g.text.length), on)}
        </>
      );
  }
  return text;
}

function LogView({ s, scoring }: { s: Step; scoring: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(500);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, []);
  const focus = s.key === "task" ? 0 : Math.max(0, s.rows.findIndex((r) => (r.kind === "line" && goldLines.includes(r.i)) || r.kind === "lost"));
  const y = Math.max(0, Math.min(focus * ROW - h * 0.3, s.rows.length * ROW - h + 12));
  const tr = s.arm ? ex.traces[s.arm] : null;
  return (
    <div className="logview">
      <div className="logview-head">
        <span>{s.arm ? `${label(s.arm)} → output` : `${ex.id}.log`}</span>
        <span className="tnum">
          {tr ? (
            <>
              {num(tr.tokens_out)} / {num(ex.tokens)} tok · <span className={tr.primary_hit ? "green" : "red"}>{tr.primary_hit ? "answer kept" : "answer lost"}</span>
            </>
          ) : (
            `${num(N)} lines · ${num(ex.tokens)} tok`
          )}
        </span>
      </div>
      <div className="logview-lines" ref={box}>
        <div style={{ transform: `translateY(${-y}px)`, transition: reducedMotion() ? "none" : "transform .7s cubic-bezier(.22,1,.36,1)" }}>
          {s.rows.map((r, k) =>
            r.kind === "gap" ? (
              <div key={`g${k}`} className="logline" style={{ height: ROW, lineHeight: `${ROW}px`, color: "var(--ink-3)" }}>
                <span />
                <span>[… {r.n} lines omitted …]</span>
              </div>
            ) : r.kind === "lost" ? (
              <div key={`l${r.i}`} className="logline" data-gold="true" data-dim="true" style={{ height: ROW, lineHeight: `${ROW}px` }}>
                <span>✕</span>
                <span>line {r.i + 1} dropped · {ex.lines[r.i].slice(24)}</span>
              </div>
            ) : (
              <div key={r.i} className="logline" data-gold={goldLines.includes(r.i) && s.key !== "task"} style={scoring ? { whiteSpace: "pre-wrap", lineHeight: `${ROW}px`, padding: "6px 12px 6px 0" } : { height: ROW, lineHeight: `${ROW}px` }}>
                <span>{r.i + 1}</span>
                <span>{highlight(ex.lines[r.i], scoring)}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function Story() {
  const steps = useMemo(buildSteps, []);
  const [step, setStep] = useState(0);
  const root = useRef<HTMLElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
    });
    return () => st.kill();
  }, [steps.length]);

  useEffect(() => {
    const still = reducedMotion();
    textRefs.current.forEach((el, i) => {
      if (!el) return;
      el.classList.toggle("on", i === step);
      gsap.to(el, { opacity: i === step ? 1 : 0, y: i === step ? 0 : i < step ? -24 : 24, duration: still ? 0 : 0.55, ease: "power3.out", overwrite: true });
    });
  }, [step]);

  const s = steps[step];
  const jump = (i: number) => {
    const el = root.current!;
    const top = el.getBoundingClientRect().top + scrollY;
    const span = el.offsetHeight - innerHeight;
    scrollTo({ top: top + span * ((i + 0.5) / steps.length), behavior: "smooth" });
  };

  return (
    <section ref={root} id="story" className="story" style={{ height: `${steps.length * 75 + 100}svh` }} aria-label="Guided walkthrough of one task">
      <div className="wrap story-stage" style={{ position: "sticky", top: 0 }}>
        <div>
          <div className="num-label" style={{ marginBottom: 14 }}>
            GUIDED · ONE TASK, FIVE COMPRESSORS
          </div>
          <div className="story-steps">
            {steps.map((st, i) => (
              <div key={st.key} ref={(el) => void (textRefs.current[i] = el)} className="story-step" style={{ display: "grid", gap: 14 }} aria-hidden={i !== step}>
                <span className="num-label faint">{st.kicker}</span>
                <h2 className="h2" style={{ fontSize: "clamp(28px,3.2vw,42px)" }}>
                  {st.title}
                </h2>
                <div className="muted" style={{ fontSize: 16 }}>
                  {st.body}
                </div>
              </div>
            ))}
          </div>
          <div className="story-meter" role="tablist" aria-label="Steps">
            {steps.map((st, i) => (
              <button
                key={st.key}
                role="tab"
                aria-selected={i === step}
                onClick={() => jump(i)}
                title={st.kicker}
                style={{ width: i === step ? 28 : 10, height: 10, borderRadius: 3, border: 0, padding: 0, cursor: "pointer", background: i === step ? "var(--blue)" : i < step ? "#9fc0ff" : "var(--line-2)", transition: "all .3s" }}
              />
            ))}
          </div>
          {s.arm && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <span className="chip tnum">{num(s.mask.reduce((a, b) => a + b, 0))} {s.mask.reduce((a, b) => a + b, 0) === 1 ? "line" : "lines"} kept</span>
              <span className="chip tnum">{num(ex.traces[s.arm].tokens_out)} tokens</span>
              <span className={`chip ${ex.traces[s.arm].primary_hit ? "chip-green" : "chip-red"}`}>{ex.traces[s.arm].primary_hit ? "✓ evidence kept" : "✕ evidence lost"}</span>
            </div>
          )}
        </div>
        <div className="story-viz">
          <Minimap mask={s.mask} step={step} />
          <LogView s={s} scoring={s.key === "score"} />
        </div>
      </div>
    </section>
  );
}
