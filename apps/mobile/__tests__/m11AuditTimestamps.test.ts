import { parseSyncOperationEnvelope } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { createStaffClient, type ActivityCursor } from '../src/staff/client';
import { createDatabasePersonalPriceClient } from '../src/priceIntelligence/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { createInventoryReconciliationSubmission } from '../src/db/repositories';
import { openCatalogueFixture, deterministicIds, testId } from './catalogueSupport';

const timestamps = ['2026-10-03T10:00:01Z', '2026-10-03T10:00:00.000002Z', '2026-10-03T11:00:00.000001+01:00', '2026-10-03T10:00:00.000001Z',
  '2026-10-03T10:00:00.0000000000002Z', '2026-10-03T10:00:00.0000000000001Z', '2026-10-03T10:00:00.000Z', '2026-10-04T09:59:00+23:59', '2026-10-03T09:59:59.99999999999Z'];
const expected = [0, 1, 3, 2, 4, 5, 7, 6, 8];

it('orders bounded activity pages and half-open filters by exact instants, preserving stored strings', () => {
  const f = openCatalogueFixture();
  try {
    const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
    const p = createTemporaryProduct(f.adapter, { ...actor, name: 'Stock' }, { generateId: deterministicIds(100) });
    const purchases = timestamps.map((occurredAt, i) => recordPurchase(f.adapter, { ...actor, occurredAt, lines: [{ storeProductId: p.storeProduct.id, packageUnitId: p.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor: 100 }] }, { generateId: deterministicIds(300 + i * 100) }));
    purchases.forEach((purchase, i) => expect(parseSyncOperationEnvelope(JSON.parse(purchase.outbox.payload)).occurredAt).toBe(timestamps[i]));
    const before = f.adapter.getAllRows('SELECT * FROM purchases ORDER BY id;'), writes = f.adapter.getFirstRow('SELECT total_changes() AS total;');
    const client = createStaffClient(f.adapter, actor), ids: string[] = [];
    let cursor: ActivityCursor | undefined;
    do { const page = client.listActivity({ kind: 'RESTOCK' }, cursor, 1); expect(page.rows).toHaveLength(1); ids.push(page.rows[0].id); cursor = page.next ?? undefined; } while (cursor && ids.length < 20);
    expect(ids).toEqual(expected.map(i => purchases[i].purchase.id));
    expect(client.listActivity({ kind: 'RESTOCK', from: '2026-10-03T10:00:00.000Z', until: '2026-10-03T10:00:00.001Z' }).rows.map(row => row.id)).toEqual(expected.slice(1, -1).map(i => purchases[i].purchase.id));
    expect(f.adapter.getAllRows('SELECT * FROM purchases ORDER BY id;')).toEqual(before);
    expect(f.adapter.getFirstRow('SELECT total_changes() AS total;')).toEqual(writes);
    expect(() => client.listActivity({}, { recordedAt: 'invalid', id: purchases[0].purchase.id, kind: 'RESTOCK' })).toThrow();
  } finally { f.closeAndDelete(); }
});

it('uses precise M9 latest/previous selection and current-app product ordering', () => {
  const f = openCatalogueFixture();
  try {
    const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
    const p = createTemporaryProduct(f.adapter, { ...actor, name: 'First' }, { generateId: deterministicIds(100) });
    const q = createTemporaryProduct(f.adapter, { ...actor, name: 'Second' }, { generateId: deterministicIds(200) });
    const purchase = (product: typeof p, occurredAt: string, enteredCostMinor: number, ids: number) => recordPurchase(f.adapter, { ...actor, occurredAt, lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor }] }, { generateId: deterministicIds(ids) });
    const latest = purchase(p, '2026-10-03T10:00:00.000002Z', 200, 300), previous = purchase(p, '2026-10-03T10:00:00.000001Z', 100, 400);
    purchase(q, '2026-10-03T11:00:00.0000015+01:00', 200, 500); purchase(q, '2026-10-03T10:00:00.000001Z', 100, 600);
    const prices = createDatabasePersonalPriceClient(f.adapter, actor);
    expect(prices.getProductPriceComparison(p.storeProduct.id)?.comparison).toMatchObject({ latestId: latest.observations[0].id, previousId: previous.observations[0].id, direction: 'INCREASE', percentageTenths: '1000' });
    expect(prices.listPriceChanges().map(row => row.storeProductId)).toEqual([p.storeProduct.id, q.storeProduct.id]);
  } finally { f.closeAndDelete(); }
});

it('accepts and stably paginates exact check-history instants and kind/ID ties', () => {
  const f = openCatalogueFixture();
  try {
    const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
    const p = createTemporaryProduct(f.adapter, { ...actor, name: 'Stock' }, { generateId: deterministicIds(100) });
    recordPurchase(f.adapter, { ...actor, lines: [{ storeProductId: p.storeProduct.id, packageUnitId: p.basePackage.id, quantityPackagesMicros: 1000000, enteredCostMinor: 100 }] }, { generateId: deterministicIds(200) });
    const inventory = createDatabaseInventoryClient(f.adapter, { ...actor, generateId: deterministicIds(1500) });
    const assignment = inventory.generateGuidedChecks({ now: '2026-10-02T10:00:00.000Z' }).assignments[0];
    expect(assignment).toBeDefined();
    const draft = inventory.startReconciliation(p.storeProduct.id, assignment.id);
    const line = f.adapter.getFirstRow<{ id: string }>('SELECT id FROM inventory_reconciliation_lines WHERE reconciliation_id=?;', [draft.reconciliationId])!;
    const saved = timestamps.map((createdAt, i) => createInventoryReconciliationSubmission(f.adapter, { id: testId(3000 + i), ...actor, reconciliationLineId: line.id, storeProductId: p.storeProduct.id, submissionType: i === 0 ? 'FIRST' : 'RECOUNT', recordedBaseUnitsSnapshot: '1000000', physicalBaseUnits: '1000000', differenceBaseUnits: '0', inventoryWatermark: draft.inventoryWatermark, batchWatermark: draft.batchWatermark, completeGroupCount: false, createdByStoreMemberId: f.context.membership.id, createdByUserId: actor.userId, createdAt }));
    const client = createStaffClient(f.adapter, actor), ids: string[] = [];
    let cursor: { recordedAt: string; kind: string; id: string } | undefined;
    do { const page = client.getCheckReview(assignment.id, cursor, 1).evidence; expect(page.rows).toHaveLength(1); ids.push(page.rows[0].id); cursor = page.next ?? undefined; } while (cursor && ids.length < 20);
    expect(ids.slice(0, 9)).toEqual(expected.map(i => saved[i].id));
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  } finally { f.closeAndDelete(); }
});
