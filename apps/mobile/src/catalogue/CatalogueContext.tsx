import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { useDatabase } from '../db/DatabaseContext';
import { provisionStoreContext } from '../storeContext/provisionStoreContext';
import { createCatalogueClient, resolveCurrentStore, type CatalogueClient } from './client';

interface CatalogueContextValue {
  client: CatalogueClient | null;
  setupLocalStore(ownerDisplayName: string, storeName: string): void;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

/** Resolve the current local store and expose the minimal M1 provisioning path. */
export function CatalogueProvider({ children }: { children: ReactNode }) {
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
  const current = resolveCurrentStore(adapter);
  const value: CatalogueContextValue = {
    client: current ? createCatalogueClient(adapter, current.store, current.device) : null,
    setupLocalStore,
  };
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): CatalogueContextValue {
  const value = useContext(CatalogueContext);
  if (!value) {
    throw new Error('CatalogueProvider is missing.');
  }
  return value;
}

export function useCatalogueClient(): CatalogueClient | null {
  return useCatalogue().client;
}
