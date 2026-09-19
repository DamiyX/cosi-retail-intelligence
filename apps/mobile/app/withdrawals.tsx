import { useIsFocused, useRouter } from 'expo-router';

import OwnerWithdrawalHistoryScreen from '../src/screens/finance/OwnerWithdrawalHistoryScreen';
import MissingFinanceStore from '../src/screens/finance/MissingFinanceStore';
import { FinanceProvider, useFinance } from '../src/finance/FinanceContext';
import { ErrorPanel } from '../src/ui/components';

function WithdrawalHistoryRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = useFinance();
  if (!client) {
    return failure ? <ErrorPanel title="Withdrawal history unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return (
    <OwnerWithdrawalHistoryScreen
      client={client}
      isFocused={focused}
      onBack={() => router.back()}
      onRecordWithdrawal={() => router.push('/withdrawal')}
    />
  );
}

export default function WithdrawalHistoryRoute() {
  return <FinanceProvider><WithdrawalHistoryRouteContent /></FinanceProvider>;
}
