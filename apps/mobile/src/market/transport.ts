import type { MarketControlRequest, MarketKey } from '@retail/contracts';

/** Only fixture transports may be injected during D-051 source prototyping. */
export interface MarketTransport {
  readonly available: boolean;
  readonly authenticatedUserId: string | null;
  control(request: MarketControlRequest): Promise<unknown>;
  state(request: { storeId: string; deviceId: string; operationId: string | null }): Promise<unknown>;
  read(request: { storeId: string; deviceId: string; keys: MarketKey[] }): Promise<unknown>;
}

export const disabledMarketTransport: MarketTransport = {
  available: false,
  authenticatedUserId: null,
  async control() { throw new Error('Market contribution is unavailable. Nothing was sent.'); },
  async state() { throw new Error('Market contribution is unavailable. Nothing was sent.'); },
  async read() { throw new Error('Market prices are unavailable. Nothing was sent.'); },
};
