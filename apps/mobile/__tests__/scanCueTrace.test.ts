import { createScanCueTrace, type CueTraceFields } from '../src/features/scanning/scanCueTrace';

const isolated = { extra: { appEnvironment: 'scanner-verification', scannerVerificationBuild: true },
  android: { package: 'com.damiyx.retailintelligence.scannerverification' } };
let mockConfig: unknown = isolated;
jest.mock('expo-constants', () => ({ __esModule: true, default: { get expoConfig() { return mockConfig; } } }));
const previousFlag = process.env.EXPO_PUBLIC_SCANNER_CUE_TRACE;
afterEach(() => {
  if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_SCANNER_CUE_TRACE;
  else process.env.EXPO_PUBLIC_SCANNER_CUE_TRACE = previousFlag;
});

it.each([undefined, false, true, 'false', 'TRUE', '1', ''])('stays inert for nonliteral flag %s', flag => {
  const output = jest.fn(); const now = jest.fn();
  const config = { get extra(): never { throw new Error('must not inspect config while disabled'); } };
  const trace = createScanCueTrace(flag, config, output, now);
  expect(trace.active).toBe(false);
  expect(trace.hook()).toBeUndefined(); expect(trace.attempt()).toBeUndefined();
  trace.mark('status', { loaded: true });
  expect(output).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
});

it.each([null, undefined, {}, { extra: null }, { extra: 'private' },
  ...['development', 'preview', 'production'].map(appEnvironment => ({ ...isolated, extra: { ...isolated.extra, appEnvironment } })),
  ...[undefined, false, 'true', 1].map(scannerVerificationBuild => ({ ...isolated, extra: { ...isolated.extra, scannerVerificationBuild } })),
  { ...isolated, android: undefined }, { ...isolated, android: { package: 'com.damiyx.retailintelligence' } },
])('rejects ordinary or malformed config %# even with flag true', config => {
  const output = jest.fn(); const now = jest.fn();
  const trace = createScanCueTrace('true', config as Parameters<typeof createScanCueTrace>[1], output, now);
  expect(trace.active).toBe(false); trace.mark('hook-mount');
  expect(output).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
});

it('fails closed on a throwing config and gates the actual configured singleton', () => {
  expect(createScanCueTrace('true', { get extra(): never { throw new Error('private'); } }).active).toBe(false);
  for (const [flag, config, expected] of [['true', isolated, true], ['false', isolated, false],
    ['true', { ...isolated, android: { package: 'ordinary' } }, false]] as const) {
    process.env.EXPO_PUBLIC_SCANNER_CUE_TRACE = flag; mockConfig = config;
    jest.isolateModules(() => {
      expect(jest.requireActual<typeof import('../src/features/scanning/scanCueTrace')>('../src/features/scanning/scanCueTrace').scanCueTrace.active).toBe(expected);
    });
  }
});

it('emits only allowlisted values, drops unknown text/objects and contains input/logging errors', () => {
  const output = jest.fn(); const trace = createScanCueTrace('true', isolated, output, () => 100);
  trace.mark('request', { hook: 1, attempt: 2, cue: 'match', origin: 'SINGLE_MATCH', current: true,
    barcode: 'PRIVATE_CODE', store: 'PRIVATE_STORE', uri: 'https://PRIVATE', error: 'PRIVATE_ERROR',
    reason: 'PRIVATE_REASON', appState: 'PRIVATE_STATE', nested: { secret: 'PRIVATE' },
  } as unknown as CueTraceFields);
  expect(output.mock.calls[0]![0]).toBe('[SCAN_CUE_TRACE] {"seq":1,"ms":0,"event":"request","hook":1,"attempt":2,"current":true,"cue":"match","origin":"SINGLE_MATCH"}');
  trace.mark('PRIVATE_EVENT' as Parameters<typeof trace.mark>[0]);
  expect(() => trace.mark('request', { get error(): never { throw new Error('PRIVATE'); } })).not.toThrow();
  expect(output).toHaveBeenCalledTimes(1);
  let reads = 0;
  trace.mark('status', { get loaded() { reads++; return reads === 1 ? true : 'PRIVATE'; } } as CueTraceFields);
  expect(reads).toBe(1); expect(output.mock.calls[1]![0]).not.toContain('PRIVATE');
  const throwing = createScanCueTrace('true', isolated, () => { throw new Error('PRIVATE'); }, () => 100);
  expect(() => throwing.mark('play-called')).not.toThrow();
});

it('caps the shared session, deduplicates unchanged periodic states, and keeps time monotonic', () => {
  const output = jest.fn(); let time = 1000;
  const trace = createScanCueTrace('true', isolated, output, () => time);
  const hook = trace.hook();
  trace.mark('status', { hook, cue: 'match', loaded: true, playing: false, error: false });
  time = 1004; trace.mark('status', { hook, cue: 'match', loaded: true, playing: true, error: false });
  time = 999; trace.mark('status', { hook, cue: 'match', loaded: true, playing: false, error: false });
  time = 1010; trace.mark('status', { hook, cue: 'match', loaded: true, playing: false, finished: true, error: false });
  for (let i = 0; i < 200; i++) trace.mark('status', { hook, cue: 'match', loaded: true, playing: false, finished: true, error: false });
  expect(output).toHaveBeenCalledTimes(4);
  expect(output.mock.calls.map(([line]) => JSON.parse(line.slice('[SCAN_CUE_TRACE] '.length)).ms)).toEqual([0, 4, 4, 10]);
  for (let mount = 0; mount < 100; mount++) {
    const next = trace.hook(); trace.mark('hook-mount', { hook: next }); trace.mark('hook-unmount', { hook: next });
  }
  expect(output).toHaveBeenCalledTimes(128);
  expect(output.mock.calls[127]![0]).toContain('"event":"trace-limit"');
  expect(trace.active).toBe(false);
  expect(trace.hook()).toBeUndefined(); expect(trace.attempt()).toBeUndefined();
});

it('also bounds failing clocks and output attempts', () => {
  for (const clockFails of [false, true]) {
    const now = jest.fn(() => { if (clockFails) throw new Error('clock'); return 0; });
    const output = jest.fn(() => { throw new Error('log'); });
    const trace = createScanCueTrace('true', isolated, output, now);
    for (let i = 0; i < 200; i++) expect(() => trace.mark('hook-mount', { hook: trace.hook() })).not.toThrow();
    expect(now).toHaveBeenCalledTimes(128);
    expect(output).toHaveBeenCalledTimes(clockFails ? 0 : 128);
  }
});
