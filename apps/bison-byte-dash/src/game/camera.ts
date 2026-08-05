import {FilesetResolver, PoseLandmarker} from '@mediapipe/tasks-vision';

export interface CameraCallbacks {
  onJump: () => void;
  onError: (errorMsg: string) => void;
  onStatusChange: (active: boolean, message: string) => void;
}

export class CameraTracker {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private animFrameId: number | null = null;
  private isActive = false;
  private baselineY: number | null = null;
  private lastJumpTime = 0;

  async start(videoElement: HTMLVideoElement, callbacks: CameraCallbacks) {
    if (this.isActive) return;

    this.video = videoElement;
    callbacks.onStatusChange(false, 'Loading MediaPipe Pose Landmarker...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {width: 640, height: 480, facingMode: 'user'},
      });
      this.video.srcObject = this.stream;
      await this.video.play();

      callbacks.onStatusChange(false, 'Initializing Pose Detection model...');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      this.isActive = true;
      callbacks.onStatusChange(
        true,
        'Camera active. Stand back and jump to hop!',
      );
      this.detectLoop(callbacks);
    } catch (err: unknown) {
      this.stop();
      const message =
        err instanceof Error
          ? err.message
          : 'Camera permission or model loading failed.';
      callbacks.onError(message);
    }
  }

  private detectLoop(callbacks: CameraCallbacks) {
    if (!this.isActive || !this.video || !this.poseLandmarker) return;

    if (this.video.readyState >= 2) {
      const startTimeMs = performance.now();
      try {
        const results = this.poseLandmarker.detectForVideo(
          this.video,
          startTimeMs,
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          if (landmarks && landmarks.length >= 13) {
            const nose = landmarks[0];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];

            if (nose && leftShoulder && rightShoulder) {
              const currentY = nose.y;

              if (this.baselineY === null) {
                this.baselineY = currentY;
              } else {
                this.baselineY = this.baselineY * 0.95 + currentY * 0.05;
              }

              const jumpDelta = this.baselineY - currentY;
              const now = performance.now();
              if (jumpDelta > 0.07 && now - this.lastJumpTime > 500) {
                this.lastJumpTime = now;
                callbacks.onJump();
              }
            }
          }
        }
      } catch (e) {
        console.warn('Frame detection error:', e);
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.detectLoop(callbacks));
  }

  stop() {
    this.isActive = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.poseLandmarker) {
      try {
        this.poseLandmarker.close();
      } catch {
        // Ignore close errors
      }
      this.poseLandmarker = null;
    }
    this.baselineY = null;
  }

  get isRunning(): boolean {
    return this.isActive;
  }
}
