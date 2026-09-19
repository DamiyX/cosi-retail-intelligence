import { useIsFocused, useRouter } from 'expo-router';

import ExpenseHistoryScreen from '../src/screens/finance/ExpenseHistoryScreen';
import MissingFinanceStore from '../src/screens/finance/MissingFinanceStore';
import { FinanceProvider, useFinance } from '../src/finance/FinanceContext';
import { ErrorPanel } from '../src/ui/components';

function ExpenseHistoryRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = useFinance();
  if (!client) {
    return failure ? <ErrorPanel title="Expense history unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <ExpenseHistoryScreen
      client={client}
      isFocused={focused}
      onBack={() => router.back()}
      onRecordExpense={() => router.push('/expense')}
    />
  );
}

export default function ExpenseHistoryRoute() {
  return <FinanceProvider><ExpenseHistoryRouteContent /></FinanceProvider>;
}
