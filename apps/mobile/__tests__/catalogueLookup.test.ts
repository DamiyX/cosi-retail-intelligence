import { createCatalogueClient } from '../src/catalogue/client';
import { AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createCatalogueSuggestions } from '../src/catalogue/lookup/suggestions';
import { createOpenFoodFactsAdapter, gtin, parseProviderResponse, type CatalogueLookupAdapter, type LookupResult } from '../src/catalogue/lookup/provider';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';
import type { PhotoFiles } from '../src/media/productPhotos';
import { MIGRATIONS, openDatabase } from '../src/db/migrations';
import { openIsolatedDatabase } from '../src/db/testing';
import { provisionStoreContext } from '../src/storeContext/provisionStoreContext';

const code = { value: '5449000011527', type: 'EAN' as const };
const found: LookupResult = { status: 'FOUND', details: { barcode: code.value, name: 'Fanta Orange', brand: 'Fanta', size: '330 ml', source: 'Open Food Facts', sourceUrl: 'https://world.openfoodfacts.org/product/5449000011527', licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/' } };
function deferred() { let resolve!: (result: LookupResult) => void; const promise = new Promise<LookupResult>(r => { resolve = r; }); return { promise, resolve }; }
const signal = () => new AbortController().signal;
beforeEach(() => {
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => DeviceEventEmitter.addListener('test-catalogue-lookup', () => undefined));
});
afterEach(() => { jest.restoreAllMocks(); });

it('only validated UPC/EAN leaves the adapter; QR, URLs, private text and bad checksums never request', async () => {
  const f = openCatalogueFixture();
  const lookup = jest.fn(async () => found);
  const service = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup });
  try {
    for (const invalid of [{ value: code.value, type: 'QR' as const }, { value: 'https://example.test/secret', type: 'QR' as const }, { value: 'STORE-123', type: 'EAN' as const }, { value: '5449000011528', type: 'EAN' as const }]) expect((await service.preview(invalid, signal())).status).toBe('INVALID');
    expect(lookup).not.toHaveBeenCalled();
    AppState.currentState = 'unknown';
    expect((await service.preview(code, signal())).status).toBe('CANCELLED');
    expect(lookup).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    expect(gtin({ value: code.value, type: 'INTERNAL_CODE' } as unknown as Parameters<typeof gtin>[0])).toBeNull();
    expect(gtin({ value: '036000291452', type: 'UPC' })).toBe('0036000291452');
    await service.preview(code, signal());
    expect(lookup).toHaveBeenCalledWith(code.value, expect.any(AbortSignal));
  } finally { f.closeAndDelete(); }
});

it('saves product and sale before lookup resolves, retains unconfirmed details after restart and never changes business snapshots', async () => {
  const f = openCatalogueFixture();
  const pending = deferred();
  const adapter: CatalogueLookupAdapter = { enabled: true, lookup: () => pending.promise };
  const saved = new Set<string>();
  const info = { size: 100, width: 64, height: 64, checksum: 'fixture-content' };
  const files: PhotoFiles = { stage: (_uri, key) => { saved.add(key); return info; }, inspect: key => saved.has(key) ? info : null, uri: key => `file:///private/${key}`, remove: key => { saved.delete(key); }, list: () => [] };
  const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), () => files, adapter);
  try {
    const localPhotoId = catalogue.photos!.stage('file:///cache/fixture.jpg');
    const graph = catalogue.createTemporaryProduct({ name: '', generateTemporaryLabel: true, defaultSellingPriceMinor: 125, lookupCode: code, localPhotoId });
    const mediaRows = f.adapter.getAllRows('SELECT * FROM media_assets');
    expect(catalogue.suggestions!.read(graph.storeProduct.id)?.status).toBe('PENDING');
    const sale = createDatabaseSalesClient(f.adapter).completeSale({ lines: [{ storeProductId: graph.storeProduct.id, packageUnitId: graph.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 125 }], payment: { method: 'CASH' } });
    const saleRows = f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id]);
    const envelopes = f.adapter.getAllRows('SELECT * FROM outbox_operations');
    const refresh = catalogue.suggestions!.refresh(graph.storeProduct.id, signal());
    pending.resolve(found); await refresh;
    expect(catalogue.suggestions!.read(graph.storeProduct.id)).toMatchObject({ status: 'FOUND', details: { name: 'Fanta Orange' } });
    expect(catalogue.getProductDetail(graph.storeProduct.id)!.variant.name).toBe(graph.variant.name);
    expect(f.adapter.getAllRows('SELECT * FROM outbox_operations')).toEqual(envelopes);
    const reopened = reopenDatabase(f.path);
    try { expect(createCatalogueSuggestions(reopened, f.context.store.id).read(graph.storeProduct.id)?.status).toBe('FOUND'); } finally { reopened.close(); }
    catalogue.updateProductIdentity({ storeProductId: graph.storeProduct.id, name: 'My corrected Fanta name' });
    catalogue.suggestions!.decide(graph.storeProduct.id, 'ACCEPTED');
    expect(catalogue.getProductDetail(graph.storeProduct.id)!.product.defaultSellingPriceMinor).toBe(125);
    expect(f.adapter.getAllRows('SELECT * FROM sale_items WHERE sale_id = ?', [sale.sale.id])).toEqual(saleRows);
    expect(f.adapter.getAllRows('SELECT * FROM package_units')).toHaveLength(1);
    expect(f.adapter.getAllRows('SELECT * FROM product_identifiers')).toHaveLength(0);
    expect(f.adapter.getAllRows('SELECT * FROM media_assets')).toEqual(mediaRows);
    expect(catalogue.photos!.read(graph.storeProduct.id).status).toBe('available');
  } finally { f.closeAndDelete(); }
});

