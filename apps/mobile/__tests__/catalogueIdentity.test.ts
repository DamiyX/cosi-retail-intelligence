import { DomainError } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import {
  addProductIdentifier,
  updateProductIdentity,
} from '../src/catalogue/updateProductIdentity';
import { MIGRATIONS, openDatabase } from '../src/db';
import {
  countPendingOutboxOperations,
  createProductIdentifier,
  deactivateProductIdentifier,
  getProductIdentifierById,
  getProductVariantById,
  getStoreProductById,
  listProductIdentifiers,
  normalizeIdentifierValue,
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
    { generateId: deterministicIds(10000) },
  );
  return { fixture, graph };
}

describe('M2-02 identity enrichment', () => {
  it('renames and re-SKUs a product with one envelope and survives restart', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const result = updateProductIdentity(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'Milo Chocolate Malt 400g',
          localSku: 'ML-400-B',
        },
        { generateId: deterministicIds(10100) },
      );
      expect(result.variant.name).toBe('Milo Chocolate Malt 400g');
      expect(result.storeProduct.localSku).toBe('ML-400-B');
      expect(result.storeProduct.isTemporary).toBe(true);
      expect(result.outbox.operationType).toBe('PRODUCT_IDENTITY_UPDATED');
      expect(result.outbox.status).toBe('PENDING');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(2);

      const productId = graph.storeProduct.id;
      fixture.adapter.close();
      const reopened = reopenDatabase(fixture.path);
      try {
        openDatabase(reopened, MIGRATIONS);
        expect(getStoreProductById(reopened, productId)?.localSku).toBe('ML-400-B');
        const variant = getProductVariantById(
          reopened,
          getStoreProductById(reopened, productId)?.productVariantId ?? '',
        );
        expect(variant?.name).toBe('Milo Chocolate Malt 400g');
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('never lets an identity edit touch commercial facts or variant ownership', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const setting = saveStorePackageSetting(fixture.adapter, {
        id: testId(50),
        storeProductId: graph.storeProduct.id,
        packageUnitId: graph.basePackage.id,
        defaultSellingPriceMinor: 145000,
        minimumSellingPriceMinor: 140000,
        isPreferredForSale: true,
        isPreferredForPurchase: true,
      });
      updateProductIdentity(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'Renamed Entirely',
          localSku: 'NEW-SKU',
        },
        { generateId: deterministicIds(10200) },
      );
      const after = getStoreProductById(fixture.adapter, graph.storeProduct.id);
      expect(after?.defaultSellingPriceMinor).toBeNull();
      expect(after?.preferredPackageUnitId).toBe(graph.basePackage.id);
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.ownerStoreId).toBe(
        fixture.context.store.id,
      );
      const settings = fixture.adapter.getAllRows<Record<string, string | number | null>>(
        'SELECT * FROM store_package_settings;',
      );
      expect(settings).toHaveLength(1);
      expect(settings[0]?.default_selling_price_minor).toBe(setting.defaultSellingPriceMinor);
      expect(settings[0]?.is_preferred_for_sale).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects identity edits for another store without writing anything', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          updateProductIdentity(
            fixture.adapter,
            {
              storeId: testId(4242),
              deviceId: fixture.context.device.id,
              storeProductId: graph.storeProduct.id,
              name: 'Hijacked',
            },
            { generateId: deterministicIds(10300) },
          ),
        'INVALID_VALUE',
      );
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.name).toBe('Milo 400g');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it.each([1, 2, 3])('rolls back identity write %d and its envelope on failure', (failOnWrite) => {
    const { fixture, graph } = openProductFixture();
    try {
      const failing = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error('injected'));
      expect(() =>
        updateProductIdentity(
          failing,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: graph.storeProduct.id,
            name: 'Should Not Persist',
            localSku: 'NOPE-1',
          },
          { generateId: deterministicIds(10400) },
        ),
      ).toThrow();
      expect(getProductVariantById(fixture.adapter, graph.variant.id)?.name).toBe('Milo 400g');
      expect(getStoreProductById(fixture.adapter, graph.storeProduct.id)?.localSku).toBe('ML-400');
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('replays a repeated identity operation ID without duplicating envelopes', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const operationId = testId(888);
      const first = updateProductIdentity(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'Replay Name',
        },
        { generateId: deterministicIds(10500), operationId },
      );
      const second = updateProductIdentity(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'Different Name Must Not Apply',
        },
        { generateId: deterministicIds(10600), operationId },
      );
      expect(second.variant.name).toBe('Replay Name');
      expect(second.outbox.operationId).toBe(first.outbox.operationId);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('M2-02 product identifiers', () => {
  it('normalizes barcode text for exact matching', () => {
    expect(normalizeIdentifierValue(' 6001 2345-6789 ')).toBe('600123456789');
    expect(normalizeIdentifierValue('abc-123')).toBe('ABC123');
  });

  it('adds an identifier with its own envelope and finds it by exact barcode', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const result = addProductIdentifier(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          type: 'EAN',
          value: '6001 2345-6789',
        },
        { generateId: deterministicIds(10700) },
      );
      expect(result.identifier.normalizedValue).toBe('600123456789');
      expect(result.identifier.value).toBe('6001 2345-6789');
      expect(result.outbox?.operationType).toBe('PRODUCT_IDENTIFIER_ADDED');
      const hits = searchStoreProducts(fixture.adapter, fixture.context.store.id, '600123456789');
      expect(hits.map((hit) => hit.variantName)).toEqual(['Milo 400g']);
      expect(listProductIdentifiers(fixture.adapter, graph.variant.id)).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects attaching an identifier to another product package', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const other = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Omo' },
        { generateId: deterministicIds(10750) },
      );
      expectDomainError(
        () => addProductIdentifier(
          fixture.adapter,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: graph.storeProduct.id,
            packageUnitId: other.basePackage.id,
            type: 'EAN',
            value: '6001234567890',
          },
          { generateId: deterministicIds(10760) },
        ),
        'INVALID_VALUE',
      );
      expect(listProductIdentifiers(fixture.adapter, graph.variant.id)).toHaveLength(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects a duplicate exact barcode on another product without writing', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const other = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Omo' },
        { generateId: deterministicIds(10800) },
      );
      addProductIdentifier(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          type: 'EAN',
          value: '6001234567890',
        },
        { generateId: deterministicIds(10900) },
      );
      expectDomainError(
        () =>
          addProductIdentifier(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              storeProductId: other.storeProduct.id,
              type: 'UPC',
              value: '6001234567890',
            },
            { generateId: deterministicIds(11000) },
          ),
        'INVALID_VALUE',
      );
      expect(listProductIdentifiers(fixture.adapter, other.variant.id)).toHaveLength(0);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(3);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('scopes internal codes per variant and frees values on deactivation', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const other = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Omo' },
        { generateId: deterministicIds(11100) },
      );
      const first = createProductIdentifier(fixture.adapter, {
        id: testId(61),
        productVariantId: graph.variant.id,
        type: 'INTERNAL_CODE',
        value: 'back-room-7',
      });
      expect(first.normalizedValue).toBe('BACKROOM7');
      const second = createProductIdentifier(fixture.adapter, {
        id: testId(62),
        productVariantId: other.variant.id,
        type: 'INTERNAL_CODE',
        value: 'back-room-7',
      });
      expect(second.normalizedValue).toBe('BACKROOM7');
      expectDomainError(
        () =>
          createProductIdentifier(fixture.adapter, {
            id: testId(63),
            productVariantId: graph.variant.id,
            type: 'INTERNAL_CODE',
            value: 'BACK-ROOM-7',
          }),
        'INVALID_VALUE',
      );
      deactivateProductIdentifier(fixture.adapter, first.id);
      const revived = createProductIdentifier(fixture.adapter, {
        id: testId(64),
        productVariantId: graph.variant.id,
        type: 'INTERNAL_CODE',
        value: 'back-room-7',
      });
      expect(revived.status).toBe('ACTIVE');
      expect(getProductIdentifierById(fixture.adapter, first.id)?.status).toBe('INACTIVE');
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('M2-02 search acceptance', () => {
  it('finds by name, SKU, and exact barcode and treats hostile text as data', () => {
    const fixture = openCatalogueFixture();
    try {
      const first = createTemporaryProduct(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          name: 'Milo 400g',
          localSku: 'ML-400',
          barcode: '6001234567890',
        },
        { generateId: deterministicIds(11200) },
      );
      createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Peak Milk' },
        { generateId: deterministicIds(11300) },
      );
      const names = (query: string): string[] =>
        searchStoreProducts(fixture.adapter, fixture.context.store.id, query).map(
          (hit) => hit.variantName,
        );
      expect(names('milo')).toEqual(['Milo 400g']);
      expect(names('ML-400')).toEqual(['Milo 400g']);
      expect(names('6001234567890')).toEqual(['Milo 400g']);
      expect(names(' 6001 2345-6789 ')).toEqual([]);
      expect(names('peak')).toEqual(['Peak Milk']);
      expect(names('')).toEqual(['Milo 400g', 'Peak Milk']);
      expect(names("%' OR '1'='1")).toEqual([]);
      expect(names('_')).toEqual([]);
      expect(first.storeProduct.localSku).toBe('ML-400');
    } finally {
      fixture.closeAndDelete();
    }
  });
});
