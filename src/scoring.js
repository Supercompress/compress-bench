"use strict";
/**
 * Per-task scoring. Everything is a deterministic function of (task, output text).
 *
 * Containment is checked on normalised text (lower-case, whitespace collapsed), so a compressor
 * that re-indents or trims lines is not penalised, but one that rewrites, abbreviates or
 * paraphrases the evidence is.
 */
const { countTokens } = require("./tokenize");
const { norm } = require("./corpus");

// Lines a compressor inserts to say "something was removed here". Not counted as hallucination.
const MARKER = /omitted|truncated|elided|collapsed|compressed|re-?fetch|\b(?:lines?|rows?|items?|entries|frames?|chars?|characters|tokens?) (?:removed|hidden|skipped|dropped|folded)\b|^[[(<]?\s*(?:…|\.{3})\s*[\])>]?$|similar lines|more lines|repeated \d+|×\s*\d+/i;

function firstAtOrAfter(arr, x) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo < arr.length ? arr[lo] : -1;
}

function lineFacts(task, output) {
  const src = task.text;
  // Every position of every distinct (trimmed) source line, so repeated lines such as "}," do
  // not register as reordering.
  const srcLines = new Map();
  src.split("\n").forEach((l, i) => {
    const k = l.trim();
    if (!k) return;
    if (!srcLines.has(k)) srcLines.set(k, []);
    srcLines.get(k).push(i);
  });
  let faithful = 0;
  let novel = 0;
  let markers = 0;
  let inOrder = true;
  let last = -1;
  const novelSamples = [];
  for (const raw of String(output).split("\n")) {
    const l = raw.trim();
    if (l.length < 4) continue;
    const at = srcLines.get(l);
    if (at) {
      faithful++;
      const next = firstAtOrAfter(at, last + 1);
      if (next === -1) inOrder = false;
      else last = next;
    } else if (src.includes(l)) {
      faithful++; // a verbatim fragment of a source line
    } else if (MARKER.test(l)) {
      markers++;
    } else {
      novel++;
      if (novelSamples.length < 3) novelSamples.push(l.slice(0, 160));
    }
  }
  const denom = faithful + novel;
  return { faithful, novel, markers, fidelity: denom ? faithful / denom : 1, inOrder, novelSamples };
}

function scoreOutput(task, output, { ms = 0, error = null, mode = null } = {}) {
  const tokensIn = task.tokens;
  if (error) {
    // Errors are scored as misses with zero savings. They are never a free pass.
    return {
      id: task.id, family: task.family, size: task.size, position: task.position, style: task.style,
      tokens_in: tokensIn, tokens_out: tokensIn, cut: 0, primary_hit: false, all_hit: false,
      gold_recall: 0, golds_missing: task.golds, distractors_kept: 0, fidelity: null, novel_lines: 0,
      markers: 0, in_order: null, ms, error: String(error).slice(0, 300), mode, expanded: false,
    };
  }
  const out = String(output ?? "");
  const n = norm(out);
  const hits = task.golds.map((g) => n.includes(norm(g)));
  const primaryHit = task.primary.every((p) => n.includes(norm(p)));
  const tokensOut = countTokens(out);
  const f = lineFacts(task, out);
  return {
    id: task.id, family: task.family, size: task.size, position: task.position, style: task.style,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cut: 1 - tokensOut / Math.max(1, tokensIn),
    primary_hit: primaryHit,
    all_hit: hits.every(Boolean),
    gold_recall: hits.filter(Boolean).length / hits.length,
    golds_missing: task.golds.filter((_, i) => !hits[i]),
    distractors_kept: task.distractors.filter((d) => n.includes(norm(d))).length,
    fidelity: f.fidelity,
    novel_lines: f.novel,
    novel_samples: f.novelSamples,
    markers: f.markers,
    in_order: f.inOrder,
    ms,
    error: null,
    mode,
    expanded: tokensOut > tokensIn,
  };
}

module.exports = { scoreOutput, lineFacts, MARKER };
