import {GameRenderer} from '../game/renderer';
import {PhysicsEngine, type CarControlInput} from '../game/physics';
import {
  initFirebase,
  createUniqueRoom,
  subscribeRoomState,
  subscribeInputs,
  publishHostSnapshot,
  updateRoomStatus,
  deleteRoom,
  type RoomState,
} from '../multiplayer/firebase';
import {generateJoinQR} from './qr-generator';
import {CourseDirector, type CourseStyle} from '../ai/course-director';
import {SyntheticReplayManager, SYNTHETIC_BOTS} from '../game/synthetic-replay';
import {TULSA_MAP_METADATA} from '../data/tulsa-map';

const HOST_CAR_ID = 'host-car';

export class HostViewController {
  private renderer!: GameRenderer;
  private physics!: PhysicsEngine;
  private courseDirector = new CourseDirector();
  private syntheticManager = new SyntheticReplayManager();

  private roomCode = '';
  private hostUid = '';
  private isFirebaseReady = false;
  private roomUnsubscribe: (() => void) | null = null;
  private inputsUnsubscribe: (() => void) | null = null;
  private snapshotErrorShown = false;

  private isRacing = false;
  private remainingTime = 75;
  private countdownValue = 0;
  private timerInterval: number | null = null;
  private hostKeyboardInput: CarControlInput = {
    steering: 0,
    throttle: 0,
    brake: false,
    boost: false,
    sequence: 0,
    timestamp: Date.now(),
  };

  private isReducedMotion = false;
  private containerEl!: HTMLElement;
  private activeCheckpoints: ReturnType<CourseDirector['resolveCheckpoints']> =
    [];

  public async mount(container: HTMLElement): Promise<void> {
    this.containerEl = container;
    this.isReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document.body.classList.toggle('reduced-motion', this.isReducedMotion);
    this.renderLayout();

    // The 3D attract scene starts independently of network initialization.
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer({
      canvas,
      isReducedMotion: this.isReducedMotion,
    });

    this.physics = new PhysicsEngine();
    await this.physics.init();

    const course = this.courseDirector.getPresetCourse('Around Gradient');
    this.activeCheckpoints = this.courseDirector.resolveCheckpoints(course);
    const spawn = this.startingPosition(0);
    this.physics.addCar(HOST_CAR_ID, '🦬', '#00f5d4', spawn);

    window.addEventListener('keydown', e => this.handleKeyDown(e));
    window.addEventListener('keyup', e => this.handleKeyUp(e));

    this.renderer.setCheckpoints(this.activeCheckpoints, 0);

    this.startLoop();
    await this.connectMultiplayer();
  }

