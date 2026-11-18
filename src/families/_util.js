"use strict";
/** Shared vocabulary and helpers for task generators. */

const SIZES = {
  // Target number of filler lines. Real token counts are measured and reported per run.
  small: 60,
  medium: 320,
  large: 1300,
};

const POSITIONS = {
  head: [0.04, 0.14],
  middle: [0.43, 0.57],
  tail: [0.86, 0.96],
};

const MODULES = [
  "auth", "billing", "search", "ingest", "notify", "ledger", "export", "profile", "catalog",
  "pricing", "session", "upload", "webhooks", "reports", "inventory", "audit", "sync", "media",
];
const NOUNS = [
  "cache", "queue", "token", "invoice", "tenant", "cursor", "batch", "shard", "replica", "schema",
  "bucket", "policy", "lease", "snapshot", "manifest", "index", "ticket", "payload", "bundle",
];
const VERBS = [
  "loads", "parses", "rejects", "retries", "flushes", "merges", "renders", "validates", "evicts",
  "emits", "rotates", "reconciles", "hydrates", "paginates", "throttles", "serializes",
];
const SERVICES = [
  "api-gateway", "auth-service", "search-indexer", "notify-worker", "media-resizer", "report-cron",
  "catalog-api", "session-store", "export-runner", "audit-sink", "billing-api", "sync-agent",
];
const ROUTES = [
  "/v1/users", "/v1/projects", "/v1/search", "/v1/files", "/v1/teams", "/v1/events", "/v1/keys",
  "/v1/exports", "/v1/reports", "/healthz", "/v1/sessions", "/v1/tags",
];
const FIRST = [
  "maria", "dev", "lena", "omar", "kenji", "ana", "tariq", "priya", "jonas", "sofia", "li", "noah",
  "fatima", "ivan", "chloe", "amir", "zoe", "raj", "mei", "lucas",
];
const LAST = ["k", "patel", "okafor", "silva", "nguyen", "berg", "haddad", "ito", "moreau", "cohen", "diaz", "ross"];

function camel(...words) {
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
}

function kebab(...words) {
  return words.join("-");
}

/** Insert a block of lines at a fraction of the way through `lines`. Returns insert index. */
function insertAt(lines, block, frac) {
  const idx = Math.max(0, Math.min(lines.length, Math.round(lines.length * frac)));
  lines.splice(idx, 0, ...block);
  return idx;
}

function fracFor(rng, position) {
  const [lo, hi] = POSITIONS[position];
  return rng.float(lo, hi);
}

/** Count non-overlapping occurrences of `needle` in `hay`. */
function occurrences(hay, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

/** Unique-value factory: never hands out the same value twice within a task. */
function uniq(rng, gen) {
  const seen = new Set();
  return () => {
    for (let k = 0; k < 1000; k++) {
      const v = gen(rng);
      if (!seen.has(v)) {
        seen.add(v);
        return v;
      }
    }
    throw new Error("uniq: exhausted");
  };
}

function isoTime(rng, base = Date.UTC(2026, 10, 14, 9, 0, 0)) {
  return (offsetMs) => new Date(base + offsetMs).toISOString();
}

module.exports = {
  SIZES,
  POSITIONS,
  MODULES,
  NOUNS,
  VERBS,
  SERVICES,
  ROUTES,
  FIRST,
  LAST,
  camel,
  kebab,
  insertAt,
  fracFor,
  occurrences,
  uniq,
  isoTime,
};
