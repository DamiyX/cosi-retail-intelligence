import { DomainError, formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';

import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import {
  createPackage,
  deactivatePackage,
  updatePackage,
} from '../src/catalogue/managePackages';
import {
  countPendingOutboxOperations,
  getPackageUnitById,
  getStorePackageSetting,
  getStoreProductById,
  listPackageUnitsByVariant,
  updateStoreProductPreferredPackage,
} from '../src/db/repositories';
import {
  countRows,
  deterministicIds,
  FailOnWriteAdapter,
  openCatalogueFixture,
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
      name: 'Indomie Chicken 70g',
    },
    { generateId: deterministicIds(12000) },
  );
  return { fixture, graph };
}

describe('M2-03 package conversions', () => {
  it('round-trips whole and fractional conversions through SQLite as canonical text', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const carton = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'carton',
          conversionText: '40',
        },
        { generateId: deterministicIds(12100) },
      );
      expect(carton.packageUnit.conversionToBaseMicros).toBe(parseQuantityDecimal('40'));
      expect(formatQuantityMicros(carton.packageUnit.conversionToBaseMicros)).toBe('40');
      expect(carton.setting).toBeNull();

      const halfPack = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'half pack',
          conversionText: '0.5',
          setting: { defaultSellingPrice: '725.50', isPreferredForSale: true },
        },
        { generateId: deterministicIds(12200) },
      );
      expect(halfPack.packageUnit.conversionToBaseMicros).toBe(500_000);
      expect(formatQuantityMicros(halfPack.packageUnit.conversionToBaseMicros)).toBe('0.5');
      expect(halfPack.setting?.defaultSellingPriceMinor).toBe(72550);
      expect(halfPack.setting?.isPreferredForSale).toBe(true);
      expect(halfPack.outbox.operationType).toBe('PACKAGE_CREATED');

      const reread = getPackageUnitById(fixture.adapter, halfPack.packageUnit.id);
      expect(reread?.conversionToBaseMicros).toBe(500_000);
      expect(listPackageUnitsByVariant(fixture.adapter, graph.variant.id)).toHaveLength(3);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it.each(['0', '-2', '1.0000001', 'two', '', '1e2'])(
    'rejects conversion text %p without writing anything',
    (conversionText) => {
      const { fixture, graph } = openProductFixture();
      try {
        expectDomainError(
          () =>
            createPackage(
              fixture.adapter,
              {
                storeId: fixture.context.store.id,
                deviceId: fixture.context.device.id,
                storeProductId: graph.storeProduct.id,
                name: 'bad pack',
                conversionText,
              },
              { generateId: deterministicIds(12300) },
            ),
          conversionText === '0' ? 'INVALID_CONVERSION' : 'INVALID_QUANTITY',
        );
        expect(countRows(fixture.adapter, 'package_units')).toBe(1);
        expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
      } finally {
        fixture.closeAndDelete();
      }
    },
  );

  it('rejects unsafe conversion magnitudes without writing anything', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          createPackage(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              storeProductId: graph.storeProduct.id,
              name: 'planet pack',
              conversionText: '9007199254740993',
            },
            { generateId: deterministicIds(12400) },
          ),
        'INVALID_QUANTITY',
      );
      expect(countRows(fixture.adapter, 'package_units')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects a minimum price above the default price', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          createPackage(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              storeProductId: graph.storeProduct.id,
              name: 'pack',
              conversionText: '10',
              setting: { defaultSellingPrice: '100', minimumSellingPrice: '120' },
            },
            { generateId: deterministicIds(12500) },
          ),
        'INVALID_VALUE',
      );
      expect(countRows(fixture.adapter, 'package_units')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it.each([1, 2, 3])('rolls back package write %d and its envelope on failure', (failOnWrite) => {
    const { fixture, graph } = openProductFixture();
    try {
      const failing = new FailOnWriteAdapter(fixture.adapter, failOnWrite, new Error('injected'));
      expect(() =>
        createPackage(
          failing,
          {
            storeId: fixture.context.store.id,
            deviceId: fixture.context.device.id,
            storeProductId: graph.storeProduct.id,
            name: 'pack',
            conversionText: '10',
            setting: { defaultSellingPrice: '500' },
          },
          { generateId: deterministicIds(12600) },
        ),
      ).toThrow();
      expect(countRows(fixture.adapter, 'package_units')).toBe(1);
      expect(countRows(fixture.adapter, 'store_package_settings')).toBe(0);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('edits presentation and prices while the conversion stays immutable', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const created = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'pack',
          conversionText: '10',
        },
        { generateId: deterministicIds(12700) },
      );
      const updated = updatePackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          packageUnitId: created.packageUnit.id,
          name: 'retail pack',
          setting: { defaultSellingPrice: '1500', isPreferredForPurchase: true },
        },
        { generateId: deterministicIds(12800) },
      );
      expect(updated.packageUnit.name).toBe('retail pack');
      expect(updated.packageUnit.conversionToBaseMicros).toBe(10_000_000);
      expect(updated.setting?.defaultSellingPriceMinor).toBe(150000);
      expect(updated.setting?.isPreferredForPurchase).toBe(true);
      expect(updated.outbox.operationType).toBe('PACKAGE_UPDATED');

      const resaved = updatePackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          packageUnitId: created.packageUnit.id,
          setting: { defaultSellingPrice: '1600' },
        },
        { generateId: deterministicIds(12900) },
      );
      expect(resaved.setting?.defaultSellingPriceMinor).toBe(160000);
      expect(countRows(fixture.adapter, 'store_package_settings')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('rejects cross-store package writes', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          createPackage(
            fixture.adapter,
            {
              storeId: testId(4242),
              deviceId: fixture.context.device.id,
              storeProductId: graph.storeProduct.id,
              name: 'pack',
              conversionText: '10',
            },
            { generateId: deterministicIds(13100) },
          ),
        'INVALID_VALUE',
      );
      expectDomainError(
        () =>
          updatePackage(
            fixture.adapter,
            {
              storeId: testId(4242),
              deviceId: fixture.context.device.id,
              packageUnitId: graph.basePackage.id,
              name: 'Hijacked',
            },
            { generateId: deterministicIds(13200) },
          ),
        'INVALID_VALUE',
      );
      expectDomainError(
        () =>
          deactivatePackage(
            fixture.adapter,
            {
              storeId: testId(4242),
              deviceId: fixture.context.device.id,
              packageUnitId: graph.basePackage.id,
            },
            { generateId: deterministicIds(13300) },
          ),
        'INVALID_VALUE',
      );
      expect(getPackageUnitById(fixture.adapter, graph.basePackage.id)?.name).toBe('piece');
      expect(countRows(fixture.adapter, 'outbox_operations')).toBe(1);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('deactivates a package, retains it, and falls back preference to the base', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const created = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'carton',
          conversionText: '40',
          setting: { isPreferredForSale: true },
        },
        { generateId: deterministicIds(13300) },
      );
      const before = getStoreProductById(fixture.adapter, graph.storeProduct.id);
      expect(before?.preferredPackageUnitId).toBe(graph.basePackage.id);
      updateStoreProductPreferredPackage(fixture.adapter, graph.storeProduct.id, created.packageUnit.id);
      expect(
        getStoreProductById(fixture.adapter, graph.storeProduct.id)?.preferredPackageUnitId,
      ).toBe(created.packageUnit.id);

      const deactivated = deactivatePackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          packageUnitId: created.packageUnit.id,
        },
        { generateId: deterministicIds(13500) },
      );
      expect(deactivated.packageUnit.status).toBe('INACTIVE');
      expect(deactivated.outbox.operationType).toBe('PACKAGE_DEACTIVATED');
      expect(deactivated.storeProduct.preferredPackageUnitId).toBe(graph.basePackage.id);
      expect(
        getStorePackageSetting(
          fixture.adapter,
          graph.storeProduct.id,
          created.packageUnit.id,
        )?.defaultSellingPriceMinor,
      ).toBeNull();
      const retained = getPackageUnitById(fixture.adapter, created.packageUnit.id);
      expect(retained?.status).toBe('INACTIVE');
      expect(retained?.conversionToBaseMicros).toBe(40_000_000);
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('refuses to deactivate the active base unit', () => {
    const { fixture, graph } = openProductFixture();
    try {
      expectDomainError(
        () =>
          deactivatePackage(
            fixture.adapter,
            {
              storeId: fixture.context.store.id,
              deviceId: fixture.context.device.id,
              packageUnitId: graph.basePackage.id,
            },
            { generateId: deterministicIds(13600) },
          ),
        'INVALID_VALUE',
      );
      expect(getPackageUnitById(fixture.adapter, graph.basePackage.id)?.status).toBe('ACTIVE');
    } finally {
      fixture.closeAndDelete();
    }
  });

  it('replays a repeated package operation ID without duplicating work', () => {
    const { fixture, graph } = openProductFixture();
    try {
      const operationId = testId(999);
      const first = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'pack',
          conversionText: '10',
        },
        { generateId: deterministicIds(13700), operationId },
      );
      const second = createPackage(
        fixture.adapter,
        {
          storeId: fixture.context.store.id,
          deviceId: fixture.context.device.id,
          storeProductId: graph.storeProduct.id,
          name: 'different must not apply',
          conversionText: '99',
        },
        { generateId: deterministicIds(13800), operationId },
      );
      expect(second.packageUnit.id).toBe(first.packageUnit.id);
      expect(second.packageUnit.name).toBe('pack');
      expect(countRows(fixture.adapter, 'package_units')).toBe(2);
      expect(countPendingOutboxOperations(fixture.adapter, fixture.context.store.id)).toBe(2);
    } finally {
      fixture.closeAndDelete();
    }
  });
});
