import {chromium} from 'playwright';
import {browserLaunchOptions} from './browser-runtime';

const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage();
  await page.goto('https://gdg-model-workshop.web.app/#fine-tuning');
  const result = await page.evaluate(async () => {
    if (!navigator.gpu) return {gpu: false, reason: 'WebGPU API unavailable'};
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return {gpu: false, reason: 'No GPU adapter'};
    const device = await adapter.requestDevice();
    const size = 4;
    const result = device.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const read = device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const module = device.createShaderModule({
      code: '@group(0) @binding(0) var<storage, read_write> result: array<u32>; @compute @workgroup_size(1) fn main() { result[0] = 6u * 7u; }',
    });
    const pipeline = await device.createComputePipelineAsync({
      layout: 'auto',
      compute: {module, entryPoint: 'main'},
    });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{binding: 0, resource: {buffer: result}}],
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
    encoder.copyBufferToBuffer(result, 0, read, 0, size);
    device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const value = new Uint32Array(read.getMappedRange())[0];
    read.unmap();
    result.destroy();
    read.destroy();
    device.destroy();
    return {
      gpu: true,
      info: {
        vendor: adapter.info.vendor,
        architecture: adapter.info.architecture,
        device: adapter.info.device,
        description: adapter.info.description,
      },
      value,
    };
  });
  console.log(
    JSON.stringify(
      {launch: browserLaunchOptions, version: browser.version(), result},
      null,
      2,
    ),
  );
  if (!result.gpu || result.value !== 42)
    throw new Error('Real WebGPU compute unavailable');
} finally {
  await browser.close();
}
