import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { getActiveBasePackageUnit, ensureSyncStoreState } from '../src/db/repositories';
import { createDatabasePersonalPriceClient } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { applySyncPullPage } from '../src/sync/applier';
import { materializeSyncOperation } from '../src/sync/materialize';
import { countRows, deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

const NOW = '2026-09-28T08:00:00.000Z';

describe('M9 over M7 purchase synchronization', () => {
  it('shows pulled observations alongside pending local history without duplicating replayed facts', () => {
    const origin = openCatalogueFixture();
    const receiver = openCatalogueFixture();
    try {
      const originProduct = createTemporaryProduct(origin.adapter, {
        storeId: origin.context.store.id,
        deviceId: origin.context.device.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      const receivingProduct = createTemporaryProduct(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        name: 'Rice',
      }, { generateId: deterministicIds(1000) });
      expect(receivingProduct.storeProduct.id).toBe(originProduct.storeProduct.id);
      const packageUnit = getActiveBasePackageUnit(origin.adapter, originProduct.variant.id)!;
      ensureSyncStoreState(receiver.adapter, {
        storeId: receiver.context.store.id,
        deviceId: receiver.context.device.id,
        now: NOW,
      });
      const client = createDatabasePersonalPriceClient(receiver.adapter, {
        storeId: receiver.context.store.id,
        userId: receiver.context.owner.id,
      });

      function purchase(adapter: typeof origin.adapter, cost: number, date: string, idStart: number, operationId: string) {
        return recordPurchase(adapter, {
          storeId: origin.context.store.id,
          deviceId: origin.context.device.id,
          userId: origin.context.owner.id,
          occurredAt: date,
          lines: [{
            storeProductId: originProduct.storeProduct.id,
            packageUnitId: packageUnit.id,
            quantityPackagesMicros: MICROS_PER_UNIT,
            enteredCostMinor: cost,
          }],
        }, { generateId: deterministicIds(idStart), operationId });
      }

      function pull(graph: ReturnType<typeof purchase>, revision: number) {
        const envelope = JSON.parse(graph.outbox.payload);
        const result = applySyncPullPage(receiver.adapter, {
          protocolVersion: 1,
          payloadVersion: 1,
          changes: [{
            operationId: graph.outbox.operationId,
            storeId: graph.outbox.storeId,
            entityType: graph.outbox.entityType,
            entityId: graph.outbox.entityId,
            operationType: graph.outbox.operationType,
            changeType: 'UPSERT',
            payloadVersion: 1,
            payload: envelope,
            entityVersion: 1,
            serverRevision: revision,
            occurredAt: NOW,
          }],
          nextCursor: { revision, changeIndex: 0 },
          hasMore: false,
          serverRevision: revision,
        }, {
          storeId: receiver.context.store.id,
          options: { now: NOW, conflictIdFactory: () => testId(9000 + revision) },
        });
        expect(result.applied).toBe(1);
        return envelope;
      }

      const first = purchase(origin.adapter, 100, '2026-01-01T10:00:00.000Z', 1100, testId(1900));
      const firstEnvelope = pull(first, 1);
      expect(client.getProductPriceComparison(receivingProduct.storeProduct.id)?.historyCount).toBe(1);

      const second = purchase(origin.adapter, 150, '2026-01-02T10:00:00.000Z', 1200, testId(1901));
      const secondEnvelope = pull(second, 2);
      expect(client.getProductPriceComparison(receivingProduct.storeProduct.id)?.comparison).toMatchObject({
        kind: 'comparison', direction: 'INCREASE', percentageTenths: '500',
      });

      const pending = purchase(receiver.adapter, 175, '2026-01-03T10:00:00.000Z', 1300, testId(1902));
      expect(pending.outbox.status).toBe('PENDING');
      expect(client.getProductPriceComparison(receivingProduct.storeProduct.id)?.comparison).toMatchObject({
        kind: 'comparison', direction: 'INCREASE', percentageTenths: '167',
      });
      expect(client.getProductPurchasePriceHistory(receivingProduct.storeProduct.id)).toHaveLength(3);
      expect(client.listPriceChanges()).toHaveLength(1);

      // Re-delivery of an immutable envelope leaves the same observations in place.
      materializeSyncOperation(receiver.adapter, firstEnvelope);
      materializeSyncOperation(receiver.adapter, secondEnvelope);
      expect(countRows(receiver.adapter, 'price_observations')).toBe(3);
      expect(client.listPriceChanges()).toHaveLength(1);
    } finally {
      origin.closeAndDelete();
      receiver.closeAndDelete();
    }
  });
});
