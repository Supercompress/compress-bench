#!/usr/bin/env python3
"""JSON-lines worker: LiteLLM `litellm.compression.compress` on a single tool message.

Protocol (stdin -> stdout, one JSON object per line):
  {"action": "init"}                              -> {"implementation", "version"}
  {"action": "compress", "text", "query", "target_ratio"} -> {"compressed_text"}
Network is not needed; embedding_model=None keeps it lexical/offline.
"""
import json
import os
import sys
import time

os.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "True")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

protocol_out = sys.stdout
sys.stdout = sys.stderr
compressor = None


def compress_content(text, query, ratio):
    from litellm import token_counter

    messages = [
        {"role": "user", "content": "Read the tool output and answer the final question."},
        {"role": "assistant", "content": None, "tool_calls": [{"id": "bench_read", "type": "function", "function": {"name": "read_fixture", "arguments": "{}"}}]},
        {"role": "tool", "tool_call_id": "bench_read", "content": text},
        {"role": "user", "content": query},
    ]
    target = max(1, int(token_counter(model="gpt-4o", messages=messages) * ratio))
    result = compressor(messages, model="gpt-4o", compression_trigger=1000, compression_target=target, embedding_model=None)
    out = result["messages"] if isinstance(result, dict) else result.messages
    return "\n".join(m.get("content", "") for m in out if m.get("role") == "tool" and isinstance(m.get("content"), str))


def main():
    global compressor
    from importlib.metadata import version

    for line in sys.stdin:
        started = time.perf_counter()
        try:
            msg = json.loads(line)
            if msg["action"] == "init":
                from litellm.compression import compress as c

                compressor = c
                compress_content("warm up the local compressor " * 50, "warm", 0.35)
                resp = {"implementation": "litellm-compression", "version": version("litellm")}
            else:
                resp = {"compressed_text": compress_content(msg["text"], msg.get("query") or "", float(msg.get("target_ratio") or 0.35))}
            resp["elapsedMs"] = (time.perf_counter() - started) * 1000
        except Exception as error:  # noqa: BLE001 - surfaced to the harness as an arm error
            resp = {"error": f"{type(error).__name__}: {error}", "elapsedMs": (time.perf_counter() - started) * 1000}
        protocol_out.write(json.dumps(resp) + "\n")
        protocol_out.flush()


if __name__ == "__main__":
    main()
