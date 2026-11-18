#!/usr/bin/env python3
"""Line-protocol worker: Headroom KompressCompressor with target_ratio."""
import json
import os
import sys
import time

os.environ.setdefault("HEADROOM_OFFLINE", "1")
os.environ.setdefault("HEADROOM_BEACON", "off")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HEADROOM_KOMPRESS_BACKEND", "onnx")

protocol_out = sys.stdout
sys.stdout = sys.stderr

compressor = None


def main():
    global compressor
    from importlib.metadata import version
    from headroom.transforms.kompress_compressor import (
        KompressCompressor,
        warm_kompress_model,
    )

    for line in sys.stdin:
        started = time.perf_counter()
        try:
            message = json.loads(line)
            if message["action"] == "init":
                if not warm_kompress_model(allow_download=False):
                    raise RuntimeError("Kompress ONNX model not cached locally")
                compressor = KompressCompressor()
                # warm
                compressor.compress(
                    "warm up the local compressor " * 20,
                    question="warmup",
                    target_ratio=0.35,
                    allow_download=False,
                )
                response = {
                    "implementation": "headroom-kompress",
                    "version": version("headroom-ai"),
                }
            else:
                result = compressor.compress(
                    message["text"],
                    question=message.get("query") or None,
                    target_ratio=float(message.get("target_ratio") or 0.35),
                    allow_download=False,
                )
                response = {"compressed_text": result.compressed}
            response["elapsedMs"] = (time.perf_counter() - started) * 1000
        except Exception as error:
            response = {
                "error": f"{type(error).__name__}: {error}",
                "elapsedMs": (time.perf_counter() - started) * 1000,
            }
        protocol_out.write(json.dumps(response) + "\n")
        protocol_out.flush()


if __name__ == "__main__":
    main()
