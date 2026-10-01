import { useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import type { PhotoView, ProductPhotos } from './productPhotos';
import ProductPhotoStep from './ProductPhotoStep';
import ProductPhotoPreview from './ProductPhotoPreview';
import { ErrorPanel, PrimaryButton, SecondaryButton } from '../ui/components';
import { theme } from '../ui/theme';

/** Keyed by store/product by its owner; never opens another database handle. */
export default function ProductPhotoEditor({ photos, productId, onSaved, onCancel }: {
  photos: ProductPhotos; productId: string; onSaved(): void; onCancel(): void;
}) {
  const [capturing, setCapturing] = useState(true);
  const [pending, setPending] = useState<{ id: string; photo: PhotoView } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const owned = useRef<string | null>(null);
  const accepting = useRef(false);
  const saving = useRef(false);
  useLayoutEffect(() => {
    accepting.current = capturing;
    return () => { accepting.current = false; };
  }, [capturing]);
  useLayoutEffect(() => () => {
    accepting.current = false;
    if (owned.current) { try { photos.discard(owned.current); } catch { /* Conservative recovery owns leftovers. */ } }
  }, [photos]);
  const capture = (uri: string) => {
    if (!accepting.current) return;
    const id = photos.stage(uri);
    const previous = owned.current;
    owned.current = id;
    let photo: PhotoView;
    try { photo = photos.preview(id); } catch { photo = { status: 'missing' }; }
    accepting.current = false;
    if (previous) { try { photos.discard(previous); } catch { /* Never discard the currently committed photo. */ } }
    setPending({ id, photo }); setCapturing(false); setFailure(null);
  };
  const save = () => {
    if (!pending || saving.current) return;
    saving.current = true; setFailure(null);
    try { photos.replace(productId, pending.id); onSaved(); }
    catch { setFailure('Could not confirm the photo save. Retry or cancel. The product remains saved.'); }
    finally { saving.current = false; }
  };
  return <ScrollView accessibilityViewIsModal contentContainerStyle={{ flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas }}>
    <Text accessibilityRole="header">Edit product photo</Text>
    {capturing ? <ProductPhotoStep active onCaptured={capture} onContinue={onCancel} onCancel={onCancel} continueTitle="Keep existing photo" /> : <>
      {pending ? <ProductPhotoPreview key={pending.id} photo={pending.photo} /> : null}
      <Text>Private photo on this device only. Photo backup and restore on another phone are unavailable.</Text>
      {failure ? <ErrorPanel title="Photo not saved" message={failure} onRetry={save} /> : null}
      <PrimaryButton title="Save photo" onPress={save} />
      <SecondaryButton title="Retake product photo" onPress={() => setCapturing(true)} />
      <SecondaryButton title="Cancel" onPress={onCancel} />
    </>}
  </ScrollView>;
}
