import { generateId } from '@retail/domain';

import { MIGRATIONS, openDatabase } from '../src/db';
import { NodeTestAdapter } from '../src/db/nodeTestAdapter';
import {
  countStoreMembers,
  countStores,
  createDevice,
  createStore,
  createStoreMember,
  createUser,
  getDeviceById,
  getStoreById,
  getStoreMemberById,
  getUserById,
} from '../src/db/repositories';
import { openIsolatedDatabase } from '../src/db/testing';

describe('store operating context repositories', () => {
  it('creates and reads a valid store membership and device graph', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      expect(isolated.report.schemaVersion).toBe(1);

      const user = createUser(isolated.adapter, { id: generateId(), displayName: 'Adaeze O.' });
      const store = createStore(isolated.adapter, {
        id: generateId(),
        name: 'Adaeze Provisions',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        createdByUserId: user.id,
      });
      const member = createStoreMember(isolated.adapter, {
        id: generateId(),
        storeId: store.id,
        userId: user.id,
        role: 'OWNER',
      });
      const device = createDevice(isolated.adapter, {
        id: generateId(),
        storeId: store.id,
        userId: user.id,
        platform: 'ANDROID',
        deviceLabel: 'Galaxy A15 5G',
        appVersion: '0.0.1',
      });

      expect(getUserById(isolated.adapter, user.id)).toEqual(user);
      expect(getStoreById(isolated.adapter, store.id)).toEqual(store);
      expect(getStoreMemberById(isolated.adapter, member.id)).toEqual(member);
      expect(getDeviceById(isolated.adapter, device.id)).toEqual(device);
      expect(countStores(isolated.adapter)).toBe(1);
      expect(countStoreMembers(isolated.adapter, store.id)).toBe(1);
      expect(member.role).toBe('OWNER');
      expect(device.platform).toBe('ANDROID');
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects membership for an unknown store without leaving partial rows', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      const user = createUser(isolated.adapter, { id: generateId(), displayName: 'Bola A.' });
      expect(() =>
        createStoreMember(isolated.adapter, {
          id: generateId(),
          storeId: generateId(),
          userId: user.id,
          role: 'STAFF',
        }),
      ).toThrow();
      const rows = isolated.adapter.getAllRows<{ id: string }>('SELECT id FROM store_members;');
      expect(rows).toEqual([]);
      expect(getUserById(isolated.adapter, user.id)).toEqual(user);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('rejects a duplicate store membership while keeping the original', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      const user = createUser(isolated.adapter, { id: generateId(), displayName: 'Chidi N.' });
      const store = createStore(isolated.adapter, {
        id: generateId(),
        name: 'Chidi Stores',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
      });
      const first = createStoreMember(isolated.adapter, {
        id: generateId(),
        storeId: store.id,
        userId: user.id,
        role: 'ADMIN',
      });
      expect(() =>
        createStoreMember(isolated.adapter, {
          id: generateId(),
          storeId: store.id,
          userId: user.id,
          role: 'STAFF',
        }),
      ).toThrow();
      expect(countStoreMembers(isolated.adapter, store.id)).toBe(1);
      expect(getStoreMemberById(isolated.adapter, first.id)?.role).toBe('ADMIN');
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('stores quotes and SQL-like text as data through parameterized statements', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    try {
      const hostile = "O'Brien; DROP TABLE stores; --";
      const user = createUser(isolated.adapter, { id: generateId(), displayName: hostile });
      const store = createStore(isolated.adapter, {
        id: generateId(),
        name: hostile,
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
      });
      expect(getUserById(isolated.adapter, user.id)?.displayName).toBe(hostile);
      expect(getStoreById(isolated.adapter, store.id)?.name).toBe(hostile);
      expect(countStores(isolated.adapter)).toBe(1);
    } finally {
      isolated.closeAndDelete();
    }
  });

  it('keeps the graph available after closing and reopening the database', () => {
    const isolated = openIsolatedDatabase(MIGRATIONS);
    let userId = '';
    let storeId = '';
    let memberId = '';
    let deviceId = '';
    try {
      const user = createUser(isolated.adapter, { id: generateId(), displayName: 'Efe O.' });
      const store = createStore(isolated.adapter, {
        id: generateId(),
        name: 'Efe Mart',
        currencyCode: 'NGN',
        countryCode: 'NG',
        timezone: 'Africa/Lagos',
        createdByUserId: user.id,
      });
      const member = createStoreMember(isolated.adapter, {
        id: generateId(),
        storeId: store.id,
        userId: user.id,
        role: 'OWNER',
      });
      const device = createDevice(isolated.adapter, {
        id: generateId(),
        storeId: store.id,
        platform: 'ANDROID',
        appVersion: '0.0.1',
      });
      userId = user.id;
      storeId = store.id;
      memberId = member.id;
      deviceId = device.id;
      isolated.adapter.close();

      const reopened = new NodeTestAdapter(isolated.path);
      try {
        const report = openDatabase(reopened, MIGRATIONS);
        expect(report.schemaVersion).toBe(1);
        expect(getUserById(reopened, userId)?.displayName).toBe('Efe O.');
        expect(getStoreById(reopened, storeId)?.name).toBe('Efe Mart');
        expect(getStoreMemberById(reopened, memberId)?.role).toBe('OWNER');
        expect(getDeviceById(reopened, deviceId)?.platform).toBe('ANDROID');
      } finally {
        reopened.close();
      }
    } finally {
      isolated.closeAndDelete();
    }
  });
});
