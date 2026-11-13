/** Native attestation is consumed in Java. These checks protect UI/result binding only. */
export const ORIENTATION_RECIPE = 'camera-android-native-same-frame-exif-roi-center-bilinear-u8-gray128-rgb224-f32-div255-v2';
export const ORIENTATION_RECIPE_SHA256 = '6e321fed06283ee2be42fc80d3b306ab5b52185bc77d627299960dcb7917d6a4';
const fields = ['generation', 'view', 'useCase', 'displayId', 'displayRotation', 'captureTargetRotation', 'previewTargetRotation', 'previewWidth', 'previewHeight', 'previewLeft', 'previewTop', 'scale', 'lens', 'cameraId', 'mirror', 'zoom', 'sensorOrientation', 'sensorToTarget', 'streaming'] as const;
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('CAMERA_GEOMETRY_OBJECT');
  return value as Record<string, unknown>;
};
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export function validateOrientationGeometry(receipt: Record<string, unknown>, job: string) {
  // The SDK may choose a different bounded actual size; retain the requested size honestly.
  const requested = typeof receipt.requestedSize === 'string' ? /^([1-9]\d{0,6})x([1-9]\d{0,6})$/.exec(receipt.requestedSize) : null;
  if (!requested || Number(requested[1]) * Number(requested[2]) > 4_000_000) throw Error('CAMERA_GEOMETRY_REQUESTED_PROVENANCE');
  const g = object(receipt.nativeGeometry);
  if (g.version !== 2 || g.job !== job || Object.keys(g).length !== 6 || receipt.orientationContract !== 'native-same-frame-v2' || typeof receipt.nativeGeometrySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.nativeGeometrySha256)) throw Error('CAMERA_GEOMETRY_BINDING');
  const a = object(g.admission);
  for (const name of ['admission', 'callback', 'saved']) {
    const s = object(g[name]);
    if (Object.keys(s).length !== fields.length || fields.some(key => !(key in s) || s[key] !== a[key])) throw Error('CAMERA_GEOMETRY_STALE');
    if (!integer(s.generation, 1, Number.MAX_SAFE_INTEGER) || !uuid(s.view) || !uuid(s.useCase) || !integer(s.displayId, 0, 2 ** 31 - 1) || !integer(s.displayRotation, 0, 3) || s.captureTargetRotation !== s.displayRotation || s.previewTargetRotation !== s.displayRotation) throw Error('CAMERA_GEOMETRY_ROTATION');
    if (s.previewWidth !== receipt.previewWidth || s.previewHeight !== receipt.previewHeight || !integer(s.previewWidth, 1, 10_000) || !integer(s.previewHeight, 1, 10_000) || !integer(s.previewLeft, 0, 10_000) || !integer(s.previewTop, 0, 10_000) || s.scale !== `${String(receipt.contentMode)}_CENTER` || !['FILL_CENTER', 'FIT_CENTER'].includes(String(s.scale))) throw Error('CAMERA_GEOMETRY_PREVIEW');
    if (s.lens !== 'BACK' || typeof s.cameraId !== 'string' || !/^[A-Za-z0-9._:-]{1,64}$/.test(s.cameraId) || s.mirror !== false || s.zoom !== 0 || s.streaming !== true || !integer(s.sensorOrientation, 0, 270) || s.sensorOrientation % 90 !== 0 || s.sensorToTarget !== (s.sensorOrientation - s.displayRotation * 90 + 360) % 360) throw Error('CAMERA_GEOMETRY_UNSUPPORTED');
  }
  const i = object(g.image), exifDegrees: Record<number, number> = { 1: 0, 3: 180, 6: 90, 8: 270 };
  const imageKeys = ['width', 'height', 'crop', 'rotationDegrees', 'timestampNanos', 'format', 'jpegWidth', 'jpegHeight', 'exifOrientation', 'jpegBytes', 'jpegSha256'];
  if (Object.keys(i).length !== imageKeys.length || imageKeys.some(key => !(key in i)) || typeof i.timestampNanos !== 'string' || i.timestampNanos.length === 19 && i.timestampNanos > '9223372036854775807') throw Error('CAMERA_GEOMETRY_IMAGE_KEYS');
  if (i.width !== receipt.width || i.height !== receipt.height || i.jpegWidth !== receipt.width || i.jpegHeight !== receipt.height || i.exifOrientation !== receipt.orientation || i.rotationDegrees !== exifDegrees[Number(receipt.orientation)] || i.rotationDegrees !== a.sensorToTarget || i.jpegBytes !== receipt.jpegBytes || i.jpegSha256 !== receipt.jpegSha256 || i.format !== 256 || typeof i.timestampNanos !== 'string' || !/^[1-9]\d{0,18}$/.test(i.timestampNanos) || !Array.isArray(i.crop) || i.crop.length !== 4 || i.crop.some((n, index) => n !== [0, 0, receipt.width, receipt.height][index])) throw Error('CAMERA_GEOMETRY_IMAGE');
}
