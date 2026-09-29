import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSyncPullResponse, parseSyncPushResponse, parseSyncReferenceContext, parseSyncOperationEnvelope, type SyncPushRequest } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { addProductIdentifier } from '../src/catalogue/updateProductIdentity';
import { OfflineSyncWorker } from '../src/sync/worker';
import type { SyncTransport } from '../src/sync/transport';
import { recoverIdentifierConflict } from '../src/sync/pilot';
import { findOutboxOperation, listOpenSyncConflicts } from '../src/db/repositories';
import { createDatabaseSalesClient } from '../src/sales/client';
import { createRecognitionService } from '../src/features/scanning/resolver';
import { deterministicIds, openCatalogueFixture, reopenDatabase, testId } from './catalogueSupport';

const databaseTest = process.env.M8_POSTGRES_TESTS === '1' ? it : it.skip;
const quote = (value: unknown) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;

for (const nested of [true, false]) {
  databaseTest(`worker consumes real ${nested ? 'PRODUCT_CREATED' : 'PRODUCT_IDENTIFIER_ADDED'} conflict acknowledgements and converges after owner recovery`, async () => {
    const a = openCatalogueFixture();
    const b = openCatalogueFixture();
    try {
      const { store, owner, membership, device } = a.context;
      const deviceB = testId(900);
      b.adapter.run('UPDATE devices SET id = ? WHERE id = ?', [deviceB, device.id]);
      const productA = createTemporaryProduct(a.adapter, { storeId: store.id, deviceId: device.id, name: 'Winner',
        barcode: '036000291452', barcodeType: 'UPC', barcodeForBasePackage: true, defaultSellingPriceMinor: 10000 }, { generateId: deterministicIds(1000) });
      const productB = createTemporaryProduct(b.adapter, { storeId: store.id, deviceId: deviceB, name: 'Offline loser',
        ...(nested ? { barcode: '036000291452', barcodeType: 'UPC' as const } : {}) }, { generateId: deterministicIds(2000) });
      const rejected = nested ? productB.outbox : addProductIdentifier(b.adapter, { storeId: store.id, deviceId: deviceB,
        storeProductId: productB.storeProduct.id, type: 'UPC', value: '036000291452' }, { generateId: deterministicIds(3000) }).outbox!;
      const sale = createDatabaseSalesClient(b.adapter, { deviceId: deviceB, generateId: deterministicIds(4000) }).completeSale({
        lines: [{ storeProductId: productB.storeProduct.id, packageUnitId: productB.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 12500 }],
        payment: { method: 'CASH' },
      });
      const migration = readFileSync(resolve(__dirname, '../../../supabase/migrations/20260929092623_m8_identifier_claim_guard.sql'), 'utf8');
      const setup = `BEGIN; ${migration}
        INSERT INTO public.app_users(id,auth_subject,display_name) VALUES ('${owner.id}','${testId(9999)}','Owner');
        INSERT INTO public.stores(id,name,currency_code,timezone,created_by_user_id) VALUES ('${store.id}','Worker test','NGN','Africa/Lagos','${owner.id}');
        INSERT INTO public.store_members(id,store_id,user_id,role) VALUES ('${membership.id}','${store.id}','${owner.id}','OWNER');
        INSERT INTO public.devices(id,store_id,user_id,platform,app_version) VALUES ('${device.id}','${store.id}','${owner.id}','ANDROID','test'),('${deviceB}','${store.id}','${owner.id}','ANDROID','test');
        SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${testId(9999)}',true);`;
      // Replaying prior requests reconstructs the same server state in a fresh
      // rollback-only transaction. Every returned envelope is produced by its RPC;
      // no acknowledgement, pull page or reference context is hand-written.
      const history: SyncPushRequest[] = [];
      const rpc = (name: string, request: unknown): unknown => {
        const sql = `${setup} ${history.map(previous => `SELECT public.sync_push(${quote(previous)});`).join('\n')}
          SELECT public.${name}(${quote(request)}); ROLLBACK;`;
        const output = execFileSync('docker', ['exec', '-i', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atq', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', timeout: 30000 });
        return JSON.parse(output.trim().split(/\r?\n/).at(-1)!);
      };
      const transport: SyncTransport = {
        push: async request => { const response = parseSyncPushResponse(rpc('sync_push', request)); history.push(request); return response; },
        pull: async request => parseSyncPullResponse(rpc('sync_pull', request)),
        referenceContext: async request => parseSyncReferenceContext(rpc('sync_reference_context', request)),
        bootstrap: async () => { throw new Error('Not used in incremental worker recovery.'); },
        enroll: async () => { throw new Error('Fixture is enrolled.'); },
      };
      const winnerResponse = await transport.push({ protocolVersion: 1, payloadVersion: 1, storeId: store.id, deviceId: device.id,
        operations: [parseSyncOperationEnvelope(JSON.parse(productA.outbox.payload))] });
      expect(winnerResponse.acks[0]?.status).toBe('APPLIED');
      let clock = Date.now() + 60000;
      const worker = new OfflineSyncWorker({ adapter: b.adapter, storeId: store.id, deviceId: deviceB, transport,
        sessionProvider: { getSession: async () => ({ accessToken: 'local-test' }) },
        now: () => new Date(clock).toISOString(), idFactory: deterministicIds(6000), random: () => 0 });
      const first = await worker.runOnce();
      expect(first).toMatchObject({ conflicts: 1, permanentErrors: 0, retryableErrors: nested ? 1 : 0 });
      const conflicts = listOpenSyncConflicts(b.adapter, store.id);
      expect(conflicts).toHaveLength(1);
      expect(JSON.parse(conflicts[0]!.serverPayload!)).toEqual(JSON.parse(productA.outbox.payload));
      expect(findOutboxOperation(b.adapter, rejected.operationId)).toMatchObject({ status: 'CONFLICT', payload: rejected.payload });
      expect(findOutboxOperation(b.adapter, sale.outbox.operationId)).toMatchObject({ status: nested ? 'ERROR_RETRYABLE' : 'SYNCED', payload: sale.outbox.payload });
      expect(b.adapter.getFirstRow('SELECT id FROM store_products WHERE id = ?', [productB.storeProduct.id])).not.toBeNull();
      recoverIdentifierConflict(b.adapter, conflicts[0]!.id, deterministicIds(7000));
      for (let attempt = 0; attempt < 3; attempt++) { clock += 60000; expect((await worker.runOnce()).permanentErrors).toBe(0); }
      expect(listOpenSyncConflicts(b.adapter, store.id)).toHaveLength(0);
      expect(findOutboxOperation(b.adapter, rejected.operationId)).toMatchObject({ status: 'CONFLICT', payload: rejected.payload });
      expect(findOutboxOperation(b.adapter, sale.outbox.operationId)?.status).toBe('SYNCED');
      const workerA = new OfflineSyncWorker({ adapter: a.adapter, storeId: store.id, deviceId: device.id, transport,
        sessionProvider: { getSession: async () => ({ accessToken: 'local-test' }) }, now: () => new Date(clock).toISOString(), idFactory: deterministicIds(8000) });
      expect((await workerA.runOnce()).permanentErrors).toBe(0);
      for (const fixture of [a, b]) {
        expect(fixture.adapter.getFirstRow<{ count: number }>('SELECT count(*) AS count FROM sales WHERE id = ?', [sale.sale.id])?.count).toBe(1);
        expect(fixture.adapter.getFirstRow<{ product_name_snapshot: string }>('SELECT product_name_snapshot FROM sale_items WHERE sale_id = ?', [sale.sale.id])?.product_name_snapshot).toBe('Offline loser');
        expect(await createRecognitionService(fixture.adapter, store.id).recognize({ sessionId: 's', requestId: 'r', symbology: 'upc_a', value: '036000291452' })).toMatchObject({ status: 'STRONG', candidate: { storeProductId: productA.storeProduct.id } });
      }
      const restarted = reopenDatabase(b.path);
      try {
        expect(findOutboxOperation(restarted, rejected.operationId)?.payload).toBe(rejected.payload);
        expect(listOpenSyncConflicts(restarted, store.id)).toHaveLength(0);
        expect(findOutboxOperation(restarted, sale.outbox.operationId)?.status).toBe('SYNCED');
      } finally { restarted.close(); }
    } finally { a.closeAndDelete(); b.closeAndDelete(); }
  }, 120000);
}
