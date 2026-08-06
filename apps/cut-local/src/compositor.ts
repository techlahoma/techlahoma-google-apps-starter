import {
  type Project,
  type AspectRatio,
  type TimelineClip,
  type VideoTransform,
  type MediaAsset,
  getClipDuration,
} from './model.js';
import {getRuntimeAsset} from './media-registry.js';

export function getAspectDimensions(aspect: AspectRatio): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case '16:9':
      return {width: 1280, height: 720};
    case '1:1':
      return {width: 720, height: 720};
    case '9:16':
      return {width: 720, height: 1280};
  }
}

export function renderProgramFrame(
  project: Project,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  timelineTime: number,
): void {
  const {width, height} = getAspectDimensions(project.aspect);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  if ('setAttribute' in canvas) {
    const htmlCanvas = canvas as HTMLCanvasElement;
    if (htmlCanvas.getAttribute('data-render-width') !== String(width)) {
      htmlCanvas.setAttribute('data-render-width', String(width));
      htmlCanvas.setAttribute('data-render-height', String(height));
      htmlCanvas.style.aspectRatio = `${width} / ${height}`;
    }
  }

  const ctx = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, width, height);

  // Render Video Tracks in order: V1, V2
  const videoTrackIds: ('V1' | 'V2')[] = ['V1', 'V2'];

  for (const trackId of videoTrackIds) {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track || !track.visible) continue;

    const activeClips = project.clips.filter(
      c =>
        c.enabled &&
        c.trackId === trackId &&
        timelineTime >= c.timelineStart &&
        timelineTime <= c.timelineStart + getClipDuration(c),
    );

    for (const clip of activeClips) {
      renderClipFrame(ctx, project, clip, timelineTime, width, height);
    }
  }

  // Render Title Track T1
  const titleTrack = project.tracks.find(t => t.id === 'T1');
  if (titleTrack && titleTrack.visible) {
    const activeTitles = project.clips.filter(
      c =>
        c.enabled &&
        c.trackId === 'T1' &&
        timelineTime >= c.timelineStart &&
        timelineTime <= c.timelineStart + getClipDuration(c),
    );

    for (const titleClip of activeTitles) {
      renderTitleClipOverlay(ctx, titleClip, timelineTime, width, height);
    }
  }
}

function renderClipFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  project: Project,
  clip: TimelineClip,
  timelineTime: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const clipDur = getClipDuration(clip);
  const elapsedInClip = timelineTime - clip.timelineStart;
  const sourceTime = clip.sourceIn + elapsedInClip * clip.playbackRate;

  ctx.save();

  // Opacity & Fade Transitions
  let opacity = clip.videoTransform ? clip.videoTransform.opacity : 1.0;
  if (clip.fadeIn && elapsedInClip < clip.fadeIn) {
    opacity *= elapsedInClip / clip.fadeIn;
  } else if (clip.fadeOut && elapsedInClip > clipDur - clip.fadeOut) {
    opacity *= Math.max(0, (clipDur - elapsedInClip) / clip.fadeOut);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  const asset = clip.assetId
    ? project.assets.find(a => a.id === clip.assetId)
    : null;
  const runtime = clip.assetId ? getRuntimeAsset(clip.assetId) : null;

  if (asset && asset.isDemoAsset) {
    // Render demo scene generator
    const sceneId = asset.demoSceneId || 'BUILD';
    if (sceneId === 'BUILD')
      renderBuildScene(ctx, canvasWidth, canvasHeight, sourceTime);
    else if (sceneId === 'CUT')
      renderCutScene(ctx, canvasWidth, canvasHeight, sourceTime);
    else if (sceneId === 'SHIP')
      renderShipScene(ctx, canvasWidth, canvasHeight, sourceTime);
  } else if (runtime && runtime.videoElement) {
    // Render real imported video frame
    const video = runtime.videoElement;
    if (Math.abs(video.currentTime - sourceTime) > 0.05) {
      video.currentTime = sourceTime;
    }
    applyTransformAndDraw(
      ctx,
      video,
      clip.videoTransform,
      asset?.width || 1280,
      asset?.height || 720,
      canvasWidth,
      canvasHeight,
    );
  } else {
    // Fallback clip box if offline or loading
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      clip.title || asset?.filename || 'Media Clip',
      canvasWidth / 2,
      canvasHeight / 2,
    );
  }

  ctx.restore();
}

