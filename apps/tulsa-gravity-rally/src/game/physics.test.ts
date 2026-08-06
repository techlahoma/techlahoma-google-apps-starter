import {describe, test, expect, beforeAll} from 'bun:test';
import {PhysicsEngine} from './physics';
import {
  ALL_CHECKPOINTS,
  DOWNTOWN_BUILDINGS,
  GRADIENT_LANDMARK,
} from '../data/tulsa-map';

describe('Tulsa Gravity Rally - Pure Physics & Map Geometry', () => {
  let physics: PhysicsEngine;

  beforeAll(async () => {
    physics = new PhysicsEngine();
    await physics.init();
  });

  test('Gradient landmark is defined with correct coordinates and 5 levels', () => {
    expect(GRADIENT_LANDMARK.name).toBe('Gradient');
    expect(GRADIENT_LANDMARK.levels).toBe(5);
    expect(GRADIENT_LANDMARK.height).toBe(18);
    expect(GRADIENT_LANDMARK.address).toBe(
      '12 N Cheyenne Ave, Tulsa, OK 74103',
    );
    expect(DOWNTOWN_BUILDINGS.length).toBeGreaterThanOrEqual(8);
  });

  test('Physics engine initializes low-gravity world', () => {
    expect(physics.world).toBeDefined();
    const g = physics.world.gravity;
    expect(g.y).toBeLessThan(0);
    expect(g.y).toBeGreaterThan(-15);
  });

  test('Adds car and computes initial state', () => {
    const carState = physics.addCar('car-1', '🚀', '#ff5722', [0, 2.5, 20]);
    expect(carState.id).toBe('car-1');
    expect(carState.emoji).toBe('🚀');
    expect(carState.position[1]).toBeCloseTo(2.5, 1);
    expect(carState.checkpointsCompleted).toBe(0);
  });

  test('Clamps and normalizes input controls', () => {
    physics.updateCarInput('car-1', {
      steering: 2.5,
      throttle: -5.0,
      brake: true,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    const states = physics.step(1 / 60, ALL_CHECKPOINTS);
    const car = states.get('car-1')!;
    expect(car).toBeDefined();
    expect(car.speedKmH).toBeGreaterThanOrEqual(0);
  });

  test('Gravity Boost applies impulse and sets cooldown', () => {
    physics.updateCarInput('car-1', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: true,
      sequence: 2,
      timestamp: Date.now(),
    });

    physics.step(1 / 60, ALL_CHECKPOINTS);
    const car = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-1')!;
    expect(car.boostCooldown).toBeGreaterThan(0);
  });

  test('Resets car to last checkpoint position', () => {
    physics.resetCarToCheckpoint('car-1', ALL_CHECKPOINTS, 0);
    const car = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-1')!;
    const targetCp = ALL_CHECKPOINTS[0];
    expect(targetCp).toBeDefined();
    if (targetCp) {
      expect(car.position[0]).toBeCloseTo(targetCp.position[0], 0);
    }
  });
});
