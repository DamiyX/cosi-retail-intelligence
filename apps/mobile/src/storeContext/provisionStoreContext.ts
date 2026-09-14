import { generateId as defaultGenerateId } from '@retail/domain';

import type { DatabaseAdapter } from '../db/adapter';
import {
  type CreateDeviceInput,
  type CreateStoreInput,
  type CreateStoreMemberInput,
  type CreateUserInput,
  createDevice,
  createStore,
  createStoreMember,
  createUser,
  type DeviceRow,
  type StoreMemberRow,
  type StoreRow,
  type UserRow,
} from '../db/repositories';

export interface ProvisionStoreContextInput {
  ownerDisplayName: string;
  storeName: string;
  currencyCode: string;
  countryCode: string;
  timezone: string;
  deviceLabel?: string | null;
  appVersion: string;
}

export interface ProvisionStoreContextOptions {
  /**
   * Client ID provider. Defaults to the domain generator; Android callers
   * pass the Expo-backed provider so no WebCrypto global is assumed.
   */
  generateId?: () => string;
}

export interface ProvisionStoreContextResult {
  owner: UserRow;
  store: StoreRow;
  membership: StoreMemberRow;
  device: DeviceRow;
}

/**
 * Create the minimal valid store operating context (owner user, store, owner
 * membership, first device) as one atomic unit. Every repository write runs
 * inside a single SQLite transaction: the caller receives the result only
 * after the commit completes, and any failure leaves none of the four rows
 * behind. IDs are client-generated before any write (D-010).
 */
export function provisionStoreContext(
  adapter: DatabaseAdapter,
  input: ProvisionStoreContextInput,
  options: ProvisionStoreContextOptions = {},
): ProvisionStoreContextResult {
  const generateId = options.generateId ?? defaultGenerateId;
  return adapter.transaction(() => {
    const userInput: CreateUserInput = {
      id: generateId(),
      displayName: input.ownerDisplayName,
    };
    const owner = createUser(adapter, userInput);

    const storeInput: CreateStoreInput = {
      id: generateId(),
      name: input.storeName,
      currencyCode: input.currencyCode,
      countryCode: input.countryCode,
      timezone: input.timezone,
      createdByUserId: owner.id,
    };
    const store = createStore(adapter, storeInput);

    const memberInput: CreateStoreMemberInput = {
      id: generateId(),
      storeId: store.id,
      userId: owner.id,
      role: 'OWNER',
    };
    const membership = createStoreMember(adapter, memberInput);

    const deviceInput: CreateDeviceInput = {
      id: generateId(),
      storeId: store.id,
      userId: owner.id,
      platform: 'ANDROID',
      deviceLabel: input.deviceLabel,
      appVersion: input.appVersion,
    };
    const device = createDevice(adapter, deviceInput);

    return { owner, store, membership, device };
  });
}
