const globals = require('globals');
const gts = require('gts');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'profiles/**'],
  },
  ...gts,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        Bun: 'readonly',
      },
    },
  },
];
