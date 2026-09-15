# Third-party model sources

- **Tease:** Model weights have their own provenance.
- **Lede:** The FunctionGemma CLI fallback downloads a pinned public MLX conversion of Google's FunctionGemma model; weights and trained adapters are not committed here.
- **Why it matters:** Repository source licensing does not replace model terms or imply Google endorsement.
- **Go deeper:** See the [CLI experiment and receipt](scripts/functiongemma/README.md).

## FunctionGemma CLI fallback

- Original model: [Google FunctionGemma 270M IT](https://huggingface.co/google/functiongemma-270m-it).
- Conversion: [MLX community 4-bit checkpoint](https://huggingface.co/mlx-community/functiongemma-270m-it-4bit/tree/95c30bf2f45a0145d555808900312ac92a061a2f), revision `95c30bf2f45a0145d555808900312ac92a061a2f`.
- Model terms: [Gemma Terms of Use](https://ai.google.dev/gemma/terms) and linked [Gemma Prohibited Use Policy](https://ai.google.dev/gemma/prohibited_use_policy).
- Attribution: Gemma is provided under and subject to the Gemma Terms of Use.
- Runtime: [Apple MLX-LM](https://github.com/ml-explore/mlx-lm), MIT-licensed source; exact dependencies are in the CLI requirements file.
- Training fixtures: synthetic examples authored for this workshop in `scripts/functiongemma/fixtures.py`; no attendee files or real notifications.
- Outputs: generated proposed tool calls only. The CLI never executes those tools.

The September 15 receipt proves native MLX training, save, reload, and limited held-out evaluation. It does not verify browser FunctionGemma training, the 12-run headed GPU gate, or broad model quality. This notice describes the CLI checkpoint; any separate browser checkpoint must have its own pinned provenance and verification.
