import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = 'C:/Users/doyew/Documents/DEV 2/COSI-m8-planning';
const stage = 'C:/Users/doyew/.cache/cosi-p2-camera-g3-c4-20261018-a1/app';
const writer = path.join(root, 'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c4-20261018-a1/writer');
if (process.argv[2] === '--eval') {
  const { evalConfig } = require('@expo/config/build/evalConfig');
  console.log(JSON.stringify(evalConfig(path.join(process.argv[3], 'app.config.ts'), null).config));
} else {
  const lease = JSON.parse(fs.readFileSync(path.join(root, '.agents/workflows/recognition-track-b.json'))).lease;
  assert.equal(lease.holder, '01a1051f-0777-7573-ad09-0e550a4bd56a');
  assert.equal(lease.expires_at, '2026-10-18T08:35:19.472Z');
  assert.ok(Date.now() < Date.parse(lease.expires_at));
  assert.ok(!fs.existsSync(path.join(writer, 'writer-stopped.json')));
  const originalPackage = JSON.parse(fs.readFileSync(path.join(root, 'apps/mobile/package.json')));
  const shadowPackage = JSON.parse(fs.readFileSync(path.join(stage, 'package.json')));
  const expectedPackage = structuredClone(originalPackage);
  expectedPackage.expo.autolinking = { ...(expectedPackage.expo.autolinking ?? {}), android: { ...(expectedPackage.expo.autolinking?.android ?? {}), buildFromSource: ['^expo-camera$'], searchPaths: ['../camera-packages'] } };
  assert.deepEqual(shadowPackage, expectedPackage);
  const records = [];
  const run = (name, args, env, cwd) => {
    const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8' });
    fs.writeFileSync(path.join(writer, name + '.json'), JSON.stringify({ command: [process.execPath, ...args], cwd, status: result.status, stdout: result.stdout, stderr: result.stderr }, null, 2), { flag: 'wx' });
    return result;
  };
  for (const [variant, recognition, camera] of [
    ['development', '0', '0'], ['preview', '0', '0'], ['production', '0', '0'], ['scanner-verification', '0', '0'],
    ['recognition-verification', '1', '0'], ['recognition-verification', '1', '1'],
    ['development', '0', '1'], ['recognition-verification', '0', '1'], ['development', '1', '0'], ['recognition-verification', '1', 'invalid'],
  ]) {
    const env = { ...process.env, EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', CI: '1', EXPO_PUBLIC_APP_ENV: variant, COSI_SCANNER_VERIFICATION: variant === 'scanner-verification' ? '1' : '0', COSI_RECOGNITION_EXPERIMENT: recognition, EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: camera };
    const id = `${variant}-${recognition}-${camera}`;
    const original = run(`config-original-${id}`, [fileURLToPath(import.meta.url), '--eval', path.join(root, 'apps/mobile')], env, root);
    const shadow = run(`config-shadow-${id}`, [fileURLToPath(import.meta.url), '--eval', stage], env, stage);
    const valid = records.length < 6;
    assert.equal(original.status === 0, valid); assert.equal(shadow.status === 0, valid);
    if (valid) {
      const config = JSON.parse(shadow.stdout); assert.deepEqual(config, JSON.parse(original.stdout));
      if (recognition === '1') {
        assert.equal(config.android.permissions.includes('android.permission.CAMERA'), camera === '1');
        assert.equal(config.plugins.some(p => Array.isArray(p) && p[0] === 'expo-camera'), camera === '1');
      }
      records.push({ id, exactConfig: true, config });
    } else records.push({ id, bothRejected: true });
  }
  const cameraExcluded = require(path.join(stage, 'plugins/withRecognitionExperiment.js')).excluded.filter(p => p !== 'expo-camera');
  const env = { ...process.env, EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', CI: '1', EXPO_PUBLIC_APP_ENV: 'recognition-verification', COSI_RECOGNITION_EXPERIMENT: '1', COSI_SCANNER_VERIFICATION: '0', EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF: '1' };
  const cli = path.join(root, 'node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js');
  for (const [name, args] of [
    ['camera-gradle-resolve', ['resolve', '--platform', 'android', '--json', ...cameraExcluded.flatMap(p => ['--exclude', p]), '--', path.join(stage, 'recognition-native')]],
    ['camera-rn-config', ['react-native-config', '--platform', 'android', '--json', '--exclude', ...cameraExcluded]],
  ]) {
    const result = run(name, [cli, ...args], env, path.join(stage, 'android'));
    assert.equal(result.status, 0, result.stderr); const value = JSON.parse(result.stdout);
    if (name === 'camera-gradle-resolve') assert.deepEqual(value.modules.map(m => m.packageName).sort(), ['expo', 'expo-camera', 'expo-constants', 'expo-modules-core', 'recognition-experiment'].sort());
    else assert.deepEqual(Object.keys(value.dependencies), ['expo']);
  }
  fs.writeFileSync(path.join(writer, 'config-isolation.json'), JSON.stringify({ records, validConfigs: 6, rejectedMismatches: 4, isolatedCameraModules: 5, nativeExecution: false }, null, 2), { flag: 'wx' });
  console.log('PASS six exact source/shadow configurations, four rejected mismatches and exact camera autolinking command result');
}
