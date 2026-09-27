import {
  parseSyncBootstrapRequest,
  parseSyncBootstrapResponse,
  parseSyncOperationEnvelope,
  parseSyncPushRequest,
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

describe('M7 provider-independent sync contracts', () => {
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
});
