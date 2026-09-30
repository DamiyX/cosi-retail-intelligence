import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { ProductPhotos, PhotoView } from './productPhotos';
export default function ProductPhoto({ photos, productId, compact = false }: { photos?: ProductPhotos; productId: string; compact?: boolean }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  let photo: PhotoView;
  try { photo = photos?.read(productId) ?? { status: 'none' }; } catch { photo = { status: 'missing' }; }
  return <View style={{ gap: 4 }}>
    {photo.status === 'available' && photo.uri !== failedUri ? <Image source={{ uri: photo.uri }} accessibilityLabel="Product identification photo" resizeMode="contain" style={{ width: compact ? 72 : '100%', height: compact ? 72 : 220 }} onError={() => setFailedUri(photo.uri ?? null)} /> : <Text>{photo.status === 'none' ? 'No identification photo on this device.' : 'Identification photo missing or damaged on this device.'}</Text>}
    {!compact ? <Text>Private photo on this device only. Photo backup and restore on another phone are unavailable.</Text> : null}
  </View>;
}
