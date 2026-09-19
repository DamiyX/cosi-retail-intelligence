import { useIsFocused, useRouter } from 'expo-router';

import BusinessSummaryScreen from '../src/screens/finance/BusinessSummaryScreen';
import MissingFinanceStore from '../src/screens/finance/MissingFinanceStore';
import { FinanceProvider, useFinance } from '../src/finance/FinanceContext';
import { ErrorPanel } from '../src/ui/components';

function SummaryRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = useFinance();
  if (!client) {
    return failure ? <ErrorPanel title="Summary unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingFinanceStore />;
  }
  return <BusinessSummaryScreen client={client} isFocused={focused} onBack={() => router.back()} />;
}

export default function SummaryRoute() {
  return <FinanceProvider><SummaryRouteContent /></FinanceProvider>;
}
