import { spawnSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { candidateIdentity, validateCandidate } from '../src/precomputed.ts';
const repo = resolve(__dirname, '../../..'); const lab = resolve(repo, 'apps/recognition-lab');
const fixtures = resolve(lab, 'fixtures'); const runs = resolve(lab, 'runs/r4-cli-test');
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const fixture = (path: string) => resolve(fixtures, path + '.json');
function file(name: string, value: unknown) { mkdirSync(runs, { recursive: true }); const path = resolve(runs, name + '.json'); writeFileSync(path, JSON.stringify(value)); return path; }
const base = (split: string, bundle = fixture('r2/toy-a-' + split)) => ['--manifest', fixture('dataset'), '--dataset-root', fixtures,
  '--candidate', fixture('r2/toy-a'), '--bundle', bundle, '--selection', fixture('r4/selection'), '--store', 'synthetic-store', '--split', split];
const invoke = (args: string[]) => spawnSync(process.execPath, [resolve(lab, 'src/retrievalCli.ts'), ...args], { cwd: repo, encoding: 'utf8' });
const evaluate = (split: string, out: string, cache: string, mode = 'build', config = fixture('r2/config'), extra: string[] = [], bundle?: string) =>
  invoke(['evaluate', ...base(split, bundle), '--out', out, '--cache', cache, '--cache-mode', mode,
    split === 'holdout' ? '--frozen' : '--config', config, ...extra]);
function deterministic(report: unknown) {
  return JSON.stringify(report, (key, value) => ['elapsedMs', 'timing'].includes(key) ? undefined : value);
}

test('actual calibration build/reuse CLI known/unknown decisions and metrics survive exact cache round-trip', () => {
  const destination = resolve(runs, 'valid'); const cache = resolve(runs, 'valid-cache.json');
  const first = evaluate('calibration', destination, cache); expect(first.status).toBe(0);
  const built = read(resolve(destination, 'retrieval.json'));
  expect(built.queryAccounting).toMatchObject({ selected: 3, evaluated: 3, blockedBySetup: 0 });
  expect(built.metrics.populations).toMatchObject({ strong: 2, refused: 1, failed: 0 });
  expect(built.r2DecisionParity).toBe(true);
  const second = evaluate('calibration', destination, cache, 'reuse'); expect(second.status).toBe(0);
  const reopened = read(resolve(destination, 'retrieval.json'));
  expect(reopened.outcomes).toEqual(built.outcomes); expect(reopened.metrics.rates).toEqual(built.metrics.rates);
  expect(evaluate('calibration', destination, cache, 'reuse').status).toBe(0);
  expect(deterministic(read(resolve(destination, 'retrieval.json')))).toBe(deterministic(reopened));
  const publicBytes = readFileSync(resolve(destination, 'retrieval.json'), 'utf8') + readFileSync(resolve(destination, 'retrieval.md'), 'utf8') + second.stdout;
  expect(publicBytes).not.toContain(repo); expect(publicBytes).not.toMatch(/"values"|"vector"|assets\//);
  expect(reopened.tooling).toMatchObject({ encoderExecuted: false, deviceWorkMeasured: false, realQualityAccepted: false });
}, 60000);

test('actual R2 calibration-bound holdout retains failures/uncertain packages; no holdout tuning/freeze bypass', () => {
  const calibration = resolve(runs, 'calibration'); const configs = file('configs', [read(fixture('r2/config'))]);
  const tune = (split: string) => invoke(['calibrate', ...base(split), '--configs', configs, '--choose', '0', '--out', calibration]);
  expect(tune('calibration').status).toBe(0); const frozen = resolve(calibration, 'frozen-retrieval.json');
  const destination = resolve(runs, 'holdout'); const cache = resolve(runs, 'holdout-cache.json');
  const result = evaluate('holdout', destination, cache, 'build', frozen); expect(result.status).toBe(2);
  const report = read(resolve(destination, 'retrieval.json'));
  expect(report.queryAccounting).toMatchObject({ selected: 8, evaluated: 8, blockedBySetup: 0 });
  expect(report.metrics.failureCodes).toEqual({ TIMEOUT: 1 });
  expect(report.metrics.rates.strongJointPrecision).toMatchObject({ numerator: 2, denominator: 4 });
  expect(report.outcomes.find((r: { queryId: string }) => r.queryId === 'hold-package-tie').outcome.packageUnitNeedsConfirmation).toBe(true);
  expect(tune('holdout').status).toBe(1); expect(tune('development').status).toBe(1);
  expect(evaluate('holdout', resolve(runs, 'unfrozen'), cache, 'reuse', fixture('r2/config')).status).toBe(1);
  expect(evaluate('holdout', resolve(runs, 'override'), cache, 'reuse', frozen, ['--config', fixture('r2/config')]).status).toBe(1);
  const altered = read(frozen); altered.r2Frozen.config.strongAt = 0.99;
  expect(evaluate('holdout', resolve(runs, 'drift'), cache, 'reuse', file('freeze-drift', altered)).status).toBe(1);
}, 60000);

test('actual missing/corrupt/cross-scope cache is unavailable with blocked counts; explicit rebuild restores exact results', () => {
  const destination = resolve(runs, 'cache-fallback'); const cache = resolve(runs, 'fallback-cache.json');
  const missing = evaluate('calibration', destination, resolve(runs, 'never-created.json'), 'reuse'); expect(missing.status).toBe(2);
  expect(read(resolve(destination, 'retrieval.json'))).toMatchObject({ status: 'SETUP_FAILURE', setupCode: 'CACHE_MISSING', metrics: null,
    queryAccounting: { selected: 3, evaluated: 0, blockedBySetup: 3 } });
  writeFileSync(cache, '{corrupt'); expect(evaluate('calibration', destination, cache, 'reuse').status).toBe(2);
  expect(read(resolve(destination, 'retrieval.json')).setupCode).toBe('CACHE_CORRUPT');
  expect(evaluate('calibration', destination, cache, 'rebuild').status).toBe(0);
  expect(read(resolve(destination, 'retrieval.json')).cacheAction).toMatchObject({ before: { code: 'CACHE_CORRUPT' }, rebuilt: true });
  const incompatible = read(cache); incompatible.snapshot.binding.storeScope = 'foreign'; writeFileSync(cache, JSON.stringify(incompatible));
  expect(evaluate('calibration', destination, cache, 'reuse').status).toBe(2);
  expect(evaluate('calibration', destination, cache, 'rebuild').status).toBe(0);
  expect(evaluate('calibration', destination, cache, 'reuse').status).toBe(0);
}, 60000);

test('actual query and reference failures remain selected, never UNKNOWN or partial gallery', () => {
  const cache = resolve(runs, 'failure-cache.json'); const destination = resolve(runs, 'failures');
  expect(evaluate('development', destination, cache).status).toBe(2);
  expect(read(resolve(destination, 'retrieval.json')).metrics.failureCodes).toEqual({ ADAPTER_ERROR: 1 });
  const bundle = read(fixture('r2/toy-a-development')); bundle.outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  const result = evaluate('development', destination, cache, 'build', fixture('r2/config'), [], file('reference-failure', bundle));
  expect(result.status).toBe(2);
  expect(read(resolve(destination, 'retrieval.json'))).toMatchObject({ status: 'SETUP_FAILURE', setupCode: 'REFERENCE_ENCODING_FAILURE',
    metrics: null, results: null, referenceFailures: [{ entryId: 'ref-a', code: 'TIMEOUT' }],
    queryAccounting: { selected: 3, evaluated: 0, blockedBySetup: 3, reportedQueryFailures: [{ entryId: 'q-error', code: 'ADAPTER_ERROR' }] } });
}, 60000);

test('actual cross-store, foreign selection, invalid vector, extra flag, malformed JSON reject before outputs', () => {
  const out = resolve(runs, 'invalid-no-write'); const cache = resolve(runs, 'invalid-cache.json');
  const crossed = [...base('calibration')]; crossed[crossed.indexOf('--store') + 1] = 'foreign';
  const args = ['evaluate', ...crossed, '--out', out, '--cache', cache, '--cache-mode', 'build', '--config', fixture('r2/config')];
  const result = invoke(args); expect(result.status).toBe(1); expect(result.stderr).toContain('STORE_SCOPE_MISMATCH');
  const foreign = read(fixture('r4/selection')); foreign.products[0].packageIds = ['single-b'];
  const badSelection = [...args]; badSelection[badSelection.indexOf('--store') + 1] = 'synthetic-store';
  badSelection[badSelection.indexOf('--selection') + 1] = file('foreign-selection', foreign);
  expect(invoke(badSelection).status).toBe(1);
  const bundle = read(fixture('r2/toy-a-calibration')); bundle.outputs[0].output.values = [0, 0, 0];
  expect(evaluate('calibration', out, cache, 'build', fixture('r2/config'), [], file('zero-vector', bundle)).status).toBe(1);
  expect(evaluate('calibration', out, cache, 'build', fixture('r2/config'), ['--execute', 'yes']).status).toBe(1);
  const malformed = resolve(runs, 'malformed.json'); writeFileSync(malformed, '{invalid');
  expect(evaluate('calibration', out, cache, 'build', malformed).status).toBe(1);
  expect(existsSync(out)).toBe(false); expect(existsSync(cache)).toBe(false); expect(result.stderr).not.toContain(repo);
}, 60000);

test('actual summaries omit private producer/declaration prose while retaining exact hashed bindings', () => {
  const privateText = 'C:/private/retailer/photo.jpg'; const candidate = read(fixture('r2/toy-a'));
  candidate.family = privateText; const bundle = read(fixture('r2/toy-a-calibration'));
  bundle.candidate.declarationSha256 = candidateIdentity(validateCandidate(candidate)); bundle.provenance.producer = privateText;
  const args = ['evaluate', ...base('calibration', file('private-prose-bundle', bundle)), '--out', resolve(runs, 'sanitized'),
    '--cache', resolve(runs, 'sanitized-cache.json'), '--cache-mode', 'build', '--config', fixture('r2/config')];
  args[args.indexOf('--candidate') + 1] = file('private-prose-candidate', candidate);
  const result = invoke(args); expect(result.status).toBe(0);
  expect(result.stdout).not.toContain(privateText); expect(readFileSync(resolve(runs, 'sanitized/retrieval.json'), 'utf8')).not.toContain(privateText);
}, 60000);

test('actual linked input ancestors/report/cache targets and lexical escape/collision reject before any write', () => {
  mkdirSync(runs, { recursive: true }); const junction = resolve(runs, 'input-junction');
  if (!existsSync(junction)) symlinkSync(fixtures, junction, 'junction');
  const out = resolve(runs, 'path-no-write'); const cache = resolve(runs, 'path-cache.json');
  const inputArgs = ['evaluate', ...base('calibration'), '--out', out, '--cache', cache, '--cache-mode', 'build', '--config', fixture('r2/config')];
  inputArgs[inputArgs.indexOf('--candidate') + 1] = resolve(junction, 'r2/toy-a.json');
  const linkedInput = invoke(inputArgs); expect(linkedInput.status).toBe(1); expect(linkedInput.stderr).toContain('INPUT_LINKED');
  for (const target of [resolve(fixtures, 'r4-never-write'), resolve(junction, 'r4-never-write')])
    expect(evaluate('calibration', target, cache).status).toBe(1);
  const fileOut = resolve(runs, 'report-target'); mkdirSync(fileOut, { recursive: true });
  if (!existsSync(resolve(fileOut, 'retrieval.json'))) symlinkSync(fixtures, resolve(fileOut, 'retrieval.json'), 'junction');
  expect(evaluate('calibration', fileOut, cache).status).toBe(1);
  const cacheLink = resolve(runs, 'cache-target.json'); if (!existsSync(cacheLink)) symlinkSync(fixtures, cacheLink, 'junction');
  expect(evaluate('calibration', out, cacheLink).status).toBe(1);
  expect(evaluate('calibration', out, resolve(out, 'retrieval.json')).status).toBe(1);
  const protectedFile = resolve(runs, 'hardlink-protected.txt'); writeFileSync(protectedFile, 'PRESERVE');
  const linkedFile = resolve(runs, 'hardlink-cache.json'); if (!existsSync(linkedFile)) linkSync(protectedFile, linkedFile);
  expect(evaluate('calibration', out, linkedFile).status).toBe(1);
  expect(readFileSync(protectedFile, 'utf8')).toBe('PRESERVE');
  expect(existsSync(out)).toBe(false); expect(existsSync(resolve(fixtures, 'r4-never-write'))).toBe(false);
}, 60000);

test('actual output cache cannot replace an explicit candidate or bundle source in ignored runs', () => {
  const candidate = file('protected-candidate', read(fixture('r2/toy-a')));
  const before = readFileSync(candidate, 'utf8');
  const args = ['evaluate', ...base('calibration'), '--out', resolve(runs, 'input-collision'), '--cache', candidate,
    '--cache-mode', 'build', '--config', fixture('r2/config')];
  args[args.indexOf('--candidate') + 1] = candidate;
  const result = invoke(args); expect(result.status).toBe(1); expect(result.stderr).toContain('OUTPUT_INPUT_COLLISION');
  expect(readFileSync(candidate, 'utf8')).toBe(before); expect(existsSync(resolve(runs, 'input-collision'))).toBe(false);
}, 60000);
