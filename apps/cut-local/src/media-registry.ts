import {
  Input,
  BlobSource,
  ALL_FORMATS,
  Output,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  Mp4OutputFormat,
} from 'mediabunny';
import {type MediaAsset} from './model.js';

export interface RuntimeAsset {
  assetId: string;
  file: File | Blob;
  objectUrl: string;
  videoElement: HTMLVideoElement | null;
  audioBuffer: AudioBuffer | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

const runtimeRegistry = new Map<string, RuntimeAsset>();

export function getRuntimeAsset(assetId: string): RuntimeAsset | null {
  return runtimeRegistry.get(assetId) || null;
}

export function clearRuntimeRegistry(): void {
  runtimeRegistry.forEach(rt => {
    if (rt.objectUrl) URL.revokeObjectURL(rt.objectUrl);
    if (rt.videoElement) {
      rt.videoElement.src = '';
      rt.videoElement.load();
    }
  });
  runtimeRegistry.clear();
}

let audioCtxInstance: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtxInstance) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext})
        .webkitAudioContext;
    audioCtxInstance = new AudioCtxClass({sampleRate: 48000});
  }
  if (audioCtxInstance.state === 'suspended') {
    void audioCtxInstance.resume();
  }
  return audioCtxInstance;
}

export async function parseAndRegisterFile(
  file: File,
): Promise<{asset: MediaAsset; runtime: RuntimeAsset}> {
  const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const objectUrl = URL.createObjectURL(file);

  // 1. Inspect file using Mediabunny Input
  const source = new BlobSource(file);
  const input = new Input({formats: ALL_FORMATS, source});

  let duration = 3.0;
  let hasVideo = false;
  let hasAudio = false;
  let width = 1280;
  let height = 720;
  let rotation = 0;
  let videoCodec: string | null = null;
  let audioCodec: string | null = null;
  let audioChannels = 2;
  let sampleRate = 48000;

  try {
    await input.canRead();
    const computedDur = await input.computeDuration();
    if (typeof computedDur === 'number' && computedDur > 0) {
      duration = Number(computedDur.toFixed(4));
    }
  } catch {
    // Fallback if container duration compute fails
  }

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (videoTrack && (await videoTrack.canDecode())) {
      hasVideo = true;
      width =
        (videoTrack as unknown as {displayWidth?: number}).displayWidth || 1280;
      height =
        (videoTrack as unknown as {displayHeight?: number}).displayHeight ||
        720;
      rotation = videoTrack.rotation || 0;
      videoCodec = videoTrack.codec || 'avc';
    }
  } catch {
    // No decodable video track
  }

  try {
    const audioTrack = await input.getPrimaryAudioTrack();
    if (audioTrack && (await audioTrack.canDecode())) {
      hasAudio = true;
      audioChannels = audioTrack.numberOfChannels || 2;
      sampleRate = audioTrack.sampleRate || 48000;
      audioCodec = audioTrack.codec || 'aac';
    }
  } catch {
    // No decodable audio track
  }

  // If MIME type indicates video/audio, enable flags
  if (file.type.startsWith('video/')) {
    hasVideo = true;
  }
  if (file.type.startsWith('audio/')) {
    hasAudio = true;
    hasVideo = false;
  }

  // 2. Setup Video Element if video asset
  let videoElement: HTMLVideoElement | null = null;
  if (hasVideo) {
    videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.src = objectUrl;
    const ve = videoElement;
    await new Promise<void>(resolve => {
      if (!ve) return resolve();
      ve.onloadedmetadata = () => {
        if (ve.videoWidth) width = ve.videoWidth;
        if (ve.videoHeight) height = ve.videoHeight;
        if (ve.duration && !isNaN(ve.duration)) {
          duration = Number(ve.duration.toFixed(4));
        }
        resolve();
      };
      ve.onerror = () => resolve();
      setTimeout(resolve, 2000); // 2s timeout safety
    });
  }

  // 3. Decode Web Audio buffer if audio asset
  let audioBuffer: AudioBuffer | null = null;
  let waveformPoints: number[] = [];

  if (hasAudio) {
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = getAudioContext();
      audioBuffer = await ctx.decodeAudioData(arrayBuf);
      if (audioBuffer) {
        duration = Number(audioBuffer.duration.toFixed(4));
        waveformPoints = generateWaveformFromAudioBuffer(audioBuffer);
      }
    } catch {
      // Audio decoding fallback
    }
  }

  // 4. Generate Thumbnail Data URL
  let thumbnailDataUrl = '';
  if (hasVideo && videoElement) {
    thumbnailDataUrl = generateVideoThumbnail(videoElement, width, height);
  }

  const asset: MediaAsset = {
    id: assetId,
    filename: file.name,
    mimeType: file.type || 'video/mp4',
    byteSize: file.size,
    lastModified: file.lastModified,
    duration,
    width,
    height,
    rotation,
    videoCodec,
    audioCodec,
    audioChannels,
    sampleRate,
    hasVideo,
    hasAudio,
    relinkFingerprint: `${file.name}-${file.size}-${file.lastModified}`,
    isOffline: false,
    thumbnailDataUrl,
    waveformPoints,
  };

  const runtime: RuntimeAsset = {
    assetId,
    file,
    objectUrl,
    videoElement,
    audioBuffer,
    hasVideo,
    hasAudio,
  };

  runtimeRegistry.set(assetId, runtime);

  return {asset, runtime};
}