function applyTransformAndDraw(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  transform: VideoTransform | undefined,
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const t = transform || {
    fit: 'contain',
    positionX: 0,
    positionY: 0,
    scale: 1,
    rotation: 0,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
    opacity: 1,
    flipH: false,
    flipV: false,
  };

  ctx.save();

  // Position offset
  const offsetX = (t.positionX / 100) * canvasWidth;
  const offsetY = (t.positionY / 100) * canvasHeight;

  ctx.translate(canvasWidth / 2 + offsetX, canvasHeight / 2 + offsetY);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(t.flipH ? -t.scale : t.scale, t.flipV ? -t.scale : t.scale);

  // Calculate fit dimensions
  let drawW = canvasWidth;
  let drawH = canvasHeight;

  if (t.fit === 'contain') {
    const scale = Math.min(
      canvasWidth / sourceWidth,
      canvasHeight / sourceHeight,
    );
    drawW = sourceWidth * scale;
    drawH = sourceHeight * scale;
  } else if (t.fit === 'cover') {
    const scale = Math.max(
      canvasWidth / sourceWidth,
      canvasHeight / sourceHeight,
    );
    drawW = sourceWidth * scale;
    drawH = sourceHeight * scale;
  }

  // Calculate crops
  const cropX = (t.cropLeft / 100) * drawW;
  const cropY = (t.cropTop / 100) * drawH;
  const cropW = drawW * (1 - (t.cropLeft + t.cropRight) / 100);
  const cropH = drawH * (1 - (t.cropTop + t.cropBottom) / 100);

  ctx.drawImage(
    source,
    -drawW / 2 + cropX,
    -drawH / 2 + cropY,
    cropW,
    cropH,
    -drawW / 2 + cropX,
    -drawH / 2 + cropY,
    cropW,
    cropH,
  );

  ctx.restore();
}

function renderTitleClipOverlay(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  clip: TimelineClip,
  timelineTime: number,
  w: number,
  h: number,
): void {
  const text = clip.title || 'Title Overlay';
  const pillWidth = Math.min(w * 0.8, 600);
  const pillHeight = 56;
  const pillX = (w - pillWidth) / 2;
  const pillY = h - pillHeight - 40;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, pillY + pillHeight / 2);
  ctx.restore();
}

// Source Monitor Canvas Renderer
export function renderSourceFrame(
  asset: MediaAsset,
  canvas: HTMLCanvasElement,
  sourceTime: number,
): void {
  canvas.width = 640;
  canvas.height = Math.round((640 * asset.height) / asset.width) || 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const runtime = getRuntimeAsset(asset.id);
  if (asset.isDemoAsset) {
    if (asset.demoSceneId === 'BUILD')
      renderBuildScene(ctx, canvas.width, canvas.height, sourceTime);
    else if (asset.demoSceneId === 'CUT')
      renderCutScene(ctx, canvas.width, canvas.height, sourceTime);
    else if (asset.demoSceneId === 'SHIP')
      renderShipScene(ctx, canvas.width, canvas.height, sourceTime);
  } else if (runtime && runtime.videoElement) {
    if (Math.abs(runtime.videoElement.currentTime - sourceTime) > 0.05) {
      runtime.videoElement.currentTime = sourceTime;
    }
    ctx.drawImage(runtime.videoElement, 0, 0, canvas.width, canvas.height);
  }

  // Draw Source Timecode Overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 10, 140, 30);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${sourceTime.toFixed(2)}s / ${asset.duration.toFixed(2)}s`,
    80,
    25,
  );
}

// Demo Graphics Renderers
function renderBuildScene(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    50,
    w / 2,
    h / 2,
    Math.max(w, h),
  );
  grad.addColorStop(0, '#2a1708');
  grad.addColorStop(1, '#0c0703');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 2;
  const gridSize = 60;
  const offset = (t * 40) % gridSize;

  for (let x = offset; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = offset; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  const beamY = ((t * 120) % (h + 200)) - 100;
  ctx.beginPath();
  ctx.moveTo(0, beamY);
  ctx.lineTo(w, beamY + 80);
  ctx.stroke();

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  const boxSize = 120 + Math.sin(t * 2) * 20;
  ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
  ctx.restore();
}

function renderCutScene(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#061325');
  grad.addColorStop(1, '#092842');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const splitOffset = Math.sin(t * 4) * 80;
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.6 + splitOffset, 0);
  ctx.lineTo(w * 0.4 + splitOffset, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  const bladeX = ((t * 300) % (w + 400)) - 200;
  ctx.beginPath();
  ctx.moveTo(bladeX, 0);
  ctx.lineTo(bladeX - 150, h);
  ctx.stroke();
}

function renderShipScene(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const grad = ctx.createRadialGradient(
    w / 2,
    h * 0.6,
    20,
    w / 2,
    h * 0.6,
    Math.max(w, h),
  );
  grad.addColorStop(0, '#0d3822');
  grad.addColorStop(1, '#04120a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 3;
  for (let r = 1; r <= 4; r++) {
    const radius = r * 80 + Math.sin(t * 2 + r) * 10;
    ctx.strokeStyle = r % 2 === 0 ? '#10b981' : 'rgba(52, 211, 153, 0.3)';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.5, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, h * 0.2);
  ctx.stroke();
}
