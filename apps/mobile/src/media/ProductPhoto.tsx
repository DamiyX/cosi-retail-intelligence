import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, findNodeHandle, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { ProductPhotos, PhotoView } from './productPhotos';
import { theme } from '../ui/theme';

export function productDisplayName(name: string): string {
  return /^Unfinished product [0-9a-f]{12}$/i.test(name) ? 'Unfinished product' : name;
}

export default function ProductPhoto({ photos, productId, productName = 'Product', compact = false, refreshKey }: {
  photos?: ProductPhotos; productId: string; productName?: string; compact?: boolean; refreshKey?: unknown;
}) {
  const [foregroundVersion, setForegroundVersion] = useState(0);
  const [failedPhoto, setFailedPhoto] = useState<PhotoView | null>(null);
  const [openedPhoto, setOpenedPhoto] = useState<PhotoView | null>(null);
  const trigger = useRef<View>(null);
  const closeButton = useRef<View>(null);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') setForegroundVersion(value => value + 1);
    });
    return () => listener.remove();
  }, []);
  // Mounted-item snapshot only: no cross-product/file cache. Refresh re-verifies integrity.
  const verified = useMemo(() => {
    let photo: PhotoView;
    try { photo = photos?.read(productId) ?? { status: 'none' }; } catch { photo = { status: 'missing' }; }
    return { photo, photos, productId, refreshKey, foregroundVersion };
  }, [photos, productId, refreshKey, foregroundVersion]);
  const photo = verified.photo;
  const available = photo.status === 'available' && Boolean(photo.uri) && failedPhoto !== photo;
  const open = available && openedPhoto === photo;
  const focus = (view: View | null) => {
    const handle = view && findNodeHandle(view);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };
  const close = () => { setOpenedPhoto(null); focus(trigger.current); };
  return <View style={{ gap: 4 }}>
    {available ? <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Enlarge ${productName.toLowerCase()} photo`}
      accessibilityHint="Opens the private product photo without changing your basket" onPress={() => setOpenedPhoto(photo)}
      style={{ minHeight: theme.minTouchTarget, minWidth: theme.minTouchTarget }}>
      <Image source={{ uri: photo.uri }} accessibilityLabel="Product identification photo" resizeMode="contain"
        style={{ width: compact ? 72 : '100%', height: compact ? 72 : 220 }} onError={() => setFailedPhoto(photo)} />
    </Pressable> : <Text>{photo.status === 'none' ? 'No identification photo on this device.' : 'Identification photo missing or damaged on this device.'}</Text>}
    {!compact ? <Text>Private photo on this device only. Photo backup and restore on another phone are unavailable.</Text> : null}
    <Modal visible={open} onRequestClose={close} onShow={() => focus(closeButton.current)}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas }} accessibilityViewIsModal>
        <Text accessibilityRole="header">{productName} photo</Text>
        <Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel="Close photo" onPress={close}
          style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}><Text>Close photo</Text></Pressable>
        {open ? <Image source={{ uri: photo.uri }} accessibilityLabel={`${productName} enlarged photo`} resizeMode="contain"
          style={{ width: '100%', height: 440 }} onError={() => setFailedPhoto(photo)} /> : null}
      </ScrollView>
    </Modal>
  </View>;
}
