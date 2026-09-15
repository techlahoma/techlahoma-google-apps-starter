import {createDemoUI, element} from './context-demo';
import {groundingPrompt, sampleCorpus} from './corpus';
import {ModelClient} from './model-client';
import {
  hybridSearch,
  lexicalSearch,
  semanticSearch,
  type RetrievalMode,
} from './retrieval';

export function mountRagDemo(container: HTMLElement): () => void {
  const ui = createDemoUI(
    container,
    'Find evidence, then ask Gemma',
    'Compare keyword search with real EmbeddingGemma vectors. RAG retrieves a small set of sources before generating an answer. No weights change.',
  );
  const modeLabel = element('label', 'Retrieval method');
  const mode = element('select');
  for (const [value, label] of Object.entries({
    lexical: 'Keywords · BM25 (no download)',
    semantic: 'Semantic · EmbeddingGemma',
    hybrid: 'Hybrid · reciprocal rank fusion',
  })) {
    const option = element('option', label);
    option.value = value;
    mode.append(option);
  }
  mode.value = 'hybrid';
  modeLabel.append(mode);
  ui.controls.prepend(modeLabel);
  const search = element('button', 'Find sources only');
  search.type = 'button';
  ui.controls.prepend(search);
  const results = element('section');
  results.setAttribute('aria-label', 'Retrieved sources');
  ui.answer.before(results);
  const checks = element('details');
  checks.append(
    element('summary', 'Evaluation · check retrieval on synthetic examples'),
  );
  checks.append(
    element(
      'p',
      'Three authored fixture questions, evaluated against the built-in corpus. This checks retrieval behavior, not answer accuracy or a general benchmark. Each result is computed when you run it.',
    ),
  );
  const evaluate = element('button', 'Run retrieval checks');
  evaluate.type = 'button';
  const evaluation = element('pre', 'Not run.');
  checks.append(evaluate, evaluation);
  ui.section.append(checks);
  const client = new ModelClient();
  evaluate.onclick = async () => {
    ui.busy(true);
    mode.disabled = true;
    search.disabled = true;
    evaluate.disabled = true;
    evaluation.textContent = '';
    try {
      for (const fixture of [
        {question: 'What should I bring?', expected: 'equipment'},
        {question: 'Where can I leave my bike?', expected: 'transit'},
        {
          question: 'Which symbol says we are ready to rehearse?',
          expected: 'emoji',
        },
      ]) {
        const result = await client.run(
          {
            kind: 'embed',
            texts: [
              `task: search result | query: ${fixture.question}`,
              ...sampleCorpus.map(
                document => `title: ${document.title} | text: ${document.text}`,
              ),
            ],
          },
          message => {
            ui.status.textContent = message;
          },
        );
        if (result.kind !== 'vectors')
          throw new Error('Unexpected embedding response.');
        const lexical = lexicalSearch(fixture.question, sampleCorpus);
        const semantic = semanticSearch(sampleCorpus, result.vectors);
        evaluation.textContent += `${fixture.question}\nExpected source: ${fixture.expected}\n`;
        for (const [name, hits] of Object.entries({
          lexical,
          semantic,
          hybrid: hybridSearch(lexical, semantic),
        })) {
          const rank =
            hits.findIndex(hit => hit.document.id === fixture.expected) + 1;
          evaluation.textContent += `${name}: expected source ${rank ? `rank ${rank}` : 'not retrieved'}; top result ${hits[0]?.document.id ?? 'none'}\n`;
        }
        evaluation.textContent += '\n';
      }
      ui.status.textContent =
        'Retrieval checks finished locally. Inspect the ranks; no results are prefilled.';
    } catch (error) {
      ui.status.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      ui.busy(false);
      mode.disabled = false;
      search.disabled = false;
      evaluate.disabled = false;
    }
  };
  ui.cancel.onclick = () => client.cancel();
  const execute = async (generate: boolean) => {
    const query = ui.question.value.trim();
    if (!query) {
      ui.status.textContent = 'Enter a question first.';
      return;
    }
    ui.busy(true);
    mode.disabled = true;
    search.disabled = true;
    evaluate.disabled = true;
    results.replaceChildren();
    ui.answer.textContent = '';
    try {
      const documents = ui.documents();
      const selectedMode: RetrievalMode =
        mode.value === 'semantic'
          ? 'semantic'
          : mode.value === 'hybrid'
            ? 'hybrid'
            : 'lexical';
      const lexical = lexicalSearch(query, documents);
      let hits = lexical;
      if (selectedMode !== 'lexical') {
        ui.status.textContent = 'Loading EmbeddingGemma 300M (q8, WASM)…';
        const result = await client.run(
          {
            kind: 'embed',
            texts: [
              `task: search result | query: ${query}`,
              ...documents.map(
                document => `title: ${document.title} | text: ${document.text}`,
              ),
            ],
          },
          message => {
            ui.status.textContent = message;
          },
        );
        if (result.kind !== 'vectors')
          throw new Error('Unexpected embedding response.');
        const semantic = semanticSearch(documents, result.vectors);
        hits =
          selectedMode === 'semantic'
            ? semantic
            : hybridSearch(lexical, semantic);
      }
      const top = hits.slice(0, 3);
      results.append(element('h3', 'Retrieved sources'));
      const scoreLabel =
        selectedMode === 'semantic'
          ? 'cosine similarity'
          : selectedMode === 'hybrid'
            ? 'RRF rank score'
            : 'BM25 score';
      top.forEach((hit, index) => {
        const source = element('article');
        source.className = 'source-card';
        source.append(
          element('h3', `[${index + 1}] ${hit.document.title}`),
          element(
            'p',
            `${scoreLabel}: ${hit.score.toFixed(4)} · ${hit.document.source}`,
          ),
          element('p', hit.document.text),
        );
        results.append(source);
      });
      if (!top.length) {
        ui.status.textContent =
          'No keyword matches. Try different wording or semantic search.';
        return;
      }
      const prompt = groundingPrompt(
        query,
        top.map(hit => hit.document),
      );
      ui.prompt.textContent = prompt;
      if (!generate) {
        ui.status.textContent = `Retrieved ${top.length} sources using ${selectedMode} search. Scores are not confidence probabilities.`;
        return;
      }
      const result = await client.run({kind: 'generate', prompt}, message => {
        ui.status.textContent = message;
      });
      if (result.kind !== 'text')
        throw new Error('Unexpected generation response.');
      ui.answer.textContent = result.text || '(The model produced no text.)';
      ui.status.textContent = `Finished locally with ${top.length} retrieved sources. Check the answer against them.`;
    } catch (error) {
      ui.status.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      ui.busy(false);
      mode.disabled = false;
      search.disabled = false;
      evaluate.disabled = false;
    }
  };
  search.onclick = () => {
    void execute(false);
  };
  ui.form.onsubmit = event => {
    event.preventDefault();
    void execute(true);
  };
  return () => {
    client.cancel();
    ui.section.remove();
  };
}
