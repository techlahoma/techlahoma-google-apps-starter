export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bison {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  runFrame: number;
}

export type BracketType = '{ }' | '</>' | '[ ]' | '( )';

export interface Pickup extends Rect {
  id: string;
  symbol: BracketType;
  points: number;
  collected: boolean;
  color: string;
}

export interface Obstacle extends Rect {
  id: string;
  speed: number;
  rotation: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  symbol?: string;
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  timeRemaining: number; // Seconds (45.0)
  bison: Bison;
  obstacles: Obstacle[];
  pickups: Pickup[];
  particles: Particle[];
  speed: number;
  distanceTraveled: number;
  spawnTimerObstacle: number;
  spawnTimerPickup: number;
  lastScoreGain: number;
  cameraActive: boolean;
  cameraError: string | null;
  cameraJumpDetected: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
}

export interface InputState {
  jumpPressed: boolean;
}

export const ROUND_DURATION = 45.0;
export const GROUND_Y = 340;
export const BISON_START_X = 80;
export const BISON_WIDTH = 64;
export const BISON_HEIGHT = 44;
export const GRAVITY = 1800;
export const JUMP_IMPULSE = -700;
export const BASE_SPEED = 280;
