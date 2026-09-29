import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSyncOperationEnvelope, type SyncReferenceContext } from '@retail/contracts';
import { createTemporaryProduct } from '../src/catalogue/createTemporaryProduct';
import { addProductIdentifier } from '../src/catalogue/updateProductIdentity';
import { materializeSyncOperation } from '../src/sync/materialize';
import { applySyncPullPage, applySyncBootstrapPage, commitSyncBootstrapSnapshot } from '../src/sync/applier';
import { beginSyncBootstrap, ensureSyncStoreState, getSyncStoreState } from '../src/db/repositories';
import { MIGRATIONS } from '../src/db';
import { openIsolatedDatabase } from '../src/db/testing';
import { recoverIdentifierConflict } from '../src/sync/pilot';
import { createRecognitionService } from '../src/features/scanning/resolver';
import { createDatabaseSalesClient } from '../src/sales/client';
import { reopenDatabase, deterministicIds, openCatalogueFixture, testId } from './catalogueSupport';

const databaseTest = process.env.M8_POSTGRES_TESTS === '1' ? it : it.skip;
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

describe('M8 real PostgreSQL + two offline SQLite clients', () => {
  for (const nested of [true, false]) {
    for (const [typeA, valueA, typeB, valueB] of [
      ['UPC', '036000291452', 'UPC', '036000291452'],
      ['UPC', '036000291452', 'EAN', '0036000291452'],
      ['QR', 'a-B', 'QR', 'ab'],
    ] as const) {
      databaseTest(`${nested ? 'PRODUCT_CREATED' : 'PRODUCT_IDENTIFIER_ADDED'}: ${typeA}/${typeB} ${valueB}`, async () => {
        const a = openCatalogueFixture();
        const b = openCatalogueFixture();
        try {
          const deviceB = testId(900);
          b.adapter.run('UPDATE devices SET id = ? WHERE id = ?', [deviceB, b.context.device.id]);
          const commonA = { storeId: a.context.store.id, deviceId: a.context.device.id };
          const commonB = { storeId: b.context.store.id, deviceId: deviceB };
          const productA = createTemporaryProduct(a.adapter, { ...commonA, name: 'A', ...(nested ? { barcode: valueA, barcodeType: typeA } : {}) }, { generateId: deterministicIds(1000) });
          const productB = createTemporaryProduct(b.adapter, { ...commonB, name: 'B', ...(nested ? { barcode: valueB, barcodeType: typeB } : {}) }, { generateId: deterministicIds(2000) });
          const opA = nested ? productA.outbox : addProductIdentifier(a.adapter, { ...commonA, storeProductId: productA.storeProduct.id, type: typeA, value: valueA }, { generateId: deterministicIds(3000) }).outbox;
          const opB = nested ? productB.outbox : addProductIdentifier(b.adapter, { ...commonB, storeProductId: productB.storeProduct.id, type: typeB, value: valueB }, { generateId: deterministicIds(4000) }).outbox;
          const sale = createDatabaseSalesClient(b.adapter, { deviceId: deviceB, generateId: deterministicIds(5000) }).completeSale({
            lines: [{ storeProductId: productB.storeProduct.id, packageUnitId: productB.basePackage.id, quantityPackagesMicros: 1000000, unitPriceMinor: 12500 }],
            payment: { method: 'CASH' },
          });
          const { owner, store, membership, device } = a.context;
          const subject = testId(9999);
          const apply = (payload: string) => {
            const operation = JSON.parse(payload) as { deviceId: string };
            return `SELECT public.sync_push(${quote(JSON.stringify({ protocolVersion: 1, payloadVersion: 1, storeId: store.id, deviceId: operation.deviceId, operations: [JSON.parse(payload)] }))}::jsonb)->'acks'->0->>'status';`;
          };
          const migration = process.env.M8_REPRODUCE_BASELINE === '1' ? '' : readFileSync(resolve(__dirname, '../../../supabase/migrations/20260929092623_m8_identifier_claim_guard.sql'), 'utf8');
          const sql = `BEGIN; ${migration}
            INSERT INTO public.app_users(id, auth_subject, display_name) VALUES ('${owner.id}', '${subject}', 'Test');
            INSERT INTO public.stores(id,name,currency_code,timezone,created_by_user_id) VALUES ('${store.id}','M8 test','NGN','Africa/Lagos','${owner.id}');
            INSERT INTO public.store_members(id,store_id,user_id,role) VALUES ('${membership.id}','${store.id}','${owner.id}','OWNER');
            INSERT INTO public.devices(id,store_id,user_id,platform,app_version) VALUES ('${device.id}','${store.id}','${owner.id}','ANDROID','test'), ('${deviceB}','${store.id}','${owner.id}','ANDROID','test');
            INSERT INTO public.store_sync_state(store_id) VALUES ('${store.id}');
            SET LOCAL ROLE authenticated;
            SELECT set_config('request.jwt.claim.sub','${subject}',true);
            ${nested ? '' : apply(productA.outbox.payload) + apply(productB.outbox.payload)}
            ${apply(opA.payload)} ${apply(opB.payload)} ROLLBACK;`;
          const output = execFileSync('docker', ['exec', '-i', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atq', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', timeout: 30000 });
          const statuses = output.trim().split(/\r?\n/).filter(Boolean);
          expect(statuses.at(-2)).toBe('APPLIED');
          expect(statuses.at(-1)).toBe(process.env.M8_REPRODUCE_BASELINE === '1' ? 'APPLIED' : 'CONFLICT');
          if (process.env.M8_REPRODUCE_BASELINE === '1') return;
          const incoming = parseSyncOperationEnvelope(JSON.parse(opA.payload));
          const unrelated = createTemporaryProduct(a.adapter, { ...commonA, name: 'Unrelated' }, { generateId: deterministicIds(6000) });
          const pulled = [...(!nested ? [productA.outbox] : []), opA, unrelated.outbox];
          const referenceContext: SyncReferenceContext = {
            protocolVersion: 1, payloadVersion: 1, serverRevision: pulled.length,
            store: { ...store, status: 'ACTIVE', createdByUserId: owner.id },
            users: [{ id: owner.id, displayName: owner.displayName, createdAt: owner.createdAt, updatedAt: owner.updatedAt, status: 'ACTIVE' }],
            members: [{ ...membership, status: 'ACTIVE' }],
            devices: [device.id, deviceB].map(id => ({ id, storeId: store.id, userId: owner.id,
              platform: device.platform, deviceLabel: device.deviceLabel, appVersion: device.appVersion, createdAt: device.createdAt, status: 'ACTIVE' })),
          };
          ensureSyncStoreState(b.adapter, { storeId: store.id, deviceId: deviceB, now: store.createdAt });
          const pullResult = applySyncPullPage(b.adapter, {
            protocolVersion: 1, payloadVersion: 1,
            changes: pulled.map((operation, index) => ({
              operationId: operation.operationId, storeId: store.id, entityType: operation.entityType,
              entityId: operation.entityId, operationType: operation.operationType, changeType: 'UPSERT' as const,
              payloadVersion: 1 as const, payload: parseSyncOperationEnvelope(JSON.parse(operation.payload)),
              entityVersion: index + 1, serverRevision: index + 1, occurredAt: store.createdAt,
            })),
            nextCursor: { revision: pulled.length, changeIndex: 0 }, hasMore: false, serverRevision: pulled.length,
          }, {
            storeId: store.id,
            referenceContext,
            options: { now: store.createdAt, conflictIdFactory: deterministicIds(7000) },
          });
          expect(pullResult.cursorRevision).toBe(pulled.length);
          expect(b.adapter.getFirstRow('SELECT id FROM store_products WHERE id = ?', [unrelated.storeProduct.id])).not.toBeNull();
          const conflict = b.adapter.getFirstRow<{ id: string }>("SELECT id FROM sync_conflicts WHERE status = 'OPEN'");
          expect(conflict).not.toBeNull();
          expect(b.adapter.getFirstRow<{ status: string }>('SELECT status FROM outbox_operations WHERE operation_id = ?', [opB.operationId])?.status).toBe('CONFLICT');
          expect(b.adapter.getFirstRow<{ id: string }>('SELECT id FROM store_products WHERE id = ?', [productB.storeProduct.id])).not.toBeNull();
          const lookup = { symbology: typeA === 'QR' ? 'qr' as const : 'upc_a' as const, value: valueA, requestId: 'r', sessionId: 's' };
          expect(await createRecognitionService(b.adapter, b.context.store.id).recognize(lookup)).toMatchObject({ status: 'AMBIGUOUS' });
          recoverIdentifierConflict(b.adapter, conflict!.id, deterministicIds(8000));
          expect(await createRecognitionService(b.adapter, b.context.store.id).recognize(lookup)).toMatchObject({ status: 'STRONG' });
          const fresh = openIsolatedDatabase(MIGRATIONS);
          try {
            const options = { now: store.createdAt, conflictIdFactory: deterministicIds(9100) };
            beginSyncBootstrap(fresh.adapter, { storeId: store.id, deviceId: deviceB, bootstrapId: testId(9000), referenceContext });
            applySyncBootstrapPage(fresh.adapter, { protocolVersion: 1, payloadVersion: 1,
              snapshotRevision: pulled.length, nextCursor: null, hasMore: false,
              entities: pulled.map((operation, index) => ({ operationId: operation.operationId, storeId: store.id,
                entityType: operation.entityType, entityId: operation.entityId, entityVersion: index + 1,
                serverRevision: index + 1, changeIndex: 0, payload: parseSyncOperationEnvelope(JSON.parse(operation.payload)) })),
            }, { storeId: store.id, options });
            commitSyncBootstrapSnapshot(fresh.adapter, { storeId: store.id, snapshotRevision: pulled.length, options });
            expect(await createRecognitionService(fresh.adapter, store.id).recognize(lookup)).toMatchObject({ status: 'STRONG', candidate: { storeProductId: productA.storeProduct.id } });
          } finally { fresh.closeAndDelete(); }
          b.adapter.transaction(() => materializeSyncOperation(b.adapter, incoming));
          const recovery = b.adapter.getFirstRow<{ payload: string }>("SELECT payload FROM outbox_operations WHERE operation_type = 'PRODUCT_CREATED' AND entity_id = ? AND operation_id <> ? ORDER BY rowid DESC LIMIT 1", [productB.storeProduct.id, productB.outbox.operationId]);
          const chainSql = sql.replace('ROLLBACK;', `${apply(sale.outbox.payload)} ${recovery ? apply(recovery.payload) : ''} ${apply(sale.outbox.payload)} ROLLBACK;`);
          const chain = execFileSync('docker', ['exec', '-i', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atq', '-v', 'ON_ERROR_STOP=1'], { input: chainSql, encoding: 'utf8', timeout: 30000 }).trim().split(/\r?\n/);
          expect(chain.at(-1)).toBe(nested ? 'APPLIED' : 'ALREADY_APPLIED');
          if (nested) expect(chain.at(-3)).toBe('REJECTED_RETRYABLE');
          const restarted = reopenDatabase(b.path);
          try {
            expect(getSyncStoreState(restarted, store.id)?.cursorRevision).toBe(pulled.length);
            expect(restarted.getFirstRow<{ product_name_snapshot: string }>('SELECT product_name_snapshot FROM sale_items WHERE sale_id = ?', [sale.sale.id])?.product_name_snapshot).toBe('B');
          } finally { restarted.close(); }
        } finally { a.closeAndDelete(); b.closeAndDelete(); }
      });
    }
  }
});
