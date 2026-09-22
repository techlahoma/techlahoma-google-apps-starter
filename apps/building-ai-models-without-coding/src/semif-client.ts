export const DEFAULT_SEMIF_MODEL = 'minicpm5-2b';
export const SEMIF_MODELS = [
  {
    id: 'minicpm5-2b',
    name: 'MiniCPM5 2B',
    download: '1.56 GB',
    bytes: 1561318368,
    revision: '2079a22f3beaa4e306449978533478fe0522f4b3',
  },
  {
    id: 'qwen3-0.6b',
    name: 'Qwen3 0.6B',
    download: '639 MB',
    bytes: 639446688,
    revision: '23749fefcc72300e3a2ad315e1317431b06b590a',
  },
] as const;

export interface SemifScore {
  scores: Array<{label: 'Slop' | 'Clear'; probability: number}>;
  elapsedMs: number;
  inputTokens: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function parseScore(value: unknown): SemifScore {
  if (
    !isRecord(value) ||
    !Array.isArray(value.scores) ||
    value.scores.length !== 2 ||
    typeof value.elapsedMs !== 'number' ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    typeof value.inputTokens !== 'number' ||
    !Number.isInteger(value.inputTokens) ||
    value.inputTokens < 1
  ) {
    throw new Error('Invalid SemIf worker result.');
  }
  const scores: SemifScore['scores'] = value.scores.map(
    (score: unknown, index: number) => {
      if (
        !isRecord(score) ||
        score.label !== (index === 0 ? 'Slop' : 'Clear') ||
        typeof score.probability !== 'number' ||
        !Number.isFinite(score.probability) ||
        score.probability < 0 ||
        score.probability > 1
      ) {
        throw new Error('Invalid allowed-token probability.');
      }
      return {
        label: index === 0 ? 'Slop' : 'Clear',
        probability: score.probability,
      };
    },
  );
  if (
    Math.abs(scores.reduce((sum, score) => sum + score.probability, 0) - 1) >
    0.00001
  ) {
    throw new Error('Allowed-token probabilities do not sum to one.');
  }
  return {scores, elapsedMs: value.elapsedMs, inputTokens: value.inputTokens};
}

/** Text and criteria travel only to a same-origin worker, never to a server. */
export class SemifClient {
  private worker: Worker | undefined;
  private sequence = 0;
  private disposed = false;
  private ready = false;
  private pending:
    | {
        id: number;
        resolve(value: unknown): void;
        reject(error: Error): void;
        progress(message: string): void;
      }
    | undefined;

  async load(
    modelId: string,
    onProgress: (message: string) => void,
  ): Promise<void> {
    if (this.disposed) throw new Error('This model client has been disposed.');
    if (!SEMIF_MODELS.some(model => model.id === modelId))
      throw new Error('Choose a listed model.');
    if (this.worker)
      throw new Error('Create a new client to reload or change models.');
    this.worker = new Worker(new URL('semif/worker.js', document.baseURI), {
      type: 'module',
    });
    this.worker.onmessage = ({data}: MessageEvent<unknown>) => {
      if (!isRecord(data) || data.id !== this.pending?.id) return;
      if (data.type === 'progress' && typeof data.message === 'string') {
        this.pending?.progress(data.message);
      } else if (data.type === 'error') {
        this.fail(
          new Error(
            typeof data.message === 'string'
              ? data.message
              : 'Model worker failed.',
          ),
        );
      } else if (data.type === 'loaded' || data.type === 'scored') {
        const request = this.pending;
        this.pending = undefined;
        request?.resolve(data.result);
      }
    };
    this.worker.onerror = event =>
      this.fail(new Error(event.message || 'Model worker could not start.'));
    this.worker.onmessageerror = () =>
      this.fail(new Error('Model worker message could not be read.'));
    await this.request({type: 'load', modelId}, onProgress);
    this.ready = true;
  }

  async score(text: string, criterion: string): Promise<SemifScore> {
    if (!this.ready) throw new Error('Load the model before scoring.');
    return parseScore(await this.request({type: 'score', text, criterion}));
  }

  /** Termination cancels downloads or active inference and rejects pending work. */
  dispose(): void {
    this.disposed = true;
    this.ready = false;
    this.worker?.terminate();
    this.worker = undefined;
    this.fail(new Error('Model operation cancelled.'));
  }

  private fail(error: Error): void {
    const request = this.pending;
    this.pending = undefined;
    request?.reject(error);
  }

  private request(
    data: Record<string, string>,
    progress: (message: string) => void = () => undefined,
  ): Promise<unknown> {
    if (!this.worker || this.disposed)
      return Promise.reject(new Error('Model client is not active.'));
    if (this.pending)
      return Promise.reject(new Error('Wait for the current model operation.'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending = {id, resolve, reject, progress};
      this.worker?.postMessage({...data, id});
    });
  }
}
