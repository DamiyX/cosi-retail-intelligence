import type { DatabaseAdapter, SyncWork } from '../src/db/adapter';
import { createCatalogueClient, resolveCurrentStore } from '../src/catalogue/client';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import { createDatabaseFinanceClient } from '../src/finance/client';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { recordExpense } from '../src/finance/recordExpense';
import { recordOwnerWithdrawal } from '../src/finance/recordOwnerWithdrawal';
import { createDevice, ensureSyncStoreState } from '../src/db/repositories';
import { FailOnWriteAdapter, openCatalogueFixture, deterministicIds, testId } from './catalogueSupport';

class BeforeBegin extends FailOnWriteAdapter {
  change = () => {};
  constructor(private readonly db: DatabaseAdapter) { super(db, Number.MAX_SAFE_INTEGER, new Error('Unexpected write failure')); }
  transaction<T>(work: () => SyncWork<T>): T { this.change(); return this.db.transaction(work); }
}

function businessSnapshot(db: DatabaseAdapter) {
  return db.getAllRows<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    .filter(row => !['users', 'stores', 'store_members', 'devices', 'sync_store_state'].includes(row.name))
    .map(row => ({ table: row.name, rows: db.getAllRows(`SELECT * FROM ${row.name};`).map(value => JSON.stringify(value)).sort() }));
}

