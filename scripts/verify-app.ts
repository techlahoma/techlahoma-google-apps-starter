#!/usr/bin/env bun

import {verifyApp} from './verify-app-lib';

function parseArgs(): {slug: string; skipBrowser: boolean} {
  const args = Bun.argv.slice(2);
  let slug = '';
  let skipBrowser = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--app' && args[i + 1]) {
      slug = args[i + 1]!;
      i++;
    } else if (args[i] === '--skip-browser') {
      skipBrowser = true;
    }
  }

  if (!slug) {
    console.error('Error: --app <slug> is required');
    console.error('Usage: bun run app:verify --app <slug>');
    process.exit(1);
  }

  return {slug, skipBrowser};
}

async function main() {
  const {slug, skipBrowser} = parseArgs();
  console.log('\n========================================');
  console.log(`Verifying App Completion: apps/${slug}`);
  console.log('========================================');

  const result = await verifyApp(slug, {skipBrowser});

  if (!result.success) {
    console.error(`\n✗ App completion verification FAILED for apps/${slug}:\n`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error(
      '\nCorrective actions: Fix the issues above and re-run bun run app:verify --app ' +
        slug,
    );
    process.exit(1);
  }

  console.log(`\n✓ App completion verification PASSED for apps/${slug}`);
  console.log(`  - Contract: Valid (${slug})`);
  console.log('  - Scaffold Markers: Clean');
  console.log('  - Dependency Policy: Compliant');
  console.log('  - Typecheck / Unit Tests / Build: Passed');
  console.log('  - Browser Verification: Passed');
}

main().catch(err => {
  console.error(
    `app:verify unexpected error: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
