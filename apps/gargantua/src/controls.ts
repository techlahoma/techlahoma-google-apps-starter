import {StateManager} from './state.js';

export class ControlManager {
  private stateManager: StateManager;
  private targetElement: HTMLElement;
  private isPointerDown = false;
  private lastPointerPos = {x: 0, y: 0};
  private initialPinchDist: number | null = null;
  private isHoldingLKey = false;
  private unbindEvents: Array<() => void> = [];

  constructor(stateManager: StateManager, targetElement: HTMLElement) {
    this.stateManager = stateManager;
    this.targetElement = targetElement;
    this.setupListeners();
  }

  private setupListeners(): void {
    const el = this.targetElement;

    // Pointer events (mouse / touch single finger orbit)
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.ui-interactive')) return;
      this.isPointerDown = true;
      this.lastPointerPos = {x: e.clientX, y: e.clientY};
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isPointerDown) return;

      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos = {x: e.clientX, y: e.clientY};

      const sensitivity = 0.005;
      // Orbit: dx changes yaw, dy changes inclination
      this.stateManager.orbitBy(-dy * sensitivity, -dx * sensitivity);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.isPointerDown) {
        this.isPointerDown = false;
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore if pointer capture lost
        }
      }
    };

    // Wheel / Trackpad zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.03;
      this.stateManager.zoomBy(zoomFactor);
    };

    // Touch events for two-finger pinch zoom
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        if (t1 && t2) {
          const dist = Math.hypot(
            t1.clientX - t2.clientX,
            t1.clientY - t2.clientY,
          );

          if (this.initialPinchDist === null) {
            this.initialPinchDist = dist;
          } else {
            const delta = (this.initialPinchDist - dist) * 0.1;
            this.stateManager.zoomBy(delta);
            this.initialPinchDist = dist;
          }
        }
      }
    };

    const onTouchEnd = () => {
      this.initialPinchDist = null;
    };

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case 'l':
        case 'L':
          if (!this.isHoldingLKey) {
            this.isHoldingLKey = true;
            this.stateManager.setLensingTarget(0.0); // Flatten spacetime on hold
          }
          break;
        case 'r':
        case 'R':
          this.stateManager.reset();
          break;
        case '+':
        case '=':
          this.stateManager.zoomBy(-2.0); // Zoom in
          break;
        case '-':
        case '_':
          this.stateManager.zoomBy(2.0); // Zoom out
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.stateManager.orbitBy(0.05, 0.0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.stateManager.orbitBy(-0.05, 0.0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.stateManager.orbitBy(0.0, 0.05);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.stateManager.orbitBy(0.0, -0.05);
          break;
        case ' ':
          e.preventDefault();
          this.stateManager.togglePaused();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        this.isHoldingLKey = false;
        this.stateManager.setLensingTarget(1.0); // Restore GR lensing on release
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('wheel', onWheel, {passive: false});
    el.addEventListener('touchmove', onTouchMove, {passive: true});
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.unbindEvents.push(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });
  }

  public destroy(): void {
    for (const unbind of this.unbindEvents) {
      unbind();
    }
    this.unbindEvents = [];
  }
}
