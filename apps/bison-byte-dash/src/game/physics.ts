import type {
  GameState,
  InputState,
  Bison,
  Rect,
  Obstacle,
  Pickup,
  Particle,
  BracketType,
} from './types';
import {
  ROUND_DURATION,
  GROUND_Y,
  BISON_START_X,
  BISON_WIDTH,
  BISON_HEIGHT,
  GRAVITY,
  JUMP_IMPULSE,
  BASE_SPEED,
} from './types';

export const HIGH_SCORE_KEY = 'bison_byte_dash_highscore';

let memoryHighScore = 0;

export function loadHighScore(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(HIGH_SCORE_KEY);
      if (val !== null) return parseInt(val, 10) || 0;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return memoryHighScore;
}

export function saveHighScore(score: number): number {
  const current = loadHighScore();
  const newHigh = Math.max(current, score);
  memoryHighScore = newHigh;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HIGH_SCORE_KEY, newHigh.toString());
    }
  } catch {
    // Ignore storage errors
  }
  return newHigh;
}

export function createInitialState(highScore = 0): GameState {
  return {
    status: 'IDLE',
    score: 0,
    highScore,
    timeRemaining: ROUND_DURATION,
    bison: {
      x: BISON_START_X,
      y: GROUND_Y - BISON_HEIGHT,
      vy: 0,
      width: BISON_WIDTH,
      height: BISON_HEIGHT,
      isGrounded: true,
      runFrame: 0,
    },
    obstacles: [],
    pickups: [],
    particles: [],
    speed: BASE_SPEED,
    distanceTraveled: 0,
    spawnTimerObstacle: 1.2,
    spawnTimerPickup: 0.6,
    lastScoreGain: 0,
    cameraActive: false,
    cameraError: null,
    cameraJumpDetected: false,
    reducedMotion: false,
    soundEnabled: true,
  };
}