  private async connectMultiplayer(): Promise<void> {
    try {
      const user = await initFirebase();
      this.hostUid = user.uid;
      this.roomCode = await createUniqueRoom(this.hostUid);
      const qrResult = await generateJoinQR(this.roomCode);
      const qrImg = document.getElementById('qr-code-img') as HTMLImageElement;
      if (qrImg) qrImg.src = qrResult.dataUrl;

      const roomCodeEl = document.getElementById('room-code-display');
      if (roomCodeEl) roomCodeEl.textContent = this.roomCode;
      const joinUrlEl = document.getElementById('join-url-display');
      if (joinUrlEl) joinUrlEl.textContent = qrResult.joinUrl;
      const warningEl = document.getElementById('qr-warning-display');
      if (warningEl && qrResult.warning) {
        warningEl.style.display = 'block';
        warningEl.textContent = qrResult.warning;
      }

      this.isFirebaseReady = true;
      const startButton = document.getElementById(
        'start-race-btn',
      ) as HTMLButtonElement;
      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = 'Start Race (75s)';
      }

      this.roomUnsubscribe = subscribeRoomState(this.roomCode, state =>
        this.onRoomStateUpdate(state),
      );
      this.inputsUnsubscribe = subscribeInputs(this.roomCode, inputs =>
        this.onPlayerInputsUpdate(inputs),
      );
    } catch (error) {
      this.isFirebaseReady = false;
      const startButton = document.getElementById(
        'start-race-btn',
      ) as HTMLButtonElement;
      if (startButton) {
        startButton.disabled = true;
        startButton.textContent = 'Multiplayer unavailable';
      }
      const joinUrlEl = document.getElementById('join-url-display');
      if (joinUrlEl) {
        joinUrlEl.textContent = `3D preview is running. Room setup failed: ${this.errorMessage(error)}`;
      }
    }
  }

  private renderLayout(): void {
    this.containerEl.innerHTML = `
      <div id="host-app">
        <div id="canvas-container">
          <canvas id="webgl-canvas"></canvas>
        </div>

        <div class="host-hud">
          <div class="host-header">
            <div>
              <div class="brand-title">Tulsa Gravity Rally</div>
              <div class="brand-subtitle">Giant-car downtown stunt racing • real Tulsa footprints around Gradient</div>
              <div class="host-control-hint">Host car: WASD / arrow keys • Shift or Space boosts</div>
            </div>

            <div id="qr-widget" class="glass-panel qr-widget hud-interactive">
              <img id="qr-code-img" class="qr-image" alt="Join QR Code" />
              <div id="room-code-display" class="room-code-badge">------</div>
              <div id="join-url-display" class="join-url-text" aria-live="polite">Initializing multiplayer room…</div>
              <div id="qr-warning-display" style="display:none; color:#ffb703; font-size:0.75rem; max-width:200px;"></div>
            </div>
          </div>

          <div id="lobby-panel" class="glass-panel lobby-center hud-interactive">
            <h2>Lobby • Scan QR Code to Join</h2>
            <div id="player-count-label" style="font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">Players Joined: 0 / 12</div>
            <div id="player-roster-grid" class="player-grid"></div>

            <div style="display:flex; justify-content:center; gap:12px; margin-top:8px; align-items:center; flex-wrap:wrap;">
              <label for="course-select-dropdown" style="font-weight:600;">Course Preset:</label>
              <select id="course-select-dropdown" style="background:#1b263b; color:#fff; border:1px solid #00f5d4; padding:8px 12px; border-radius:8px; font-weight:700;">
                <option value="Around Gradient">Around Gradient</option>
                <option value="More rooftop jumps">More rooftop jumps</option>
                <option value="Beginner friendly">Beginner friendly</option>
                <option value="Maximum chaos">Maximum chaos</option>
              </select>

              <button id="toggle-synthetic-btn" class="secondary-btn">Add 3 Synthetic Demo Cars</button>
            </div>

            <div style="margin-top:16px; display:flex; gap:12px; justify-content:center;">
              <button id="start-race-btn" class="primary-btn" disabled>Connecting Firebase...</button>
              <button id="end-session-btn" class="secondary-btn">End Session</button>
            </div>
          </div>

          <div id="race-hud-overlay" style="display:none; text-align:center;" class="glass-panel hud-interactive">
            <div id="countdown-text" style="font-size:4rem; font-weight:900; color:var(--accent-amber); text-shadow:0 0 20px #ffb703;">3</div>
            <div id="race-timer-text" style="font-size:2rem; font-weight:800; color:var(--accent-cyan); display:none;">Time Left: 75s</div>
          </div>

          <div id="standings-panel" style="display:none;" class="glass-panel standings-modal hud-interactive">
            <h2 style="text-align:center; color:var(--accent-amber); font-size:2rem;">🏁 Race Results</h2>
            <div id="standings-list" class="leaderboard-list"></div>
            <div style="text-align:center; margin-top:16px;">
              <button id="race-again-btn" class="primary-btn">Race Again</button>
            </div>
          </div>

          <div class="attribution-footer hud-interactive" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <button id="toggle-motion-btn" class="secondary-btn">Toggle Motion Reduction</button>
              <button id="toggle-text-view-btn" class="secondary-btn">2D Checkpoint View</button>
            </div>
            <div>
              ${TULSA_MAP_METADATA.attribution} • <a href="${TULSA_MAP_METADATA.licenseUrl}" target="_blank">ODbL License</a> •
              <i>${TULSA_MAP_METADATA.disclaimer}</i>
            </div>
          </div>
        </div>

        <div id="textual-view-panel" style="display:none; position:absolute; top:20%; left:20%; width:60%; height:60%; z-index:100; padding:24px;" class="glass-panel hud-interactive">
          <h3 style="color:var(--accent-cyan); margin-bottom:12px;">Accessible 2D Checkpoint Standings</h3>
          <div id="textual-content"></div>
          <button id="close-text-view-btn" class="secondary-btn" style="margin-top:16px;">Close</button>
        </div>
      </div>
    `;

    document
      .getElementById('start-race-btn')
      ?.addEventListener('click', () => this.startRaceCountdown());
    document
      .getElementById('end-session-btn')
      ?.addEventListener('click', () => this.endSession());
    document
      .getElementById('race-again-btn')
      ?.addEventListener('click', () => this.restartRace());
    document
      .getElementById('toggle-synthetic-btn')
      ?.addEventListener('click', () => this.toggleSyntheticCars());
    document
      .getElementById('toggle-motion-btn')
      ?.addEventListener('click', () => this.toggleReducedMotion());
    document
      .getElementById('toggle-text-view-btn')
      ?.addEventListener('click', () => this.toggleTextView(true));
    document
      .getElementById('close-text-view-btn')
      ?.addEventListener('click', () => this.toggleTextView(false));

    document
      .getElementById('course-select-dropdown')
      ?.addEventListener('change', e => {
        const style = (e.target as HTMLSelectElement).value as CourseStyle;
        const course = this.courseDirector.getPresetCourse(style);
        const checkpoints = this.courseDirector.resolveCheckpoints(course);
        this.activeCheckpoints = checkpoints;
        this.renderer.setCheckpoints(this.activeCheckpoints, 0);
        this.physics?.resetRace();
      });
  }

  private async endSession(): Promise<void> {
    this.roomUnsubscribe?.();
    this.inputsUnsubscribe?.();
    this.roomUnsubscribe = null;
    this.inputsUnsubscribe = null;
    if (this.roomCode) {
      try {
        await deleteRoom(this.roomCode);
      } catch {
        // Ignore
      }
      this.roomCode = '';
    }
    window.location.reload();
  }

  private toggleSyntheticCars(): void {
    if (this.syntheticManager.isActive()) {
      this.syntheticManager.stop();
      for (const bot of SYNTHETIC_BOTS) {
        this.physics.removeCar(bot.id);
      }
      (
        document.getElementById('toggle-synthetic-btn') as HTMLElement
      ).textContent = 'Add 3 Synthetic Demo Cars';
    } else {
      this.syntheticManager.start();
      SYNTHETIC_BOTS.forEach((bot, idx) => {
        this.physics.addCar(
          bot.id,
          bot.emoji,
          bot.color,
          this.startingPosition(idx + 1),
        );
      });
      (
        document.getElementById('toggle-synthetic-btn') as HTMLElement
      ).textContent = 'Remove Synthetic Demo Cars';
    }
  }

  private toggleReducedMotion(): void {
    this.isReducedMotion = !this.isReducedMotion;
    document.body.classList.toggle('reduced-motion', this.isReducedMotion);
    this.renderer.setReducedMotion(this.isReducedMotion);
  }

  private toggleTextView(show: boolean): void {
    const el = document.getElementById('textual-view-panel');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  private onRoomStateUpdate(state: RoomState | null): void {
    if (!state) {
      if (this.isFirebaseReady) {
        this.showConnectionNotice('Room ended or multiplayer disconnected.');
      }
      return;
    }

    const players = state.players ?? {};
    const playerList = Object.values(players);

    const countEl = document.getElementById('player-count-label');
    if (countEl)
      countEl.textContent = `Players Joined: ${playerList.length} / 12`;

    const grid = document.getElementById('player-roster-grid');
    if (grid) {
      grid.replaceChildren(
        ...playerList.map(player => {
          const chip = document.createElement('div');
          chip.className = 'player-chip';
          chip.style.borderLeftColor = player.color;
          const emoji = document.createElement('span');
          emoji.className = 'emoji';
          emoji.textContent = player.emoji;
          const label = document.createElement('span');
          label.textContent = `Driver ${player.slot + 1}`;
          chip.append(emoji, label);
          return chip;
        }),
      );
    }

    const activePlayerIds = new Set(playerList.map(player => player.uid));
    for (const carId of this.physics.getCarStates().keys()) {
      if (
        carId !== HOST_CAR_ID &&
        !SYNTHETIC_BOTS.some(bot => bot.id === carId) &&
        !activePlayerIds.has(carId)
      ) {
        this.physics.removeCar(carId);
      }
    }

    playerList.forEach(player => {
      if (!this.physics.hasCar(player.uid)) {
        this.physics.addCar(
          player.uid,
          player.emoji,
          player.color,
          this.startingPosition(player.slot + 4),
        );
      }
    });
  }

  private onPlayerInputsUpdate(inputs: Record<string, CarControlInput>): void {
    if (!this.physics) return;
    for (const [uid, input] of Object.entries(inputs)) {
      this.physics.updateCarInput(uid, input);
    }
  }

  private startRaceCountdown(): void {
    if (!this.isFirebaseReady || !this.roomCode) return;

    this.isRacing = false;
    this.countdownValue = 3;
    this.remainingTime = 75;
    this.physics.resetRace();
    this.renderer.setCheckpoints(this.activeCheckpoints, 0);

    const lobbyPanel = document.getElementById('lobby-panel');
    if (lobbyPanel) lobbyPanel.style.display = 'none';

    const qrWidget = document.getElementById('qr-widget');
    if (qrWidget) qrWidget.classList.add('shrunk');

    const raceHud = document.getElementById('race-hud-overlay');
    if (raceHud) raceHud.style.display = 'block';

    const countdownText = document.getElementById('countdown-text');
    const timerText = document.getElementById('race-timer-text');
    if (countdownText) countdownText.style.display = 'block';
    if (timerText) timerText.style.display = 'none';

    this.runFirebaseWrite(
      updateRoomStatus(this.roomCode, 'countdown'),
      'start countdown',
    );

    const countInterval = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue > 0) {
        if (countdownText) countdownText.textContent = `${this.countdownValue}`;
      } else if (this.countdownValue === 0) {
        if (countdownText) countdownText.textContent = 'GO!';
      } else {
        clearInterval(countInterval);
        if (countdownText) countdownText.style.display = 'none';
        if (timerText) timerText.style.display = 'block';
        this.begin75SecondRace();
      }
    }, 1000);
  }

  private begin75SecondRace(): void {
    this.isRacing = true;
    this.remainingTime = 75;
    this.runFirebaseWrite(
      updateRoomStatus(this.roomCode, 'racing'),
      'start race',
    );

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      const timerText = document.getElementById('race-timer-text');
      if (timerText)
        timerText.textContent = `Time Left: ${this.remainingTime}s`;

      if (this.remainingTime <= 0) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.endRace();
      }
    }, 1000) as unknown as number;
  }

  private endRace(): void {
    this.isRacing = false;
    this.runFirebaseWrite(
      updateRoomStatus(this.roomCode, 'ended'),
      'finish race',
    );

    const raceHud = document.getElementById('race-hud-overlay');
    if (raceHud) raceHud.style.display = 'none';

    const standingsPanel = document.getElementById('standings-panel');
    if (standingsPanel) standingsPanel.style.display = 'block';

    this.renderStandings();
  }

  private restartRace(): void {
    const standingsPanel = document.getElementById('standings-panel');
    if (standingsPanel) standingsPanel.style.display = 'none';

    const lobbyPanel = document.getElementById('lobby-panel');
    if (lobbyPanel) lobbyPanel.style.display = 'block';

    const qrWidget = document.getElementById('qr-widget');
    if (qrWidget) qrWidget.classList.remove('shrunk');

    this.physics.resetRace();
    this.renderer.setCheckpoints(this.activeCheckpoints, 0);
    this.runFirebaseWrite(
      updateRoomStatus(this.roomCode, 'lobby'),
      'return to lobby',
    );
  }

  private renderStandings(): void {
    const listEl = document.getElementById('standings-list');
    if (!listEl || !this.physics) return;

    const allCars = Array.from(this.physics.getCarStates().values());
    allCars.sort((a, b) => {
      if (b.checkpointsCompleted !== a.checkpointsCompleted) {
        return b.checkpointsCompleted - a.checkpointsCompleted;
      }
      return a.lastCheckpointTime - b.lastCheckpointTime;
    });

    listEl.innerHTML = allCars
      .map((car, idx) => {
        const isWinner = idx === 0;
        const bot = SYNTHETIC_BOTS.find(b => b.id === car.id);
        const label = bot ? bot.label : `Player ${car.emoji}`;

        return `
        <div class="leaderboard-row ${isWinner ? 'winner' : ''}">
          <div>
            <span style="font-size:1.4rem;">${idx + 1}.</span>
            <span style="font-size:1.8rem; margin:0 8px;">${car.emoji}</span>
            <span>${label}</span>
          </div>
          <div>
            <span style="color:var(--accent-cyan); font-weight:800;">${car.checkpointsCompleted} Checkpoints</span>
          </div>
        </div>
      `;
      })
      .join('');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)
    ) {
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || key === 'a')
      this.hostKeyboardInput.steering = -1.0;
    if (e.key === 'ArrowRight' || key === 'd')
      this.hostKeyboardInput.steering = 1.0;
    if (e.key === 'ArrowUp' || key === 'w')
      this.hostKeyboardInput.throttle = 1.0;
    if (e.key === 'ArrowDown' || key === 's')
      this.hostKeyboardInput.brake = true;
    if (e.key === ' ' || e.key === 'Shift') this.hostKeyboardInput.boost = true;
    this.hostKeyboardInput.sequence++;
    this.hostKeyboardInput.timestamp = Date.now();
    if (this.physics) {
      this.physics.updateCarInput(HOST_CAR_ID, this.hostKeyboardInput);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (
      e.key === 'ArrowLeft' ||
      key === 'a' ||
      e.key === 'ArrowRight' ||
      key === 'd'
    )
      this.hostKeyboardInput.steering = 0;
    if (e.key === 'ArrowUp' || key === 'w') this.hostKeyboardInput.throttle = 0;
    if (e.key === 'ArrowDown' || key === 's')
      this.hostKeyboardInput.brake = false;
    if (e.key === ' ' || e.key === 'Shift')
      this.hostKeyboardInput.boost = false;
    this.hostKeyboardInput.sequence++;
    this.hostKeyboardInput.timestamp = Date.now();
    if (this.physics) {
      this.physics.updateCarInput(HOST_CAR_ID, this.hostKeyboardInput);
    }
  }

  private startLoop(): void {
    let lastSnapshotTime = 0;
    let simulationTime = 0;
    let lastFrameTime: number | null = null;
    let renderedCheckpointIndex = -1;

    const animate = (frameTime: number) => {
      requestAnimationFrame(animate);

      const dt =
        lastFrameTime === null
          ? 1 / 60
          : Math.min(0.1, Math.max(0, (frameTime - lastFrameTime) / 1000));
      lastFrameTime = frameTime;
      simulationTime += dt;

      this.hostKeyboardInput.timestamp = Date.now();
      this.physics.updateCarInput(HOST_CAR_ID, this.hostKeyboardInput);

      if (this.syntheticManager.isActive() && this.physics) {
        for (const bot of SYNTHETIC_BOTS) {
          const carState = this.physics.getCarState(bot.id);
          const input = this.syntheticManager.getBotInput(
            bot,
            simulationTime,
            carState,
            this.activeCheckpoints,
          );
          this.physics.updateCarInput(bot.id, input);
        }
      }

      if (this.physics) {
        const states = this.physics.step(dt, this.activeCheckpoints);

        if (this.renderer) {
          this.renderer.updateCars(states);
          const highestCheckpoint = Math.max(
            -1,
            ...[...states.values()].map(state => state.lastCheckpointIndex),
          );
          const activeCheckpoint = Math.min(
            this.activeCheckpoints.length - 1,
            highestCheckpoint + 1,
          );
          if (
            activeCheckpoint >= 0 &&
            activeCheckpoint !== renderedCheckpointIndex
          ) {
            renderedCheckpointIndex = activeCheckpoint;
            this.renderer.setCheckpoints(
              this.activeCheckpoints,
              activeCheckpoint,
            );
          }
          this.renderer.render();
        }

        const now = Date.now();
        if (
          now - lastSnapshotTime > 100 &&
          this.roomCode &&
          this.isFirebaseReady
        ) {
          lastSnapshotTime = now;
          void publishHostSnapshot(this.roomCode, states).catch(error => {
            if (!this.snapshotErrorShown) {
              this.snapshotErrorShown = true;
              this.showConnectionNotice(
                `Live telemetry paused: ${this.errorMessage(error)}`,
              );
            }
          });
        }

        const textContent = document.getElementById('textual-content');
        if (textContent) {
          textContent.innerHTML = Array.from(states.values())
            .map(
              c =>
                `<p>${c.emoji} Checkpoints: ${c.checkpointsCompleted} | Speed: ${c.speedKmH} km/h</p>`,
            )
            .join('');
        }
      }
    };

    requestAnimationFrame(animate);
  }

  private startingPosition(index: number): [number, number, number] {
    const start = this.activeCheckpoints[0]?.position ?? [60, 1.5, 20];
    const column = index % 4;
    const row = Math.floor(index / 4);
    return [
      start[0] + (column - 1.5) * 9,
      Math.max(4.5, start[1] + 3),
      start[2] + 18 + row * 17,
    ];
  }

  private runFirebaseWrite(operation: Promise<void>, action: string): void {
    void operation.catch(error => {
      this.showConnectionNotice(
        `Could not ${action}: ${this.errorMessage(error)}`,
      );
    });
  }

  private showConnectionNotice(message: string): void {
    const joinUrlEl = document.getElementById('join-url-display');
    if (joinUrlEl) joinUrlEl.textContent = message;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
