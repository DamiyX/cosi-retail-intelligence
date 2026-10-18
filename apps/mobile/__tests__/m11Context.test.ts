import { createCatalogueClient } from '../src/catalogue/client';
import { createDatabasePersonalPriceClient, createPersonalPriceClientForActiveContext } from '../src/priceIntelligence/client';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { openCatalogueFixture, deterministicIds, testId, countRows } from './catalogueSupport';
import { createUser, createStoreMember, createDevice } from '../src/db/repositories';

describe('M11 catalogue and M9 captured-device guards', () => {
  it.each(['unbound','revoked','wrong-user','suspended'])('fails closed after %s change and never substitutes an owner', change => {
    const f = openCatalogueFixture();
    try {
      const catalogue = createCatalogueClient(f.adapter, f.context.store, f.context.device);
      const price = createDatabasePersonalPriceClient(f.adapter, { storeId:f.context.store.id,userId:f.context.owner.id });
      if (change === 'unbound') f.adapter.run('UPDATE devices SET user_id = NULL WHERE id = ?;', [f.context.device.id]);
      if (change === 'revoked') f.adapter.run("UPDATE devices SET status = 'REVOKED' WHERE id = ?;", [f.context.device.id]);
      if (change === 'suspended') f.adapter.run("UPDATE users SET status = 'SUSPENDED' WHERE id = ?;", [f.context.owner.id]);
      if (change === 'wrong-user') {
        createUser(f.adapter,{id:testId(900),displayName:'Staff'});
        createStoreMember(f.adapter,{id:testId(901),storeId:f.context.store.id,userId:testId(900),role:'STAFF'});
        f.adapter.run('UPDATE devices SET user_id = ? WHERE id = ?;', [testId(900),f.context.device.id]);
      }
      expect(() => catalogue.listProducts('')).toThrow();
      expect(() => price.getOverview()).toThrow();
      expect(() => createCatalogueClient(f.adapter,f.context.store,f.context.device)).toThrow();
      expect(() => createDatabasePersonalPriceClient(f.adapter,{storeId:f.context.store.id,userId:f.context.owner.id})).toThrow();
      expect(() => createPersonalPriceClientForActiveContext(f.adapter)).toThrow();
      const before = countRows(f.adapter,'outbox_operations');
      if (change !== 'wrong-user') expect(() => createTemporaryProduct(f.adapter,{storeId:f.context.store.id,deviceId:f.context.device.id,name:'Denied'}, {generateId:deterministicIds(300)})).toThrow();
      expect(countRows(f.adapter,'outbox_operations')).toBe(before);
    } finally { f.closeAndDelete(); }
  });
  it('denies ambiguity at resolution and retains a captured device on later reads', () => {
    const f = openCatalogueFixture();
    try {
      const price = createDatabasePersonalPriceClient(f.adapter,{storeId:f.context.store.id,userId:f.context.owner.id});
      createDevice(f.adapter,{id:testId(902),storeId:f.context.store.id,userId:f.context.owner.id,platform:'ANDROID',appVersion:'test'});
      expect(() => createDatabasePersonalPriceClient(f.adapter,{storeId:f.context.store.id,userId:f.context.owner.id})).toThrow();
      expect(() => createPersonalPriceClientForActiveContext(f.adapter)).toThrow();
      expect(price.getOverview()).toBeDefined();
      f.adapter.run("UPDATE devices SET status = 'REVOKED' WHERE id = ?;",[f.context.device.id]);
      expect(() => price.getOverview()).toThrow();
    } finally { f.closeAndDelete(); }
  });
});
