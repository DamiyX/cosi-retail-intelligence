import { z } from "npm:zod@4.6.4";

export const PROTOCOL_VERSION = 1 as const;
export const PAYLOAD_VERSION = 1 as const;
export const MAX_PUSH_OPERATIONS = 50;
export const MAX_PULL_CHANGES = 100;
export const MAX_BOOTSTRAP_ENTITIES = 500;
export const MAX_OPERATION_PAYLOAD_BYTES = 512 * 1024;

const id = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const jsonObject = z.record(z.string(), z.unknown());
const operationTypes = [
  "PRODUCT_CREATED", "PRODUCT_IDENTITY_UPDATED", "PRODUCT_IDENTIFIER_ADDED",
  "PACKAGE_CREATED", "PACKAGE_UPDATED", "PACKAGE_DEACTIVATED",
  "STORE_PACKAGE_SETTING_SAVED", "PRODUCT_LIFECYCLE_CHANGED",
  "PRODUCT_REORDER_LEVEL_UPDATED", "COMPLETED_SALE_CREATED",
  "COMPLETED_PURCHASE_CREATED", "BATCH_CLASSIFICATION_CREATED",
  "INVENTORY_ADJUSTMENT_CREATED", "RECONCILIATION_FINALIZED",
  "CHECK_SETTINGS_SAVED", "CHECK_ASSIGNMENT_CREATED", "ATTENTION_SETTINGS_SAVED",
  "ATTENTION_SNOOZE_CREATED", "EXPENSE_CREATED", "OWNER_WITHDRAWAL_CREATED",
] as const;
const entityTypes = [
  "STORE_PRODUCT", "PRODUCT_VARIANT", "PACKAGE_UNIT", "STORE_PACKAGE_SETTING",
  "PRODUCT_IDENTIFIER", "SALE", "CUSTOMER_ACCOUNT", "RECEIVABLE", "PURCHASE",
  "BATCH_OPERATION", "INVENTORY_ADJUSTMENT", "RECONCILIATION",
  "INVENTORY_CHECK_SETTINGS", "CHECK_ASSIGNMENT", "INVENTORY_ATTENTION_SETTINGS",
  "ATTENTION_SNOOZE", "EXPENSE", "OWNER_WITHDRAWAL",
] as const;
const cursor = z.object({ revision: z.number().int().nonnegative(), changeIndex: z.number().int().nonnegative() }).strict();
const bootstrapCursor = z.object({
  snapshotRevision: z.number().int().nonnegative(),
  afterEntityType: z.enum(entityTypes),
  afterEntityId: id,
}).strict();

const operation = z.object({
  payloadVersion: z.literal(PAYLOAD_VERSION),
  operationType: z.enum(operationTypes),
  operationId: id,
  storeId: id,
  deviceId: id,
  entityType: z.enum(entityTypes),
  entityId: id,
  baseServerVersion: z.number().int().nonnegative().nullable(),
  occurredAt: timestamp,
  entities: jsonObject,
}).strict();

function assertOperationPayloadSize(value: z.infer<typeof operation>) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > MAX_OPERATION_PAYLOAD_BYTES) {
    throw new Error(`Sync operation payload exceeds ${MAX_OPERATION_PAYLOAD_BYTES} bytes.`);
  }
  return value;
}

export const pushRequest = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  payloadVersion: z.literal(PAYLOAD_VERSION),
  storeId: id,
  deviceId: id,
  operations: z.array(operation).min(1).max(MAX_PUSH_OPERATIONS),
}).strict();

export const pullRequest = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  payloadVersion: z.literal(PAYLOAD_VERSION),
  storeId: id,
  deviceId: id,
  cursor: cursor.nullable(),
  pageSize: z.number().int().positive().max(MAX_PULL_CHANGES),
}).strict();

export const enrollmentRequest = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  storeId: id,
  userId: id,
  storeMemberId: id,
  deviceId: id,
  storeName: z.string().trim().min(1).max(200),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(200),
}).strict();

export const bootstrapRequest = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  payloadVersion: z.literal(PAYLOAD_VERSION),
  storeId: id,
  deviceId: id,
  cursor: bootstrapCursor.nullable(),
  pageSize: z.number().int().positive().max(MAX_BOOTSTRAP_ENTITIES),
}).strict();

export function parseJson(request: Request): Promise<unknown> {
  return request.json();
}

export function assertPushRequest(value: unknown) {
  const parsed = pushRequest.parse(value);
  parsed.operations.forEach(assertOperationPayloadSize);
  return parsed;
}

export function assertPullRequest(value: unknown) {
  return pullRequest.parse(value);
}

export function assertEnrollmentRequest(value: unknown) {
  return enrollmentRequest.parse(value);
}

export function assertBootstrapRequest(value: unknown) {
  return bootstrapRequest.parse(value);
}
