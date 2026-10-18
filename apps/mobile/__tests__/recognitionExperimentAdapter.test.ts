import { runGeneratedProbe } from '../src/recognitionExperiment/nativeAdapter';
import type { FixtureId } from '../src/recognitionExperiment/generatedProbe';
const mockRun = jest.fn();
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return { ...actual, requireNativeModule: (name: string) => name === 'RecognitionExperiment'
    ? { runGeneratedProbe: mockRun } : actual.requireNativeModule(name) };
});

test('rejects invalid IDs, concurrent calls, and releases the gate after native failure', async () => {
  let reject: (e: Error) => void = () => {};
  mockRun.mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
  await expect(runGeneratedProbe('file:///private.jpg' as FixtureId)).rejects.toThrow('Invalid');
  expect(mockRun).not.toHaveBeenCalled();
  const first = runGeneratedProbe('zero');
  await expect(runGeneratedProbe('gradient')).rejects.toThrow('already running');
  reject(new Error('Native failure'));
  await expect(first).rejects.toThrow('Native failure');
  mockRun.mockImplementation(() => Promise.reject(new Error('Second failure')));
  await expect(runGeneratedProbe('gray128')).rejects.toThrow('Second failure');
  expect(mockRun).toHaveBeenCalledTimes(2);
});
