import {describe, test, expect} from 'bun:test';
import {generateJoinQR} from './qr-generator';

describe('Tulsa Gravity Rally QR generation', () => {
  test('generates a real PNG with a phone-reachable join target', async () => {
    const roomCode = 'RALLY2';
    const result = await generateJoinQR(roomCode, '192.168.1.50');

    expect(result.joinUrl).toBe('http://192.168.1.50/room/RALLY2');
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.warning).toBeUndefined();

    const png = Buffer.from(result.dataUrl.split(',')[1] ?? '', 'base64');
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(280);
    expect(png.readUInt32BE(20)).toBe(280);
    expect(png.byteLength).toBeGreaterThan(1_000);
  });

  test('uses the deployed host in the encoded join target', async () => {
    const roomCode = 'TULSA9';
    const result = await generateJoinQR(
      roomCode,
      'tulsa-gravity-rally-e4f71f.web.app',
    );

    expect(result.joinUrl).toBe(
      'http://tulsa-gravity-rally-e4f71f.web.app/room/TULSA9',
    );
  });
});
