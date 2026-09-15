# Model Workshop visual language

- `Tease:` Show each model operation as a visible change with a clear cause.
- `Lede:` The four demos use a shared diagram, persistent document colors, measured loss plots, and restrained transitions to make otherwise hidden model work legible.
- `Why it matters:` An audience can distinguish prompting, retrieval, adapter training, and training from scratch without treating them as the same process.
- `Go deeper:` The implementation uses semantic HTML, React, SVG, shadcn table composition, Heroicons, and Xterm. Motion stops under reduced-motion preferences.

## Sources and decisions

3Blue1Brown's transformer lessons preserve the identity of tokens while showing how context changes their representation. The workshop borrows that teaching pattern by keeping the same source names visible as files move through context, retrieval, and generation. The diagram highlights one causal stage at a time instead of looping decorative particles.

- [Transformers and language models](https://www.3blue1brown.com/lessons/gpt/)
- [Attention and query-key relationships](https://www.3blue1brown.com/lessons/attention/)
- [Gradient descent](https://www.3blue1brown.com/lessons/gradient-descent/)
- [Interactive neural-network analysis](https://www.3blue1brown.com/lessons/neural-network-analysis/)
- [Dot products as projection and alignment](https://www.3blue1brown.com/lessons/dot-products/)

The Context and Retrieval demos use a four-stage flow: sources, selected context, model, answer. React changes the highlighted stage as the real operation changes. The graphic is paired with live text and does not carry information by color alone.

Fine-tuning shows the frozen FunctionGemma body beside its trainable rank-four adapter. Its line plot uses the loss emitted by the current run. This is more faithful to the implementation than a generic neural-network drawing because only the output adapter changes.

The Rust demo plots every `step … | loss …` line emitted by the compiled program. Xterm displays the unmodified output, including warnings, while the chart separates a noisy individual step from the overall training direction. The compiler's `dead_code` warning is not presented as a failed run.

The tables follow shadcn's basic [Table composition](https://ui.shadcn.com/docs/components/base/table). Retrieval scores appear as relative percentages for quick comparison, while keyboard focus or pointer hover exposes the original method score. They are explicitly labeled as normalized matches rather than confidence probabilities.

Terminal surfaces follow the current [Xterm addon pattern](https://xtermjs.org/docs/guides/using-addons/) with the fit addon, a resize observer, screen-reader mode, a plain-text accessibility mirror, and a copy action.
