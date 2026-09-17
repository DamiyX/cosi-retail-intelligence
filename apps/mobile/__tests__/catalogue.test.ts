import { DomainError, MICROS_PER_UNIT } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { MIGRATIONS, openDatabase } from '../src/db';
import {
  countPendingOutboxOperations,
  createPackageUnit,
  createProductVariant,
  findOutboxOperation,
  getActiveBasePackageUnit,
  getStoreProductById,
  listPendingOutboxOperations,
  listStoreProducts,
  OUTBOX_PAYLOAD_VERSION,
} from '../src/db/repositories';
import { openIsolatedDatabase } from '../src/db/testing';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';
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

describe('M2-01 catalogue migration', () => {
  it('migrates a fresh database to version 2 with empty catalogue tables', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 2));
    try {
      expect(isolated.report.schemaVersion).toBe(2);
      for (const table of [
        'product_variants',
        'package_units',
        'store_products',
        'store_package_settings',
        'product_identifiers',
        'outbox_operations',
      ]) {
        expect(countRows(isolated.adapter, table)).toBe(0);
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('upgrades a populated M1 database without reset, loss, or false history', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS.slice(0, 1));
    try {
      provisionStoreContext(
        isolated.adapter,
        {
          ownerDisplayName: 'Adaeze O.',
          storeName: 'Adaeze Provisions',
          currencyCode: 'NGN',
          countryCode: 'NG',
          timezone: 'Africa/Lagos',
          appVersion: '0.0.1',
        },
        { generateId: deterministicIds(500) },
      );
      isolated.adapter.close();

      const reopened = reopenDatabase(isolated.path);
      try {
        const report = openDatabase(reopened, MIGRATIONS.slice(0, 2));
        expect(report.schemaVersion).toBe(2);
        expect(countRows(reopened, 'stores')).toBe(1);
        expect(countRows(reopened, 'users')).toBe(1);
        expect(countRows(reopened, 'store_members')).toBe(1);
        expect(countRows(reopened, 'devices')).toBe(1);
        const history = reopened.getAllRows<{ version: number; name: string }>(
          'SELECT version, name FROM schema_migrations ORDER BY version ASC;',
        );
        expect(history).toEqual([
          { version: 1, name: 'store_context' },
          { version: 2, name: 'catalogue' },
        ]);
        expect(countRows(reopened, 'product_variants')).toBe(0);
        expect(countRows(reopened, 'outbox_operations')).toBe(0);
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects a second active base unit at the database boundary', () => {
    const fixture = openCatalogueFixture();
    try {
      const variant = createProductVariant(
        fixture.adapter,
        {
          id: testId(1),
          identityScope: 'STORE_LOCAL',
          ownerStoreId: fixture.context.store.id,
          name: 'Milo 400g',
        },
      );
      createPackageUnit(fixture.adapter, {
        id: testId(2),
        productVariantId: variant.id,
        name: 'sachet',
        conversionToBaseMicros: MICROS_PER_UNIT,
        isBaseUnit: true,
      });
      expect(() =>
        fixture.adapter.run(
          `INSERT INTO package_units
            (id, product_variant_id, name, conversion_to_base_micros,
             is_base_unit, is_sellable, is_purchasable, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 1, 1, 'ACTIVE', ?, ?);`,
          [testId(3), variant.id, 'tin', MICROS_PER_UNIT, new Date().toISOString(), new Date().toISOString()],
        ),
      ).toThrow();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects cross-store package references at the database boundary', () => {
    const fixture = openCatalogueFixture();
    try {
      expect(() =>
        createPackageUnit(fixture.adapter, {
          id: testId(11),
          productVariantId: testId(999),
          name: 'carton',
          conversionToBaseMicros: 40_000_000,
          isBaseUnit: false,
        }),
      ).toThrow();
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects cross-owner catalogue and outbox references at the database boundary', () => {
    const fixture = openCatalogueFixture();
    try {
      const first = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'First' },
        { generateId: deterministicIds(700) },
      );
      const second = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Second' },
        { generateId: deterministicIds(800) },
      );
      const otherContext = provisionStoreContext(
        fixture.adapter,
        {
          ownerDisplayName: 'Other owner', storeName: 'Other store', currencyCode: 'NGN',
          countryCode: 'NG', timezone: 'Africa/Lagos', appVersion: '0.0.1',
        },
        { generateId: deterministicIds(900) },
      );
      const timestamp = new Date().toISOString();

      expect(() => fixture.adapter.run(
        `INSERT INTO store_products
          (id, store_id, product_variant_id, is_temporary, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, 'ACTIVE', ?, ?);`,
        [testId(950), otherContext.store.id, first.variant.id, timestamp, timestamp],
      )).toThrow();
      expect(() => fixture.adapter.run(
        'UPDATE store_products SET preferred_package_unit_id = ? WHERE id = ?;',
        [second.basePackage.id, first.storeProduct.id],
      )).toThrow();
      expect(() => fixture.adapter.run(
        `INSERT INTO store_package_settings
          (id, store_product_id, package_unit_id, is_preferred_for_sale,
           is_preferred_for_purchase, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, ?, ?);`,
        [testId(951), first.storeProduct.id, second.basePackage.id, timestamp, timestamp],
      )).toThrow();
      expect(() => fixture.adapter.run(
        `INSERT INTO product_identifiers
          (id, product_variant_id, package_unit_id, type, value, normalized_value,
           status, created_at, updated_at)
         VALUES (?, ?, ?, 'EAN', '123', '123', 'ACTIVE', ?, ?);`,
        [testId(952), first.variant.id, second.basePackage.id, timestamp, timestamp],
      )).toThrow();
      expect(() => fixture.adapter.run(
        `INSERT INTO outbox_operations
          (operation_id, store_id, device_id, entity_type, entity_id, operation_type,
           payload, created_at, status)
         VALUES (?, ?, ?, 'STORE_PRODUCT', ?, 'PRODUCT_CREATED', '{}', ?, 'PENDING');`,
        [testId(953), fixture.context.store.id, otherContext.device.id, first.storeProduct.id, timestamp],
      )).toThrow();
    } finally {
      fixture.closeAndDelete();
    }
  });
});

