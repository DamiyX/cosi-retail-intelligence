import { MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { createPackage, deactivatePackage } from '../src/catalogue/managePackages';
import { openDatabase, MIGRATIONS } from '../src/db';
import {
  createStoreMember,
  createUser,
  getActiveBasePackageUnit,
} from '../src/db/repositories';
import { createDatabasePersonalPriceClient, createPersonalPriceClientForActiveContext } from '../src/priceIntelligence/client';
import { recordPurchase } from '../src/purchases/recordPurchase';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
import { countRows, deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

function recordRestock(
  fixture: ReturnType<typeof openCatalogueFixture>,
  product: ReturnType<typeof createTemporaryProduct>,
  packageUnitId: string,
  costMinor: number,
  occurredAt: string,
  idStart: number,
): void {
  recordPurchase(fixture.adapter, {
    storeId: fixture.context.store.id,
    deviceId: fixture.context.device.id,
    userId: fixture.context.owner.id,
    occurredAt,
    lines: [{
      storeProductId: product.storeProduct.id,
      packageUnitId,
      quantityPackagesMicros: MICROS_PER_UNIT,
      enteredCostMinor: costMinor,
    }],
  }, { generateId: deterministicIds(idStart), operationId: testId(idStart + 1) });
}

describe('M9 personal price client', () => {
  it('reads exact store-scoped comparisons from immutable observations without creating writes', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Rice' },
        { generateId: deterministicIds(1000) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      recordRestock(fixture, product, base.id, 100, '2026-01-01T10:00:00.000Z', 1100);
      recordRestock(fixture, product, base.id, 150, '2026-01-02T10:00:00.000Z', 1200);
      const observationCount = countRows(fixture.adapter, 'price_observations');
      const outboxCount = countRows(fixture.adapter, 'outbox_operations');
      const client = createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id,
        userId: fixture.context.owner.id,
      });

      const result = client.getProductPriceComparison(product.storeProduct.id)!;
      expect(result.comparison).toMatchObject({
        kind: 'comparison', basis: 'PACKAGE', direction: 'INCREASE', percentageTenths: '500',
      });
      expect(result.latest?.packageCostNumerator).toBe('150');
      expect(result.previous?.packageCostNumerator).toBe('100');
      expect(client.listPriceChanges()).toHaveLength(1);
      expect(countRows(fixture.adapter, 'price_observations')).toBe(observationCount);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(outboxCount);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('denies STAFF and foreign owners, and direct foreign store-product IDs return no data', () => {
    const fixture = openCatalogueFixture();
    try {
      const staff = createUser(fixture.adapter, { id: testId(2000), displayName: 'Store staff' });
      createStoreMember(fixture.adapter, {
        id: testId(2001), storeId: fixture.context.store.id, userId: staff.id, role: 'STAFF',
      });
      expect(() => createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: staff.id,
      })).toThrow(/active store owner/i);

      const otherStore = provisionStoreContext(fixture.adapter, {
        ownerDisplayName: 'Other owner', storeName: 'Other store', currencyCode: 'USD',
        countryCode: 'US', timezone: 'UTC', appVersion: '0.0.1',
      }, { generateId: deterministicIds(2100) });
      const otherProduct = createTemporaryProduct(fixture.adapter, {
        storeId: otherStore.store.id, deviceId: otherStore.device.id, name: 'Other product',
      }, { generateId: deterministicIds(2200) });

      const ownerClient = createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: fixture.context.owner.id,
      });
      expect(ownerClient.getProductPriceComparison(otherProduct.storeProduct.id)).toBeNull();
      expect(() => createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: otherStore.owner.id,
      })).toThrow(/active store owner/i);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('does not fall back to the store owner when the active device identity is STAFF', () => {
    const fixture = openCatalogueFixture();
    try {
      const staff = createUser(fixture.adapter, { id: testId(2300), displayName: 'Counter staff' });
      createStoreMember(fixture.adapter, {
        id: testId(2301), storeId: fixture.context.store.id, userId: staff.id, role: 'STAFF',
      });
      fixture.adapter.run('UPDATE devices SET user_id = ? WHERE id = ?;', [staff.id, fixture.context.device.id]);
      expect(() => createPersonalPriceClientForActiveContext(fixture.adapter, fixture.context.store.id)).toThrow(/active store owner/i);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rechecks active owner membership on every read after a session is paused', () => {
    const fixture = openCatalogueFixture();
    try {
      const client = createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: fixture.context.owner.id,
      });
      fixture.adapter.run(
        'UPDATE store_members SET status = ? WHERE store_id = ? AND user_id = ?;',
        ['INACTIVE', fixture.context.store.id, fixture.context.owner.id],
      );
      expect(() => client.listPriceChanges()).toThrow(/active store owner/i);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('retains comparison facts after app database restart', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Beans' },
        { generateId: deterministicIds(3000) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      recordRestock(fixture, product, base.id, 500, '2026-02-01T10:00:00.000Z', 3100);
      recordRestock(fixture, product, base.id, 750, '2026-02-02T10:00:00.000Z', 3200);
      fixture.adapter.close();

      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        const client = createDatabasePersonalPriceClient(reopened, {
          storeId: fixture.context.store.id, userId: fixture.context.owner.id,
        });
        expect(client.getProductPriceComparison(product.storeProduct.id)?.comparison).toMatchObject({
          kind: 'comparison', direction: 'INCREASE', percentageTenths: '500',
        });
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('uses historical package snapshots even after that package is deactivated', () => {
    const fixture = openCatalogueFixture();
    try {
      const product = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Flour' },
        { generateId: deterministicIds(4000) },
      );
      const base = getActiveBasePackageUnit(fixture.adapter, product.variant.id)!;
      const carton = createPackage(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        storeProductId: product.storeProduct.id,
        name: 'carton',
        conversionText: '10',
        isPurchasable: true,
      }, { generateId: deterministicIds(4100), operationId: testId(4101) });
      recordRestock(fixture, product, carton.packageUnit.id, 1000, '2026-03-01T10:00:00.000Z', 4200);
      deactivatePackage(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        packageUnitId: carton.packageUnit.id,
      }, { generateId: deterministicIds(4300), operationId: testId(4301) });
      recordRestock(fixture, product, base.id, 100, '2026-03-02T10:00:00.000Z', 4400);

      const client = createDatabasePersonalPriceClient(fixture.adapter, {
        storeId: fixture.context.store.id, userId: fixture.context.owner.id,
      });
      const result = client.getProductPriceComparison(product.storeProduct.id)!;
      expect(result.comparison).toMatchObject({ kind: 'comparison', basis: 'BASE_UNIT', direction: 'UNCHANGED' });
      expect(result.previous?.packageNameSnapshot).toBe('carton');
      expect(result.previous?.conversionToBaseSnapshotMicros).toBe(10 * MICROS_PER_UNIT);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
