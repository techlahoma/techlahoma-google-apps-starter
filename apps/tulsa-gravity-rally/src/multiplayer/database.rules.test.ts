import {describe, test, expect} from 'bun:test';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {
  validatePlayerJoinRule,
  validateHostActionRule,
  validatePlayerInputRule,
} from './database-rules-validator';

describe('Tulsa Gravity Rally - Realtime Database Security Rules', () => {
  test('database.rules.json file exists and contains default-deny & valid JSON structure', () => {
    const rulesPath = resolve(__dirname, '../../database.rules.json');
    const content = readFileSync(rulesPath, 'utf8');
    const rulesJson = JSON.parse(content);

    expect(rulesJson.rules['.read']).toBe(false);
    expect(rulesJson.rules['.write']).toBe(false);
    expect(rulesJson.rules.rooms.$roomCode.status['.validate']).toBeDefined();
    expect(
      rulesJson.rules.rooms.$roomCode.players.$uid['.validate'],
    ).toBeDefined();
  });

  test('Host action rule permits host UID and rejects non-host', () => {
    const valid = validateHostActionRule('host-123', 'host-123', 'snapshot');
    expect(valid.allowed).toBe(true);

    const invalid = validateHostActionRule(
      'player-456',
      'host-123',
      'snapshot',
    );
    expect(invalid.allowed).toBe(false);
    expect(invalid.reason).toContain('Only room host UID can write');
  });

  test('Player join rule permits authenticated user with valid allowlist emoji', () => {
    const valid = validatePlayerJoinRule('player-1', 'lobby', '🚀');
    expect(valid.allowed).toBe(true);
  });

  test('Player join rule rejects invalid emoji', () => {
    const invalid = validatePlayerJoinRule('player-1', 'lobby', '💩');
    expect(invalid.allowed).toBe(false);
    expect(invalid.reason).toBe('Emoji is not on allowlist');
  });

  test('Player join rule rejects joins when race has already started', () => {
    const invalid = validatePlayerJoinRule('player-1', 'racing', '🚀');
    expect(invalid.allowed).toBe(false);
    expect(invalid.reason).toBe('Room is not in lobby state');
  });

  test('Input validation rule enforces steering and throttle numeric bounds', () => {
    const valid = validatePlayerInputRule('player-1', 'player-1', 0.5, -0.8);
    expect(valid.allowed).toBe(true);

    const invalidSteering = validatePlayerInputRule(
      'player-1',
      'player-1',
      5.0,
      0,
    );
    expect(invalidSteering.allowed).toBe(false);

    const invalidThrottle = validatePlayerInputRule(
      'player-1',
      'player-1',
      0,
      -2.5,
    );
    expect(invalidThrottle.allowed).toBe(false);

    const wrongPlayer = validatePlayerInputRule('player-2', 'player-1', 0, 0);
    expect(wrongPlayer.allowed).toBe(false);
  });
});
