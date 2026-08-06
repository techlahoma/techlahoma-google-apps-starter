import {beforeEach, describe, expect, test} from 'bun:test';
import {PhysicsEngine, CAR_SPECS} from './physics';
import {
  ALL_CHECKPOINTS,
  DOWNTOWN_BUILDINGS,
  GRADIENT_LANDMARK,
} from '../data/tulsa-map';

describe('Tulsa Gravity Rally - Vehicle Physics & Suspension', () => {
  let physics: PhysicsEngine;

  beforeEach(async () => {
    physics = new PhysicsEngine();
    await physics.init();
  });

  test('Gradient landmark uses the real historic OTASCO footprint', () => {
    expect(GRADIENT_LANDMARK.name).toContain('Gradient');
    expect(GRADIENT_LANDMARK.sourceId).toBe('osm-259791849');
    expect(GRADIENT_LANDMARK.levels).toBe(4);
    expect(GRADIENT_LANDMARK.height).toBe(12);
    expect(GRADIENT_LANDMARK.address).toBe(
      '12 N Cheyenne Ave, Tulsa, OK 74103',
    );
    expect(GRADIENT_LANDMARK.footprint.length).toBeGreaterThanOrEqual(4);
    expect(DOWNTOWN_BUILDINGS.length).toBeGreaterThan(100);
  });

  test('Physics engine initializes low-gravity world', () => {
    expect(physics.world).toBeDefined();
    const g = physics.world.gravity;
    expect(g.y).toBeLessThan(0);
    expect(g.y).toBeGreaterThan(-15);
  });

  test('Adds car and computes initial 4-wheel suspension states', () => {
    const carState = physics.addCar('car-1', '🚀', '#ff5722', testSpawn());
    expect(carState.id).toBe('car-1');
    expect(carState.emoji).toBe('🚀');
    expect(carState.position[1]).toBeCloseTo(4.5, 1);
    expect(carState.wheelPositions.length).toBe(4);
    expect(carState.wheelSuspensionLengths.length).toBe(4);
  });

  test('Forward throttle input changes vehicle position', () => {
    const carBefore = physics.addCar(
      'car-throttle',
      '🦬',
      '#c85a32',
      testSpawn(),
    );
    const pos0 = carBefore.position[2];

    physics.updateCarInput('car-throttle', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    for (let i = 0; i < 60; i++) {
      physics.step(1 / 60, ALL_CHECKPOINTS);
    }

    const carAfter = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-throttle')!;
    expect(carAfter.position[2]).toBeGreaterThan(pos0);
  });

  test('Steering input changes vehicle heading angle', () => {
    physics.addCar('car-steer', '🐢', '#4caf50', testSpawn());

    physics.updateCarInput('car-steer', {
      steering: 1.0,
      throttle: 0.5,
      brake: false,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    for (let i = 0; i < 60; i++) {
      physics.step(1 / 60, ALL_CHECKPOINTS);
    }

    const carAfter = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-steer')!;
    expect(Math.abs(carAfter.rotation[1])).toBeGreaterThan(0.01);
  });

  test('Suspension ray lengths respond to ground terrain contact', () => {
    physics.addCar('car-susp', '🐙', '#ff0055', testSpawn());
    for (let i = 0; i < 90; i++) {
      physics.step(1 / 60, ALL_CHECKPOINTS);
    }

    const updatedCar = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-susp')!;
    expect(updatedCar.isGrounded).toBe(true);
    for (const len of updatedCar.wheelSuspensionLengths) {
      expect(len).toBeGreaterThan(0);
      expect(len).toBeLessThanOrEqual(CAR_SPECS.suspensionRestLength);
    }
  });

  test('Boost impulse produces bounded vertical motion', () => {
    physics.addCar('car-boost', '⚡', '#ffb703', testSpawn());

    physics.updateCarInput('car-boost', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: true,
      sequence: 1,
      timestamp: Date.now(),
    });

    physics.step(1 / 60, ALL_CHECKPOINTS);
    const car = physics.step(1 / 60, ALL_CHECKPOINTS).get('car-boost')!;
    expect(car.velocity[1]).toBeGreaterThan(0);
    expect(car.velocity[1]).toBeLessThanOrEqual(25.0); // Bounded vertical motion
  });

  test('Fixed-step accumulator results are stable across simulated 30, 60, and 120 Hz loops', async () => {
    const engine30 = new PhysicsEngine();
    await engine30.init();
    engine30.addCar('car-test', '🚀', '#ff5722', testSpawn());
    engine30.updateCarInput('car-test', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    const engine60 = new PhysicsEngine();
    await engine60.init();
    engine60.addCar('car-test', '🚀', '#ff5722', testSpawn());
    engine60.updateCarInput('car-test', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    const engine120 = new PhysicsEngine();
    await engine120.init();
    engine120.addCar('car-test', '🚀', '#ff5722', testSpawn());
    engine120.updateCarInput('car-test', {
      steering: 0,
      throttle: 1.0,
      brake: false,
      boost: false,
      sequence: 1,
      timestamp: Date.now(),
    });

    // Run 1 second in 30Hz steps (30 x 1/30s)
    for (let i = 0; i < 30; i++) {
      engine30.step(1 / 30, ALL_CHECKPOINTS);
    }

    // Run 1 second in 60Hz steps (60 x 1/60s)
    for (let i = 0; i < 60; i++) {
      engine60.step(1 / 60, ALL_CHECKPOINTS);
    }

    for (let i = 0; i < 120; i++) {
      engine120.step(1 / 120, ALL_CHECKPOINTS);
    }

    const state30 = engine30.step(0, ALL_CHECKPOINTS).get('car-test')!;
    const state60 = engine60.step(0, ALL_CHECKPOINTS).get('car-test')!;
    const state120 = engine120.step(0, ALL_CHECKPOINTS).get('car-test')!;

    expect(state30.position[2]).toBeCloseTo(state60.position[2], 0);
    expect(state60.position[2]).toBeCloseTo(state120.position[2], 0);
  });
});

function testSpawn(): [number, number, number] {
  const start = ALL_CHECKPOINTS[0]?.position ?? [60, 1.5, 20];
  return [start[0], 4.5, start[2] + 18];
}
