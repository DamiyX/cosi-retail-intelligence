import { createContext, type ReactNode, useContext } from 'react';

import type { DatabaseAdapter } from './adapter';

const DatabaseContext = createContext<DatabaseAdapter | null>(null);

/** Provide the initialized application database to product screens. */
export function DatabaseProvider({
  adapter,
  children,
}: {
  adapter: DatabaseAdapter;
  children: ReactNode;
}) {
  return <DatabaseContext.Provider value={adapter}>{children}</DatabaseContext.Provider>;
}

/** The ready application database; throws when no provider is mounted. */
export function useDatabase(): DatabaseAdapter {
  const adapter = useContext(DatabaseContext);
  if (!adapter) {
    throw new Error('useDatabase requires a DatabaseProvider.');
  }
  return adapter;
}
