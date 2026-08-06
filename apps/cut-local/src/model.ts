export type AspectRatio = '16:9' | '1:1' | '9:16';
export type TrackId = 'V2' | 'V1' | 'T1' | 'A1' | 'A2';
export type TrackKind = 'video' | 'title' | 'audio';

export interface Track {
  id: TrackId;
  name: string;
  kind: TrackKind;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
}

export interface VideoTransform {
  fit: 'contain' | 'cover' | 'fill';
  positionX: number; // -100 to 100
  positionY: number; // -100 to 100
  scale: number; // 0.1 to 3.0
  rotation: number; // 0, 90, 180, 270
  cropLeft: number; // 0..100
  cropRight: number; // 0..100
  cropTop: number; // 0..100
  cropBottom: number; // 0..100
  opacity: number; // 0..1
  flipH: boolean;
  flipV: boolean;
}

export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  lastModified: number;
  duration: number;
  width: number;
  height: number;
  rotation: number;
  videoCodec: string | null;
  audioCodec: string | null;
  audioChannels: number;
  sampleRate: number;
  hasVideo: boolean;
  hasAudio: boolean;
  relinkFingerprint: string;
  isOffline?: boolean;
  isDemoAsset?: boolean;
  demoSceneId?: 'BUILD' | 'CUT' | 'SHIP';
  thumbnailDataUrl?: string;
  waveformPoints?: number[];
}

export interface TimelineClip {
  id: string;
  assetId: string | null; // null for title clips
  trackId: TrackId;
  timelineStart: number;
  sourceIn: number;
  sourceOut: number;
  playbackRate: number;
  linkedGroupId: string | null;
  enabled: boolean;
  title?: string;
  videoTransform?: VideoTransform;
  audioGain?: number; // 0..2
  mute?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  transitionIn?: 'none' | 'cross-dissolve' | 'fade-in';
  transitionOut?: 'none' | 'cross-dissolve' | 'fade-out';
}

export interface Project {
  version: 2;
  title: string;
  aspect: AspectRatio;
  tracks: Track[];
  assets: MediaAsset[];
  clips: TimelineClip[];
  selectedClipIds: string[];
  clipboard: TimelineClip[] | null;
}

export interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

export const MIN_CLIP_DURATION = 0.1; // 100ms or 1 frame minimum

export function createDefaultVideoTransform(): VideoTransform {
  return {
    fit: 'contain',
    positionX: 0,
    positionY: 0,
    scale: 1.0,
    rotation: 0,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
    opacity: 1.0,
    flipH: false,
    flipV: false,
  };
}

export function createDefaultTracks(): Track[] {
  return [
    {
      id: 'V2',
      name: 'Video 2 (Overlay)',
      kind: 'video',
      muted: false,
      solo: false,
      locked: false,
      visible: true,
    },
    {
      id: 'V1',
      name: 'Video 1 (Primary)',
      kind: 'video',
      muted: false,
      solo: false,
      locked: false,
      visible: true,
    },
    {
      id: 'T1',
      name: 'Title 1',
      kind: 'title',
      muted: false,
      solo: false,
      locked: false,
      visible: true,
    },
    {
      id: 'A1',
      name: 'Audio 1',
      kind: 'audio',
      muted: false,
      solo: false,
      locked: false,
      visible: true,
    },
    {
      id: 'A2',
      name: 'Audio 2',
      kind: 'audio',
      muted: false,
      solo: false,
      locked: false,
      visible: true,
    },
  ];
}

