import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { createCatalogueClient, resolveCurrentStore, type CatalogueClient } from '../catalogue/client';
import { useDatabase } from '../db/DatabaseContext';
import { countStores } from '../db/repositories';
import { provisionStoreContext } from '../storeContext/provisionStoreContext';
import { createDatabaseSalesClient, type SalesClient } from './client';

export interface SalesContextValue {
  client: SalesClient | null;
  catalogueClient: CatalogueClient | null;
  availability: 'ready' | 'missing-store' | 'failure';
  failure: string | null;
  setupLocalStore(ownerDisplayName: string, storeName: string): void;
  retryLocalStore(): void;
}

const SalesContext = createContext<SalesContextValue | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const adapter = useDatabase();
  const [, setRevision] = useState(0);

  const setupLocalStore = useCallback(
    (ownerDisplayName: string, storeName: string): void => {
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
    },
    [adapter],
  );

  const retryLocalStore = useCallback((): void => {
    setRevision((current) => current + 1);
  }, []);

  let client: SalesClient | null = null;
  let catalogueClient: CatalogueClient | null = null;
  let availability: SalesContextValue['availability'] = 'missing-store';
  let failure: string | null = null;
  try {
    const current = resolveCurrentStore(adapter);
    if (!current) {
      if (countStores(adapter) > 0) {
        availability = 'failure';
        failure = 'An existing local store could not be opened safely. Retry instead of creating another store.';
      }
    } else {
      const nextClient = createDatabaseSalesClient(adapter, {
        storeId: current.store.id,
        deviceId: current.device.id,
      });
      const nextCatalogueClient = createCatalogueClient(adapter, current.store, current.device);
      client = nextClient;
      catalogueClient = nextCatalogueClient;
      availability = 'ready';
    }
  } catch {
    availability = 'failure';
    failure = 'The existing local store could not be read safely. Retry before creating or recording anything.';
  }

  const value: SalesContextValue = {
    client,
    catalogueClient,
    availability,
    failure,
    setupLocalStore,
    retryLocalStore,
  };

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): SalesContextValue {
  const value = useContext(SalesContext);
  if (!value) {
    throw new Error('SalesProvider is missing.');
  }
  return value;
}

export function useSalesClient(): SalesClient | null {
  return useSales().client;
}
