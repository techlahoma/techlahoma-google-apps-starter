import type {Mode, Quality, RenderState} from './types.js';

export const DEFAULT_CAMERA = {
  distance: 26.0,
  inclination: (78.0 * Math.PI) / 180.0, // 78 degrees in radians
  yaw: 0.0,
  fov: 48.0,
};

export const MIN_DISTANCE = 8.0;
export const MAX_DISTANCE = 100.0;
export const MIN_INCLINATION = (5.0 * Math.PI) / 180.0;
export const MAX_INCLINATION = (88.0 * Math.PI) / 180.0;

export class StateManager {
  private state: RenderState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const urlParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const isCapture = urlParams.get('capture') === '1';

    const isMobilePortrait =
      typeof window !== 'undefined' &&
      window.innerWidth / window.innerHeight < 0.7;
    let distance = isMobilePortrait ? 55.0 : DEFAULT_CAMERA.distance;
    let inclination = DEFAULT_CAMERA.inclination;
    let mode: Mode = 'cinematic';
    let lensing = 1.0;
    let time = 0.0;

    if (urlParams.has('distance')) {
      const d = parseFloat(urlParams.get('distance') || '');
      if (!isNaN(d))
        distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, d));
    }
    if (urlParams.has('inclination')) {
      const inc = parseFloat(urlParams.get('inclination') || '');
      if (!isNaN(inc))
        inclination = Math.max(
          MIN_INCLINATION,
          Math.min(MAX_INCLINATION, (inc * Math.PI) / 180.0),
        );
    }
    if (urlParams.get('mode') === 'physical') {
      mode = 'physical';
    }
    if (urlParams.has('lensing')) {
      const l = parseFloat(urlParams.get('lensing') || '');
      if (!isNaN(l)) lensing = Math.max(0.0, Math.min(1.0, l));
    }
    if (urlParams.has('time')) {
      const t = parseFloat(urlParams.get('time') || '');
      if (!isNaN(t)) time = t;
    }

    this.state = {
      camera: {
        distance,
        inclination,
        yaw: DEFAULT_CAMERA.yaw,
        fov: DEFAULT_CAMERA.fov,
      },
      lensing,
      targetLensing: lensing,
      mode,
      paused: isCapture ? true : isReducedMotion,
      time,
      quality: 'high',
      captureMode: isCapture,
    };
  }

  public getState(): Readonly<RenderState> {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setDistance(dist: number): void {
    const clamped = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, dist));
    if (this.state.camera.distance !== clamped) {
      this.state.camera.distance = clamped;
      this.notify();
    }
  }

  public zoomBy(delta: number): void {
    this.setDistance(this.state.camera.distance + delta);
  }

  public setOrbit(inclination: number, yaw: number): void {
    const clampedInc = Math.max(
      MIN_INCLINATION,
      Math.min(MAX_INCLINATION, inclination),
    );
    this.state.camera.inclination = clampedInc;
    this.state.camera.yaw = yaw;
    this.notify();
  }

  public orbitBy(deltaInc: number, deltaYaw: number): void {
    this.setOrbit(
      this.state.camera.inclination + deltaInc,
      this.state.camera.yaw + deltaYaw,
    );
  }

  public setLensingTarget(target: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, target));
    this.state.targetLensing = clamped;
    this.notify();
  }

  public toggleLensing(): void {
    const target = this.state.targetLensing > 0.5 ? 0.0 : 1.0;
    this.setLensingTarget(target);
  }

  public setMode(mode: Mode): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this.notify();
    }
  }

  public setPaused(paused: boolean): void {
    if (this.state.paused !== paused) {
      this.state.paused = paused;
      this.notify();
    }
  }

  public togglePaused(): void {
    this.setPaused(!this.state.paused);
  }

  public setQuality(quality: Quality): void {
    if (this.state.quality !== quality) {
      this.state.quality = quality;
      this.notify();
    }
  }

  public update(dt: number): void {
    // Animate lensing towards target
    if (Math.abs(this.state.lensing - this.state.targetLensing) > 0.001) {
      const speed = 4.0; // Lerp speed
      this.state.lensing +=
        (this.state.targetLensing - this.state.lensing) *
        Math.min(1.0, dt * speed);
      this.notify();
    } else {
      this.state.lensing = this.state.targetLensing;
    }

    // Accumulate simulation time if not paused
    if (!this.state.paused && !this.state.captureMode) {
      this.state.time += dt;
      this.notify();
    }
  }

  public reset(): void {
    this.state.camera = {...DEFAULT_CAMERA};
    this.state.targetLensing = 1.0;
    this.state.lensing = 1.0;
    this.notify();
  }
}
