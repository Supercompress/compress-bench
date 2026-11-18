import { useMemo, useState } from "react";
import { LinearFlow } from "@/components/linear-flow";
import { GradientText } from "@/components/gradient-text";
import { Section } from "@/components/Section";
import { armBy, label, meta, monthly, perTokenUsd, ranked, tokensShort, usd } from "@/data/bench";

// Log scale from 100M to 1T tokens a month.
const LO = 8;
const HI = 12;
const fromSlider = (v: number) => Math.round(10 ** (LO + (HI - LO) * v) / 1e6) * 1e6;
const toSlider = (t: number) => (Math.log10(t) - LO) / (HI - LO);

const ARMS = [...ranked.map((r) => r.name), "bm25-35"];

export function Cost() {
  const [model, setModel] = useState("claude-opus-5-5");
  const [tokens, setTokens] = useState(meta.scenarios[2].tokensPerMonth);
  const [rereads, setRereads] = useState(meta.rereads);
  const m = meta.prices.find((p) => p.id === model)!;
  const rows = useMemo(() => ARMS.map((n) => ({ a: armBy(n), ...monthly(armBy(n), m, tokens, rereads) })).sort((a, b) => b.saved - a.saved), [m, tokens, rereads]);
  const fast = rows.find((r) => r.a.name === "supercompress-fast")!;
  const max = Math.max(...rows.map((r) => Math.abs(r.saved)));
  const scen = meta.scenarios.find((s) => s.tokensPerMonth === tokens);
  return (
    <Section
      id="cost"
      n="06"
      kicker="Cost"
      title={
        <>
          What the cut is worth at <span className="blue">enterprise scale</span>
        </>
      }
      lede={
        <>
          Tool output is written into the prompt once (cache write, 1.25× input) and then re-read from cache on every later turn. Savings use each arm’s recovery-adjusted cut, so missed answers pay for a raw re-read. List prices as of {meta.prices_as_of}.
        </>
      }
    >
      <LinearFlow className="cost" colors={["#f7f5f2", "#dce8ff", "#9fc0ff", "#eef3ff"]} background="#f7f5f2" speed={0.35} scale={0.8} warp={0.5} grain={0.08} blur={0.85} dither={{ enabled: true }} interaction={{ pointer: 0.25, scroll: 0.2 }} data-reveal>
        <div className="cost-inner">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)", gap: 40 }} className="cost-grid">
            <div style={{ display: "grid", gap: 22, alignContent: "start" }}>
              <div>
                <div className="small" style={{ marginBottom: 8 }}>
                  Model
                </div>
                <div className="seg" role="group" aria-label="Model">
                  {meta.prices.map((p) => (
                    <button key={p.id} aria-pressed={p.id === model} onClick={() => setModel(p.id)}>
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="small" style={{ marginTop: 8 }}>
                  ${m.input}/M input · ${m.cacheRead}/M cache read{m.assumed ? ` (${m.assumed})` : ""} · {usd(perTokenUsd(m, rereads) * 1e6, 2)} per 1M tool tokens over its life
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="small">Tool tokens per month</span>
                  <span className="tnum" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                    {tokensShort(tokens)}
                  </span>
                </div>
                <input type="range" min={0} max={1} step={0.001} value={toSlider(tokens)} onChange={(e) => setTokens(fromSlider(+e.target.value))} aria-label="Tool tokens per month" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {meta.scenarios.map((s) => (
                    <button key={s.id} className={`chip ${s.tokensPerMonth === tokens ? "chip-blue" : ""}`} style={{ cursor: "pointer", font: "inherit", fontSize: 12.5 }} onClick={() => setTokens(s.tokensPerMonth)}>
                      {s.name} · {tokensShort(s.tokensPerMonth)}
                    </button>
                  ))}
                </div>
                <div className="small" style={{ marginTop: 8, minHeight: 20 }}>
                  {scen?.note ?? "Custom volume."}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="small">Cache re-reads per tool result</span>
                  <span className="tnum">{rereads}</span>
                </div>
                <input type="range" min={0} max={40} step={1} value={rereads} onChange={(e) => setRereads(+e.target.value)} aria-label="Cache re-reads" />
              </div>
              <div className="card card-pad" style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(6px)" }}>
                <div className="small">{label("supercompress-fast")} saves, per year</div>
                <div className="cost-big tnum">
                  <GradientText colors={["#0566ff", "#0f3fb8", "#5d9bff", "#0558fe"]} speed={0.6}>
                    {usd(fast.saved * 12)}
                  </GradientText>
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  {usd(fast.rawCost * 12)} uncompressed → {usd(fast.cost * 12)} with it, on {m.name} at {tokensShort(tokens)} tokens a month.
                </div>
              </div>
            </div>
            <div className="card card-pad" style={{ background: "rgba(255,255,255,.88)", backdropFilter: "blur(6px)", alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }} className="small">
                <span>Annual saving</span>
                <span>monthly · keep</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {rows.map((r) => (
                  <div key={r.a.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                      <span>
                        {label(r.a.name)}
                        {r.a.reference && <span className="faint"> · baseline</span>}
                      </span>
                      <span className={`tnum ${r.saved < 0 ? "red" : ""}`}>{usd(r.saved * 12)}</span>
                    </div>
                    <div style={{ position: "relative", height: 8, marginTop: 5, borderRadius: 3, background: "var(--paper-2)" }}>
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: r.saved >= 0 ? 0 : undefined,
                          right: r.saved < 0 ? "auto" : undefined,
                          width: `${(Math.abs(r.saved) / max) * 100}%`,
                          borderRadius: 3,
                          background: r.saved < 0 ? "#b42318" : r.a.name === "supercompress-fast" ? "#0566ff" : r.a.reference ? "#b9b3a9" : "#7aa7ff",
                          transition: "width .6s cubic-bezier(.22,1,.36,1)",
                        }}
                      />
                    </div>
                    <div className="faint tnum" style={{ fontSize: 11.5, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                      <span>{usd(r.saved)}/mo</span>
                      <span>pays for {(r.keep * 100).toFixed(1)}% of tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </LinearFlow>
      <p className="small" style={{ marginTop: 16, maxWidth: 820 }}>
        Per tool token over its life: (input × 1.25 + re-reads × cache read) / 1M. Compressor fees, latency and the price of the agent’s extra turns after a miss are not counted. BM25 is shown because it is free: it beats every product on pure dollars here,
        at {Math.round(armBy("bm25-35").summary.primary.p * 100)}% recall. Whether a {Math.round((armBy("supercompress-fast").summary.primary.p - armBy("bm25-35").summary.primary.p) * 100)}-point recall gap is worth the difference depends on what a wrong answer costs you.
      </p>
    </Section>
  );
}
