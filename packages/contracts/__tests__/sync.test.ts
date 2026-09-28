import {
  parseSyncBootstrapRequest,
  parseSyncBootstrapResponse,
  parseSyncOperationEnvelope,
  parseSyncPushRequest,
  parseSyncEnrollmentRequest,
  parseSyncReferenceContext,
  parseSyncReferenceContextRequest,
  MAX_OPERATION_PAYLOAD_BYTES,
  isCanonicalDecimalString,
} from '../src';

const envelope = {
  payloadVersion: 1,
  operationType: 'EXPENSE_CREATED',
  operationId: '00000000-0000-4000-8000-000000000001',
  storeId: '00000000-0000-4000-8000-000000000002',
  deviceId: '00000000-0000-4000-8000-000000000003',
  entityType: 'EXPENSE',
  entityId: '00000000-0000-4000-8000-000000000004',
  baseServerVersion: null,
  occurredAt: '2026-09-19T00:00:00.000Z',
  entities: { expenseVersion: 1, expense: { id: '00000000-0000-4000-8000-000000000004' } },
};

const referenceContext = {
  protocolVersion: 1,
  payloadVersion: 1,
  serverRevision: 2,
  store: {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Market Shop',
    currencyCode: 'NGN',
    countryCode: 'NG',
    timezone: 'Africa/Lagos',
    status: 'ACTIVE',
    createdByUserId: '00000000-0000-4000-8000-000000000011',
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
  },
  users: [{
    id: '00000000-0000-4000-8000-000000000011',
    displayName: 'Owner',
    status: 'ACTIVE',
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
  }],
  members: [{
    id: '00000000-0000-4000-8000-000000000012',
    storeId: '00000000-0000-4000-8000-000000000010',
    userId: '00000000-0000-4000-8000-000000000011',
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: '2026-09-19T00:00:00.000Z',
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
  }],
  devices: [{
    id: '00000000-0000-4000-8000-000000000013',
    storeId: '00000000-0000-4000-8000-000000000010',
    userId: '00000000-0000-4000-8000-000000000011',
    platform: 'ANDROID',
    deviceLabel: null,
    appVersion: '1.0.0',
    status: 'ACTIVE',
    createdAt: '2026-09-19T00:00:00.000Z',
  }],
};

