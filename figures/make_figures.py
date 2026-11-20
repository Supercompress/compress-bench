"""Publication figures for compress-bench.

Reads site/src/data/bench.json (written by `npm run site:data`) and writes each
figure as SVG, PDF and PNG (2x) into figures/out/. Also copies SVG + PNG into
site/public/figures/ so the website can embed and offer them for download.

    python3 figures/make_figures.py

Needs matplotlib >= 3.8 and numpy. Fonts (Geist, OFL) ship in figures/fonts/.
"""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "figures" / "out"
SITE = ROOT / "site" / "public" / "figures"
bench = json.loads((ROOT / "site" / "src" / "data" / "bench.json").read_text())
meta = bench["meta"]
ARMS = {a["name"]: a for a in bench["arms"]}

# ------------------------------------------------------------------ style
for f in (ROOT / "figures" / "fonts").glob("*.ttf"):
    font_manager.fontManager.addfont(str(f))

INK = "#0f1729"
MUTED = "#4b5567"
FAINT = "#9aa1ac"
RULE = "#e3e0da"
BLUE = "#0566ff"
BLUE_2 = "#7fa9ff"
RED = "#b42318"
GREEN = "#0a7d4f"
PAPER = "#ffffff"
PAPER_WASH = "#f7f5f2"

plt.rcParams.update(
    {
        "font.family": "Geist",
        "font.size": 9.5,
        "axes.edgecolor": INK,
        "axes.labelcolor": INK,
        "axes.linewidth": 0.8,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.titlesize": 12,
        "axes.titleweight": "regular",
        "axes.titlelocation": "left",
        "axes.titlepad": 12,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.major.width": 0.8,
        "ytick.major.width": 0.8,
        "xtick.major.size": 3.5,
        "ytick.major.size": 3.5,
        "legend.frameon": False,
        "figure.facecolor": PAPER,
        "axes.facecolor": PAPER,
        "savefig.facecolor": PAPER,
        "svg.fonttype": "none",  # keep text as text in SVG
        "pdf.fonttype": 42,
    }
)

LABEL = {
    "supercompress-fast": "SuperCompress Fast",
    "supercompress-live": "SuperCompress API",
    "probe0-tool-compact": "Probe0",
    "caveman-cloud": "Caveman Cloud",
    "headroom-kompress": "Headroom Kompress",
    "litellm-compression": "LiteLLM compression",
    "raw": "No compression",
    "truncate-head-35": "head (35%)",
    "truncate-tail-35": "tail (35%)",
    "random-lines-35": "random lines (35%)",
}


def label(n: str) -> str:
    if n in LABEL:
        return LABEL[n]
    if n.startswith("bm25-"):
        return f"BM25 ({n.split('-')[1]}%)"
    return n


PRODUCTS = [
    "supercompress-fast",
    "caveman-cloud",
    "probe0-tool-compact",
    "supercompress-live",
    "headroom-kompress",
    "litellm-compression",
]
# Ours in blue, everyone else in neutral ink with its own marker: readable in
# grayscale print and does not lean on hue to tell competitors apart.
STYLE = {
    "supercompress-fast": dict(c=BLUE, m="o"),
    "supercompress-live": dict(c=BLUE_2, m="o"),
    "probe0-tool-compact": dict(c=INK, m="D"),
    "caveman-cloud": dict(c="#6b7280", m="s"),
    "headroom-kompress": dict(c="#374151", m="^"),
    "litellm-compression": dict(c="#4b5563", m="v"),
}
TIER = {t["arm"]: t["tier"] for t in bench["tiers"]["order"]}

SOURCE = (
    f"compress-bench · {meta['split']} split, seed {meta['seed']} · n = {meta['n_sample']} held-out tasks "
    f"(stratified from {meta['n_corpus']}) · tokenizer {meta['tokenizer']} · bench {meta['bench_sha']}"
)


def wilson(k: float, n: int, z: float = 1.959964) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def pct_axis(ax, axis="y"):
    fmt = matplotlib.ticker.PercentFormatter(1.0, decimals=0)
    (ax.yaxis if axis == "y" else ax.xaxis).set_major_formatter(fmt)


def finish(fig, name: str, title: str, subtitle: str, source: str = SOURCE):
    import textwrap

    h = fig.get_size_inches()[1]
    fig.text(0.012, 1 - 0.1 / h, title, ha="left", va="top", fontsize=14, color=INK)
    fig.text(0.012, 1 - 0.42 / h, textwrap.fill(subtitle, 150), ha="left", va="top", fontsize=9.5, color=MUTED,
             linespacing=1.45)
    fig.text(0.012, 0.012, source, ha="left", va="bottom", fontsize=7, color=FAINT, family="Geist Mono")
    OUT.mkdir(parents=True, exist_ok=True)
    SITE.mkdir(parents=True, exist_ok=True)
    for ext in ("svg", "pdf", "png"):
        kw = {"dpi": 220} if ext == "png" else {}
        fig.savefig(OUT / f"{name}.{ext}", **kw)
    for ext in ("svg", "png", "pdf"):
        shutil.copy(OUT / f"{name}.{ext}", SITE / f"{name}.{ext}")
    plt.close(fig)
    print("wrote", name)


def grid_y(ax):
    ax.grid(axis="y", color=RULE, lw=0.7)
    ax.set_axisbelow(True)


