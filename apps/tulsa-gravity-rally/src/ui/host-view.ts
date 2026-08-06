import {GameRenderer} from '../game/renderer';
import {PhysicsEngine, type CarControlInput} from '../game/physics';
import {
  initFirebase,
  createRoom,
  generateRoomCode,
  subscribeRoomState,
  subscribeInputs,
  publishHostSnapshot,
  updateRoomStatus,
  type RoomState,
} from '../multiplayer/firebase';
import {generateJoinQR} from './qr-generator';
import {CourseDirector, type CourseStyle} from '../ai/course-director';
import {SyntheticReplayManager, SYNTHETIC_BOTS} from '../game/synthetic-replay';
import {TULSA_MAP_METADATA} from '../data/tulsa-map';

export class HostViewController {
  private renderer!: GameRenderer;
  private physics!: PhysicsEngine;
  private courseDirector = new CourseDirector();
  private syntheticManager = new SyntheticReplayManager();

  private roomCode = '';
  private hostUid = '';

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

  public async mount(container: HTMLElement): Promise<void> {
    this.containerEl = container;
    this.renderLayout();

    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer({
      canvas,
      isReducedMotion: this.isReducedMotion,
    });

    this.physics = new PhysicsEngine();
    await this.physics.init();

    try {
      const user = await initFirebase();
      this.hostUid = user.uid;
      this.roomCode = generateRoomCode();
      await createRoom(this.roomCode, this.hostUid);

      const qrResult = await generateJoinQR(this.roomCode);
      const qrImg = document.getElementById('qr-code-img') as HTMLImageElement;
      if (qrImg) qrImg.src = qrResult.dataUrl;

      const roomCodeEl = document.getElementById('room-code-display');
      if (roomCodeEl) roomCodeEl.textContent = this.roomCode;

      const joinUrlEl = document.getElementById('join-url-display');
      if (joinUrlEl) joinUrlEl.textContent = qrResult.joinUrl;

      if (qrResult.warning) {
        const warnEl = document.getElementById('qr-warning-display');
        if (warnEl) {
          warnEl.style.display = 'block';
          warnEl.textContent = qrResult.warning;
        }
      }

      subscribeRoomState(this.roomCode, state => this.onRoomStateUpdate(state));
      subscribeInputs(this.roomCode, inputs =>
        this.onPlayerInputsUpdate(inputs),
      );
    } catch (err) {
      console.warn('Firebase emulator connection note:', err);
    }

    window.addEventListener('keydown', e => this.handleKeyDown(e));
    window.addEventListener('keyup', e => this.handleKeyUp(e));

    const course = this.courseDirector.getPresetCourse('Around Gradient');
    const checkpoints = this.courseDirector.resolveCheckpoints(course);
    this.renderer.setCheckpoints(checkpoints, 0);

    this.startLoop(checkpoints);
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
              <div class="brand-subtitle">Room-Scale Downtown Stunt Racing • Gradient Landmark (12 N Cheyenne Ave)</div>
            </div>

            <div id="qr-widget" class="glass-panel qr-widget hud-interactive">
              <img id="qr-code-img" class="qr-image" alt="Join QR Code" />
              <div id="room-code-display" class="room-code-badge">------</div>
              <div id="join-url-display" class="join-url-text">Loading join URL...</div>
              <div id="qr-warning-display" style="display:none; color:#ffb703; font-size:0.75rem; max-width:200px;"></div>
            </div>
          </div>

          <div id="lobby-panel" class="glass-panel lobby-center hud-interactive">
            <h2>Lobby • Scan QR Code to Join</h2>
            <div id="player-count-label" style="font-size:1.1rem; color:var(--accent-cyan); font-weight:700;">Players Joined: 0 / 12</div>
            <div id="player-roster-grid" class="player-grid"></div>

            <div style="display:flex; justify-content:center; gap:12px; margin-top:8px; align-items:center;">
              <label for="course-select-dropdown" style="font-weight:600;">Course Preset:</label>
              <select id="course-select-dropdown" style="background:#1b263b; color:#fff; border:1px solid #00f5d4; padding:8px 12px; border-radius:8px; font-weight:700;">
                <option value="Around Gradient">Around Gradient</option>
                <option value="More rooftop jumps">More rooftop jumps</option>
                <option value="Beginner friendly">Beginner friendly</option>
                <option value="Maximum chaos">Maximum chaos</option>
              </select>

              <button id="toggle-synthetic-btn" class="secondary-btn">Add 3 Synthetic Demo Cars</button>
            </div>

            <div style="margin-top:16px;">
              <button id="start-race-btn" class="primary-btn">Start Race (75s)</button>
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

          <div class="attribution-footer hud-interactive" style="display:flex; justify-content:space-between; align-items:center;">
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
        this.renderer.setCheckpoints(checkpoints, 0);
      });
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
        this.physics.addCar(bot.id, bot.emoji, bot.color, [
          -20 + idx * 10,
          2.5,
          25,
        ]);
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
    if (!state) return;

    const players = state.players || {};
    const playerList = Object.values(players);

    const countEl = document.getElementById('player-count-label');
    if (countEl)
      countEl.textContent = `Players Joined: ${playerList.length} / 12`;

    const grid = document.getElementById('player-roster-grid');
    if (grid) {
      grid.innerHTML = playerList
        .map(
          p => `
          <div class="player-chip" style="border-left:4px solid ${p.color};">
            <span class="emoji">${p.emoji}</span>
            <span>Player</span>
          </div>
        `,
        )
        .join('');
    }

    playerList.forEach((p, idx) => {
      if (!this.physics['carStates'].has(p.uid)) {
        this.physics.addCar(p.uid, p.emoji, p.color, [
          -15 + (idx % 4) * 8,
          2.5,
          20 + Math.floor(idx / 4) * 8,
        ]);
      }
    });
  }

  private onPlayerInputsUpdate(inputs: Record<string, CarControlInput>): void {
    for (const [uid, input] of Object.entries(inputs)) {
      this.physics.updateCarInput(uid, input);
    }
  }

  private startRaceCountdown(): void {
    this.isRacing = false;
    this.countdownValue = 3;

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

    void updateRoomStatus(this.roomCode, 'countdown');

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
    void updateRoomStatus(this.roomCode, 'racing');

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
    void updateRoomStatus(this.roomCode, 'ended');

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

    void updateRoomStatus(this.roomCode, 'lobby');
  }

  private renderStandings(): void {
    const listEl = document.getElementById('standings-list');
    if (!listEl) return;

    const allCars = Array.from(this.physics['carStates'].values());
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
    if (e.key === 'ArrowLeft' || e.key === 'a')
      this.hostKeyboardInput.steering = -1.0;
    if (e.key === 'ArrowRight' || e.key === 'd')
      this.hostKeyboardInput.steering = 1.0;
    if (e.key === 'ArrowUp' || e.key === 'w')
      this.hostKeyboardInput.throttle = 1.0;
    if (e.key === 'ArrowDown' || e.key === 's')
      this.hostKeyboardInput.brake = true;
    if (e.key === ' ' || e.key === 'Shift') this.hostKeyboardInput.boost = true;
    this.hostKeyboardInput.timestamp = Date.now();
    this.physics.updateCarInput(this.hostUid, this.hostKeyboardInput);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'a' ||
      e.key === 'ArrowRight' ||
      e.key === 'd'
    )
      this.hostKeyboardInput.steering = 0;
    if (e.key === 'ArrowUp' || e.key === 'w')
      this.hostKeyboardInput.throttle = 0;
    if (e.key === 'ArrowDown' || e.key === 's')
      this.hostKeyboardInput.brake = false;
    if (e.key === ' ' || e.key === 'Shift')
      this.hostKeyboardInput.boost = false;
    this.hostKeyboardInput.timestamp = Date.now();
    this.physics.updateCarInput(this.hostUid, this.hostKeyboardInput);
  }

  private startLoop(
    checkpoints: ReturnType<CourseDirector['resolveCheckpoints']>,
  ): void {
    let lastSnapshotTime = 0;
    let timeAcc = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      timeAcc += 1 / 60;

      if (this.syntheticManager.isActive()) {
        for (const bot of SYNTHETIC_BOTS) {
          const input = this.syntheticManager.getBotInput(bot, timeAcc);
          this.physics.updateCarInput(bot.id, input);
        }
      }

      const states = this.physics.step(1 / 60, checkpoints);

      this.renderer.updateCars(states);
      this.renderer.render();

      const now = Date.now();
      if (now - lastSnapshotTime > 100 && this.roomCode) {
        lastSnapshotTime = now;
        void publishHostSnapshot(this.roomCode, states);
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
    };

    requestAnimationFrame(animate);
  }
}
