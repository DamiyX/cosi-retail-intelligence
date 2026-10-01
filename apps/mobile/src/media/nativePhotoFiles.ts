import { Directory, File, Paths } from 'expo-file-system';
import { assertNewThumbnail, MAX_PHOTO_BYTES, type PhotoFiles, type PhotoInfo } from './productPhotos';
import { jpegDimensions } from './photoFormat';

export function createNativePhotoFiles(): PhotoFiles {
  const root = new Directory(Paths.document, 'product-photos');
  const file = (key: string) => {
    if (!/^[0-9a-f-]{36}\.jpg(?:\.part)?$/i.test(key)) throw new Error('Invalid photo key.');
    return new File(root, key);
  };
  const inspect = (f: File): PhotoInfo | null => {
    if (!f.exists) return null;
    if (f.size <= 0 || f.size > MAX_PHOTO_BYTES) throw new Error('Photo size exceeds bounds.');
    return { size: f.size, ...jpegDimensions(f.bytesSync()), checksum: f.md5 ?? '' };
  };
  return {
    stage(sourceUri, key) {
      const cachePrefix = Paths.cache.uri.endsWith('/') ? Paths.cache.uri : Paths.cache.uri + '/';
      if (!sourceUri.startsWith(cachePrefix) || /[\\%?#]/.test(sourceUri.slice(cachePrefix.length)) || sourceUri.slice(cachePrefix.length).split('/').includes('..')) throw new Error('Photo must come from private camera cache.');
      const source = new File(sourceUri);
      const info = inspect(source);
      if (!info || Paths.availableDiskSpace < info.size * 2 + 1024 * 1024) throw new Error('Not enough device storage.');
      assertNewThumbnail(info);
      root.create({ intermediates: true, idempotent: true });
      const staged = file(`${key}.part`);
      source.copySync(staged, { overwrite: false });
      if (staged.md5 !== info.checksum) throw new Error('Photo copy did not verify.');
      staged.moveSync(file(key), { overwrite: false });
      return info;
    },
    inspect: key => inspect(file(key)),
    uri: key => file(key).uri,
    remove(key) { const target = file(key); if (target.exists) target.delete(); },
    list() { return root.exists ? root.list().filter((entry): entry is File => entry instanceof File && /^[0-9a-f-]{36}\.jpg(?:\.part)?$/i.test(entry.name)).map(entry => ({ key: entry.name, modifiedAt: entry.lastModified ?? Date.now() })) : []; },
  };
}

/** Called only for the URI returned by our single capture, never by cache enumeration. */
export function discardCameraCapture(uri: string): void {
  const prefix = Paths.cache.uri.replace(/\/$/, '') + '/Camera/';
  if (!uri.startsWith(prefix) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i.test(uri.slice(prefix.length))) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Optional cache cleanup cannot invalidate a durable product. */ }
}
