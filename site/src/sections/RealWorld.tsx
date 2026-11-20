import { useState } from "react";
import { Section } from "@/components/Section";
import { armBy, bench, label, pct } from "@/data/bench";
import type { RealArm } from "@/data/bench";

const PRODUCTS = ["supercompress-fast", "probe0-tool-compact"];

function Meter({ v, lo, hi, muted }: { v: number; lo?: number; hi?: number; muted?: boolean }) {
  return (
    <div className="rw-meter" aria-hidden="true">
      <div style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%`, background: muted ? "#b9b3a9" : "var(--blue)" }} />
      {lo != null && hi != null && <i style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />}
    </div>
  );
}

function ArmRow({ a }: { a: RealArm }) {
  const product = PRODUCTS.includes(a.name);
  return (
    <tr className={product ? "rw-product" : ""}>
      <td>
        {label(a.name)}
        <div className="mono faint">{a.name}</div>
      </td>
      <td className="tnum">
        <span className="rw-big">{pct(a.primary.p)}</span>
        <Meter v={a.primary.p} lo={a.primary.lo} hi={a.primary.hi} muted={!product} />
        <div className="small">
          {pct(a.primary.lo, 0)} – {pct(a.primary.hi, 0)}
        </div>
      </td>
      <td className="tnum">
        <span className="rw-big">{pct(a.abstain, 0)}</span>
        <div className="small">returned unchanged</div>
      </td>
      <td className="tnum">
        {a.compressed ? (
          <>
            <span className="rw-big">{pct(a.compressed.p)}</span>
            <Meter v={a.compressed.p} lo={a.compressed.lo} hi={a.compressed.hi} muted={!product} />
            <div className="small">
              {pct(a.compressed.lo, 0)} – {pct(a.compressed.hi, 0)} · n={a.compressed.n}
            </div>
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="tnum">
        <span className="rw-big">{pct(a.cut.est)}</span>
      </td>
      <td className="tnum">
        <span className={`rw-big ${a.eff_cut.est < 0 ? "red" : ""}`}>{pct(a.eff_cut.est)}</span>
      </td>
    </tr>
  );
}

function Drop({ name }: { name: string }) {
  const synth = armBy(name).summary.primary.p;
  const rows = bench.real.map((s) => ({ s, a: s.arms.find((x) => x.name === name)! })).filter((r) => r.a);
  return (
    <div className="card card-pad rw-drop" data-reveal>
      <div className="mono blue" style={{ fontSize: 12 }}>
        {label(name)}
      </div>
      <div className="rw-steps">
        <div>
          <span className="tnum">{pct(synth, 0)}</span>
          <small>synthetic test</small>
        </div>
        {rows.map(({ s, a }) => (
          <div key={s.split}>
            <span className="tnum">{a.compressed ? pct(a.compressed.p, 0) : "—"}</span>
            <small>{s.label.toLowerCase()}</small>
          </div>
        ))}
      </div>
      <p className="small" style={{ margin: 0 }}>
        Recall on synthetic tasks, then recall on the real tasks it actually cut. It returned {rows.map(({ a }) => pct(a.abstain, 0)).join(", ")} of real inputs unchanged.
      </p>
    </div>
  );
}

export function RealWorld() {
  const [i, setI] = useState(1);
  if (!bench.real?.length) return null;
  const split = bench.real[Math.min(i, bench.real.length - 1)];
  return (
    <Section
      id="real"
      n="03"
      kicker="Real world"
      title={
        <>
          The real-world check, <span className="blue">including where we lose</span>
        </>
      }
      lede={
        <>
          Synthetic seeds share generator code, so a compressor built next to the generators can learn its templates, and no new seed will show it. These splits use real tool outputs from coding agents: the query is the agent’s own reasoning before the call, and the evidence is the lines whose new tokens the agent used in its next step. No LLM labels anything.
        </>
      }
      wide
    >
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {PRODUCTS.map((n) => (
          <Drop key={n} name={n} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Real-world split">
          {bench.real.map((s, k) => (
            <button key={s.split} type="button" aria-pressed={k === i} onClick={() => setI(k)}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="small">
          {split.note} {split.n} tasks · {Object.entries(split.families).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${n}`).join(" · ")}
        </span>
      </div>

      <div className="card scroll-x" data-reveal>
        <table className="table rw-table" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <th>arm</th>
              <th>primary recall · 95% CI</th>
              <th>passthrough</th>
              <th>recall when it compressed</th>
              <th>cut</th>
              <th>recovery-adjusted cut</th>
            </tr>
          </thead>
          <tbody>
            {split.arms.map((a) => (
              <ArmRow key={a.name} a={a} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-3 rw-notes" style={{ marginTop: 20 }}>
        <div className="card card-pad" data-reveal>
          <div className="fig-title">Passthrough is not compression</div>
          <p className="small">
            Returning an input unchanged keeps every answer at 0% cut. Headline recall rewards it, so each arm’s passthrough rate (cut under 5%) and its recall on the inputs it did cut are reported next to it.
          </p>
        </div>
        <div className="card card-pad" data-reveal>
          <div className="fig-title">Sealed before tuning</div>
          <p className="small">
            Test membership is sha256(salt + issue id). Only the salt’s hash is published, in <span className="mono">data/real/MANIFEST.json</span>, so the split was fixed before anyone tuned on it. Its results ship as scores only, with no task ids.
          </p>
        </div>
        <div className="card card-pad" data-reveal>
          <div className="fig-title">A different harness is the real gate</div>
          <p className="small">
            Rules tuned on one agent’s output format carry over to its sealed split but barely to OpenHands. Our engine gained 19 points on the sealed split and 5 on the external one. The external split is the number to beat.
          </p>
        </div>
      </div>
    </Section>
  );
}
