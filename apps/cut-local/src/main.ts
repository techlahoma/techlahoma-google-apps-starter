import {
  type Project,
  type HistoryState,
  getTotalDuration,
  getClipDuration,
  insertAssetClip,
  splitClipsAtPlayhead,
  trimClipHandle,
  deleteClips,
  copySelection,
  pasteClipboard,
  duplicateSelection,
  linkUnlinkSelection,
  updateVideoTransform,
  updateAudioProperties,
  updateTitleProperties,
  updateAspect,
  calculatePlayback,
  pushHistory,
  undoHistory,
  redoHistory,
  removeMediaAsset,
  addMediaAsset,
} from './model.js';
import {
  loadHistory,
  saveHistory,
  resetHistory,
  saveMediaBlob,
} from './persistence.js';
import {
  renderProgramFrame,
  renderSourceFrame,
  getAspectDimensions,
} from './compositor.js';
import {parseAndRegisterFile} from './media-registry.js';
import {syncAudioPreview, stopAudioPreview} from './audio-engine.js';
import {exportVideo, type ExportState, type ExportResult} from './exporter.js';

// State
let history: HistoryState = loadHistory();
let project: Project = history.present;
let playhead = 0;
let isPlaying = false;
let lastTimestamp: number | null = null;
let exportAbortController: AbortController | null = null;

// Source Monitor State
let activeSourceAssetId: string | null = null;
let sourcePlayhead = 0;
let sourceIn = 0;
let sourceOut = 3.0;

// DOM Elements
const importMediaBtn = document.getElementById(
  'import-media-btn',
) as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const dropZone = document.getElementById('drop-zone') as HTMLElement;
const assetList = document.getElementById('asset-list') as HTMLElement;
const assetCountBadge = document.getElementById(
  'asset-count-badge',
) as HTMLElement;

const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

// Source Monitor Elements
const sourceCanvas = document.getElementById(
  'source-canvas',
) as HTMLCanvasElement;
const sourceAssetName = document.getElementById(
  'source-asset-name',
) as HTMLElement;
const sourceTimecode = document.getElementById(
  'source-timecode',
) as HTMLElement;
const sourceScrubber = document.getElementById(
  'source-scrubber',
) as HTMLInputElement;
const setInBtn = document.getElementById('set-in-btn') as HTMLButtonElement;
const setOutBtn = document.getElementById('set-out-btn') as HTMLButtonElement;
const clearInoutBtn = document.getElementById(
  'clear-inout-btn',
) as HTMLButtonElement;
const insertBtn = document.getElementById('insert-btn') as HTMLButtonElement;
const inoutRangeText = document.getElementById(
  'inout-range-text',
) as HTMLElement;

// Program Monitor Elements
const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const playIcon = document.getElementById('play-icon') as HTMLElement;
const pauseIcon = document.getElementById('pause-icon') as HTMLElement;
const timecodeDisplay = document.getElementById(
  'timecode-display',
) as HTMLElement;
const timeScrubber = document.getElementById(
  'time-scrubber',
) as HTMLInputElement;
const aspect169Btn = document.getElementById(
  'aspect-16-9',
) as HTMLButtonElement;
const aspect11Btn = document.getElementById('aspect-1-1') as HTMLButtonElement;
const aspect916Btn = document.getElementById(
  'aspect-9-16',
) as HTMLButtonElement;