function generateVideoThumbnail(
  video: HTMLVideoElement,
  w: number,
  h: number,
): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = Math.round((160 * h) / w) || 90;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return '';
  }
}

function generateWaveformFromAudioBuffer(
  buffer: AudioBuffer,
  samplesCount = 60,
): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samplesCount);
  const points: number[] = [];

  for (let i = 0; i < samplesCount; i++) {
    const blockStart = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[blockStart + j] || 0);
    }
    const avg = sum / blockSize;
    points.push(Number(Math.min(1.0, avg * 3.0).toFixed(2)));
  }

  return points;
}

// Generate Deterministic Synthetic Test Media Fixtures via Mediabunny
export async function generateSyntheticTestFile(options: {
  filename: string;
  color: string;
  text: string;
  duration: number;
  includeAudio: boolean;
}): Promise<File> {
  const {filename, color, text, duration, includeAudio} = options;
  const width = 640;
  const height = 360;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const format = new Mp4OutputFormat();
  const target = new BufferTarget();
  const output = new Output({format, target});

  const canvasSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: 1_000_000,
  });
  output.addVideoTrack(canvasSource);

  // Audio track if requested
  let audioBufferSource: AudioBufferSource | null = null;
  let renderedAudio: AudioBuffer | null = null;
  if (includeAudio) {
    const audioCtx = new OfflineAudioContext(
      2,
      Math.ceil(duration * 48000),
      48000,
    );
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(440, 0); // 440 Hz tone
    gain.gain.setValueAtTime(0.3, 0);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(0);
    osc.stop(duration);

    renderedAudio = await audioCtx.startRendering();
    audioBufferSource = new AudioBufferSource({
      codec: 'aac',
      bitrate: 128_000,
    });
    output.addAudioTrack(audioBufferSource);
  }

  await output.start();

  if (audioBufferSource && renderedAudio) {
    await audioBufferSource.add(renderedAudio);
  }

  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 - 20);

    ctx.font = '24px monospace';
    ctx.fillText(
      `${t.toFixed(2)}s / ${duration.toFixed(2)}s`,
      width / 2,
      height / 2 + 30,
    );

    await canvasSource.add(t, 1 / fps);
  }

  await output.finalize();

  const mimeType = 'video/mp4';
  const blob = new Blob([target.buffer!], {type: mimeType});
  return new File([blob], filename, {type: mimeType, lastModified: Date.now()});
}
