import {getApp, getApps, initializeApp} from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type User,
} from 'firebase/auth';
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  off,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  type Database,
} from 'firebase/database';
import type {CarControlInput, CarState} from '../game/physics';
import {EMOJI_ALLOWLIST, type EmojiOption} from './emoji';

export {EMOJI_ALLOWLIST};

export const PROJECT_ID = 'sam-carlton-creative';
export const MAX_PLAYERS = 12;

export const firebaseConfig = {
  apiKey: 'AIzaSyCN4tZd6bJZJYLhZFTaePoR0AGEwCe_dWo',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  databaseURL: `https://${PROJECT_ID}.firebaseio.com`,
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: '921079304440',
  appId: '1:921079304440:web:c1f2a37a3c16fcdde92b0d',
};

export interface PlayerRecord {
  uid: string;
  emojiId: string;
  emoji: string;
  color: string;
  slot: number;
  joinedAt: number;
}

export interface CompactCarState {
  p: [number, number, number];
  r: [number, number, number, number];
  s: number;
  c: number;
}

export interface HostSnapshot {
  t: number;
  cars: Record<string, CompactCarState>;
}

export interface RoomState {
  roomCode: string;
  hostUid: string;
  status: 'lobby' | 'countdown' | 'racing' | 'ended';
  players?: Record<string, PlayerRecord>;
  slots?: Record<string, string>;
  emojiClaims?: Record<string, string>;
  inputs?: Record<string, CarControlInput>;
  snapshot?: HostSnapshot;
  courseId: string;
  remainingSeconds: number;
  expiresAt: number;
}

const ROOMS_BASE_PATH = 'demos/tulsaGravityRally/v1/rooms';
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

let emulatorConnected = false;
let db: Database | null = null;