// Inspector Elements
const selectedClipBadge = document.getElementById(
  'selected-clip-badge',
) as HTMLElement;
const selectedClipIdEl = document.getElementById(
  'selected-clip-id',
) as HTMLElement;
const transformFitSelect = document.getElementById(
  'transform-fit',
) as HTMLSelectElement;
const transformScaleInput = document.getElementById(
  'transform-scale',
) as HTMLInputElement;
const scaleValLabel = document.getElementById('scale-val') as HTMLElement;
const transformRotationSelect = document.getElementById(
  'transform-rotation',
) as HTMLSelectElement;
const transformOpacityInput = document.getElementById(
  'transform-opacity',
) as HTMLInputElement;
const opacityValLabel = document.getElementById('opacity-val') as HTMLElement;
const audioGainInput = document.getElementById(
  'audio-gain',
) as HTMLInputElement;
const gainValLabel = document.getElementById('gain-val') as HTMLElement;
const audioFadeInInput = document.getElementById(
  'audio-fade-in',
) as HTMLInputElement;
const audioFadeOutInput = document.getElementById(
  'audio-fade-out',
) as HTMLInputElement;
const titleInput = document.getElementById('title-input') as HTMLInputElement;

const trimStartMinusBtn = document.getElementById(
  'trim-start-minus',
) as HTMLButtonElement;
const trimStartPlusBtn = document.getElementById(
  'trim-start-plus',
) as HTMLButtonElement;
const trimEndMinusBtn = document.getElementById(
  'trim-end-minus',
) as HTMLButtonElement;
const trimEndPlusBtn = document.getElementById(
  'trim-end-plus',
) as HTMLButtonElement;

// Timeline Elements
const splitBtn = document.getElementById('split-btn') as HTMLButtonElement;
const linkBtn = document.getElementById('link-btn') as HTMLButtonElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const pasteBtn = document.getElementById('paste-btn') as HTMLButtonElement;
const duplicateBtn = document.getElementById(
  'duplicate-btn',
) as HTMLButtonElement;
const liftDeleteBtn = document.getElementById(
  'lift-delete-btn',
) as HTMLButtonElement;
const rippleDeleteBtn = document.getElementById(
  'ripple-delete-btn',
) as HTMLButtonElement;
const multitrackLanes = document.getElementById(
  'multitrack-lanes',
) as HTMLElement;
const timelineRuler = document.getElementById('timeline-ruler') as HTMLElement;
const playheadEl = document.getElementById('playhead') as HTMLElement;

// Export Panel Elements
const exportPanel = document.getElementById('export-panel') as HTMLElement;
const exportStatusBadge = document.getElementById(
  'export-status-badge',
) as HTMLElement;
const cancelExportBtn = document.getElementById(
  'cancel-export-btn',
) as HTMLButtonElement;
const exportProgressBar = document.getElementById(
  'export-progress-bar',
) as HTMLElement;
const exportProgressFill = document.getElementById(
  'export-progress-fill',
) as HTMLElement;
const exportDetails = document.getElementById('export-details') as HTMLElement;
const exportVerifyVideo = document.getElementById(
  'export-verify-video',
) as HTMLVideoElement;
const infoCodec = document.getElementById('info-codec') as HTMLElement;
const infoAcodec = document.getElementById('info-acodec') as HTMLElement;
const infoDims = document.getElementById('info-dims') as HTMLElement;
const infoDuration = document.getElementById('info-duration') as HTMLElement;
const infoSize = document.getElementById('info-size') as HTMLElement;
const exportDownloadLink = document.getElementById(
  'export-download-link',
) as HTMLAnchorElement;
const exportReplayBtn = document.getElementById(
  'export-replay-btn',
) as HTMLButtonElement;

let currentExportUrl: string | null = null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function applyEdit(nextProject: Project): void {
  history = pushHistory(history, nextProject);
  saveHistory(history);
  updateUI();
}

