import {EMOJI_ALLOWLIST} from './emoji';

export interface RuleContext {
  auth: {uid: string} | null;
  data?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export function validatePlayerJoinRule(
  authUid: string | null,
  roomStatus: string,
  emoji: string,
): {allowed: boolean; reason?: string} {
  if (!authUid) {
    return {allowed: false, reason: 'Unauthenticated'};
  }
  if (roomStatus !== 'lobby') {
    return {allowed: false, reason: 'Room is not in lobby state'};
  }
  const isEmojiAllowed = EMOJI_ALLOWLIST.some(e => e.emoji === emoji);
  if (!isEmojiAllowed) {
    return {allowed: false, reason: 'Emoji is not on allowlist'};
  }
  return {allowed: true};
}

export function validateHostActionRule(
  authUid: string | null,
  hostUid: string,
  actionPath: string,
): {allowed: boolean; reason?: string} {
  if (!authUid) {
    return {allowed: false, reason: 'Unauthenticated'};
  }
  if (authUid !== hostUid) {
    return {
      allowed: false,
      reason: 'Only room host UID can write ' + actionPath,
    };
  }
  return {allowed: true};
}

export function validatePlayerInputRule(
  authUid: string | null,
  playerUid: string,
  steering: number,
  throttle: number,
): {allowed: boolean; reason?: string} {
  if (!authUid || authUid !== playerUid) {
    return {allowed: false, reason: 'Can only write own input'};
  }
  if (!Number.isFinite(steering) || steering < -1.0 || steering > 1.0) {
    return {allowed: false, reason: 'Steering out of bounds (-1 to 1)'};
  }
  if (!Number.isFinite(throttle) || throttle < -1.0 || throttle > 1.0) {
    return {allowed: false, reason: 'Throttle out of bounds (-1 to 1)'};
  }
  return {allowed: true};
}
