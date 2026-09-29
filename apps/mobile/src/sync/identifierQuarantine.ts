import { barcodeIdentityKey, parseSyncOperationEnvelope, type SyncOperationEnvelope } from '@retail/contracts';
import type { DatabaseAdapter } from '../db/adapter';
import { generateMobileId } from '../crypto/mobileIds';
import { createSyncConflict } from '../db/repositories/sync';

function keys(type: string, value: string): string[] {
  const result = [`legacy:${value.trim().replace(/[\s-]+/g, '').toUpperCase()}`];
  const gtin = type === 'UPC' ? barcodeIdentityKey('upc_a', value) : type === 'EAN' ? barcodeIdentityKey(value.length === 8 ? 'ean8' : 'ean13', value) : null;
  if (gtin) result.push(gtin);
  return result;
}

/** Quarantine only an unacknowledged local projection; retain its original facts. */
export function quarantineLocalIdentifier(adapter: DatabaseAdapter, local: SyncOperationEnvelope, winner: SyncOperationEnvelope): void {
  const identifier = local.entities.identifier as { id?: string } | undefined;
  const winningIdentifier = winner.entities.identifier as { id?: string } | undefined;
  if (!identifier?.id || !winningIdentifier?.id || local.storeId !== winner.storeId) throw new Error('Invalid identifier conflict evidence.');
  adapter.run(`INSERT OR IGNORE INTO scanner_identifier_quarantine
    (identifier_id,store_id,operation_id,winner_identifier_id,original_payload) VALUES (?,?,?,?,?);`,
  [identifier.id, local.storeId, local.operationId, winningIdentifier.id, JSON.stringify(local)]);
  adapter.run("UPDATE product_identifiers SET status = 'INACTIVE' WHERE id = ?", [identifier.id]);
  adapter.run("UPDATE outbox_operations SET status = 'CONFLICT', lease_id = NULL, lease_expires_at = NULL, last_error_code = 'IDENTIFIER_COLLISION' WHERE operation_id = ? AND status <> 'SYNCED'", [local.operationId]);
  createSyncConflict(adapter, { id: generateMobileId(), storeId: local.storeId, operationId: local.operationId,
    entityType: local.entityType, entityId: local.entityId, conflictType: 'SERVER_REJECTED',
    localPayload: JSON.stringify(local), serverPayload: JSON.stringify(winner) });
}

/** Called inside pull's transaction, before inserting a server-accepted identifier. */
export function prepareIncomingIdentifier(adapter: DatabaseAdapter, incoming: SyncOperationEnvelope): void {
  const identifier = incoming.entities.identifier as { id?: string; type?: string; value?: string; status?: string } | undefined;
  if (!identifier?.id || !identifier.type || !identifier.value || identifier.status !== 'ACTIVE' || !['EAN','UPC','QR'].includes(identifier.type)) return;
  const incomingKeys = keys(identifier.type, identifier.value);
  const localRows = adapter.getAllRows<{ id: string; type: string; value: string }>(`
    SELECT DISTINCT i.id, i.type, i.value FROM product_identifiers i JOIN store_products sp ON sp.product_variant_id = i.product_variant_id
    WHERE sp.store_id = ? AND i.status = 'ACTIVE' AND i.id <> ? AND i.type IN ('EAN','UPC','QR');`, [incoming.storeId, identifier.id]);
  for (const row of localRows) {
    if (!keys(row.type,row.value).some(key => incomingKeys.includes(key))) continue;
    const operation = adapter.getFirstRow<{ payload: string; status: string }>(
      "SELECT payload,status FROM outbox_operations WHERE store_id = ? AND json_extract(payload,'$.entities.identifier.id') = ? LIMIT 1", [incoming.storeId,row.id]);
    if (!operation || operation.status === 'SYNCED') throw new Error('Historical identifier collision needs support; no mapping was reassigned.');
    quarantineLocalIdentifier(adapter, parseSyncOperationEnvelope(JSON.parse(operation.payload)), incoming);
  }
}