export function createInitialProject(): Project {
  const assets: MediaAsset[] = [
    {
      id: 'asset-build',
      filename: 'BUILD_Scene.mp4',
      mimeType: 'video/mp4',
      byteSize: 1024000,
      lastModified: Date.now(),
      duration: 3.0,
      width: 1280,
      height: 720,
      rotation: 0,
      videoCodec: 'avc',
      audioCodec: 'aac',
      audioChannels: 2,
      sampleRate: 48000,
      hasVideo: true,
      hasAudio: true,
      relinkFingerprint: 'demo-build-3.0',
      isDemoAsset: true,
      demoSceneId: 'BUILD',
    },
    {
      id: 'asset-cut',
      filename: 'CUT_Scene.mp4',
      mimeType: 'video/mp4',
      byteSize: 1024000,
      lastModified: Date.now(),
      duration: 3.0,
      width: 1280,
      height: 720,
      rotation: 0,
      videoCodec: 'avc',
      audioCodec: 'aac',
      audioChannels: 2,
      sampleRate: 48000,
      hasVideo: true,
      hasAudio: true,
      relinkFingerprint: 'demo-cut-3.0',
      isDemoAsset: true,
      demoSceneId: 'CUT',
    },
    {
      id: 'asset-ship',
      filename: 'SHIP_Scene.mp4',
      mimeType: 'video/mp4',
      byteSize: 1024000,
      lastModified: Date.now(),
      duration: 3.0,
      width: 1280,
      height: 720,
      rotation: 0,
      videoCodec: 'avc',
      audioCodec: 'aac',
      audioChannels: 2,
      sampleRate: 48000,
      hasVideo: true,
      hasAudio: true,
      relinkFingerprint: 'demo-ship-3.0',
      isDemoAsset: true,
      demoSceneId: 'SHIP',
    },
  ];

  const clips: TimelineClip[] = [
    {
      id: 'clip-v1-1',
      assetId: 'asset-build',
      trackId: 'V1',
      timelineStart: 0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-1',
      enabled: true,
      title: 'BUILD PHASE',
      videoTransform: createDefaultVideoTransform(),
    },
    {
      id: 'clip-a1-1',
      assetId: 'asset-build',
      trackId: 'A1',
      timelineStart: 0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-1',
      enabled: true,
      audioGain: 1.0,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
    },
    {
      id: 'clip-v1-2',
      assetId: 'asset-cut',
      trackId: 'V1',
      timelineStart: 3.0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-2',
      enabled: true,
      title: 'KINETIC CUT',
      videoTransform: createDefaultVideoTransform(),
    },
    {
      id: 'clip-a1-2',
      assetId: 'asset-cut',
      trackId: 'A1',
      timelineStart: 3.0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-2',
      enabled: true,
      audioGain: 1.0,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
    },
    {
      id: 'clip-v1-3',
      assetId: 'asset-ship',
      trackId: 'V1',
      timelineStart: 6.0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-3',
      enabled: true,
      title: 'ORBITAL SHIP',
      videoTransform: createDefaultVideoTransform(),
    },
    {
      id: 'clip-a1-3',
      assetId: 'asset-ship',
      trackId: 'A1',
      timelineStart: 6.0,
      sourceIn: 0,
      sourceOut: 3.0,
      playbackRate: 1.0,
      linkedGroupId: 'group-3',
      enabled: true,
      audioGain: 1.0,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
    },
  ];

  return {
    version: 2,
    title: 'Launch Cut NLE Project',
    aspect: '16:9',
    tracks: createDefaultTracks(),
    assets,
    clips,
    selectedClipIds: ['clip-v1-1', 'clip-a1-1'],
    clipboard: null,
  };
}

export function getClipDuration(clip: TimelineClip): number {
  return Math.max(
    MIN_CLIP_DURATION,
    (clip.sourceOut - clip.sourceIn) / clip.playbackRate,
  );
}

export function getTotalDuration(project: Project): number {
  if (project.clips.length === 0) return 0;
  let maxEnd = 0;
  for (const clip of project.clips) {
    if (clip.enabled) {
      const end = clip.timelineStart + getClipDuration(clip);
      if (end > maxEnd) maxEnd = end;
    }
  }
  return Number(maxEnd.toFixed(4));
}

// Media Asset Operations
export function addMediaAsset(project: Project, asset: MediaAsset): Project {
  if (project.assets.some(a => a.id === asset.id)) return project;
  return {
    ...project,
    assets: [...project.assets, asset],
  };
}

export function removeMediaAsset(project: Project, assetId: string): Project {
  const newAssets = project.assets.filter(a => a.id !== assetId);
  const newClips = project.clips.filter(c => c.assetId !== assetId);
  const newSelected = project.selectedClipIds.filter(id =>
    newClips.some(c => c.id === id),
  );

  return {
    ...project,
    assets: newAssets,
    clips: newClips,
    selectedClipIds: newSelected,
  };
}

export function updateAssetStatus(
  project: Project,
  assetId: string,
  isOffline: boolean,
): Project {
  const newAssets = project.assets.map(a =>
    a.id === assetId ? {...a, isOffline} : a,
  );
  return {...project, assets: newAssets};
}

