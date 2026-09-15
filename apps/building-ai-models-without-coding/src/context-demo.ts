import {
  getCorpus,
  importCorpus,
  restoreExampleCorpus,
  groundingPrompt,
  MAX_FILE_BYTES,
} from './corpus';
import {ModelClient} from './model-client';

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

export function createDemoUI(
  container: HTMLElement,
  title: string,
  description: string,
) {
  const section = element('section');
  section.className = 'demo-panel';
  section.append(element('h2', title), element('p', description));
  const notice = element(
    'p',
    'Your text stays on this device. First use downloads model files. Answers require WebGPU in Chromium.',
  );
  notice.className = 'muted';
  section.append(notice);
  const form = element('form');
  const label = element('label', 'Your question');
  const question = element('textarea');
  question.rows = 2;
  question.maxLength = 1000;
  question.required = true;
  question.value = 'What should I bring?';
  label.append(question);
  form.append(label);
  const controls = element('div');
  controls.className = 'controls';
  const run = element('button', 'Ask Gemma');
  run.type = 'submit';
  const cancel = element('button', 'Cancel');
  cancel.type = 'button';
  cancel.disabled = true;
  controls.append(run, cancel);
  form.append(controls);
  section.append(form);
  const status = element(
    'p',
    'Ready. No model has been downloaded by this demo yet.',
  );
  status.setAttribute('role', 'status');
  const answer = element('div');
  answer.className = 'answer';
  answer.setAttribute('aria-label', 'Model answer');
  section.append(status, answer);
  const data = element('details');
  data.append(element('summary', 'Data · inspect or import local text'));
  data.append(
    element(
      'p',
      'Imported text is shared between Context and Retrieval in this tab. Reloading or closing the tab clears it. Nothing is uploaded. Built-in documents are synthetic workshop examples, not real meetup logistics. Importing replaces the example corpus. Plain text only; .eml content is read as text, without decoding MIME attachments. Limits: 8 files, 64 KiB each, 48 chunks total.',
    ),
  );
  const uploadLabel = element('label', 'Import local documents');
  const upload = element('input');
  upload.type = 'file';
  upload.multiple = true;
  upload.accept = '.txt,.md,.json,.eml';
  uploadLabel.append(upload);
  const reset = element('button', 'Restore synthetic examples');
  reset.type = 'button';
  const preview = element('pre');
  data.append(uploadLabel, reset, preview);
  section.append(data);
  const promptDetails = element('details');
  promptDetails.append(
    element('summary', 'Prompt · inspect what the model sees'),
  );
  const prompt = element('pre', 'Run a question to inspect its exact prompt.');
  promptDetails.append(prompt);
  section.append(promptDetails);
  section.append(
    element(
      'p',
      'Gemma 3 270M is a small text model and can make mistakes, ignore instructions, or invent citations. Compare its answer with the source text. Retrieved sources are evidence to inspect, not proof that the generated answer is correct.',
    ),
  );
  const models = element('details');
  models.append(element('summary', 'Models · source and download details'));
  models.append(
    element(
      'p',
      'Model weights are downloaded from Hugging Face and may remain in your browser cache. ONNX Community converted these Google models. Gemma 3 270M uses q4 weights, about 323 MB. EmbeddingGemma 300M uses q8 weights, about 309 MB. Tokenizers and runtime add to these downloads. Both run through Transformers.js in a Web Worker. Generation requires WebGPU in Chromium; embeddings use WASM on your CPU.',
    ),
  );
  for (const [title, href] of Object.entries({
    'Gemma 3 270M ONNX conversion':
      'https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX/tree/2dbbfdb1b59bd034eb959428c6a7da9dd7ea27f0',
    'EmbeddingGemma ONNX conversion':
      'https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX/tree/5090578d9565bb06545b4552f76e6bc2c93e4a66',
    'Google Gemma terms': 'https://ai.google.dev/gemma/terms',
  })) {
    const paragraph = element('p');
    const link = element('a', title);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    paragraph.append(link);
    models.append(paragraph);
  }
  section.append(models);
  container.append(section);
  const renderData = () => {
    preview.textContent = getCorpus()
      .map(
        document => `${document.title} [${document.source}]\n${document.text}`,
      )
      .join('\n\n');
  };
  renderData();
  upload.onchange = async () => {
    try {
      const files = Array.from(upload.files ?? []);
      if (!files.length) return;
      if (files.length > 8) throw new Error('Choose at most 8 files.');
      if (files.some(file => file.size > MAX_FILE_BYTES))
        throw new Error('Each file must be at most 64 KiB.');
      const imported = [];
      for (const file of files)
        imported.push({name: file.name, text: await file.text()});
      importCorpus(imported);
      renderData();
      status.textContent = `Imported ${getCorpus().length} text chunks locally.`;
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : String(error);
    }
  };
  reset.onclick = () => {
    restoreExampleCorpus();
    upload.value = '';
    renderData();
    status.textContent = 'Synthetic examples restored.';
  };
  const busy = (active: boolean) => {
    run.disabled = active;
    cancel.disabled = !active;
    upload.disabled = active;
    reset.disabled = active;
    question.disabled = active;
  };
  return {
    section,
    form,
    controls,
    question,
    run,
    cancel,
    status,
    answer,
    prompt,
    busy,
    documents: getCorpus,
  };
}

export function mountContextDemo(container: HTMLElement): () => void {
  const ui = createDemoUI(
    container,
    'Give Gemma context',
    'Ask the same question with and without your documents. Context changes the input; it does not train the model.',
  );
  const includeLabel = element('label');
  const include = element('input');
  include.type = 'checkbox';
  include.checked = true;
  includeLabel.append(include, ' Include document context (first 6 chunks)');
  ui.controls.prepend(includeLabel);
  const client = new ModelClient();
  ui.cancel.onclick = () => client.cancel();
  ui.form.onsubmit = async event => {
    event.preventDefault();
    ui.busy(true);
    include.disabled = true;
    const selected = include.checked ? ui.documents().slice(0, 6) : [];
    const prompt = include.checked
      ? groundingPrompt(ui.question.value, selected)
      : ui.question.value;
    ui.prompt.textContent = prompt;
    ui.status.textContent = 'Loading Gemma 3 270M…';
    try {
      const result = await client.run({kind: 'generate', prompt}, message => {
        ui.status.textContent = message;
      });
      if (result.kind !== 'text') throw new Error('Unexpected model response.');
      const response = element('article');
      response.append(
        element(
          'h3',
          include.checked
            ? 'With document context'
            : 'Without document context',
        ),
        element('p', ui.question.value),
        element('p', result.text || '(The model produced no text.)'),
      );
      ui.answer.prepend(response);
      ui.status.textContent = `Finished locally. ${selected.length} source chunks supplied. Weights unchanged.`;
    } catch (error) {
      ui.status.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      ui.busy(false);
      include.disabled = false;
    }
  };
  return () => {
    client.cancel();
    ui.section.remove();
  };
}
