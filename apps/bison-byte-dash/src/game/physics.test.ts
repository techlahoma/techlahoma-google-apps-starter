import {describe, expect, test} from 'bun:test';
import {
  createInitialState,
  updateGameState,
  updateBison,
  checkAABBCollision,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  saveHighScore,
  loadHighScore,
} from './physics';
import {ROUND_DURATION, GROUND_Y, BISON_HEIGHT} from './types';

describe('Bison Byte Dash - Pure Physics & Logic', () => {
  test('creates initial state correctly', () => {
    const state = createInitialState(100);
    expect(state.status).toBe('IDLE');
    expect(state.score).toBe(0);
    expect(state.highScore).toBe(100);
    expect(state.timeRemaining).toBe(ROUND_DURATION);
    expect(state.bison.isGrounded).toBe(true);
    expect(state.bison.y).toBe(GROUND_Y - BISON_HEIGHT);
  });

  test('bison jumps when grounded and jumpPressed is true', () => {
    const state = createInitialState();
    const bison = updateBison(state.bison, 0.016, true);
    expect(bison.isGrounded).toBe(false);
    expect(bison.vy).toBeLessThan(0); // upward velocity
  });

  test('bison falls under gravity and lands back on ground', () => {
    let bison = updateBison(createInitialState().bison, 0.016, true);
    // Simulate 2 seconds of physics
    for (let i = 0; i < 120; i++) {
      bison = updateBison(bison, 0.016, false);
    }
    expect(bison.isGrounded).toBe(true);
    expect(bison.y).toBe(GROUND_Y - BISON_HEIGHT);
    expect(bison.vy).toBe(0);
  });

  test('detects AABB collisions correctly', () => {
    const rectA = {x: 10, y: 10, width: 30, height: 30};
    const rectB = {x: 20, y: 20, width: 30, height: 30};
    const rectFar = {x: 100, y: 100, width: 30, height: 30};

    expect(checkAABBCollision(rectA, rectB, 0)).toBe(true);
    expect(checkAABBCollision(rectA, rectFar, 0)).toBe(false);
  });

  test('updates score on pickup collision', () => {
    let state = startGame(createInitialState());
    state.pickups = [
      {
        id: 'p1',
        x: state.bison.x,
        y: state.bison.y,
        width: 32,
        height: 32,
        symbol: '{ }',
        points: 100,
        color: '#FFF',
        collected: false,
      },
    ];

    state = updateGameState(state, 0.016, {jumpPressed: false});
    expect(state.score).toBe(100);
    expect(state.pickups[0]?.collected).toBe(true);
  });

  test('deducts penalty on tumbleweed obstacle collision', () => {
    let state = startGame(createInitialState());
    state.score = 200;
    state.obstacles = [
      {
        id: 'o1',
        x: state.bison.x,
        y: state.bison.y,
        width: 36,
        height: 36,
        speed: 280,
        rotation: 0,
      },
    ];

    state = updateGameState(state, 0.016, {jumpPressed: false});
    expect(state.score).toBe(150); // 200 - 50 = 150
    expect(state.obstacles.length).toBe(0); // Removed after hit
  });

  test('ends round when 45-second timer expires', () => {
    let state = startGame(createInitialState());
    state.timeRemaining = 0.01;

    state = updateGameState(state, 0.02, {jumpPressed: false});
    expect(state.status).toBe('GAMEOVER');
    expect(state.timeRemaining).toBe(0);
  });

  test('handles pause, resume, and restart transitions', () => {
    let state = startGame(createInitialState());
    expect(state.status).toBe('PLAYING');

    state = pauseGame(state);
    expect(state.status).toBe('PAUSED');

    // Updating while paused should not change timeRemaining or score
    const pausedState = updateGameState(state, 1.0, {jumpPressed: false});
    expect(pausedState.timeRemaining).toBe(state.timeRemaining);

    state = resumeGame(state);
    expect(state.status).toBe('PLAYING');

    state = restartGame(state);
    expect(state.status).toBe('PLAYING');
    expect(state.score).toBe(0);
    expect(state.timeRemaining).toBe(ROUND_DURATION);
  });

  test('saves and loads high score in storage', () => {
    saveHighScore(350);
    expect(loadHighScore()).toBeGreaterThanOrEqual(350);
  });
});
