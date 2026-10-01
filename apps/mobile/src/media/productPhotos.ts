import type { DatabaseAdapter } from '../db/adapter';
import { requireId } from '../db/repositories/common';
import { generateMobileId } from '../crypto/mobileIds';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 300 * 1024;
export const MAX_THUMBNAIL_EDGE = 1024;
export interface PhotoInfo { size: number; width: number; height: number; checksum: string }
export function assertNewThumbnail(info: PhotoInfo): void {
  if (!Number.isInteger(info.size) || info.size <= 0 || info.size > MAX_THUMBNAIL_BYTES ||
      !Number.isInteger(info.width) || !Number.isInteger(info.height) || info.width <= 0 || info.height <= 0 ||
      info.width > MAX_THUMBNAIL_EDGE || info.height > MAX_THUMBNAIL_EDGE || !info.checksum) {
    throw new Error('Photo exceeds thumbnail storage bounds (1024 pixels, 300 KiB). Retry or continue without photo.');
  }
}
export interface PhotoFiles {
  stage(sourceUri: string, key: string): PhotoInfo;
  inspect(key: string): PhotoInfo | null;
  uri(key: string): string;
  remove(key: string): void;
  list(): { key: string; modifiedAt: number }[];
}
interface AssetRow { id: string; store_id: string; store_product_id: string | null; file_key: string; byte_size: number; width: number; height: number; checksum: string; created_at: string }
export interface PhotoView { status: 'available' | 'missing' | 'none'; uri?: string }
export interface ProductPhotos {
  stage(uri: string): string;
  discard(id: string): void;
  assertReady(id: string): void;
  preview(id: string): PhotoView;
  read(productId: string): PhotoView;
  replace(productId: string, stagedId: string): void;
  recover(): void;
}
export function attachProductPhoto(db: DatabaseAdapter, storeId: string, productId: string, assetId: string): void {
  const asset = db.getFirstRow<AssetRow>('SELECT * FROM media_assets WHERE id = ? AND store_id = ?', [requireId(assetId), storeId]);
  if (!asset || (asset.store_product_id !== null && asset.store_product_id !== productId)) throw new Error('Photo unavailable for this store/product.');
  if (asset.store_product_id === null) assertNewThumbnail({ size: asset.byte_size, width: asset.width, height: asset.height, checksum: asset.checksum });
  const result = db.run('UPDATE media_assets SET store_product_id = ? WHERE id = ? AND store_id = ? AND (store_product_id IS NULL OR store_product_id = ?)', [productId, requireId(assetId), storeId, productId]);
  if (result.changes !== 1) throw new Error('Photo unavailable for this store/product.');
}
export function createProductPhotos(db: DatabaseAdapter, storeId: string, files: () => PhotoFiles = () => {
  // Native filesystem is evaluated only when a photo is used, preserving manual selling in older binaries.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./nativePhotoFiles') as typeof import('./nativePhotoFiles')).createNativePhotoFiles();
}, generateId = generateMobileId, now = () => Date.now()): ProductPhotos {
  requireId(storeId);
  const row = (id: string) => db.getFirstRow<AssetRow>('SELECT * FROM media_assets WHERE id = ? AND store_id = ?', [requireId(id), storeId]);
  const ownsProduct = (id: string) => {
    if (!db.getFirstRow('SELECT id FROM store_products WHERE id = ? AND store_id = ?', [requireId(id), storeId])) throw new Error('Product unavailable for this store.');
  };
  const available = (asset: AssetRow) => {
    const info = files().inspect(asset.file_key);
    return info && info.size === asset.byte_size && info.width === asset.width && info.height === asset.height && info.checksum === asset.checksum;
  };
  const discard = (id: string) => {
    const asset = row(id);
    if (!asset || asset.store_product_id !== null) return; // Never remove a committed attachment.
    db.run('DELETE FROM media_assets WHERE id = ? AND store_id = ? AND store_product_id IS NULL', [id, storeId]);
    // File failure leaves an unreferenced file for conservative recovery, not a dangling attachment.
    try { files().remove(asset.file_key); } catch { /* Retry on recovery. */ }
  };
  return {
    stage(sourceUri) {
      const id = requireId(generateId());
      const key = `${id}.jpg`;
      if (db.getFirstRow('SELECT id FROM media_assets WHERE id = ?', [id]) || files().inspect(key)) {
        throw new Error('Photo identity already exists. Retry with a new capture.');
      }
      try {
        const info = files().stage(sourceUri, key);
        assertNewThumbnail(info);
        db.run('INSERT INTO media_assets(id, store_id, file_key, byte_size, width, height, checksum, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, storeId, key, info.size, info.width, info.height, info.checksum, new Date(now()).toISOString()]);
        return id;
      } catch (error) {
        // A driver can report an error after a write: only remove files if no durable row exists.
        if (!db.getFirstRow('SELECT id FROM media_assets WHERE id = ?', [id])) {
          try { files().remove(key); files().remove(`${key}.part`); } catch { /* Recovery owns leftovers. */ }
        }
        throw error;
      }
    },
    discard,
    assertReady(id) {
      const asset = row(id);
      if (!asset || !available(asset)) throw new Error('Photo missing or damaged. Retry or continue without photo.');
      if (asset.store_product_id === null) assertNewThumbnail({ size: asset.byte_size, width: asset.width, height: asset.height, checksum: asset.checksum });
    },
    preview(id) {
      const asset = row(id);
      if (!asset) return { status: 'none' };
      try { return available(asset) ? { status: 'available', uri: files().uri(asset.file_key) } : { status: 'missing' }; } catch { return { status: 'missing' }; }
    },
    read(productId) {
      ownsProduct(productId);
      const asset = db.getFirstRow<AssetRow>('SELECT * FROM media_assets WHERE store_id = ? AND store_product_id = ?', [storeId, productId]);
      if (!asset) return { status: 'none' };
      try { return available(asset) ? { status: 'available', uri: files().uri(asset.file_key) } : { status: 'missing' }; } catch { return { status: 'missing' }; }
    },
    replace(productId, stagedId) {
      ownsProduct(productId);
      const staged = row(stagedId);
      if (!staged || (staged.store_product_id !== null && staged.store_product_id !== productId)) throw new Error('Photo unavailable for this store/product.');
      // A reported-after-commit retry must not depend on optional file availability.
      if (staged.store_product_id === productId) return;
      assertNewThumbnail({ size: staged.byte_size, width: staged.width, height: staged.height, checksum: staged.checksum });
      if (!available(staged)) throw new Error('Photo unavailable for this store/product.');
      db.transaction(() => {
        db.run('UPDATE media_assets SET store_product_id = NULL WHERE store_id = ? AND store_product_id = ? AND id <> ?', [storeId, productId, stagedId]);
        attachProductPhoto(db, storeId, productId, stagedId);
      }); // Old files remain recoverable until the grace period; never delete on uncertain commit.
    },
    recover() {
      const cutoff = now() - 24 * 60 * 60 * 1000;
      for (const asset of db.getAllRows<AssetRow>('SELECT * FROM media_assets WHERE store_id = ? AND store_product_id IS NULL', [storeId])) {
        if (Date.parse(asset.created_at) < cutoff) discard(asset.id);
      }
      // Global reference check: another store's committed file must never be deleted.
      for (const file of files().list()) {
        if (file.modifiedAt < cutoff && !db.getFirstRow('SELECT id FROM media_assets WHERE file_key = ?', [file.key])) files().remove(file.key);
      }
    },
  };
}
