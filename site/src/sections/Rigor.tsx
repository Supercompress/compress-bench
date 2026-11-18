import { useState } from "react";
import { Section } from "@/components/Section";
import { DitheredImage } from "@/components/brand/DitheredImage";
import { armBy, bench, label, meta, num, pct, ranked } from "@/data/bench";

const SEED_ARMS = ["supercompress-fast", "probe0-tool-compact", "bm25-35", "bm25-10", "truncate-head-35"];

export function Seeds() {
  return (
    <Section
      id="seeds"
      n="07"
      kicker="Seeds"
      title={
        <>
          Three seeds, <span className="blue">same story</span>
        </>
      }
      lede={
        <>
          A benchmark its author tunes against is worthless. The corpus generator was developed on the dev seed, scored once on the held-out test seed, then re-run on a fresh seed drawn from the clock after the code was frozen. Local arms ran all{" "}
          {meta.n_corpus} tasks of each split.
        </>
      }
    >
      <div className="card scroll-x" data-reveal>
        <table className="table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>arm</th>
              {bench.seeds.map((s) => (
                <th key={s.split}>
                  {s.split} <span className="mono">· {s.seed}</span>
                </th>
              ))}
              <th>spread</th>
            </tr>
          </thead>
          <tbody>
            {SEED_ARMS.map((n) => {
              const vals = bench.seeds.map((s) => s.arms[n]);
              const ps = vals.map((v) => v.primary);
              const spread = Math.max(...ps) - Math.min(...ps);
              return (
                <tr key={n}>
                  <td>
                    {label(n)}
                    <div className="mono faint">{n}</div>
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} className="tnum">
                      <span style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{pct(v.primary)}</span>
                      <div className="small">
                        cut {pct(v.cut)} · adj {pct(v.eff_cut)}
                      </div>
                    </td>
                  ))}
                  <td className="tnum">
                    <span className={spread < 0.05 ? "green" : ""}>±{((spread / 2) * 100).toFixed(1)} pp</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 14 }}>
        Remote and Python arms were only run on the test sample: they are slow, metered, or both. The spread column is half the range of primary recall across the three seeds.
      </p>
    </Section>
  );
}

const FAITH = ["supercompress-fast", "probe0-tool-compact", "supercompress-live", "headroom-kompress", "litellm-compression", "caveman-cloud"];

