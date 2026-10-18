import { parseSyncOperationEnvelope } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { listPurchasePriceHistoryByStore, listPurchasePriceHistoryByStoreProduct } from '../src/db/repositories';
import { createDatabasePersonalPriceClient } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { materializeSyncOperation } from '../src/sync/materialize';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { deterministicIds, openCatalogueFixture } from './catalogueSupport';
import { businessSnapshot } from './m11MaxSupport';

it('orders both full-history contracts and their consumer by exact occurred/purchase-created/ID instants without rewriting facts or exposing another store', () => {
  const origin = openCatalogueFixture(), receiver = openCatalogueFixture();
  try {
    const actor = { storeId: origin.context.store.id, deviceId: origin.context.device.id, userId: origin.context.owner.id };
    const product = createTemporaryProduct(origin.adapter, { ...actor, name: 'Precise history' }, { generateId: deterministicIds(1000) });
    receiver.adapter.transaction(() => materializeSyncOperation(receiver.adapter, parseSyncOperationEnvelope(JSON.parse(product.outbox.payload))));
    const input = [
      ['2026-10-03T11:00:00+01:00', '2026-10-03T10:00:00.000Z'],
      ['2026-10-03T10:30:00.000Z', '2026-10-03T10:00:00.000Z'],
      ['2026-10-03T10:30:00.000002Z', '2026-10-03T10:00:00.000Z'],
      ['2026-10-03T10:30:00.000001Z', '2026-10-03T10:00:00.000Z'],
      ['2026-10-03T11:30:00.000002000+01:00', '2026-10-03T10:00:00.000001Z'],
      ['2026-10-03T10:30:00.000002Z', '2026-10-03T11:00:00.000002+01:00'],
      ['2026-10-03T10:30:00.000002Z', '2026-10-03T10:00:00.000002000Z'],
      ['2026-10-03T10:30:00.000000000000000000001Z', '2026-10-03T10:00:00.000Z'],
    ];
    const purchases = input.map(([occurredAt, createdAt], i) => {
      const purchase = recordPurchase(origin.adapter, { ...actor, occurredAt, lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor: 100 + i }] }, { generateId: deterministicIds(2000 + i * 100) });
      const raw = JSON.parse(purchase.outbox.payload) as { entities: { purchase: { createdAt: string }; observations: { createdAt: string }[] } };
      raw.entities.purchase.createdAt = createdAt;
      // Deliberately distinct observation-created timestamps: the historical contract orders purchase creation.
      raw.entities.observations.forEach(row => { row.createdAt = '2026-10-03T09:00:00.000Z'; });
      receiver.adapter.transaction(() => materializeSyncOperation(receiver.adapter, parseSyncOperationEnvelope(raw)));
      return purchase;
    });
    const foreign = provisionStoreContext(receiver.adapter, { ownerDisplayName: 'Other', storeName: 'Other store', currencyCode: 'NGN', countryCode: 'NG', timezone: 'Africa/Lagos', deviceLabel: 'Other', appVersion: '0.0.1' }, { generateId: deterministicIds(6000) });
    const other = createTemporaryProduct(receiver.adapter, { storeId: foreign.store.id, deviceId: foreign.device.id, name: 'Private other' }, { generateId: deterministicIds(7000) });
    recordPurchase(receiver.adapter, { storeId: foreign.store.id, deviceId: foreign.device.id, userId: foreign.owner.id, occurredAt: '2026-10-03T23:00:00.000Z', lines: [{ storeProductId: other.storeProduct.id, packageUnitId: other.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor: 900 }] }, { generateId: deterministicIds(8000) });
    const before = businessSnapshot(receiver.adapter), writes = receiver.adapter.getFirstRow('SELECT total_changes() total;');
    const expected = [6, 5, 4, 2, 3, 7, 1, 0].map(i => purchases[i].observations[0].id);
    const rows = listPurchasePriceHistoryByStoreProduct(receiver.adapter, actor.storeId, product.storeProduct.id);
    expect(rows.map(row => row.id)).toEqual(expected);
    expect(listPurchasePriceHistoryByStore(receiver.adapter, actor.storeId).map(row => row.id)).toEqual(expected);
    expect(createDatabasePersonalPriceClient(receiver.adapter, actor).getProductPurchasePriceHistory(product.storeProduct.id)?.map(row => row.id)).toEqual(expected);
    expect(listPurchasePriceHistoryByStoreProduct(receiver.adapter, actor.storeId, other.storeProduct.id)).toEqual([]);
    expect(rows.find(row => row.id === purchases[0].observations[0].id)).toMatchObject({ occurredAt: input[0][0], enteredCostMinor: 100 });
    expect(businessSnapshot(receiver.adapter)).toEqual(before); expect(receiver.adapter.getFirstRow('SELECT total_changes() total;')).toEqual(writes);
  } finally { origin.closeAndDelete(); receiver.closeAndDelete(); }
});
