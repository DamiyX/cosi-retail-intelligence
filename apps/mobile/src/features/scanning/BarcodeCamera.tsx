import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeInput } from '@retail/contracts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';

import { ErrorPanel, SecondaryButton } from '../../ui/components';

export interface BarcodeCameraProps {
  active: boolean;
  onDetection(detection: Pick<BarcodeInput, 'symbology' | 'value'>): void;
}

/** The only native camera dependency. No capture, recording or persistence API. */
export default function BarcodeCamera({ active, onDetection }: BarcodeCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [torch, setTorch] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const generation = useRef(0);
  const [captureGeneration, setCaptureGeneration] = useState(0);
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
    return () => { currentActive.current = false; };
  }, [active]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      generation.current++;
      setCaptureGeneration(generation.current);
      setForeground(state === 'active');
    });
    return () => { subscription.remove(); };
  }, []);
  if (!active || !foreground) return <Text>Camera paused.</Text>;
  if (failure) return <ErrorPanel title="Camera unavailable" message={failure} onRetry={() => setFailure(null)} />;
  if (!permission) return <Text>Checking camera permission…</Text>;
  if (!permission.granted) return <View>
    <Text>Use the camera to read a product barcode. You can also search products.</Text>
    <SecondaryButton title={permission.canAskAgain ? 'Allow camera' : 'Open camera settings'} onPress={() => {
      const action = permission.canAskAgain ? requestPermission() : Linking.openSettings();
      void action.catch(() => setFailure('Camera permission could not be opened. Search products or retry.'));
    }} />
  </View>;
  return <View style={{ gap: 12 }}>
    <CameraView style={{ height: 240 }} facing="back" enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'qr'] }}
      onMountError={() => setFailure('The camera could not start. Search products or retry.')}
      onBarcodeScanned={event => {
        if (!currentActive.current || AppState.currentState !== 'active' || captureGeneration !== generation.current) return;
        if (event.type === 'ean13' || event.type === 'ean8' || event.type === 'upc_a' || event.type === 'qr') {
          onDetection({ symbology: event.type, value: event.data });
        }
      }} />
    <SecondaryButton title={torch ? 'Torch off' : 'Torch on'} onPress={() => setTorch(value => !value)} />
  </View>;
}
