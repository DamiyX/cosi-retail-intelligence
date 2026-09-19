import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { resolveCurrentStore } from '../catalogue/client';
import { useDatabase } from '../db/DatabaseContext';
import { countStores } from '../db/repositories';
import { provisionStoreContext } from '../storeContext/provisionStoreContext';
import { createDatabaseFinanceClient, type FinanceClient } from './client';

export interface FinanceContextValue {
  client: FinanceClient | null;
  availability: 'ready' | 'missing-store' | 'failure';
  failure: string | null;
  setupLocalStore(ownerDisplayName: string, storeName: string): void;
  retryLocalStore(): void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const adapter = useDatabase();
  const [, setRevision] = useState(0);
  const setupLocalStore = useCallback((ownerDisplayName: string, storeName: string): void => {
    provisionStoreContext(adapter, {
      ownerDisplayName,
      storeName,
      currencyCode: 'NGN',
      countryCode: 'NG',
      timezone: 'Africa/Lagos',
      deviceLabel: 'Primary Android device',
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
    });
    setRevision((current) => current + 1);
  }, [adapter]);
  const retryLocalStore = useCallback((): void => setRevision((current) => current + 1), []);

  let client: FinanceClient | null = null;
  let availability: FinanceContextValue['availability'] = 'missing-store';
  let failure: string | null = null;
  try {
    const current = resolveCurrentStore(adapter);
    if (!current) {
      if (countStores(adapter) > 0) {
        availability = 'failure';
        failure = 'An existing local store could not be opened safely. Retry instead of creating another store.';
      }
    } else {
      client = createDatabaseFinanceClient(adapter, {
        storeId: current.store.id,
        deviceId: current.device.id,
      });
      availability = 'ready';
    }
  } catch {
    availability = 'failure';
    failure = 'The existing local store could not be read safely. Retry before recording anything.';
  }

  return <FinanceContext.Provider value={{ client, availability, failure, setupLocalStore, retryLocalStore }}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('FinanceProvider is missing.');
  return value;
}

export function useFinanceClient(): FinanceClient | null {
  return useFinance().client;
}
