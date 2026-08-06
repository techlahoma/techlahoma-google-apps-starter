import {ControlManager} from './controls.js';
import {WebGLRenderer} from './renderer.js';
import {StateManager} from './state.js';
import './style.css';
import {UIManager} from './ui.js';

function initApp(): void {
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas-webgl';
  appContainer.appendChild(canvas);

  const uiOverlay = document.createElement('div');
  uiOverlay.id = 'ui-overlay';
  appContainer.appendChild(uiOverlay);

  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer(canvas);
  } catch (err) {
    console.error('Failed to initialize WebGL2 renderer:', err);
    uiOverlay.innerHTML = `
      <div class="fallback-container ui-interactive">
        <h2>WebGL2 Not Supported</h2>
        <p>Your browser or graphics hardware does not support WebGL2 required for GPU ray tracing.</p>
      </div>
    `;
    return;
  }

  const stateManager = new StateManager();
  const controlManager = new ControlManager(stateManager, canvas);
  const uiManager = new UIManager(stateManager, uiOverlay);

  let lastFrameTime = performance.now();

  function animate(now: number): void {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    stateManager.update(dt);
    const state = stateManager.getState();

    if (renderer) {
      renderer.render(state);
      const perf = renderer.getPerformanceStats();
      uiManager.updateTelemetry(perf.fps, perf.frameTimeMs);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // Expose global object for automated testing & capture verification
  (window as unknown as Record<string, unknown>).__GARGANTUA__ = {
    stateManager,
    renderer,
    controlManager,
    uiManager,
  };
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