function stocked(explicit = false) {
  const f = openCatalogueFixture();
  const db = new BeforeBegin(f.adapter);
  ensureSyncStoreState(f.adapter, { storeId: f.context.store.id, deviceId: f.context.device.id });
  const other = createDevice(f.adapter, { id: testId(900), storeId: f.context.store.id, userId: f.context.owner.id, platform: 'ANDROID', appVersion: 'synthetic' });
  const identity = explicit ? { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id } : {};
  const context = explicit ? f.context : resolveCurrentStore(db)!;
  const catalogue = createCatalogueClient(db, context.store, context.device, deterministicIds(1000));
  const purchases = createDatabasePurchasesClient(db, { ...identity, generateId: deterministicIds(2000) });
  const sales = createDatabaseSalesClient(db, { ...identity, generateId: deterministicIds(3000) });
  const finance = createDatabaseFinanceClient(db, { ...identity, generateId: deterministicIds(4000) });
  const inventory = createDatabaseInventoryClient(db, { ...identity, generateId: deterministicIds(5000) });
  const products = [catalogue.createTemporaryProduct({ name: 'Stock A' }), catalogue.createTemporaryProduct({ name: 'Stock B' })];
  for (const product of products) purchases.recordPurchase({ lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 2000000, enteredCostMinor: 200 }] });
  inventory.saveGuidedCheckSettings({ dailyTarget: 1, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
  return { f, db, other, products, catalogue, purchases, sales, finance, inventory };
}
type Fixture = ReturnType<typeof stocked>;
const at = '2026-10-03T10:00:00.000Z';
const commands = ['sale', 'purchase', 'saleQuickAdd', 'purchaseQuickAdd', 'catalogueCreate', 'identity', 'package', 'lifecycle', 'reorder', 'expense', 'withdrawal', 'adjust', 'classify', 'start', 'submit', 'cancel', 'finalize', 'guidedSettings', 'generate', 'replace', 'attentionSettings', 'snooze'] as const;
type Command = typeof commands[number];

function prepare(s: Fixture, command: Command): () => unknown {
  const p = s.products[0];
  const line = { storeProductId: p.storeProduct.id, packageUnitId: p.basePackage.id, quantityPackagesMicros: 1000000 };
  const draft = ['submit', 'cancel', 'finalize'].includes(command) ? s.inventory.startReconciliation(p.storeProduct.id) : null;
  if (command === 'finalize') s.inventory.submitReconciliation({ reconciliationId: draft!.reconciliationId, physicalBaseUnits: '2000000', expectedInventoryWatermark: draft!.inventoryWatermark, expectedBatchWatermark: draft!.batchWatermark });
  const assignment = command === 'replace' ? s.inventory.generateGuidedChecks({ now: at }).assignments[0] : null;
  if (command === 'replace') expect(assignment).toBeDefined();
  const projection = s.inventory.getBatchProjection(p.storeProduct.id);
  if (command === 'snooze') s.catalogue.updateReorderLevel({ storeProductId: p.storeProduct.id, reorderLevelBaseMicros: 10000000, expectedVersion: p.storeProduct.version });
  const attention = command === 'snooze' ? s.inventory.getAttentionOverview(at).items.find(item => item.storeProductId === p.storeProduct.id && item.kind === 'LOW_STOCK') : null;
  if (command === 'snooze') expect(attention).toBeDefined();
  return () => {
    switch (command) {
      case 'sale': return s.sales.completeSale({ lines: [{ ...line, unitPriceMinor: 100 }], payment: { method: 'CASH' } });
      case 'purchase': return s.purchases.recordPurchase({ lines: [{ ...line, enteredCostMinor: 100 }] });
      case 'saleQuickAdd': return s.sales.createTemporaryProduct({ name: 'Sale quick add' });
      case 'purchaseQuickAdd': return s.purchases.createTemporaryProduct({ name: 'Purchase quick add' });
      case 'catalogueCreate': return s.catalogue.createTemporaryProduct({ name: 'Catalogue add' });
      case 'identity': return s.catalogue.updateProductIdentity({ storeProductId: p.storeProduct.id, name: 'Updated name' });
      case 'package': return s.catalogue.createPackage({ storeProductId: p.storeProduct.id, name: 'Pack', conversionText: '6' });
      case 'lifecycle': return s.catalogue.setProductActive({ storeProductId: p.storeProduct.id }, false);
      case 'reorder': return s.catalogue.updateReorderLevel({ storeProductId: p.storeProduct.id, reorderLevelBaseMicros: 10000000, expectedVersion: p.storeProduct.version });
      case 'expense': return s.finance.recordExpense({ category: 'TRANSPORT', amountMinor: 100 });
      case 'withdrawal': return s.finance.recordOwnerWithdrawal({ amountMinor: 100 });
      case 'adjust': return s.inventory.recordAdjustment({ storeProductId: p.storeProduct.id, reasonCode: 'CORRECTION', quantityBaseDeltaMicros: 1000000, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark });
      case 'classify': return s.inventory.classifyBatches({ storeProductId: p.storeProduct.id, expectedInventoryWatermark: projection.inventoryWatermark, expectedBatchWatermark: projection.batchWatermark, mode: 'CORRECTION', groups: [{ quantityBaseMicros: 2000000, datePrecision: 'UNKNOWN' }] });
      case 'start': return s.inventory.startReconciliation(p.storeProduct.id);
      case 'submit': return s.inventory.submitReconciliation({ reconciliationId: draft!.reconciliationId, physicalBaseUnits: '2000000', expectedInventoryWatermark: draft!.inventoryWatermark, expectedBatchWatermark: draft!.batchWatermark });
      case 'cancel': return s.inventory.cancelReconciliation(draft!.reconciliationId);
      case 'finalize': return s.inventory.finalizeReconciliation({ reconciliationId: draft!.reconciliationId });
      case 'guidedSettings': return s.inventory.saveGuidedCheckSettings({ dailyTarget: 2, paused: false, windowStartMinute: 0, windowEndMinute: 1439 });
      case 'generate': return s.inventory.generateGuidedChecks({ now: at });
      case 'replace': return s.inventory.replaceGuidedCheck({ assignmentId: assignment!.id, reasonCode: 'CANNOT_ACCESS', now: at });
      case 'attentionSettings': return s.inventory.saveAttentionSettings({ expiryLeadDays: 30 });
      case 'snooze': return s.inventory.snoozeAttention({ conditionKey: attention!.conditionKey, conditionType: attention!.conditionType, storeProductId: p.storeProduct.id, groupId: attention!.groupId, severityRank: attention!.severityRank, snoozeKind: 'LATER_TODAY', now: at });
    }
  };
}

it.each(commands)('retains implicit enrollment through %s transaction entry with no denied business writes', command => {
  const s = stocked();
  try {
    const run = prepare(s, command), before = businessSnapshot(s.f.adapter);
    s.db.change = () => { s.f.adapter.run('UPDATE sync_store_state SET device_id=? WHERE store_id=?;', [s.other.id, s.f.context.store.id]); };
    expect(run).toThrow(/enrollment/);
    expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});

it.each(['sale', 'purchase', 'catalogueCreate', 'expense', 'guidedSettings', 'start'] as const)('preserves explicit-device policy for %s when another device becomes enrolled', command => {
  const s = stocked(true);
  try {
    const run = prepare(s, command);
    s.db.change = () => { s.f.adapter.run('UPDATE sync_store_state SET device_id=? WHERE store_id=?;', [s.other.id, s.f.context.store.id]); };
    expect(run()).toBeDefined();
  } finally { s.f.closeAndDelete(); }
});

describe.each(['store', 'member', 'device', 'role'] as const)('transaction-entry %s authority loss', change => {
  it.each(['start', 'submit', 'cancel'] as const)('denies %s without any business/outbox mutation', command => {
    const s = stocked();
    try {
      const run = prepare(s, command), before = businessSnapshot(s.f.adapter);
      s.db.change = () => {
        if (change === 'store') s.f.adapter.run("UPDATE stores SET status='INACTIVE' WHERE id=?;", [s.f.context.store.id]);
        if (change === 'member') s.f.adapter.run("UPDATE store_members SET status='INACTIVE' WHERE id=?;", [s.f.context.membership.id]);
        if (change === 'device') s.f.adapter.run("UPDATE devices SET status='REVOKED' WHERE id=?;", [s.f.context.device.id]);
        if (change === 'role') s.f.adapter.run("UPDATE store_members SET role='STAFF' WHERE id=?;", [s.f.context.membership.id]);
      };
      expect(run).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
    } finally { s.f.closeAndDelete(); }
  });
});

it.each(commands)('has a stocked eligible positive control for %s', command => {
  const s = stocked();
  try { const run = prepare(s, command), before = businessSnapshot(s.f.adapter); expect(run()).toBeDefined(); expect(businessSnapshot(s.f.adapter)).not.toEqual(before); }
  finally { s.f.closeAndDelete(); }
});

it.each(['start', 'submit', 'cancel', 'replace'] as const)('denies %s after suspension just before BEGIN and preserves every business table', command => {
  const s = stocked();
  try {
    const run = prepare(s, command), before = businessSnapshot(s.f.adapter);
    s.db.change = () => { s.f.adapter.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [s.f.context.owner.id]); };
    expect(run).toThrow(); expect(businessSnapshot(s.f.adapter)).toEqual(before);
  } finally { s.f.closeAndDelete(); }
});

it.each(['expense-client', 'withdrawal-client', 'expense-direct', 'withdrawal-direct'] as const)('preserves the entry membership for %s instead of adopting its replacement', command => {
  const f = openCatalogueFixture();
  try {
    const db = new BeforeBegin(f.adapter), client = createDatabaseFinanceClient(db, { generateId: deterministicIds(1000) });
    const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
    const before = businessSnapshot(f.adapter);
    db.change = () => { f.adapter.run('UPDATE store_members SET id=? WHERE id=?;', [testId(900), f.context.membership.id]); };
    const run = () => command === 'expense-client' ? client.recordExpense({ category: 'TRANSPORT', amountMinor: 100 })
      : command === 'withdrawal-client' ? client.recordOwnerWithdrawal({ amountMinor: 100 })
        : command === 'expense-direct' ? recordExpense(db, { ...actor, category: 'TRANSPORT', amountMinor: 100, currencyCode: 'NGN' }, { generateId: deterministicIds(1000) })
          : recordOwnerWithdrawal(db, { ...actor, amountMinor: 100, currencyCode: 'NGN' }, { generateId: deterministicIds(1000) });
    expect(run).toThrow(); expect(businessSnapshot(f.adapter)).toEqual(before);
  } finally { f.closeAndDelete(); }
});
