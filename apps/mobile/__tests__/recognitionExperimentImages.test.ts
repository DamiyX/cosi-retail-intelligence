import { runGeneratedProbe, runGeneratedImageProbes, exportGeneratedImageEvidence, recoverGeneratedImageEvidence } from '../src/recognitionExperiment/nativeAdapter';
import { validateImageProbe, validateImageExport } from '../src/recognitionExperiment/imageProbes';
import { imageResultFixture } from './recognitionExperimentImageFixtures';
const mockImage = jest.fn(); const mockExport = jest.fn(); const mockRemove = jest.fn();
const mockRecover = jest.fn();
let mockProgress: (p: { completed: number; total: number }) => void;
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return { ...actual, requireNativeModule: (name: string) => name === 'RecognitionExperiment' ? {
    runGeneratedImageProbes: mockImage, exportGeneratedImageEvidence: mockExport,
    recoverGeneratedImageEvidence: mockRecover,
    addListener: (_: string, listener: typeof mockProgress) => { mockProgress = listener; return { remove: mockRemove }; },
  } : actual.requireNativeModule(name) };
});
test('recovery validates durable complete metadata, runs no batch/export and releases its gate after corruption', async () => {
  mockRecover.mockRejectedValueOnce(new Error('Corrupt cache'));
  await expect(recoverGeneratedImageEvidence()).rejects.toThrow('Corrupt cache');
  mockRecover.mockResolvedValueOnce({ status: 'RECOVERED', interruptedExport: true, result: imageResultFixture() });
  await expect(recoverGeneratedImageEvidence()).resolves.toMatchObject({ status: 'RECOVERED', interruptedExport: true });
  const legacy = { ...imageResultFixture(), durable: false };
  mockRecover.mockResolvedValueOnce({ status: 'RECOVERED', interruptedExport: false, result: legacy });
  await expect(recoverGeneratedImageEvidence()).rejects.toThrow('frozen contract');
});

test('image work shares the runtime gate, reports bounded progress and releases subscriptions after failure', async () => {
  let reject: (e: Error) => void = () => {};
  mockImage.mockImplementation(() => new Promise((_, r) => { reject = r; }));
  const progress = jest.fn(); const first = runGeneratedImageProbes(progress);
  expect(mockImage).toHaveBeenCalledWith('all-generated-v1');
  await expect(runGeneratedProbe('zero')).rejects.toThrow('already running');
  await expect(runGeneratedImageProbes(progress)).rejects.toThrow('already running');
  await expect(exportGeneratedImageEvidence(imageResultFixture())).rejects.toThrow('already running');
  mockProgress({ completed: 4, total: 42 }); mockProgress({ completed: 3, total: 42 });
  mockProgress({ completed: 43, total: 42 }); mockProgress({ completed: 8, total: 41 });
  expect(progress.mock.calls).toEqual([[4]]);
  reject(new Error('Malformed generated EXIF')); await expect(first).rejects.toThrow('Malformed');
  expect(mockRemove).toHaveBeenCalledTimes(1);
  mockImage.mockResolvedValue(imageResultFixture());
  await expect(runGeneratedImageProbes(progress)).resolves.toMatchObject({ caseCount: 42, modelExecuted: false });
  expect(mockRemove).toHaveBeenCalledTimes(2);
});

test('complete generated export must bind the current exact size/hash/count and cancellation releases the gate', async () => {
  const expected = imageResultFixture();
  mockExport.mockRejectedValueOnce(new Error('Picker cancelled'));
  await expect(exportGeneratedImageEvidence(expected)).rejects.toThrow('cancelled');
  mockExport.mockResolvedValueOnce({ bundleBytes: expected.bundleBytes, bundleSha256: expected.bundleSha256, outputEntries: 211 });
  await expect(exportGeneratedImageEvidence(expected)).resolves.toMatchObject({ outputEntries: 211 });
  mockExport.mockResolvedValueOnce({ bundleBytes: expected.bundleBytes, bundleSha256: 'c'.repeat(64), outputEntries: 211 });
  await expect(exportGeneratedImageEvidence(expected)).rejects.toThrow('did not match');
});

test('rejects missing cases, duplicate IDs, invalid geometry, nonfinite metrics, wrong recipe and inference claims', () => {
  const mutations: ((r: ReturnType<typeof imageResultFixture>) => void)[] = [
    r => { r.cases.pop(); }, r => { r.cases[1].id = r.cases[0].id; },
    r => { r.cases[0].effectiveBox[2] = 38; }, r => { r.cases[0].letterbox[5]++; },
    r => { r.cases[0].tensorVsFrozenPillowLanczos.meanAbsoluteError = NaN; },
    r => { r.cases[0].decodedUprightVsPillowRgb.mismatchCount = 999999; },
    r => { r.specSha256 = 'd'.repeat(64); }, r => { r.bundleBytes = 48 * 1024 * 1024 + 1; },
  ];
  expect(validateImageProbe(imageResultFixture()).caseCount).toBe(42);
  for (const mutate of mutations) { const r = imageResultFixture(); mutate(r); expect(() => validateImageProbe(r)).toThrow(); }
  expect(() => validateImageProbe({ ...imageResultFixture(), modelExecuted: true })).toThrow();
  expect(() => validateImageProbe({ ...imageResultFixture(), recipe: 'Pillow-LANCZOS' })).toThrow();
  expect(() => validateImageExport(null, imageResultFixture())).toThrow();
});