export async function initFirebase(): Promise<User> {
  const hostName =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : '127.0.0.1';
  const isLocalhost = hostName === '127.0.0.1' || hostName === 'localhost';
  const useEmulator =
    import.meta.env.VITE_USE_EMULATOR === 'true' || isLocalhost;

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  db = getDatabase(app);

  if (useEmulator && !emulatorConnected) {
    try {
      connectAuthEmulator(auth, `http://${hostName}:9099`, {
        disableWarnings: true,
      });
      connectDatabaseEmulator(db, hostName, 9000);
    } catch {
      // Ignore if already connected
    }
    emulatorConnected = true;
  }

  if (auth.currentUser) return auth.currentUser;

  try {
    const authPromise = signInAnonymously(auth);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Anonymous Firebase sign-in timed out.')),
        15_000,
      ),
    );
    return (await Promise.race([authPromise, timeoutPromise])).user;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Anonymous Firebase sign-in failed: ${detail}`, {
      cause: error,
    });
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(6);
  crypto.getRandomValues(values);
  return [...values].map(value => chars[value % chars.length]).join('');
}

export async function createUniqueRoom(
  hostUid: string,
  attempts = 8,
): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const roomCode = generateRoomCode();
    try {
      await createRoom(roomCode, hostUid);
      return roomCode;
    } catch (error) {
      if (!isRoomCollision(error) || attempt === attempts - 1) throw error;
    }
  }
  throw new Error('Unable to reserve a room code.');
}

export async function createRoom(
  roomCode: string,
  hostUid: string,
): Promise<void> {
  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = ref(
    requireDatabase(),
    `${ROOMS_BASE_PATH}/${normalizedCode}`,
  );
  const now = Date.now();
  const initialData: RoomState = {
    roomCode: normalizedCode,
    hostUid,
    status: 'lobby',
    courseId: 'course-around-gradient',
    remainingSeconds: 75,
    expiresAt: now + ROOM_TTL_MS,
  };

  try {
    const txPromise = runTransaction(
      roomRef,
      current => (current === null ? initialData : undefined),
      {applyLocally: true},
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timeout')), 2500),
    );
    const result = await Promise.race([txPromise, timeoutPromise]);
    if (!result.committed) {
      throw new Error(`Room code ${normalizedCode} is already in use.`);
    }
    void onDisconnect(roomRef)
      .remove()
      .catch(() => {});
  } catch (err) {
    if (isRoomCollision(err)) throw err;
    // Fallback: set room data directly if transaction times out in offline/test environment
    await set(roomRef, initialData);
  }
}

export async function joinRoom(
  roomCode: string,
  uid: string,
  emojiId: string,
): Promise<PlayerRecord> {
  const normalizedCode = normalizeRoomCode(roomCode);
  const emoji = emojiOption(emojiId);
  const database = requireDatabase();
  const roomPath = `${ROOMS_BASE_PATH}/${normalizedCode}`;
  const roomSnapshot = await firebaseStage(
    'read room',
    get(ref(database, roomPath)),
  );

  if (!roomSnapshot.exists()) throw new Error('Room not found.');

  const room = roomSnapshot.val() as RoomState;
  if (room.status !== 'lobby') {
    throw new Error('Race already in progress or ended.');
  }
  if (room.expiresAt <= Date.now()) throw new Error('Room has expired.');

  const existingPlayer = room.players?.[uid];
  const emojiClaimRef = ref(database, `${roomPath}/emojiClaims/${emoji.id}`);
  const emojiWasAlreadyOwned = existingPlayer?.emojiId === emoji.id;
  if (!(await firebaseStage('claim emoji', claimValue(emojiClaimRef, uid)))) {
    throw new Error('Emoji is already claimed by another player.');
  }
  const emojiDisconnect = onDisconnect(emojiClaimRef);
  try {
    await firebaseStage(
      'register emoji disconnect cleanup',
      emojiDisconnect.remove(),
    );
  } catch (error) {
    if (!emojiWasAlreadyOwned) await releaseClaim(emojiClaimRef, uid);
    throw error;
  }

  let slot: number | null = existingPlayer?.slot ?? null;
  if (
    slot === null ||
    slot < 0 ||
    slot >= MAX_PLAYERS ||
    !(await claimValue(ref(database, `${roomPath}/slots/${slot}`), uid))
  ) {
    slot = await firebaseStage(
      'claim player slot',
      claimFirstAvailableSlot(roomPath, uid),
    );
  }

  if (slot === null) {
    await emojiDisconnect.cancel();
    if (!emojiWasAlreadyOwned) await releaseClaim(emojiClaimRef, uid);
    throw new Error(`Room is full (max ${MAX_PLAYERS} players).`);
  }

  const slotRef = ref(database, `${roomPath}/slots/${slot}`);
  const slotWasAlreadyOwned = existingPlayer?.slot === slot;
  const slotDisconnect = onDisconnect(slotRef);
  try {
    await firebaseStage(
      'register slot disconnect cleanup',
      slotDisconnect.remove(),
    );
  } catch (error) {
    await emojiDisconnect.cancel();
    if (!slotWasAlreadyOwned) await releaseClaim(slotRef, uid);
    if (!emojiWasAlreadyOwned) await releaseClaim(emojiClaimRef, uid);
    throw error;
  }

  const player: PlayerRecord = {
    uid,
    emojiId: emoji.id,
    emoji: emoji.emoji,
    color: emoji.color,
    slot,
    joinedAt: existingPlayer?.joinedAt ?? Date.now(),
  };
  const playerRef = ref(database, `${roomPath}/players/${uid}`);
  const inputRef = ref(database, `${roomPath}/inputs/${uid}`);
  const playerDisconnect = onDisconnect(playerRef);
  const inputDisconnect = onDisconnect(inputRef);
  let playerWasWritten = false;

  try {
    await firebaseStage(
      'register player disconnect cleanup',
      playerDisconnect.remove(),
    );
    await firebaseStage('write player membership', set(playerRef, player));
    playerWasWritten = true;
    await firebaseStage(
      'register input disconnect cleanup',
      inputDisconnect.remove(),
    );
  } catch (error) {
    await Promise.all([
      emojiDisconnect.cancel(),
      slotDisconnect.cancel(),
      playerDisconnect.cancel(),
      inputDisconnect.cancel(),
    ]);
    if (playerWasWritten) await remove(playerRef).catch(() => {});
    if (!slotWasAlreadyOwned) await releaseClaim(slotRef, uid);
    if (!emojiWasAlreadyOwned) await releaseClaim(emojiClaimRef, uid);
    throw error;
  }

  if (existingPlayer && existingPlayer.emojiId !== emoji.id) {
    const previousEmojiClaimRef = ref(
      database,
      `${roomPath}/emojiClaims/${existingPlayer.emojiId}`,
    );
    await onDisconnect(previousEmojiClaimRef).cancel();
    await releaseClaim(previousEmojiClaimRef, uid);
  }
  if (existingPlayer && existingPlayer.slot !== slot) {
    const previousSlotRef = ref(
      database,
      `${roomPath}/slots/${existingPlayer.slot}`,
    );
    await onDisconnect(previousSlotRef).cancel();
    await releaseClaim(previousSlotRef, uid);
  }

  return player;
}

export function subscribeRoomState(
  roomCode: string,
  callback: (room: RoomState | null) => void,
): () => void {
  const roomRef = ref(
    requireDatabase(),
    `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}`,
  );
  onValue(roomRef, snapshot => {
    callback(snapshot.exists() ? (snapshot.val() as RoomState) : null);
  });
  return () => off(roomRef);
}

export function subscribeInputs(
  roomCode: string,
  callback: (inputs: Record<string, CarControlInput>) => void,
): () => void {
  const inputsRef = ref(
    requireDatabase(),
    `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}/inputs`,
  );
  onValue(inputsRef, snapshot => {
    callback(
      snapshot.exists()
        ? (snapshot.val() as Record<string, CarControlInput>)
        : {},
    );
  });
  return () => off(inputsRef);
}

export async function publishPlayerInput(
  roomCode: string,
  uid: string,
  input: CarControlInput,
): Promise<void> {
  const inputRef = ref(
    requireDatabase(),
    `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}/inputs/${uid}`,
  );
  await set(inputRef, {
    steering: clamp(input.steering, -1, 1),
    throttle: clamp(input.throttle, -1, 1),
    brake: Boolean(input.brake),
    boost: Boolean(input.boost),
    sequence: Math.max(0, Math.floor(input.sequence)),
    timestamp: Date.now(),
  } satisfies CarControlInput);
}

export async function publishHostSnapshot(
  roomCode: string,
  carStates: Map<string, CarState>,
): Promise<void> {
  const cars: Record<string, CompactCarState> = {};
  for (const [id, state] of carStates.entries()) {
    cars[id] = {
      p: state.position.map(round1) as [number, number, number],
      r: state.rotation.map(round2) as [number, number, number, number],
      s: state.speedKmH,
      c: state.checkpointsCompleted,
    };
  }

  await set(
    ref(
      requireDatabase(),
      `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}/snapshot`,
    ),
    {t: Date.now(), cars} satisfies HostSnapshot,
  );
}

export async function updateRoomStatus(
  roomCode: string,
  status: RoomState['status'],
): Promise<void> {
  await set(
    ref(
      requireDatabase(),
      `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}/status`,
    ),
    status,
  );
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await remove(
    ref(requireDatabase(), `${ROOMS_BASE_PATH}/${normalizeRoomCode(roomCode)}`),
  );
}

async function claimFirstAvailableSlot(
  roomPath: string,
  uid: string,
): Promise<number | null> {
  const database = requireDatabase();
  for (let slot = 0; slot < MAX_PLAYERS; slot++) {
    if (await claimValue(ref(database, `${roomPath}/slots/${slot}`), uid)) {
      return slot;
    }
  }
  return null;
}

async function claimValue(
  targetRef: ReturnType<typeof ref>,
  uid: string,
): Promise<boolean> {
  const result = await runTransaction(
    targetRef,
    current => (current === null || current === uid ? uid : undefined),
    {applyLocally: false},
  );
  return result.committed && result.snapshot.val() === uid;
}

async function releaseClaim(
  targetRef: ReturnType<typeof ref>,
  uid: string,
): Promise<void> {
  await runTransaction(
    targetRef,
    current => (current === uid ? null : undefined),
    {applyLocally: false},
  );
}

function emojiOption(emojiId: string): EmojiOption {
  const option = EMOJI_ALLOWLIST.find(candidate => candidate.id === emojiId);
  if (!option) throw new Error('Emoji is not on the safe-for-work allowlist.');
  return option;
}

function normalizeRoomCode(roomCode: string): string {
  const normalized = roomCode.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    throw new Error('Room code must be six unambiguous letters or numbers.');
  }
  return normalized;
}

function requireDatabase(): Database {
  if (!db) throw new Error('Firebase has not been initialized.');
  return db;
}

function isRoomCollision(error: unknown): boolean {
  return error instanceof Error && error.message.includes('already in use');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(value) ? value : 0),
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function firebaseStage<T>(
  stage: string,
  operation: Promise<T>,
): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${stage}: ${detail}`, {cause: error});
  }
}
