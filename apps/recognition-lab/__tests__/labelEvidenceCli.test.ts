import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

test('generated CLI positive and negative boundaries', () => {
  const child = spawnSync(process.execPath, ['--test', '--test-reporter=tap', resolve(__dirname, 'labelEvidenceCli.node.ts')],
    { encoding: 'utf8', timeout: 60000, env: process.env });
  if (child.status !== 0) throw new Error(child.stdout + child.stderr);
  expect(child.stdout).toContain('# fail 0'); expect(child.stdout).toContain('# skipped 0');
});
