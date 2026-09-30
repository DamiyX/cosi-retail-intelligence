import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { RecognitionResult } from '@retail/contracts';
import { Text as MockText } from 'react-native';
import ScannerPanel from '../src/features/scanning/ScannerPanel';
import type { BarcodeCameraProps } from '../src/features/scanning/BarcodeCamera';
import { ScanSession } from '../src/features/scanning/session';

jest.mock('../src/features/scanning/BarcodeCamera', () => ({
  __esModule: true,
  default: ({ onDetection, active }: BarcodeCameraProps) => <MockText onPress={() => {
    if (active) onDetection({ symbology: 'upc_a', value: '036000291452' });
  }}>Camera test event</MockText>,
}));

it('cancels delayed recognition without selecting a product', async () => {
  let resolve!: (result: RecognitionResult) => void;
  const onCandidate = jest.fn();
  const { unmount } = render(<ScannerPanel service={{ recognize: () => new Promise(done => { resolve = done; }) }}
    session={new ScanSession()} active onCandidate={onCandidate} onSearch={jest.fn()} onCancel={jest.fn()}
    basketMode={false} onModeChange={jest.fn()} summary="0 items" onUndo={jest.fn()} />);
  fireEvent.press(await screen.findByText('Camera test event'));
  unmount();
  await act(async () => { resolve({ status: 'UNKNOWN', reason: 'NOT_FOUND' }); });
  expect(onCandidate).not.toHaveBeenCalled();
});

it('keeps read failure distinct from unknown with manual fallback', async () => {
  const search = jest.fn();
  render(<ScannerPanel service={{ recognize: async () => { throw new Error('disk'); } }}
    session={new ScanSession()} active onCandidate={jest.fn()} onSearch={search} onCancel={jest.fn()}
    basketMode={false} onModeChange={jest.fn()} summary="2 items" onUndo={jest.fn()} />);
  const trigger = await screen.findByText('Camera test event');
  await act(async () => { fireEvent.press(trigger); });
  expect(screen.getByText('Products could not be read. Your basket is preserved.')).toBeTruthy();
  fireEvent.press(screen.getByText('Search products'));
  expect(search).toHaveBeenCalledTimes(1);
});

it('offers unknown-code creation with the detected type/value and explicit user action', async () => {
  const create = jest.fn();
  render(<ScannerPanel service={{ recognize: async () => ({ status: 'UNKNOWN', reason: 'NOT_FOUND' }) }}
    session={new ScanSession()} active onCandidate={jest.fn()} onSearch={jest.fn()} onCreate={create} onCancel={jest.fn()}
    basketMode onModeChange={jest.fn()} summary="2 items" onUndo={jest.fn()} />);
  const trigger = await screen.findByText('Camera test event');
  await act(async () => { fireEvent.press(trigger); });
  expect(create).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Sell this item'));
  expect(create).toHaveBeenCalledWith({ symbology: 'upc_a', value: '036000291452' });
});

