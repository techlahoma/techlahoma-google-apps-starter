import {
  initFirebase,
  joinRoom,
  subscribeRoomState,
  publishPlayerInput,
  type RoomState,
} from '../multiplayer/firebase';
import {EMOJI_ALLOWLIST, type EmojiOption} from '../multiplayer/emoji';
import type {CarControlInput} from '../game/physics';

export class PlayerViewController {
  private roomCode = '';
  private playerUid = '';
  private selectedEmoji: EmojiOption | null = null;
  private currentInput: CarControlInput = {
    steering: 0,
    throttle: 0,
    brake: false,
    boost: false,
    sequence: 0,
    timestamp: Date.now(),
  };

  private containerEl!: HTMLElement;

  public async mount(container: HTMLElement, roomCode: string): Promise<void> {
    this.containerEl = container;
    this.roomCode = roomCode.toUpperCase();
    this.renderLayout();

    try {
      const user = await initFirebase();
      this.playerUid = user.uid;

      subscribeRoomState(this.roomCode, state => this.onRoomStateUpdate(state));
    } catch (err) {
      this.showStatusError(
        `Failed to connect to room ${this.roomCode}: ${err}`,
      );
    }
  }

  private renderLayout(): void {
    this.containerEl.innerHTML = `
      <div id="player-app">
        <div class="glass-panel controller-header">
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:var(--accent-cyan);">Tulsa Gravity Rally</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Room: ${this.roomCode}</div>
          </div>
          <div id="status-badge" style="font-size:0.85rem; font-weight:700; color:var(--accent-amber); padding:4px 10px; border-radius:6px; background:rgba(255,183,3,0.15);">
            Select Emoji
          </div>
        </div>

        <div id="emoji-picker-screen" style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
          <h3 style="margin-bottom:12px; color:var(--accent-amber); text-align:center;">Choose Your Car Emoji</h3>
          <div id="emoji-grid" class="emoji-selector-grid glass-panel" style="width:100%; max-width:380px;"></div>
          <div id="join-error-msg" style="color:var(--accent-red); margin-top:12px; font-weight:700; text-align:center;"></div>
        </div>

        <div id="controller-screen" style="display:none; flex:1; flex-direction:column; justify-content:space-between; padding-top:12px;">
          <div class="glass-panel" style="padding:12px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted);">EMOJI</div>
              <div id="player-emoji-display" style="font-size:1.8rem;">🏎️</div>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted);">SPEED</div>
              <div id="telemetry-speed" style="font-weight:900; font-size:1.4rem; color:var(--accent-cyan);">0 km/h</div>
            </div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted);">CHECKPOINTS</div>
              <div id="telemetry-checkpoints" style="font-weight:900; font-size:1.4rem; color:var(--accent-amber);">0</div>
            </div>
          </div>

          <div style="margin:16px 0;">
            <button id="boost-touch-btn" class="boost-btn">🚀 GRAVITY BOOST</button>
          </div>

          <div class="controls-container">
            <div class="dpad-group">
              <button id="steer-left-btn" class="touch-btn">◀</button>
              <button id="steer-right-btn" class="touch-btn">▶</button>
            </div>
            <div class="pedal-group">
              <button id="brake-btn" class="touch-btn" style="background:rgba(255,0,85,0.2); border-color:var(--accent-red);">🛑</button>
              <button id="gas-btn" class="touch-btn" style="background:rgba(0,245,212,0.2); border-color:var(--accent-cyan);">⚡</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderEmojiGrid();
    this.bindTouchControls();
  }

  private renderEmojiGrid(): void {
    const grid = document.getElementById('emoji-grid');
    if (!grid) return;

    grid.innerHTML = EMOJI_ALLOWLIST.map(
      opt => `
      <div class="emoji-card" data-id="${opt.id}" data-emoji="${opt.emoji}" data-color="${opt.color}">
        <span>${opt.emoji}</span>
      </div>
    `,
    ).join('');

    grid.querySelectorAll('.emoji-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const opt = EMOJI_ALLOWLIST.find(e => e.id === id);
        if (opt) void this.handleSelectEmoji(opt);
      });
    });
  }

  private async handleSelectEmoji(opt: EmojiOption): Promise<void> {
    const errorEl = document.getElementById('join-error-msg');
    if (errorEl) errorEl.textContent = '';

    try {
      await joinRoom(this.roomCode, this.playerUid, opt.emoji, opt.color);
      this.selectedEmoji = opt;

      const pickerScreen = document.getElementById('emoji-picker-screen');
      const controllerScreen = document.getElementById('controller-screen');
      if (pickerScreen) pickerScreen.style.display = 'none';
      if (controllerScreen) controllerScreen.style.display = 'flex';

      const emojiDisp = document.getElementById('player-emoji-display');
      if (emojiDisp) emojiDisp.textContent = opt.emoji;

      const statusBadge = document.getElementById('status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Connected';
        statusBadge.style.color = '#00f5d4';
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = `${err}`;
    }
  }

  private onRoomStateUpdate(state: RoomState | null): void {
    if (!state) {
      this.showStatusError('Room does not exist or host ended session.');
      return;
    }

    const claimedEmojis = new Set(
      Object.values(state.players || {}).map(p => p.emoji),
    );
    document.querySelectorAll('.emoji-card').forEach(card => {
      const emoji = card.getAttribute('data-emoji');
      if (
        emoji &&
        claimedEmojis.has(emoji) &&
        this.selectedEmoji?.emoji !== emoji
      ) {
        card.classList.add('claimed');
      } else {
        card.classList.remove('claimed');
      }
    });

    const snapshot = (
      state as unknown as {
        snapshot?: {cars?: Record<string, {s: number; c: number}>};
      }
    ).snapshot;
    if (snapshot?.cars && this.playerUid && snapshot.cars[this.playerUid]) {
      const carData = snapshot.cars[this.playerUid];
      if (carData) {
        const speedEl = document.getElementById('telemetry-speed');
        const cpEl = document.getElementById('telemetry-checkpoints');
        if (speedEl) speedEl.textContent = `${carData.s} km/h`;
        if (cpEl) cpEl.textContent = `${carData.c}`;
      }
    }
  }

  private showStatusError(msg: string): void {
    const statusBadge = document.getElementById('status-badge');
    if (statusBadge) {
      statusBadge.textContent = 'Error';
      statusBadge.style.color = '#ff0055';
    }
    const picker = document.getElementById('emoji-picker-screen');
    if (picker) {
      picker.innerHTML = `<div class="glass-panel" style="padding:24px; text-align:center; color:var(--accent-red); font-weight:700;">${msg}</div>`;
    }
  }

  private bindTouchControls(): void {
    const bindBtn = (
      id: string,
      onPress: () => void,
      onRelease: () => void,
    ) => {
      const el = document.getElementById(id);
      if (!el) return;

      const pressHandler = (e: Event) => {
        e.preventDefault();
        el.classList.add('active');
        onPress();
        this.emitInput();
      };

      const releaseHandler = (e: Event) => {
        e.preventDefault();
        el.classList.remove('active');
        onRelease();
        this.emitInput();
      };

      el.addEventListener('touchstart', pressHandler);
      el.addEventListener('touchend', releaseHandler);
      el.addEventListener('mousedown', pressHandler);
      el.addEventListener('mouseup', releaseHandler);
    };

    bindBtn(
      'steer-left-btn',
      () => (this.currentInput.steering = -1.0),
      () => (this.currentInput.steering = 0),
    );
    bindBtn(
      'steer-right-btn',
      () => (this.currentInput.steering = 1.0),
      () => (this.currentInput.steering = 0),
    );
    bindBtn(
      'gas-btn',
      () => (this.currentInput.throttle = 1.0),
      () => (this.currentInput.throttle = 0),
    );
    bindBtn(
      'brake-btn',
      () => (this.currentInput.brake = true),
      () => (this.currentInput.brake = false),
    );
    bindBtn(
      'boost-touch-btn',
      () => (this.currentInput.boost = true),
      () => (this.currentInput.boost = false),
    );
  }

  private emitInput(): void {
    if (!this.selectedEmoji || !this.roomCode) return;
    this.currentInput.sequence++;
    this.currentInput.timestamp = Date.now();
    void publishPlayerInput(this.roomCode, this.playerUid, this.currentInput);
  }
}
