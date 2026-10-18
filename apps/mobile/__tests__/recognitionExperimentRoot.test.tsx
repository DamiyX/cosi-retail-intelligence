import { act, fireEvent, render } from '@testing-library/react-native';
import ExperimentRoot from '../src/recognitionExperiment/ExperimentRoot';
import { runGeneratedProbe, runGeneratedImageProbes, exportGeneratedImageEvidence, recoverGeneratedImageEvidence } from '../src/recognitionExperiment/nativeAdapter';
import type { ImageRecovery } from '../src/recognitionExperiment/imageProbes';
import { imageResultFixture } from './recognitionExperimentImageFixtures';

jest.mock('../src/recognitionExperiment/nativeAdapter', () => ({ runGeneratedProbe: jest.fn(), runGeneratedImageProbes: jest.fn(), exportGeneratedImageEvidence: jest.fn(), recoverGeneratedImageEvidence: jest.fn() }));
let screen: ReturnType<typeof render>;
let rejectProbe: (error: Error) => void;
let resolveRecovery: (result: ImageRecovery) => void;
async function finishRecovery(result: ImageRecovery = { status: 'NONE', interruptedExport: false }) {
  await act(async () => { resolveRecovery(result); });
}

beforeEach(() => {
  jest.clearAllMocks();
  const started = performance.now();
  jest.mocked(recoverGeneratedImageEvidence).mockImplementation(() => new Promise(r => { resolveRecovery = r; }));
  jest.mocked(runGeneratedProbe).mockImplementation(() => new Promise((_, reject) => { rejectProbe = reject; }));
  // Fresh host renderer setup measured separately, without changing Jest's timeout.
  // Mount assertions remain enforced in this hook and again before interaction.
  screen = render(<ExperimentRoot />);
  expect(runGeneratedProbe).not.toHaveBeenCalled();
  expect(runGeneratedImageProbes).not.toHaveBeenCalled();
  expect(exportGeneratedImageEvidence).not.toHaveBeenCalled();
  expect(recoverGeneratedImageEvidence).toHaveBeenCalledTimes(1);
  expect(screen.getByText('No device inference recorded.')).toBeTruthy();
  console.info('GENERATED_ROOT_SETUP_MS', performance.now() - started);
});
test('runs no image work automatically and exposes complete generated evidence only after the batch', async () => {
  await finishRecovery();
  let resolve: (result: ReturnType<typeof imageResultFixture>) => void = () => {};
  jest.mocked(runGeneratedImageProbes).mockImplementation(() => new Promise(r => { resolve = r; }));
  expect(runGeneratedImageProbes).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Export generated image evidence')).toBeNull();
  fireEvent.press(screen.getByLabelText('Run generated image batch'));
  expect(screen.getByText('Processing generated images 0/42…')).toBeTruthy();
  expect(screen.getByLabelText('Run generated zero probe').props.accessibilityState.disabled).toBe(true);
  await act(async () => { resolve(imageResultFixture()); });
  expect(screen.getByText(/42 cases · 211 output files/)).toBeTruthy();
  jest.mocked(exportGeneratedImageEvidence).mockRejectedValueOnce(new Error('Generated evidence export cancelled'));
  fireEvent.press(screen.getByLabelText('Export generated image evidence'));
  await act(async () => {});
  expect(screen.getByText('Generated evidence export cancelled')).toBeTruthy();
  expect(screen.queryByText(/Complete generated bundle written/)).toBeNull();
  expect(runGeneratedProbe).not.toHaveBeenCalled();
});

test('does not invoke native inference on mount and displays an explicit failure', async () => {
  await finishRecovery();
  expect(runGeneratedProbe).not.toHaveBeenCalled();
  expect(screen.getByText('No device inference recorded.')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Run generated zero probe'));
  expect(runGeneratedProbe).toHaveBeenCalledWith('zero');
  expect(screen.getByText('Running zero…')).toBeTruthy();
  await act(async () => { rejectProbe(new Error('Asset hash mismatch')); });
  expect(screen.getByText('Asset hash mismatch')).toBeTruthy();
});
test('preserves completed-case counts on image failure and withholds a partial export', async () => {
  await finishRecovery();
  jest.mocked(runGeneratedImageProbes).mockImplementationOnce(async progress => {
    progress(7); throw new Error('Generated geometry validation failed');
  });
  fireEvent.press(screen.getByLabelText('Run generated image batch'));
  await act(async () => {});
  expect(screen.getByText('Generated batch stopped after 7/42 cases; no complete evidence bundle.')).toBeTruthy();
  expect(screen.getByText('Generated geometry validation failed')).toBeTruthy();
  expect(screen.queryByLabelText('Export generated image evidence')).toBeNull();
  expect(runGeneratedProbe).not.toHaveBeenCalled();
});
test('recovered completed evidence and interrupted-picker state appear without batch, inference or export', async () => {
  await finishRecovery({ status: 'RECOVERED', interruptedExport: true, result: imageResultFixture() });
  expect(screen.getByText('Recovered verified completed evidence. No image batch or model was rerun.')).toBeTruthy();
  expect(screen.getByText(/Previous export session was interrupted/)).toBeTruthy();
  expect(screen.getByText(/Generated ZIP SHA256: aaaa/)).toBeTruthy();
  expect(runGeneratedProbe).not.toHaveBeenCalled(); expect(runGeneratedImageProbes).not.toHaveBeenCalled();
  expect(exportGeneratedImageEvidence).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Export generated image evidence').props.accessibilityState.disabled).toBe(false);
});
