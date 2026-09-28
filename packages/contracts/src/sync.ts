import { z } from 'zod';

/**
 * The sync boundary is deliberately independent of Supabase, SQLite, and
 * transport details.  Both the mobile adapter and the server gateway consume
 * these values, while the runtime schemas reject protocol drift at the edge.
 */

export const SYNC_PROTOCOL_VERSION = 1 as const;
export const SYNC_PAYLOAD_VERSION = 1 as const;
export const MAX_PUSH_OPERATIONS = 50;
export const MAX_PULL_CHANGES = 100;
export const MAX_BOOTSTRAP_ENTITIES = 500;
export const MAX_OPERATION_PAYLOAD_BYTES = 512 * 1024;

export const SYNC_OPERATION_TYPES = [
  'PRODUCT_CREATED',
  'PRODUCT_IDENTITY_UPDATED',
  'PRODUCT_IDENTIFIER_ADDED',
  'PACKAGE_CREATED',
  'PACKAGE_UPDATED',
  'PACKAGE_DEACTIVATED',
  'STORE_PACKAGE_SETTING_SAVED',
  'PRODUCT_LIFECYCLE_CHANGED',
  'PRODUCT_REORDER_LEVEL_UPDATED',
  'COMPLETED_SALE_CREATED',
  'COMPLETED_PURCHASE_CREATED',
  'BATCH_CLASSIFICATION_CREATED',
  'INVENTORY_ADJUSTMENT_CREATED',
  'RECONCILIATION_FINALIZED',
  'CHECK_SETTINGS_SAVED',
  'CHECK_ASSIGNMENT_CREATED',
  'ATTENTION_SETTINGS_SAVED',
  'ATTENTION_SNOOZE_CREATED',
  'EXPENSE_CREATED',
  'OWNER_WITHDRAWAL_CREATED',
] as const;

export type SyncOperationType = (typeof SYNC_OPERATION_TYPES)[number];

export const SYNC_ENTITY_TYPES = [
  'STORE_PRODUCT',
  'PRODUCT_VARIANT',
  'PACKAGE_UNIT',
  'STORE_PACKAGE_SETTING',
  'PRODUCT_IDENTIFIER',
  'SALE',
  'CUSTOMER_ACCOUNT',
  'RECEIVABLE',
  'PURCHASE',
  'BATCH_OPERATION',
  'INVENTORY_ADJUSTMENT',
  'RECONCILIATION',
  'INVENTORY_CHECK_SETTINGS',
  'CHECK_ASSIGNMENT',
  'INVENTORY_ATTENTION_SETTINGS',
  'ATTENTION_SNOOZE',
  'EXPENSE',
  'OWNER_WITHDRAWAL',
] as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const SYNC_ACK_STATUSES = [
  'APPLIED',
  'ALREADY_APPLIED',
  'CONFLICT',
  'REJECTED_RETRYABLE',
  'REJECTED_PERMANENT',
] as const;

export type SyncAckStatus = (typeof SYNC_ACK_STATUSES)[number];

export const SYNC_ERROR_CODES = [
  'INVALID_PROTOCOL',
  'INVALID_PAYLOAD',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'UNKNOWN_STORE',
  'UNKNOWN_DEVICE',
  'OPERATION_NOT_ALLOWED',
  'DUPLICATE_OPERATION_ID',
  'CONFLICT',
  'RETRYABLE',
  'PERMANENT',
] as const;

export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

const idSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const decimalStringSchema = z
  .string()
  .regex(/^-?(0|[1-9]\d*)(\.\d+)?$/, 'Expected a canonical decimal string.');
const jsonObjectSchema = z.record(z.string(), z.unknown());

export const syncCursorSchema = z
  .object({
    revision: nonNegativeIntegerSchema,
    changeIndex: nonNegativeIntegerSchema,
  })
  .strict();

export type SyncCursor = z.infer<typeof syncCursorSchema>;

export const syncOperationEnvelopeSchema = z
  .object({
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    operationType: z.enum(SYNC_OPERATION_TYPES),
    operationId: idSchema,
    storeId: idSchema,
    deviceId: idSchema,
    entityType: z.enum(SYNC_ENTITY_TYPES),
    entityId: idSchema,
    baseServerVersion: nonNegativeIntegerSchema.nullable(),
    occurredAt: timestampSchema,
    entities: jsonObjectSchema,
  })
  .strict();

export type SyncOperationEnvelope = z.infer<typeof syncOperationEnvelopeSchema>;

export const syncErrorSchema = z
  .object({
    code: z.enum(SYNC_ERROR_CODES),
    message: z.string().min(1).max(500),
    retryable: z.boolean(),
    details: jsonObjectSchema.optional(),
  })
  .strict();

export type SyncError = z.infer<typeof syncErrorSchema>;

export const syncPushRequestSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    storeId: idSchema,
    deviceId: idSchema,
    operations: z.array(syncOperationEnvelopeSchema).min(1).max(MAX_PUSH_OPERATIONS),
  })
  .strict();

