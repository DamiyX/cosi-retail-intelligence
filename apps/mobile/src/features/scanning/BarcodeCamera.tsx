import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeInput } from '@retail/contracts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorPanel, SecondaryButton } from '../../ui/components';
import ScannerActivity from './ScannerActivity';
import { usePreviewZoom } from './usePreviewZoom';
import { theme } from '../../ui/theme';

export interface BarcodeCameraProps {
  active: boolean;
  onDetection(detection: Pick<BarcodeInput, 'symbology' | 'value'>): void;
}

/** Barcode-only preview adapter. Explicit product photos use a separate, mutually exclusive preview. */
export default function BarcodeCamera({ active, onDetection }: BarcodeCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [torch, setTorch] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const generation = useRef(0);
  const [captureGeneration, setCaptureGeneration] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState<number | null>(null);
  const currentActive = useRef(active);
  const ready = readyGeneration === captureGeneration;
  const zoomAvailable = active && foreground && permission?.granted === true && failure === null && ready;
  const zoom = usePreviewZoom(zoomAvailable);
  useLayoutEffect(() => {
    generation.current++;
    setCaptureGeneration(generation.current);
    currentActive.current = active && foreground && permission?.granted === true && failure === null;
    return () => { currentActive.current = false; };
  }, [active, foreground, permission?.granted, failure]);
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
    <ReadyBarcodePreview torch={torch} ready={ready} zoom={zoom.zoom} gestureHandlers={zoom.gestureHandlers}
      onCameraReady={() => {
        if (currentActive.current && AppState.currentState === 'active' && captureGeneration === generation.current) setReadyGeneration(captureGeneration);
      }}
      onMountError={() => {
        if (currentActive.current && AppState.currentState === 'active' && captureGeneration === generation.current) setFailure('The camera could not start. Search products or retry.');
      }}
      onBarcodeScanned={event => {
        if (!currentActive.current || AppState.currentState !== 'active' || captureGeneration !== generation.current) return;
        if (event.type === 'ean13' || event.type === 'ean8' || event.type === 'upc_a' || event.type === 'qr') {
          onDetection({ symbology: event.type, value: event.data });
        }
      }} />
    <Text accessibilityLabel={`Camera zoom setting ${Math.round(zoom.zoom * 100)} percent`}>Zoom {Math.round(zoom.zoom * 100)}%</Text>
    <View style={styles.zoomControls}>
      <ZoomButton title="Zoom out" disabled={!zoomAvailable || zoom.zoom === 0} onPress={zoom.zoomOut} />
      <ZoomButton title="Reset zoom" disabled={!zoomAvailable || zoom.zoom === 0} onPress={zoom.reset} />
      <ZoomButton title="Zoom in" disabled={!zoomAvailable || zoom.zoom === 1} onPress={zoom.zoomIn} />
    </View>
    <Text>Pinch the preview with two fingers, or use the zoom buttons.</Text>
    <SecondaryButton title={torch ? 'Torch off' : 'Torch on'} onPress={() => setTorch(value => !value)} />
  </View>;
}

function ReadyBarcodePreview({ torch, ready, zoom, gestureHandlers, onCameraReady, onMountError, onBarcodeScanned }: {
  torch: boolean;
  ready: boolean;
  zoom: number;
  gestureHandlers: ReturnType<typeof usePreviewZoom>['gestureHandlers'];
  onCameraReady(): void;
  onMountError: NonNullable<React.ComponentProps<typeof CameraView>['onMountError']>;
  onBarcodeScanned: NonNullable<React.ComponentProps<typeof CameraView>['onBarcodeScanned']>;
}) {
  return <View>
    <View testID="barcode-zoom-preview" style={{ height: 240 }} {...gestureHandlers}>
      <CameraView style={{ height: 240 }} facing="back" enableTorch={torch} zoom={zoom}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'qr'] }}
        onCameraReady={onCameraReady} onMountError={onMountError} onBarcodeScanned={onBarcodeScanned} />
      <ScannerActivity active={ready} />
    </View>
    <Text>{ready ? 'Looking for a barcode. The guide helps framing; codes can be read anywhere in the preview.' : 'Starting barcode camera…'}</Text>
  </View>;
}

function ZoomButton({ title, disabled, onPress }: { title: string; disabled: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={[styles.zoomButton, disabled && { opacity: 0.55 }]}>
    <Text style={styles.zoomText}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  zoomControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoomButton: { minHeight: theme.minTouchTarget, minWidth: theme.minTouchTarget, paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.field, backgroundColor: theme.color.raised },
  zoomText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
});
