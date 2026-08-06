import {describe, test, expect} from 'bun:test';
import {CourseDirector} from './course-director';

describe('Tulsa Gravity Rally - Course Director & AI Adapter', () => {
  const director = new CourseDirector();

  test('Provides valid preset courses for all requested styles', () => {
    const preset1 = director.getPresetCourse('Around Gradient');
    expect(preset1.name).toContain('Gradient');
    expect(preset1.checkpointIds.length).toBeGreaterThanOrEqual(3);
    expect(preset1.isGeminiGenerated).toBe(false);

    const preset2 = director.getPresetCourse('More rooftop jumps');
    expect(preset2.name).toContain('Rooftop');
    expect(preset2.checkpointIds).toContain('cp-gradient-beacon');
  });

  test('Resolves checkpoint locations from course plan', () => {
    const preset = director.getPresetCourse('Around Gradient');
    const checkpoints = director.resolveCheckpoints(preset);
    expect(checkpoints.length).toBeGreaterThanOrEqual(3);
    expect(checkpoints[0]?.id).toBe('cp-gradient-street');
  });

  test('Falls back to deterministic preset when API key is omitted', async () => {
    const course = await director.generateAICourse('Around Gradient');
    expect(course.isGeminiGenerated).toBe(false);
    expect(course.name).toContain('Gradient');
  });
});
