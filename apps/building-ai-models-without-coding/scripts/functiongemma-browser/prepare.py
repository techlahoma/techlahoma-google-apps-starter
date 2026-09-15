"""Prepare the pinned FunctionGemma graph with a final hidden-state output.

Requires onnx==1.19.1. Downloads public Gemma-licensed model artifacts.
Run with --output <directory>; output is disposable and must not be committed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

import onnx

REVISION = "ba3c872ede162a5c4ab753f509b2260af5587143"
REPOSITORY = "onnx-community/functiongemma-270m-it-ONNX"
FILES = {
    "model_q4f16.onnx": "8dc9fb5e2b0aa34f527309f0ecaeb9b824b5ad9a9613350168753054c180e145",
    "model_q4f16.onnx_data": "b30ca95e4b31014ec791d7589f8c6416b8056ffc4f39093aa7ceb3ad37f2a0c7",
}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(output):
    output.mkdir(parents=True, exist_ok=True)
    for name, expected in FILES.items():
        path = output / name
        if not path.exists():
            temporary = path.with_suffix(path.suffix + ".partial")
            url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/onnx/{name}"
            print(f"Downloading {url}", flush=True)
            urllib.request.urlretrieve(url, temporary)
            if digest(temporary) != expected:
                raise ValueError(f"Checksum mismatch: {name}")
            temporary.replace(path)
        if digest(path) != expected:
            raise ValueError(f"Checksum mismatch: {name}")
    model = onnx.load(output / "model_q4f16.onnx", load_external_data=False)
    head = [node for node in model.graph.node if list(node.output) == ["logits_internal"]]
    if len(head) != 1 or head[0].op_type != "MatMul":
        raise ValueError("Pinned graph no longer has the expected linear output head")
    hidden = head[0].input[0]
    last_hidden = "workshop_last_hidden"
    model.graph.initializer.append(onnx.helper.make_tensor(
        "workshop_last_index", onnx.TensorProto.INT64, [1], [-1]))
    gather = onnx.helper.make_node("Gather", [hidden, "workshop_last_index"],
                                  [last_hidden], name="gather_last_hidden", axis=1)
    head_index = next(i for i, node in enumerate(model.graph.node)
                      if list(node.output) == ["logits_internal"])
    model.graph.node.insert(head_index, gather)
    head_node = model.graph.node[head_index + 1]
    head_node.input[0] = last_hidden
    for value in model.graph.output:
        if value.name == "logits":
            value.type.tensor_type.shape.dim[1].ClearField("dim_param")
            value.type.tensor_type.shape.dim[1].dim_value = 1
    model.graph.node.append(onnx.helper.make_node(
        "Cast", [last_hidden], ["hidden_states"], name="export_hidden_states", to=onnx.TensorProto.FLOAT))
    model.graph.output.append(onnx.helper.make_tensor_value_info(
        "hidden_states", onnx.TensorProto.FLOAT, ["batch_size", 1, 640]))
    onnx.helper.set_model_props(model, {
        "source_repository": REPOSITORY,
        "source_revision": REVISION,
        "license": "Gemma Terms of Use: https://ai.google.dev/gemma/terms",
        "modification_notice": "Modified for the GDG workshop: Gather final token before lm_head and expose float32 hidden_states. Base weights unchanged.",
    })
    target = output / "model_hidden.onnx"
    onnx.save(model, target)
    manifest = {
        "repository": REPOSITORY, "revision": REVISION,
        "license": "gemma", "terms": "https://ai.google.dev/gemma/terms",
        "transformation": "Gather final token before frozen lm_head; expose float32 hidden state; weights unchanged",
        "hiddenTensor": hidden, "hiddenSize": 640, "vocabularySize": 262144,
        "sha256": {**FILES, target.name: digest(target)},
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    prepare(parser.parse_args().output)