function updateUI(): void {
  project = history.present;
  const totalDur = getTotalDuration(project);

  if (playhead > totalDur) playhead = totalDur;

  timeScrubber.max = totalDur.toFixed(2);
  timeScrubber.value = playhead.toFixed(2);

  aspect169Btn.classList.toggle('active', project.aspect === '16:9');
  aspect11Btn.classList.toggle('active', project.aspect === '1:1');
  aspect916Btn.classList.toggle('active', project.aspect === '9:16');

  const {width, height} = getAspectDimensions(project.aspect);
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute('data-render-width', String(width));
  canvas.setAttribute('data-render-height', String(height));
  canvas.style.aspectRatio = `${width} / ${height}`;

  undoBtn.disabled = history.past.length === 0;
  redoBtn.disabled = history.future.length === 0;

  // Selected Clip Inspector
  const selectedClip = project.clips.find(c =>
    project.selectedClipIds.includes(c.id),
  );
  if (selectedClip) {
    selectedClipBadge.textContent = selectedClip.trackId;
    selectedClipBadge.className = `badge ${selectedClip.trackId.toLowerCase()}`;
    selectedClipIdEl.textContent = selectedClip.id;

    if (document.activeElement !== titleInput) {
      titleInput.value = selectedClip.title || '';
    }

    if (selectedClip.videoTransform) {
      transformFitSelect.value = selectedClip.videoTransform.fit;
      transformScaleInput.value = String(selectedClip.videoTransform.scale);
      scaleValLabel.textContent = `${selectedClip.videoTransform.scale.toFixed(1)}x`;
      transformRotationSelect.value = String(
        selectedClip.videoTransform.rotation,
      );
      transformOpacityInput.value = String(selectedClip.videoTransform.opacity);
      opacityValLabel.textContent = `${Math.round(selectedClip.videoTransform.opacity * 100)}%`;
    }

    if (selectedClip.audioGain !== undefined) {
      audioGainInput.value = String(selectedClip.audioGain);
      gainValLabel.textContent = `${Math.round(selectedClip.audioGain * 100)}%`;
      audioFadeInInput.value = String(selectedClip.fadeIn || 0);
      audioFadeOutInput.value = String(selectedClip.fadeOut || 0);
    }
  } else {
    selectedClipBadge.textContent = 'NONE';
    selectedClipIdEl.textContent = 'No clip selected';
  }

  // Media Bin & Timeline rendering
  renderMediaBin();
  renderMultitrackTimeline();
  renderTimelineRuler();
}

function renderMediaBin(): void {
  assetList.innerHTML = '';
  assetCountBadge.textContent = `${project.assets.length} Assets`;

  project.assets.forEach(asset => {
    const card = document.createElement('div');
    card.className = `asset-card${asset.id === activeSourceAssetId ? ' selected' : ''}`;
    card.setAttribute('data-asset-id', asset.id);

    const thumbHtml = asset.thumbnailDataUrl
      ? `<img src="${asset.thumbnailDataUrl}" class="asset-thumb" alt="${asset.filename}" />`
      : `<div class="asset-thumb" style="background:#1e293b; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:10px;">${asset.hasAudio ? 'AUDIO' : 'VIDEO'}</div>`;

    card.innerHTML = `
      ${thumbHtml}
      <div class="asset-info">
        <div class="asset-name" title="${asset.filename}">${asset.filename}</div>
        <div class="asset-meta">${asset.duration.toFixed(2)}s • ${asset.width}x${asset.height} • ${formatBytes(asset.byteSize)}</div>
      </div>
      <button class="btn btn-ghost btn-sm remove-asset-btn" title="Remove Asset">×</button>
    `;

    // Double click to open in Source Monitor
    card.addEventListener('dblclick', () => {
      openInSourceMonitor(asset.id);
    });

    card.addEventListener('click', () => {
      openInSourceMonitor(asset.id);
    });

    const removeBtn = card.querySelector('.remove-asset-btn');
    removeBtn?.addEventListener('click', e => {
      e.stopPropagation();
      applyEdit(removeMediaAsset(project, asset.id));
    });

    assetList.appendChild(card);
  });

  if (!activeSourceAssetId && project.assets.length > 0) {
    openInSourceMonitor(project.assets[0]!.id);
  }
}

function openInSourceMonitor(assetId: string): void {
  const asset = project.assets.find(a => a.id === assetId);
  if (!asset) return;

  activeSourceAssetId = asset.id;
  sourcePlayhead = 0;
  sourceIn = 0;
  sourceOut = asset.duration;

  sourceAssetName.textContent = asset.filename;
  sourceScrubber.max = asset.duration.toFixed(2);
  sourceScrubber.value = '0';

  updateSourceMonitorUI();
}

