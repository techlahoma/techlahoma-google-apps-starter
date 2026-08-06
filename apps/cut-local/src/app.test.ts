import {describe, test, expect} from 'bun:test';
import {
  createInitialProject,
  getTotalDuration,
  insertAssetClip,
  addTitleClip,
  splitClipsAtPlayhead,
  trimClipHandle,
  moveClips,
  deleteClips,
  copySelection,
  pasteClipboard,
  duplicateSelection,
  linkUnlinkSelection,
  updateVideoTransform,
  updateAudioProperties,
  updateTitleProperties,
  updateAspect,
  nudgeSelection,
  snappingCalculation,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from './model.js';
import {isValidProject, loadHistory} from './persistence.js';

describe('CUT/LOCAL V2 Multitrack EDL Model Unit Tests', () => {
  test('Initial V2 project state has 5 tracks and 3 demo scenes totaling 9.0s', () => {
    const proj = createInitialProject();
    expect(proj.version).toBe(2);
    expect(proj.tracks.length).toBe(5);
    expect(proj.assets.length).toBe(3);
    expect(getTotalDuration(proj)).toBe(9.0);
  });

  test('Inserting media asset creates linked video and audio clips', () => {
    let proj = createInitialProject();
    const asset = proj.assets[0]!;
    proj = insertAssetClip(proj, asset.id, 0, 2.0, 9.0);

    expect(getTotalDuration(proj)).toBe(11.0);
    const addedClips = proj.clips.filter(c => c.timelineStart === 9.0);
    expect(addedClips.length).toBe(2);
    expect(addedClips[0]!.trackId).toBe('V1');
    expect(addedClips[1]!.trackId).toBe('A1');
    expect(addedClips[0]!.linkedGroupId).toBe(addedClips[1]!.linkedGroupId);
  });

  test('Adding title clip on T1 track', () => {
    let proj = createInitialProject();
    proj = addTitleClip(proj, 'CUSTOM LOWER THIRD', 2.0);

    const titleClip = proj.clips.find(c => c.trackId === 'T1');
    expect(titleClip).toBeDefined();
    expect(titleClip!.title).toBe('CUSTOM LOWER THIRD');
    expect(titleClip!.timelineStart).toBe(2.0);
  });

  test('Splitting clips at playhead preserves linked synchronization', () => {
    let proj = createInitialProject(); // clip at 0..3s
    proj = splitClipsAtPlayhead(proj, 1.5);

    const vClips = proj.clips.filter(c => c.trackId === 'V1');
    const aClips = proj.clips.filter(c => c.trackId === 'A1');

    expect(vClips.length).toBe(4);
    expect(aClips.length).toBe(4);

    expect(vClips[0]!.sourceOut).toBe(1.5);
    expect(vClips[1]!.sourceIn).toBe(1.5);
    expect(aClips[0]!.sourceOut).toBe(1.5);
    expect(aClips[1]!.sourceIn).toBe(1.5);
  });

  test('Trimming clip left handle changes sourceIn and timelineStart', () => {
    let proj = createInitialProject();
    const vClip = proj.clips.find(c => c.id === 'clip-v1-1')!;

    // Trim left handle right by +0.5s (shortens clip)
    proj = trimClipHandle(proj, vClip.id, 'left', 0.5, false);

    const trimmedV = proj.clips.find(c => c.id === 'clip-v1-1')!;
    const trimmedA = proj.clips.find(c => c.id === 'clip-a1-1')!;

    expect(trimmedV.sourceIn).toBe(0.5);
    expect(trimmedV.timelineStart).toBe(0.5);
    // Linked audio clip trimmed together
    expect(trimmedA.sourceIn).toBe(0.5);
    expect(trimmedA.timelineStart).toBe(0.5);
  });

  test('Trimming clip right handle with ripple adjusts downstream timeline positions', () => {
    let proj = createInitialProject();
    const vClip = proj.clips.find(c => c.id === 'clip-v1-1')!;

    // Trim right handle left by -1.0s with ripple
    proj = trimClipHandle(proj, vClip.id, 'right', -1.0, true);

    const downstreamV = proj.clips.find(c => c.id === 'clip-v1-2')!;
    expect(downstreamV.timelineStart).toBe(2.0); // Moved earlier by 1s
  });

  test('Moving linked clips preserves synchronization across tracks', () => {
    let proj = createInitialProject();
    proj = moveClips(proj, ['clip-v1-1'], 2.0);

    const vClip = proj.clips.find(c => c.id === 'clip-v1-1')!;
    const aClip = proj.clips.find(c => c.id === 'clip-a1-1')!;

    expect(vClip.timelineStart).toBe(2.0);
    expect(aClip.timelineStart).toBe(2.0);
  });

  test('Lift delete leaves gap, Ripple delete eliminates gap', () => {
    const proj = createInitialProject();
    // Lift delete clip 1 (0..3s)
    const liftProj = deleteClips(proj, ['clip-v1-1'], false);
    const remainingLift = liftProj.clips.find(c => c.id === 'clip-v1-2')!;
    expect(remainingLift.timelineStart).toBe(3.0); // Gap left intact

    // Ripple delete clip 1
    const rippleProj = deleteClips(proj, ['clip-v1-1'], true);
    const remainingRipple = rippleProj.clips.find(c => c.id === 'clip-v1-2')!;
    expect(remainingRipple.timelineStart).toBe(0.0); // Gap closed
  });

  test('Copy, Cut, Paste, and Duplicate operations', () => {
    let proj = createInitialProject();
    proj.selectedClipIds = ['clip-v1-1'];

    // Copy & Paste at 9.0s
    proj = copySelection(proj);
    expect(proj.clipboard).toBeDefined();
    proj = pasteClipboard(proj, 9.0);

    expect(getTotalDuration(proj)).toBe(12.0);
    const pastedClip = proj.clips.find(
      c => c.timelineStart === 9.0 && c.trackId === 'V1',
    );
    expect(pastedClip).toBeDefined();
    expect(pastedClip!.assetId).toBe('asset-build');

    // Duplicate
    proj.selectedClipIds = [pastedClip!.id];
    proj = duplicateSelection(proj);
    expect(getTotalDuration(proj)).toBe(15.0);
  });

  test('Link and Unlink selection toggle', () => {
    let proj = createInitialProject();
    proj.selectedClipIds = ['clip-v1-1', 'clip-a1-1'];

    // Unlink
    proj = linkUnlinkSelection(proj);
    expect(proj.clips[0]!.linkedGroupId).toBeNull();
    expect(proj.clips[1]!.linkedGroupId).toBeNull();

    // Link back together
    proj = linkUnlinkSelection(proj);
    expect(proj.clips[0]!.linkedGroupId).not.toBeNull();
    expect(proj.clips[0]!.linkedGroupId).toBe(proj.clips[1]!.linkedGroupId);
  });

  test('Video transform, audio properties, and title updates', () => {
    let proj = createInitialProject();

    proj = updateVideoTransform(proj, 'clip-v1-1', {
      scale: 1.5,
      opacity: 0.8,
      flipH: true,
    });
    const transform = proj.clips[0]!.videoTransform!;
    expect(transform.scale).toBe(1.5);
    expect(transform.opacity).toBe(0.8);
    expect(transform.flipH).toBe(true);

    proj = updateAudioProperties(proj, 'clip-a1-1', {
      audioGain: 1.5,
      fadeIn: 0.5,
      fadeOut: 0.5,
    });
    const aClip = proj.clips.find(c => c.id === 'clip-a1-1')!;
    expect(aClip.audioGain).toBe(1.5);
    expect(aClip.fadeIn).toBe(0.5);

    proj = updateTitleProperties(proj, 'clip-v1-1', 'NEW TITLE TEXT');
    expect(proj.clips[0]!.title).toBe('NEW TITLE TEXT');
  });

  test('Snapping calculation snaps to nearby clip boundaries', () => {
    const proj = createInitialProject(); // Clip boundaries at 0, 3.0, 6.0, 9.0
    const snapped = snappingCalculation(proj, 2.92, 0.15);
    expect(snapped).toBe(3.0);

    const unsnapped = snappingCalculation(proj, 2.5, 0.15);
    expect(unsnapped).toBe(2.5);
  });

  test('Nudge selection frame stepping', () => {
    let proj = createInitialProject();
    proj.selectedClipIds = ['clip-v1-1'];

    proj = nudgeSelection(proj, 'right', 1 / 30);
    expect(proj.clips[0]!.timelineStart).toBeCloseTo(0.0333, 3);
  });

  test('Undo and Redo history stack management', () => {
    const initial = createInitialProject();
    let history = createHistory(initial);

    const step1 = updateAspect(initial, '1:1');
    history = pushHistory(history, step1);
    expect(history.present.aspect).toBe('1:1');

    history = undoHistory(history);
    expect(history.present.aspect).toBe('16:9');

    history = redoHistory(history);
    expect(history.present.aspect).toBe('1:1');
  });

  test('Persistence validation for V2 projects', () => {
    expect(isValidProject(createInitialProject())).toBe(true);
    expect(isValidProject(null)).toBe(false);
    expect(isValidProject({version: 1})).toBe(false);

    const fallback = loadHistory();
    expect(fallback.present.version).toBe(2);
  });
});
