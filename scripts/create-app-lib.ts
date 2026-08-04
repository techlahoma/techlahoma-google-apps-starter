export const APP_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export interface AppDefinition {
  slug: string;
  title: string;
}

export interface AppPlan extends AppDefinition {
  effect: 'local-write';
  target: string;
  template: string;
}

export function validateAppDefinition(value: {
  slug?: string | undefined;
  title?: string | undefined;
}): AppDefinition {
  const slug = value.slug?.trim() ?? '';
  const title = value.title?.trim() ?? '';

  if (!APP_SLUG_PATTERN.test(slug) || slug.includes('--')) {
    throw new Error(
      'name must be 1-63 lowercase letters, digits, or single hyphens and cannot start or end with a hyphen',
    );
  }
  if (title.length < 2 || title.length > 80) {
    throw new Error('title must be 2-80 characters');
  }

  return {slug, title};
}

export function makeAppPlan(definition: AppDefinition): AppPlan {
  return {
    effect: 'local-write',
    target: `apps/${definition.slug}`,
    template: 'templates/vite-app',
    ...definition,
  };
}

export function renderAppTemplate(
  content: string,
  definition: AppDefinition,
): string {
  return content
    .replaceAll('__APP_SLUG__', definition.slug)
    .replaceAll('__APP_TITLE__', definition.title);
}