export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

export const syncPushAckSchema = z
  .object({
    operationId: idSchema,
    status: z.enum(SYNC_ACK_STATUSES),
    entityType: z.enum(SYNC_ENTITY_TYPES),
    entityId: idSchema,
    serverVersion: nonNegativeIntegerSchema.nullable(),
    serverRevision: nonNegativeIntegerSchema.nullable(),
    error: syncErrorSchema.nullable(),
  })
  .strict();

export type SyncPushAck = z.infer<typeof syncPushAckSchema>;

export const syncPushResponseSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    acks: z.array(syncPushAckSchema).max(MAX_PUSH_OPERATIONS),
  })
  .strict();

export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

export const syncPullRequestSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    storeId: idSchema,
    deviceId: idSchema,
    cursor: syncCursorSchema.nullable(),
    pageSize: z.number().int().positive().max(MAX_PULL_CHANGES),
  })
  .strict();

export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;

export const syncPullChangeSchema = z
  .object({
    operationId: idSchema,
    storeId: idSchema,
    entityType: z.enum(SYNC_ENTITY_TYPES),
    entityId: idSchema,
    operationType: z.enum(SYNC_OPERATION_TYPES),
    changeType: z.enum(['UPSERT', 'DELETE']),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    payload: jsonObjectSchema,
    entityVersion: nonNegativeIntegerSchema,
    serverRevision: nonNegativeIntegerSchema,
    occurredAt: timestampSchema,
  })
  .strict();

export type SyncPullChange = z.infer<typeof syncPullChangeSchema>;

export const syncPullResponseSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    changes: z.array(syncPullChangeSchema).max(MAX_PULL_CHANGES),
    nextCursor: syncCursorSchema,
    hasMore: z.boolean(),
    serverRevision: nonNegativeIntegerSchema,
  })
  .strict();

export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export const syncEnrollmentRequestSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    storeId: idSchema,
    userId: idSchema,
    storeMemberId: idSchema,
    deviceId: idSchema,
    storeName: z.string().trim().min(1).max(200),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
    timezone: z.string().trim().min(1).max(100),
    displayName: z.string().trim().min(1).max(200),
  })
  .strict();

export type SyncEnrollmentRequest = z.infer<typeof syncEnrollmentRequestSchema>;

export const syncEnrollmentResponseSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    storeId: idSchema,
    userId: idSchema,
    storeMemberId: idSchema,
    deviceId: idSchema,
    status: z.enum(['ENROLLED', 'ALREADY_ENROLLED']),
    serverRevision: nonNegativeIntegerSchema,
  })
  .strict();

export type SyncEnrollmentResponse = z.infer<typeof syncEnrollmentResponseSchema>;

export const syncReferenceContextRequestSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  storeId: idSchema,
  deviceId: idSchema,
}).strict();

export type SyncReferenceContextRequest = z.infer<typeof syncReferenceContextRequestSchema>;

const syncReferenceStoreSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  timezone: z.string().min(1).max(100),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  createdByUserId: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

const syncReferenceUserSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1).max(200),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

const syncReferenceMemberSchema = z.object({
  id: idSchema,
  storeId: idSchema,
  userId: idSchema,
  role: z.enum(['OWNER', 'ADMIN', 'STAFF']),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  joinedAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

const syncReferenceDeviceSchema = z.object({
  id: idSchema,
  storeId: idSchema,
  userId: idSchema.nullable(),
  platform: z.enum(['ANDROID', 'IOS', 'OTHER']),
  deviceLabel: z.string().max(200).nullable(),
  appVersion: z.string().max(64),
  status: z.enum(['ACTIVE', 'REVOKED']),
  createdAt: timestampSchema,
}).strict();

export const syncReferenceContextSchema = z.object({
  protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
  payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
  serverRevision: nonNegativeIntegerSchema,
  store: syncReferenceStoreSchema,
  users: z.array(syncReferenceUserSchema),
  members: z.array(syncReferenceMemberSchema),
  devices: z.array(syncReferenceDeviceSchema),
}).strict().superRefine((context, issueContext) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const userIds = new Set(context.users.map((user) => user.id));
  if (!unique(context.users.map((user) => user.id))) {
    issueContext.addIssue({ code: 'custom', path: ['users'], message: 'Reference users must be unique.' });
  }
  if (!unique(context.members.map((member) => member.id))) {
    issueContext.addIssue({ code: 'custom', path: ['members'], message: 'Reference memberships must be unique.' });
  }
  if (!unique(context.devices.map((device) => device.id))) {
    issueContext.addIssue({ code: 'custom', path: ['devices'], message: 'Reference devices must be unique.' });
  }
  if (!userIds.has(context.store.createdByUserId)) {
    issueContext.addIssue({ code: 'custom', path: ['users'], message: 'Store creator is missing from reference users.' });
  }
  context.members.forEach((member, index) => {
    if (member.storeId !== context.store.id || !userIds.has(member.userId)) {
      issueContext.addIssue({ code: 'custom', path: ['members', index], message: 'Membership reference is outside the store context.' });
    }
  });
  context.devices.forEach((device, index) => {
    if (device.storeId !== context.store.id || (device.userId !== null && !userIds.has(device.userId))) {
      issueContext.addIssue({ code: 'custom', path: ['devices', index], message: 'Device reference is outside the store context.' });
    }
  });
});

export type SyncReferenceContext = z.infer<typeof syncReferenceContextSchema>;

export const syncBootstrapRequestSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    storeId: idSchema,
    deviceId: idSchema,
    cursor: z
      .object({
        snapshotRevision: nonNegativeIntegerSchema,
        afterRevision: nonNegativeIntegerSchema,
        afterChangeIndex: nonNegativeIntegerSchema,
      })
      .strict()
      .nullable(),
    pageSize: z.number().int().positive().max(MAX_BOOTSTRAP_ENTITIES),
  })
  .strict();

