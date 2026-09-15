export type ModelRequest =
  {kind: 'generate'; prompt: string} | {kind: 'embed'; texts: string[]};
export type ModelResult =
  {kind: 'text'; text: string} | {kind: 'vectors'; vectors: number[][]};
export type WorkerReply =
  | {kind: 'progress'; message: string}
  | {kind: 'result'; result: ModelResult}
  | {kind: 'error'; message: string};

export class ModelClient {
  private worker: Worker | null = null;
  private reject: ((error: Error) => void) | null = null;
  run(
    request: ModelRequest,
    progress: (message: string) => void,
  ): Promise<ModelResult> {
    if (this.reject)
      return Promise.reject(new Error('A model run is already active.'));
    this.worker ??= new Worker(new URL('./model-worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const message = event.data;
        if (message.kind === 'progress') {
          progress(message.message);
          return;
        }
        this.reject = null;
        if (message.kind === 'error') reject(new Error(message.message));
        else resolve(message.result);
      };
      worker.onerror = event => {
        this.cancel(event.message || 'The model worker failed.');
      };
      worker.postMessage(request);
    });
  }
  cancel(
    message = 'Cancelled. Model memory released; downloaded files may remain in your browser cache.',
  ): void {
    this.worker?.terminate();
    this.worker = null;
    this.reject?.(new Error(message));
    this.reject = null;
  }
}
