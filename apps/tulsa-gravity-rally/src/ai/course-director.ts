import {ALL_CHECKPOINTS, type CheckpointLocation} from '../data/tulsa-map';

export type CourseStyle =
  | 'Around Gradient'
  | 'More rooftop jumps'
  | 'Beginner friendly'
  | 'Maximum chaos';

export interface CoursePlan {
  courseTitle: string;
  seed: string;
  checkpointIds: string[];
  announcerLine: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  isAIGenerated: boolean;
}

export interface ICourseDirector {
  getPresetCourse(style: CourseStyle): CoursePlan;
  generateAICourse(style: CourseStyle): Promise<CoursePlan>;
}

export const PRESET_COURSES: Record<CourseStyle, CoursePlan> = {
  'Around Gradient': {
    courseTitle: 'Gradient Grand Tour',
    seed: 'preset-around-gradient',
    checkpointIds: [
      'cp-cheyenne-1st',
      'cp-gradient-beacon',
      'cp-main-archer',
      'cp-studio-roof',
      'cp-garage-roof',
    ],
    announcerLine:
      'Circumnavigate Tulsa’s iconic Gradient landmark and conquer the skyways!',
    difficulty: 'medium',
    isAIGenerated: false,
  },
  'More rooftop jumps': {
    courseTitle: 'Skyline Rooftop Mayhem',
    seed: 'preset-rooftop-jumps',
    checkpointIds: [
      'cp-studio-roof',
      'cp-gradient-beacon',
      'cp-garage-roof',
      'cp-skyline-gap',
      'cp-archer-loft-roof',
    ],
    announcerLine:
      'Launch off rooftops across downtown Tulsa with low-gravity boost action!',
    difficulty: 'hard',
    isAIGenerated: false,
  },
  'Beginner friendly': {
    courseTitle: 'Downtown Street Cruise',
    seed: 'preset-beginner',
    checkpointIds: [
      'cp-cheyenne-1st',
      'cp-2nd-cheyenne',
      'cp-denver-1st',
      'cp-main-archer',
      'cp-reconciliation-way',
    ],
    announcerLine:
      'A smooth street circuit through downtown Tulsa’s widest avenues.',
    difficulty: 'easy',
    isAIGenerated: false,
  },
  'Maximum chaos': {
    courseTitle: 'Tulsa Gravity Stunt Spectacle',
    seed: 'preset-max-chaos',
    checkpointIds: [
      'cp-gradient-beacon',
      'cp-skyline-gap',
      'cp-brady-roof',
      'cp-garage-roof',
      'cp-archer-loft-roof',
      'cp-reconciliation-way',
    ],
    announcerLine:
      'High-speed rooftop leaps and chaotic gravity jumps await the boldest racers!',
    difficulty: 'extreme',
    isAIGenerated: false,
  },
};

export class CourseDirector implements ICourseDirector {
  public getPresetCourse(style: CourseStyle): CoursePlan {
    return PRESET_COURSES[style] || PRESET_COURSES['Around Gradient'];
  }

  public async generateAICourse(style: CourseStyle): Promise<CoursePlan> {
    return this.getPresetCourse(style);
  }

  public validateCoursePlan(plan: unknown): {
    valid: boolean;
    errors: string[];
    course?: CoursePlan;
  } {
    const errors: string[] = [];
    if (!plan || typeof plan !== 'object') {
      return {valid: false, errors: ['Course plan must be a non-null object']};
    }

    const p = plan as Partial<CoursePlan>;

    if (!p.courseTitle || typeof p.courseTitle !== 'string') {
      errors.push('Missing or invalid courseTitle');
    }

    if (!p.checkpointIds || !Array.isArray(p.checkpointIds)) {
      errors.push('Missing or invalid checkpointIds array');
    } else {
      if (p.checkpointIds.length < 3 || p.checkpointIds.length > 10) {
        errors.push(
          `Checkpoint count ${p.checkpointIds.length} is outside allowed range (3-10)`,
        );
      }

      const validIds = new Set(ALL_CHECKPOINTS.map(cp => cp.id));
      const seen = new Set<string>();

      for (const id of p.checkpointIds) {
        if (!validIds.has(id)) {
          errors.push(`Unknown checkpoint ID: ${id}`);
        }
        if (seen.has(id)) {
          errors.push(`Duplicate checkpoint ID: ${id}`);
        }
        seen.add(id);
      }
    }

    if (p.announcerLine && p.announcerLine.length > 150) {
      errors.push('Announcer line exceeds maximum length of 150 characters');
    }

    if (errors.length > 0) {
      return {valid: false, errors};
    }

    return {
      valid: true,
      errors: [],
      course: {
        courseTitle: p.courseTitle || 'Custom Course',
        seed: p.seed || `custom-${Date.now()}`,
        checkpointIds: p.checkpointIds as string[],
        announcerLine: p.announcerLine || 'Get ready to race!',
        difficulty: p.difficulty || 'medium',
        isAIGenerated: Boolean(p.isAIGenerated),
      },
    };
  }

  public resolveCheckpoints(plan: CoursePlan): CheckpointLocation[] {
    const map = new Map(ALL_CHECKPOINTS.map(cp => [cp.id, cp]));
    return plan.checkpointIds
      .map(id => map.get(id))
      .filter((cp): cp is CheckpointLocation => cp !== undefined);
  }
}
