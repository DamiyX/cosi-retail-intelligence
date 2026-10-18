import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const root = process.cwd();
const app = path.join(root, 'apps/mobile');
if (!process.argv[2]) throw new Error('An explicit NEW correction run path is required.');
const run = path.resolve(process.argv[2]);
assert.equal(run, path.join(root, 'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1'));
const { evalConfig } = require('@expo/config/build/evalConfig');
function evaluate(file) {
  delete require.cache[file];
  return evalConfig(file, null).config;
}
const before = path.join(run, 'app.config.baseline.ts');
if (!fs.existsSync(before)) fs.copyFileSync(path.join(run, 'app.config.ts.before.raw'), before);
const rows = [];
for (const variant of ['development', 'preview', 'production', 'scanner-verification']) {
  process.env.EXPO_PUBLIC_APP_ENV = variant;
  process.env.COSI_SCANNER_VERIFICATION = variant === 'scanner-verification' ? '1' : '0';
  delete process.env.COSI_RECOGNITION_EXPERIMENT;
  const original = evaluate(before);
  const current = evaluate(path.join(app, 'app.config.ts'));
  assert.deepEqual(current, original);
  rows.push({ variant, identicalToDirtyBaseline: true, config: current });
}
for (const [variant, flag] of [['development', '1'], ['recognition-verification', '0']]) {
  process.env.EXPO_PUBLIC_APP_ENV = variant;
  process.env.COSI_RECOGNITION_EXPERIMENT = flag;
  process.env.COSI_SCANNER_VERIFICATION = '0';
  assert.throws(() => evaluate(path.join(app, 'app.config.ts')));
}
process.env.EXPO_PUBLIC_APP_ENV = 'recognition-verification';
process.env.COSI_RECOGNITION_EXPERIMENT = '1';
const experiment = evaluate(path.join(app, 'app.config.ts'));
assert.equal(experiment.android.package, 'com.damiyx.retailintelligence.recognitionverification');
assert.equal(JSON.parse(fs.readFileSync(path.join(app, 'package.json'))).main, 'expo-router/entry');
const excluded = require(path.join(app, 'plugins/withRecognitionExperiment.js')).excluded;
for (const [name, args] of [
  ['ordinary-search', ['search', '--platform', 'android', '--json']],
  ['experiment-search', ['search', path.join(app, 'recognition-native'), '--platform', 'android', '--json', '--exclude', ...excluded]],
  ['experiment-rn-config', ['react-native-config', '--platform', 'android', '--json', '--exclude', ...excluded]],
  // Installed Kotlin command builder places search paths after repeated variadic exclusions.
  // The separator prevents Commander consuming the search path as the final exclusion.
  ['actual-gradle-resolve', ['resolve', '--platform', 'android', '--json',
    ...excluded.flatMap(value => ['--exclude', value]), '--', path.join(app, 'recognition-native')]],
]) {
  const cwd = name === 'actual-gradle-resolve' ? path.join(app, 'android') : app;
  const child = spawnSync(process.execPath, [path.join(root, 'node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js'), ...args], { cwd, env: process.env, encoding: 'utf8' });
  fs.writeFileSync(path.join(run, name + '.json'), child.stdout);
  fs.writeFileSync(path.join(run, name + '.stderr.log'), child.stderr);
  assert.equal(child.status, 0, child.stderr);
  const output = JSON.parse(child.stdout);
  if (name === 'ordinary-search') assert.equal(Object.hasOwn(output, 'recognition-experiment'), false);
  if (name === 'experiment-search') assert.equal(Object.hasOwn(output, 'recognition-experiment'), true);
  if (name === 'experiment-search') assert.deepEqual(Object.keys(output).sort(),
    ['recognition-experiment', 'expo', 'expo-constants', 'expo-modules-core'].sort());
  if (name === 'experiment-rn-config') assert.deepEqual(Object.keys(output.dependencies), ['expo']);
  if (name === 'actual-gradle-resolve') assert.deepEqual(output.modules.map(m => m.packageName).sort(),
    ['recognition-experiment', 'expo', 'expo-constants', 'expo-modules-core'].sort());
}
fs.writeFileSync(path.join(run, 'config-comparison.json'), JSON.stringify({ rows, experiment, mismatchedGuardsRejected: true }, null, 2) + '\n');
console.log('PASS ordinary configs identical, both invalid opt-ins rejected; experiment module search isolated.');
