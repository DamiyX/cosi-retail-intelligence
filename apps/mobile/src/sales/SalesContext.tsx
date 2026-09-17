import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { createCatalogueClient, resolveCurrentStore, type CatalogueClient } from '../catalogue/client';
import { useDatabase } from '../db/DatabaseContext';
import { provisionStoreContext } from '../storeContext/provisionStoreContext';
import { createDatabaseSalesClient, type SalesClient } from './client';

export interface SalesContextValue {
  client: SalesClient | null;
  catalogueClient: CatalogueClient | null;
  setupLocalStore(ownerDisplayName: string, storeName: string): void;
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

  let client: SalesClient | null = null;
  let catalogueClient: CatalogueClient | null = null;
  const current = resolveCurrentStore(adapter);
  if (current) {
    try {
      client = createDatabaseSalesClient(adapter, {
        storeId: current.store.id,
        deviceId: current.device.id,
      });
      catalogueClient = createCatalogueClient(adapter, current.store, current.device);
    } catch {
      client = null;
      catalogueClient = null;
    }
  }

  const value: SalesContextValue = {
    client,
    catalogueClient,
    setupLocalStore,
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
