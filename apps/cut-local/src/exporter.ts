import {
  Output,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  Mp4OutputFormat,
  WebMOutputFormat,
  getFirstEncodableVideoCodec,
  getFirstEncodableAudioCodec,
  type VideoCodec,
  type AudioCodec,
} from 'mediabunny';
import {type Project, getTotalDuration} from './model.js';
import {getAspectDimensions, renderProgramFrame} from './compositor.js';
import {renderOfflineAudioMix} from './audio-engine.js';

export type ExportState =
  | 'idle'
  | 'negotiating'
  | 'decoding'
  | 'encoding'
  | 'mixing-audio'
  | 'finalizing'
  | 'verifying'
  | 'verified'
  | 'cancelled'
  | 'failed';

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec | null;
  container: 'mp4' | 'webm';
  width: number;
  height: number;
  duration: number;
  bytes: number;
  hasAudio: boolean;
}

export interface ExportOptions {
  project: Project;
  onStateChange: (
    state: ExportState,
    progress: number,
    errorMsg?: string,
  ) => void;
  onProgress: (progress: number) => void;
  abortSignal: AbortSignal;
}

export async function exportVideo(
  options: ExportOptions,
): Promise<ExportResult> {
  const {project, onStateChange, onProgress, abortSignal} = options;

  onStateChange('negotiating', 0);

  const {width, height} = getAspectDimensions(project.aspect);
  const videoBitrate = 2_500_000;

  // 1. Negotiate Video Codec
  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], {
    width,
    height,
    bitrate: videoBitrate,
  });

  if (!videoCodec) {
    onStateChange('failed', 0, 'No encodable video codec found in browser.');
    throw new Error('No encodable video codec supported');
  }

  if (abortSignal.aborted) {
    onStateChange('cancelled', 0);
    throw new Error('Export cancelled');
  }

  // 2. Render Audio Mix
  onStateChange('mixing-audio', 0.1);
  const renderedAudioBuffer = await renderOfflineAudioMix(project);
  let hasAudio = Boolean(renderedAudioBuffer && renderedAudioBuffer.length > 0);

  let audioCodec: AudioCodec | null = null;
  if (hasAudio) {
    audioCodec = await getFirstEncodableAudioCodec(['aac', 'opus'], {
      numberOfChannels: 2,
      sampleRate: 48000,
      bitrate: 128_000,
    });
  }

  if (abortSignal.aborted) {
    onStateChange('cancelled', 0);
    throw new Error('Export cancelled');
  }

  // 3. Output Format Selection
  const container: 'mp4' | 'webm' = videoCodec === 'avc' ? 'mp4' : 'webm';
  const format =
    container === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat();

  const target = new BufferTarget();
  const output = new Output({format, target});

  // 4. Video Track
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;

  const canvasSource = new CanvasSource(exportCanvas, {
    codec: videoCodec,
    bitrate: videoBitrate,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(canvasSource);

  // 5. Audio Track if audio present
  let audioSource: AudioBufferSource | null = null;
  if (hasAudio && renderedAudioBuffer && audioCodec) {
    try {
      audioSource = new AudioBufferSource({
        codec: audioCodec,
        bitrate: 128_000,
      });
      output.addAudioTrack(audioSource);
    } catch {
      // Fallback to video-only if audio track fails
      hasAudio = false;
      audioCodec = null;
    }
  }

  await output.start();

  if (audioSource && renderedAudioBuffer) {
    try {
      await audioSource.add(renderedAudioBuffer);
    } catch {
      // Keep the video export usable if audio encoding fails at runtime.
      hasAudio = false;
      audioCodec = null;
    }
  }

  if (abortSignal.aborted) {
    await output.cancel();
    onStateChange('cancelled', 0);
    throw new Error('Export cancelled');
  }

  onStateChange('encoding', 0.2);

  // 6. Encode Video Frames
  const totalDuration = getTotalDuration(project);
  const fps = 30;
  const frameDuration = 1 / fps;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (abortSignal.aborted) {
        await output.cancel();
        onStateChange('cancelled', 0);
        throw new Error('Export cancelled');
      }

      const t = i * frameDuration;
      renderProgramFrame(project, exportCanvas, t);

      await canvasSource.add(t, frameDuration);

      const progress = 0.2 + 0.7 * ((i + 1) / totalFrames);
      onProgress(progress);
    }
  } catch (err) {
    if (abortSignal.aborted) {
      await output.cancel();
      onStateChange('cancelled', 0);
      throw new Error('Export cancelled');
    }
    throw err;
  }

  onStateChange('finalizing', 0.95);

  await output.finalize();

  if (!target.buffer) {
    onStateChange('failed', 0, 'Finalized target buffer is null');
    throw new Error('Target buffer is null');
  }

  let mimeType = container === 'mp4' ? 'video/mp4' : 'video/webm';
  try {
    mimeType = await output.getMimeType();
  } catch {
    // Fallback MIME
  }

  const blob = new Blob([target.buffer], {type: mimeType});

  return {
    blob,
    mimeType,
    videoCodec,
    audioCodec,
    container,
    width,
    height,
    duration: totalDuration,
    bytes: target.buffer.byteLength,
    hasAudio,
  };
}
