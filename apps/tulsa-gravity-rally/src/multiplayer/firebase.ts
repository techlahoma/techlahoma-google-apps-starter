import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
  remove,
  connectDatabaseEmulator,
  type Database,
} from 'firebase/database';
import type {CarControlInput, CarState} from '../game/physics';
import {EMOJI_ALLOWLIST} from './emoji';

export {EMOJI_ALLOWLIST};

export const PROJECT_ID = 'demo-tulsa-gravity-rally';

const firebaseConfig = {
  apiKey: 'fake-demo-api-key',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  databaseURL: `http://127.0.0.1:9000?ns=${PROJECT_ID}`,
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

export interface PlayerRecord {
  uid: string;
  emoji: string;
  color: string;
  joinedAt: number;
}

export interface RoomState {
  roomCode: string;
  hostUid: string;
  status: 'lobby' | 'countdown' | 'racing' | 'ended';
  players: Record<string, PlayerRecord>;
  courseId: string;
  remainingSeconds: number;
}

let appInitialized = false;
let db: Database;
let currentUser: User | null = null;

export async function initFirebase(): Promise<User> {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  db = getDatabase(app);

  if (!appInitialized) {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
        disableWarnings: true,
      });
      connectDatabaseEmulator(db, '127.0.0.1', 9000);
    } catch {
      // Ignore if already connected in hot reload
    }
    appInitialized = true;
  }

  const userCredential = await signInAnonymously(auth);
  currentUser = userCredential.user;
  return currentUser;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRoom(
  roomCode: string,
  hostUid: string,
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const initialData: RoomState = {
    roomCode,
    hostUid,
    status: 'lobby',
    players: {},
    courseId: 'preset-around-gradient',
    remainingSeconds: 75,
  };
  await set(roomRef, initialData);
}

export async function joinRoom(
  roomCode: string,
  uid: string,
  emoji: string,
  color: string,
): Promise<boolean> {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    throw new Error('Room not found.');
  }

  const data = snapshot.val() as RoomState;
  if (data.status !== 'lobby') {
    throw new Error('Race already in progress or ended.');
  }

  const currentPlayers = data.players || {};
  const count = Object.keys(currentPlayers).length;
  if (count >= 12 && !currentPlayers[uid]) {
    throw new Error('Room is full (max 12 players).');
  }

  for (const [pUid, player] of Object.entries(currentPlayers)) {
    if (pUid !== uid && player.emoji === emoji) {
      throw new Error('Emoji is already claimed by another player.');
    }
  }

  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
  await set(playerRef, {
    uid,
    emoji,
    color,
    joinedAt: Date.now(),
  });
  return true;
}

export function subscribeRoomState(
  roomCode: string,
  callback: (room: RoomState | null) => void,
): () => void {
  const roomRef = ref(db, `rooms/${roomCode}`);
  onValue(roomRef, snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val() as RoomState);
    } else {
      callback(null);
    }
  });
  return () => off(roomRef);
}

export function subscribeInputs(
  roomCode: string,
  callback: (inputs: Record<string, CarControlInput>) => void,
): () => void {
  const inputsRef = ref(db, `rooms/${roomCode}/inputs`);
  onValue(inputsRef, snapshot => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Record<string, CarControlInput>);
    } else {
      callback({});
    }
  });
  return () => off(inputsRef);
}

let lastPublishTime = 0;
export async function publishPlayerInput(
  roomCode: string,
  uid: string,
  input: CarControlInput,
): Promise<void> {
  const now = Date.now();
  if (now - lastPublishTime < 80) return;
  lastPublishTime = now;

  const inputRef = ref(db, `rooms/${roomCode}/inputs/${uid}`);
  await set(inputRef, input);
}

export async function publishHostSnapshot(
  roomCode: string,
  carStates: Map<string, CarState>,
): Promise<void> {
  const compactCars: Record<
    string,
    {
      p: [number, number, number];
      r: [number, number, number, number];
      s: number;
      c: number;
    }
  > = {};

  for (const [id, state] of carStates.entries()) {
    compactCars[id] = {
      p: [
        Math.round(state.position[0] * 10) / 10,
        Math.round(state.position[1] * 10) / 10,
        Math.round(state.position[2] * 10) / 10,
      ],
      r: [
        Math.round(state.rotation[0] * 100) / 100,
        Math.round(state.rotation[1] * 100) / 100,
        Math.round(state.rotation[2] * 100) / 100,
        Math.round(state.rotation[3] * 100) / 100,
      ],
      s: state.speedKmH,
      c: state.checkpointsCompleted,
    };
  }

  const snapshotRef = ref(db, `rooms/${roomCode}/snapshot`);
  await set(snapshotRef, {
    t: Date.now(),
    cars: compactCars,
  });
}

export async function updateRoomStatus(
  roomCode: string,
  status: RoomState['status'],
): Promise<void> {
  const statusRef = ref(db, `rooms/${roomCode}/status`);
  await set(statusRef, status);
}

export async function deleteRoom(roomCode: string): Promise<void> {
  const roomRef = ref(db, `rooms/${roomCode}`);
  await remove(roomRef);
}
