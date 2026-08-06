import type {CarControlInput, CarState} from './physics';
import type {CheckpointLocation} from '../data/tulsa-map';

export interface SyntheticBot {
  id: string;
  emoji: string;
  label: string;
  color: string;
  phase: number;
}

export const SYNTHETIC_BOTS: SyntheticBot[] = [
  {
    id: 'bot-bison',
    emoji: '🦬',
    label: 'Bison Bot (Synthetic)',
    color: '#c85a32',
    phase: 0.0,
  },
  {
    id: 'bot-rocket',
    emoji: '🚀',
    label: 'Rocket Bot (Synthetic)',
    color: '#ff5722',
    phase: 1.2,
  },
  {
    id: 'bot-turtle',
    emoji: '🐢',
    label: 'Turtle Bot (Synthetic)',
    color: '#4caf50',
    phase: 2.5,
  },
];

export class SyntheticReplayManager {
  private active = false;

  public start(): void {
    this.active = true;
  }

  public stop(): void {
    this.active = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getBotInput(
    bot: SyntheticBot,
    timeSeconds: number,
    carState?: CarState,
    checkpoints?: CheckpointLocation[],
  ): CarControlInput {
    if (!this.active) {
      return {
        steering: 0,
        throttle: 0,
        brake: false,
        boost: false,
        sequence: 0,
        timestamp: Date.now(),
      };
    }

    let steering = 0;
    const t = timeSeconds + bot.phase;

    if (carState && checkpoints && checkpoints.length > 0) {
      const nextIdx = (carState.lastCheckpointIndex + 1) % checkpoints.length;
      const target = checkpoints[nextIdx]!;
      const dx = target.position[0] - carState.position[0];
      const dz = target.position[2] - carState.position[2];

      const targetHeading = Math.atan2(dx, dz);
      const rot = carState.rotation;
      const currentHeading = 2 * Math.atan2(rot[1]!, rot[3]!);
      let headingDiff = targetHeading - currentHeading;

      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

      steering = Math.max(-1, Math.min(1, headingDiff * 1.5));
    } else {
      steering = Math.sin(t * 1.5) * 0.45;
    }

    const throttle = 0.85 + Math.cos(t * 0.8) * 0.15;
    const boost = Math.floor(t % 8) === 0 && t % 1 < 0.2;

    return {
      steering,
      throttle,
      brake: false,
      boost,
      sequence: Math.floor(t * 60),
      timestamp: Date.now(),
    };
  }
}
