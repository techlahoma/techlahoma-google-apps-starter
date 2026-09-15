/// <reference types="@webgpu/types" />
/** Output-head LoRA: frozen model vectors/logits in; only A and B are trained.
 * WebGPU owns both matrix products, backpropagation through B, and SGD updates.
 * Stable full-vocabulary softmax, cross-entropy, and dL/dlogits run on the CPU.
 * This is an output projection adapter, not attention-layer LoRA.
 */
export interface LoraOptions {
  hiddenSize: number;
  vocabSize: number;
  rank: number;
  learningRate: number;
  scale?: number;
  seed?: number;
}

export interface LoraFeature {
  hidden: Float32Array;
  logits: Float32Array;
  target: number;
}

export interface LoraSnapshot {
  schemaVersion: 1;
  kind: 'output-head-lora';
  hiddenSize: number;
  vocabSize: number;
  rank: number;
  learningRate: number;
  scale: number;
  seed: number;
  steps: number;
  a: number[];
  b: number[];
}

export function validateLoraOptions(
  options: LoraOptions,
): Required<LoraOptions> {
  for (const [name, value, maximum] of [
    ['hiddenSize', options.hiddenSize, 4096],
    ['vocabSize', options.vocabSize, 262144],
    ['rank', options.rank, 8],
  ] as const) {
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      throw new Error(`${name} must be an integer from 1 to ${maximum}`);
    }
  }
  const scale = options.scale ?? 1;
  const seed = options.seed ?? 137;
  if (
    !Number.isFinite(options.learningRate) ||
    options.learningRate <= 0 ||
    options.learningRate > 1 ||
    !Number.isFinite(scale) ||
    scale <= 0 ||
    scale > 32 ||
    !Number.isInteger(seed) ||
    seed < 1 ||
    seed > 0xffffffff
  ) {
    throw new Error(
      'Invalid learning rate (0,1], scale (0,32], or uint32 seed',
    );
  }
  return {...options, scale, seed};
}

export function initialLoraWeights(options: LoraOptions): {
  a: Float32Array;
  b: Float32Array;
} {
  const config = validateLoraOptions(options);
  let state = config.seed;
  const a = new Float32Array(config.hiddenSize * config.rank);
  for (let i = 0; i < a.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    a[i] = ((state >>> 0) / 0x100000000 - 0.5) * 0.02;
  }
  return {a, b: new Float32Array(config.rank * config.vocabSize)};
}

function validateVector(values: Float32Array, length: number, label: string) {
  if (values.length !== length || !values.every(Number.isFinite)) {
    throw new Error(`${label} must contain ${length} finite float32 values`);
  }
}

/** Stable log-sum-exp loss and full-vocabulary gradient, without clipping. */
export function softmaxCrossEntropy(logits: Float32Array, target: number) {
  if (
    !Number.isInteger(target) ||
    target < 0 ||
    target >= logits.length ||
    !logits.every(Number.isFinite)
  ) {
    throw new Error('Invalid target token or nonfinite logits');
  }
  let maximum = -Infinity;
  for (const value of logits) maximum = Math.max(maximum, value);
  let sum = 0;
  for (const value of logits) sum += Math.exp(value - maximum);
  const gradient = Float32Array.from(
    logits,
    value => Math.exp(value - maximum) / sum,
  );
  gradient[target] = gradient[target]! - 1;
  return {loss: maximum + Math.log(sum) - logits[target]!, gradient};
}

interface Kernel {
  pipeline: GPUComputePipeline;
  group: GPUBindGroup;
  workgroups: number;
}

export class OutputLora {
  readonly config: Required<LoraOptions>;
  private readonly buffers: GPUBuffer[] = [];
  private kernels: Kernel[] = [];
  private readonly h: GPUBuffer;
  private readonly a: GPUBuffer;
  private readonly b: GPUBuffer;
  private readonly z: GPUBuffer;
  private readonly base: GPUBuffer;
  private readonly logits: GPUBuffer;
  private readonly gradient: GPUBuffer;
  private readonly dz: GPUBuffer;
  private readonly daSum: GPUBuffer;
  private readonly dbSum: GPUBuffer;
  private readonly inverseBatch: GPUBuffer;
  private steps = 0;
  private busy = false;
  private disposed = false;
  private failure: string | null = null;