export function Method() {
  return (
    <Section
      id="method"
      n="08"
      kicker="Method"
      title={
        <>
          How it’s built to be <span className="blue">hard to game</span>
        </>
      }
      lede="SuperCompress wrote this benchmark, so it leans on controls a skeptic can check rather than on trust. Everything below is in the repo and re-runs offline."
    >
      <div className="grid-3">
        {[
          ["Seeded corpus", `mulberry32-seeded generators write ${meta.families.length} families × 3 sizes × 3 needle positions × 2 query styles. Same seed, same bytes: the corpus hash is ${meta.corpus_sha.slice(0, 12)}.`, "img/usecase-coding-agents.webp"],
          ["Near-miss distractors", "Most families plant lookalikes near the answer, such as a similar failing test or a different exception from another file. How often a compressor keeps a lookalike is reported per arm.", "img/usecase-documents.webp"],
          ["Paraphrased queries", "Most tasks are asked twice: once in the evidence’s own words, once paraphrased. Paraphrase is where lexical matching breaks, and it is how real agents ask.", "img/usecase-rag.webp"],
        ].map(([t, d, img]) => (
          <div key={t} className="card" style={{ overflow: "hidden" }} data-reveal>
            <DitheredImage src={img} alt="" width={260} />
            <div className="card-pad" style={{ display: "grid", gap: 8 }}>
              <div className="h3" style={{ fontSize: 18 }}>
                {t}
              </div>
              <p className="small" style={{ margin: 0 }}>
                {d}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 20 }}>
        {[
          ["Exact containment", "A pass means every primary evidence string appears verbatim in the output (case and whitespace normalised). No LLM judge, no fuzzy match."],
          ["Paired significance", `Every product sees the same tasks, so arms are compared pair by pair with exact McNemar tests, Holm-corrected. Recall has 95% Wilson intervals; cuts have ${num(meta.bootstrap_B)}-sample bootstrap intervals.`],
          ["The BM25 frontier", "A free lexical ranker at seven budgets. Each product is judged against BM25 at its own cut, so a big cut can’t hide a low recall."],
          ["Faithfulness", "Each output line is checked against the input. Compressors that rewrite or summarise lose fidelity, and their evidence stops matching."],
        ].map(([t, d]) => (
          <div key={t} className="card card-pad" data-reveal>
            <div className="h3" style={{ fontSize: 18, marginBottom: 6 }}>
              {t}
            </div>
            <p className="small" style={{ margin: 0 }}>
              {d}
            </p>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 40, alignItems: "start" }}>
        <div data-reveal>
          <h3 className="h3" style={{ marginBottom: 12 }}>
            Pairwise tests
          </h3>
          <div className="card scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>arm vs next</th>
                  <th>only A</th>
                  <th>only B</th>
                  <th>p (Holm)</th>
                </tr>
              </thead>
              <tbody>
                {bench.tiers.comparisons.map((c) => (
                  <tr key={`${c.arm}-${c.vs}`}>
                    <td style={{ fontSize: 13 }}>
                      {label(c.arm)} <span className="faint">vs</span> {label(c.vs)}
                    </td>
                    <td className="tnum">{c.aOnly}</td>
                    <td className="tnum">{c.bOnly}</td>
                    <td className={`tnum ${c.p_holm < 0.05 ? "blue" : "faint"}`}>{c.p_holm < 0.001 ? "<0.001" : c.p_holm.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small">“Only A” counts tasks where the first arm kept the evidence and the second didn’t. Blue p-values are significant at 0.05 after correction and start a new tier.</p>
        </div>
        <div data-reveal>
          <h3 className="h3" style={{ marginBottom: 12 }}>
            Faithfulness
          </h3>
          <div className="card scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>arm</th>
                  <th>line fidelity</th>
                  <th>novel lines</th>
                  <th>reordered</th>
                  <th>unchanged</th>
                </tr>
              </thead>
              <tbody>
                {FAITH.map((n) => {
                  const s = armBy(n).summary;
                  return (
                    <tr key={n}>
                      <td style={{ fontSize: 13 }}>{label(n)}</td>
                      <td className={`tnum ${s.fidelity != null && s.fidelity < 0.95 ? "red" : ""}`}>{s.fidelity == null ? "—" : pct(s.fidelity)}</td>
                      <td className="tnum">
                        {num(s.novel_lines)}
                        <span className="faint"> / {s.tasks_with_novel} tasks</span>
                      </td>
                      <td className="tnum">{s.out_of_order}</td>
                      <td className="tnum">{s.untouched}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small">Fidelity is the share of output lines found verbatim in the input. Novel lines were written by the compressor; reordered counts tasks whose kept lines changed order; unchanged counts inputs returned as-is.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 40 }} data-reveal>
        <h3 className="h3" style={{ marginBottom: 12 }}>
          Threats to validity
        </h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
          <li>The corpus is synthetic. It is shaped like real agent tool output, but it is generated, and a compressor tuned on real traffic may behave differently.</li>
          <li>SuperCompress built both the benchmark and two of the arms. The dev/test/fresh seed protocol, the free BM25 bar and the published code are the defence; run it yourself.</li>
          <li>Remote and Python arms ran on an {meta.n_sample}-task stratified sample. Their intervals are wider, and pairwise tests use only the tasks every arm saw.</li>
          <li>Recall measures whether evidence survived, not whether an agent then answers correctly. Downstream answer accuracy is not scored.</li>
          <li>
            {label("supercompress-live")} rejected {armBy("supercompress-live").summary.errors} inputs over its 120k-character limit; those count as misses. {label("caveman-cloud")} takes no query and returned every input unchanged.
          </li>
          <li>Probe0 has no public API; its arm is a port of the CLI 0.1.19 compaction logic, pinned by file hash. Headroom and LiteLLM ran through their own Python packages.</li>
        </ul>
      </div>
    </Section>
  );
}

export function Misses() {
  const products = ranked.filter((a) => a.misses.length);
  const [arm, setArm] = useState(products[0]?.name ?? "supercompress-fast");
  const a = armBy(arm);
  return (
    <Section
      id="misses"
      n="09"
      kicker="Misses"
      title={
        <>
          Every miss, <span className="blue">in the open</span>
        </>
      }
      lede="Each task a product failed, with the evidence it dropped. Including ours."
    >
      <div className="seg" role="group" aria-label="Product" style={{ marginBottom: 16, flexWrap: "wrap" }} data-reveal>
        {products.map((p) => (
          <button key={p.name} aria-pressed={p.name === arm} onClick={() => setArm(p.name)}>
            {label(p.name)} · {p.misses.length}
          </button>
        ))}
      </div>
      <div className="card scroll-x" data-reveal style={{ maxHeight: 520, overflowY: "auto" }}>
        <table className="table">
          <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
            <tr>
              <th>task</th>
              <th>dropped evidence</th>
              <th>cut</th>
            </tr>
          </thead>
          <tbody>
            {a.misses.map((m) => (
              <tr key={m.id}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {m.id}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {m.error ? <span className="red">error: {m.error}</span> : m.missing.join(" · ")}
                </td>
                <td className="tnum">{pct(m.cut, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