it('deduplicates concurrent/repeated barcode requests, shares a persistent cache and retains dismissal', async () => {
  const f = openCatalogueFixture();
  const pending = deferred(); const lookup = jest.fn(() => pending.promise);
  const adapter = { enabled: true, lookup };
  const one = createCatalogueSuggestions(f.adapter, f.context.store.id, adapter);
  const two = createCatalogueSuggestions(f.adapter, f.context.store.id, adapter);
  try {
    const first = one.preview(code, signal()); const second = two.preview(code, signal());
    await Promise.resolve(); expect(lookup).toHaveBeenCalledTimes(1);
    pending.resolve(found); expect(await first).toEqual(found); expect(await second).toEqual(found);
    await one.preview(code, signal()); expect(lookup).toHaveBeenCalledTimes(1);
    const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, adapter);
    const product = catalogue.createTemporaryProduct({ name: 'Temporary', lookupCode: code });
    await one.refresh(product.storeProduct.id, signal()); one.decide(product.storeProduct.id, 'DISMISSED');
    await one.refresh(product.storeProduct.id, signal(), true);
    expect(one.read(product.storeProduct.id)?.status).toBe('DISMISSED');
    const restarted = reopenDatabase(f.path);
    try { expect(createCatalogueSuggestions(restarted, f.context.store.id, adapter).read(product.storeProduct.id)?.status).toBe('DISMISSED'); } finally { restarted.close(); }
  } finally { f.closeAndDelete(); }
});

it.each(['NO_MATCH', 'OFFLINE', 'ERROR', 'RATE_LIMIT'] as const)('backs off %s even on manual retry', async status => {
  const f = openCatalogueFixture(); let clock = Date.now(); const lookup = jest.fn(async (): Promise<LookupResult> => ({ status }));
  const service = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup }, () => clock);
  try {
    expect((await service.preview(code, signal())).status).toBe(status);
    await service.preview(code, signal()); expect(lookup).toHaveBeenCalledTimes(1);
    clock += (status === 'NO_MATCH' ? 86400000 : status === 'RATE_LIMIT' ? 3600000 : 300000) + 1;
    await service.preview(code, signal()); expect(lookup).toHaveBeenCalledTimes(2);
  } finally { f.closeAndDelete(); }
});

it('timeout aborts the provider, prevents hanging checkout work and caches bounded backoff', async () => {
  jest.useFakeTimers(); const f = openCatalogueFixture(); let providerSignal: AbortSignal | undefined;
  const lookup = jest.fn((_code: string, input: AbortSignal) => { providerSignal = input; return new Promise<LookupResult>(() => undefined); });
  const service = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup });
  try {
    const result = service.preview(code, signal()); await Promise.resolve();
    await jest.advanceTimersByTimeAsync(5000);
    expect((await result).status).toBe('TIMEOUT'); expect(providerSignal!.aborted).toBe(true);
    await service.preview(code, signal()); expect(lookup).toHaveBeenCalledTimes(1);
  } finally { f.closeAndDelete(); jest.useRealTimers(); }
});