  private constructor(
    private readonly device: GPUDevice,
    options: LoraOptions,
  ) {
    this.config = validateLoraOptions(options);
    const {hiddenSize: h, vocabSize: v, rank: r} = this.config;
    this.h = this.buffer(h, 'frozen hidden');
    this.a = this.buffer(h * r, 'adapter A');
    this.b = this.buffer(r * v, 'adapter B');
    this.z = this.buffer(r, 'hA');
    this.base = this.buffer(v, 'frozen logits');
    this.logits = this.buffer(v, 'adapted logits');
    this.gradient = this.buffer(v, 'cross entropy gradient');
    this.dz = this.buffer(r, 'backprop hA');
    this.daSum = this.buffer(h * r, 'batch gradient A');
    this.dbSum = this.buffer(r * v, 'batch gradient B');
    this.inverseBatch = this.buffer(1, 'inverse batch size');
    const initial = initialLoraWeights(this.config);
    this.write(this.a, initial.a);
    this.write(this.b, initial.b);
    void device.lost.then(info => {
      this.failure = `WebGPU device lost: ${info.message}`;
    });
  }

  static async create(options: LoraOptions): Promise<OutputLora> {
    validateLoraOptions(options);
    if (!navigator.gpu)
      throw new Error('WebGPU is required for adapter training');
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) throw new Error('No WebGPU adapter is available');
    const device = await adapter.requestDevice();
    const engine = new OutputLora(device, options);
    try {
      await engine.initialize();
      return engine;
    } catch (error) {
      engine.dispose();
      throw error;
    }
  }

  private buffer(elements: number, label: string): GPUBuffer {
    const buffer = this.device.createBuffer({
      label,
      size: elements * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    this.buffers.push(buffer);
    return buffer;
  }

  private write(buffer: GPUBuffer, values: Float32Array) {
    // Copy to an owned ArrayBuffer (also accepts views returned by ONNX).
    this.device.queue.writeBuffer(buffer, 0, new Float32Array(values));
  }

  private async kernel(
    code: string,
    buffers: GPUBuffer[],
    workgroups: number,
  ): Promise<Kernel> {
    const module = this.device.createShaderModule({code});
    const pipeline = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: {module, entryPoint: 'main'},
    });
    const group = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: buffers.map((buffer, binding) => ({
        binding,
        resource: {buffer},
      })),
    });
    return {pipeline, group, workgroups};
  }

  private async initialize() {
    const {
      hiddenSize: h,
      vocabSize: v,
      rank: r,
      scale,
      learningRate: lr,
    } = this.config;
    const constants = `const H:u32=${h}; const V:u32=${v}; const R:u32=${r}; const SCALE:f32=${scale}; const LR:f32=${lr};`;
    const declarations = (accesses: string[]) =>
      accesses
        .map(
          (access, i) =>
            `@group(0) @binding(${i}) var<storage, ${access}> x${i}:array<f32>;`,
        )
        .join('\n');
    await this.checked(async () => {
      this.kernels = [
        // Each lane computes one low-rank feature z_r = sum_h h_h A_hr.
        await this.kernel(
          constants +
            declarations(['read', 'read', 'read_write']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let k=id.x; if(k>=R){return;} var s:f32=0.;
 for(var j:u32=0;j<H;j++){s+=x0[j]*x1[j*R+k];} x2[k]=s;
}`,
          [this.h, this.a, this.z],
          Math.ceil(r / 64),
        ),
        // Full vocabulary logits, one GPU lane per token.
        await this.kernel(
          constants +
            declarations(['read', 'read', 'read', 'read_write']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let j=id.x; if(j>=V){return;} var s:f32=0.;
 for(var k:u32=0;k<R;k++){s+=x0[k]*x1[k*V+j];} x3[j]=x2[j]+SCALE*s;
}`,
          [this.z, this.b, this.base, this.logits],
          Math.ceil(v / 64),
        ),
        // One workgroup per rank, reducing dL/dz across the whole vocabulary.
        // Must finish before B is mutated by the next dispatch.
        await this.kernel(
          constants +
            declarations(['read', 'read', 'read_write']) +
            `
var<workgroup> sums:array<f32,64>;
@compute @workgroup_size(64) fn main(@builtin(workgroup_id) group:vec3<u32>, @builtin(local_invocation_id) lane:vec3<u32>) {
 let k=group.x; let t=lane.x; var s:f32=0.;
 for(var j:u32=t;j<V;j+=64){s+=x0[k*V+j]*x1[j];}
 sums[t]=s; workgroupBarrier();
 for(var stride:u32=32;stride>0;stride/=2){
  if(t<stride){sums[t]+=sums[t+stride];} workgroupBarrier();
 }
 if(t==0){x2[k]=SCALE*sums[0];}
}`,
          [this.b, this.gradient, this.dz],
          r,
        ),
        await this.kernel(
          constants +
            declarations(['read_write', 'read', 'read']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let i=id.x; if(i>=R*V){return;} let k=i/V; let j=i%V;
 x0[i]+=SCALE*x1[k]*x2[j];
}`,
          [this.dbSum, this.z, this.gradient],
          Math.ceil((r * v) / 64),
        ),
        await this.kernel(
          constants +
            declarations(['read_write', 'read', 'read']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let i=id.x; if(i>=H*R){return;} let j=i/R; let k=i%R;
 x0[i]+=x1[j]*x2[k];
}`,
          [this.daSum, this.h, this.dz],
          Math.ceil((h * r) / 64),
        ),
        // Apply averaged gradients only after every example used the same A/B.
        await this.kernel(
          constants +
            declarations(['read_write', 'read', 'read']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let i=id.x; if(i>=R*V){return;} x0[i]-=LR*x1[i]*x2[0];
}`,
          [this.b, this.dbSum, this.inverseBatch],
          Math.ceil((r * v) / 64),
        ),
        await this.kernel(
          constants +
            declarations(['read_write', 'read', 'read']) +
            `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) {
 let i=id.x; if(i>=H*R){return;} x0[i]-=LR*x1[i]*x2[0];
}`,
          [this.a, this.daSum, this.inverseBatch],
          Math.ceil((h * r) / 64),
        ),
      ];
    });
  }

  private dispatch(kernels: Kernel[]) {
    const encoder = this.device.createCommandEncoder();
    for (const kernel of kernels) {
      // Separate passes establish ordering for read-after-write dependencies.
      const pass = encoder.beginComputePass();
      pass.setPipeline(kernel.pipeline);
      pass.setBindGroup(0, kernel.group);
      pass.dispatchWorkgroups(kernel.workgroups);
      pass.end();
    }
    this.device.queue.submit([encoder.finish()]);
  }

  private async read(
    buffer: GPUBuffer,
    elements: number,
  ): Promise<Float32Array> {
    const staging = this.device.createBuffer({
      size: elements * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    try {
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(buffer, 0, staging, 0, elements * 4);
      this.device.queue.submit([encoder.finish()]);
      await staging.mapAsync(GPUMapMode.READ);
      return new Float32Array(staging.getMappedRange().slice(0));
    } finally {
      staging.destroy();
    }
  }

  private async checked<T>(operation: () => Promise<T>): Promise<T> {
    this.device.pushErrorScope('validation');
    let result: {ok: true; value: T} | {ok: false; error: unknown};
    try {
      result = {ok: true, value: await operation()};
    } catch (error) {
      result = {ok: false, error};
    }
    const gpuError = await this.device.popErrorScope();
    if (!result.ok) throw result.error;
    if (gpuError) throw new Error(gpuError.message);
    if (this.failure) throw new Error(this.failure);
    return result.value;
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.disposed) throw new Error('Adapter has been disposed');
    if (this.failure) throw new Error(this.failure);
    if (this.busy) throw new Error('Wait for the current adapter operation');
    this.busy = true;
    try {
      return await this.checked(operation);
    } finally {
      this.busy = false;
    }
  }

  private async forwardInternal(
    hidden: Float32Array,
    baseLogits: Float32Array,
  ) {
    validateVector(hidden, this.config.hiddenSize, 'Hidden state');
    validateVector(baseLogits, this.config.vocabSize, 'Frozen logits');
    this.write(this.h, hidden);
    this.write(this.base, baseLogits);
    this.dispatch(this.kernels.slice(0, 2));
    const values = await this.read(this.logits, this.config.vocabSize);
    validateVector(values, this.config.vocabSize, 'Adapted logits');
    return values;
  }

  forward(
    hidden: Float32Array,
    baseLogits: Float32Array,
  ): Promise<Float32Array> {
    return this.exclusive(() => this.forwardInternal(hidden, baseLogits));
  }

  train(
    hidden: Float32Array,
    baseLogits: Float32Array,
    target: number,
  ): Promise<{loss: number}> {
    return this.trainBatch([{hidden, logits: baseLogits, target}]);
  }

  /** One optimizer step on mean CE. Parameters stay fixed while gradients accumulate. */
  trainBatch(features: readonly LoraFeature[]): Promise<{loss: number}> {
    return this.exclusive(async () => {
      if (features.length < 1 || features.length > 256) {
        throw new Error('A training batch requires 1 to 256 token examples');
      }
      for (const feature of features) {
        validateVector(feature.hidden, this.config.hiddenSize, 'Hidden state');
        validateVector(feature.logits, this.config.vocabSize, 'Frozen logits');
        if (
          !Number.isInteger(feature.target) ||
          feature.target < 0 ||
          feature.target >= this.config.vocabSize
        ) {
          throw new Error('Invalid target token');
        }
      }
      const clear = this.device.createCommandEncoder();
      clear.clearBuffer(this.daSum);
      clear.clearBuffer(this.dbSum);
      this.device.queue.submit([clear.finish()]);
      let totalLoss = 0;
      for (const feature of features) {
        const logits = await this.forwardInternal(
          feature.hidden,
          feature.logits,
        );
        const {loss, gradient} = softmaxCrossEntropy(logits, feature.target);
        totalLoss += loss;
        this.write(this.gradient, gradient);
        // dL/dz and dA/dB accumulations: A/B remain untouched here.
        this.dispatch(this.kernels.slice(2, 5));
      }
      this.write(this.inverseBatch, new Float32Array([1 / features.length]));
      this.dispatch(this.kernels.slice(5));
      await this.device.queue.onSubmittedWorkDone();
      this.steps++;
      return {loss: totalLoss / features.length};
    });
  }

  predict(
    hidden: Float32Array,
    baseLogits: Float32Array,
  ): Promise<{token: number}> {
    return this.exclusive(async () => {
      const logits = await this.forwardInternal(hidden, baseLogits);
      let token = 0;
      for (let i = 1; i < logits.length; i++) {
        if (logits[i]! > logits[token]!) token = i;
      }
      return {token};
    });
  }

  export(): Promise<LoraSnapshot> {
    return this.exclusive(async () => ({
      schemaVersion: 1,
      kind: 'output-head-lora',
      ...this.config,
      steps: this.steps,
      a: Array.from(
        await this.read(this.a, this.config.hiddenSize * this.config.rank),
      ),
      b: Array.from(
        await this.read(this.b, this.config.rank * this.config.vocabSize),
      ),
    }));
  }

  import(value: unknown): Promise<void> {
    return this.exclusive(async () => {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid adapter snapshot');
      const snapshot = value as Record<string, unknown>;
      for (const key of [
        'hiddenSize',
        'vocabSize',
        'rank',
        'learningRate',
        'scale',
        'seed',
      ] as const) {
        if (snapshot[key] !== this.config[key])
          throw new Error(`Adapter ${key} does not match`);
      }
      if (
        snapshot.schemaVersion !== 1 ||
        snapshot.kind !== 'output-head-lora' ||
        typeof snapshot.steps !== 'number' ||
        !Number.isSafeInteger(snapshot.steps) ||
        snapshot.steps < 0
      ) {
        throw new Error('Invalid adapter format or step count');
      }
      const weights = (raw: unknown, length: number) => {
        if (
          !Array.isArray(raw) ||
          raw.length !== length ||
          !raw.every(x => typeof x === 'number' && Number.isFinite(x))
        ) {
          throw new Error('Invalid adapter weights');
        }
        const array = Float32Array.from(raw);
        validateVector(array, length, 'Adapter weights');
        return array;
      };
      const a = weights(snapshot.a, this.config.hiddenSize * this.config.rank);
      const b = weights(snapshot.b, this.config.rank * this.config.vocabSize);
      this.write(this.a, a);
      this.write(this.b, b);
      await this.device.queue.onSubmittedWorkDone();
      this.steps = snapshot.steps;
    });
  }

  dispose(): void {
    if (this.busy)
      throw new Error('Cannot dispose during an adapter operation');
    if (this.disposed) return;
    this.disposed = true;
    for (const buffer of this.buffers) buffer.destroy();
    this.device.destroy();
  }
}
