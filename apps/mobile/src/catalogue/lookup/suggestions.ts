import type { DatabaseAdapter } from '../../db/adapter';
import { AppState } from 'react-native';
import { disabledLookup, gtin, type CatalogueLookupAdapter, type LookupCode, type LookupResult, type SuggestedDetails } from './provider';

type Decision = 'ACCEPTED' | 'DISMISSED' | 'CORRECTED';
export type Suggestion = { barcode: string; status: LookupResult['status'] | Decision | 'PENDING'; details: SuggestedDetails | null };
export interface CatalogueSuggestions {
  readonly enabled: boolean;
  preview(code: LookupCode, signal: AbortSignal): Promise<LookupResult>;
  remember(productId: string, code: LookupCode): void;
  read(productId: string): Suggestion | null;
  refresh(productId: string, signal: AbortSignal, manual?: boolean): Promise<void>;
  decide(productId: string, decision: Decision): void;
}
interface Row { barcode: string; status: Suggestion['status']; details: string | null; identity_name: string; identity_version: number; identifier_snapshot: string; request_version: number }
const terminal = (status: string) => ['ACCEPTED', 'DISMISSED', 'CORRECTED'].includes(status);
const brokers = new WeakMap<DatabaseAdapter, Map<CatalogueLookupAdapter, ReturnType<typeof createBroker>>>();

function createBroker(db: DatabaseAdapter, adapter: CatalogueLookupAdapter, now: () => number) {
  // One active request per adapter/database. Other barcodes return a retryable status, never form an unbounded queue.
  let active: { barcode: string; promise: Promise<LookupResult> } | null = null;
  return async (barcode: string, signal: AbortSignal): Promise<LookupResult> => {
    if (signal.aborted) return { status: 'CANCELLED' };
    if (AppState.currentState && AppState.currentState !== 'active') return { status: 'CANCELLED' };
    if (!adapter.enabled) return { status: 'DISABLED' };
    const cached = db.getFirstRow<{ result: string; expires_at: number }>('SELECT result, expires_at FROM catalogue_lookup_cache WHERE barcode = ?', [barcode]);
    if (cached && cached.expires_at > now()) return JSON.parse(cached.result) as LookupResult;
    if (active) return active.barcode === barcode ? active.promise : { status: 'RATE_LIMIT' };
    const started = now();
    const budget = db.transaction(() => {
      const windows = [[Math.floor(started / 60000), 10, 'MINUTE'], [Math.floor(started / 86400000), 100, 'DAY']] as const;
      for (const [window, limit, kind] of windows) {
        const row = db.getFirstRow<{ attempts: number }>('SELECT attempts FROM catalogue_lookup_budget WHERE kind = ? AND window = ?', [kind, window]);
        if ((row?.attempts ?? 0) >= limit) return false;
      }
      for (const [window, , kind] of windows) db.run('INSERT INTO catalogue_lookup_budget(kind, window, attempts) VALUES (?, ?, 1) ON CONFLICT(kind, window) DO UPDATE SET attempts = attempts + 1', [kind, window]);
      db.run('DELETE FROM catalogue_lookup_budget WHERE (kind = ? AND window < ?) OR (kind = ? AND window < ?)', ['MINUTE', Math.floor(started / 60000) - 1, 'DAY', Math.floor(started / 86400000) - 1]);
      return true;
    });
    if (!budget) return { status: 'RATE_LIMIT' };
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const timed = new Promise<LookupResult>(resolve => { timeout = setTimeout(() => { controller.abort(); resolve({ status: 'TIMEOUT' }); }, 5000); });
    let background: ReturnType<typeof AppState.addEventListener>;
    const foreground = new Promise<LookupResult>(resolve => { background = AppState.addEventListener('change', state => { if (state !== 'active') { controller.abort(); resolve({ status: 'CANCELLED' }); } }); });
    const promise = Promise.race([Promise.resolve().then(() => adapter.lookup(barcode, controller.signal)).catch((): LookupResult => ({ status: 'ERROR' })), timed, foreground]).then(result => {
      if (result.status === 'CANCELLED') return result;
      const ttl = result.status === 'FOUND' ? 7 * 86400000 : result.status === 'NO_MATCH' ? 86400000 : result.status === 'RATE_LIMIT' ? 3600000 : 300000;
      db.run('INSERT INTO catalogue_lookup_cache(barcode, result, expires_at) VALUES (?, ?, ?) ON CONFLICT(barcode) DO UPDATE SET result = excluded.result, expires_at = excluded.expires_at', [barcode, JSON.stringify(result), now() + ttl]);
      db.run('DELETE FROM catalogue_lookup_cache WHERE barcode IN (SELECT barcode FROM catalogue_lookup_cache ORDER BY expires_at DESC LIMIT -1 OFFSET 1000)');
      return result;
    }).finally(() => { clearTimeout(timeout); background.remove(); active = null; });
    active = { barcode, promise };
    // A cancelled consumer cannot mutate product metadata. Shared public response caching may still finish.
    return promise;
  };
}