it('cancelled consumer and late response cannot write suggestions after manual identity edits, enrichment or store switch', async () => {
  const f = openCatalogueFixture(); const pending = deferred(); const adapter = { enabled: true, lookup: () => pending.promise };
  const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, adapter);
  try {
    const product = catalogue.createTemporaryProduct({ name: 'Unfinished', lookupCode: code });
    const controller = new AbortController(); const request = catalogue.suggestions!.refresh(product.storeProduct.id, controller.signal);
    controller.abort(); catalogue.updateProductIdentity({ storeProductId: product.storeProduct.id, name: 'My hand-entered name' });
    const other = createCatalogueSuggestions(f.adapter, testId(9999), adapter);
    expect(other.read(product.storeProduct.id)).toBeNull(); other.decide(product.storeProduct.id, 'ACCEPTED');
    pending.resolve(found); await request;
    expect(catalogue.suggestions!.read(product.storeProduct.id)?.status).toBe('CORRECTED');
    expect(catalogue.getProductDetail(product.storeProduct.id)!.variant.name).toBe('My hand-entered name');
    catalogue.markProductEnriched({ storeProductId: product.storeProduct.id });
    await catalogue.suggestions!.refresh(product.storeProduct.id, signal(), true);
    expect(catalogue.suggestions!.read(product.storeProduct.id)?.details).toBeNull();
  } finally { f.closeAndDelete(); }
});

it('local known mappings have priority and default clients never enable network', async () => {
  const f = openCatalogueFixture(); const lookup = jest.fn(async () => found);
  try {
    const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000));
    expect(catalogue.suggestions!.enabled).toBe(false);
    const product = catalogue.createTemporaryProduct({ name: 'Known Fanta', barcode: code.value });
    expect(catalogue.suggestions!.read(product.storeProduct.id)?.status).toBe('DISABLED');
    const enabled = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup });
    expect((await enabled.preview(code, signal())).status).toBe('LOCAL_MATCH'); expect(lookup).not.toHaveBeenCalled();
  } finally { f.closeAndDelete(); }
});

it('persistent request budgets bound distinct requests to ten/minute and one active request', async () => {
  const f = openCatalogueFixture(); const lookup = jest.fn(async (): Promise<LookupResult> => ({ status: 'NO_MATCH' }));
  const service = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup });
  const validCode = (n: number) => { const base = `123456789${String(n).padStart(3, '0')}`; let sum = 0; for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3); return { type: 'EAN' as const, value: base + String((10 - sum % 10) % 10) }; };
  try {
    for (let i = 0; i < 10; i++) expect((await service.preview(validCode(i), signal())).status).toBe('NO_MATCH');
    expect((await service.preview(validCode(10), signal())).status).toBe('RATE_LIMIT'); expect(lookup).toHaveBeenCalledTimes(10);
    const restarted = reopenDatabase(f.path);
    try { expect((await createCatalogueSuggestions(restarted, f.context.store.id, { enabled: true, lookup }).preview(validCode(11), signal())).status).toBe('RATE_LIMIT'); } finally { restarted.close(); }
  } finally { f.closeAndDelete(); }
});

it('strictly parses v3 responses, rejects barcode mismatch, malformed, oversized and bad fields', () => {
  const response = (product: unknown) => JSON.stringify({ status: 'success', product });
  expect(parseProviderResponse(response({ code: code.value, product_name: 'Fanta', brands: 'Fanta', quantity: '330 ml' }), code.value).status).toBe('FOUND');
  expect(parseProviderResponse(response({ code: '6922420651355', product_name: 'Wrong can' }), code.value).status).toBe('INVALID');
  for (const raw of ['{', '[]', 'x'.repeat(33000), '\ud800', response({ code: code.value, product_name: 'x'.repeat(301) }), JSON.stringify({ status: 1, product: {} })]) expect(parseProviderResponse(raw, code.value).status).not.toBe('FOUND');
});

it('stops a foreground request on background and does not save late results after barcode mutation', async () => {
  const f = openCatalogueFixture(); const pending = deferred(); let changed: ((state: AppStateStatus) => void) | undefined;
  let transportSignal: AbortSignal | undefined;
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { changed = callback; return DeviceEventEmitter.addListener('test-lookup-lifecycle', () => undefined); });
  const adapter: CatalogueLookupAdapter = { enabled: true, lookup: (_code, requestSignal) => { transportSignal = requestSignal; return pending.promise; } };
  const client = createCatalogueClient(f.adapter, f.context.store, f.context.device, deterministicIds(1000), undefined, adapter);
  try {
    const product = client.createTemporaryProduct({ name: 'Temporary', lookupCode: code });
    const request = client.suggestions!.refresh(product.storeProduct.id, signal());
    await Promise.resolve(); changed!('background'); await request;
    expect(transportSignal!.aborted).toBe(true);
    expect(f.adapter.getAllRows('SELECT * FROM catalogue_lookup_cache')).toHaveLength(0);
    client.addProductIdentifier({ storeProductId: product.storeProduct.id, type: 'EAN', value: '6922420651355' });
    pending.resolve(found); await Promise.resolve();
    expect(client.suggestions!.read(product.storeProduct.id)?.status).toBe('CORRECTED');
    expect(client.suggestions!.read(product.storeProduct.id)?.details).toBeNull();
  } finally { subscription.mockRestore(); f.closeAndDelete(); }
});

