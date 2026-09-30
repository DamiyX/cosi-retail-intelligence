import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SecondaryButton } from '../ui/components';
import type { ProductPhotoCameraProps } from './ProductPhotoCamera';
const Camera = lazy(() => Promise.resolve().then(() => {
  // Keep manual sale fallback available even if a binary lacks the native camera.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./ProductPhotoCamera') as typeof import('./ProductPhotoCamera');
}));
class PhotoCameraBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text>Photo camera unavailable in this build. Continue without photo.</Text> : this.props.children; }
}
export default function ProductPhotoStep({ active, onCaptured, onContinue, onCancel }: ProductPhotoCameraProps & { onContinue(): void; onCancel(): void }) {
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header">Identify this product later</Text>
    <Text>Take a photo so you can finish this product later. Fit the whole product in the frame.</Text>
    <Text>Private photo on this device only. Photo backup and restore on another phone are unavailable.</Text>
    <PhotoCameraBoundary><Suspense fallback={<Text>Opening photo camera…</Text>}><Camera active={active} onCaptured={onCaptured} /></Suspense></PhotoCameraBoundary>
    <SecondaryButton title="Continue without photo" onPress={onContinue} />
    <SecondaryButton title="Cancel" onPress={onCancel} />
  </View>;
}
