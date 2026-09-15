"""Reproduce the local FunctionGemma CLI experiment; never executes tool calls."""

import argparse
import hashlib
import importlib.metadata
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from fixtures import TEST, TRAIN, VALID, rows

MODEL_ID = "mlx-community/functiongemma-270m-it-4bit"
REVISION = "95c30bf2f45a0145d555808900312ac92a061a2f"
HERE = Path(__file__).resolve().parent


def digest(path):
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def prepare(args):
    from huggingface_hub import snapshot_download

    if args.output.exists() and any(args.output.iterdir()):
        raise SystemExit("Output must be a new or empty directory; preserve earlier runs.")
    args.output.mkdir(parents=True, exist_ok=True)
    model = snapshot_download(MODEL_ID, revision=REVISION)
    (args.output / "model-path.txt").write_text(model + "\n")
    data = args.output / "data"
    data.mkdir()
    for name, examples in [("train", TRAIN), ("valid", VALID), ("test", TEST)]:
        (data / f"{name}.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows(examples)))
    versions = {name: importlib.metadata.version(name) for name in ["mlx-lm", "mlx", "mlx-metal", "transformers", "huggingface-hub", "numpy", "safetensors"]}
    write_json(args.output / "provenance.json", {
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "source_model": "google/functiongemma-270m-it",
        "converted_model": MODEL_ID, "model_revision": REVISION,
        "quantization": "MLX affine 4-bit, group size 64",
        "python": sys.version.split()[0], "packages": versions,
        "dataset_origin": "Synthetic workshop examples authored in fixtures.py; no attendee data.",
        "split_counts": {"train": len(rows(TRAIN)), "valid": len(rows(VALID)), "test": len(rows(TEST))},
        "files_sha256": {str(path.relative_to(args.output)): digest(path) for path in sorted(data.glob("*.jsonl"))},
        "source_sha256": {name: digest(HERE / name) for name in ["fixtures.py", "config.yaml", "run.py"]},
        "model_files": {path.name: {"bytes": path.stat().st_size, "sha256": digest(path)} for path in sorted(Path(model).iterdir()) if path.is_file() and not path.name.startswith(".")},
        "limitations": ["Nine fixed held-out synthetic examples; not a real-world benchmark.", "Native Apple Silicon MLX training, not browser training.", "Model and adapter weights remain outside Git."],
    })
    print(f"Prepared {len(rows(TRAIN))} training examples and two separate nine-example evaluation splits.")


def evaluate(args):
    import mlx.core as mx
    from mlx_lm import load, stream_generate
    from mlx_lm.sample_utils import make_sampler

    output = args.output / f"{args.variant}.json"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite {output.name}")
    model_path = (args.output / "model-path.txt").read_text().strip()
    adapter = args.output / "adapters" if args.variant == "adapted" else None
    model, tokenizer = load(model_path, adapter_path=str(adapter) if adapter else None)
    mx.random.seed(42)
    results = []
    for index, row in enumerate(rows(TEST)):
        prompt = tokenizer.apply_chat_template(row["messages"][:-1], tools=row["tools"], add_generation_prompt=True, tokenize=False)
        expected_full = tokenizer.apply_chat_template(row["messages"], tools=row["tools"], tokenize=False)
        expected_match = re.search(r"<start_function_call>(.*?)<end_function_call>", expected_full, re.S)
        if not expected_match:
            raise RuntimeError("Tokenizer did not render expected function-call markers")
        started = time.perf_counter()
        responses = list(stream_generate(model, tokenizer, prompt=prompt, max_tokens=96, sampler=make_sampler(temp=0)))
        generated = "".join(response.text for response in responses)
        final = responses[-1]
        # MLX intentionally omits its stop token from rendered text. In this
        # model token 49 is the actual end_function_call marker, so retain the
        # sampled stop token for complete, evidence-based protocol scoring.
        if final.finish_reason == "stop":
            generated += tokenizer.decode([final.token], skip_special_tokens=False)
        calls = re.findall(r"<start_function_call>(.*?)<end_function_call>", generated, re.S)
        expected = expected_match.group(1)
        passed = len(calls) == 1 and calls[0] == expected
        results.append({"id": index + 1, "input": row["messages"][1]["content"], "expected_call": expected,
                        "generated": generated, "stop_token_id": final.token, "finish_reason": final.finish_reason, "exact_call_match": passed,
                        "elapsed_seconds": round(time.perf_counter() - started, 3)})
        print(f"{args.variant} {index + 1}/{len(rows(TEST))}: {'PASS' if passed else 'FAIL'}", flush=True)
    report = {"variant": args.variant, "created_utc": datetime.now(timezone.utc).isoformat(),
              "model_revision": REVISION, "decoding": {"temperature": 0, "max_tokens": 96, "seed": 42},
              "scoring": "Exactly one FunctionGemma call; exact tool name and serialized arguments match. Extra prose is retained for review.",
              "passed": sum(row["exact_call_match"] for row in results), "total": len(results), "results": results}
    if adapter:
        weights = adapter / "adapters.safetensors"
        report["adapter_sha256"] = digest(weights)
        report["adapter_bytes"] = weights.stat().st_size
        tensors = mx.load(str(weights))
        report["adapter_parameter_count"] = sum(value.size for value in tensors.values())
        report["adapter_b_nonzero"] = any(bool(mx.any(value != 0).item()) for name, value in tensors.items() if name.endswith("lora_b"))
        if not report["adapter_b_nonzero"]:
            raise RuntimeError("Saved adapter B matrices are all zero; no update demonstrated")
    write_json(output, report)


def train(args):
    adapter = args.output / "adapters"
    if adapter.exists():
        raise SystemExit("Refusing to reuse existing adapters; start a fresh experiment.")
    model = (args.output / "model-path.txt").read_text().strip()
    command = [sys.executable, "-m", "mlx_lm", "lora", "--config", str(HERE / "config.yaml"),
               "--model", model, "--data", str(args.output / "data"), "--adapter-path", str(adapter)]
    started = time.perf_counter()
    with (args.output / "training.log").open("w") as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=900, check=False)
    write_json(args.output / "training.json", {"exit_code": result.returncode,
               "elapsed_seconds": round(time.perf_counter() - started, 3),
               "config_sha256": digest(HERE / "config.yaml"),
               "created_utc": datetime.now(timezone.utc).isoformat()})
    if result.returncode:
        raise SystemExit("Training failed; inspect training.log. Earlier evidence was preserved.")
    print("Training completed; saved adapter is ready for separate-process evaluation.")


