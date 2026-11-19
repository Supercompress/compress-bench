"""Build the `real` split: tool outputs from real agent runs, with evidence the agent actually used.

Source: nebius/SWE-agent-trajectories (CC-BY-4.0), real SWE-agent sessions on GitHub issues.
Nothing in a task is written by us. That is the point: the synthetic splits share generator code
across seeds, so a compressor co-developed with the generators can overfit their templates and no
seed change will show it. This split cannot be tuned that way.

Task = (observation, query, golds):
  observation  one tool output the agent received (file view, search hits, test run, traceback...)
  query        the agent's own reasoning right before it ran that tool: what it was looking for
  golds        observation lines carrying information the agent then *used*: a distinctive token
               that first appears in this observation (never earlier in the session) and shows up
               in the agent's very next message. Lines it acted on in the next command are primary.

No LLM labels anything. Golds are a deterministic function of the public trajectory.

Splits (deterministic, by instance id):
  real-dev   public. Fine to read and tune against.
  real-test  sealed. Membership = sha256(salt + instance_id). Only sha256(salt) is published until
             the reveal, so the salt (and therefore the test set) is fixed before anyone tunes.

    python3 -I scripts/build_real_split.py <parquet> [<parquet> ...] --salt-file ~/.config/compress-bench/real-salt
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "real"

TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*|\d{2,}")
COMMAND = re.compile(r"```[a-z]*\n(.*?)```", re.S)
FOOTER = re.compile(r"\n\(Open file:.*$", re.S)
STOP = set(
    """self None True False return import from class def print with else elif while break continue pass
    raise assert lambda yield async await global nonlocal open file line lines string error Error value
    values test tests name data type types list dict tuple object result results function method module
    edit goto scroll_down scroll_up search_file search_dir find_file create submit python pytest the this
    that then there their which where when what will would should could have from into code issue
    """.split()
)
SIZE = [(0, 1200, "small"), (1200, 3000, "medium"), (3000, 10**9, "large")]


def approx_tokens(text: str) -> int:
    return len(re.findall(r"[A-Za-z_][A-Za-z0-9_]*|[^\s]", text))


def family_of(obs: str, command: str) -> str:
    c = command.strip().split()[0] if command.strip() else ""
    if re.search(r"^\[File: .*\(\d+ lines total\)\]", obs, re.M):
        return "file-view"
    if c in ("search_dir", "search_file", "grep", "rg") or re.search(r"^Found \d+ matches", obs, re.M):
        return "search"
    if c in ("find_file", "find", "ls") or re.search(r"^Found \d+ files? matching", obs, re.M):
        return "find"
    if re.search(r"Traceback \(most recent call last\)", obs):
        return "traceback"
    if re.search(r"(=+ .*(passed|failed|error).* =+|^(PASSED|FAILED|ERROR) )", obs, re.M):
        return "test-run"
    if c in ("git",) or obs.startswith("diff --git"):
        return "git"
    return "shell"


def split_ai(text: str) -> tuple[str, str]:
    m = COMMAND.findall(text)
    command = m[-1].strip() if m else ""
    discussion = COMMAND.sub("", text).replace("DISCUSSION", "").strip()
    return discussion, command


def openhands_to_swe(row: dict) -> dict:
    """Map an OpenAI-style OpenHands trajectory onto the SWE-agent shape used below."""
    traj = []
    for m in row["messages"]:
        role, content = m["role"], (m.get("content") or "")
        if role == "system":
            traj.append({"role": "system", "system_prompt": content, "text": content})
        elif role == "assistant":
            calls = []
            for c in m.get("tool_calls") or []:
                fn = c["function"]
                try:
                    args = json.loads(fn["arguments"] or "{}")
                    arg = args.get("command") if fn["name"] == "execute_bash" else " ".join(str(v) for v in args.values() if isinstance(v, (str, int)) and len(str(v)) < 300)
                except Exception:
                    arg = fn["arguments"]
                calls.append(f"{fn['name']} {arg}")
            traj.append({"role": "ai", "text": f"{content}\n```\n{'; '.join(calls)}\n```"})
        else:
            text = content[len("OBSERVATION:\n"):] if content.startswith("OBSERVATION:\n") else content
            traj.append({"role": "user", "text": text})
    return {"instance_id": row["instance_id"], "model_name": row.get("run_id", "openhands"), "trajectory": traj}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower()).strip()


def candidate_tasks(row: dict):
    traj = row["trajectory"]
    prior = [traj[0].get("system_prompt") or traj[0].get("text") or ""]
    for i, m in enumerate(traj):
        if i == 0:
            continue
        if m["role"] == "user" and i >= 3 and i + 1 < len(traj) and traj[i - 1]["role"] == "ai" and traj[i + 1]["role"] == "ai":
            obs = FOOTER.sub("", m["text"]).rstrip()
            lines = obs.split("\n")
            tokens = approx_tokens(obs)
            if len(lines) >= 25 and 500 <= tokens <= 40000:
                yield i, obs, traj[i - 1]["text"], traj[i + 1]["text"], "\n".join(prior)
        prior.append(m["text"])


def build_task(row: dict, step: int, obs: str, before: str, after: str, prior: str):
    discussion, command = split_ai(before)
    next_discussion, next_command = split_ai(after)
    if not command or len(discussion) + len(command) < 25:
        return None
    prior_tokens = set(TOKEN.findall(prior)) | set(TOKEN.findall(before))
    lines = obs.split("\n")
    nobs = norm(obs)
    token_lines: dict[str, list[int]] = defaultdict(list)
    for li, line in enumerate(lines):
        for tok in set(TOKEN.findall(line)):
            token_lines[tok].append(li)
    after_tokens = set(TOKEN.findall(after))
    cmd_tokens = set(TOKEN.findall(next_command))
    golds: dict[int, int] = {}  # line index -> strength (2 = acted on in the next command)
    for tok, where in token_lines.items():
        if len(where) > 2 or tok in prior_tokens or tok not in after_tokens:
            continue
        if tok.lower() in STOP or (tok.isdigit() and tok not in cmd_tokens) or (not tok.isdigit() and len(tok) < 5):
            continue
        for li in where:
            golds[li] = max(golds.get(li, 0), 2 if tok in cmd_tokens else 1)
    picked = []
    for li, strength in sorted(golds.items(), key=lambda kv: (-kv[1], kv[0])):
        text = lines[li].strip()
        if len(text) < 12 or nobs.count(norm(text)) != 1:
            continue
        if norm(text) in norm(discussion):
            continue  # the query must not hand over the answer
        picked.append((li, strength, text))
        if len(picked) == 4:
            break
    if not picked:
        return None
    strong = [p for p in picked if p[1] == 2]
    primary = [p[2] for p in (strong or picked)[:2]]
    first = min(p[0] for p in picked)
    rel = first / max(1, len(lines) - 1)
    tokens = approx_tokens(obs)
    return {
        "id": f"real.{row['instance_id']}.s{step}",
        "instance_id": row["instance_id"],
        "family": family_of(obs, command),
        "kind": "real",
        "size": next(name for lo, hi, name in SIZE if lo <= tokens < hi),
        "position": "head" if rel < 1 / 3 else "middle" if rel < 2 / 3 else "tail",
        "style": "agent-intent",
        "rep": 0,
        "text": obs,
        "query": f"{discussion}\n\n$ {command}",
        "golds": [p[2] for p in picked],
        "primary": primary,
        "distractors": [],
        "source": {"dataset": "nebius/SWE-agent-trajectories", "license": "CC-BY-4.0", "model": row["model_name"], "step": step},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("parquet", nargs="+")
    ap.add_argument("--salt-file", required=True)
    ap.add_argument("--per-family", type=int, default=60, help="cap per family per split")
    ap.add_argument("--format", choices=["swe-agent", "openhands"], default="swe-agent")
    ap.add_argument("--external-out", help="openhands: write every task, unsplit, to this local path")
    args = ap.parse_args()
    salt = Path(args.salt_file).expanduser().read_text().strip()
    salt_hash = hashlib.sha256(salt.encode()).hexdigest()

    def is_test(instance: str) -> bool:
        return int(hashlib.sha256((salt + instance).encode()).hexdigest(), 16) % 2 == 0

    pools: dict[tuple[str, str], list[dict]] = defaultdict(list)
    seen_instance_family = set()
    for path in args.parquet:
        cols = ["instance_id", "model_name", "trajectory"] if args.format == "swe-agent" else ["instance_id", "run_id", "messages"]
        table = pq.read_table(path, columns=cols)
        for row in table.to_pylist():
            if args.format == "openhands":
                row = openhands_to_swe(row)
            for step, obs, before, after, prior in candidate_tasks(row):
                task = build_task(row, step, obs, before, after, prior)
                if not task:
                    continue
                key = (row["instance_id"], task["family"])
                if key in seen_instance_family:
                    continue  # one task per issue per family keeps tasks independent
                seen_instance_family.add(key)
                split = "real-test" if is_test(row["instance_id"]) else "real-dev"
                pools[(split, task["family"])].append(task)

    if args.external_out:
        chosen = []
        for (_, fam), tasks in sorted(pools.items()):
            tasks.sort(key=lambda t: hashlib.sha256(t["id"].encode()).hexdigest())
            chosen += tasks[: args.per_family]
        for t in chosen:
            t["id"] = t["id"].replace("real.", "ext.", 1)
            t["source"]["dataset"] = "SWE-Gym/OpenHands-Sampled-Trajectories"
            t["source"]["license"] = "unspecified (local evaluation only, not redistributed)"
        chosen.sort(key=lambda t: t["id"])
        with gzip.open(Path(args.external_out).expanduser(), "wt", encoding="utf-8") as f:
            f.write("\n".join(json.dumps(t, ensure_ascii=False) for t in chosen) + "\n")
        print("external", len(chosen), dict(Counter(t["family"] for t in chosen)), dict(Counter(t["size"] for t in chosen)), file=sys.stderr)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"source": "nebius/SWE-agent-trajectories", "license": "CC-BY-4.0", "salt_sha256": salt_hash, "splits": {}}
    for split in ("real-dev", "real-test"):
        chosen = []
        for (s, fam), tasks in sorted(pools.items()):
            if s != split:
                continue
            tasks.sort(key=lambda t: hashlib.sha256(t["id"].encode()).hexdigest())
            chosen += tasks[: args.per_family]
        chosen.sort(key=lambda t: t["id"])
        blob = "\n".join(json.dumps(t, ensure_ascii=False) for t in chosen) + "\n"
        manifest["splits"][split] = {
            "n": len(chosen),
            "sha256": hashlib.sha256(blob.encode()).hexdigest(),
            "families": dict(Counter(t["family"] for t in chosen)),
            "sizes": dict(Counter(t["size"] for t in chosen)),
        }
        # Only the dev split is written into the repo. The test split goes next to the salt.
        target = OUT / "dev.jsonl.gz" if split == "real-dev" else Path(args.salt_file).expanduser().parent / "real-test.jsonl.gz"
        with gzip.open(target, "wt", encoding="utf-8") as f:
            f.write(blob)
        print(split, manifest["splits"][split], "->", target, file=sys.stderr)
    (OUT / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
