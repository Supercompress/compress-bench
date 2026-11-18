"use strict";
/**
 * Product arms. Each one is optional and reports *why* it is unavailable instead of being
 * silently skipped. Nothing here is mocked: if an arm runs, it ran the real code or API.
 *
 * Env:
 *   SC_ROOT                 checkout containing packages/proxy/src/fast-compress.js
 *   SC_FAST_COMPRESS        explicit path to fast-compress.js (overrides SC_ROOT)
 *   SUPERCOMPRESS_API_KEY   key for the hosted API (else ~/.supercompress/config.json)
 *   SC_LIVE_COMPRESS_URL    hosted endpoint (default https://www.supercompress.dev/api/v1/compress)
 *   PROBE0_COMPACT_PATH     path to a Probe0 tool-compaction port exposing compress(text, query, {kind})
 *   CAVE_API_KEY            Caveman Cloud key; CAVE_GATEWAY_URL to override the endpoint
 *   HEADROOM_PYTHON         python with headroom-ai + cached Kompress ONNX model
 *   LITELLM_PYTHON          python with litellm installed
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const readline = require("readline");

const WORKERS = path.join(__dirname, "..", "..", "workers");

function fileSha(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
}

function firstExisting(paths) {
  return paths.filter(Boolean).find((p) => fs.existsSync(p)) || null;
}

async function postJson(url, body, headers, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    let json = null;
    try {
      json = JSON.parse(raw);
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, json, raw };
  } finally {
    clearTimeout(timer);
  }
}

/** Retries 429/5xx/network with exponential backoff; 4xx fail fast. */
async function withRetry(fn, { attempts = 4, baseMs = 500 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e.fatal) throw e;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

function httpError(res) {
  const e = new Error(`HTTP ${res.status}: ${String(res.raw).slice(0, 200)}`);
  e.fatal = res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408;
  return e;
}

// ---------------------------------------------------------------- SuperCompress local Fast
function scFastArm({ ratio = 0.35 } = {}) {
  const p = firstExisting([
    process.env.SC_FAST_COMPRESS,
    process.env.SC_ROOT && path.join(process.env.SC_ROOT, "packages/proxy/src/fast-compress.js"),
    path.join(__dirname, "../../../../packages/proxy/src/fast-compress.js"),
  ]);
  let mod = null;
  return {
    name: "supercompress-fast",
    type: "local",
    description: `SuperCompress Fast engine run in-process (budgetRatio ${ratio}). Reference for the hosted API; not the billed product path.`,
    queryAware: true,
    available: () => (p ? { ok: true, provenance: { path: p, sha256: fileSha(p) } } : { ok: false, reason: "fast-compress.js not found (set SC_ROOT or SC_FAST_COMPRESS)" }),
    async compress(task) {
      mod ||= require(p);
      const r = mod.compress(task.text, task.query, { budgetRatio: ratio });
      return { text: r.compressed_text ?? r.text ?? "", mode: r.mode };
    },
  };
}

// ---------------------------------------------------------------- SuperCompress hosted API
function loadScKey() {
  if (process.env.SUPERCOMPRESS_API_KEY) return process.env.SUPERCOMPRESS_API_KEY.trim();
  try {
    return JSON.parse(fs.readFileSync(path.join(os.homedir(), ".supercompress", "config.json"), "utf8")).api_key || null;
  } catch {
    return null;
  }
}

function scLiveArm({ timeoutMs = 180000 } = {}) {
  const url = process.env.SC_LIVE_COMPRESS_URL || "https://www.supercompress.dev/api/v1/compress";
  const key = loadScKey();
  return {
    name: "supercompress-live",
    type: "remote",
    description: `Hosted SuperCompress API (${new URL(url).host}/api/v1/compress), context + query.`,
    queryAware: true,
    available: () => (key ? { ok: true, provenance: { url } } : { ok: false, reason: "no SUPERCOMPRESS_API_KEY / ~/.supercompress/config.json" }),
    async compress(task) {
      return withRetry(async () => {
        const res = await postJson(url, { context: task.text, query: task.query }, { "X-API-Key": key }, timeoutMs);
        if (res.status !== 200) throw httpError(res);
        const b = res.json || {};
        if (typeof b.compressed_text !== "string") throw Object.assign(new Error("response missing compressed_text"), { fatal: true });
        return { text: b.compressed_text, mode: b.mode || b.policy_name || null };
      });
    },
  };
}

// ---------------------------------------------------------------- Probe0 tool compaction port
function probe0Arm() {
  const p = firstExisting([
    process.env.PROBE0_COMPACT_PATH,
    process.env.SC_ROOT && path.join(process.env.SC_ROOT, "scripts/bench_vs_probe0/probe0_tool_compact.js"),
  ]);
  const KIND = { bash: "bash", tool: "bash", read: "read", rag: "web", chat: "bash" };
  let mod = null;
  return {
    name: "probe0-tool-compact",
    type: "local",
    description: "Port of Probe0 CLI 0.1.19 agent tool-output compaction (bash fold/focus, read head/tail, web head). Kind mapped per family.",
    queryAware: true,
    available: () => (p ? { ok: true, provenance: { path: p, sha256: fileSha(p) } } : { ok: false, reason: "set PROBE0_COMPACT_PATH" }),
    async compress(task) {
      mod ||= require(p);
      const r = mod.compress(task.text, task.query, { kind: KIND[task.kind] || "bash" });
      return { text: r.compressed_text ?? "", mode: r.mode };
    },
  };
}

// ---------------------------------------------------------------- Caveman Cloud
function cavemanArm({ timeoutMs = 120000 } = {}) {
  const url = process.env.CAVE_GATEWAY_URL || "https://gateway.caveman.so/sdk/v1/compress";
  const key = (process.env.CAVE_API_KEY || "").trim();
  return {
    name: "caveman-cloud",
    type: "remote",
    description: "Caveman Cloud /sdk/v1/compress. Its contract takes input only — the query is NOT sent (documented asymmetry).",
    queryAware: false,
    available: () => (key ? { ok: true, provenance: { url } } : { ok: false, reason: "CAVE_API_KEY not set" }),
    async compress(task) {
      return withRetry(async () => {
        const res = await postJson(
          url,
          { input: task.text },
          { "x-cave-api-key": key, "x-cave-agent": "compress-bench", "x-cave-workflow": "compression-only", "x-cave-retention": "metadata" },
          timeoutMs
        );
        if (res.status !== 200) throw httpError(res);
        const b = res.json || {};
        if (typeof b.output !== "string") throw Object.assign(new Error("response missing output"), { fatal: true });
        return { text: b.output, mode: b.basis || null };
      });
    },
  };
}

// ---------------------------------------------------------------- JSON-lines python workers
function pythonWorkerArm({ name, description, python, script, env = {}, ratio = 0.35, outKey = "compressed_text", queryAware = true }) {
  let child = null;
  let pending = null;
  let info = null;
  function request(msg, timeoutMs = 300000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending = null;
        resolve({ error: "worker timeout" });
      }, timeoutMs);
      pending = (r) => {
        clearTimeout(timer);
        resolve(r);
      };
      child.stdin.write(JSON.stringify(msg) + "\n");
    });
  }
  return {
    name,
    type: "worker",
    description,
    queryAware,
    available: () => {
      if (!python || !fs.existsSync(python)) return { ok: false, reason: `python not found (${python || "unset"})` };
      return { ok: true, provenance: { python, script: path.basename(script), ...(info || {}) } };
    },
    async init() {
      child = spawn(python, ["-u", script], {
        env: { PATH: process.env.PATH, HOME: process.env.HOME, HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", ...env },
        stdio: ["pipe", "pipe", "ignore"],
      });
      readline.createInterface({ input: child.stdout }).on("line", (line) => {
        const f = pending;
        pending = null;
        if (!f) return;
        try {
          f(JSON.parse(line));
        } catch (e) {
          f({ error: String(e) });
        }
      });
      child.on("exit", () => pending && pending({ error: "worker exited" }));
      const r = await request({ action: "init" }, 600000);
      if (r.error) throw new Error(`${name} init failed: ${r.error}`);
      info = { implementation: r.implementation, version: r.version };
      return info;
    },
    async compress(task) {
      const r = await request({ action: "compress", text: task.text, query: queryAware ? task.query : "", target_ratio: ratio });
      if (r.error) throw new Error(r.error);
      return { text: r[outKey] ?? "" };
    },
    stop() {
      if (child) child.kill("SIGKILL");
    },
  };
}