describe('M7 provider-independent sync contracts', () => {
  it('binds reference-context requests to a registered device identity', () => {
    const request = {
      protocolVersion: 1,
      storeId: '00000000-0000-4000-8000-000000000010',
      deviceId: '00000000-0000-4000-8000-000000000013',
    };
    expect(parseSyncReferenceContextRequest(request)).toEqual(request);
    expect(() => parseSyncReferenceContextRequest({ ...request, deviceId: undefined })).toThrow();
    expect(() => parseSyncReferenceContextRequest({ ...request, deviceId: 'not-a-uuid' })).toThrow();
  });

  it('keeps first-device enrollment compatible with clients that do not yet send country metadata', () => {
    expect(parseSyncEnrollmentRequest({
      protocolVersion: 1,
      storeId: '00000000-0000-4000-8000-000000000010',
      userId: '00000000-0000-4000-8000-000000000011',
      storeMemberId: '00000000-0000-4000-8000-000000000012',
      deviceId: '00000000-0000-4000-8000-000000000013',
      storeName: 'Market Shop',
      currencyCode: 'NGN',
      timezone: 'Africa/Lagos',
      displayName: 'Owner',
    }).countryCode).toBeUndefined();
  });

  it('rejects unknown protocol and payload versions at runtime', () => {
    expect(() => parseSyncOperationEnvelope({ ...envelope, payloadVersion: 2 })).toThrow();
    expect(() => parseSyncPushRequest({
      protocolVersion: 2,
      payloadVersion: 1,
      storeId: envelope.storeId,
      deviceId: envelope.deviceId,
      operations: [envelope],
    })).toThrow();
  });

  it('rejects identifiers that cannot cross the PostgreSQL UUID boundary', () => {
    expect(() => parseSyncOperationEnvelope({ ...envelope, operationId: 'not-a-uuid' })).toThrow();
    expect(() => parseSyncBootstrapRequest({
      protocolVersion: 1,
      payloadVersion: 1,
      storeId: 'not-a-uuid',
      deviceId: envelope.deviceId,
      cursor: null,
      pageSize: 100,
    })).toThrow();
  });

  it('enforces a bounded, paginated bootstrap request', () => {
    expect(parseSyncBootstrapRequest({
      protocolVersion: 1,
      payloadVersion: 1,
      storeId: envelope.storeId,
      deviceId: envelope.deviceId,
      cursor: null,
      pageSize: 100,
    }).pageSize).toBe(100);
    expect(() => parseSyncBootstrapRequest({
      protocolVersion: 1,
      payloadVersion: 1,
      storeId: envelope.storeId,
      deviceId: envelope.deviceId,
      cursor: null,
      pageSize: 501,
    })).toThrow();
    expect(parseSyncBootstrapRequest({
      protocolVersion: 1,
      payloadVersion: 1,
      storeId: envelope.storeId,
      deviceId: envelope.deviceId,
      cursor: { snapshotRevision: 4, afterRevision: 2, afterChangeIndex: 0 },
      pageSize: 1,
    }).cursor).toEqual({ snapshotRevision: 4, afterRevision: 2, afterChangeIndex: 0 });
    expect(() => parseSyncBootstrapRequest({
      protocolVersion: 1,
      payloadVersion: 1,
      storeId: envelope.storeId,
      deviceId: envelope.deviceId,
      cursor: { snapshotRevision: 4, afterEntityType: 'STORE_PRODUCT', afterEntityId: envelope.entityId },
      pageSize: 1,
    })).toThrow();
  });

  it('requires each bootstrap operation occurrence to carry its identity and order', () => {
    const response = {
      protocolVersion: 1,
      payloadVersion: 1,
      snapshotRevision: 4,
      entities: [{
        operationId: envelope.operationId,
        storeId: envelope.storeId,
        entityType: envelope.entityType,
        entityId: envelope.entityId,
        entityVersion: 1,
        serverRevision: 2,
        changeIndex: 0,
        payloadVersion: 1,
        payload: envelope,
      }],
      nextCursor: null,
      hasMore: false,
    };
    expect(parseSyncBootstrapResponse(response).entities).toHaveLength(1);
    const { operationId: _omitted, ...withoutId } = response.entities[0];
    expect(() => parseSyncBootstrapResponse({ ...response, entities: [withoutId] })).toThrow();
  });

  it('allows a bootstrap response to close its final page with a null cursor', () => {
    expect(() => parseSyncBootstrapResponse({
      protocolVersion: 1,
      payloadVersion: 1,
      snapshotRevision: 4,
      entities: [],
      nextCursor: null,
      hasMore: false,
    })).not.toThrow();
  });

  it('accepts canonical decimal strings and rejects exponent/leading-zero forms', () => {
    expect(isCanonicalDecimalString('0')).toBe(true);
    expect(isCanonicalDecimalString('-12.500000')).toBe(true);
    expect(isCanonicalDecimalString('01.5')).toBe(false);
    expect(isCanonicalDecimalString('1e-6')).toBe(false);
  });

  it('rejects an operation envelope above the byte bound', () => {
    expect(() => parseSyncOperationEnvelope({
      ...envelope,
      entities: { blob: 'x'.repeat(MAX_OPERATION_PAYLOAD_BYTES) },
    })).toThrow(`exceeds ${MAX_OPERATION_PAYLOAD_BYTES} bytes`);
  });

  it('validates same-store reference relationships while retaining revoked historical devices', () => {
    expect(parseSyncReferenceContext(referenceContext).devices[0]?.status).toBe('ACTIVE');
    expect(parseSyncReferenceContext({
      ...referenceContext,
      store: { ...referenceContext.store, countryCode: null },
    }).store.countryCode).toBeNull();
    expect(parseSyncReferenceContext({
      ...referenceContext,
      devices: [{ ...referenceContext.devices[0], status: 'REVOKED' }],
    }).devices[0]?.status).toBe('REVOKED');
    expect(() => parseSyncReferenceContext({
      ...referenceContext,
      devices: [{ ...referenceContext.devices[0], storeId: '00000000-0000-4000-8000-000000000099' }],
    })).toThrow();
    expect(() => parseSyncReferenceContext({
      ...referenceContext,
      members: [{ ...referenceContext.members[0], userId: '00000000-0000-4000-8000-000000000099' }],
    })).toThrow();
  });
});
