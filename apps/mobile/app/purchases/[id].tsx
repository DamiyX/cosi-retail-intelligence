import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PurchasesProvider, usePurchases } from '../../src/purchases/PurchasesContext';
import PurchaseDetailScreen from '../../src/screens/purchases/PurchaseDetailScreen';
import { ErrorPanel } from '../../src/ui/components';

function DetailRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string }>();
  const { client, failure, retryLocalStore } = usePurchases();
  const purchaseId = typeof params.id === 'string' ? params.id : '';
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Receipt unavailable" message={failure} onRetry={retryLocalStore} /> : null}</View>;
  return <PurchaseDetailScreen client={client} purchaseId={purchaseId} isFocused={focused} onBack={() => router.back()} />;
}

export default function PurchaseDetailRoute() {
  return <PurchasesProvider><DetailRouteContent /></PurchasesProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
