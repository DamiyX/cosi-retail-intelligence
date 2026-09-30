import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { ErrorPanel, PrimaryButton, SecondaryButton } from '../ui/components';

export interface ProductPhotoCameraProps {
  active: boolean;
  onCaptured(uri: string): void;
}
/** Explicit still capture. Barcode recognition never runs in this preview. */
export default function ProductPhotoCamera({ active, onCaptured }: ProductPhotoCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  if (!active || !foreground) return <Text>Photo camera paused.</Text>;
  if (failure) return <ErrorPanel title="Photo unavailable" message={failure} onRetry={() => setFailure(null)} />;
  if (!permission) return <Text>Checking camera permission…</Text>;
  if (!permission.granted) return <View style={{ gap: 12 }}>
    <Text>Camera permission is needed for a product photo. You can continue selling without it.</Text>
    <SecondaryButton title={permission.canAskAgain ? 'Allow camera' : 'Open camera settings'} onPress={() => {
      void (permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(() => setFailure('Camera permission could not be opened. Retry or continue without photo.'));
    }} />
  </View>;
  return <ReadyPhotoCamera onCaptured={onCaptured} />;
}

// Mount ownership resets readiness whenever permission, focus or foreground removes the preview.
function ReadyPhotoCamera({ onCaptured }: Pick<ProductPhotoCameraProps, 'onCaptured'>) {
  const [ready, setReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string>();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);
  const alive = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => { generation.current++; });
    return () => subscription.remove();
  }, []);
  const prepare = async () => {
    const token = generation.current;
    try {
      const sizes = await camera.current!.getAvailablePictureSizesAsync();
      const size = sizes.map(value => ({ value, dimensions: value.split('x').map(Number) }))
        .filter(({ dimensions: [width, height] }) => width! > 0 && height! > 0 && width! <= 2048 && height! <= 2048)
        .sort((a, b) => b.dimensions[0]! * b.dimensions[1]! - a.dimensions[0]! * a.dimensions[1]!)[0]?.value;
      if (!size) throw new Error('A bounded photo size is unavailable.');
      if (alive.current && token === generation.current) { setPictureSize(size); setReady(true); }
    } catch {
      if (alive.current && token === generation.current) setFailure('Photo capture is unavailable. Retry or continue without photo.');
    }
  };
  const capture = async () => {
    if (!ready || !pictureSize || !alive.current || inFlight.current || AppState.currentState !== 'active') return;
    const token = generation.current;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await camera.current!.takePictureAsync({ quality: 0.65, exif: false, base64: false });
      if (alive.current && token === generation.current && AppState.currentState === 'active') onCaptured(result.uri);
    } catch {
      if (alive.current && token === generation.current) setFailure('Photo could not be saved. Check device storage, retry or continue without photo.');
    } finally {
      inFlight.current = false;
      if (alive.current && token === generation.current) setBusy(false);
    }
  };
  if (failure) return <ErrorPanel title="Photo unavailable" message={failure} onRetry={() => { setFailure(null); setBusy(false); setReady(false); }} />;
  return <View style={{ gap: 12 }}>
    <CameraView ref={camera} style={{ height: 280 }} facing="back" mode="picture" pictureSize={pictureSize}
      onCameraReady={() => { void prepare(); }} onMountError={() => setFailure('Camera could not start. Retry or continue without photo.')} />
    <PrimaryButton title={busy ? 'Saving photo…' : 'Take product photo'} onPress={() => { void capture(); }} disabled={!ready || busy} />
  </View>;
}