function updateSourceMonitorUI(): void {
  if (!activeSourceAssetId) return;
  const asset = project.assets.find(a => a.id === activeSourceAssetId);
  if (!asset) return;

  sourceTimecode.textContent = `${sourcePlayhead.toFixed(2)}s / ${asset.duration.toFixed(2)}s`;
  inoutRangeText.textContent = `${sourceIn.toFixed(2)}s - ${sourceOut.toFixed(2)}s (${(sourceOut - sourceIn).toFixed(2)}s)`;

  renderSourceFrame(asset, sourceCanvas, sourcePlayhead);
}

function renderMultitrackTimeline(): void {
  const trackLanes = multitrackLanes.querySelectorAll('.track-lane');
  trackLanes.forEach(lane => (lane.innerHTML = ''));

  const totalDur = getTotalDuration(project);

  project.clips.forEach(clip => {
    const lane = multitrackLanes.querySelector(
      `.track-lane[data-track-id="${clip.trackId}"]`,
    );
    if (!lane) return;

    const clipEl = document.createElement('div');
    const clipDur = getClipDuration(clip);
    const leftPct = (clip.timelineStart / Math.max(1, totalDur)) * 100;
    const widthPct = (clipDur / Math.max(1, totalDur)) * 100;

    clipEl.className = `timeline-clip${project.selectedClipIds.includes(clip.id) ? ' selected' : ''}`;
    clipEl.style.left = `${leftPct}%`;
    clipEl.style.width = `${widthPct}%`;
    clipEl.setAttribute('data-clip-id', clip.id);
    clipEl.setAttribute('data-track', clip.trackId);
    clipEl.setAttribute('data-start', clip.timelineStart.toFixed(2));
    clipEl.setAttribute('data-end', (clip.timelineStart + clipDur).toFixed(2));
    clipEl.setAttribute('data-source-in', clip.sourceIn.toFixed(2));
    clipEl.setAttribute('data-source-out', clip.sourceOut.toFixed(2));

    const asset = clip.assetId
      ? project.assets.find(a => a.id === clip.assetId)
      : null;
    const displayTitle = clip.title || asset?.filename || clip.id;

    clipEl.innerHTML = `
      <div class="clip-title-text">${displayTitle}</div>
      <div class="clip-timing-text">${clipDur.toFixed(2)}s</div>
    `;

    clipEl.addEventListener('click', e => {
      e.stopPropagation();
      if (e.shiftKey) {
        const set = new Set(project.selectedClipIds);
        if (set.has(clip.id)) set.delete(clip.id);
        else set.add(clip.id);
        project.selectedClipIds = Array.from(set);
      } else {
        project.selectedClipIds = [clip.id];
      }
      updateUI();
    });

    lane.appendChild(clipEl);
  });
}

function renderTimelineRuler(): void {
  timelineRuler.innerHTML = '';
  const totalDur = getTotalDuration(project);
  const step = 1.0;

  for (let sec = 0; sec <= totalDur; sec += step) {
    const pct = (sec / Math.max(1, totalDur)) * 100;
    const tick = document.createElement('div');
    tick.className = 'ruler-tick';
    tick.style.left = `${pct}%`;
    tick.textContent = `${sec}s`;
    timelineRuler.appendChild(tick);
  }
}

// Animation / Render Loop
function animationLoop(timestamp: number): void {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }
  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  const totalDur = getTotalDuration(project);

  if (isPlaying) {
    const playback = calculatePlayback(
      playhead,
      isPlaying,
      deltaSeconds,
      totalDur,
    );
    playhead = playback.playhead;
    isPlaying = playback.isPlaying;

    syncAudioPreview(project, playhead, isPlaying);

    if (!isPlaying) {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      stopAudioPreview();
    }
  }

  // Render Program Frame
  renderProgramFrame(project, canvas, playhead);

  // Update playhead indicator & timecode
  const pct = totalDur > 0 ? (playhead / totalDur) * 100 : 0;
  playheadEl.style.left = `${pct}%`;
  playheadEl.setAttribute('data-seconds', playhead.toFixed(2));
  timeScrubber.value = playhead.toFixed(2);
  timecodeDisplay.textContent = `${playhead.toFixed(2)}s / ${totalDur.toFixed(2)}s`;

  requestAnimationFrame(animationLoop);
}

