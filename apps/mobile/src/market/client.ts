import {
  parseMarketControlRequest, parseMarketControlResult, parseMarketReadResponse, validateMarketKeys,
  type MarketKey, type MarketReadResponse, type MarketResult,
} from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';
import { generateMobileId } from '../crypto/mobileIds';
import { clearMarketCache, marketCacheIdentity, marketContext, readMarketCacheIdentity, readMarketControl, saveMarketControl } from './storage';
import { disabledMarketTransport, type MarketTransport } from './transport';

export interface MarketClientOptions {
  storeId: string; userId: string; deviceId: string;
  transport?: MarketTransport; generateId?: () => string; now?: () => number;
}

/** Recheck present local authority, never fall back to another owner/device. Server RPC rechecks auth. */
function assertAuthority(db: DatabaseAdapter, options: MarketClientOptions, transport: MarketTransport): void {
  if (transport.authenticatedUserId !== options.userId || !db.getFirstRow(
    `SELECT s.id FROM stores s
     JOIN store_members m ON m.store_id=s.id AND m.user_id=?
     JOIN users u ON u.id=m.user_id
     JOIN devices d ON d.store_id=s.id AND d.user_id=u.id AND d.id=?
     JOIN sync_store_state sync ON sync.store_id=s.id AND sync.device_id=d.id
     WHERE s.id=? AND s.status='ACTIVE' AND m.status='ACTIVE' AND m.role='OWNER'
       AND u.status='ACTIVE' AND d.status='ACTIVE' AND sync.status NOT IN ('UNINITIALIZED','BOOTSTRAPPING');`, [options.userId, options.deviceId, options.storeId])) {
    throw new Error('An authenticated active owner and enrolled active device are required.');
  }
}