function headroomArm({ ratio = 0.35 } = {}) {
  return pythonWorkerArm({
    name: "headroom-kompress",
    description: `Headroom KompressCompressor (ONNX, offline), target_ratio ${ratio}, question = query.`,
    python: process.env.HEADROOM_PYTHON,
    script: path.join(WORKERS, "headroom_kompress_worker.py"),
    env: { HEADROOM_OFFLINE: "1", HEADROOM_BEACON: "off", HEADROOM_KOMPRESS_BACKEND: "onnx" },
    ratio,
  });
}

function litellmArm({ ratio = 0.35 } = {}) {
  return pythonWorkerArm({
    name: "litellm-compression",
    description: `LiteLLM litellm.compression.compress on the tool message, compression_target = ${ratio} of prompt tokens, no embedding model.`,
    python: process.env.LITELLM_PYTHON,
    script: path.join(WORKERS, "litellm_worker.py"),
    env: { LITELLM_LOCAL_MODEL_COST_MAP: "True", DO_NOT_TRACK: "1" },
    ratio,
  });
}

function productArms(opts = {}) {
  return [scFastArm(opts), scLiveArm(opts), probe0Arm(opts), cavemanArm(opts), headroomArm(opts), litellmArm(opts)];
}

module.exports = { productArms, scFastArm, scLiveArm, probe0Arm, cavemanArm, headroomArm, litellmArm, withRetry, postJson };
