import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { useDatabase } from '../db/DatabaseContext';
import { createCatalogueClient, resolveCurrentStore, type CatalogueClient } from './client';

interface CatalogueContextValue {
  /** Null when no store exists yet; screens show the honest pending state. */
  client: CatalogueClient | null;
}

const CatalogueContext = createContext<CatalogueContextValue>({ client: null });

/** Resolve the current store once per database and serve the screen client. */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const adapter = useDatabase();
  const value = useMemo<CatalogueContextValue>(() => {
    const current = resolveCurrentStore(adapter);
    if (!current) {
      return { client: null };
    }
    return { client: createCatalogueClient(adapter, current.store, current.device) };
  }, [adapter]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogueClient(): CatalogueClient | null {
  return useContext(CatalogueContext).client;
}