// Event Listeners Setup
function setupEventListeners(): void {
  // File Import Listeners
  importMediaBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files) return;
    for (const file of Array.from(fileInput.files)) {
      const {asset} = await parseAndRegisterFile(file);
      await saveMediaBlob(asset.id, file);
      applyEdit(addMediaAsset(project, asset));
    }
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () =>
    dropZone.classList.remove('dragover'),
  );
  dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer?.files) {
      for (const file of Array.from(e.dataTransfer.files)) {
        const {asset} = await parseAndRegisterFile(file);
        await saveMediaBlob(asset.id, file);
        applyEdit(addMediaAsset(project, asset));
      }
    }
  });

  // Play / Pause
  playBtn.addEventListener('click', () => {
    const totalDur = getTotalDuration(project);
    if (playhead >= totalDur) playhead = 0;
    isPlaying = !isPlaying;
    lastTimestamp = null;
    playIcon.classList.toggle('hidden', isPlaying);
    pauseIcon.classList.toggle('hidden', !isPlaying);
    if (!isPlaying) stopAudioPreview();
  });

  timeScrubber.addEventListener('input', () => {
    playhead = parseFloat(timeScrubber.value);
  });

  // Aspect Ratio
  aspect169Btn.addEventListener('click', () =>
    applyEdit(updateAspect(project, '16:9')),
  );
  aspect11Btn.addEventListener('click', () =>
    applyEdit(updateAspect(project, '1:1')),
  );
  aspect916Btn.addEventListener('click', () =>
    applyEdit(updateAspect(project, '9:16')),
  );

  // Source Monitor Controls
  sourceScrubber.addEventListener('input', () => {
    sourcePlayhead = parseFloat(sourceScrubber.value);
    updateSourceMonitorUI();
  });

  setInBtn.addEventListener('click', () => {
    sourceIn = sourcePlayhead;
    updateSourceMonitorUI();
  });
  setOutBtn.addEventListener('click', () => {
    sourceOut = sourcePlayhead;
    updateSourceMonitorUI();
  });
  clearInoutBtn.addEventListener('click', () => {
    if (activeSourceAssetId) {
      const asset = project.assets.find(a => a.id === activeSourceAssetId);
      sourceIn = 0;
      sourceOut = asset ? asset.duration : 3.0;
      updateSourceMonitorUI();
    }
  });

  insertBtn.addEventListener('click', () => {
    if (activeSourceAssetId) {
      applyEdit(
        insertAssetClip(
          project,
          activeSourceAssetId,
          sourceIn,
          sourceOut,
          playhead,
        ),
      );
    }
  });

  // Inspector Controls
  transformFitSelect.addEventListener('change', () => {
    if (project.selectedClipIds[0]) {
      const fit = transformFitSelect.value;
      if (fit !== 'contain' && fit !== 'cover' && fit !== 'fill') return;
      applyEdit(
        updateVideoTransform(project, project.selectedClipIds[0], {
          fit,
        }),
      );
    }
  });

  transformScaleInput.addEventListener('input', () => {
    const val = parseFloat(transformScaleInput.value);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateVideoTransform(project, project.selectedClipIds[0], {scale: val}),
      );
    }
  });

  transformRotationSelect.addEventListener('change', () => {
    const val = parseInt(transformRotationSelect.value, 10);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateVideoTransform(project, project.selectedClipIds[0], {
          rotation: val,
        }),
      );
    }
  });

  transformOpacityInput.addEventListener('input', () => {
    const val = parseFloat(transformOpacityInput.value);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateVideoTransform(project, project.selectedClipIds[0], {
          opacity: val,
        }),
      );
    }
  });

  audioGainInput.addEventListener('input', () => {
    const val = parseFloat(audioGainInput.value);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateAudioProperties(project, project.selectedClipIds[0], {
          audioGain: val,
        }),
      );
    }
  });

  audioFadeInInput.addEventListener('change', () => {
    const val = parseFloat(audioFadeInInput.value);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateAudioProperties(project, project.selectedClipIds[0], {
          fadeIn: val,
        }),
      );
    }
  });

  audioFadeOutInput.addEventListener('change', () => {
    const val = parseFloat(audioFadeOutInput.value);
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateAudioProperties(project, project.selectedClipIds[0], {
          fadeOut: val,
        }),
      );
    }
  });

  titleInput.addEventListener('input', () => {
    if (project.selectedClipIds[0]) {
      applyEdit(
        updateTitleProperties(
          project,
          project.selectedClipIds[0],
          titleInput.value,
        ),
      );
    }
  });

  // Trim Buttons
  trimStartMinusBtn.addEventListener('click', () => {
    if (project.selectedClipIds[0])
      applyEdit(
        trimClipHandle(
          project,
          project.selectedClipIds[0],
          'left',
          -0.25,
          false,
        ),
      );
  });
  trimStartPlusBtn.addEventListener('click', () => {
    if (project.selectedClipIds[0])
      applyEdit(
        trimClipHandle(
          project,
          project.selectedClipIds[0],
          'left',
          0.25,
          false,
        ),
      );
  });
  trimEndMinusBtn.addEventListener('click', () => {
    if (project.selectedClipIds[0])
      applyEdit(
        trimClipHandle(
          project,
          project.selectedClipIds[0],
          'right',
          -0.25,
          false,
        ),
      );
  });
  trimEndPlusBtn.addEventListener('click', () => {
    if (project.selectedClipIds[0])
      applyEdit(
        trimClipHandle(
          project,
          project.selectedClipIds[0],
          'right',
          0.25,
          false,
        ),
      );
  });

  // Timeline Toolbar Actions
  splitBtn.addEventListener('click', () =>
    applyEdit(splitClipsAtPlayhead(project, playhead)),
  );
  linkBtn.addEventListener('click', () =>
    applyEdit(linkUnlinkSelection(project)),
  );
  copyBtn.addEventListener('click', () => applyEdit(copySelection(project)));
  pasteBtn.addEventListener('click', () =>
    applyEdit(pasteClipboard(project, playhead)),
  );
  duplicateBtn.addEventListener('click', () =>
    applyEdit(duplicateSelection(project)),
  );
  liftDeleteBtn.addEventListener('click', () =>
    applyEdit(deleteClips(project, project.selectedClipIds, false)),
  );
  rippleDeleteBtn.addEventListener('click', () =>
    applyEdit(deleteClips(project, project.selectedClipIds, true)),
  );

  // Undo / Redo / Reset
  undoBtn.addEventListener('click', () => {
    history = undoHistory(history);
    saveHistory(history);
    updateUI();
  });
  redoBtn.addEventListener('click', () => {
    history = redoHistory(history);
    saveHistory(history);
    updateUI();
  });
  resetBtn.addEventListener('click', () => {
    history = resetHistory();
    playhead = 0;
    isPlaying = false;
    stopAudioPreview();
    updateUI();
  });

  // Export Button
  exportBtn.addEventListener('click', async () => {
    if (exportAbortController) return;

    isPlaying = false;
    stopAudioPreview();

    exportPanel.classList.remove('hidden');
    exportProgressBar.classList.remove('hidden');
    exportProgressFill.style.width = '0%';
    exportBtn.disabled = true;
    cancelExportBtn.disabled = false;
    exportDetails.classList.add('hidden');

    exportAbortController = new AbortController();

    try {
      const result = await exportVideo({
        project,
        onStateChange: (state, progress, errorMsg) => {
          updateExportBadge(state, errorMsg);
          exportProgressFill.style.width = `${Math.round(progress * 100)}%`;
        },
        onProgress: progress => {
          exportProgressFill.style.width = `${Math.round(progress * 100)}%`;
        },
        abortSignal: exportAbortController.signal,
      });

      await verifyAndShowExport(result);
    } catch (err) {
      if (exportAbortController?.signal.aborted) {
        updateExportBadge('cancelled');
      } else {
        updateExportBadge(
          'failed',
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      exportAbortController = null;
      exportBtn.disabled = false;
      cancelExportBtn.disabled = true;
    }
  });

  cancelExportBtn.addEventListener('click', () => {
    if (exportAbortController) {
      exportAbortController.abort();
    }
  });

  exportReplayBtn.addEventListener('click', () => {
    exportVerifyVideo.currentTime = 0;
    void exportVerifyVideo.play();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', e => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      playBtn.click();
    } else if (e.key === 'i' || e.key === 'I') {
      setInBtn.click();
    } else if (e.key === 'o' || e.key === 'O') {
      setOutBtn.click();
    } else if (e.key === 's' || e.key === 'S') {
      splitBtn.click();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.shiftKey) rippleDeleteBtn.click();
      else liftDeleteBtn.click();
    } else if (e.metaKey || e.ctrlKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redoBtn.click();
        else undoBtn.click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redoBtn.click();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        copyBtn.click();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        pasteBtn.click();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        duplicateBtn.click();
      }
    }
  });
}

