import { parseMarketControlRequest, parseMarketState, type MarketControlRequest, type MarketState } from '@retail/contracts';

import type { DatabaseAdapter } from '../db/adapter';

export interface MarketLocalControl {
  acknowledgement: MarketState | null;
  pending: MarketControlRequest | null;
  localOff: boolean;
  disableRequested: boolean;
  epoch: number;
  cacheRevision: number;
  cacheContext: string | null;
  message: string | null;
}

export function readMarketControl(db: DatabaseAdapter, storeId: string): MarketLocalControl {
  const row = db.getFirstRow<{
    acknowledgement: string | null; pending_request: string | null; local_off: number;
    epoch: number; cache_revision: number; cache_context: string | null; message: string | null; disable_requested: number;
  }>('SELECT * FROM market_control WHERE store_id = ?;', [storeId]);
  return row ? {
    acknowledgement: row.acknowledgement ? parseMarketState(JSON.parse(row.acknowledgement)) : null,
    pending: row.pending_request ? parseMarketControlRequest(JSON.parse(row.pending_request)) : null,
    localOff: row.local_off === 1, disableRequested: row.disable_requested === 1, epoch: row.epoch, cacheRevision: row.cache_revision,
    cacheContext: row.cache_context, message: row.message,
  } : { acknowledgement: null, pending: null, localOff: true, disableRequested: false, epoch: 0, cacheRevision: 0, cacheContext: null, message: null };
}

export function saveMarketControl(db: DatabaseAdapter, storeId: string, value: MarketLocalControl): void {
  db.run(`INSERT INTO market_control
    (store_id, acknowledgement, pending_request, local_off, epoch, cache_revision, cache_context, message, disable_requested)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(store_id) DO UPDATE SET acknowledgement=excluded.acknowledgement,
      pending_request=excluded.pending_request, local_off=excluded.local_off, epoch=excluded.epoch,
      cache_revision=excluded.cache_revision, cache_context=excluded.cache_context, message=excluded.message,
      disable_requested=excluded.disable_requested;`,
  [storeId, value.acknowledgement ? JSON.stringify(value.acknowledgement) : null,
    value.pending ? JSON.stringify(value.pending) : null, value.localOff ? 1 : 0,
    value.epoch, value.cacheRevision, value.cacheContext, value.message, value.disableRequested ? 1 : 0]);
}

export function clearMarketCache(db: DatabaseAdapter, storeId: string): void {
  db.run('DELETE FROM market_cache WHERE store_id = ?;', [storeId]);
}

export interface MarketCacheIdentity {
  identityContext: string;
  visible: boolean;
  expired: boolean;
}

/** Private cache metadata only. Read the original identity-only encoding too. */
export function readMarketCacheIdentity(value: string): MarketCacheIdentity {
  const metadata: unknown = JSON.parse(value);
  if (metadata && typeof metadata === 'object' && 'identityContext' in metadata &&
      typeof metadata.identityContext === 'string' && 'visible' in metadata && typeof metadata.visible === 'boolean' &&
      'expired' in metadata && typeof metadata.expired === 'boolean') return metadata as MarketCacheIdentity;
  return { identityContext:value,visible:true,expired:false };
}

export function marketCacheIdentity(identityContext: string, visible: boolean, expired: boolean): string {
  return JSON.stringify({ identityContext,visible,expired });
}

export function marketContext(state: MarketState): string {
  return JSON.stringify([state.storeId, state.version, state.generation, state.zone?.id,
    state.zone?.version, state.zone?.currencyCode, state.policyVersion]);
}