export function createMarketClient(db: DatabaseAdapter, options: MarketClientOptions) {
  const transport = options.transport ?? disabledMarketTransport;
  const now = options.now ?? Date.now;
  const storeId = options.storeId;
  const guard = () => assertAuthority(db, options, transport);
  const availableGuard = () => { if (!transport.available) throw new Error('Market prices are unavailable. Nothing was sent.'); guard(); };
  const isExpired = (result: MarketResult): boolean => result.status === 'AVAILABLE' &&
    (Date.parse(result.validUntil) <= now() || Date.parse(result.calculatedAt) > now());
  let busy = false;
  const identityContext = (key: MarketKey): string => {
    const row = db.getFirstRow<Record<string,string | number>>(
      `SELECT v.id variant,p.id package,p.conversion_to_base_micros conversion,v.updated_at variantUpdated,
        p.updated_at packageUpdated,s.status storeProductStatus,v.status variantStatus,p.status packageStatus
       FROM store_products s JOIN product_variants v ON v.id=s.product_variant_id
       JOIN package_units p ON p.product_variant_id=v.id WHERE s.store_id=? AND v.id=? AND p.id=?
         AND s.status='ACTIVE' AND v.status='ACTIVE' AND p.status='ACTIVE'
         AND NOT EXISTS(SELECT 1 FROM outbox_operations o WHERE o.store_id=s.store_id
           AND o.status<>'SYNCED' AND o.entity_id IN (s.id,v.id,p.id));`,
      [storeId,key.productVariantId,key.packageUnitId]);
    return JSON.stringify(row);
  };

  async function reconcile(): Promise<void> {
    availableGuard();
    if (busy) throw new Error('Market request already in progress.');
    busy = true;
    try {
      const before = readMarketControl(db, storeId);
      const result = parseMarketControlResult(await transport.state({
        storeId, deviceId: options.deviceId, operationId: before.pending?.operationId ?? null,
      }));
      guard();
      if (result.state.storeId !== storeId || result.operationId !== (before.pending?.operationId ?? null)) throw new Error('Market state scope mismatch');
      applyResult(result, before.epoch, false);
    } finally { busy = false; }
  }

  function applyResult(result: ReturnType<typeof parseMarketControlResult>, epoch: number, sent: boolean): void {
    db.transaction(() => {
      guard();
      const local = readMarketControl(db, storeId);
      if (local.epoch !== epoch) return;
      if (result.state.version < (local.acknowledgement?.version ?? 0)) throw new Error('Stale market acknowledgement');
      if (local.pending && result.operationId !== local.pending.operationId) throw new Error('Market operation mismatch');
      const unresolved = result.status === 'NOT_FOUND' && local.pending !== null;
      // A locally revoked uncertain enable is fenced by a NEW expected-version
      // disable. Do not resend enable: even a currently-OFF server advances its
      // version on disable, rejecting any delayed old enable.
      const fenceRevoke = unresolved && local.disableRequested && local.pending?.enabled === true;
      const nextPending = fenceRevoke ? parseMarketControlRequest({ policyVersion: 1, storeId,
        deviceId: options.deviceId, operationId: (options.generateId ?? generateMobileId)(),
        expectedVersion: result.state.version, enabled: false, zoneId: null }) : unresolved ? local.pending : null;
      const contextChanged = !local.acknowledgement || marketContext(local.acknowledgement) !== marketContext(result.state);
      if (contextChanged || !result.state.enabled || !result.state.available) clearMarketCache(db, storeId);
      saveMarketControl(db, storeId, {
        ...local, acknowledgement: result.state, pending: nextPending,
        disableRequested: fenceRevoke || (local.disableRequested && result.state.enabled),
        localOff: unresolved ? local.localOff : local.disableRequested || !result.state.enabled || !result.state.available ||
          (local.pending?.enabled === false && result.status !== 'APPLIED'),
        epoch: local.epoch + (unresolved && !fenceRevoke ? 0 : 1),
        cacheContext: contextChanged ? null : local.cacheContext,
        message: unresolved ? 'Unconfirmed. Retry the same request when online.' :
          result.status === 'CONFLICT' ? 'Conflict. Review confirmed state before another change.' :
            result.status === 'DISABLED' ? 'Market service is disabled. Contribution remains unavailable.' :
              sent ? 'Server confirmation received.' : null,
      });
    });
  }

  async function sendPending(): Promise<void> {
    availableGuard();
    if (busy) throw new Error('Market request already in progress.');
    const local = readMarketControl(db, storeId);
    if (!local.pending) return;
    if (local.pending.storeId !== storeId || local.pending.deviceId !== options.deviceId)
      throw new Error('Pending control belongs to another store or device. Reconcile it before retrying.');
    busy = true;
    try {
      const result = parseMarketControlResult(await transport.control(local.pending));
      guard();
      if (result.state.storeId !== storeId || result.operationId !== local.pending.operationId || result.status === 'NOT_FOUND') throw new Error('Market control response mismatch');
      applyResult(result, local.epoch, true);
    } catch (error) {
      // Never discard an uncertain operation. Reconciliation precedes another intent.
      db.transaction(() => {
        guard();
        const current = readMarketControl(db, storeId);
        if (current.epoch === local.epoch) saveMarketControl(db, storeId, { ...current, message: 'Confirmation pending. Reconcile before another change.' });
      });
      throw error;
    } finally { busy = false; }
  }

  return {
    available: transport.available,
    getControl() { guard(); return readMarketControl(db, storeId); },
    reconcile,
    async requestControl(enabled: boolean, zoneId: string | null, informed: boolean): Promise<void> {
      availableGuard();
      const local = readMarketControl(db, storeId);
      if (busy || local.pending) throw new Error('Reconcile the pending operation first.');
      if (!local.acknowledgement) throw new Error('Read server state before changing contribution.');
      if (enabled && (!informed || !local.acknowledgement.zones.some(z => z.id === zoneId))) throw new Error('Explicit informed consent and an approved zone are required.');
      const pending = parseMarketControlRequest({
        policyVersion: 1, storeId, deviceId: options.deviceId, operationId: (options.generateId ?? generateMobileId)(),
        expectedVersion: local.acknowledgement.version, enabled, zoneId: enabled ? zoneId : null,
      });
      db.transaction(() => {
        guard();
        clearMarketCache(db, storeId);
        saveMarketControl(db, storeId, { ...local, pending, disableRequested: !enabled, localOff: true, epoch: local.epoch + 1, cacheContext: null, message: 'Confirmation pending. Contribution is locally off.' });
      });
      await sendPending();
    },
    /** Offline revocation suppresses display now; it grants no server authority. */
    queueDisable() {
      guard();
      const local = readMarketControl(db, storeId);
      db.transaction(() => {
        guard();
        clearMarketCache(db, storeId);
        saveMarketControl(db, storeId, { ...local, localOff: true, disableRequested: true, epoch: local.epoch + 1,
          cacheContext: null, message: 'Locally off. Server confirmation is still required.' });
      });
    },
    async retryPending() {
      await reconcile();
      if (readMarketControl(db, storeId).pending) await sendPending();
      const current = readMarketControl(db, storeId);
      if (current.disableRequested && !current.pending && current.acknowledgement?.enabled) {
        const pending = parseMarketControlRequest({ policyVersion: 1, storeId, deviceId: options.deviceId,
          operationId: (options.generateId ?? generateMobileId)(), expectedVersion: current.acknowledgement.version,
          enabled: false, zoneId: null });
        db.transaction(() => {
          guard();
          saveMarketControl(db, storeId, { ...current, pending, localOff: true, epoch: current.epoch + 1 });
        });
        await sendPending();
      }
    },
    async refresh(keysValue: readonly MarketKey[]): Promise<void> {
      availableGuard();
      const keys = validateMarketKeys(keysValue);
      const identitySnapshots = keys.map(identityContext);
      const local = readMarketControl(db, storeId);
      if (local.localOff || local.pending || !local.acknowledgement?.enabled) throw new Error('Market results are unavailable while contribution is off or pending.');
      const response = parseMarketReadResponse(await transport.read({ storeId, deviceId: options.deviceId, keys }));
      guard();
      const keyString = (key: MarketKey) => `${key.productVariantId}/${key.packageUnitId}`;
      if (response.storeId !== storeId || response.controlVersion !== local.acknowledgement.version ||
          response.generation !== local.acknowledgement.generation ||
          JSON.stringify(response.zone) !== JSON.stringify(local.acknowledgement.zone) ||
          response.results.length !== keys.length || response.results.some(r => !keys.some(k => keyString(k) === keyString(r.key)))) {
        throw new Error('Market response scope mismatch');
      }
      if (response.results.some(result => result.status === 'AVAILABLE' && identityContext(result.key) === 'null'))
        throw new Error('Market package identity is not locally accepted and current');
      db.transaction(() => {
        guard();
        const current = readMarketControl(db, storeId);
        if (current.epoch !== local.epoch || current.localOff || current.pending || response.revision < current.cacheRevision) return;
        if (keys.some((key,index) => identityContext(key) !== identitySnapshots[index])) {
          clearMarketCache(db,storeId);
          saveMarketControl(db,storeId,{ ...current,epoch:current.epoch+1,cacheContext:null });
          return;
        }
        const oldRows = db.getAllRows<{ response: string; local_identity_context: string }>(
          'SELECT response,local_identity_context FROM market_cache WHERE store_id=?;', [storeId]);
        const oldEntries = oldRows.map(row => ({ response:parseMarketReadResponse(JSON.parse(row.response)),
          identity:readMarketCacheIdentity(row.local_identity_context) }));
        const sameRevision = response.revision === current.cacheRevision && current.cacheContext !== null;
        // Replacement changes the visible requested set, but omitted tombstones
        // must survive replacement/restart until a newer release or control context.
        const replacement = sameRevision ? oldEntries.filter(entry =>
          !keys.some(key => keyString(key) === keyString(entry.response.results[0].key)) &&
          (entry.response.results[0].status !== 'AVAILABLE' || entry.identity.expired || isExpired(entry.response.results[0])))
          .map(entry => ({ ...entry,identity:{ ...entry.identity,visible:false,
            expired:entry.identity.expired || isExpired(entry.response.results[0]) } })) : [];
        for (const result of response.results) {
          const old = oldEntries.find(entry => keyString(entry.response.results[0].key) === keyString(result.key));
          if (old && result.status === 'AVAILABLE' && result.mappingVersion < old.response.results[0].mappingVersion)
            throw new Error('Stale market mapping version');
          // Existing numerics remain immutable at this revision. A new key may
          // be admitted, while an AVAILABLE reply cannot overwrite a tombstone.
          const entry = sameRevision && old && result.status === 'AVAILABLE' ? old : {
            response:{ ...response,results:[result] },identity:{ identityContext:identityContext(result.key),visible:true,expired:false },
          };
          replacement.push({ ...entry,identity:{ ...entry.identity,visible:true,
            expired:entry.identity.expired || isExpired(entry.response.results[0]) } });
        }
        // All retained protections share the existing 100-row bound. Fail
        // atomically rather than evicting a fence and resurrecting old numerics.
        if (replacement.length > 100) throw new Error('Market cache protection limit reached. Refresh after a newer release.');
        clearMarketCache(db, storeId);
        for (const entry of replacement) db.run(
          'INSERT INTO market_cache(store_id, product_variant_id, package_unit_id, response, local_identity_context) VALUES (?, ?, ?, ?, ?);',
          [storeId,entry.response.results[0].key.productVariantId,entry.response.results[0].key.packageUnitId,
            JSON.stringify(entry.response),marketCacheIdentity(entry.identity.identityContext,entry.identity.visible,entry.identity.expired)]);
        saveMarketControl(db, storeId, { ...current, cacheRevision: response.revision, cacheContext: marketContext(local.acknowledgement!) });
      });
    },
    getSaved(): { status: 'SAVED' | 'EXPIRED'; result: MarketResult; response: MarketReadResponse }[] {
      guard();
      const local = readMarketControl(db, storeId);
      if (!transport.available || local.localOff || local.pending || !local.acknowledgement?.enabled ||
          local.cacheContext !== marketContext(local.acknowledgement)) return [];
      const rows = db.getAllRows<{ response: string; local_identity_context: string }>('SELECT response,local_identity_context FROM market_cache WHERE store_id=?;', [storeId])
        .map(row => ({ response:parseMarketReadResponse(JSON.parse(row.response)),identity:readMarketCacheIdentity(row.local_identity_context) }))
        .filter(row => row.identity.visible);
      if (rows.some(row => identityContext(row.response.results[0].key) !== row.identity.identityContext)) {
        db.transaction(() => {
          guard();
          clearMarketCache(db,storeId);
          saveMarketControl(db,storeId,{ ...local,epoch:local.epoch+1,cacheContext:null });
        });
        return [];
      }
      return rows
        .map(row => {
          const response = row.response;
          if (response.storeId !== storeId || response.controlVersion !== local.acknowledgement!.version ||
              response.generation !== local.acknowledgement!.generation || response.revision !== local.cacheRevision ||
              JSON.stringify(response.zone) !== JSON.stringify(local.acknowledgement!.zone)) throw new Error('Saved market context mismatch');
          const result = response.results[0];
          const expired = row.identity.expired || isExpired(result);
          if (expired && !row.identity.expired) db.transaction(() => {
            guard();
            db.run('UPDATE market_cache SET local_identity_context=? WHERE store_id=? AND product_variant_id=? AND package_unit_id=?;',
              [marketCacheIdentity(row.identity.identityContext,true,true),storeId,result.key.productVariantId,result.key.packageUnitId]);
          });
          return { status: expired ? 'EXPIRED' as const : 'SAVED' as const, result, response };
        });
    },
    getProducts(): (MarketKey & { name: string; packageName: string })[] {
      guard();
      return db.getAllRows<{ productVariantId: string; packageUnitId: string; name: string; packageName: string }>(
        `SELECT v.id productVariantId,p.id packageUnitId,v.name,p.name packageName FROM store_products s
         JOIN product_variants v ON v.id=s.product_variant_id JOIN package_units p ON p.product_variant_id=v.id
         WHERE s.store_id=? AND s.status='ACTIVE' AND v.status='ACTIVE' AND p.status='ACTIVE' AND p.is_purchasable=1
         ORDER BY v.name,p.name,p.id LIMIT 100;`, [storeId]);
    },
  };
}

export type MarketClient = ReturnType<typeof createMarketClient>;
