import {
  parseSyncBootstrapResponse,
  parseSyncEnrollmentResponse,
  parseSyncPullResponse,
  parseSyncPushResponse,
  parseSyncReferenceContext,
  type SyncBootstrapRequest,
  type SyncBootstrapResponse,
  type SyncEnrollmentRequest,
  type SyncEnrollmentResponse,
  type SyncPullRequest,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncReferenceContext,
  type SyncReferenceContextRequest,
} from '@retail/contracts';

export interface AuthenticatedSession {
  accessToken: string;
  expiresAt?: string;
}

export interface AuthenticatedSessionProvider {
  getSession(): Promise<AuthenticatedSession | null>;
}

export interface SyncTransport {
  enroll(request: SyncEnrollmentRequest): Promise<SyncEnrollmentResponse>;
  push(request: SyncPushRequest): Promise<SyncPushResponse>;
  pull(request: SyncPullRequest): Promise<SyncPullResponse>;
  bootstrap(request: SyncBootstrapRequest): Promise<SyncBootstrapResponse>;
  referenceContext(request: SyncReferenceContextRequest): Promise<SyncReferenceContext>;
}

export type SyncTransportErrorCode =
  | 'AUTH_REQUIRED'
  | 'NETWORK'
  | 'RATE_LIMITED'
  | 'SERVER_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE';

export class SyncTransportError extends Error {
  readonly code: SyncTransportErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(
    code: SyncTransportErrorCode,
    message: string,
    options: { retryable: boolean; status?: number | null } = { retryable: false },
  ) {
    super(message);
    this.name = 'SyncTransportError';
    this.code = code;
    this.retryable = options.retryable;
    this.status = options.status ?? null;
  }
}

export interface HttpSyncTransportOptions {
  baseUrl: string;
  publishableKey: string;
  sessionProvider: AuthenticatedSessionProvider;
  fetchImpl?: typeof fetch;
}

function endpoint(baseUrl: string, functionName: string): string {
  return `${baseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`;
}

export function createHttpSyncTransport(options: HttpSyncTransportOptions): SyncTransport {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function post<T>(
    functionName: string,
    request: unknown,
    parse: (value: unknown) => T,
  ): Promise<T> {
    const session = await options.sessionProvider.getSession();
    if (!session?.accessToken) {
      throw new SyncTransportError('AUTH_REQUIRED', 'An authenticated session is required for cloud sync.');
    }
    let response: Response;
    try {
      response = await fetchImpl(endpoint(options.baseUrl, functionName), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          apikey: options.publishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw new SyncTransportError(
        'NETWORK',
        error instanceof Error ? error.message : 'The sync request could not reach the server.',
        { retryable: true },
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new SyncTransportError('AUTH_REQUIRED', 'The sync session is no longer valid.', {
          retryable: false,
          status: response.status,
        });
      }
      if (response.status === 408 || response.status === 429) {
        throw new SyncTransportError('RATE_LIMITED', 'The sync server asked the client to retry later.', {
          retryable: true,
          status: response.status,
        });
      }
      if (response.status >= 500) {
        throw new SyncTransportError('SERVER_UNAVAILABLE', 'The sync server is temporarily unavailable.', {
          retryable: true,
          status: response.status,
        });
      }
      throw new SyncTransportError('INVALID_REQUEST', 'The sync server rejected the request.', {
        retryable: false,
        status: response.status,
      });
    }

    try {
      return parse(await response.json());
    } catch (error) {
      throw new SyncTransportError(
        'INVALID_RESPONSE',
        error instanceof Error ? error.message : 'The sync server returned an invalid response.',
        { retryable: true, status: response.status },
      );
    }
  }

  return {
    enroll: (request) => post('sync-enroll', request, parseSyncEnrollmentResponse),
    push: (request) => post('sync-push', request, parseSyncPushResponse),
    pull: (request) => post('sync-pull', request, parseSyncPullResponse),
    bootstrap: (request) => post('sync-bootstrap', request, parseSyncBootstrapResponse),
    referenceContext: (request) => post('sync-reference-context', request, parseSyncReferenceContext),
  };
}
