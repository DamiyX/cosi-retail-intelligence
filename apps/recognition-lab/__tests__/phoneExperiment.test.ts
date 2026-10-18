import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
test('P0 generated phone comparison and actual CLI/image-oracle boundaries (no native validation)', () => {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', resolve(__dirname, 'phoneExperiment.node.ts')], { encoding: 'utf8', timeout: 60000, env: process.env });
  if (result.status !== 0) throw Error(result.stdout + result.stderr);
  expect(result.status).toBe(0); expect(result.stdout).toContain('# fail 0'); expect(result.stdout).toContain('# skipped 0');
});
