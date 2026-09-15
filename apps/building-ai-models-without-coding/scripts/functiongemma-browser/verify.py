"""Compare prepared final-token logits against the pinned unmodified model.

Requires onnxruntime==1.23.2 and numpy. This checks numeric compatibility, not
language quality or training reliability. The token IDs are fixed test inputs.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--model-directory", type=Path, required=True)
args = parser.parse_args()
original = ort.InferenceSession(str(args.model_directory / "model_q4f16.onnx"),
                               providers=["CPUExecutionProvider"])
prepared = ort.InferenceSession(str(args.model_directory / "model_hidden.onnx"),
                               providers=["CPUExecutionProvider"])
inputs = {
    "input_ids": np.array([[2, 105, 2364]], dtype=np.int64),
    "attention_mask": np.ones((1, 3), dtype=np.int64),
    "position_ids": np.array([[0, 1, 2]], dtype=np.int64),
}
for value in original.get_inputs():
    if value.name.startswith("past_key_values."):
        inputs[value.name] = np.zeros((1, 1, 0, 256), dtype=np.float16)
reference = original.run(["logits"], inputs)[0][:, -1:, :]
logits, hidden = prepared.run(["logits", "hidden_states"], inputs)
assert logits.shape == (1, 1, 262144)
assert hidden.shape == (1, 1, 640)
assert np.isfinite(logits).all() and np.isfinite(hidden).all()
# FP16 MatMul kernel shape changes can round differently after Gather.
np.testing.assert_allclose(logits, reference, atol=0.02, rtol=0.002)
assert np.argmax(logits) == np.argmax(reference)
print(json.dumps({
    "runtime": ort.__version__, "provider": "CPUExecutionProvider",
    "logits": list(logits.shape), "hidden": list(hidden.shape),
    "maximumAbsoluteDifference": float(np.abs(logits - reference).max()),
    "sameArgmax": True, "allFinite": True,
    "absoluteTolerance": 0.02, "relativeTolerance": 0.002,
}, indent=2))
