import {StateManager} from './state.js';

export class UIManager {
  private stateManager: StateManager;
  private rootContainer: HTMLElement;
  private infoModalOpen = false;
  private readoutTimer: number | null = null;
  private readoutElement: HTMLElement | null = null;
  private fpsElement: HTMLElement | null = null;
  private frameTimeElement: HTMLElement | null = null;

  constructor(stateManager: StateManager, rootContainer: HTMLElement) {
    this.stateManager = stateManager;
    this.rootContainer = rootContainer;
    this.renderUI();
    this.bindState();
  }

  private renderUI(): void {
    const state = this.stateManager.getState();
    if (state.captureMode) {
      // In capture mode, render minimal overlay without obstructive UI elements
      this.rootContainer.innerHTML = `
        <div class="capture-watermark ui-interactive">
          <span class="brand">GARGANTUA</span>
          <span class="meta">${state.camera.distance.toFixed(1)}M | ${state.mode.toUpperCase()}</span>
        </div>
      `;
      return;
    }

    this.rootContainer.innerHTML = `
      <header class="app-header ui-interactive">
        <div class="title-group">
          <h1>GARGANTUA</h1>
          <p class="subtitle">Interactive Schwarzschild Black Hole Ray Tracer</p>
        </div>
        <div class="header-actions">
          <button id="btn-info" class="btn btn-secondary" aria-label="Open renderer technical explanation">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            How it works
          </button>
        </div>
      </header>

      <div id="zoom-readout" class="zoom-readout hidden">Distance: 30.0M</div>

      <div class="controls-overlay ui-interactive">
        <div class="control-card">
          <!-- Hold to flatten spacetime -->
          <div class="control-row highlight-row">
            <button id="btn-hold-lensing" class="btn btn-primary btn-hold" aria-label="Hold to flatten spacetime">
              <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20M6 6l12 12M6 18L18 6"></path>
              </svg>
              <span>Hold to flatten spacetime</span>
              <span class="key-hint">(L)</span>
            </button>
            <button id="btn-toggle-lensing" class="btn btn-secondary btn-icon-label" title="Toggle Lensing">
              <span id="lensing-status-text">Lensing: On</span>
            </button>
          </div>

          <!-- Mode and Simulation controls -->
          <div class="control-row">
            <div class="mode-switch-group" role="radiogroup" aria-label="Color Mode">
              <button id="mode-cinematic" class="btn-mode ${state.mode === 'cinematic' ? 'active' : ''}" role="radio" aria-checked="${state.mode === 'cinematic'}">Cinematic</button>
              <button id="mode-physical" class="btn-mode ${state.mode === 'physical' ? 'active' : ''}" role="radio" aria-checked="${state.mode === 'physical'}">Physical</button>
            </div>
            <button id="btn-pause" class="btn btn-secondary btn-icon-label" aria-label="Pause or Resume animation">
              <span id="pause-text">${state.paused ? 'Resume' : 'Pause'}</span>
            </button>
          </div>

          <!-- Zoom & Orbit controls -->
          <div class="control-row zoom-row">
            <label for="slider-distance" class="control-label">Distance</label>
            <input type="range" id="slider-distance" min="8" max="100" step="0.5" value="${state.camera.distance}" aria-label="Observer Distance">
            <button id="btn-zoom-in" class="btn btn-small" title="Zoom in (+)">+</button>
            <button id="btn-zoom-out" class="btn btn-small" title="Zoom out (-)">−</button>
            <button id="btn-reset" class="btn btn-secondary btn-small" title="Reset camera (R)">Reset</button>
          </div>
        </div>
      </div>

      <!-- Technical Explanation Modal -->
      <div id="modal-info" class="modal-backdrop hidden ui-interactive" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-card">
          <div class="modal-header">
            <h2 id="modal-title">How this renderer works</h2>
            <button id="btn-close-modal" class="btn-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body">
            <section class="info-section">
              <h3>Physics & Rendering Model</h3>
              <p>
                This visualizer solves photon null geodesics backward in time through 3D <strong>Schwarzschild spacetime</strong>. 
                Light path trajectories follow numerical Runge-Kutta 4th order (RK4) ODE integration:
              </p>
              <div class="math-block">
                $$\\frac{d^2 \\vec{x}}{d\\lambda^2} = - \\alpha \\cdot \\frac{3 M |\\vec{x} \\times \\vec{v}|^2}{r^5} \\vec{x}$$
              </div>
              <p>
                where $\\alpha \\in [0, 1]$ represents continuous spacetime curvature. At $\\alpha = 1.0$, light curves along exact General Relativistic paths. Holding the <em>Flatten Spacetime</em> control smoothly sets $\\alpha \\to 0.0$ (Minkowski geometry) for direct educational comparison.
              </p>
            </section>

            <section class="info-section">
              <h3>Accretion Disk & Relativistic Beaming</h3>
              <p>
                Rays that cross the equatorial plane ($y=0$) between $r = 2.6M$ and $r = 12.0M$ accumulate turbulent plasma emission. 
                Dynamic Keplerian rotation $\\Omega(r) \\propto r^{-3/2}$ advects disk filaments over time. 
                Relativistic Doppler shift $\\delta = \\frac{\\sqrt{1-v^2}}{1 - v_{los}}$ amplifies brightness on the approaching side ($I \\propto \\delta^{3.5}$ in Physical mode).
              </p>
            </section>

            <section class="info-section">
              <h3>Live Telemetry & Performance</h3>
              <div class="telemetry-grid">
                <div class="telemetry-item"><span class="label">Metric:</span> <span class="val">Schwarzschild (M=1.0)</span></div>
                <div class="telemetry-item"><span class="label">Horizon $r_h$:</span> <span class="val">2.0 M</span></div>
                <div class="telemetry-item"><span class="label">Photon Sphere:</span> <span class="val">3.0 M</span></div>
                <div class="telemetry-item"><span class="label">Shadow Radius:</span> <span class="val">5.196 M</span></div>
                <div class="telemetry-item"><span class="label">Framerate:</span> <span id="telemetry-fps" class="val">-- FPS</span></div>
                <div class="telemetry-item"><span class="label">Frame Time:</span> <span id="telemetry-time" class="val">-- ms</span></div>
              </div>
            </section>

            <section class="info-section">
              <h3>Scientific References</h3>
              <ul class="ref-list">
                <li><a href="https://arxiv.org/abs/1502.03808" target="_blank" rel="noopener">James et al. (2015) - Gravitational Lensing by Spinning Black Holes in Interstellar (DNGR)</a></li>
                <li><a href="https://arxiv.org/abs/2010.08735" target="_blank" rel="noopener">Bruneton (2020) - Real-time WebGL2 Black-Hole Rendering</a></li>
                <li><a href="https://eventhorizontelescope.org/faq/how-realistic-are-movie-depictions-black-holes-eg-interstellar" target="_blank" rel="noopener">Event Horizon Telescope - Realism of Movie Black Holes</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    `;

    this.readoutElement = this.rootContainer.querySelector('#zoom-readout');
    this.fpsElement = this.rootContainer.querySelector('#telemetry-fps');
    this.frameTimeElement = this.rootContainer.querySelector('#telemetry-time');

    this.setupEvents();
  }

