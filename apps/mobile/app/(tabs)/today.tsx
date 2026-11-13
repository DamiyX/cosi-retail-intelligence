import { useIsFocused, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useDatabase } from '../../src/db/DatabaseContext';
import { FinanceProvider, useFinance } from '../../src/finance/FinanceContext';
import { InventoryProvider, useInventory } from '../../src/inventory/InventoryContext';
import HomeScreen from '../../src/screens/home/HomeScreen';
import MissingFinanceStore from '../../src/screens/finance/MissingFinanceStore';
import { ErrorPanel } from '../../src/ui/components';
import { createPersonalPriceClientForActiveContext } from '../../src/priceIntelligence';

function HomeRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const adapter = useDatabase();
  const { client: financeClient, failure: financeFailure, retryLocalStore } = useFinance();
  const { client: inventoryClient, failure: inventoryFailure } = useInventory();
  const priceAccess = useMemo(() => {
    if (!financeClient) return { client: null, failure: null };
    try {
      return {
        client: createPersonalPriceClientForActiveContext(adapter, financeClient.storeId),
        failure: null,
      };
    } catch {
      return { client: null, failure: 'Only an active store owner can view personal purchase cost changes.' };
    }
  }, [adapter, financeClient]);
  if (!financeClient) {
    return financeFailure ? <ErrorPanel title="Home unavailable" message={financeFailure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      inventoryFailure={inventoryFailure}
      personalPriceClient={priceAccess.client}
      personalPriceFailure={priceAccess.failure}
      isFocused={focused}
      onSell={() => router.push('/sell')}
      onRestock={() => router.push('/restock')}
      onStockChecks={() => router.push('/reconciliation')}
      onRecordExpense={() => router.push('/expense')}
      onOpenSummary={() => router.push('/summary')}
      onSeeAttention={() => router.push('/attention')}
      onSeePriceChanges={() => router.push('/products/price-changes')}
      onOpenPriceProduct={(storeProductId) => router.push(`/products/${storeProductId}`)}
    />
  );
}

export default function TodayRoute() {
  return <FinanceProvider><InventoryProvider><HomeRouteContent /></InventoryProvider></FinanceProvider>;
}