// Insertion & Overwrite Editing
export function insertAssetClip(
  project: Project,
  assetId: string,
  sourceIn: number,
  sourceOut: number,
  targetTime?: number,
): Project {
  const asset = project.assets.find(a => a.id === assetId);
  if (!asset) return project;

  const insertTime = targetTime ?? getTotalDuration(project);
  const sIn = Math.max(0, Math.min(sourceIn, asset.duration));
  const sOut = Math.max(
    sIn + MIN_CLIP_DURATION,
    Math.min(sourceOut, asset.duration),
  );
  const clipDuration = sOut - sIn;

  const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newClips: TimelineClip[] = [];

  // Ripple existing clips that start after insertTime
  const updatedExisting = project.clips.map(clip => {
    if (clip.timelineStart >= insertTime) {
      return {
        ...clip,
        timelineStart: Number((clip.timelineStart + clipDuration).toFixed(4)),
      };
    }
    return clip;
  });

  if (asset.hasVideo) {
    newClips.push({
      id: `clip-v-${Date.now()}-1`,
      assetId: asset.id,
      trackId: 'V1',
      timelineStart: insertTime,
      sourceIn: sIn,
      sourceOut: sOut,
      playbackRate: 1.0,
      linkedGroupId: asset.hasAudio ? groupId : null,
      enabled: true,
      title: asset.filename,
      videoTransform: createDefaultVideoTransform(),
    });
  }

  if (asset.hasAudio) {
    const trackId: TrackId = 'A1';
    newClips.push({
      id: `clip-a-${Date.now()}-2`,
      assetId: asset.id,
      trackId,
      timelineStart: insertTime,
      sourceIn: sIn,
      sourceOut: sOut,
      playbackRate: 1.0,
      linkedGroupId: asset.hasVideo ? groupId : null,
      enabled: true,
      audioGain: 1.0,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
    });
  }

  return {
    ...project,
    clips: [...updatedExisting, ...newClips],
    selectedClipIds: newClips.map(c => c.id),
  };
}

export function addTitleClip(
  project: Project,
  text: string,
  targetTime?: number,
): Project {
  const insertTime = targetTime ?? getTotalDuration(project);
  const duration = 3.0;

  const titleClip: TimelineClip = {
    id: `clip-title-${Date.now()}`,
    assetId: null,
    trackId: 'T1',
    timelineStart: insertTime,
    sourceIn: 0,
    sourceOut: duration,
    playbackRate: 1.0,
    linkedGroupId: null,
    enabled: true,
    title: text,
    videoTransform: createDefaultVideoTransform(),
  };

  return {
    ...project,
    clips: [...project.clips, titleClip],
    selectedClipIds: [titleClip.id],
  };
}

// Split & Razor Operations
export function splitClipsAtPlayhead(
  project: Project,
  playheadTime: number,
): Project {
  let targets = project.clips.filter(
    c =>
      project.selectedClipIds.includes(c.id) &&
      playheadTime > c.timelineStart &&
      playheadTime < c.timelineStart + getClipDuration(c),
  );

  if (targets.length === 0) {
    targets = project.clips.filter(
      c =>
        playheadTime > c.timelineStart &&
        playheadTime < c.timelineStart + getClipDuration(c),
    );
  }

  if (targets.length === 0) return project;

  const linkedGroupIds = new Set(
    targets.map(t => t.linkedGroupId).filter(Boolean),
  );
  if (linkedGroupIds.size > 0) {
    const additionalLinked = project.clips.filter(
      c =>
        c.linkedGroupId &&
        linkedGroupIds.has(c.linkedGroupId) &&
        !targets.includes(c),
    );
    targets.push(...additionalLinked);
  }

  const nextClips = [...project.clips];
  const newSelectedIds: string[] = [];

  for (const target of targets) {
    const index = nextClips.findIndex(c => c.id === target.id);
    if (index === -1) continue;

    const offsetTimeline = playheadTime - target.timelineStart;
    const offsetSource = offsetTimeline * target.playbackRate;
    const splitSource = Number((target.sourceIn + offsetSource).toFixed(4));

    const leftSourceDur = splitSource - target.sourceIn;
    const rightSourceDur = target.sourceOut - splitSource;

    if (
      leftSourceDur < MIN_CLIP_DURATION ||
      rightSourceDur < MIN_CLIP_DURATION
    ) {
      continue;
    }

    const newGroupIdLeft = target.linkedGroupId
      ? `${target.linkedGroupId}-left`
      : null;
    const newGroupIdRight = target.linkedGroupId
      ? `${target.linkedGroupId}-right`
      : null;

    const clipLeft: TimelineClip = {
      ...target,
      id: `${target.id}-left`,
      sourceOut: splitSource,
      linkedGroupId: newGroupIdLeft,
    };

    const clipRight: TimelineClip = {
      ...target,
      id: `${target.id}-right`,
      sourceIn: splitSource,
      timelineStart: Number(playheadTime.toFixed(4)),
      linkedGroupId: newGroupIdRight,
    };

    nextClips.splice(index, 1, clipLeft, clipRight);
    newSelectedIds.push(clipRight.id);
  }

  return {
    ...project,
    clips: nextClips,
    selectedClipIds:
      newSelectedIds.length > 0 ? newSelectedIds : project.selectedClipIds,
  };
}

