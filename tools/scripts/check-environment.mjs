import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const { engines } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
let failed = false;

function report(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'OK' : 'ERROR'} ${name}: ${actual ?? 'missing'} (required ${expected})`);
  failed ||= !ok;
}

report('Node', process.versions.node, engines.node);
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1];
report('npm', npmVersion, engines.npm);

const git = spawnSync('git', ['--version'], { encoding: 'utf8', timeout: 10000 });
if (git.status !== 0) {
  console.error('ERROR Git is missing from PATH.');
  failed = true;
} else {
  console.log('OK ' + git.stdout.trim());
}

for (const [name, args] of [['adb', ['version']], ['java', ['-version']], ['docker', ['--version']]]) {
  const result = spawnSync(name, args, { encoding: 'utf8', timeout: 10000 });
  console.log(`${result.status === 0 ? 'AVAILABLE' : 'OPTIONAL MISSING'} ${name}`);
}
console.log('EAS account, physical Android device, and a second laptop are separate acceptance checks.');
process.exitCode = failed ? 1 : 0;