it('does not queue other codes behind a hanging request and enforces the daily budget across minute windows', async () => {
  const f = openCatalogueFixture(); const pending = deferred(); const lookup = jest.fn(() => pending.promise);
  const first = createCatalogueSuggestions(f.adapter, f.context.store.id, { enabled: true, lookup });
  try {
    const active = first.preview(code, signal()); await Promise.resolve();
    expect((await first.preview({ value: '6922420651355', type: 'EAN' }, signal())).status).toBe('RATE_LIMIT');
    expect(lookup).toHaveBeenCalledTimes(1); pending.resolve(found); await active;
    // Seed the persisted daily ceiling; prove minute availability does not bypass it.
    const day = Math.floor(Date.now() / 86400000);
    f.adapter.run('UPDATE catalogue_lookup_budget SET attempts = 100 WHERE kind = ? AND window = ?', ['DAY', day]);
    f.adapter.run('DELETE FROM catalogue_lookup_budget WHERE kind = ?', ['MINUTE']);
    expect((await first.preview({ value: '6922420651355', type: 'EAN' }, signal())).status).toBe('RATE_LIMIT');
    expect(lookup).toHaveBeenCalledTimes(1);
  } finally { f.closeAndDelete(); }
});

it('adapter requires reviewed terms/contact and sends only bounded barcode fields without private data', async () => {
  const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, url: '', redirected: false, headers: new Headers({ 'content-type': 'application/json' }), text: async () => JSON.stringify({ status: 'success', product: { code: code.value, product_name: 'Fanta' } }) })) as unknown as jest.MockedFunction<typeof fetch>;
  const userAgent = 'Retail/0.0.1 (test@example.test)';
  expect(createOpenFoodFactsAdapter({ termsApproved: false, userAgent, fetchImpl }).enabled).toBe(false);
  expect(createOpenFoodFactsAdapter({ termsApproved: true, userAgent: 'Retail', fetchImpl }).enabled).toBe(false);
  const adapter = createOpenFoodFactsAdapter({ termsApproved: true, userAgent, fetchImpl });
  expect((await adapter.lookup(code.value, signal())).status).toBe('FOUND');
  expect(fetchImpl).toHaveBeenCalledWith(`https://world.openfoodfacts.org/api/v3.6/product/${code.value}.json?fields=code,product_name,brands,quantity`, expect.objectContaining({ method: 'GET', redirect: 'error', credentials: 'omit', headers: { 'User-Agent': userAgent, Accept: 'application/json' } }));
  expect(JSON.stringify(fetchImpl.mock.calls)).not.toMatch(/storeId|userId|deviceId|price|stock|photo|Authorization|body/);
});

it('upgrades schema25 without changing an existing product, private photo, sale or outbox', () => {
  const legacy = openIsolatedDatabase(MIGRATIONS.slice(0, 25));
  try {
    const context = provisionStoreContext(legacy.adapter, { ownerDisplayName: 'Fixture owner', storeName: 'Fixture shop', currencyCode: 'NGN', countryCode: 'NG', timezone: 'Africa/Lagos', deviceLabel: 'Fixture phone', appVersion: '0.0.1' }, { generateId: deterministicIds(100) });
    const client = createCatalogueClient(legacy.adapter, context.store, context.device, deterministicIds(1000));
    const product = client.createTemporaryProduct({ name: 'Existing temporary item', defaultSellingPriceMinor: 125 });
    legacy.adapter.run('INSERT INTO media_assets(id, store_id, store_product_id, file_key, byte_size, width, height, checksum, created_at) VALUES (?, ?, ?, ?, 100, 64, 64, ?, ?)', [testId(9000), context.store.id, product.storeProduct.id, `${testId(9000)}.jpg`, 'fixture', '2026-09-30T00:00:00Z']);
    createDatabaseSalesClient(legacy.adapter).completeSale({ lines: [{ storeProductId: product.storeProduct.id, packageUnitId: product.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 125 }], payment: { method: 'CASH' } });
    const tables = ['store_products', 'product_variants', 'media_assets', 'sales', 'sale_items', 'inventory_events', 'outbox_operations'];
    const before = tables.map(table => legacy.adapter.getAllRows(`SELECT * FROM ${table}`));
    expect(openDatabase(legacy.adapter).schemaVersion).toBe(26);
    expect(tables.map(table => legacy.adapter.getAllRows(`SELECT * FROM ${table}`))).toEqual(before);
    expect(legacy.adapter.getAllRows('SELECT * FROM catalogue_lookup_suggestions')).toHaveLength(0);
  } finally { legacy.closeAndDelete(); }
});