def verify(args):
    base = json.loads((args.output / "base.json").read_text())
    adapted = json.loads((args.output / "adapted.json").read_text())
    if base["model_revision"] != adapted["model_revision"]:
        raise SystemExit("Model revisions differ")
    for before, after in zip(base["results"], adapted["results"], strict=True):
        if before["input"] != after["input"] or before["expected_call"] != after["expected_call"]:
            raise SystemExit("Evaluation fixtures differ")
    changed = sum(a["generated"] != b["generated"] for a, b in zip(base["results"], adapted["results"], strict=True))
    summary = {"created_utc": datetime.now(timezone.utc).isoformat(), "base_exact_matches": base["passed"],
               "adapted_exact_matches": adapted["passed"], "held_out_count": base["total"],
               "changed_outputs": changed, "saved_adapter_reloaded_in_separate_process": True,
               "adapter_nonzero_update": adapted["adapter_b_nonzero"], "adapter_sha256": adapted["adapter_sha256"],
               "quality_improved_on_this_split": adapted["passed"] > base["passed"],
               "browser_training_verified": False}
    write_json(args.output / "summary.json", summary)
    print(json.dumps(summary, indent=2))


def experiment(args):
    prepare(args)
    for command in [
        ["evaluate", "--variant", "base"], ["train"],
        ["evaluate", "--variant", "adapted"], ["verify"],
    ]:
        subprocess.run([sys.executable, str(HERE / "run.py"), *command, "--output", str(args.output)], check=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["prepare", "evaluate", "train", "verify", "experiment"])
    parser.add_argument("--output", type=Path, required=True, help="New local experiment directory; weights must stay outside Git.")
    parser.add_argument("--variant", choices=["base", "adapted"], default="base")
    options = parser.parse_args()
    {"prepare": prepare, "evaluate": evaluate, "train": train, "verify": verify, "experiment": experiment}[options.command](options)