export type SyncBootstrapRequest = z.infer<typeof syncBootstrapRequestSchema>;

export const syncBootstrapEntitySchema = z
  .object({
    operationId: idSchema,
    storeId: idSchema,
    entityType: z.enum(SYNC_ENTITY_TYPES),
    entityId: idSchema,
    entityVersion: nonNegativeIntegerSchema,
    serverRevision: nonNegativeIntegerSchema,
    changeIndex: nonNegativeIntegerSchema,
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    payload: jsonObjectSchema,
  })
  .strict();

export type SyncBootstrapEntity = z.infer<typeof syncBootstrapEntitySchema>;

export const syncBootstrapResponseSchema = z
  .object({
    protocolVersion: z.literal(SYNC_PROTOCOL_VERSION),
    payloadVersion: z.literal(SYNC_PAYLOAD_VERSION),
    snapshotRevision: nonNegativeIntegerSchema,
    entities: z.array(syncBootstrapEntitySchema).max(MAX_BOOTSTRAP_ENTITIES),
    nextCursor: syncBootstrapRequestSchema.shape.cursor,
    hasMore: z.boolean(),
  })
  .strict();

export type SyncBootstrapResponse = z.infer<typeof syncBootstrapResponseSchema>;

function utf8ByteLength(value: string): number {
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      length += 1;
    } else if (code <= 0x7ff) {
      length += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        length += 4;
        index += 1;
      } else {
        length += 3;
      }
    } else {
      length += 3;
    }
  }
  return length;
}

export function assertSyncOperationPayloadSize(value: SyncOperationEnvelope): SyncOperationEnvelope {
  const serialized = JSON.stringify(value);
  if (utf8ByteLength(serialized) > MAX_OPERATION_PAYLOAD_BYTES) {
    throw new Error(`Sync operation payload exceeds ${MAX_OPERATION_PAYLOAD_BYTES} bytes.`);
  }
  return value;
}

export function parseSyncOperationEnvelope(value: unknown): SyncOperationEnvelope {
  return assertSyncOperationPayloadSize(syncOperationEnvelopeSchema.parse(value));
}

export function parseSyncPushRequest(value: unknown): SyncPushRequest {
  const parsed = syncPushRequestSchema.parse(value);
  parsed.operations.forEach(assertSyncOperationPayloadSize);
  return parsed;
}

export function parseSyncPushResponse(value: unknown): SyncPushResponse {
  return syncPushResponseSchema.parse(value);
}

export function parseSyncPullRequest(value: unknown): SyncPullRequest {
  return syncPullRequestSchema.parse(value);
}

export function parseSyncPullResponse(value: unknown): SyncPullResponse {
  return syncPullResponseSchema.parse(value);
}

export function parseSyncEnrollmentRequest(value: unknown): SyncEnrollmentRequest {
  return syncEnrollmentRequestSchema.parse(value);
}

export function parseSyncEnrollmentResponse(value: unknown): SyncEnrollmentResponse {
  return syncEnrollmentResponseSchema.parse(value);
}

export function parseSyncReferenceContextRequest(value: unknown): SyncReferenceContextRequest {
  return syncReferenceContextRequestSchema.parse(value);
}

export function parseSyncReferenceContext(value: unknown): SyncReferenceContext {
  return syncReferenceContextSchema.parse(value);
}

export function parseSyncBootstrapRequest(value: unknown): SyncBootstrapRequest {
  return syncBootstrapRequestSchema.parse(value);
}

export function parseSyncBootstrapResponse(value: unknown): SyncBootstrapResponse {
  return syncBootstrapResponseSchema.parse(value);
}

export function isCanonicalDecimalString(value: string): boolean {
  return decimalStringSchema.safeParse(value).success;
}

export function parseCanonicalDecimalString(value: unknown): string {
  return decimalStringSchema.parse(value);
}