# ------------------------------------------------------------------ fig 1: recall vs cut frontier
def fig_frontier():
    fig = plt.figure(figsize=(8.6, 6.0))
    ax = fig.add_axes([0.085, 0.12, 0.88, 0.74])
    bm = sorted([a for a in bench["arms"] if a["frontier"] is not None], key=lambda a: a["summary"]["cut"]["est"])
    xs = [a["summary"]["cut"]["est"] for a in bm]
    ys = [a["summary"]["primary"]["p"] for a in bm]
    # Region a free lexical ranker already reaches: below the BM25 envelope.
    ax.fill_between(xs, 0, ys, color=BLUE, alpha=0.06, lw=0, zorder=0)
    ax.plot(xs, ys, color=BLUE, lw=1.1, ls=(0, (3, 2)), zorder=2)
    ax.scatter(xs, ys, marker="s", s=22, facecolor="white", edgecolor=BLUE, lw=1.1, zorder=3)
    for a, x, y in zip(bm, xs, ys):
        if a["frontier"] in (0.05, 0.1, 0.2, 0.35, 0.9):
            ax.annotate(f"{round(a['frontier'] * 100)}%", (x, y), xytext=(0, 6), textcoords="offset points",
                        ha="center", fontsize=7, color=BLUE, family="Geist Mono")
    ax.text(0.79, 0.43, "BM25 frontier\n(free lexical ranker,\n5–90% line budgets)", fontsize=8, color=BLUE,
            ha="center", va="center", linespacing=1.3)

    for n, dx, dy, ha in [
        ("truncate-head-35", 8, 4, "left"),
        ("truncate-tail-35", 8, -9, "left"),
        ("random-lines-35", -8, -3, "right"),
    ]:
        s = ARMS[n]["summary"]
        ax.scatter([s["cut"]["est"]], [s["primary"]["p"]], marker="o", s=26, facecolor="white", edgecolor=FAINT, lw=1, zorder=3)
        ax.annotate(label(n), (s["cut"]["est"], s["primary"]["p"]), xytext=(dx, dy), textcoords="offset points",
                    fontsize=7.5, color=FAINT, ha=ha, va="center")

    # (dx, dy, ha) in points; placed clear of each arm's whiskers.
    offsets = {
        "supercompress-fast": (0, 22, "center"),
        "caveman-cloud": (9, -10, "left"),
        "probe0-tool-compact": (12, -12, "left"),
        "supercompress-live": (-12, 9, "right"),
        "headroom-kompress": (24, 0, "left"),
        "litellm-compression": (-22, 0, "right"),
    }
    for n in PRODUCTS:
        s = ARMS[n]["summary"]
        st = STYLE[n]
        x, y = s["cut"]["est"], s["primary"]["p"]
        ax.errorbar(x, y, yerr=[[y - s["primary"]["lo"]], [s["primary"]["hi"] - y]],
                    xerr=[[x - s["cut"]["lo"]], [s["cut"]["hi"] - x]],
                    fmt="none", ecolor=st["c"], elinewidth=1, capsize=2.5, alpha=0.8, zorder=4)
        ax.scatter([x], [y], marker=st["m"], s=58 if n == "supercompress-fast" else 44, color=st["c"],
                   edgecolor="white", lw=0.8, zorder=5)
        dx, dy, ha = offsets[n]
        ax.annotate(label(n), (x, y), xytext=(dx, dy), textcoords="offset points", fontsize=9,
                    color=st["c"] if n.startswith("supercompress") else INK, ha=ha, va="center", zorder=6)

    ax.set_xlim(-0.02, 1.0)
    ax.set_ylim(0, 1.03)
    pct_axis(ax, "x")
    pct_axis(ax, "y")
    ax.set_xlabel("Tokens cut (share of input removed)  →  cheaper")
    ax.set_ylabel("Primary evidence kept (recall)  →  safer")
    ax.grid(color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    handles = [
        Line2D([], [], color=INK, marker="o", ls="none", ms=5, label="Product: point estimate"),
        Line2D([], [], color=INK, lw=1, label="95% CI (Wilson for recall, bootstrap for cut)"),
        Line2D([], [], color=BLUE, marker="s", mfc="white", ls=(0, (3, 2)), ms=4, label="BM25 at seven budgets"),
        Line2D([], [], color=FAINT, marker="o", mfc="white", ls="none", ms=5, label="Naive baselines at 35% budget"),
    ]
    ax.legend(handles=handles, loc="lower left", fontsize=7.8, handlelength=2.2)
    finish(fig, "fig1-recall-vs-cut",
           "Recall vs. cut: products against a free BM25 frontier",
           "Up and to the right is better. Points below the shaded BM25 envelope keep fewer answers than a lexical ranker at the same cut.")


# ------------------------------------------------------------------ fig 2: forest plot with tiers
def fig_forest():
    rows = [n for n in [t["arm"] for t in bench["tiers"]["order"]]] + ["bm25-35", "bm25-10", "truncate-head-35", "random-lines-35"]
    rows = rows[::-1]
    fig = plt.figure(figsize=(8.6, 5.6))
    ax = fig.add_axes([0.22, 0.12, 0.52, 0.72])
    for i, n in enumerate(rows):
        s = ARMS[n]["summary"]
        p, lo, hi = s["primary"]["p"], s["primary"]["lo"], s["primary"]["hi"]
        ref = n not in PRODUCTS
        c = STYLE[n]["c"] if not ref else FAINT
        m = STYLE[n]["m"] if not ref else "o"
        ax.plot([lo, hi], [i, i], color=c, lw=1.6 if not ref else 1.1, solid_capstyle="butt")
        ax.scatter([p], [i], marker=m, s=46 if not ref else 30, color=c if not ref else "white",
                   edgecolor=c, lw=1.1, zorder=3)
        ax.text(1.04, i, f"{p * 100:.1f}%", va="center", fontsize=9, color=INK, transform=ax.get_yaxis_transform())
        ax.text(1.2, i, f"[{lo * 100:.0f}–{hi * 100:.0f}]", va="center", fontsize=8, color=MUTED,
                transform=ax.get_yaxis_transform(), family="Geist Mono")
        tier = TIER.get(n)
        ax.text(1.4, i, f"Tier {tier}" if tier else "ref.", va="center", fontsize=8,
                color=BLUE if tier == 1 else (MUTED if tier else FAINT), transform=ax.get_yaxis_transform())
    ax.set_yticks(range(len(rows)))
    ax.set_yticklabels([label(n) for n in rows])
    for t, n in zip(ax.get_yticklabels(), rows):
        t.set_color(INK if n in PRODUCTS else FAINT)
        if n == "supercompress-fast":
            t.set_color(BLUE)
    ax.tick_params(axis="y", length=0)
    ax.spines["left"].set_visible(False)
    ax.axhline(len(rows) - len(TIER) - 0.5, color=RULE, lw=0.8)
    ax.set_xlim(0, 1.02)
    ax.set_ylim(-0.6, len(rows) - 0.4)
    pct_axis(ax, "x")
    ax.grid(axis="x", color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    ax.set_xlabel("Primary evidence kept, 95% Wilson interval")
    for x, txt in [(1.04, "recall"), (1.2, "95% CI"), (1.4, "tier")]:
        ax.text(x, len(rows) - 0.25, txt, fontsize=7.5, color=FAINT, transform=ax.get_yaxis_transform(), va="bottom")
    finish(fig, "fig2-recall-forest",
           "Primary recall with 95% confidence intervals and significance tiers",
           "Tiers come from paired exact McNemar tests, Holm-corrected at the 5% level, rule fixed before the run. References are not ranked.")


# ------------------------------------------------------------------ fig 3: family heatmap
def fig_heatmap():
    arms = PRODUCTS + ["bm25-35", "truncate-head-35"]
    fams = meta["families"]
    cmap = LinearSegmentedColormap.from_list("sc", ["#ffffff", "#dbe7ff", "#7fa9ff", BLUE, "#0336a6"])
    fig = plt.figure(figsize=(8.6, 6.4))
    ax = fig.add_axes([0.2, 0.08, 0.78, 0.68])
    import numpy as np

    M = np.array([[ARMS[a]["by_family"][f]["primary"] for a in arms] for f in fams])
    ax.imshow(M, cmap=cmap, vmin=0, vmax=1, aspect="auto")
    for i in range(len(fams)):
        for j in range(len(arms)):
            v = M[i, j]
            ax.text(j, i, f"{v * 100:.0f}", ha="center", va="center", fontsize=8,
                    color="white" if v > 0.62 else INK, family="Geist Mono")
    ax.set_xticks(range(len(arms)))
    ax.set_xticklabels([label(a) for a in arms], rotation=35, ha="left", rotation_mode="anchor")
    ax.xaxis.tick_top()
    for t, a in zip(ax.get_xticklabels(), arms):
        t.set_color(BLUE if a == "supercompress-fast" else (INK if a in PRODUCTS else FAINT))
    ax.set_yticks(range(len(fams)))
    ax.set_yticklabels(fams, family="Geist Mono", fontsize=8.5)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks([x - 0.5 for x in range(1, len(arms))], minor=True)
    ax.set_yticks([y - 0.5 for y in range(1, len(fams))], minor=True)
    ax.grid(which="minor", color="white", lw=1.6)
    ax.tick_params(which="minor", length=0)
    ax.axvline(len(PRODUCTS) - 0.5, color=INK, lw=0.9)
    n_cell = ARMS["supercompress-fast"]["by_family"][fams[0]]["n"]
    finish(fig, "fig3-recall-by-family",
           "Where each compressor breaks: primary recall by task family (%)",
           f"Each cell is the share of tasks whose primary evidence survived, n = {n_cell} per cell. Right of the rule: BM25 and a head-truncation reference.")


# ------------------------------------------------------------------ fig 4: recovery-adjusted cut
def fig_effcut():
    rows = sorted(PRODUCTS + ["bm25-35", "bm25-10"], key=lambda n: ARMS[n]["summary"]["eff_cut"]["est"])
    fig = plt.figure(figsize=(8.6, 4.8))
    ax = fig.add_axes([0.25, 0.14, 0.64, 0.66])
    for i, n in enumerate(rows):
        e = ARMS[n]["summary"]["eff_cut"]
        c_raw = ARMS[n]["summary"]["cut"]["est"]
        ref = n not in PRODUCTS
        c = FAINT if ref else STYLE[n]["c"]
        ax.plot([e["lo"], e["hi"]], [i, i], color=c, lw=1.6, solid_capstyle="butt")
        ax.scatter([c_raw], [i], marker="|", s=90, color=c, lw=1.2, zorder=2)
        ax.scatter([e["est"]], [i], marker="o" if ref else STYLE[n]["m"], s=44, color="white" if ref else c,
                   edgecolor=c, lw=1.1, zorder=3)
        if c_raw - e["est"] > 0.08:
            ax.annotate("", xy=(e["est"] + 0.012, i + 0.22), xytext=(c_raw, i + 0.22),
                        arrowprops=dict(arrowstyle="->", color=c, lw=0.7, alpha=0.6))
        val = e["est"]
        ax.text(1.02, i, f"{'−' if val < 0 else ''}{abs(val) * 100:.1f}%", va="center", fontsize=9,
                color=RED if val < 0 else INK, transform=ax.get_yaxis_transform())
    ax.axvline(0, color=INK, lw=0.8)
    ax.set_yticks(range(len(rows)))
    ax.set_yticklabels([label(n) for n in rows])
    for t, n in zip(ax.get_yticklabels(), rows):
        t.set_color(BLUE if n == "supercompress-fast" else (INK if n in PRODUCTS else FAINT))
    ax.tick_params(axis="y", length=0)
    ax.spines["left"].set_visible(False)
    ax.set_xlim(-0.35, 1.0)
    pct_axis(ax, "x")
    ax.grid(axis="x", color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    ax.set_xlabel("Recovery-adjusted cut, 95% bootstrap interval  (tick = raw cut before misses are charged)")
    finish(fig, "fig4-recovery-adjusted-cut",
           "What the cut is worth once misses are paid for",
           "Each miss is charged a raw re-read of the full input. A big cut with poor recall saves little, and can cost more than no compression.")


# ------------------------------------------------------------------ fig 5: seed stability
def fig_seeds():
    seeds = bench["seeds"]
    arms = ["supercompress-fast", "bm25-35", "probe0-tool-compact", "bm25-10", "truncate-head-35"]
    fig = plt.figure(figsize=(8.6, 4.8))
    ax = fig.add_axes([0.085, 0.14, 0.62, 0.66])
    xs = list(range(len(seeds)))
    # Dodge end labels so close lines (Probe0 vs BM25 10%) do not collide.
    ends = sorted(((seeds[-1]["arms"][n]["primary"], n) for n in arms), reverse=True)
    label_y, last = {}, None
    for y, n in ends:
        y = y if last is None else min(y, last - 0.05)
        label_y[n] = last = y
    for n in arms:
        ys = [s["arms"][n]["primary"] for s in seeds]
        nn = [s["arms"][n]["n"] for s in seeds]
        ours = n == "supercompress-fast"
        c = BLUE if ours else (INK if n in PRODUCTS else FAINT)
        m = STYLE[n]["m"] if n in STYLE else "o"
        for x, y, k in zip(xs, ys, nn):
            lo, hi = wilson(round(y * k), k)
            ax.plot([x, x], [lo, hi], color=c, lw=1, alpha=0.5)
        ax.plot(xs, ys, color=c, lw=1.6 if ours or n in PRODUCTS else 1.1,
                marker=m, ms=6, mfc=c if n in PRODUCTS else "white", mec=c)
        spread = (max(ys) - min(ys)) / 2
        ax.text(len(seeds) - 1 + 0.12, label_y[n], f"{label(n)}  ±{spread * 100:.1f} pp", va="center", fontsize=8.5,
                color=c)
    ax.set_xticks(xs)
    ax.set_xticklabels([f"{s['split']}\nseed {s['seed']}" for s in seeds], fontsize=8.5)
    ax.set_xlim(-0.25, len(seeds) - 0.75)
    ax.set_ylim(0.2, 1.0)
    pct_axis(ax)
    grid_y(ax)
    ax.set_ylabel(f"Primary recall (all {seeds[0]['arms']['supercompress-fast']['n']} tasks per split)")
    ax.spines["right"].set_visible(False)
    ax.set_clip_on(False)
    finish(fig, "fig5-seed-stability",
           "Three seeds, same ranking",
           "Tuned on dev, scored once on held-out test, then re-run on a fresh seed drawn after the code froze. Whiskers: 95% Wilson intervals.",
           f"compress-bench · local arms, all {seeds[0]['arms']['supercompress-fast']['n']} tasks per split · spread = half the range across seeds · bench {meta['bench_sha']}")


# ------------------------------------------------------------------ fig 6: robustness small multiples
def fig_robustness():
    panels = [
        ("by_position", ["head", "middle", "tail"], "Needle position"),
        ("by_style", ["lexical", "paraphrase"], "Query phrasing"),
        ("by_size", ["small", "medium", "large"], "Input size"),
    ]
    arms = PRODUCTS + ["bm25-35"]
    fig = plt.figure(figsize=(8.6, 5.2))
    w = 0.25
    axes = [fig.add_axes([0.085 + i * (w + 0.045), 0.24, w, 0.56]) for i in range(3)]
    for ax, (key, cats, title) in zip(axes, panels):
        xs = range(len(cats))
        for n in arms:
            vals = [ARMS[n][key][c]["primary"] for c in cats]
            ours = n == "supercompress-fast"
            c = STYLE[n]["c"] if n in STYLE else FAINT
            ax.plot(xs, vals, color=c, lw=1.8 if ours else 1, alpha=1 if ours or n == "bm25-35" else 0.75,
                    ls=(0, (3, 2)) if n == "bm25-35" else "-",
                    marker=STYLE[n]["m"] if n in STYLE else "s", ms=4.5,
                    mfc=c if n in STYLE else "white", mec=c, zorder=3 if ours else 2)
        ax.set_xticks(list(xs))
        ax.set_xticklabels(cats)
        ax.set_xlim(-0.3, len(cats) - 0.7)
        ax.set_ylim(0, 1.04)
        pct_axis(ax)
        grid_y(ax)
        ax.set_title(title, fontsize=10.5, color=INK, pad=8)
        if ax is not axes[0]:
            ax.set_yticklabels([])
    axes[0].set_ylabel("Primary recall")
    handles = [Line2D([], [], color=(STYLE[n]["c"] if n in STYLE else FAINT), marker=(STYLE[n]["m"] if n in STYLE else "s"),
                      ms=4.5, lw=1.4, ls=(0, (3, 2)) if n == "bm25-35" else "-",
                      mfc=(STYLE[n]["c"] if n in STYLE else "white"), label=label(n)) for n in arms]
    fig.legend(handles=handles, loc="lower center", ncol=4, fontsize=7.8, bbox_to_anchor=(0.5, 0.04),
               handlelength=2.2, columnspacing=1.4)
    finish(fig, "fig6-robustness",
           "Robustness: recall by needle position, query phrasing and input size",
           "Each point is recall within one stratum of the 84 held-out tasks (n = 27–45 per point). Flat lines are what you want.")


# ------------------------------------------------------------------ fig 7: annual cost
def fig_cost():
    model = next(m for m in meta["prices"] if m["id"] == "claude-opus-5-5")
    rr = meta["rereads"]
    per_tok = (model["input"] * 1.25 + rr * model["cacheRead"]) / 1e6
    scen = next(s for s in meta["scenarios"] if s["id"] == "enterprise-10x")
    tokens = scen["tokensPerMonth"]
    arms = sorted(PRODUCTS + ["bm25-35"], key=lambda n: ARMS[n]["summary"]["eff_cut"]["est"])
    fig = plt.figure(figsize=(8.6, 4.6))
    ax = fig.add_axes([0.25, 0.15, 0.6, 0.64])
    for i, n in enumerate(arms):
        e = ARMS[n]["summary"]["eff_cut"]
        sv = 12 * tokens * per_tok * e["est"]
        lo, hi = 12 * tokens * per_tok * e["lo"], 12 * tokens * per_tok * e["hi"]
        ref = n not in PRODUCTS
        c = FAINT if ref else (RED if sv < 0 else STYLE[n]["c"])
        ax.barh(i, sv / 1e3, color=c, height=0.62, alpha=0.9 if not ref else 0.55)
        ax.plot([lo / 1e3, hi / 1e3], [i, i], color=INK, lw=0.8, alpha=0.55)
        txt = "$0" if abs(sv) < 500 else f"{'−' if sv < 0 else ''}${abs(sv) / 1e3:,.0f}k"
        ax.text(1.02, i, txt, va="center", fontsize=9, color=RED if sv < 0 else INK, transform=ax.get_yaxis_transform())
    ax.axvline(0, color=INK, lw=0.8)
    ax.set_yticks(range(len(arms)))
    ax.set_yticklabels([label(n) for n in arms])
    for t, n in zip(ax.get_yticklabels(), arms):
        t.set_color(BLUE if n == "supercompress-fast" else (INK if n in PRODUCTS else FAINT))
    ax.tick_params(axis="y", length=0)
    ax.spines["left"].set_visible(False)
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: "$0" if v == 0 else f"{'−' if v < 0 else ''}${abs(v):,.0f}k"))
    ax.grid(axis="x", color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    ax.set_xlabel(f"Saved per year vs. no compression, on {model['name']}  (line = 95% bootstrap interval)")
    finish(fig, "fig7-annual-savings",
           f"Annual savings at {tokens / 1e9:.0f}B tool tokens a month, enterprise scale",
           f"Tool tokens priced as one cache write (1.25× input) plus {rr} cache re-reads at {model['name']} list price. "
           f"Misses pay a raw re-read. Vendor fees excluded.",
           f"compress-bench · prices as of {meta['prices_as_of']} · scenario: {scen['note']} · linear projection of the test split")


# ------------------------------------------------------------------ fig 8: real-world splits
def fig_real():
    real = bench.get("real") or []
    if not real:
        return
    fig = plt.figure(figsize=(8.6, 4.9))
    w = 0.86 / len(real)
    for i, sp in enumerate(real):
        ax = fig.add_axes([0.075 + i * w, 0.2, w - 0.035, 0.56])
        A = {a["name"]: a for a in sp["arms"]}
        bm = sorted((A[n] for n in A if n.startswith("bm25-")), key=lambda a: a["cut"]["est"])
        ax.plot([a["cut"]["est"] for a in bm], [a["primary"]["p"] for a in bm], color=FAINT, lw=1, ls="--",
                marker="o", ms=3, mfc="white", mec=FAINT, zorder=1)
        for n in ("probe0-tool-compact", "supercompress-fast"):
            a = A.get(n)
            if not a:
                continue
            c = STYLE[n]["c"]
            m = STYLE[n]["m"]
            x = a["cut"]["est"]
            hi_y = a["primary"]["p"]
            lo_y = a["compressed"]["p"] if a["compressed"] else None
            ax.plot([x, x], [a["primary"]["lo"], a["primary"]["hi"]], color=c, lw=0.8, alpha=0.45)
            ax.plot([x], [hi_y], marker=m, ms=6.5, mfc="white", mec=c, mew=1.3, zorder=3)
            if lo_y is not None:
                ax.annotate("", xy=(x, lo_y), xytext=(x, hi_y - 0.015),
                            arrowprops=dict(arrowstyle="-|>", color=c, lw=1.1, shrinkA=0, shrinkB=3, mutation_scale=8))
                ax.plot([x], [lo_y], marker=m, ms=6.5, color=c, zorder=3)
        ax.set_xlim(0.15, 0.95)
        ax.set_ylim(0, 1.04)
        pct_axis(ax)
        pct_axis(ax, "x")
        grid_y(ax)
        ax.tick_params(labelsize=7.5)
        ax.set_title(f"{sp['label']} · n = {sp['n']}", fontsize=9, color=INK, loc="left", pad=16)
        pt = "   ".join(f"{label(n).replace('SuperCompress ', '')} {A[n]['abstain'] * 100:.0f}%" for n in ("supercompress-fast", "probe0-tool-compact") if n in A)
        ax.text(0, 1.015, f"passthrough: {pt}", transform=ax.transAxes, fontsize=7, color=MUTED, va="bottom", ha="left")
        if i == 0:
            ax.set_ylabel("Primary recall")
        else:
            ax.set_yticklabels([])
        ax.set_xlabel("Cut (all inputs)", fontsize=8)
        for side in ("right", "top"):
            ax.spines[side].set_visible(False)
    from matplotlib.lines import Line2D
    handles = [
        Line2D([], [], color=BLUE, marker="o", ls="", ms=6, label="SuperCompress Fast"),
        Line2D([], [], color=INK, marker="D", ls="", ms=5.5, label="Probe0"),
        Line2D([], [], color=MUTED, marker="o", ls="", ms=6, mfc="white", label="recall, all tasks"),
        Line2D([], [], color=MUTED, marker="o", ls="", ms=6, label="recall, tasks it actually cut"),
        Line2D([], [], color=FAINT, ls="--", marker="o", ms=3, mfc="white", label="BM25 at 35-90% budgets"),
    ]
    fig.legend(handles=handles, loc="lower center", ncol=5, fontsize=7.6, frameon=False, bbox_to_anchor=(0.5, 0.035),
               handletextpad=0.4, columnspacing=1.4)
    finish(fig, "fig8-real-world",
           "Real agent tool output: recall falls once passthrough is removed",
           "Arrows run from recall on every task to recall on only the tasks each arm cut. Passthrough = returned with under 5% cut.",
           f"compress-bench · real splits: SWE-agent (CC-BY-4.0) and OpenHands · gold = lines the agent used next · 95% Wilson CIs · bench {real[0]['bench_sha'].split('+')[0]}")


# ------------------------------------------------------------------ social card (16:9)
def fig_card():
    fig = plt.figure(figsize=(12, 6.75))
    ax = fig.add_axes([0.07, 0.14, 0.56, 0.62])
    bm = sorted([a for a in bench["arms"] if a["frontier"] is not None], key=lambda a: a["summary"]["cut"]["est"])
    xs = [a["summary"]["cut"]["est"] for a in bm]
    ys = [a["summary"]["primary"]["p"] for a in bm]
    ax.fill_between(xs, 0, ys, color=BLUE, alpha=0.06, lw=0)
    ax.plot(xs, ys, color=BLUE, lw=1.3, ls=(0, (3, 2)))
    ax.scatter(xs, ys, marker="s", s=26, facecolor="white", edgecolor=BLUE, lw=1.2, zorder=3)
    ax.text(0.78, 0.3, "BM25 frontier\n(free baseline)", color=BLUE, fontsize=11, ha="center", linespacing=1.3)
    offs = {"supercompress-fast": (-12, 8, "right"), "caveman-cloud": (10, -10, "left"),
            "probe0-tool-compact": (-12, -14, "right"), "supercompress-live": (-12, -16, "right"),
            "headroom-kompress": (12, 0, "left"), "litellm-compression": (-12, 0, "right")}
    for n in PRODUCTS:
        s = ARMS[n]["summary"]
        st = STYLE[n]
        x, y = s["cut"]["est"], s["primary"]["p"]
        ax.errorbar(x, y, yerr=[[y - s["primary"]["lo"]], [s["primary"]["hi"] - y]], fmt="none", ecolor=st["c"],
                    elinewidth=1.2, capsize=3, alpha=0.8)
        ax.scatter([x], [y], marker=st["m"], s=110 if n == "supercompress-fast" else 70, color=st["c"], edgecolor="white", lw=1, zorder=5)
        dx, dy, ha = offs[n]
        ax.annotate(label(n), (x, y), xytext=(dx, dy), textcoords="offset points", fontsize=12.5,
                    color=st["c"] if n.startswith("supercompress") else INK, ha=ha, va="center")
    ax.set_xlim(-0.02, 1.0)
    ax.set_ylim(0, 1.04)
    pct_axis(ax, "x")
    pct_axis(ax)
    ax.tick_params(labelsize=11)
    ax.set_xlabel("Tokens cut  →", fontsize=12)
    ax.set_ylabel("Evidence kept  →", fontsize=12)
    ax.grid(color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    fig.text(0.07, 0.93, "Compress the context. Does the answer survive?", fontsize=26, color=INK, va="top")
    f = ARMS["supercompress-fast"]["summary"]
    p = ARMS["probe0-tool-compact"]["summary"]
    blocks = [
        (f"{f['primary']['p'] * 100:.1f}%", "SuperCompress Fast kept the\nevidence, at a {:.0f}% cut".format(f["cut"]["est"] * 100), BLUE),
        (f"{p['primary']['p'] * 100:.1f}%", "Probe0 kept the evidence,\nat an {:.0f}% cut".format(p["cut"]["est"] * 100), INK),
        (f"{ARMS['bm25-35']['summary']['primary']['p'] * 100:.1f}%", "a free BM25 baseline,\nat an {:.0f}% cut".format(ARMS['bm25-35']['summary']['cut']['est'] * 100), MUTED),
    ]
    for k, (big, small, c) in enumerate(blocks):
        y = 0.74 - k * 0.2
        fig.text(0.69, y, big, fontsize=40, color=c, va="top")
        fig.text(0.69, y - 0.1, small, fontsize=11.5, color=MUTED, va="top", linespacing=1.25)
    fig.text(0.07, 0.035, f"compress-bench · {meta['n_sample']} held-out tasks · 14 families · 95% Wilson CIs · "
             "supercompress.github.io/compress-bench", fontsize=10, color=FAINT, family="Geist Mono")
    OUT.mkdir(parents=True, exist_ok=True)
    for ext in ("svg", "png", "pdf"):
        fig.savefig(OUT / f"card-headline.{ext}", **({"dpi": 160} if ext == "png" else {}))
    for ext in ("svg", "png", "pdf"):
        shutil.copy(OUT / f"card-headline.{ext}", SITE / f"card-headline.{ext}")
    # Open Graph image: 1200x630.
    fig.set_size_inches(12, 6.3)
    fig.savefig(ROOT / "site" / "public" / "og.png", dpi=100)
    plt.close(fig)
    print("wrote card-headline, og.png")


# ------------------------------------------------------------------ social cards for the real-world results
def _save_card(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    for ext in ("svg", "png", "pdf"):
        fig.savefig(OUT / f"{name}.{ext}", **({"dpi": 160} if ext == "png" else {}))
        shutil.copy(OUT / f"{name}.{ext}", SITE / f"{name}.{ext}")
    plt.close(fig)
    print("wrote", name)


def _real_stages():
    synth_path = ROOT / "figures" / "synthetic-compressed.json"
    real = bench.get("real") or []
    if not real or not synth_path.exists():
        return None
    synth = json.loads(synth_path.read_text())
    stages = [("Synthetic\ntest", synth["arms"], synth["n"])]
    for sp in real:
        stages.append((sp["label"].replace(" ", "\n", 1), {a["name"]: a for a in sp["arms"]}, sp["n"]))
    return synth, real, stages


def card_real_drop():
    got = _real_stages()
    if not got:
        return
    synth, real, stages = got
    fig = plt.figure(figsize=(12, 6.75))
    ax = fig.add_axes([0.08, 0.17, 0.5, 0.58])
    xs = list(range(len(stages)))
    ax.axvspan(0.5, len(stages) - 0.5, color=PAPER_WASH, lw=0, zorder=0)
    ax.text(len(stages) / 2, 1.0, "real agent tool output", fontsize=11, color=MUTED, ha="center", va="top")
    series = [("supercompress-fast", BLUE, "o"), ("probe0-tool-compact", INK, "D"), ("bm25-35", FAINT, "s")]
    for n, c, m in series:
        ys, los, his = [], [], []
        for _, arms, _ in stages:
            a = arms[n]
            cr = a["compressed"]
            ys.append(cr["p"]); los.append(cr["lo"]); his.append(cr["hi"])
        if n == "supercompress-fast":
            ax.fill_between(xs, los, his, color=c, alpha=0.1, lw=0)
        ax.plot(xs, ys, color=c, lw=2.4 if n == "supercompress-fast" else 1.6, ls="--" if n == "bm25-35" else "-",
                marker=m, ms=9 if n == "supercompress-fast" else 7, mfc=c if n != "bm25-35" else "white", mec=c, zorder=4)
        other = "probe0-tool-compact" if n == "supercompress-fast" else "supercompress-fast"
        for k, (x, y) in enumerate(zip(xs, ys)):
            if n == "bm25-35" or k == len(xs) - 1:
                continue
            off = 15 if y >= stages[k][1][other]["compressed"]["p"] else -17
            ax.annotate(f"{y * 100:.0f}%", (x, y), xytext=(0, off), textcoords="offset points", ha="center",
                        va="center", fontsize=12, color=c)
        dy = {"probe0-tool-compact": 9, "bm25-35": -5, "supercompress-fast": -4}[n]
        tail = "" if n == "bm25-35" else f"  {ys[-1] * 100:.0f}%"
        ax.annotate(f"{label(n)}{tail}", (xs[-1], ys[-1]), xytext=(14, dy), textcoords="offset points", fontsize=12,
                    color=c, va="center", ha="left")
    ax.set_xticks(xs)
    ax.set_xticklabels([f"{s[0].replace(chr(10), ' ')}\nn = {s[2]}" for s in stages], fontsize=11)
    ax.set_xlim(-0.3, len(stages) - 0.7)
    ax.set_ylim(0, 1.06)
    pct_axis(ax)
    ax.tick_params(axis="y", labelsize=11)
    ax.set_ylabel("Evidence kept, on inputs it actually cut", fontsize=12)
    ax.grid(axis="y", color=RULE, lw=0.6)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    fast = [s[1]["supercompress-fast"]["compressed"]["p"] for s in stages]
    fig.text(0.07, 0.93, "Our benchmark said 93%. Real agents said otherwise.", fontsize=25, color=INK, va="top")
    fig.text(0.07, 0.855, "Same engine, same metric. Only the tool output changed: from our generators to real coding-agent sessions.",
             fontsize=12.5, color=MUTED, va="top")
    blocks = [
        (f"{fast[0] * 100:.0f}% → {fast[-1] * 100:.0f}%", "SuperCompress Fast, synthetic\nto a different agent harness", BLUE),
        (f"{stages[2][1]['probe0-tool-compact']['abstain'] * 100:.0f}%", "of real SWE-agent outputs Probe0\nreturns unchanged (cut under 5%)", INK),
        (f"{sum(s[2] for s in stages[1:])}", "real agent tasks. Evidence = lines the\nagent used next. No LLM labels.", MUTED),
    ]
    for k, (big, small, c) in enumerate(blocks):
        y = 0.74 - k * 0.2
        fig.text(0.74, y, big, fontsize=34, color=c, va="top")
        fig.text(0.74, y - 0.09, small, fontsize=11.5, color=MUTED, va="top", linespacing=1.25)
    fig.text(0.07, 0.035, "compress-bench · real splits: SWE-agent (CC-BY-4.0), sealed test, OpenHands · 95% Wilson bands · "
             "supercompress.github.io/compress-bench", fontsize=10, color=FAINT, family="Geist Mono")
    _save_card(fig, "card-real-drop")


def card_passthrough():
    got = _real_stages()
    if not got:
        return
    synth, real, stages = got
    fig = plt.figure(figsize=(12, 6.75))
    fig.text(0.07, 0.93, "Returning the input unchanged scores 100%.", fontsize=25, color=INK, va="top")
    fig.text(0.07, 0.855, "So every compressor’s recall needs its passthrough rate next to it. Here is ours and Probe0’s, on each split.",
             fontsize=12.5, color=MUTED, va="top")
    ax = fig.add_axes([0.2, 0.17, 0.71, 0.58])
    rows = []
    for st, arms, n in stages:
        for name in ("supercompress-fast", "probe0-tool-compact"):
            a = arms[name]
            prim = a["primary"]["p"] if isinstance(a["primary"], dict) else a["primary"]
            rows.append((st.replace("\n", " "), name, a["abstain"], prim, a["compressed"]["p"], a["compressed"]["n"]))
    ys = []
    y = 0
    for i, (st, name, ab, prim, cp, cn) in enumerate(rows):
        if i and i % 2 == 0:
            y += 0.55
        ys.append(y)
        c = BLUE if name == "supercompress-fast" else INK
        ax.barh(y, ab, color=c, alpha=0.18, height=0.72, lw=0)
        ax.barh(y, 1 - ab, left=ab, color=c, height=0.72, lw=0)
        ax.text(ab / 2 if ab > 0.12 else ab + 0.01, y, f"{ab * 100:.0f}% unchanged", va="center",
                ha="center" if ab > 0.12 else "left", fontsize=10, color=c)
        ax.text(ab + (1 - ab) / 2, y, f"cut: keeps {cp * 100:.0f}%", va="center", ha="center", fontsize=10.5,
                color="white")
        ax.text(1.015, y, f"{prim * 100:.0f}%", va="center", ha="left", fontsize=12, color=c)
        y += 1
    ax.set_yticks(ys)
    ax.set_yticklabels([f"{r[0]} · {'Fast' if r[1] == 'supercompress-fast' else 'Probe0'}" for r in rows], fontsize=10.5)
    ax.invert_yaxis()
    ax.set_xlim(0, 1)
    pct_axis(ax, "x")
    ax.tick_params(axis="x", labelsize=10)
    ax.set_xlabel("Share of inputs: light = returned unchanged, solid = actually compressed", fontsize=11)
    ax.text(1.015, -0.9, "headline\nrecall", fontsize=9.5, color=MUTED, ha="left", va="bottom", linespacing=1.2)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.tick_params(axis="y", length=0)
    fig.text(0.07, 0.035, "compress-bench · passthrough = cut under 5% · ‘keeps’ = primary recall on compressed inputs · "
             "supercompress.github.io/compress-bench", fontsize=10, color=FAINT, family="Geist Mono")
    _save_card(fig, "card-passthrough")


if __name__ == "__main__":
    fig_frontier()
    fig_forest()
    fig_heatmap()
    fig_effcut()
    fig_seeds()
    fig_robustness()
    fig_cost()
    fig_real()
    fig_card()
    card_real_drop()
    card_passthrough()
