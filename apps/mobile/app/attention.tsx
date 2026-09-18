import { useIsFocused, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AttentionScreen from '../src/screens/inventory/AttentionScreen';
import { InventoryProvider, useInventory } from '../src/inventory/InventoryContext';
import { ErrorPanel } from '../src/ui/components';

function AttentionRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure } = useInventory();
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Needs attention unavailable" message={failure} onDismiss={() => router.back()} /> : null}</View>;
  return (
    <AttentionScreen
      client={client}
      isFocused={focused}
      onBack={() => router.back()}
      onRestock={(storeProductId) => router.push({ pathname: '/restock', params: { quickAddProductId: storeProductId } })}
      onReconcile={(storeProductId) => router.push({ pathname: '/reconciliation', params: { storeProductId } })}
      onRemove={(item) => router.push({ pathname: '/adjustment', params: { storeProductId: item.storeProductId, groupId: item.groupId ?? undefined, reasonCode: 'EXPIRED' } })}
    />
  );
}

export default function AttentionRoute() {
  return <InventoryProvider><AttentionRouteContent /></InventoryProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