// Trim Operations
export function trimClipHandle(
  project: Project,
  clipId: string,
  handle: 'left' | 'right',
  deltaSeconds: number,
  ripple: boolean,
): Project {
  const clip = project.clips.find(c => c.id === clipId);
  if (!clip) return project;

  const clipsToTrim = clip.linkedGroupId
    ? project.clips.filter(c => c.linkedGroupId === clip.linkedGroupId)
    : [clip];

  let nextClips = [...project.clips];
  let actualDelta = 0;

  for (const target of clipsToTrim) {
    const idx = nextClips.findIndex(c => c.id === target.id);
    if (idx === -1) continue;

    if (handle === 'left') {
      const maxExpandLeft = -target.sourceIn / target.playbackRate;
      const maxShrinkRight =
        (target.sourceOut - target.sourceIn - MIN_CLIP_DURATION) /
        target.playbackRate;
      const clampedDelta = Math.max(
        maxExpandLeft,
        Math.min(maxShrinkRight, deltaSeconds),
      );
      actualDelta = clampedDelta;

      const newSourceIn = Number(
        (target.sourceIn + clampedDelta * target.playbackRate).toFixed(4),
      );
      const newTimelineStart = Number(
        (target.timelineStart + clampedDelta).toFixed(4),
      );

      nextClips[idx] = {
        ...target,
        sourceIn: newSourceIn,
        timelineStart: newTimelineStart,
      };
    } else {
      const asset = target.assetId
        ? project.assets.find(a => a.id === target.assetId)
        : null;
      const maxSourceOut = asset ? asset.duration : 999;

      const currentDur =
        (target.sourceOut - target.sourceIn) / target.playbackRate;
      const minRightDelta = -(currentDur - MIN_CLIP_DURATION);
      const maxRightDelta =
        (maxSourceOut - target.sourceOut) / target.playbackRate;

      const clampedDelta = Math.max(
        minRightDelta,
        Math.min(maxRightDelta, deltaSeconds),
      );
      actualDelta = clampedDelta;

      const newSourceOut = Number(
        (target.sourceOut + clampedDelta * target.playbackRate).toFixed(4),
      );

      nextClips[idx] = {
        ...target,
        sourceOut: newSourceOut,
      };
    }
  }

  if (ripple && actualDelta !== 0) {
    const trimmedEndTimes = clipsToTrim.map(
      c => c.timelineStart + getClipDuration(c),
    );
    const maxTrimEnd = Math.max(...trimmedEndTimes);

    nextClips = nextClips.map(c => {
      if (
        !clipsToTrim.some(tc => tc.id === c.id) &&
        c.timelineStart >= maxTrimEnd - 0.05
      ) {
        return {
          ...c,
          timelineStart: Number((c.timelineStart + actualDelta).toFixed(4)),
        };
      }
      return c;
    });
  }

  return {
    ...project,
    clips: nextClips,
  };
}

