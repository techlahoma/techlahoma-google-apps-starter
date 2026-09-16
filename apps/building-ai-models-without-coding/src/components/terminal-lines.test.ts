import {expect, test} from 'bun:test';
import {annotateTerminalLines} from './terminal-lines';

test('terminal warnings remain distinct from failures and optimization steps', () => {
  expect(
    annotateTerminalLines(
      'warning: unused method\nerror: bad source\nstep 1 / 30 | loss 3.1\nRust program completed.',
    ),
  ).toBe(
    '⚠️ warning: unused method\n❌ error: bad source\n📉 step 1 / 30 | loss 3.1\n✅ Rust program completed.',
  );
  expect(annotateTerminalLines('✅ Done\nfn error_handler() {}')).toBe(
    '✅ Done\nfn error_handler() {}',
  );
});
