import { useState } from "react";
import { FillPattern } from "@/lib/dither";
import { Section } from "@/components/Section";
import { arms, frontier, label, pct, pp, ranked } from "@/data/bench";

const REF_OFFSET: Record<string, [number, number, "start" | "end"]> = {
  "truncate-head-35": [9, -6, "start"],
  "truncate-tail-35": [9, 14, "start"],
  "random-lines-35": [-9, 4, "end"],
};

const W = 920;
const H = 540;
const M = { l: 56, r: 24, t: 20, b: 48 };
const X = (cut: number) => M.l + Math.max(0, cut) * (W - M.l - M.r);
const Y = (r: number) => M.t + (1 - r) * (H - M.t - M.b);

const BLUE = "#0566ff";
const COLORS: Record<string, string> = {
  "supercompress-fast": BLUE,
  "supercompress-live": "#5d8fe8",
  "probe0-tool-compact": "#0f1729",
  "caveman-cloud": "#8a909c",
  "headroom-kompress": "#b42318",
  "litellm-compression": "#b26a00",
};
const OFFSET: Record<string, [number, number, "start" | "end"]> = {
  "supercompress-fast": [12, -10, "start"],
  "caveman-cloud": [12, 16, "start"],
  "probe0-tool-compact": [-12, 18, "end"],
  "supercompress-live": [12, -8, "start"],
  "headroom-kompress": [12, -8, "start"],
  "litellm-compression": [12, 16, "start"],
};

export function Frontier() {
  const [hover, setHover] = useState<string | null>(null);
  const pts = frontier.map((a) => [X(a.summary.cut.est), Y(a.summary.primary.p)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${Y(0)} L${pts[0][0]},${Y(0)} Z`;
  const refs = arms.filter((a) => a.reference && a.frontier == null && a.name !== "raw");
  const h = hover ? arms.find((a) => a.name === hover)! : null;
  return (
    <Section
      id="frontier"
      n="04"
      kicker="Frontier"
      title={
        <>
          The BM25 frontier is the <span className="blue">bar to clear</span>
        </>
      }
      lede="BM25 keeps the lines that share the most words with the question. Run at seven budgets, it traces how much recall a dumb lexical ranker buys at each cut. A product above the dotted area keeps more answers than BM25 at the same cut; below it, a free baseline does better."
    >
      <div className="card" style={{ padding: "18px 18px 8px" }} data-reveal>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Recall against token cut for every arm, with the BM25 frontier">
          <defs>
            <FillPattern id="fr-area" fill="dotted" color={BLUE} cell={3} />
          </defs>
          <g className="grid">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} />
                <text x={M.l - 10} y={Y(v) + 4} textAnchor="end">
                  {v * 100}%
                </text>
                <line y1={M.t} y2={H - M.b} x1={X(v)} x2={X(v)} />
                <text x={X(v)} y={H - M.b + 20} textAnchor="middle">
                  {v * 100}%
                </text>
              </g>
            ))}
          </g>
          <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle">
            tokens cut →
          </text>
          <text x={14} y={(H - M.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(H - M.b) / 2})`}>
            answer kept (primary recall) →
          </text>
          <path d={area} fill="url(#fr-area)" opacity={0.3} />
          <path d={line} fill="none" stroke={BLUE} strokeWidth={1.5} strokeDasharray="4 4" />
          {frontier.map((a, i) => (
            <g key={a.name}>
              <rect x={pts[i][0] - 3.5} y={pts[i][1] - 3.5} width={7} height={7} fill="#fff" stroke={BLUE} strokeWidth={1.5} />
              <text x={pts[i][0]} y={pts[i][1] - 10} textAnchor="middle" style={{ fontSize: 10 }}>
                {Math.round(a.frontier! * 100)}%
              </text>
            </g>
          ))}
          {refs.map((a) => (
            <g key={a.name} opacity={hover && hover !== a.name ? 0.3 : 1} onMouseEnter={() => setHover(a.name)} onMouseLeave={() => setHover(null)}>
              <circle cx={X(a.summary.cut.est)} cy={Y(a.summary.primary.p)} r={5} fill="#fff" stroke="#8a909c" strokeWidth={1.5} />
              {(() => {
                // Head, tail and random sit within a few px of each other; fan their labels out.
                const [dx, dy, anchor] = REF_OFFSET[a.name] ?? [9, 4, "start"];
                return (
                  <text x={X(a.summary.cut.est) + dx} y={Y(a.summary.primary.p) + dy} textAnchor={anchor} style={{ fontSize: 10 }}>
                    {label(a.name)}
                  </text>
                );
              })()}
            </g>
          ))}
          {ranked.map((a) => {
            const x = X(a.summary.cut.est);
            const y = Y(a.summary.primary.p);
            const c = COLORS[a.name] ?? "#0f1729";
            const [dx, dy, anchor] = OFFSET[a.name] ?? [12, -8, "start"];
            return (
              <g key={a.name} opacity={hover && hover !== a.name ? 0.25 : 1} style={{ cursor: "pointer", transition: "opacity .2s" }} onMouseEnter={() => setHover(a.name)} onMouseLeave={() => setHover(null)}>
                <line x1={x} x2={x} y1={Y(a.summary.primary.lo)} y2={Y(a.summary.primary.hi)} stroke={c} strokeWidth={1.5} />
                <line x1={x - 5} x2={x + 5} y1={Y(a.summary.primary.lo)} y2={Y(a.summary.primary.lo)} stroke={c} strokeWidth={1.5} />
                <line x1={x - 5} x2={x + 5} y1={Y(a.summary.primary.hi)} y2={Y(a.summary.primary.hi)} stroke={c} strokeWidth={1.5} />
                <circle cx={x} cy={y} r={a.name === "supercompress-fast" ? 8 : 6.5} fill={c} stroke="#fff" strokeWidth={2} />
                <text x={x + dx} y={y + dy} textAnchor={anchor} style={{ fontSize: 12.5, fill: "var(--ink)", fontFamily: "Geist Variable, sans-serif" }}>
                  {label(a.name)}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ minHeight: 44, padding: "6px 8px 10px" }} className="small" aria-live="polite">
          {h ? (
            <>
              <b style={{ color: "var(--ink)" }}>{label(h.name)}</b> · cut {pct(h.summary.cut.est)} · recall {pct(h.summary.primary.p)} ({pct(h.summary.primary.lo)}–{pct(h.summary.primary.hi)})
              {h.frontier_lift ? ` · ${pp(h.frontier_lift.lift)} vs BM25 at the same cut${h.frontier_lift.clamped ? " (nearest frontier point)" : ""}` : ""}
            </>
          ) : (
            "Hover a point. Whiskers are 95% Wilson intervals on recall; squares are BM25 at 5–90% budgets."
          )}
        </div>
      </div>
      <div className="grid-3" style={{ marginTop: 20 }}>
        {ranked
          .filter((a) => a.frontier_lift)
          .map((a) => (
            <div key={a.name} className="card card-pad" data-reveal style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <span>{label(a.name)}</span>
              <span className={`tnum ${a.frontier_lift!.lift >= 0 ? "green" : "red"}`} style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                {pp(a.frontier_lift!.lift)}
              </span>
            </div>
          ))}
      </div>
      <p className="small" style={{ marginTop: 14 }}>
        Lift over BM25 at the product’s own cut. Caveman’s +19.0 pp is the recall of passing input through untouched, measured against BM25’s best point; it comes with a 0% cut.
      </p>
    </Section>
  );
}
