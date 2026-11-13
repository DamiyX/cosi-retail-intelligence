// Exercises the local Auth -> Edge Function -> PostgreSQL sync boundary.
// Requires `npm exec -- supabase start`; uses only disposable local accounts.
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const status = JSON.parse(execSync('npm exec -- supabase status --output json', {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}));
const api = status.API_URL;
const key = status.ANON_KEY;
assert.match(api, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
assert.ok(key);

async function post(path, body, token = key) {
  const response = await fetch(`${api}${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  return { status: response.status, data: raw ? JSON.parse(raw) : null };
}

async function signUp() {
  const email = `m7-local-${randomUUID()}@example.test`;
  const result = await post('/auth/v1/signup', {
    email,
    password: `Test-${randomUUID()}!`,
  });
  assert.equal(result.status, 200, `Local sign-up returned ${result.status}`);
  assert.ok(result.data.access_token, 'Local sign-up must yield a session');
  return result.data.access_token;
}

const ownerToken = await signUp();
const otherToken = await signUp();
const storeId = randomUUID();
const deviceId = randomUUID();
const userId = randomUUID();
const storeMemberId = randomUUID();
const productId = randomUUID();

const enrollRequest = {
  protocolVersion: 1,
  storeId,
  userId,
  storeMemberId,
  deviceId,
  storeName: 'Local sync integration store',
  currencyCode: 'NGN',
  timezone: 'Africa/Lagos',
  displayName: 'Local owner',
};
const enrolled = await post('/functions/v1/sync-enroll', enrollRequest, ownerToken);
assert.equal(enrolled.status, 200, JSON.stringify(enrolled.data));
assert.equal(enrolled.data.status, 'ENROLLED');

const replayEnrollment = await post('/functions/v1/sync-enroll', enrollRequest, ownerToken);
assert.equal(replayEnrollment.status, 200, JSON.stringify(replayEnrollment.data));
assert.equal(replayEnrollment.data.status, 'ALREADY_ENROLLED');

const unauthorized = await post('/functions/v1/sync-pull', {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId,
  cursor: null, pageSize: 1,
}, otherToken);
assert.equal(unauthorized.status, 403, JSON.stringify(unauthorized.data));

const operationId = randomUUID();
const created = {
  payloadVersion: 1,
  operationType: 'PRODUCT_CREATED',
  operationId,
  storeId,
  deviceId,
  entityType: 'STORE_PRODUCT',
  entityId: productId,
  baseServerVersion: null,
  occurredAt: new Date().toISOString(),
  entities: { integrationMarker: 'created' },
};
const pushRequest = {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId,
  operations: [created],
};
const pushed = await post('/functions/v1/sync-push', pushRequest, ownerToken);
assert.equal(pushed.status, 200, JSON.stringify(pushed.data));
assert.equal(pushed.data.acks[0].status, 'APPLIED');

const replayed = await post('/functions/v1/sync-push', pushRequest, ownerToken);
assert.equal(replayed.status, 200, JSON.stringify(replayed.data));
assert.equal(replayed.data.acks[0].status, 'ALREADY_APPLIED');
assert.equal(replayed.data.acks[0].serverRevision, pushed.data.acks[0].serverRevision);

const reused = await post('/functions/v1/sync-push', {
  ...pushRequest,
  operations: [{ ...created, entities: { integrationMarker: 'different' } }],
}, ownerToken);
assert.equal(reused.status, 200, JSON.stringify(reused.data));
assert.equal(reused.data.acks[0].error.code, 'DUPLICATE_OPERATION_ID');

const pulled = await post('/functions/v1/sync-pull', {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId,
  cursor: { revision: 0, changeIndex: 0 }, pageSize: 1,
}, ownerToken);
assert.equal(pulled.status, 200, JSON.stringify(pulled.data));
assert.equal(pulled.data.changes.length, 1);
assert.equal(pulled.data.changes[0].operationId, operationId);

const bootstrapped = await post('/functions/v1/sync-bootstrap', {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId,
  cursor: null, pageSize: 1,
}, ownerToken);
assert.equal(bootstrapped.status, 200, JSON.stringify(bootstrapped.data));
assert.equal(bootstrapped.data.entities.length, 1);
assert.equal(bootstrapped.data.entities[0].operationId, operationId);

const secondDeviceId = randomUUID();
const secondEnrollment = await post('/functions/v1/sync-enroll', {
  ...enrollRequest, deviceId: secondDeviceId,
}, ownerToken);
assert.equal(secondEnrollment.status, 200, JSON.stringify(secondEnrollment.data));
assert.equal(secondEnrollment.data.status, 'ALREADY_ENROLLED');

const secondBootstrap = await post('/functions/v1/sync-bootstrap', {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId: secondDeviceId,
  cursor: null, pageSize: 1,
}, ownerToken);
assert.equal(secondBootstrap.status, 200, JSON.stringify(secondBootstrap.data));
assert.equal(secondBootstrap.data.entities[0].operationId, operationId);

const secondEdit = {
  ...created,
  operationId: randomUUID(),
  deviceId: secondDeviceId,
  operationType: 'PRODUCT_IDENTITY_UPDATED',
  baseServerVersion: 1,
  entities: { integrationMarker: 'edited on second device' },
};
const secondPush = await post('/functions/v1/sync-push', {
  ...pushRequest, deviceId: secondDeviceId, operations: [secondEdit],
}, ownerToken);
assert.equal(secondPush.status, 200, JSON.stringify(secondPush.data));
assert.equal(secondPush.data.acks[0].status, 'APPLIED');

const staleEdit = await post('/functions/v1/sync-push', {
  ...pushRequest,
  operations: [{ ...secondEdit, operationId: randomUUID(), deviceId,
    entities: { integrationMarker: 'stale edit' } }],
}, ownerToken);
assert.equal(staleEdit.status, 200, JSON.stringify(staleEdit.data));
assert.equal(staleEdit.data.acks[0].status, 'CONFLICT');

const firstDevicePull = await post('/functions/v1/sync-pull', {
  protocolVersion: 1, payloadVersion: 1, storeId, deviceId,
  cursor: { revision: 1, changeIndex: 0 }, pageSize: 1,
}, ownerToken);
assert.equal(firstDevicePull.status, 200, JSON.stringify(firstDevicePull.data));
assert.equal(firstDevicePull.data.changes[0].operationId, secondEdit.operationId);

const variantId = randomUUID();
const packageId = randomUUID();
const saleId = randomUUID();
const saleOperationId = randomUUID();
const saleTime = new Date().toISOString();
const saleOperation = {
  ...created,
  operationType: 'COMPLETED_SALE_CREATED',
  operationId: saleOperationId,
  entityType: 'SALE',
  entityId: saleId,
  occurredAt: saleTime,
  entities: {
    sale: {
      id: saleId, storeId, deviceId, createdByUserId: userId,
      occurredAt: saleTime, currencyCode: 'NGN',
      subtotalMinor: 500, discountTotalMinor: 0, totalMinor: 500,
      status: 'COMPLETED',
    },
    items: [{
      id: randomUUID(), saleId, storeProductId: productId,
      productVariantId: variantId, packageUnitId: packageId,
      quantityPackagesMicros: 1000000, conversionToBaseSnapshotMicros: 1000000,
      quantityBaseMicros: 1000000, unitPriceMinor: 500,
      grossTotalMinor: 500, discountAmountMinor: 0, netTotalMinor: 500,
    }],
    payment: {
      id: randomUUID(), saleId, method: 'CASH',
      amountMinor: 500, currencyCode: 'NGN',
    },
    inventoryEvents: [{
      id: randomUUID(), storeId, storeProductId: productId,
      eventType: 'SALE', quantityBaseDeltaMicros: -1000000,
      sourceType: 'SALE', sourceId: saleId, occurredAt: saleTime,
    }],
  },
};
const salePush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [saleOperation],
}, ownerToken);
assert.equal(salePush.status, 200, JSON.stringify(salePush.data));
assert.equal(salePush.data.acks[0].status, 'APPLIED', JSON.stringify(salePush.data));

const purchaseId = randomUUID();
const purchaseTime = new Date().toISOString();
const purchaseOperation = {
  ...created,
  operationType: 'COMPLETED_PURCHASE_CREATED',
  operationId: randomUUID(),
  entityType: 'PURCHASE',
  entityId: purchaseId,
  occurredAt: purchaseTime,
  entities: {
    purchase: {
      id: purchaseId, storeId, deviceId, createdByUserId: userId,
      occurredAt: purchaseTime, currencyCode: 'NGN',
      totalAmountMinor: 300, status: 'COMPLETED',
    },
    items: [{
      id: randomUUID(), purchaseId, storeProductId: productId,
      productVariantId: variantId, packageUnitId: packageId,
      quantityPackagesMicros: 1000000, conversionToBaseSnapshotMicros: 1000000,
      quantityBaseMicros: 1000000, enteredCostMinor: 300,
      totalPurchaseCostMinor: 300, packageCostNumerator: 300,
      packageCostDenominator: 1, baseUnitCostNumerator: 300,
      baseUnitCostDenominator: 1,
    }],
    inventoryEvents: [{
      id: randomUUID(), storeId, storeProductId: productId,
      eventType: 'PURCHASE', quantityBaseDeltaMicros: 1000000,
      sourceType: 'PURCHASE', sourceId: purchaseId, occurredAt: purchaseTime,
    }],
  },
};
const purchasePush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [purchaseOperation],
}, ownerToken);
assert.equal(purchasePush.status, 200, JSON.stringify(purchasePush.data));
assert.equal(purchasePush.data.acks[0].status, 'APPLIED', JSON.stringify(purchasePush.data));

function countOperation(serverRevision, predecessorOperationIds = []) {
  const reconciliationId = randomUUID();
  const countOperationId = randomUUID();
  return {
    ...created,
    operationType: 'RECONCILIATION_FINALIZED',
    operationId: countOperationId,
    entityType: 'RECONCILIATION',
    entityId: reconciliationId,
    entities: {
      request: { reconciliationId },
      syncBaseline: { serverRevision, predecessorOperationIds, incomplete: false },
      reconciliation: {
        id: reconciliationId, storeId, status: 'COMPLETED',
        finalizationOperationId: countOperationId,
      },
      line: { id: randomUUID(), reconciliationId, storeId, storeProductId: productId },
      inventoryEvents: [], batchOperations: [], batchEntries: [],
    },
  };
}

// The purchase is already in this device's local count projection but was
// pushed after its last pull cursor. It is a verified causal predecessor.
const validCount = countOperation(salePush.data.acks[0].serverRevision, [purchaseOperation.operationId]);
const validCountPush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [validCount],
}, ownerToken);
assert.equal(validCountPush.status, 200, JSON.stringify(validCountPush.data));
assert.equal(validCountPush.data.acks[0].status, 'APPLIED', JSON.stringify(validCountPush.data));

const crossDeviceSaleId = randomUUID();
const crossDeviceSale = {
  ...saleOperation,
  deviceId: secondDeviceId,
  operationId: randomUUID(),
  entityId: crossDeviceSaleId,
  entities: {
    ...saleOperation.entities,
    sale: { ...saleOperation.entities.sale, id: crossDeviceSaleId, deviceId: secondDeviceId },
    items: saleOperation.entities.items.map((item) => ({ ...item, id: randomUUID(), saleId: crossDeviceSaleId })),
    payment: { ...saleOperation.entities.payment, id: randomUUID(), saleId: crossDeviceSaleId },
    inventoryEvents: saleOperation.entities.inventoryEvents.map((event) => ({
      ...event, id: randomUUID(), sourceId: crossDeviceSaleId,
    })),
  },
};
const crossDevicePush = await post('/functions/v1/sync-push', {
  ...pushRequest, deviceId: secondDeviceId, operations: [crossDeviceSale],
}, ownerToken);
assert.equal(crossDevicePush.status, 200, JSON.stringify(crossDevicePush.data));
assert.equal(crossDevicePush.data.acks[0].status, 'APPLIED', JSON.stringify(crossDevicePush.data));

const staleCount = countOperation(purchasePush.data.acks[0].serverRevision);
const staleCountPush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [staleCount],
}, ownerToken);
assert.equal(staleCountPush.status, 200, JSON.stringify(staleCountPush.data));
assert.equal(staleCountPush.data.acks[0].status, 'CONFLICT', JSON.stringify(staleCountPush.data));
assert.equal(staleCountPush.data.acks[0].error.details.reason, 'STALE_RECONCILIATION');

const forgedPredecessor = countOperation(purchasePush.data.acks[0].serverRevision, [crossDeviceSale.operationId]);
const forgedPush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [forgedPredecessor],
}, ownerToken);
assert.equal(forgedPush.data.acks[0].status, 'CONFLICT', JSON.stringify(forgedPush.data));

const legacyCount = countOperation(crossDevicePush.data.acks[0].serverRevision);
delete legacyCount.entities.syncBaseline;
const legacyPush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [legacyCount],
}, ownerToken);
assert.equal(legacyPush.data.acks[0].status, 'CONFLICT', JSON.stringify(legacyPush.data));

const countReplay = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [validCount],
}, ownerToken);
assert.equal(countReplay.data.acks[0].status, 'ALREADY_APPLIED', JSON.stringify(countReplay.data));

for (const operation of [saleOperation, purchaseOperation]) {
  const replay = await post('/functions/v1/sync-push', {
    ...pushRequest, operations: [operation],
  }, ownerToken);
  assert.equal(replay.status, 200, JSON.stringify(replay.data));
  assert.equal(replay.data.acks[0].status, 'ALREADY_APPLIED');
}

const graphCounts = execFileSync('docker', [
  'exec', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres',
  '-d', 'postgres', '-Atc',
  `select
    (select count(*) from sync_private.sale_headers where sale_id = '${saleId}'),
    (select count(*) from sync_private.sale_lines where sale_id = '${saleId}'),
    (select count(*) from sync_private.sale_payments where sale_id = '${saleId}'),
    (select count(*) from sync_private.purchase_headers where purchase_id = '${purchaseId}'),
    (select count(*) from sync_private.purchase_lines where purchase_id = '${purchaseId}'),
    (select count(*) from sync_private.inventory_movements where operation_id in ('${saleOperationId}', '${purchaseOperation.operationId}'))`,
], { encoding: 'utf8' }).trim();
assert.deepEqual(graphCounts.split('|').map(Number), [1, 1, 1, 1, 1, 2]);

const rejectedCountRows = execFileSync('docker', [
  'exec', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres',
  '-d', 'postgres', '-Atc',
  `select count(*) from public.applied_sync_operations
   where operation_id in ('${staleCount.operationId}', '${forgedPredecessor.operationId}', '${legacyCount.operationId}')`,
], { encoding: 'utf8' }).trim();
assert.equal(rejectedCountRows, '0', 'Rejected counts must not commit server operations');

execFileSync('docker', [
  'exec', 'supabase_db_retail-intelligence', 'psql', '-U', 'postgres',
  '-d', 'postgres', '-Atc',
  `update public.store_members set role = 'STAFF'
   where store_id = '${storeId}' and user_id = '${userId}'`,
], { encoding: 'utf8' });
const staffCount = countOperation(crossDevicePush.data.acks[0].serverRevision);
const staffPush = await post('/functions/v1/sync-push', {
  ...pushRequest, operations: [staffCount],
}, ownerToken);
assert.equal(staffPush.data.acks[0].status, 'REJECTED_PERMANENT', JSON.stringify(staffPush.data));
assert.equal(staffPush.data.acks[0].error.code, 'FORBIDDEN');

console.log('PASS local Auth/Edge/Postgres enrollment, isolation, replay, two-device stale count, sale and purchase');
