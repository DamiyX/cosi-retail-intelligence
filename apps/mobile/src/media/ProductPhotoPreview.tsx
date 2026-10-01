import { useState } from 'react';
import { Image, Text } from 'react-native';
import type { PhotoView } from './productPhotos';

export default function ProductPhotoPreview({ photo }: { photo: PhotoView }) {
  const [failed, setFailed] = useState(false);
  return photo.status === 'available' && photo.uri && !failed
    ? <Image source={{ uri: photo.uri }} accessibilityLabel="Product photo preview" resizeMode="contain"
      style={{ width: '100%', height: 220 }} onError={() => setFailed(true)} />
    : <Text>Photo preview unavailable. Retake or continue without photo.</Text>;
}
