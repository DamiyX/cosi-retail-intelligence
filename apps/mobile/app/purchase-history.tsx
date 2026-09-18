import { useIsFocused, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PurchasesProvider, usePurchases } from '../src/purchases/PurchasesContext';
import PurchaseHistoryScreen from '../src/screens/purchases/PurchaseHistoryScreen';
import { ErrorPanel } from '../src/ui/components';

function HistoryRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure, retryLocalStore } = usePurchases();
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Purchase history unavailable" message={failure} onRetry={retryLocalStore} /> : null}</View>;
  return <PurchaseHistoryScreen client={client} isFocused={focused} onBack={() => router.back()} onOpenPurchase={(id) => router.push(`/purchases/${id}`)} />;
}

export default function PurchaseHistoryRoute() {
  return <PurchasesProvider><HistoryRouteContent /></PurchasesProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
