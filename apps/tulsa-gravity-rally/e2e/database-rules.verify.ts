import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {onDisconnect, ref, set} from 'firebase/database';

const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!emulatorHost) {
  throw new Error('FIREBASE_DATABASE_EMULATOR_HOST is required.');
}

const [host, portText] = emulatorHost.split(':');
const rulesPath = resolve(process.cwd(), 'database.rules.json');
const testEnvironment = await initializeTestEnvironment({
  projectId: 'demo-tulsa-gravity-rally',
  database: {
    host: host || '127.0.0.1',
    port: Number(portText || '9000'),
    rules: readFileSync(rulesPath, 'utf8'),
  },
});

try {
  await verifyHostOwnership();
  await verifyHostSnapshot();
  await verifyPlayerClaims();
  await verifyMonotonicInput();
  console.log('Firebase Database rules behavior verified.');
} finally {
  await testEnvironment.cleanup();
}

async function verifyHostSnapshot(): Promise<void> {
  await testEnvironment.clearDatabase();
  const roomPath = 'demos/tulsaGravityRally/v1/rooms/SNAP23';
  const hostDatabase = testEnvironment
    .authenticatedContext('host-uid')
    .database();
  const attackerDatabase = testEnvironment
    .authenticatedContext('attacker-uid')
    .database();

  await assertSucceeds(
    set(ref(hostDatabase, roomPath), roomFixture('SNAP23', 'host-uid')),
  );

  const snapshotReference = ref(hostDatabase, `${roomPath}/snapshot`);
  const validSnapshot = {
    t: Date.now(),
    cars: {
      'host-uid': {
        p: [0, 4.5, 12],
        r: [0, 0, 0, 1],
        s: 42,
        c: 1,
      },
    },
  };
  await assertSucceeds(set(snapshotReference, validSnapshot));
  await assertFails(
    set(ref(attackerDatabase, `${roomPath}/snapshot`), validSnapshot),
  );
  await assertFails(
    set(snapshotReference, {
      ...validSnapshot,
      cars: {
        'host-uid': {...validSnapshot.cars['host-uid'], p: [3000, 4.5, 12]},
      },
    }),
  );
}

async function verifyHostOwnership(): Promise<void> {
  await testEnvironment.clearDatabase();
  const roomPath = 'demos/tulsaGravityRally/v1/rooms/TEST23';
  const hostDatabase = testEnvironment
    .authenticatedContext('host-uid')
    .database();
  const attackerDatabase = testEnvironment
    .authenticatedContext('attacker-uid')
    .database();

  await assertSucceeds(
    set(ref(hostDatabase, roomPath), roomFixture('TEST23', 'host-uid')),
  );
  await assertFails(set(ref(attackerDatabase, `${roomPath}/status`), 'racing'));
}

async function verifyPlayerClaims(): Promise<void> {
  await testEnvironment.clearDatabase();
  const roomPath = 'demos/tulsaGravityRally/v1/rooms/J2HN23';
  const hostDatabase = testEnvironment
    .authenticatedContext('host-uid')
    .database();
  const playerDatabase = testEnvironment
    .authenticatedContext('player-uid')
    .database();
  const otherDatabase = testEnvironment
    .authenticatedContext('other-uid')
    .database();

  await assertSucceeds(
    set(ref(hostDatabase, roomPath), roomFixture('J2HN23', 'host-uid')),
  );
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/emojiClaims/rocket`), 'player-uid'),
  );
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/slots/0`), 'player-uid'),
  );
  const inputReference = ref(
    playerDatabase,
    `${roomPath}/inputs/player-uid`,
  );
  await assertFails(onDisconnect(inputReference).remove());
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/players/player-uid`), {
      uid: 'player-uid',
      emojiId: 'rocket',
      emoji: '🚀',
      color: '#ff5722',
      slot: 0,
      joinedAt: Date.now(),
    }),
  );
  const inputDisconnect = onDisconnect(inputReference);
  await assertSucceeds(inputDisconnect.remove());
  await inputDisconnect.cancel();
  await assertFails(
    set(ref(otherDatabase, `${roomPath}/emojiClaims/rocket`), 'other-uid'),
  );
  await assertFails(
    set(ref(playerDatabase, `${roomPath}/players/player-uid/color`), '#ffffff'),
  );
}

async function verifyMonotonicInput(): Promise<void> {
  await testEnvironment.clearDatabase();
  const roomPath = 'demos/tulsaGravityRally/v1/rooms/DR2VE3';
  const hostDatabase = testEnvironment
    .authenticatedContext('host-uid')
    .database();
  const playerDatabase = testEnvironment
    .authenticatedContext('player-uid')
    .database();

  await assertSucceeds(
    set(ref(hostDatabase, roomPath), roomFixture('DR2VE3', 'host-uid')),
  );
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/emojiClaims/rocket`), 'player-uid'),
  );
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/slots/0`), 'player-uid'),
  );
  await assertSucceeds(
    set(ref(playerDatabase, `${roomPath}/players/player-uid`), {
      uid: 'player-uid',
      emojiId: 'rocket',
      emoji: '🚀',
      color: '#ff5722',
      slot: 0,
      joinedAt: Date.now(),
    }),
  );

  const inputReference = ref(playerDatabase, `${roomPath}/inputs/player-uid`);
  const input = {
    steering: 0.5,
    throttle: 1,
    brake: false,
    boost: false,
    sequence: 1,
    timestamp: Date.now(),
  };
  await assertSucceeds(set(inputReference, input));
  await assertFails(set(inputReference, {...input, timestamp: Date.now()}));
}

function roomFixture(roomCode: string, hostUid: string) {
  return {
    roomCode,
    hostUid,
    status: 'lobby',
    courseId: 'course-around-gradient',
    remainingSeconds: 75,
    expiresAt: Date.now() + 60 * 60 * 1_000,
  };
}
