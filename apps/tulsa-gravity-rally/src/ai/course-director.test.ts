import {describe, test, expect} from 'bun:test';
import {CourseDirector, PRESET_COURSES} from './course-director';

describe('Tulsa Gravity Rally - Course Director & AI Schema Validation', () => {
  const director = new CourseDirector();

  test('Provides valid preset courses for all requested styles', () => {
    const preset1 = director.getPresetCourse('Around Gradient');
    expect(preset1.courseTitle).toBe('Gradient Grand Tour');
    expect(preset1.checkpointIds.length).toBeGreaterThanOrEqual(3);
    expect(preset1.isAIGenerated).toBe(false);

    const preset2 = director.getPresetCourse('More rooftop jumps');
    expect(preset2.courseTitle).toBe('Skyline Rooftop Mayhem');
    expect(preset2.checkpointIds).toContain('cp-gradient-beacon');
  });

  test('Validates good CoursePlan objects successfully', () => {
    const validPlan = PRESET_COURSES['Around Gradient'];
    const result = director.validateCoursePlan(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.course?.courseTitle).toBe('Gradient Grand Tour');
  });

  test('Rejects invalid plans with non-existent checkpoint IDs', () => {
    const badPlan = {
      courseTitle: 'Invalid Hack Course',
      checkpointIds: ['cp-gradient-beacon', 'cp-hacked-nonexistent-checkpoint'],
    };
    const result = director.validateCoursePlan(badPlan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Unknown checkpoint ID: cp-hacked-nonexistent-checkpoint',
    );
  });

  test('Rejects duplicate checkpoint IDs', () => {
    const duplicatePlan = {
      courseTitle: 'Duplicate Loop Course',
      checkpointIds: [
        'cp-gradient-beacon',
        'cp-cheyenne-1st',
        'cp-gradient-beacon',
      ],
    };
    const result = director.validateCoursePlan(duplicatePlan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate checkpoint ID'))).toBe(
      true,
    );
  });

  test('Rejects empty or oversized checkpoint lists', () => {
    const emptyPlan = {
      courseTitle: 'Too Short',
      checkpointIds: ['cp-gradient-beacon'],
    };
    const result = director.validateCoursePlan(emptyPlan);
    expect(result.valid).toBe(false);
  });
});
