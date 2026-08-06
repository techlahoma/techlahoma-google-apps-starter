import {describe, expect, it} from 'bun:test';
import {
  DEFAULT_CAMERA,
  MAX_DISTANCE,
  MIN_DISTANCE,
  StateManager,
} from './state.js';

describe('Gargantua StateManager & Renderer Calibration', () => {
  it('default camera pitch/inclination is not coplanar with accretion disk', () => {
    const manager = new StateManager();
    const state = manager.getState();

    // Disk lies in y = 0. Coplanar would be inclination = 0.
    expect(state.camera.inclination).toBeGreaterThan(0.2); // > 11 degrees
    expect(state.camera.inclination).toBeLessThan(1.55); // < 89 degrees
    expect(
      Math.abs(state.camera.inclination - (78 * Math.PI) / 180),
    ).toBeLessThan(0.001);
  });

  it('default distance and FOV are calibrated to 26M and 48 degrees', () => {
    const manager = new StateManager();
    const state = manager.getState();

    expect(state.camera.distance).toBe(26.0);
    expect(state.camera.fov).toBe(48.0);
  });

  it('zoom inputs modify distance and respect bounds', () => {
    const manager = new StateManager();

    // Zoom in
    manager.zoomBy(-10.0);
    expect(manager.getState().camera.distance).toBe(16.0);

    // Zoom out beyond max bound
    manager.zoomBy(200.0);
    expect(manager.getState().camera.distance).toBe(MAX_DISTANCE);

    // Zoom in beyond min bound
    manager.setDistance(2.0);
    expect(manager.getState().camera.distance).toBe(MIN_DISTANCE);
  });

  it('camera orbit controls stay bounded', () => {
    const manager = new StateManager();

    // Orbit to near vertical
    manager.setOrbit(Math.PI, 0);
    expect(manager.getState().camera.inclination).toBeLessThan(Math.PI / 2);

    // Orbit to flat coplanar
    manager.setOrbit(0, 0);
    expect(manager.getState().camera.inclination).toBeGreaterThan(0.05);
  });

  it('pause freezes simulation time and resume continues smoothly', () => {
    const manager = new StateManager();
    const initialTime = manager.getState().time;

    manager.setPaused(true);
    manager.update(1.5);
    expect(manager.getState().time).toBe(initialTime);

    manager.setPaused(false);
    manager.update(0.5);
    expect(manager.getState().time).toBe(initialTime + 0.5);
  });

  it('mode switching changes color beaming model state', () => {
    const manager = new StateManager();
    expect(manager.getState().mode).toBe('cinematic');

    manager.setMode('physical');
    expect(manager.getState().mode).toBe('physical');
  });

  it('lensing comparison target transitions smoothly', () => {
    const manager = new StateManager();
    expect(manager.getState().lensing).toBe(1.0);

    manager.setLensingTarget(0.0);
    expect(manager.getState().targetLensing).toBe(0.0);

    // Update state over time to lerp towards target
    manager.update(0.5);
    expect(manager.getState().lensing).toBeLessThan(1.0);

    manager.update(1.0);
    expect(manager.getState().lensing).toBe(0.0);
  });

  it('reset restores calibrated default state', () => {
    const manager = new StateManager();
    manager.setDistance(60.0);
    manager.setMode('physical');
    manager.setLensingTarget(0.0);

    manager.reset();
    const state = manager.getState();
    expect(state.camera.distance).toBe(DEFAULT_CAMERA.distance);
    expect(state.lensing).toBe(1.0);
  });
});
