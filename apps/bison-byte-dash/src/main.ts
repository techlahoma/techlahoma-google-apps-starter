import {
  createInitialState,
  updateGameState,
  startGame,
  pauseGame,
  resumeGame,
  restartGame,
  loadHighScore,
} from './game/physics';
import type {GameState} from './game/types';
import {GameRenderer} from './game/renderer';
import {sound} from './game/sound';
import {CameraTracker} from './game/camera';

class GameController {
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;
  private state: GameState;
  private cameraTracker: CameraTracker;
  private lastTime = 0;
  private jumpRequested = false;

  // DOM Elements
  private hudScore: HTMLElement;
  private hudTimer: HTMLElement;
  private hudHighScore: HTMLElement;
  private timerBadge: HTMLElement;

  private overlayIdle: HTMLElement;
  private overlayPause: HTMLElement;
  private overlayGameOver: HTMLElement;

  private finalScore: HTMLElement;
  private finalHighScore: HTMLElement;
  private highScoreTag: HTMLElement;

  private btnStart: HTMLButtonElement;
  private btnResume: HTMLButtonElement;
  private btnRestart: HTMLButtonElement;
  private btnJumpTouch: HTMLButtonElement;

  private btnSound: HTMLButtonElement;
  private btnMotion: HTMLButtonElement;
  private btnCameraToggle: HTMLButtonElement;

  // Camera DOM
  private cameraModal: HTMLElement;
  private btnCameraAllow: HTMLButtonElement;
  private btnCameraCancel: HTMLButtonElement;
  private cameraPip: HTMLElement;
  private cameraVideo: HTMLVideoElement;
  private cameraStatusText: HTMLElement;
  private cameraJumpIndicator: HTMLElement;
  private btnCameraStop: HTMLButtonElement;

  // Toast DOM
  private toastFallback: HTMLElement;
  private toastMsg: HTMLElement;
  private btnToastDismiss: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer(this.canvas);
    this.cameraTracker = new CameraTracker();

    const highScore = loadHighScore();
    this.state = createInitialState(highScore);

    // DOM Binding
    this.hudScore = document.getElementById('hud-score')!;
    this.hudTimer = document.getElementById('hud-timer')!;
    this.hudHighScore = document.getElementById('hud-highscore')!;
    this.timerBadge = document.getElementById('timer-badge')!;

    this.overlayIdle = document.getElementById('overlay-idle')!;
    this.overlayPause = document.getElementById('overlay-pause')!;
    this.overlayGameOver = document.getElementById('overlay-gameover')!;

    this.finalScore = document.getElementById('final-score')!;
    this.finalHighScore = document.getElementById('final-highscore')!;
    this.highScoreTag = document.getElementById('high-score-tag')!;

    this.btnStart = document.getElementById('btn-start') as HTMLButtonElement;
    this.btnResume = document.getElementById('btn-resume') as HTMLButtonElement;
    this.btnRestart = document.getElementById(
      'btn-restart',
    ) as HTMLButtonElement;
    this.btnJumpTouch = document.getElementById(
      'btn-jump-touch',
    ) as HTMLButtonElement;

    this.btnSound = document.getElementById('btn-sound') as HTMLButtonElement;
    this.btnMotion = document.getElementById('btn-motion') as HTMLButtonElement;
    this.btnCameraToggle = document.getElementById(
      'btn-camera-toggle',
    ) as HTMLButtonElement;

    this.cameraModal = document.getElementById('camera-modal')!;
    this.btnCameraAllow = document.getElementById(
      'btn-camera-allow',
    ) as HTMLButtonElement;
    this.btnCameraCancel = document.getElementById(
      'btn-camera-cancel',
    ) as HTMLButtonElement;
    this.cameraPip = document.getElementById('camera-pip')!;
    this.cameraVideo = document.getElementById(
      'camera-video',
    ) as HTMLVideoElement;
    this.cameraStatusText = document.getElementById('camera-status-text')!;
    this.cameraJumpIndicator = document.getElementById(
      'camera-jump-indicator',
    )!;
    this.btnCameraStop = document.getElementById(
      'btn-camera-stop',
    ) as HTMLButtonElement;

