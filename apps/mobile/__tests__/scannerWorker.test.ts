import { parseSyncOperationEnvelope, parseSyncPushResponse, type SyncOperationEnvelope, type SyncReferenceContext } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { addProductIdentifier } from '../src/catalogue/updateProductIdentity';
import { OfflineSyncWorker } from '../src/sync/worker';
import type { SyncTransport } from '../src/sync/transport';
import { recoverIdentifierConflict } from '../src/sync/pilot';
import { findOutboxOperation, listOpenSyncConflicts } from '../src/db/repositories';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createRecognitionService } from '../src/features/scanning/resolver';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

// Deterministic protocol fixtures for ordinary CI. The separate opt-in
// scannerWorker.postgres suite exercises the same boundary against real RPCs.
for (const nested of [true, false]) {
  it(`worker preserves and recovers a ${nested ? 'new product' : 'later association'} collision from full protocol envelopes`, async () => {
    const a = openCatalogueFixture();
    const b = openCatalogueFixture();
    try {
      const { store, owner, membership, device } = a.context;
      const deviceB = testId(900);
      b.adapter.run('UPDATE devices SET id = ? WHERE id = ?', [deviceB, device.id]);
      const winner = createTemporaryProduct(a.adapter, { storeId: store.id, deviceId: device.id, name: 'Winner', barcode: 'B', barcodeType: 'QR' }, { generateId: deterministicIds(1000) });
      const loser = createTemporaryProduct(b.adapter, { storeId: store.id, deviceId: deviceB, name: 'Original offline item',
        ...(nested ? { barcode: 'B', barcodeType: 'QR' as const } : {}) }, { generateId: deterministicIds(2000) });
      const rejected = nested ? loser.outbox : addProductIdentifier(b.adapter, { storeId: store.id, deviceId: deviceB,
        storeProductId: loser.storeProduct.id, type: 'QR', value: 'B' }, { generateId: deterministicIds(3000) }).outbox!;
      const sale = createDatabaseSalesClient(b.adapter, { deviceId: deviceB, generateId: deterministicIds(4000) }).completeSale({
        lines: [{ storeProductId: loser.storeProduct.id, packageUnitId: loser.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 12500 }], payment: { method: 'CASH' },
      });
      const winningEnvelope = parseSyncOperationEnvelope(JSON.parse(winner.outbox.payload));
      const accepted: SyncOperationEnvelope[] = [winningEnvelope];
      const referenceContext = (): SyncReferenceContext => ({ protocolVersion: 1, payloadVersion: 1, serverRevision: accepted.length,
        store: { ...store, status: 'ACTIVE', createdByUserId: owner.id },
        users: [{ id: owner.id, displayName: owner.displayName, status: 'ACTIVE', createdAt: owner.createdAt, updatedAt: owner.updatedAt }],
        members: [{ ...membership, status: 'ACTIVE' }],
        devices: [device.id, deviceB].map(id => ({ id, storeId: store.id, userId: owner.id, platform: device.platform,
          appVersion: device.appVersion, deviceLabel: null, status: 'ACTIVE', createdAt: device.createdAt })),
      });
      const transport: SyncTransport = {
        push: async request => parseSyncPushResponse({ protocolVersion: 1, payloadVersion: 1,
          acks: request.operations.map(operation => {
            const identity = { operationId: operation.operationId, entityType: operation.entityType, entityId: operation.entityId };
            if (operation.operationId === rejected.operationId) return { ...identity, status: 'CONFLICT', serverVersion: null, serverRevision: accepted.length,
              error: { code: 'CONFLICT', message: 'This barcode is already claimed by another product or package.', retryable: false,
                details: { reason: 'IDENTIFIER_COLLISION', serverPayload: winningEnvelope } } };
            if (operation.operationType === 'COMPLETED_SALE_CREATED' && !accepted.some(item => item.entityId === loser.storeProduct.id)) {
              return { ...identity, status: 'REJECTED_RETRYABLE', serverVersion: null, serverRevision: accepted.length,
                error: { code: 'RETRYABLE', message: 'A product must finish syncing before this sale.', retryable: true, details: { reason: 'PRODUCT_DEPENDENCY' } } };
            }
            const old = accepted.findIndex(item => item.operationId === operation.operationId);
            if (old < 0) accepted.push(operation);
            return { ...identity, status: old < 0 ? 'APPLIED' : 'ALREADY_APPLIED', serverVersion: 1, serverRevision: old < 0 ? accepted.length : old + 1, error: null };
          }) }),
        pull: async request => ({ protocolVersion: 1, payloadVersion: 1, serverRevision: accepted.length, hasMore: false,
          nextCursor: { revision: accepted.length, changeIndex: 0 },
          changes: accepted.map((operation, index) => ({ operationId: operation.operationId, storeId: store.id, entityType: operation.entityType,
            entityId: operation.entityId, operationType: operation.operationType, changeType: 'UPSERT' as const, payloadVersion: 1 as const,
            payload: operation, entityVersion: 1, serverRevision: index + 1, occurredAt: operation.occurredAt })).filter(change => change.serverRevision > (request.cursor?.revision ?? 0)),
        }),
        referenceContext: async () => referenceContext(),
        bootstrap: async () => { throw new Error('not used'); }, enroll: async () => { throw new Error('not used'); },
      };
      let now = Date.now() + 60000;
      const worker = new OfflineSyncWorker({ adapter: b.adapter, storeId: store.id, deviceId: deviceB, transport,
        sessionProvider: { getSession: async () => ({ accessToken: 'fixture' }) }, now: () => new Date(now).toISOString(), idFactory: deterministicIds(6000), random: () => 0 });
      expect(await worker.runOnce()).toMatchObject({ conflicts: 1, permanentErrors: 0, retryableErrors: nested ? 1 : 0 });
      const conflicts = listOpenSyncConflicts(b.adapter, store.id);
      expect(conflicts).toHaveLength(1);
      expect(JSON.parse(conflicts[0]!.serverPayload!)).toEqual(winningEnvelope);
      expect(findOutboxOperation(b.adapter, rejected.operationId)).toMatchObject({ status: 'CONFLICT', payload: rejected.payload });
      expect(findOutboxOperation(b.adapter, sale.outbox.operationId)).toMatchObject({ status: nested ? 'ERROR_RETRYABLE' : 'SYNCED', payload: sale.outbox.payload });
      recoverIdentifierConflict(b.adapter, conflicts[0]!.id, deterministicIds(7000));
      for (let attempt = 0; attempt < 3; attempt++) { now += 60000; expect((await worker.runOnce()).permanentErrors).toBe(0); }
      expect(listOpenSyncConflicts(b.adapter, store.id)).toHaveLength(0);
      expect(findOutboxOperation(b.adapter, sale.outbox.operationId)?.status).toBe('SYNCED');
      const other = new OfflineSyncWorker({ adapter: a.adapter, storeId: store.id, deviceId: device.id, transport,
        sessionProvider: { getSession: async () => ({ accessToken: 'fixture' }) }, now: () => new Date(now).toISOString(), idFactory: deterministicIds(8000) });
      expect((await other.runOnce()).permanentErrors).toBe(0);
      for (const client of [a, b]) {
        expect(client.adapter.getFirstRow<{ count: number }>('SELECT count(*) AS count FROM sales WHERE id = ?', [sale.sale.id])?.count).toBe(1);
        expect(client.adapter.getFirstRow<{ product_name_snapshot: string }>('SELECT product_name_snapshot FROM sale_items WHERE sale_id = ?', [sale.sale.id])?.product_name_snapshot).toBe('Original offline item');
        expect(await createRecognitionService(client.adapter, store.id).recognize({ sessionId: 's', requestId: 'r', symbology: 'qr', value: 'B' })).toMatchObject({ status: 'STRONG', candidate: { storeProductId: winner.storeProduct.id } });
      }
      const restarted = reopenDatabase(b.path);
      try {
        expect(findOutboxOperation(restarted, rejected.operationId)).toMatchObject({ status: 'CONFLICT', payload: rejected.payload });
        expect(findOutboxOperation(restarted, sale.outbox.operationId)?.status).toBe('SYNCED');
        expect(listOpenSyncConflicts(restarted, store.id)).toHaveLength(0);
      } finally { restarted.close(); }
    } finally { a.closeAndDelete(); b.closeAndDelete(); }
  });
}
