import { test, expect, type Page } from '@playwright/test';

export async function runSmokeTest(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // 1. Generate two synthetic real MP4 video files in browser context
  const testFilesInfo = await page.evaluate(async () => {
    // Generate Fixture A (3s, Red, 440Hz Audio)
    const generateFixture = async (name: string, color: string, text: string, dur: number) => {
      const { Output, BufferTarget, CanvasSource, AudioBufferSource, Mp4OutputFormat } = await import('mediabunny');

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;

      const format = new Mp4OutputFormat();
      const target = new BufferTarget();
      const output = new Output({ format, target });

      const canvasSource = new CanvasSource(canvas, { codec: 'avc', bitrate: 1_000_000 });
      output.addVideoTrack(canvasSource);

      const audioCtx = new OfflineAudioContext(2, Math.ceil(dur * 48000), 48000);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(440, 0);
      gain.gain.setValueAtTime(0.3, 0);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(0);
      osc.stop(dur);

      const renderedAudio = await audioCtx.startRendering();
      const audioSource = new AudioBufferSource(renderedAudio);
      output.addAudioTrack(audioSource);

      await output.start();
      const fps = 30;
      const totalFrames = Math.ceil(dur * fps);

      for (let i = 0; i < totalFrames; i++) {
        const t = i / fps;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 320, 160);
        ctx.font = '20px monospace';
        ctx.fillText(`${t.toFixed(2)}s`, 320, 220);
        await canvasSource.add(t, 1 / fps);
      }

      await output.finalize();
      const mimeType = 'video/mp4';
      const blob = new Blob([target.buffer!], { type: mimeType });
      return new File([blob], name, { type: mimeType, lastModified: Date.now() });
    };

    const fileA = await generateFixture('fixture-a.mp4', '#ef4444', 'FIXTURE A', 3.0);
    const fileB = await generateFixture('fixture-b.mp4', '#3b82f6', 'FIXTURE B', 2.0);

    // Register via window file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(fileA);
    dataTransfer.items.add(fileB);

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    return { fileAName: fileA.name, fileBName: fileB.name };
  });

  // 2. Assert assets appear in Media Bin
  await expect(page.locator('.asset-card')).toHaveCount(5); // 3 demo + 2 imported
  await expect(page.locator('#asset-list')).toContainText('fixture-a.mp4');
  await expect(page.locator('#asset-list')).toContainText('fixture-b.mp4');

  // 3. Open Fixture A in Source Monitor
  await page.locator('.asset-card', { hasText: 'fixture-a.mp4' }).dblclick();
  await expect(page.locator('#source-asset-name')).toHaveText('fixture-a.mp4');

  // 4. Set In & Out points
  await page.locator('#source-scrubber').fill('0.5');
  await page.locator('#set-in-btn').click();
  await page.locator('#source-scrubber').fill('2.5');
  await page.locator('#set-out-btn').click();

  await expect(page.locator('#inout-range-text')).toContainText('0.50s - 2.50s');

  // 5. Insert into timeline
  await page.locator('#insert-btn').click();

  // 6. Test playback toggle
  await page.locator('#play-btn').click();
  await page.waitForTimeout(400);
  await page.locator('#play-btn').click();

  // 7. Split at playhead
  await page.locator('#time-scrubber').fill('1.5');
  await page.locator('#split-btn').click();

  // 8. Copy and Paste
  await page.keyboard.press('Control+c');
  await page.locator('#time-scrubber').fill('9.5');
  await page.keyboard.press('Control+v');

  // 9. Duplicate
  await page.keyboard.press('Control+d');

  // 10. Undo and Redo
  await page.locator('#undo-btn').click();
  await page.locator('#redo-btn').click();

  // 11. Ripple delete
  await page.locator('#ripple-delete-btn').click();

  // 12. Video transform adjustment
  await page.locator('#transform-scale').fill('1.5');
  await page.locator('#transform-scale').dispatchEvent('input');

  // 13. Audio Gain adjustment
  await page.locator('#audio-gain').fill('1.2');
  await page.locator('#audio-gain').dispatchEvent('input');

  // 14. Title input
  await page.locator('#title-input').fill('PROVEN REAL MEDIA');
  await page.locator('#title-input').dispatchEvent('input');

  // 15. Export Cancellation Test
  await page.locator('#export-btn').click();
  await expect(page.locator('#export-panel')).toBeVisible();
  await page.locator('#cancel-export-btn').click();
  await expect(page.locator('#export-status-badge')).toHaveText('CANCELLED');

  // 16. Retry and complete export
  await page.locator('#export-btn').click();
  await expect(page.locator('#export-status-badge')).toHaveText('VERIFIED', { timeout: 30000 });

  // 17. Verify exported video specs & playback
  await expect(page.locator('#export-details')).toBeVisible();
  await expect(page.locator('#info-codec')).toContainText('MP4');
  await expect(page.locator('#info-acodec')).toContainText('AAC');

  const currentTime = await page.evaluate(async () => {
    const video = document.getElementById('export-verify-video') as HTMLVideoElement;
    return video.currentTime;
  });
  expect(currentTime).toBeGreaterThan(0);
}

test('CUT/LOCAL Full NLE Real-Media E2E Verification', async ({ page }) => {
  await runSmokeTest(page);
});