    this.toastFallback = document.getElementById('toast-fallback')!;
    this.toastMsg = document.getElementById('toast-msg')!;
    this.btnToastDismiss = document.getElementById(
      'btn-toast-dismiss',
    ) as HTMLButtonElement;

    this.initListeners();
    this.checkPrefersReducedMotion();
    this.updateHUD();

    // Start render loop
    requestAnimationFrame(t => this.loop(t));
  }

  private initListeners() {
    // 1. Keyboard Inputs
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.triggerJump();
      } else if (e.code === 'KeyP') {
        this.togglePause();
      } else if (e.code === 'KeyR') {
        this.onRestart();
      }
    });

    // 2. Touch / Pointer Inputs
    const handleJumpInput = (e: Event) => {
      e.preventDefault();
      this.triggerJump();
    };

    this.btnJumpTouch.addEventListener('pointerdown', handleJumpInput);
    this.canvas.addEventListener('pointerdown', handleJumpInput);

    // Buttons
    this.btnStart.addEventListener('click', () => this.onStart());
    this.btnResume.addEventListener('click', () => this.onResume());
    this.btnRestart.addEventListener('click', () => this.onRestart());

    // Settings Toggles
    this.btnSound.addEventListener('click', () => this.toggleSound());
    this.btnMotion.addEventListener('click', () => this.toggleMotion());
    this.btnCameraToggle.addEventListener('click', () =>
      this.showCameraModal(),
    );

    // Camera Permission Modal Buttons
    this.btnCameraAllow.addEventListener('click', () => this.startCamera());
    this.btnCameraCancel.addEventListener('click', () =>
      this.hideCameraModal(),
    );
    this.btnCameraStop.addEventListener('click', () => this.stopCamera());

    // Toast Dismiss
    this.btnToastDismiss.addEventListener('click', () => {
      this.toastFallback.classList.add('hidden');
    });

    // Window Blur auto-pause
    window.addEventListener('blur', () => {
      if (this.state.status === 'PLAYING') {
        this.state = pauseGame(this.state);
        this.updateOverlays();
      }
    });
  }

  private checkPrefersReducedMotion() {
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.state.reducedMotion = true;
      document.body.classList.add('reduced-motion');
      this.btnMotion.querySelector('.label')!.textContent = 'Motion: Reduced';
    }
  }

  private triggerJump() {
    if (this.state.status === 'IDLE' || this.state.status === 'GAMEOVER') {
      this.onStart();
      return;
    }
    if (this.state.status === 'PAUSED') {
      this.onResume();
      return;
    }
    if (this.state.status === 'PLAYING') {
      this.jumpRequested = true;
      if (this.state.bison.isGrounded) {
        sound.playJump();
      }
    }
  }

  private onStart() {
    this.state = startGame(this.state);
    this.updateOverlays();
  }

  private onResume() {
    this.state = resumeGame(this.state);
    this.updateOverlays();
  }

  private onRestart() {
    this.state = restartGame(this.state);
    this.updateOverlays();
  }

  private togglePause() {
    if (this.state.status === 'PLAYING') {
      this.state = pauseGame(this.state);
    } else if (this.state.status === 'PAUSED') {
      this.state = resumeGame(this.state);
    }
    this.updateOverlays();
  }

  private toggleSound() {
    this.state.soundEnabled = !this.state.soundEnabled;
    sound.enabled = this.state.soundEnabled;
    const label = this.btnSound.querySelector('.label')!;
    const icon = this.btnSound.querySelector('.icon')!;
    if (this.state.soundEnabled) {
      label.textContent = 'Sound ON';
      icon.textContent = '🔊';
    } else {
      label.textContent = 'Sound OFF';
      icon.textContent = '🔇';
    }
  }

  private toggleMotion() {
    this.state.reducedMotion = !this.state.reducedMotion;
    const label = this.btnMotion.querySelector('.label')!;
    if (this.state.reducedMotion) {
      document.body.classList.add('reduced-motion');
      label.textContent = 'Motion: Reduced';
    } else {
      document.body.classList.remove('reduced-motion');
      label.textContent = 'Motion: Normal';
    }
  }

  private showCameraModal() {
    this.cameraModal.classList.remove('hidden');
  }

  private hideCameraModal() {
    this.cameraModal.classList.add('hidden');
  }

  private async startCamera() {
    this.hideCameraModal();
    this.cameraPip.classList.remove('hidden');

    await this.cameraTracker.start(this.cameraVideo, {
      onJump: () => {
        this.triggerJump();
        this.cameraJumpIndicator.classList.remove('hidden');
        setTimeout(() => {
          this.cameraJumpIndicator.classList.add('hidden');
        }, 400);
      },
      onError: errMsg => {
        this.stopCamera();
        this.showFallbackToast(
          `Camera error: ${errMsg}. Fallback to Keyboard / Touch mode active!`,
        );
      },
      onStatusChange: (active, msg) => {
        this.state.cameraActive = active;
        this.cameraStatusText.textContent = msg;
      },
    });
  }

  private stopCamera() {
    this.cameraTracker.stop();
    this.state.cameraActive = false;
    this.cameraPip.classList.add('hidden');
    this.cameraStatusText.textContent = 'Camera Off';
  }

  private showFallbackToast(msg: string) {
    this.toastMsg.textContent = msg;
    this.toastFallback.classList.remove('hidden');
  }

  private updateOverlays() {
    this.overlayIdle.classList.add('hidden');
    this.overlayPause.classList.add('hidden');
    this.overlayGameOver.classList.add('hidden');

    if (this.state.status === 'IDLE') {
      this.overlayIdle.classList.remove('hidden');
    } else if (this.state.status === 'PAUSED') {
      this.overlayPause.classList.remove('hidden');
    } else if (this.state.status === 'GAMEOVER') {
      this.finalScore.textContent = this.state.score.toString();
      this.finalHighScore.textContent = this.state.highScore.toString();

      if (this.state.score > 0 && this.state.score >= this.state.highScore) {
        this.highScoreTag.classList.remove('hidden');
      } else {
        this.highScoreTag.classList.add('hidden');
      }

      this.overlayGameOver.classList.remove('hidden');
      sound.playGameOver();
    }
  }

  private updateHUD() {
    this.hudScore.textContent = this.state.score.toString().padStart(4, '0');
    this.hudHighScore.textContent = this.state.highScore
      .toString()
      .padStart(4, '0');

    const timerStr = `${this.state.timeRemaining.toFixed(1)}s`;
    this.hudTimer.textContent = timerStr;

    if (this.state.timeRemaining <= 10.0 && this.state.status === 'PLAYING') {
      this.timerBadge.classList.add('warning');
    } else {
      this.timerBadge.classList.remove('warning');
    }
  }

  private loop(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    const input = {jumpPressed: this.jumpRequested};
    this.jumpRequested = false;

    const prevState = this.state;
    this.state = updateGameState(this.state, dt, input);

    // Audio feedback on pickups or collisions
    if (
      this.state.lastScoreGain > 0 &&
      this.state.lastScoreGain !== prevState.lastScoreGain
    ) {
      sound.playPickup();
    }
    if (this.state.score < prevState.score) {
      sound.playObstacleHit();
    }
    if (prevState.status === 'PLAYING' && this.state.status === 'GAMEOVER') {
      this.updateOverlays();
    }

    this.updateHUD();
    this.renderer.render(this.state);

    requestAnimationFrame(t => this.loop(t));
  }
}

// Instantiate on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