describe('createTemporaryProduct application operation', () => {
  it('creates the provisional graph plus exactly one PENDING envelope offline', () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          name: 'Milo 400g',
          localSku: 'ML-400',
          barcode: '6001234567890',
        },
        { generateId: deterministicIds(200) },
      );

      expect(graph.variant.identityScope).toBe('STORE_LOCAL');
      expect(graph.variant.ownerStoreId).toBe(fixture.context.store.id);
      expect(graph.storeProduct.isTemporary).toBe(true);
      expect(graph.storeProduct.status).toBe('ACTIVE');
      expect(graph.storeProduct.localSku).toBe('ML-400');
      expect(graph.basePackage.isBaseUnit).toBe(true);
      expect(graph.basePackage.name).toBe('piece');
      expect(graph.basePackage.conversionToBaseMicros).toBe(MICROS_PER_UNIT);
      expect(graph.basePackage.status).toBe('ACTIVE');
      expect(graph.storeProduct.preferredPackageUnitId).toBe(graph.basePackage.id);
      expect(graph.identifier?.normalizedValue).toBe('6001234567890');

      expect(countRows(fixture.adapter, 'product_variants')).toBe(1);
      expect(countRows(fixture.adapter, 'package_units')).toBe(1);
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
      expect(countRows(fixture.adapter, 'product_identifiers')).toBe(1);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);

      const envelope = graph.outbox;
      expect(envelope.status).toBe('PENDING');
      expect(envelope.operationType).toBe('PRODUCT_CREATED');
      expect(envelope.entityType).toBe('STORE_PRODUCT');
      expect(envelope.entityId).toBe(graph.storeProduct.id);
      expect(envelope.attemptCount).toBe(0);
      const payload = JSON.parse(envelope.payload) as {
        payloadVersion: number;
        operationId: string;
        storeId: string;
        deviceId: string;
        entities: Record<string, unknown>;
      };
      expect(payload.payloadVersion).toBe(OUTBOX_PAYLOAD_VERSION);
      expect(payload.operationId).toBe(envelope.operationId);
      expect(payload.storeId).toBe(fixture.context.store.id);
      expect(payload.deviceId).toBe(fixture.context.device.id);
      expect(payload.entities.storeProduct).toBeDefined();
      expect(payload.entities.productVariant).toBeDefined();
      expect(payload.entities.basePackageUnit).toBeDefined();
      expect(payload.entities.identifier).toBeDefined();

      const listed = listStoreProducts(fixture.adapter, fixture.context.store.id);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.variantName).toBe('Milo 400g');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('succeeds with only a name and survives database close and reopen', () => {
    const fixture = openCatalogueFixture();
    try {
      const graph = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Unpriced Salt' },
        { generateId: deterministicIds(300) },
      );
      expect(graph.identifier).toBeNull();
      const productId = graph.storeProduct.id;
      const outboxId = graph.outbox.operationId;
      fixture.adapter.close();

      const reopened = reopenDatabase(fixture.path);
      try {
        const report = openDatabase(reopened, MIGRATIONS);
        expect(report.schemaVersion).toBe(3);
        const product = getStoreProductById(reopened, productId);
        if (!product) {
          throw new Error('Temporary product did not survive reopen.');
        }
        expect(product.isTemporary).toBe(true);
        expect(getActiveBasePackageUnit(reopened, product.productVariantId)?.name).toBe('piece');
        expect(findOutboxOperation(reopened, outboxId)?.status).toBe('PENDING');
      } finally {
        reopened.close();
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects operation-ID replay from another store instead of exposing its graph', () => {
    const fixture = openCatalogueFixture();
    try {
      const operationId = testId(350);
      createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Private item' },
        { generateId: deterministicIds(351), operationId },
      );
      const other = provisionStoreContext(
        fixture.adapter,
        {
          ownerDisplayName: 'Other owner', storeName: 'Other store', currencyCode: 'NGN',
          countryCode: 'NG', timezone: 'Africa/Lagos', appVersion: '0.0.1',
        },
        { generateId: deterministicIds(360) },
      );
      expectDomainError(
        () => createTemporaryProduct(
          fixture.adapter,
          { storeId: other.store.id, deviceId: other.device.id, name: 'Attempted replay' },
          { generateId: deterministicIds(370), operationId },
        ),
        'INVALID_VALUE',
      );
      expect(listStoreProducts(fixture.adapter, other.store.id)).toHaveLength(0);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it.each([1, 2, 3, 4, 5])(
    'leaves neither business rows nor an outbox row when write %d fails',
    (failOnWrite) => {
      const fixture = openCatalogueFixture();
      try {
        const failing = new FailOnWriteAdapter(
          fixture.adapter,
          failOnWrite,
          new Error(`injected catalogue failure ${failOnWrite}`),
        );
        expect(() =>
          createTemporaryProduct(
            failing,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Bournvita 800g',
              barcode: '6009876543210',
            },
            { generateId: deterministicIds(400) },
          ),
        ).toThrow();
        for (const table of [
          'product_variants',
          'package_units',
          'store_products',
          'product_identifiers',
          'outbox_operations',
        ]) {
          expect(countRows(fixture.adapter, table)).toBe(0);
        }
      } finally {
        fixture.closeAndDelete();
      }
    },
  );

  it('returns the original graph without duplicating work for a repeated operation ID', () => {
    const fixture = openCatalogueFixture();
    try {
      const operationId = testId(777);
      const first = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Peak Milk' },
        { generateId: deterministicIds(600), operationId },
      );
      const second = createTemporaryProduct(
        fixture.adapter,
        { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: 'Peak Milk' },
        { generateId: deterministicIds(700), operationId },
      );
      expect(second.storeProduct.id).toBe(first.storeProduct.id);
      expect(second.outbox.operationId).toBe(operationId);
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
      expect(listPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toHaveLength(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects invalid input without writing anything', () => {
    const fixture = openCatalogueFixture();
    try {
      expectDomainError(
        () =>
          createTemporaryProduct(
            fixture.adapter,
            { storeId: fixture.context.store.id, deviceId: fixture.context.device.id, name: '' },
            { generateId: deterministicIds(800) },
          ),
        'INVALID_VALUE',
      );
      expectDomainError(
        () =>
          createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Ok',
              localSku: 'SKU-THAT-IS-WAY-TOO-LONG-FOR-THE-SIXTY-FOUR-CHARACTER-STORE-LIMIT-01',
            },
            { generateId: deterministicIds(900) },
          ),
        'INVALID_VALUE',
      );
      for (const table of ['product_variants', 'package_units', 'store_products', 'outbox_operations']) {
        expect(countRows(fixture.adapter, table)).toBe(0);
      }
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects a duplicate local SKU without writing anything', () => {
    const fixture = openCatalogueFixture();
    try {
      createTemporaryProduct(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          name: 'First',
          localSku: 'DUP-1',
        },
        { generateId: deterministicIds(1000) },
      );
      expectDomainError(
        () =>
          createTemporaryProduct(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              name: 'Second',
              localSku: 'DUP-1',
            },
            { generateId: deterministicIds(1100) },
          ),
        'INVALID_VALUE',
      );
      expect(countRows(fixture.adapter, 'store_products')).toBe(1);
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
