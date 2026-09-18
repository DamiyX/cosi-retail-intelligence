import { createContext, type ReactNode, useContext } from 'react';

import { resolveCurrentStore } from '../catalogue/client';
import { useDatabase } from '../db/DatabaseContext';
import { createDatabaseInventoryClient, type InventoryClient } from './client';

interface InventoryContextValue {
  client: InventoryClient | null;
  failure: string | null;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const adapter = useDatabase();
  let client: InventoryClient | null = null;
  let failure: string | null = null;
  try {
    const current = resolveCurrentStore(adapter);
    client = current ? createDatabaseInventoryClient(adapter, { storeId: current.store.id, deviceId: current.device.id }) : null;
  } catch (error) {
    failure = error instanceof Error ? error.message : 'Inventory is unavailable on this device.';
  }
  return <InventoryContext.Provider value={{ client, failure }}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('InventoryProvider is missing.');
  return value;
}

export function useInventoryClient(): InventoryClient | null {
  return useInventory().client;
}