// Move Clips & Dragging
export function moveClips(
  project: Project,
  clipIds: string[],
  deltaTimeline: number,
  targetTrackId?: TrackId,
): Project {
  if (clipIds.length === 0) return project;

  const allIds = new Set(clipIds);
  const selectedClips = project.clips.filter(c => allIds.has(c.id));
  selectedClips.forEach(c => {
    if (c.linkedGroupId) {
      project.clips
        .filter(other => other.linkedGroupId === c.linkedGroupId)
        .forEach(o => allIds.add(o.id));
    }
  });

  const nextClips = project.clips.map(clip => {
    if (!allIds.has(clip.id)) return clip;

    const newStart = Math.max(0, clip.timelineStart + deltaTimeline);
    let newTrack = clip.trackId;

    if (
      targetTrackId &&
      selectedClips.length === 1 &&
      selectedClips[0]?.id === clip.id
    ) {
      const trackDef = project.tracks.find(t => t.id === targetTrackId);
      if (trackDef && !trackDef.locked) {
        const isVideoTrack =
          trackDef.kind === 'video' || trackDef.kind === 'title';
        const isAudioTrack = trackDef.kind === 'audio';
        if (
          (clip.videoTransform && isVideoTrack) ||
          (clip.audioGain !== undefined && isAudioTrack)
        ) {
          newTrack = targetTrackId;
        }
      }
    }

    return {
      ...clip,
      timelineStart: Number(newStart.toFixed(4)),
      trackId: newTrack,
    };
  });

  return {
    ...project,
    clips: nextClips,
  };
}

// Lift & Ripple Delete
export function deleteClips(
  project: Project,
  clipIds: string[],
  ripple: boolean,
): Project {
  if (clipIds.length === 0) return project;

  const allIds = new Set(clipIds);
  project.clips
    .filter(c => allIds.has(c.id))
    .forEach(c => {
      if (c.linkedGroupId) {
        project.clips
          .filter(other => other.linkedGroupId === c.linkedGroupId)
          .forEach(o => allIds.add(o.id));
      }
    });

  const deletedClips = project.clips.filter(c => allIds.has(c.id));
  let nextClips = project.clips.filter(c => !allIds.has(c.id));

  if (ripple && deletedClips.length > 0) {
    const minStart = Math.min(...deletedClips.map(c => c.timelineStart));
    const maxEnd = Math.max(
      ...deletedClips.map(c => c.timelineStart + getClipDuration(c)),
    );
    const gapDuration = maxEnd - minStart;

    nextClips = nextClips.map(c => {
      if (c.timelineStart >= maxEnd - 0.01) {
        return {
          ...c,
          timelineStart: Number(
            Math.max(0, c.timelineStart - gapDuration).toFixed(4),
          ),
        };
      }
      return c;
    });
  }

  return {
    ...project,
    clips: nextClips,
    selectedClipIds: [],
  };
}

// Clipboard: Copy, Cut, Paste, Duplicate
export function copySelection(project: Project): Project {
  if (project.selectedClipIds.length === 0) return project;

  const allIds = new Set(project.selectedClipIds);
  project.clips
    .filter(c => allIds.has(c.id))
    .forEach(c => {
      if (c.linkedGroupId) {
        project.clips
          .filter(other => other.linkedGroupId === c.linkedGroupId)
          .forEach(o => allIds.add(o.id));
      }
    });

  const copied = project.clips.filter(c => allIds.has(c.id));
  return {
    ...project,
    clipboard: JSON.parse(JSON.stringify(copied)),
  };
}

export function cutSelection(project: Project): Project {
  const copiedProject = copySelection(project);
  return deleteClips(copiedProject, project.selectedClipIds, false);
}

export function pasteClipboard(
  project: Project,
  playheadTime: number,
): Project {
  if (!project.clipboard || project.clipboard.length === 0) return project;

  const minStart = Math.min(...project.clipboard.map(c => c.timelineStart));
  const newGroupMap = new Map<string, string>();
  const newSelectedIds: string[] = [];

  const pastedClips = project.clipboard.map(clip => {
    const offset = clip.timelineStart - minStart;
    const newId = `clip-pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let newGroupId = null;
    if (clip.linkedGroupId) {
      if (!newGroupMap.has(clip.linkedGroupId)) {
        newGroupMap.set(
          clip.linkedGroupId,
          `group-pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        );
      }
      newGroupId = newGroupMap.get(clip.linkedGroupId)!;
    }

    newSelectedIds.push(newId);

    return {
      ...clip,
      id: newId,
      timelineStart: Number((playheadTime + offset).toFixed(4)),
      linkedGroupId: newGroupId,
    };
  });

  return {
    ...project,
    clips: [...project.clips, ...pastedClips],
    selectedClipIds: newSelectedIds,
  };
}

export function duplicateSelection(project: Project): Project {
  if (project.selectedClipIds.length === 0) return project;

  const copyProj = copySelection(project);
  const selectedClips = project.clips.filter(c =>
    project.selectedClipIds.includes(c.id),
  );
  const maxEnd = Math.max(
    ...selectedClips.map(c => c.timelineStart + getClipDuration(c)),
  );

  return pasteClipboard(copyProj, maxEnd);
}

