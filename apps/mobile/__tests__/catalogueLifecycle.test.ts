import { DomainError } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import {
  markProductEnriched,
  setProductActive,
} from '../src/catalogue/manageLifecycle';
import {
  countPendingOutboxOperations,
  getProductVariantById,
  getStoreProductById,
  saveStorePackageSetting,
  searchStoreProducts,
} from '../src/db/repositories';
import {
  countRows,
  deterministicIds,
  FailOnWriteAdapter,
  openCatalogueFixture,
  reopenDatabase,
  testId,
} from './catalogueSupport';
import { MIGRATIONS, openDatabase } from '../src/db';

function expectDomainError(fn: () => unknown, code: DomainError['code']): void {
  try {
    fn();
    throw new Error('Expected a DomainError but none was thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

function openProductFixture() {
  const fixture = openCatalogueFixture();
  const graph = createTemporaryProduct(
    fixture.adapter,
    {
      storeId: fixture.context.store.id,
      deviceId: fixture.context.device.id,
      name: 'Milo 400g',
      localSku: 'ML-400',
    },
    { generateId: deterministicIds(15000) },
  );
  return { fixture, graph };
}

describe('M2-04 catalogue lifecycle', () => {
  it('marks a product enriched while keeping every store-owned fact', () => {
    const { fixture, graph } = openProductFixture();
    try {
      saveStorePackageSetting(fixture.adapter, {
        id: testId(70),
        storeProductId: graph.storeProduct.id,
        packageUnitId: graph.basePackage.id,
        defaultSellingPriceMinor: 145000,
        isPreferredForSale: true,
        isPreferredForPurchase: true,
      });
      const result = markProductEnriched(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, storeProductId: graph.storeProduct.id },
        { generateId: deterministicIds(15100) },
      );
      expect(result.storeProduct.isTemporary).toBe(false);
      expect(result.storeProduct.status).toBe('ACTIVE');
      expect(result.storeProduct.localSku).toBe('ML-400');
      expect(result.storeProduct.productVariantId).toBe(graph.variant.id);
      expect(result.outbox.operationType).toBe('PRODUCT_LIFECYCLE_CHANGED');
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.ownerStoreId).toBe(
        fixture.context.store.id,
      );
      const settings = fixture.adapter.getAllRows<Record<string, string | number | null>>(
        'SELECT * FROM store_package_settings;',
      );
      expect(settings).toHaveLength(1);
      expect(settings[0]?.default_selling_price_minor).toBe(145000);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('deactivates with confirmation semantics, retains history, and reactivates', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const deactivated = setProductActive(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, storeProductId: graph.storeProduct.id },
        false,
        { generateId: deterministicIds(15200) },
      );
      expect(deactivated.storeProduct.status).toBe('INACTIVE');
      expect(deactivated.outbox.operationType).toBe('PRODUCT_LIFECYCLE_CHANGED');

      const productId = graph.storeProduct.id;
      fixture.adapter.close();
      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getStoreProductById(reopened, productId)?.status).toBe('INACTIVE');
        expect(getStoreProductById(reopened, productId)?.isTemporary).toBe(true);
      } finally {
        reopened.close();
      }

      const reopenedAgain = reopenDatabase(fixture.path);
      let reactivatedStatus: string | undefined;
      try {
        openDatabase(reopenedAgain, MIGRATIONS);
        const reactivated = setProductActive(
          reopenedAgain,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: productId,
          },
          true,
          { generateId: deterministicIds(15300) },
        );
        reactivatedStatus = reactivated.storeProduct.status;
      } finally {
        reopenedAgain.close();
      }
      expect(reactivatedStatus).toBe('ACTIVE');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('filters temporary, active, and inactive products explicitly', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const second = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Omo' },
        { generateId: deterministicIds(15400) },
      );
      markProductEnriched(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, storeProductId: second.storeProduct.id },
        { generateId: deterministicIds(15500) },
      );
      setProductActive(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, storeProductId: graph.storeProduct.id },
        false,
        { generateId: deterministicIds(15600) },
      );
      const names = (filter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'TEMPORARY'): string[] =>
        searchStoreProducts(fixture.adapter, fixture.context.store.id, '', filter).map(
          (hit) => hit.variantName,
        );
      expect(names('ALL')).toEqual(['Milo 400g', 'Omo']);
      expect(names('TEMPORARY')).toEqual(['Milo 400g']);
      expect(names('INACTIVE')).toEqual(['Milo 400g']);
      expect(names('ACTIVE')).toEqual(['Omo']);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rolls back a lifecycle change and its envelope on failure', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const failing = new FailOnWriteAdapter(fixture.adapter, 1, new Error('injected'));
      expect(() =>
        setProductActive(
          failing,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: graph.storeProduct.id,
          },
          false,
          { generateId: deterministicIds(15700) },
        ),
      ).toThrow();
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.status).toBe('ACTIVE');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('replays a repeated lifecycle operation ID while independent operations apply', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const operationId = testId(31337);
      const input = {
        storeId: fixture.context.store.id,
        deviceId: fixture.context.device.id,
        storeProductId: graph.storeProduct.id,
      };
      const first = setProductActive(fixture.adapter, input, false, {
        generateId: deterministicIds(15800),
        operationId,
      });
      const second = setProductActive(fixture.adapter, input, true, {
        generateId: deterministicIds(15900),
        operationId,
      });
      expect(second.storeProduct.status).toBe('INACTIVE');
      expect(second.outbox.operationId).toBe(first.outbox.operationId);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(2);

      const third = setProductActive(fixture.adapter, input, true, {
        generateId: deterministicIds(16000),
      });
      expect(third.storeProduct.status).toBe('ACTIVE');
      expect(third.outbox.operationId).not.toBe(operationId);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(3);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects lifecycle changes for another store without writing', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          setProductActive(
            fixture.adapter,
            { storeId: testId(4242), deviceId: fixture.context.device.id, storeProductId: graph.storeProduct.id },
            false,
            { generateId: deterministicIds(16100) },
          ),
        'INVALID_VALUE',
      );
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.status).toBe('ACTIVE');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