  private setupEvents(): void {
    const state = this.stateManager.getState();
    if (state.captureMode) return;

    // Hold to flatten spacetime button
    const btnHold = this.rootContainer.querySelector('#btn-hold-lensing');
    if (btnHold) {
      const startHold = () => this.stateManager.setLensingTarget(0.0);
      const endHold = () => this.stateManager.setLensingTarget(1.0);

      btnHold.addEventListener('pointerdown', startHold);
      btnHold.addEventListener('pointerup', endHold);
      btnHold.addEventListener('mouseleave', endHold);
      btnHold.addEventListener(
        'touchstart',
        e => {
          e.preventDefault();
          startHold();
        },
        {passive: false},
      );
      btnHold.addEventListener('touchend', endHold);
    }

    // Toggle lensing
    const btnToggleLensing = this.rootContainer.querySelector(
      '#btn-toggle-lensing',
    );
    if (btnToggleLensing) {
      btnToggleLensing.addEventListener('click', () =>
        this.stateManager.toggleLensing(),
      );
    }

    // Modes
    const modeCinematic = this.rootContainer.querySelector('#mode-cinematic');
    const modePhysical = this.rootContainer.querySelector('#mode-physical');
    if (modeCinematic && modePhysical) {
      modeCinematic.addEventListener('click', () =>
        this.stateManager.setMode('cinematic'),
      );
      modePhysical.addEventListener('click', () =>
        this.stateManager.setMode('physical'),
      );
    }

    // Pause/Resume
    const btnPause = this.rootContainer.querySelector('#btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () =>
        this.stateManager.togglePaused(),
      );
    }

