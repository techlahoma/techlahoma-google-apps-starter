export type Mode = 'cinematic' | 'physical';
export type Quality = 'high' | 'medium' | 'low';

export interface CameraState {
  distance: number; // Observer distance in units of M (default ~30M)
  inclination: number; // Orbit pitch angle in radians (default ~78 deg = 1.3614 rad)
  yaw: number; // Orbit yaw angle in radians (default 0)
  fov: number; // Vertical field of view in degrees (default 50)
}

export interface RenderState {
  camera: CameraState;
  lensing: number; // Lensing strength: 1.0 = full GR curvature, 0.0 = flat Minkowski
  targetLensing: number; // Target lensing state for smooth animation
  mode: Mode; // Cinematic vs Physical Doppler beaming
  paused: boolean; // Animation pause state
  time: number; // Accumulated simulation time in seconds
  quality: Quality; // Quality level based on FPS / screen DPI
  captureMode: boolean; // Deterministic testing capture mode
}

export interface MetricParams {
  mass: number;
  rHorizon: number;
  rPhoton: number;
  rIn: number;
  rOut: number;
  shadowRadius: number;
}
