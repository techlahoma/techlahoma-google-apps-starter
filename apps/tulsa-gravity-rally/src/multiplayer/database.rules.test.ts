import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const RULES_PATH = resolve(__dirname, '../../database.rules.json');

describe('Tulsa Gravity Rally Realtime Database rules contract', () => {
  test('keeps global default-deny and separates host and player writes', () => {
    const rules = readRules();
    const roomRules = rules.rules.demos.tulsaGravityRally.v1.rooms.$roomCode;

    expect(rules.rules['.read']).toBe(false);
    expect(rules.rules['.write']).toBe(false);
    expect(roomRules['.write']).toContain("child('hostUid').val() == auth.uid");
    expect(roomRules.players.$uid['.write']).toContain('auth.uid == $uid');
    expect(roomRules.inputs.$uid['.write']).toContain('auth.uid == $uid');
    expect(roomRules.snapshot['.validate']).toContain("['t', 'cars']");
  });

  test('binds allowlisted emoji, claimed slots, and monotonic input', () => {
    const roomRules =
      readRules().rules.demos.tulsaGravityRally.v1.rooms.$roomCode;

    expect(roomRules.players.$uid['.validate']).toContain(
      "child('emojiClaims')",
    );
    expect(roomRules.players.$uid['.validate']).toContain(
      "child('slots').child('11')",
    );
    expect(roomRules.players.$uid.color['.validate']).toContain('#607d8b');
    expect(roomRules.inputs.$uid['.validate']).toContain(
      "newData.child('sequence').val() > data.child('sequence').val()",
    );
    expect(roomRules.inputs.$uid.$other['.validate']).toBe(false);
  });
});

function readRules() {
  return JSON.parse(readFileSync(RULES_PATH, 'utf8'));
}
