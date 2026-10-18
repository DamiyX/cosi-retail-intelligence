import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

test('thirteen actual Node ESM study/math/report/path cases (no path mocks)', () => {
  const child = spawnSync(process.execPath, ['--test', '--test-reporter=tap', resolve(__dirname, 'exploratory.node.ts')], {
    encoding: 'utf8', timeout: 30000,
  });
  if (child.status !== 0) throw new Error(child.stdout + child.stderr);
  expect(child.status).toBe(0);
  expect(child.stdout).toContain('# tests 13');
  expect(child.stdout).toContain('# fail 0');
});
