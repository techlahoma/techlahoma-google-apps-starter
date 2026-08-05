import type {GameState, BracketType} from './types';
import {GROUND_Y} from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(state: GameState) {
    const {ctx, width, height} = this;

    ctx.clearRect(0, 0, width, height);

    // 1. Render Screen-Print Sunset Background
    this.renderBackground();

    // 2. Render Environment / Hills & Windmills
    this.renderEnvironment(state);

    // 3. Render Ground
    this.renderGround(state);

    // 4. Render Pickups (Code Brackets)
    state.pickups.forEach(pickup => {
      if (!pickup.collected) {
        this.renderPickup(pickup, state);
      }
    });

    // 5. Render Obstacles (Tumbleweeds)
    state.obstacles.forEach(obstacle => {
      this.renderTumbleweed(obstacle);
    });

    // 6. Render Player (Geometric Bison)
    this.renderBison(state);

    // 7. Render Particles
    this.renderParticles(state);
  }

  private renderBackground() {
    const {ctx, width, height} = this;

    // Sky Gradient: Midnight Blue -> Sunset Red -> Prairie Gold
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    skyGrad.addColorStop(0, '#1A2634'); // Midnight Blue
    skyGrad.addColorStop(0.5, '#D94E34'); // Sunset Red
    skyGrad.addColorStop(1, '#F5A623'); // Prairie Gold
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Poster Sun with concentric rings
    const sunX = width * 0.75;
    const sunY = 120;

    ctx.fillStyle = 'rgba(255, 235, 175, 0.15)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 235, 175, 0.25)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF5E1';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderEnvironment(state: GameState) {
    const {ctx, width} = this;

    // Distant Mesa Silhouettes (Midnight Blue/Purple)
    const distOffset = (state.distanceTraveled * 0.1) % 400;
    ctx.fillStyle = '#251E38';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = -distOffset - 400; x < width + 400; x += 350) {
      ctx.lineTo(x + 50, GROUND_Y - 90);
      ctx.lineTo(x + 180, GROUND_Y - 90);
      ctx.lineTo(x + 240, GROUND_Y - 40);
      ctx.lineTo(x + 350, GROUND_Y);
    }
    ctx.lineTo(width, GROUND_Y);
    ctx.fill();

    // Rolling Terracotta Prairie Hills
    const hillOffset = (state.distanceTraveled * 0.3) % 600;
    ctx.fillStyle = '#8D3B2A';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = -hillOffset - 600; x < width + 600; x += 300) {
      ctx.quadraticCurveTo(x + 150, GROUND_Y - 50, x + 300, GROUND_Y);
    }
    ctx.lineTo(width, GROUND_Y);
    ctx.fill();
  }

  private renderGround(state: GameState) {
    const {ctx, width, height} = this;

    // Prairie Gold Soil
    ctx.fillStyle = '#D48C28';
    ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);

    // Dark Accent Soil Layer
    ctx.fillStyle = '#1A2634';
    ctx.fillRect(0, GROUND_Y + 12, width, height - GROUND_Y - 12);

    // Ground Stripe Pattern (restrained motion if reducedMotion off)
    const stripeOffset = state.reducedMotion
      ? 0
      : (state.distanceTraveled * 1.0) % 40;
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = -stripeOffset; x < width; x += 40) {
      ctx.moveTo(x, GROUND_Y + 4);
      ctx.lineTo(x + 20, GROUND_Y + 4);
    }
    ctx.stroke();
  }

  private renderBison(state: GameState) {
    const {ctx} = this;
    const {bison} = state;

    ctx.save();
    ctx.translate(bison.x, bison.y);

    // Screen-print style geometric Bison
    // Body (Midnight Dark Chocolate / Dark Blue)
    ctx.fillStyle = '#1E1624';

    // Main Torso Block
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(26, 4); // High Hump
    ctx.lineTo(52, 6);
    ctx.lineTo(60, 18); // Head front
    ctx.lineTo(54, 34); // Snout
    ctx.lineTo(44, 38);
    ctx.lineTo(12, 38);
    ctx.closePath();
    ctx.fill();

    // Front Hump Fur Texture (Prairie Gold Accent)
    ctx.fillStyle = '#D94E34'; // Sunset Red Fur Patch
    ctx.beginPath();
    ctx.moveTo(22, 6);
    ctx.lineTo(34, 4);
    ctx.lineTo(42, 14);
    ctx.lineTo(26, 18);
    ctx.closePath();
    ctx.fill();

    // Curved Geometric Horn (Prairie Gold)
    ctx.fillStyle = '#F5A623';
    ctx.beginPath();
    ctx.moveTo(48, 10);
    ctx.quadraticCurveTo(56, 2, 60, 6);
    ctx.quadraticCurveTo(52, 10, 48, 14);
    ctx.closePath();
    ctx.fill();

    // Eye (Glowing White Dot)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(48, 16, 4, 4);

    // Snout Accent
    ctx.fillStyle = '#8D5B4C';
    ctx.fillRect(52, 28, 6, 8);

    // Legs with running animation angle
    ctx.fillStyle = '#1E1624';
    const legOffset =
      bison.isGrounded && !state.reducedMotion
        ? Math.sin(bison.runFrame * Math.PI) * 12
        : 0;

    // Back Legs
    ctx.fillRect(14 + legOffset, 36, 8, 14);
    ctx.fillRect(24 - legOffset, 36, 8, 14);

    // Front Legs
    ctx.fillRect(38 - legOffset, 36, 8, 14);
    ctx.fillRect(48 + legOffset, 36, 8, 14);

    // Tail
    ctx.strokeStyle = '#1E1624';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 20);
    ctx.lineTo(
      6,
      28 + (state.reducedMotion ? 0 : Math.sin(bison.runFrame * Math.PI) * 4),
    );
    ctx.stroke();

    ctx.restore();
  }

  private renderPickup(
    pickup: {
      x: number;
      y: number;
      width: number;
      height: number;
      symbol: BracketType;
      color: string;
    },
    state: GameState,
  ) {
    const {ctx} = this;
    const floatY = state.reducedMotion
      ? 0
      : Math.sin(Date.now() * 0.005 + pickup.x) * 4;

    ctx.save();
    ctx.translate(pickup.x, pickup.y + floatY);

    // Outer Glow / Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(4, 4, pickup.width, pickup.height);

    // Screen-Print Badge Container
    ctx.fillStyle = pickup.color;
    ctx.fillRect(0, 0, pickup.width, pickup.height);

    // Dark Border
    ctx.strokeStyle = '#1A2634';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, pickup.width, pickup.height);

    // Bracket Code Symbol Text
    ctx.fillStyle = '#1A2634';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickup.symbol, pickup.width / 2, pickup.height / 2 + 1);

    ctx.restore();
  }

  private renderTumbleweed(obstacle: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }) {
    const {ctx} = this;
    const cx = obstacle.x + obstacle.width / 2;
    const cy = obstacle.y + obstacle.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obstacle.rotation);

    // Spiky Angular Tumbleweed Silhouette
    ctx.fillStyle = '#6D4C41';
    ctx.beginPath();
    const spikes = 8;
    const rOuter = obstacle.width / 2;
    const rInner = rOuter * 0.55;

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner geometric mesh cross lines
    ctx.strokeStyle = '#D48C28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-rInner, 0);
    ctx.lineTo(rInner, 0);
    ctx.moveTo(0, -rInner);
    ctx.lineTo(0, rInner);
    ctx.stroke();

    ctx.restore();
  }

  private renderParticles(state: GameState) {
    const {ctx} = this;
    state.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;

      if (p.symbol) {
        ctx.font = 'bold 14px monospace';
        ctx.fillText(p.symbol, p.x, p.y);
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    });
  }
}
