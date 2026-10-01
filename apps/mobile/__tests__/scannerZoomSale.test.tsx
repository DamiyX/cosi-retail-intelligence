import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createDatabaseSalesClient } from '../src/sales/client';
import SellScreen from '../src/screens/sales/SellScreen';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';

let mockDetection!: (event: { type: string; data: string }) => void;
let mockZoom = 0;
const mockBeep = jest.fn();
jest.mock('../src/features/scanning/useScanFeedback', () => ({ useScanFeedback: () => mockBeep }));
jest.mock('expo-camera', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
    CameraView: ({ onCameraReady, onBarcodeScanned, zoom }: { zoom: number; onCameraReady(): void; onBarcodeScanned(event: { type: string; data: string }): void }) => {
      mockDetection = onBarcodeScanned;
      mockZoom = zoom;
      return <View testID="native-barcode-preview" onLayout={onCameraReady} />;
    },
  };
});

it('pinch/buttons preserve a real basket, duplicate guard and SQLite business facts', async () => {
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  const motion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const fixture = openCatalogueFixture();
  try {
    createTemporaryProduct(fixture.adapter, { storeId: fixture.context.store.id, deviceId: fixture.context.device.id,
      name: 'A', barcode: '036000291452', barcodeType: 'UPC', barcodeForBasePackage: true, defaultSellingPriceMinor: 10000 }, { generateId: deterministicIds(1000) });
    const facts = () => ['sales', 'sale_items', 'inventory_events', 'outbox_operations'].map(table => fixture.adapter.getAllRows(`SELECT * FROM ${table}`));
    const before = facts();
    const { unmount } = render(<SellScreen client={createDatabaseSalesClient(fixture.adapter)} initialScan automaticScanAdditionVerified />);
    await act(async () => { fireEvent.press(screen.getByText('Mode: Single item — switch to Basket')); });
    await screen.findByTestId('native-barcode-preview');
    fireEvent(screen.getByTestId('native-barcode-preview'), 'layout');
    await act(async () => { mockDetection({ type: 'upc_a', data: '036000291452' }); });
    expect(screen.getByText(/1 lines · ₦100.00/)).toBeTruthy();
    fireEvent(screen.getByTestId('native-barcode-preview'), 'layout');
    fireEvent.press(screen.getByRole('button', { name: 'Zoom in' }));
    expect(mockZoom).toBe(0.1);
    const touch = (distance: number) => ({ nativeEvent: { touches: [
      { identifier: 1, target: 10, pageX: 0, pageY: 0 }, { identifier: 2, target: 10, pageX: distance, pageY: 0 },
    ] } });
    const preview = screen.getByTestId('barcode-zoom-preview');
    // RNTL fireEvent probes responder predicates without a native event, so
    // exercise the actual mounted preview handlers with two-touch events.
    expect(preview.props.onStartShouldSetResponder(touch(100))).toBe(true);
    act(() => preview.props.onResponderGrant(touch(100)));
    act(() => preview.props.onResponderMove(touch(200)));
    expect(mockZoom).toBe(0.35);
    expect(screen.getByText(/1 lines · ₦100.00/)).toBeTruthy();
    expect(mockBeep).toHaveBeenCalledTimes(1);
    await act(async () => { mockDetection({ type: 'upc_a', data: '036000291452' }); });
    expect(screen.getByText(/1 lines · ₦100.00/)).toBeTruthy();
    expect(mockBeep).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(mockZoom).toBe(0);
    expect(facts()).toEqual(before);
    fireEvent.press(screen.getByText('Back to basket'));
    expect(screen.getByText('Cart (1)')).toBeTruthy();
    expect(screen.getAllByText('₦100.00').length).toBeGreaterThan(0);
    unmount();
  } finally { fixture.closeAndDelete(); motion.mockRestore(); }
});
