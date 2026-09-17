import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef } from 'react';

import type { SaleDraftExit } from './draftExit';

interface SaleDraftNavigationContextValue {
  clearDraft(): void;
  getDraft(): SaleDraftExit | null;
  setDraft(draft: SaleDraftExit | null): void;
}

const SaleDraftNavigationContext = createContext<SaleDraftNavigationContextValue | null>(null);

/**
 * Keeps a Sell draft available to the tab navigator without persisting it.
 * The M3 cart deliberately remains in memory until a completed sale commits.
 */
export function SaleDraftNavigationProvider({ children }: { children: ReactNode }) {
  const draftRef = useRef<SaleDraftExit | null>(null);

  const clearDraft = useCallback((): void => {
    draftRef.current = null;
  }, []);

  const getDraft = useCallback((): SaleDraftExit | null => draftRef.current, []);

  const setDraft = useCallback((draft: SaleDraftExit | null): void => {
    draftRef.current = draft;
  }, []);

  const value = useMemo<SaleDraftNavigationContextValue>(
    () => ({ clearDraft, getDraft, setDraft }),
    [clearDraft, getDraft, setDraft],
  );

  return <SaleDraftNavigationContext.Provider value={value}>{children}</SaleDraftNavigationContext.Provider>;
}

export function useSaleDraftNavigation(): SaleDraftNavigationContextValue {
  const value = useContext(SaleDraftNavigationContext);
  if (!value) {
    throw new Error('SaleDraftNavigationProvider is missing.');
  }
  return value;
}
