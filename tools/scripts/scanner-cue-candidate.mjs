/**
 * ONE reversible M8-18 mitigation candidate, not a causal/audio acceptance test.
 * Originals: immutable Git source 8efb1e0. No playback, URI, network or native API.
 * --write builds 300ms; --check verifies candidate; --restore restores Git bytes.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = '8efb1e071b259b9b7304813e320c9e89dc7dfcc2';
const mode = process.argv[2];
assert.ok(['--write', '--check', '--restore'].includes(mode), 'Use --write, --check or --restore');
const recipes = [
  { name: 'scan-added', rate: 22050, hz: 880, amplitude: 8000 },
  { name: 'code-read', rate: 24000, hz: 330, amplitude: 7000 },
];
const sha = b => createHash('sha256').update(b).digest('hex');

function render(recipe, milliseconds) {
  const frames = recipe.rate * milliseconds / 1000;
  assert.ok(Number.isSafeInteger(frames));
  const b = Buffer.alloc(44 + frames * 2);
  b.write('RIFF', 0); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(recipe.rate, 24); b.writeUInt32LE(recipe.rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) {
    const t = i / recipe.rate;
    // Same 880Hz carrier and original 2.5ms onset/5ms tail, with one
    // continuous longer plateau. Neutral retains one stretched sine envelope.
    const envelope = recipe.name === 'scan-added'
      ? (t > 0.0025 && t < milliseconds / 1000 - 0.005 ? 1 : 0)
      : Math.sin(Math.PI * i / frames);
    b.writeInt16LE(Math.round(recipe.amplitude * Math.sin(2 * Math.PI * recipe.hz * t) * envelope), 44 + i * 2);
  }
  return b;
}
function inspect(b, recipe, duration) {
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(b.readUInt32LE(4), b.length - 8); assert.equal(b.readUInt32LE(16), 16);
  assert.equal(b.readUInt16LE(20), 1); assert.equal(b.readUInt16LE(22), 1);
  assert.equal(b.readUInt32LE(24), recipe.rate); assert.equal(b.readUInt32LE(28), recipe.rate * 2);
  assert.equal(b.readUInt16LE(32), 2); assert.equal(b.readUInt16LE(34), 16);
  assert.equal(b.toString('ascii', 36, 40), 'data'); assert.equal(b.readUInt32LE(40), b.length - 44);
  const frames = (b.length - 44) / 2;
  assert.equal(frames * 1000 / recipe.rate, duration);
  let square = 0, peak = 0, nonzero = 0;
  for (let i = 0; i < frames; i++) {
    const sample = b.readInt16LE(44 + i * 2);
    peak = Math.max(peak, Math.abs(sample)); square += sample * sample; if (sample !== 0) nonzero++;
  }
  assert.ok(nonzero > frames / 2 && peak > 0 && peak < 32767, 'nonzero, unclipped PCM');
  return { bytes: b.length, rate: recipe.rate, frames, milliseconds: duration, hz: recipe.hz,
    peak: peak / 32768, rms: Math.sqrt(square / frames) / 32768, sha256: sha(b) };
}
const prepared = recipes.map(recipe => {
  const path = 'apps/mobile/src/features/scanning/' + recipe.name + '.wav';
  const original = execFileSync('git', ['show', base + ':' + path], { cwd: workspaceRoot });
  assert.ok(original.equals(render(recipe, 100)), 'Derived recipe must reproduce every original byte: ' + recipe.name);
  const candidate = render(recipe, 300);
  const before = inspect(original, recipe, 100), after = inspect(candidate, recipe, 300);
  assert.ok(Math.abs(20 * Math.log10(after.rms / before.rms)) < 0.5, 'RMS remains comparable');
  assert.ok(Math.abs(after.peak - before.peak) < 0.001, 'Peak remains comparable');
  const current = readFileSync(resolve(workspaceRoot, path));
  assert.ok(current.equals(original) || current.equals(candidate), 'Refuse to overwrite unrelated asset bytes: ' + recipe.name);
  return { path, original, candidate, before, after };
});
for (const item of prepared) {
  const path = resolve(workspaceRoot, item.path);
  if (mode === '--write') writeFileSync(path, item.candidate);
  if (mode === '--restore') writeFileSync(path, item.original);
  const expected = mode === '--restore' ? item.original : item.candidate;
  assert.ok(readFileSync(path).equals(expected), 'Exact asset output check: ' + item.path);
  console.log(JSON.stringify({ mode, path: item.path, original: item.before, candidate: item.after,
    rollback: 'node tools/scripts/scanner-cue-candidate.mjs --restore' }));
}
