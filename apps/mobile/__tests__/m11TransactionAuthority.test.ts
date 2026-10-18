import type { DatabaseAdapter, SyncWork } from '../src/db/adapter';
import { completeSale } from '../src/sales/completeSale';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createPackage, updatePackage, deactivatePackage } from '../src/catalogue/managePackages';
import { updateProductIdentity, addProductIdentifier } from '../src/catalogue/updateProductIdentity';
import { markProductEnriched, setProductActive } from '../src/catalogue/manageLifecycle';
import { FailOnWriteAdapter, openCatalogueFixture, deterministicIds } from './catalogueSupport';

class AuthorityChangesBeforeBegin extends FailOnWriteAdapter {
  constructor(private readonly db: DatabaseAdapter, private readonly userId: string) { super(db, Number.MAX_SAFE_INTEGER, new Error('Unexpected injected write failure')); }
  transaction<T>(work: () => SyncWork<T>): T {
    this.db.run("UPDATE users SET status='SUSPENDED' WHERE id=?;", [this.userId]);
    return this.db.transaction(work);
  }
}

it.each(['sale', 'purchase', 'catalogue', 'createPackage', 'updatePackage', 'deactivatePackage', 'identity', 'identifier', 'enrich', 'deactivateProduct', 'reactivateProduct'] as const)('denies %s when current authority changes between entry validation and the durable transaction', command => {
  const f = openCatalogueFixture();
  try {
    const actor = { storeId: f.context.store.id, deviceId: f.context.device.id, userId: f.context.owner.id };
    const product = createTemporaryProduct(f.adapter, { ...actor, name: 'Existing stock' }, { generateId: deterministicIds(200) });
    const existingPackage = createPackage(f.adapter, { ...actor, storeProductId: product.storeProduct.id, name: 'Pack', conversionText: '6' }, { generateId: deterministicIds(500) });
    if (command === 'reactivateProduct') setProductActive(f.adapter, { ...actor, storeProductId: product.storeProduct.id }, false, { generateId: deterministicIds(600) });
    const line = { storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000 };
    const tables = ['store_products', 'product_variants', 'product_identifiers', 'package_units', 'store_package_settings', 'sales', 'purchases', 'inventory_events', 'outbox_operations'];
    const snapshot = () => tables.map(table => f.adapter.getAllRows(`SELECT * FROM ${table};`).map(row => JSON.stringify(row)).sort());
    const before = snapshot();
    const changed = new AuthorityChangesBeforeBegin(f.adapter, actor.userId);
    const options = { generateId: deterministicIds(300) };
    const target = { ...actor, storeProductId: product.storeProduct.id };
    const run = () => {
      switch (command) {
        case 'sale': return completeSale(changed, { ...actor, lines: [{ ...line, unitPriceMinor: 100 }], payment: { method: 'CASH' } }, options);
        case 'purchase': return recordPurchase(changed, { ...actor, lines: [{ ...line, enteredCostMinor: 100 }] }, options);
        case 'catalogue': return createTemporaryProduct(changed, { ...actor, name: 'New stock' }, options);
        case 'createPackage': return createPackage(changed, { ...target, name: 'Carton', conversionText: '12' }, options);
        case 'updatePackage': return updatePackage(changed, { ...actor, packageUnitId: existingPackage.packageUnit.id, name: 'Renamed pack' }, options);
        case 'deactivatePackage': return deactivatePackage(changed, { ...actor, packageUnitId: existingPackage.packageUnit.id }, options);
        case 'identity': return updateProductIdentity(changed, { ...target, name: 'Renamed stock' }, options);
        case 'identifier': return addProductIdentifier(changed, { ...target, type: 'QR', value: 'synthetic-transaction-probe' }, options);
        case 'enrich': return markProductEnriched(changed, target, options);
        case 'deactivateProduct': return setProductActive(changed, target, false, options);
        case 'reactivateProduct': return setProductActive(changed, target, true, options);
      }
    };
    expect(run).toThrow(/active account/);
    expect(snapshot()).toEqual(before);
    expect(f.adapter.getFirstRow('SELECT status FROM users WHERE id=?;', [actor.userId])).toEqual({ status: 'SUSPENDED' });
  } finally { f.closeAndDelete(); }
});
