import { DomainError } from '@retail/domain';
import type { DatabaseAdapter } from '../db/adapter';
import { getDeviceById, getStoreById, getSyncStoreState, listDevicesByStore, listStores, type MemberRole } from '../db/repositories';
import { requireId } from '../db/repositories/common';

export interface ActorIdentity {
  storeId: string; deviceId: string; userId: string;
  /** Captured local context source only; not a persisted permission or Auth claim. */
  localEnrollmentDeviceId?: string;
}

/** Internal command context only. Never serialize this into a business request. */
export type CapturedActor = Readonly<ActorIdentity & { member: Readonly<{ id: string }> }>;
export interface CommandActorOptions { actorContext?: CapturedActor }

export function captureCommandActor(adapter: DatabaseAdapter, identity: ActorIdentity, captured?: CapturedActor, ownerOnly = false): CapturedActor {
  if (captured && (identity.storeId !== captured.storeId || identity.deviceId !== captured.deviceId || identity.userId !== captured.userId))
    throw new DomainError('INVALID_VALUE', 'Command identity does not match its captured context.');
  const checked = assertCurrentActor(adapter, captured ?? identity, ownerOnly);
  return Object.freeze({ storeId: identity.storeId, deviceId: identity.deviceId, userId: identity.userId,
    ...(captured?.localEnrollmentDeviceId !== undefined ? { localEnrollmentDeviceId: captured.localEnrollmentDeviceId } : {}),
    member: Object.freeze({ id: checked.member.id }) });
}

/** Local cached authority only: offline devices cannot observe remote revocation. */
export function assertCurrentActor(adapter: DatabaseAdapter, actor: ActorIdentity & { readonly member?: { readonly id: string } }, ownerOnly = false) {
  const store = getStoreById(adapter, requireId(actor.storeId));
  const device = getDeviceById(adapter, requireId(actor.deviceId));
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Cannot access: store is not active.');
  if (!device || device.storeId !== actor.storeId) throw new DomainError('INVALID_VALUE', 'Device does not belong to this store.');
  if (actor.localEnrollmentDeviceId !== undefined) {
    const enrolled = getSyncStoreState(adapter, actor.storeId);
    if (!enrolled || enrolled.storeId !== actor.storeId || enrolled.deviceId !== actor.localEnrollmentDeviceId || enrolled.deviceId !== actor.deviceId)
      throw new DomainError('INVALID_VALUE', 'The captured local enrollment identity is no longer current.');
  }
  const member = adapter.getFirstRow<{ id: string; role: MemberRole }>(
    `SELECT m.id, m.role FROM store_members m JOIN users u ON u.id = m.user_id
     WHERE m.store_id = ? AND m.user_id = ? AND m.status = 'ACTIVE' AND u.status = 'ACTIVE';`,
    [actor.storeId, requireId(actor.userId)],
  );
  if (!store || store.status !== 'ACTIVE' || !device || device.storeId !== actor.storeId
    || device.status !== 'ACTIVE' || device.userId !== actor.userId || !member
    || (actor.member !== undefined && actor.member.id !== member.id)
    || (ownerOnly && member.role !== 'OWNER')) {
    throw new DomainError('INVALID_VALUE', ownerOnly
      ? 'Only an active store owner on their bound active device can access this operation.'
      : 'An active account, active store member and matching bound active device are required.');
  }
  return { store, device, member };
}

/** Omitted identity is allowed only in the genuine single-store/single-device context. */
export function resolveCurrentActor(adapter: DatabaseAdapter, options: Partial<ActorIdentity> = {}, ownerOnly = false) {
  const stores = options.storeId ? [getStoreById(adapter, options.storeId)].filter(s => s !== null) : listStores(adapter);
  if (stores.length !== 1) throw new DomainError('INVALID_VALUE', ownerOnly ? 'Only an active store owner with an unambiguous store can access this operation.' : 'Store identity is missing or ambiguous.');
  const store = stores[0];
  const enrolled = options.deviceId ? null : getSyncStoreState(adapter, store.id);
  if (enrolled && enrolled.storeId !== store.id) throw new DomainError('INVALID_VALUE', 'Local enrollment store does not match.');
  const deviceId = options.deviceId ?? enrolled?.deviceId;
  const localEnrollmentDeviceId = options.localEnrollmentDeviceId ?? enrolled?.deviceId;
  const devices = deviceId ? [getDeviceById(adapter, deviceId)].filter(d => d !== null) : listDevicesByStore(adapter, store.id);
  if (devices.length !== 1 || !devices[0].userId) throw new DomainError('INVALID_VALUE', ownerOnly ? 'Only an active store owner with an unambiguous bound device can access this operation.' : 'Bound device identity is missing or ambiguous.');
  const actor = { storeId: store.id, deviceId: devices[0].id, userId: options.userId ?? devices[0].userId,
    ...(localEnrollmentDeviceId !== undefined ? { localEnrollmentDeviceId } : {}) };
  const checked = assertCurrentActor(adapter, actor, ownerOnly);
  // Carry discovery provenance through the catalogue's existing store/device constructor seam.
  const device = { ...checked.device, ...(localEnrollmentDeviceId !== undefined ? { localEnrollmentDeviceId } : {}) };
  return Object.freeze({ ...checked, member: Object.freeze(checked.member), device, ...actor });
}

/** Keep a captured identity; recheck methods including separately retained subclients. */
export function guardClient<T extends object>(client: T, check: () => unknown): T {
  const nested = new Map<PropertyKey, object>();
  const methods = new Map<PropertyKey, { source: unknown; guarded: unknown }>();
  return new Proxy(client, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value === 'function') {
        if (methods.get(key)?.source !== value) methods.set(key, {
          source: value,
          // Preserve method properties and replacement semantics while guarding every invocation.
          guarded: new Proxy(value, { apply(method, _receiver, args: unknown[]) {
            check();
            const result: unknown = Reflect.apply(method, target, args);
            if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
              return Promise.resolve(result).then(resolved => { check(); return resolved; });
            }
            return result;
          } }),
        });
        return methods.get(key)!.guarded;
      }
      if (['photos','suggestions','recognition'].includes(String(key)) && value && typeof value === 'object') {
        if (!nested.has(key)) nested.set(key, guardClient(value, check));
        return nested.get(key);
      }
      return value;
    },
  });
}
