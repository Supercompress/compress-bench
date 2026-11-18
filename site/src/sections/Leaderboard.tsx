import { useState } from "react";
import { fillStyle } from "@/lib/dither";
import { Section } from "@/components/Section";
import { NOTE, armBy, bench, label, meta, ms, pct, pp, ranked } from "@/data/bench";
import type { Arm } from "@/data/bench";

const REFS = ["bm25-35", "truncate-head-35", "random-lines-35", "raw"];

function Bar({ v, lo, hi, color, text }: { v: number; lo?: number; hi?: number; color: string; text: string }) {
  const w = Math.max(0, Math.min(1, v));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 10, alignItems: "center" }}>
    <div className="bar" aria-label={text}>
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${w * 100}%`, transition: "width .9s cubic-bezier(.22,1,.36,1)", ...fillStyle("gradient", { color, edge: "left", length: 260, from: 1, to: 0.4, cell: 2 }) }} />
      {lo != null && hi != null && (
        <div title={`95% CI ${pct(lo)} – ${pct(hi)}`} style={{ position: "absolute", top: "50%", left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, height: 10, transform: "translateY(-50%)", borderLeft: "1.5px solid var(--ink)", borderRight: "1.5px solid var(--ink)" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1.5px solid var(--ink)" }} />
        </div>
      )}
    </div>
      <span className="mono tnum" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

function Row({ a, tier, full, open, onToggle }: { a: Arm; tier?: number; full: boolean; open: boolean; onToggle: () => void }) {
  const s = a.summary;
  const useFull = full && a.full;
  const recall = useFull ? a.full!.primary : s.primary.p;
  const cut = useFull ? a.full!.cut : s.cut.est;
  const eff = useFull ? a.full!.eff_cut : s.eff_cut.est;
  return (
    <div className="card lb-row" data-open={open} onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())} aria-expanded={open} data-reveal>
      <div className="lb-tier" data-tier={tier ?? "ref"} title={tier ? `Tier ${tier}` : "Reference arm"}>
        {tier ?? "·"}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, letterSpacing: "-0.01em" }}>{label(a.name)}</div>
        <div className="mono faint" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {a.name} · {a.type}
          {full && !a.full ? " · sample only" : ""}
        </div>
      </div>
      <div className="bars" style={{ display: "grid", gap: 6 }}>
        <Bar v={recall} lo={useFull ? undefined : s.primary.lo} hi={useFull ? undefined : s.primary.hi} color="#0566ff" text={`${pct(recall)} kept`} />
        <Bar v={cut} color="#b9b3a9" text={`${pct(cut)} cut`} />
      </div>
      <div className="lb-eff">
        <div style={{ fontSize: 26, letterSpacing: "-0.03em" }} className={`tnum ${eff < 0 ? "red" : ""}`}>
          {pct(eff)}
        </div>
        <div className="small">recovery-adjusted cut</div>
      </div>
      <div className="tnum small" style={{ textAlign: "right" }}>
        {ms(s.ms_p50)}
        <div className="faint">p50</div>
      </div>
      {open && (
        <div className="lb-detail" onClick={(e) => e.stopPropagation()}>
          <div>
            <b className="tnum">{pct(s.primary.p)}</b>
            Primary recall, 95% Wilson CI {pct(s.primary.lo)} – {pct(s.primary.hi)}
          </div>
          <div>
            <b className="tnum">{pct(s.all)}</b>
            All evidence strings kept, primary and secondary
          </div>
          <div>
            <b className="tnum">{a.frontier_lift ? pp(a.frontier_lift.lift) : "—"}</b>
            Recall versus BM25 at the same cut{a.frontier_lift?.clamped ? " (cut outside BM25’s range; nearest point)" : ""}
          </div>
          <div>
            <b className="tnum">{s.fidelity == null ? "—" : pct(s.fidelity)}</b>
            Line fidelity: output lines found verbatim in the input
          </div>
          <div>
            <b className="tnum">{s.errors}</b>
            Errors out of {s.n}
          </div>
          <div>
            <b className="tnum">{s.untouched}</b>
            Inputs returned unchanged
          </div>
          <div>
            <b className="tnum">{s.distractors.toFixed(2)}</b>
            Near-miss distractors kept per task, on average
          </div>
          <div>
            <b className="tnum">{ms(s.ms_p95)}</b>
            p95 latency
          </div>
          {NOTE[a.name] && <p style={{ gridColumn: "1/-1", margin: 0 }} className="muted">{NOTE[a.name]}</p>}
          <p className="small" style={{ gridColumn: "1/-1", margin: 0 }}>
            {a.description}
          </p>
        </div>
      )}
    </div>
  );
}

export function Leaderboard() {
  const [full, setFull] = useState(false);
  const [refs, setRefs] = useState(true);
  const [open, setOpen] = useState<string | null>("supercompress-fast");
  const rows: { a: Arm; tier?: number }[] = [...ranked.map((r) => ({ a: r as Arm, tier: r.tier })), ...(refs ? REFS.map((n) => ({ a: armBy(n) })) : [])];
  return (
    <Section
      id="leaderboard"
      n="02"
      kicker="Leaderboard"
      title={
        <>
          Who keeps the answer, and <span className="blue">what it costs</span> in tokens
        </>
      }
      lede={
        <>
          Held-out test split, {meta.n_sample} tasks stratified over all {meta.n_corpus}, every compressor at a 35% budget where it takes one. Tiers come from paired McNemar tests with Holm correction: arms in the same tier are not significantly
          different. Click a row for the detail.
        </>
      }
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }} data-reveal>
        <div className="seg" role="group" aria-label="Task set">
          <button aria-pressed={!full} onClick={() => setFull(false)}>
            Test sample · n={meta.n_sample}
          </button>
          <button aria-pressed={full} onClick={() => setFull(true)}>
            Full corpus · n={meta.n_corpus}
          </button>
        </div>
        <div className="seg" role="group" aria-label="Reference arms">
          <button aria-pressed={refs} onClick={() => setRefs(true)}>
            With baselines
          </button>
          <button aria-pressed={!refs} onClick={() => setRefs(false)}>
            Products only
          </button>
        </div>
        <span className="legend" style={{ marginLeft: "auto" }}>
          <span>
            <i style={{ background: "#0566ff" }} />
            answer kept (primary recall)
          </span>
          <span>
            <i style={{ background: "#b9b3a9" }} />
            tokens cut
          </span>
          <span>├─┤ 95% CI</span>
        </span>
      </div>
      <div className="lb">
        {rows.map(({ a, tier }) => (
          <Row key={a.name} a={a} tier={tier} full={full} open={open === a.name} onToggle={() => setOpen(open === a.name ? null : a.name)} />
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 28 }} data-reveal>
        <div className="card card-pad small">
          <div className="h3" style={{ fontSize: 17, marginBottom: 8, color: "var(--ink)" }}>
            Recovery-adjusted cut
          </div>
          A compressor that drops the answer costs a re-read: the agent fetches the raw input again. The adjusted cut charges every miss the full input on top of the compressed one, so a big cut with a poor recall can save less than nothing.
          Headroom’s is negative for exactly this reason.
        </div>
        <div className="card card-pad small">
          <div className="h3" style={{ fontSize: 17, marginBottom: 8, color: "var(--ink)" }}>
            Why Caveman ties for first
          </div>
          {NOTE["caveman-cloud"]} Keeping everything is a 100% recall by definition, which is why recall is never read alone. For scale, BM25 at the same budget gets{" "}
          {pct(armBy("bm25-35").summary.primary.p)} recall with a {pct(armBy("bm25-35").summary.cut.est)} cut. {bench.skipped.length ? `Skipped: ${bench.skipped.map((s) => s.name).join(", ")}.` : ""}
        </div>
      </div>
    </Section>
  );
}