export function linkUnlinkSelection(project: Project): Project {
  if (project.selectedClipIds.length === 0) return project;

  const selectedClips = project.clips.filter(c =>
    project.selectedClipIds.includes(c.id),
  );
  const hasLinked = selectedClips.some(c => Boolean(c.linkedGroupId));

  let nextClips = [...project.clips];

  if (hasLinked) {
    const unlinkingGroups = new Set(
      selectedClips.map(c => c.linkedGroupId).filter(Boolean),
    );
    nextClips = nextClips.map(c => {
      if (c.linkedGroupId && unlinkingGroups.has(c.linkedGroupId)) {
        return {...c, linkedGroupId: null};
      }
      return c;
    });
  } else if (selectedClips.length > 1) {
    const newGroupId = `group-linked-${Date.now()}`;
    const selectedSet = new Set(project.selectedClipIds);
    nextClips = nextClips.map(c => {
      if (selectedSet.has(c.id)) {
        return {...c, linkedGroupId: newGroupId};
      }
      return c;
    });
  }

  return {
    ...project,
    clips: nextClips,
  };
}

// Inspector Mutations
export function updateVideoTransform(
  project: Project,
  clipId: string,
  patch: Partial<VideoTransform>,
): Project {
  const nextClips = project.clips.map(clip => {
    if (clip.id === clipId && clip.videoTransform) {
      return {
        ...clip,
        videoTransform: {...clip.videoTransform, ...patch},
      };
    }
    return clip;
  });

  return {...project, clips: nextClips};
}

export function updateAudioProperties(
  project: Project,
  clipId: string,
  patch: {
    audioGain?: number;
    mute?: boolean;
    fadeIn?: number;
    fadeOut?: number;
  },
): Project {
  const nextClips = project.clips.map(clip => {
    if (clip.id === clipId) {
      return {
        ...clip,
        ...patch,
      };
    }
    return clip;
  });

  return {...project, clips: nextClips};
}

export function updateTitleProperties(
  project: Project,
  clipId: string,
  title: string,
): Project {
  const nextClips = project.clips.map(clip => {
    if (clip.id === clipId) {
      return {...clip, title};
    }
    return clip;
  });

  return {...project, clips: nextClips};
}

export function updateAspect(project: Project, aspect: AspectRatio): Project {
  return {...project, aspect};
}

export function nudgeSelection(
  project: Project,
  direction: 'left' | 'right',
  frameSec = 1 / 30,
): Project {
  const delta = direction === 'left' ? -frameSec : frameSec;
  return moveClips(project, project.selectedClipIds, delta);
}

// Snapping Calculator
export function snappingCalculation(
  project: Project,
  candidateTime: number,
  snapThreshold = 0.15,
): number {
  const snapPoints = [0];

  project.clips.forEach(clip => {
    snapPoints.push(clip.timelineStart);
    snapPoints.push(clip.timelineStart + getClipDuration(clip));
  });

  for (const point of snapPoints) {
    if (Math.abs(candidateTime - point) <= snapThreshold) {
      return point;
    }
  }

  return candidateTime;
}

export function calculatePlayback(
  playhead: number,
  isPlaying: boolean,
  deltaSeconds: number,
  totalDuration: number,
): {playhead: number; isPlaying: boolean} {
  if (!isPlaying) return {playhead, isPlaying: false};
  const next = playhead + deltaSeconds;
  if (next >= totalDuration) {
    return {playhead: totalDuration, isPlaying: false};
  }
  return {playhead: Number(next.toFixed(4)), isPlaying: true};
}

// History Stack Helpers
export function createHistory(initialProject: Project): HistoryState {
  return {
    past: [],
    present: initialProject,
    future: [],
  };
}

export function pushHistory(
  history: HistoryState,
  nextProject: Project,
): HistoryState {
  if (JSON.stringify(history.present) === JSON.stringify(nextProject)) {
    return history;
  }
  return {
    past: [...history.past, history.present],
    present: nextProject,
    future: [],
  };
}

export function undoHistory(history: HistoryState): HistoryState {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1]!;
  const newPast = history.past.slice(0, history.past.length - 1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory(history: HistoryState): HistoryState {
  if (history.future.length === 0) return history;
  const next = history.future[0]!;
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}
