import { useIsFocused, useRouter } from 'expo-router';

import { FinanceProvider, useFinance } from '../../src/finance/FinanceContext';
import { InventoryProvider, useInventory } from '../../src/inventory/InventoryContext';
import HomeScreen from '../../src/screens/home/HomeScreen';
import MissingFinanceStore from '../../src/screens/finance/MissingFinanceStore';
import { ErrorPanel } from '../../src/ui/components';

function HomeRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client: financeClient, failure: financeFailure, retryLocalStore } = useFinance();
  const { client: inventoryClient, failure: inventoryFailure } = useInventory();
  if (!financeClient) {
    return financeFailure ? <ErrorPanel title="Home unavailable" message={financeFailure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <HomeScreen
      financeClient={financeClient}
      inventoryClient={inventoryClient}
      inventoryFailure={inventoryFailure}
      isFocused={focused}
      onSell={() => router.push('/sell')}
      onRestock={() => router.push('/restock')}
      onStockChecks={() => router.push('/reconciliation')}
      onRecordExpense={() => router.push('/expense')}
      onOpenSummary={() => router.push('/summary')}
      onSeeAttention={() => router.push('/attention')}
    />
  );
}

export default function TodayRoute() {
  return <FinanceProvider><InventoryProvider><HomeRouteContent /></InventoryProvider></FinanceProvider>;
}