    // Distance slider & buttons
    const sliderDistance = this.rootContainer.querySelector(
      '#slider-distance',
    ) as HTMLInputElement;
    if (sliderDistance) {
      sliderDistance.addEventListener('input', () => {
        const val = parseFloat(sliderDistance.value);
        this.stateManager.setDistance(val);
        this.showZoomReadout(val);
      });
    }

    const btnZoomIn = this.rootContainer.querySelector('#btn-zoom-in');
    const btnZoomOut = this.rootContainer.querySelector('#btn-zoom-out');
    const btnReset = this.rootContainer.querySelector('#btn-reset');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.stateManager.zoomBy(-3.0);
        this.showZoomReadout(this.stateManager.getState().camera.distance);
      });
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.stateManager.zoomBy(3.0);
        this.showZoomReadout(this.stateManager.getState().camera.distance);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => this.stateManager.reset());
    }

    // Info modal toggle
    const btnInfo = this.rootContainer.querySelector('#btn-info');
    const btnCloseModal = this.rootContainer.querySelector('#btn-close-modal');
    const modalInfo = this.rootContainer.querySelector('#modal-info');

    if (btnInfo && modalInfo && btnCloseModal) {
      btnInfo.addEventListener('click', () => {
        modalInfo.classList.remove('hidden');
        this.infoModalOpen = true;
      });
      btnCloseModal.addEventListener('click', () => {
        modalInfo.classList.add('hidden');
        this.infoModalOpen = false;
      });
      modalInfo.addEventListener('click', e => {
        if (e.target === modalInfo) {
          modalInfo.classList.add('hidden');
          this.infoModalOpen = false;
        }
      });
    }
  }

  private bindState(): void {
    this.stateManager.subscribe(() => {
      const state = this.stateManager.getState();
      if (state.captureMode) return;

      // Update lensing status button text
      const lensingText = this.rootContainer.querySelector(
        '#lensing-status-text',
      );
      if (lensingText) {
        const percentage = Math.round(state.lensing * 100);
        lensingText.textContent =
          state.lensing > 0.95
            ? 'Lensing: On'
            : state.lensing < 0.05
              ? 'Lensing: Off'
              : `Lensing: ${percentage}%`;
      }

      // Update mode buttons active state
      const modeCinematic = this.rootContainer.querySelector('#mode-cinematic');
      const modePhysical = this.rootContainer.querySelector('#mode-physical');
      if (modeCinematic && modePhysical) {
        modeCinematic.classList.toggle('active', state.mode === 'cinematic');
        modePhysical.classList.toggle('active', state.mode === 'physical');
      }

      // Update pause text
      const pauseText = this.rootContainer.querySelector('#pause-text');
      if (pauseText) {
        pauseText.textContent = state.paused ? 'Resume' : 'Pause';
      }

      // Update slider value
      const sliderDistance = this.rootContainer.querySelector(
        '#slider-distance',
      ) as HTMLInputElement;
      if (sliderDistance && document.activeElement !== sliderDistance) {
        sliderDistance.value = state.camera.distance.toString();
      }
    });
  }

  public showZoomReadout(dist: number): void {
    if (!this.readoutElement) return;

    this.readoutElement.textContent = `Distance: ${dist.toFixed(1)}M`;
    this.readoutElement.classList.remove('hidden');

    if (this.readoutTimer !== null) {
      window.clearTimeout(this.readoutTimer);
    }

    this.readoutTimer = window.setTimeout(() => {
      if (this.readoutElement) {
        this.readoutElement.classList.add('hidden');
      }
    }, 1500);
  }

  public updateTelemetry(fps: number, frameTimeMs: number): void {
    if (this.fpsElement) this.fpsElement.textContent = `${fps} FPS`;
    if (this.frameTimeElement)
      this.frameTimeElement.textContent = `${frameTimeMs} ms`;
  }
}