export function checkAABBCollision(a: Rect, b: Rect, inset = 6): boolean {
  const ax = a.x + inset;
  const ay = a.y + inset;
  const aw = Math.max(1, a.width - inset * 2);
  const ah = Math.max(1, a.height - inset * 2);

  const bx = b.x + inset;
  const by = b.y + inset;
  const bw = Math.max(1, b.width - inset * 2);
  const bh = Math.max(1, b.height - inset * 2);

  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function updateBison(
  bison: Bison,
  dt: number,
  jumpPressed: boolean,
): Bison {
  let y = bison.y;
  let vy = bison.vy;
  let isGrounded = bison.isGrounded;

  if (jumpPressed && isGrounded) {
    vy = JUMP_IMPULSE;
    isGrounded = false;
  }

  if (!isGrounded) {
    vy += GRAVITY * dt;
    y += vy * dt;
  }

  const maxY = GROUND_Y - bison.height;
  if (y >= maxY) {
    y = maxY;
    vy = 0;
    isGrounded = true;
  }

  const runFrame = isGrounded ? (bison.runFrame + dt * 10) % 4 : 0;

  return {
    ...bison,
    y,
    vy,
    isGrounded,
    runFrame,
  };
}

const BRACKETS: Array<{symbol: BracketType; points: number; color: string}> = [
  {symbol: '{ }', points: 100, color: '#F5A623'}, // Prairie Gold
  {symbol: '</>', points: 150, color: '#D94E34'}, // Sunset Red
  {symbol: '[ ]', points: 200, color: '#4FC3F7'}, // Cyan Byte
  {symbol: '( )', points: 120, color: '#81C784'}, // Green Code
];

export function updateGameState(
  state: GameState,
  dt: number,
  input: InputState,
): GameState {
  if (state.status !== 'PLAYING') {
    return state;
  }

  // 1. Update round timer
  const timeRemaining = Math.max(0, state.timeRemaining - dt);
  if (timeRemaining <= 0) {
    const finalHighScore = saveHighScore(state.score);
    return {
      ...state,
      timeRemaining: 0,
      status: 'GAMEOVER',
      highScore: finalHighScore,
    };
  }

  // 2. Update Bison physics
  const bison = updateBison(state.bison, dt, input.jumpPressed);

  // Progressive game speed up slightly over time
  const currentSpeed = BASE_SPEED + (ROUND_DURATION - timeRemaining) * 4;
  const distanceTraveled = state.distanceTraveled + currentSpeed * dt;

  // 3. Move obstacles and filter offscreen
  let obstacles: Obstacle[] = state.obstacles
    .map(obs => ({
      ...obs,
      x: obs.x - currentSpeed * dt,
      rotation: obs.rotation + dt * 4,
    }))
    .filter(obs => obs.x + obs.width > -50);

  // 4. Move pickups and filter offscreen
  let pickups: Pickup[] = state.pickups
    .map(pick => ({
      ...pick,
      x: pick.x - currentSpeed * dt,
    }))
    .filter(pick => pick.x + pick.width > -50 && !pick.collected);

  // 5. Spawning logic
  let spawnTimerObstacle = state.spawnTimerObstacle - dt;
  if (spawnTimerObstacle <= 0) {
    spawnTimerObstacle = 1.4 + Math.random() * 1.2;
    const obsSize = 36 + Math.floor(Math.random() * 12);
    obstacles.push({
      id: `obs_${Date.now()}_${Math.random()}`,
      x: 800 + Math.random() * 100,
      y: GROUND_Y - obsSize,
      width: obsSize,
      height: obsSize,
      speed: currentSpeed,
      rotation: 0,
    });
  }

  let spawnTimerPickup = state.spawnTimerPickup - dt;
  if (spawnTimerPickup <= 0) {
    spawnTimerPickup = 0.9 + Math.random() * 1.0;
    const bracketInfo =
      BRACKETS[Math.floor(Math.random() * BRACKETS.length)] || BRACKETS[0]!;
    const heights = [GROUND_Y - 40, GROUND_Y - 110, GROUND_Y - 170];
    const py =
      heights[Math.floor(Math.random() * heights.length)] ?? GROUND_Y - 40;
    pickups.push({
      id: `pick_${Date.now()}_${Math.random()}`,
      x: 850 + Math.random() * 80,
      y: py,
      width: 32,
      height: 32,
      symbol: bracketInfo.symbol,
      points: bracketInfo.points,
      color: bracketInfo.color,
      collected: false,
    });
  }

  // 6. Check collisions
  let score = state.score;
  let lastScoreGain = 0;
  const newParticles: Particle[] = [...state.particles];

  // Pickups
  pickups = pickups.map(pick => {
    if (!pick.collected && checkAABBCollision(bison, pick, 4)) {
      score += pick.points;
      lastScoreGain = pick.points;
      // Generate collection particles
      if (!state.reducedMotion) {
        for (let i = 0; i < 8; i++) {
          newParticles.push({
            x: pick.x + pick.width / 2,
            y: pick.y + pick.height / 2,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200 - 50,
            color: pick.color,
            size: 4 + Math.random() * 4,
            life: 0.4,
            maxLife: 0.4,
            symbol: pick.symbol,
          });
        }
      }
      return {...pick, collected: true};
    }
    return pick;
  });

  // Obstacles (Tumbleweed collision -> lose points or bump penalty)
  obstacles = obstacles.filter(obs => {
    if (checkAABBCollision(bison, obs, 6)) {
      score = Math.max(0, score - 50);
      if (!state.reducedMotion) {
        for (let i = 0; i < 10; i++) {
          newParticles.push({
            x: bison.x + bison.width / 2,
            y: bison.y + bison.height / 2,
            vx: (Math.random() - 0.5) * 250,
            vy: -Math.random() * 150 - 50,
            color: '#8D5B4C',
            size: 5 + Math.random() * 5,
            life: 0.5,
            maxLife: 0.5,
          });
        }
      }
      return false; // Remove obstacle on hit
    }
    return true;
  });

  // 7. Update particles
  const particles = newParticles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      life: p.life - dt,
    }))
    .filter(p => p.life > 0);

  const highScore = Math.max(state.highScore, score);

  return {
    ...state,
    score,
    highScore,
    timeRemaining,
    bison,
    obstacles,
    pickups,
    particles,
    speed: currentSpeed,
    distanceTraveled,
    spawnTimerObstacle,
    spawnTimerPickup,
    lastScoreGain,
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...createInitialState(state.highScore),
    status: 'PLAYING',
    cameraActive: state.cameraActive,
    cameraError: state.cameraError,
    reducedMotion: state.reducedMotion,
    soundEnabled: state.soundEnabled,
  };
}

export function pauseGame(state: GameState): GameState {
  if (state.status === 'PLAYING') {
    return {...state, status: 'PAUSED'};
  }
  return state;
}

export function resumeGame(state: GameState): GameState {
  if (state.status === 'PAUSED') {
    return {...state, status: 'PLAYING'};
  }
  return state;
}

export function restartGame(state: GameState): GameState {
  return startGame(state);
}
