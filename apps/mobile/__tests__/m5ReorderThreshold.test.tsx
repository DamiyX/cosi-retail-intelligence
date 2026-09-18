import { fireEvent, render, screen } from '@testing-library/react-native';
import { DomainError, MICROS_PER_UNIT } from '@retail/domain';

import { createCatalogueClient } from '../src/catalogue/client';
import { updateReorderLevel } from '../src/catalogue/updateReorderLevel';
import {
  countPendingOutboxOperations,
  createStoreMember,
  createUser,
  findOutboxOperation,
  getActiveBasePackageUnit,
  getStoreProductById,
} from '../src/db/repositories';
import { createDatabaseInventoryClient } from '../src/inventory/client';
import { createDatabasePurchasesClient } from '../src/purchases/client';
import ProductDetailScreen from '../src/screens/products/ProductDetailScreen';
import {
  deterministicIds,
  FailOnWriteAdapter,
  openCatalogueFixture,
  reopenDatabase,
  testId,
} from './catalogueSupport';

describe('A11 reorder threshold service', () => {
  it('sets, accepts zero, clears, and emits one versioned atomic outbox operation', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20000),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Threshold rice' });
      const before = catalogue.getProductDetail(graph.storeProduct.id);
      if (!before) throw new Error('Product fixture missing.');

      const set = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 2 * MICROS_PER_UNIT,
        expectedVersion: before.product.version,
        operationId: testId(20010),
      });
      expect(set.storeProduct.reorderLevelBaseMicros).toBe(2 * MICROS_PER_UNIT);
      expect(set.storeProduct.version).toBe(before.product.version + 1);
      expect(set.outbox.operationType).toBe('PRODUCT_REORDER_LEVEL_UPDATED');
      expect(JSON.parse(set.outbox.payload).entities).toMatchObject({
        storeProductVersion: 1,
        previousStoreProductVersion: before.product.version,
        request: { reorderLevelBaseMicros: 2 * MICROS_PER_UNIT },
      });

      const zero = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 0,
        expectedVersion: set.storeProduct.version,
        operationId: testId(20011),
      });
      expect(zero.storeProduct.reorderLevelBaseMicros).toBe(0);

      const cleared = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: null,
        expectedVersion: zero.storeProduct.version,
        operationId: testId(20012),
      });
      expect(cleared.storeProduct.reorderLevelBaseMicros).toBeNull();
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(4);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects negative, fractional-micro, unsafe, and stale writes without changing durable state', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20100),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Validation rice' });
      const detail = catalogue.getProductDetail(graph.storeProduct.id);
      if (!detail) throw new Error('Product fixture missing.');
      const initialOutboxCount = countPendingOutboxOperations(fixture.adapter, fixture.context.store.id);

      for (const [value, suffix] of [
        [-1, 20110],
        [Number.MAX_SAFE_INTEGER + 1, 20111],
      ] as const) {
        expect(() => catalogue.updateReorderLevel({
          storeProductId: graph.storeProduct.id,
          reorderLevelBaseMicros: value,
          expectedVersion: detail.product.version,
          operationId: testId(suffix),
        })).toThrow(DomainError);
      }
      expect(() => catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 1.5,
        expectedVersion: detail.product.version,
        operationId: testId(20120),
      })).toThrow(DomainError);
      expect(() => catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 1,
        expectedVersion: detail.product.version + 1,
        operationId: testId(20121),
      })).toThrow('changed while this threshold was open');

      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.reorderLevelBaseMicros).toBeNull();
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(initialOutboxCount);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('binds replay to the original request and returns the original snapshot without a duplicate write', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20200),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Replay rice' });
      const initial = catalogue.getProductDetail(graph.storeProduct.id);
      if (!initial) throw new Error('Product fixture missing.');
      const first = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 3 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
        operationId: testId(20210),
      });
      const later = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 5 * MICROS_PER_UNIT,
        expectedVersion: first.storeProduct.version,
        operationId: testId(20211),
      });
      const pendingBeforeReplay = countPendingOutboxOperations(fixture.adapter, fixture.context.store.id);

      const replay = catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 3 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
        operationId: testId(20210),
      });
      expect(replay.storeProduct.reorderLevelBaseMicros).toBe(3 * MICROS_PER_UNIT);
      expect(replay.storeProduct.version).toBe(first.storeProduct.version);
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.reorderLevelBaseMicros).toBe(5 * MICROS_PER_UNIT);
      expect(later.storeProduct.version).toBe(first.storeProduct.version + 1);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(pendingBeforeReplay);
      expect(() => catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 4 * MICROS_PER_UNIT,
        expectedVersion: initial.product.version,
        operationId: testId(20210),
      })).toThrow('different reorder threshold request');
      expect(findOutboxOperation(fixture.adapter, testId(20210))?.operationType).toBe('PRODUCT_REORDER_LEVEL_UPDATED');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('enforces owner/store isolation and rolls back both business and outbox writes', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20300),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Private threshold rice' });
      const detail = catalogue.getProductDetail(graph.storeProduct.id);
      if (!detail) throw new Error('Product fixture missing.');
      const staff = createUser(fixture.adapter, { id: testId(20310), displayName: 'Staff member' });
      createStoreMember(fixture.adapter, {
        id: testId(20311),
        storeId: fixture.context.store.id,
        userId: staff.id,
        role: 'STAFF',
      });
      expect(() => updateReorderLevel(fixture.adapter, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: staff.id,
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: MICROS_PER_UNIT,
        expectedVersion: detail.product.version,
      }, { operationId: testId(20312) })).toThrow('active store owner');

      const otherFixture = openCatalogueFixture();
      try {
        const otherCatalogue = createCatalogueClient(
          otherFixture.adapter,
          otherFixture.context.store,
          otherFixture.context.device,
          deterministicIds(20320),
        );
        const otherGraph = otherCatalogue.createTemporaryProduct({ name: 'Other store rice' });
        expect(() => updateReorderLevel(fixture.adapter, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          storeProductId: otherGraph.storeProduct.id,
          reorderLevelBaseMicros: MICROS_PER_UNIT,
          expectedVersion: otherGraph.storeProduct.version,
        }, { operationId: testId(20321) })).toThrow('does not exist in this store');
      } finally {
        otherFixture.closeAndDelete();
      }

      const probe = new FailOnWriteAdapter(fixture.adapter, Number.MAX_SAFE_INTEGER, new Error('probe'));
      expect(() => updateReorderLevel(probe, {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        userId: fixture.context.owner.id,
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: MICROS_PER_UNIT,
        expectedVersion: detail.product.version,
      }, { operationId: testId(20330) })).not.toThrow();
      expect(probe.writeCount).toBe(2);

      const rollbackFixture = openCatalogueFixture();
      try {
        const rollbackCatalogue = createCatalogueClient(
          rollbackFixture.adapter,
          rollbackFixture.context.store,
          rollbackFixture.context.device,
          deterministicIds(20340),
        );
        const rollbackGraph = rollbackCatalogue.createTemporaryProduct({ name: 'Rollback rice' });
        const rollbackDetail = rollbackCatalogue.getProductDetail(rollbackGraph.storeProduct.id);
        if (!rollbackDetail) throw new Error('Rollback product fixture missing.');
        const failing = new FailOnWriteAdapter(rollbackFixture.adapter, 2, new Error('outbox failure'));
        expect(() => updateReorderLevel(failing, {
          storeId: rollbackFixture.context.store.id,
          deviceId: rollbackFixture.context.device.id,
          userId: rollbackFixture.context.owner.id,
          storeProductId: rollbackGraph.storeProduct.id,
          reorderLevelBaseMicros: MICROS_PER_UNIT,
          expectedVersion: rollbackDetail.product.version,
        }, { operationId: testId(20341) })).toThrow('outbox failure');
        expect(getStoreProductById(rollbackFixture.adapter, rollbackGraph.storeProduct.id)?.reorderLevelBaseMicros).toBeNull();
        expect(countPendingOutboxOperations(rollbackFixture.adapter, rollbackFixture.context.store.id)).toBe(1);
      } finally {
        rollbackFixture.closeAndDelete();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('survives reopen and drives the real low-stock attention condition', () => {
    const fixture = openCatalogueFixture();
    const path = fixture.path;
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20400),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Alert rice' });
      catalogue.updateReorderLevel({
        storeProductId: graph.storeProduct.id,
        reorderLevelBaseMicros: 3 * MICROS_PER_UNIT,
        expectedVersion: graph.storeProduct.version,
        operationId: testId(20410),
      });
      fixture.adapter.close();
      const reopened = reopenDatabase(path);
      try {
        expect(getStoreProductById(reopened, graph.storeProduct.id)?.reorderLevelBaseMicros).toBe(3 * MICROS_PER_UNIT);
        const base = getActiveBasePackageUnit(reopened, graph.variant.id);
        if (!base) throw new Error('Base package fixture missing.');
        const purchases = createDatabasePurchasesClient(reopened, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
          generateId: deterministicIds(20420),
        });
        purchases.recordPurchase({
          lines: [{
            storeProductId: graph.storeProduct.id,
            packageUnitId: base.id,
            quantityPackagesMicros: 2 * MICROS_PER_UNIT,
            enteredCostMinor: 100,
          }],
          operationId: testId(20421),
        });
        const inventory = createDatabaseInventoryClient(reopened, {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          userId: fixture.context.owner.id,
        });
        expect(inventory.getAttentionOverview('2026-09-18T08:00:00.000Z').items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              storeProductId: graph.storeProduct.id,
              kind: 'LOW_STOCK',
              balanceBaseMicros: String(2 * MICROS_PER_UNIT),
            }),
          ]),
        );
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('A11 reorder threshold product control', () => {
  it('sets and clears an exact unit-aware threshold from the product detail screen', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20500),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Product control rice' });
      render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      fireEvent.changeText(screen.getByTestId('detail-reorder-threshold'), '2.5');
      fireEvent.press(screen.getByText('Save threshold'));
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.reorderLevelBaseMicros).toBe(2.5 * MICROS_PER_UNIT);
      expect(screen.getByText('Current threshold: 2.5 piece')).toBeTruthy();

      fireEvent.press(screen.getByText('Clear threshold'));
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.reorderLevelBaseMicros).toBeNull();
      expect(screen.getByText(/No threshold is set/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('keeps invalid input visible and reports exact quantity errors without a write', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20600),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Invalid control rice' });
      render(
        <ProductDetailScreen
          client={catalogue}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      fireEvent.changeText(screen.getByTestId('detail-reorder-threshold'), '1.0000001');
      fireEvent.press(screen.getByText('Save threshold'));
      expect(screen.getByDisplayValue('1.0000001')).toBeTruthy();
      expect(screen.getByText(/at most six fractional digits/)).toBeTruthy();
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.reorderLevelBaseMicros).toBeNull();

      fireEvent.changeText(screen.getByTestId('detail-reorder-threshold'), '9007199254.740992');
      fireEvent.press(screen.getByText('Save threshold'));
      expect(screen.getByDisplayValue('9007199254.740992')).toBeTruthy();
      expect(screen.getByText(/safe persisted range/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('preserves dirty input when the durable mutation fails', () => {
    const fixture = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(
        fixture.adapter,
        fixture.context.store,
        fixture.context.device,
        deterministicIds(20700),
      );
      const graph = catalogue.createTemporaryProduct({ name: 'Failed control rice' });
      const failingClient = {
        ...catalogue,
        updateReorderLevel: () => {
          throw new Error('Injected threshold failure.');
        },
      };
      render(
        <ProductDetailScreen
          client={failingClient}
          productId={graph.storeProduct.id}
          onBack={() => undefined}
          onAddPackage={() => undefined}
          onEditPackage={() => undefined}
        />,
      );
      fireEvent.changeText(screen.getByTestId('detail-reorder-threshold'), '2');
      fireEvent.press(screen.getByText('Save threshold'));
      expect(screen.getByDisplayValue('2')).toBeTruthy();
      expect(screen.getByText(/could not be saved on the device/)).toBeTruthy();
    } finally {
      fixture.closeAndDelete();
    }
  });
});
