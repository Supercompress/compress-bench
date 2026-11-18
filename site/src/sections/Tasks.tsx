import { useMemo, useState } from "react";
import { Section } from "@/components/Section";
import { armBy, bench, label, meta, pct } from "@/data/bench";

const g = bench.grid;
const COLS = ["supercompress-fast", "caveman-cloud", "probe0-tool-compact", "supercompress-live", "headroom-kompress", "litellm-compression", "bm25-35"];

const heat = (v: number) => {
  const a = Math.max(0, Math.min(1, v));
  return { background: `rgba(5,102,255,${0.06 + 0.88 * a ** 1.6})`, color: a > 0.62 ? "#fff" : "var(--ink)" };
};

export function TaskGrid() {
  const [hover, setHover] = useState<{ arm: number; task: number } | null>(null);
  const order = useMemo(() => g.tasks.map((t, i) => ({ t, i })).sort((a, b) => meta.families.indexOf(a.t.family) - meta.families.indexOf(b.t.family) || a.t.tokens - b.t.tokens), []);
  const fams = useMemo(() => {
    const out: { f: string; n: number }[] = [];
    for (const { t } of order) {
      const last = out[out.length - 1];
      if (last && last.f === t.family) last.n++;
      else out.push({ f: t.family, n: 1 });
    }
    return out;
  }, [order]);
  const ht = hover ? g.tasks[hover.task] : null;
  return (
    <Section
      id="tasks"
      n="04"
      kicker="Every task"
      title={
        <>
          {g.tasks.length} tasks × {g.arms.length} arms, <span className="blue">one dot each</span>
        </>
      }
      lede="Averages hide where a compressor breaks. Each column is one held-out task, grouped by family and sorted by size; each row is one arm. Blue kept the primary evidence, a hollow dot lost it, amber errored."
      wide
    >
      <div className="card card-pad scroll-x" data-reveal>
        <div style={{ minWidth: 860 }}>
          <div style={{ display: "grid", gridTemplateColumns: `170px repeat(${g.tasks.length}, 1fr)`, gap: 3, alignItems: "center" }} onMouseLeave={() => setHover(null)}>
            <div />
            {fams.map((f) => (
              <div key={f.f} className="mono faint" style={{ gridColumn: `span ${f.n}`, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", borderBottom: "1px solid var(--line)", paddingBottom: 4 }} title={f.f}>
                {f.f}
              </div>
            ))}
            {g.arms.map((arm, ai) => (
              <Row key={arm} arm={arm} ai={ai} order={order.map((o) => o.i)} hover={hover} setHover={setHover} />
            ))}
          </div>
        </div>
        <div style={{ minHeight: 40, marginTop: 14, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }} className="small" aria-live="polite">
          {ht && hover ? (
            <>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {ht.id}
              </span>
              <span>{ht.tokens.toLocaleString()} tokens</span>
              <span>
                {label(g.arms[hover.arm])}: {g.hit[hover.arm][hover.task] === 2 ? "error" : g.hit[hover.arm][hover.task] ? "kept" : "lost"}, cut {pct(g.cut[hover.arm][hover.task], 0)}
              </span>
              <span>
                kept by {g.arms.filter((_, ai) => g.hit[ai][hover.task] === 1).length} of {g.arms.length} arms
              </span>
            </>
          ) : (
            <span className="legend">
              <span>
                <i style={{ background: "#0566ff" }} />
                evidence kept
              </span>
              <span>
                <i style={{ border: "1.5px solid #b9b3a9" }} />
                lost
              </span>
              <span>
                <i style={{ background: "#e8a33d" }} />
                error
              </span>
              <span>Hover any dot for the task.</span>
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}

function Row({ arm, ai, order, hover, setHover }: { arm: string; ai: number; order: number[]; hover: { arm: number; task: number } | null; setHover: (h: { arm: number; task: number }) => void }) {
  const hits = g.hit[ai];
  const k = hits.filter((h) => h === 1).length;
  return (
    <>
      <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", paddingRight: 10, gap: 8 }}>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label(arm)}</span>
        <span className="mono faint tnum">{k}</span>
      </div>
      {order.map((ti) => {
        const h = hits[ti];
        const on = hover && (hover.task === ti || hover.arm === ai);
        return (
          <div
            key={ti}
            onMouseEnter={() => setHover({ arm: ai, task: ti })}
            style={{
              aspectRatio: "1",
              borderRadius: 2,
              background: h === 1 ? "#0566ff" : h === 2 ? "#e8a33d" : "transparent",
              boxShadow: h === 0 ? "inset 0 0 0 1.5px #c9c3b9" : undefined,
              opacity: hover && !on ? 0.35 : 1,
              transition: "opacity .15s",
            }}
          />
        );
      })}
    </>
  );
}

export function Breakdown() {
  const [dim, setDim] = useState<"by_position" | "by_size" | "by_style">("by_position");
  const keys = Object.keys(armBy("supercompress-fast")[dim]);
  return (
    <Section
      id="families"
      n="05"
      kicker="Where it breaks"
      title={
        <>
          Recall by family, position, size and <span className="blue">phrasing</span>
        </>
      }
      lede="Fourteen families cover what agents actually read: CI logs, tracebacks, compiler errors, grep and find output, service logs, multi-hop joins, diffs, JSON, SQL, source, docs and chat. Each cell is the share of tasks whose primary evidence survived."
      wide
    >
      <div className="card card-pad scroll-x" data-reveal>
        <table className="heat" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>family</th>
              {COLS.map((c) => (
                <th key={c} style={{ textAlign: "center", fontSize: 11.5 }}>
                  {label(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meta.family_stats.map((f) => (
              <tr key={f.name}>
                <th title={f.description}>
                  <span className="mono" style={{ color: "var(--ink)" }}>
                    {f.name}
                  </span>
                  <div className="faint" style={{ fontSize: 11, maxWidth: 230, whiteSpace: "normal" }}>
                    {f.description}
                  </div>
                </th>
                {COLS.map((c) => {
                  const v = armBy(c).by_family[f.name];
                  return (
                    <td key={c} style={v ? heat(v.primary) : undefined} title={v ? `${label(c)} · ${f.name}: ${pct(v.primary)} of ${v.n}, cut ${pct(v.cut)}` : ""}>
                      {v ? Math.round(v.primary * 100) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 28 }} data-reveal>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <div className="seg" role="group" aria-label="Breakdown">
            {(
              [
                ["by_position", "Needle position"],
                ["by_size", "Input size"],
                ["by_style", "Query style"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} aria-pressed={dim === k} onClick={() => setDim(k)}>
                {l}
              </button>
            ))}
          </div>
          <span className="small">
            {dim === "by_position" && "Where the evidence sits in the input. Truncation lives or dies by this."}
            {dim === "by_size" && "Small ≈ 0.6–2k tokens, medium ≈ 5–15k, large up to 56k."}
            {dim === "by_style" && "Lexical queries reuse the evidence’s words; paraphrased ones don’t, which is where word-matching breaks."}
          </span>
        </div>
        <div className="grid-3">
          {keys.map((k) => (
            <div key={k} className="card card-pad">
              <div className="mono" style={{ marginBottom: 12 }}>
                {k}
              </div>
              <div style={{ display: "grid", gap: 7 }}>
                {[...COLS, "truncate-head-35"].map((c) => {
                  const v = armBy(c)[dim][k];
                  return (
                    <div key={c} style={{ display: "grid", gridTemplateColumns: "118px 1fr 44px", gap: 8, alignItems: "center", fontSize: 12 }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} className={c === "supercompress-fast" ? "" : "muted"}>
                        {label(c)}
                      </span>
                      <div style={{ height: 8, borderRadius: 3, background: "var(--paper-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(v?.primary ?? 0) * 100}%`, background: c === "supercompress-fast" ? "#0566ff" : c.startsWith("bm25") || c.startsWith("trunc") ? "#b9b3a9" : "#7aa7ff", transition: "width .7s cubic-bezier(.22,1,.36,1)" }} />
                      </div>
                      <span className="mono tnum" style={{ textAlign: "right" }}>
                        {v ? Math.round(v.primary * 100) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