export function createCatalogueSuggestions(db: DatabaseAdapter, storeId: string, adapter: CatalogueLookupAdapter = disabledLookup, now: () => number = Date.now): CatalogueSuggestions {
  let adapters = brokers.get(db);
  if (!adapters) { adapters = new Map(); brokers.set(db, adapters); }
  let lookup = adapters.get(adapter);
  if (!lookup) { lookup = createBroker(db, adapter, now); adapters.set(adapter, lookup); }
  const product = (productId: string) => db.getFirstRow<{ name: string; version: number; is_temporary: number; status: string }>(`SELECT pv.name, sp.version, sp.is_temporary, sp.status FROM store_products sp JOIN product_variants pv ON pv.id = sp.product_variant_id WHERE sp.id = ? AND sp.store_id = ?`, [productId, storeId]);
  const row = (id: string) => db.getFirstRow<Row>('SELECT * FROM catalogue_lookup_suggestions WHERE store_id = ? AND store_product_id = ?', [storeId, id]);
  const identifiers = (id: string) => JSON.stringify(db.getAllRows(`SELECT pi.type, pi.normalized_value, pi.package_unit_id, pi.status FROM product_identifiers pi JOIN store_products sp ON sp.product_variant_id = pi.product_variant_id WHERE sp.id = ? AND sp.store_id = ? ORDER BY pi.id`, [id, storeId]));
  const locallyKnown = (barcode: string, exceptId = '') => Boolean(db.getFirstRow(`SELECT sp.id FROM store_products sp JOIN product_identifiers pi ON pi.product_variant_id = sp.product_variant_id WHERE sp.store_id = ? AND sp.id <> ? AND sp.status = 'ACTIVE' AND pi.status = 'ACTIVE' AND pi.type IN ('EAN','UPC') AND (pi.normalized_value = ? OR (pi.type = 'UPC' AND '0' || pi.normalized_value = ?)) LIMIT 1`, [storeId, exceptId, barcode, barcode]));
  const service: CatalogueSuggestions = {
    enabled: adapter.enabled,
    async preview(code, signal) {
      const barcode = gtin(code);
      if (!barcode) return { status: 'INVALID' };
      if (locallyKnown(barcode)) return { status: 'LOCAL_MATCH' };
      const result = await lookup!(barcode, signal);
      return signal.aborted ? { status: 'CANCELLED' } : result;
    },
    remember(productId, code) {
      const barcode = gtin(code);
      const owned = product(productId);
      if (!barcode || !owned || !owned.is_temporary || owned.status !== 'ACTIVE') return;
      if (locallyKnown(barcode, productId)) return;
      const previous = row(productId);
      if (previous) return; // Retained scanned identity never silently follows later edited barcodes.
      db.run('INSERT INTO catalogue_lookup_suggestions(store_id, store_product_id, barcode, status, identity_name, identity_version, identifier_snapshot, request_version) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [storeId, productId, barcode, adapter.enabled ? 'PENDING' : 'DISABLED', owned.name, owned.version, identifiers(productId)]);
      void service.refresh(productId, new AbortController().signal).catch(() => { /* Optional metadata must not fail checkout. */ });
    },
    read(productId) {
      const owned = product(productId);
      const stored = row(productId);
      if (!owned || !stored) return null;
      const stale = !terminal(stored.status) && (!owned.is_temporary || owned.name !== stored.identity_name || owned.version !== stored.identity_version || identifiers(productId) !== stored.identifier_snapshot);
      return { barcode: stored.barcode, status: stale ? 'CORRECTED' : stored.status, details: stored.details ? JSON.parse(stored.details) as SuggestedDetails : null };
    },
    async refresh(productId, signal, manual = false) {
      const stored = row(productId);
      const owned = product(productId);
      if (!stored || !owned || signal.aborted || terminal(stored.status) || !owned.is_temporary || owned.status !== 'ACTIVE') return;
      if (locallyKnown(stored.barcode, productId)) return;
      if (owned.name !== stored.identity_name || owned.version !== stored.identity_version || identifiers(productId) !== stored.identifier_snapshot) { service.decide(productId, 'CORRECTED'); return; }
      if (!manual && stored.status === 'FOUND') return;
      const version = stored.request_version + 1;
      db.run('UPDATE catalogue_lookup_suggestions SET request_version = ? WHERE store_id = ? AND store_product_id = ?', [version, storeId, productId]);
      const result = await lookup!(stored.barcode, signal);
      const currentProduct = product(productId);
      const current = row(productId);
      if (signal.aborted || !current || !currentProduct || terminal(current.status) || current.request_version !== version || current.barcode !== stored.barcode || currentProduct.name !== stored.identity_name || currentProduct.version !== stored.identity_version || identifiers(productId) !== stored.identifier_snapshot || !currentProduct.is_temporary || currentProduct.status !== 'ACTIVE') return;
      db.run('UPDATE catalogue_lookup_suggestions SET status = ?, details = ? WHERE store_id = ? AND store_product_id = ? AND request_version = ?', [result.status, result.status === 'FOUND' ? JSON.stringify(result.details) : null, storeId, productId, version]);
    },
    decide(productId, decision) {
      if (!product(productId)) return;
      db.run('UPDATE catalogue_lookup_suggestions SET status = ?, request_version = request_version + 1 WHERE store_id = ? AND store_product_id = ?', [decision, storeId, productId]);
    },
  };
  return service;
}