function updateExportBadge(state: ExportState, errorMsg?: string): void {
  exportStatusBadge.textContent = state.toUpperCase();
  exportStatusBadge.className = `badge badge-${state}`;
  if (state === 'failed' && errorMsg) {
    exportStatusBadge.title = errorMsg;
  }
}

async function verifyAndShowExport(result: ExportResult): Promise<void> {
  updateExportBadge('verifying');

  if (currentExportUrl) URL.revokeObjectURL(currentExportUrl);
  currentExportUrl = URL.createObjectURL(result.blob);
  exportVerifyVideo.src = currentExportUrl;

  await new Promise<void>((res, rej) => {
    const timer = setTimeout(() => rej(new Error('Video load timeout')), 10000);
    exportVerifyVideo.onloadedmetadata = () => {
      clearTimeout(timer);
      res();
    };
    exportVerifyVideo.onerror = () => {
      clearTimeout(timer);
      rej(new Error('Video element error'));
    };
  });

  if (
    exportVerifyVideo.videoWidth !== result.width ||
    exportVerifyVideo.videoHeight !== result.height
  ) {
    throw new Error(
      `Dimensions mismatch: ${exportVerifyVideo.videoWidth}x${exportVerifyVideo.videoHeight}`,
    );
  }

  const beforeTime = exportVerifyVideo.currentTime;
  await exportVerifyVideo.play();
  await new Promise(r => setTimeout(r, 350));
  if (exportVerifyVideo.currentTime <= beforeTime) {
    throw new Error('Video currentTime failed to advance');
  }
  exportVerifyVideo.pause();

  updateExportBadge('verified');

  infoCodec.textContent = `${result.container.toUpperCase()} (${result.videoCodec})`;
  infoAcodec.textContent = result.audioCodec
    ? result.audioCodec.toUpperCase()
    : 'None';
  infoDims.textContent = `${result.width} × ${result.height}`;
  infoDuration.textContent = `${result.duration.toFixed(2)}s`;
  infoSize.textContent = formatBytes(result.bytes);

  exportDownloadLink.href = currentExportUrl;
  exportDownloadLink.download = `launch-cut-${project.aspect.replace(':', 'x')}.${result.container}`;

  exportDetails.classList.remove('hidden');
}

// Initial Kickoff
setupEventListeners();
updateUI();
requestAnimationFrame(animationLoop);
