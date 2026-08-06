import {type Project, getClipDuration} from './model.js';
import {getRuntimeAsset} from './media-registry.js';

let previewCtx: AudioContext | null = null;
let activeSourceNodes: AudioBufferSourceNode[] = [];

function getPreviewContext(): AudioContext {
  if (!previewCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext})
        .webkitAudioContext;
    previewCtx = new AudioCtxClass({sampleRate: 48000});
  }
  if (previewCtx.state === 'suspended') {
    void previewCtx.resume();
  }
  return previewCtx;
}

export function stopAudioPreview(): void {
  activeSourceNodes.forEach(node => {
    try {
      node.stop();
      node.disconnect();
    } catch {
      // Ignore
    }
  });
  activeSourceNodes = [];
}

export function syncAudioPreview(
  project: Project,
  playheadTime: number,
  isPlaying: boolean,
): void {
  stopAudioPreview();
  if (!isPlaying) return;

  const ctx = getPreviewContext();
  const audioTracks = project.tracks.filter(
    t => t.kind === 'audio' && !t.muted,
  );

  // If any audio track is soloed, filter only soloed tracks
  const anySolo = audioTracks.some(t => t.solo);
  const activeAudioTracks = anySolo
    ? audioTracks.filter(t => t.solo)
    : audioTracks;
  const activeTrackIds = new Set(activeAudioTracks.map(t => t.id));

  const activeAudioClips = project.clips.filter(
    c =>
      c.enabled &&
      !c.mute &&
      activeTrackIds.has(c.trackId) &&
      playheadTime >= c.timelineStart &&
      playheadTime < c.timelineStart + getClipDuration(c),
  );

  const now = ctx.currentTime;

  activeAudioClips.forEach(clip => {
    if (!clip.assetId) return;
    const runtime = getRuntimeAsset(clip.assetId);
    if (!runtime || !runtime.audioBuffer) return;

    const offsetInClip =
      (playheadTime - clip.timelineStart) * clip.playbackRate;
    const startSourceTime = clip.sourceIn + offsetInClip;
    const remainingClipTime =
      getClipDuration(clip) - (playheadTime - clip.timelineStart);

    if (startSourceTime >= clip.sourceOut) return;

    try {
      const source = ctx.createBufferSource();
      source.buffer = runtime.audioBuffer;
      source.playbackRate.value = clip.playbackRate;

      const gainNode = ctx.createGain();
      const gainVal = clip.audioGain ?? 1.0;
      gainNode.gain.setValueAtTime(gainVal, now);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(now, startSourceTime, remainingClipTime);
      activeSourceNodes.push(source);
    } catch {
      // Audio playback start error
    }
  });
}

export async function renderOfflineAudioMix(
  project: Project,
): Promise<AudioBuffer | null> {
  const audioClips = project.clips.filter(
    c => c.enabled && !c.mute && c.assetId,
  );
  if (audioClips.length === 0) return null;

  let hasAudibleTrack = false;
  for (const c of audioClips) {
    const track = project.tracks.find(t => t.id === c.trackId);
    if (track && track.kind === 'audio' && !track.muted) {
      hasAudibleTrack = true;
      break;
    }
  }

  if (!hasAudibleTrack) return null;

  const totalDur = Math.max(
    1,
    project.clips.reduce(
      (acc, c) => Math.max(acc, c.timelineStart + getClipDuration(c)),
      0,
    ),
  );
  const sampleRate = 48000;
  const offlineCtx = new OfflineAudioContext(
    2,
    Math.ceil(totalDur * sampleRate),
    sampleRate,
  );

  let scheduledCount = 0;

  for (const clip of audioClips) {
    const track = project.tracks.find(t => t.id === clip.trackId);
    if (!track || track.kind !== 'audio' || track.muted) continue;

    const runtime = clip.assetId ? getRuntimeAsset(clip.assetId) : null;
    if (!runtime || !runtime.audioBuffer) continue;

    const clipDuration = getClipDuration(clip);
    const sourceDuration = clip.sourceOut - clip.sourceIn;

    try {
      const bufferSource = offlineCtx.createBufferSource();
      bufferSource.buffer = runtime.audioBuffer;
      bufferSource.playbackRate.setValueAtTime(clip.playbackRate, 0);

      const gainNode = offlineCtx.createGain();
      const gainVal = clip.audioGain ?? 1.0;

      const startTime = clip.timelineStart;
      const fadeIn = clip.fadeIn || 0;
      const fadeOut = clip.fadeOut || 0;

      gainNode.gain.setValueAtTime(fadeIn > 0 ? 0 : gainVal, startTime);
      if (fadeIn > 0) {
        gainNode.gain.linearRampToValueAtTime(gainVal, startTime + fadeIn);
      }

      if (fadeOut > 0) {
        gainNode.gain.setValueAtTime(
          gainVal,
          startTime + clipDuration - fadeOut,
        );
        gainNode.gain.linearRampToValueAtTime(0, startTime + clipDuration);
      }

      bufferSource.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      bufferSource.start(startTime, clip.sourceIn, sourceDuration);
      scheduledCount++;
    } catch {
      // Offline mix schedule error
    }
  }

  if (scheduledCount === 0) return null;

  try {
    return await offlineCtx.startRendering();
  } catch {
    return null;
  }
}
