import { useIsFocused, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import GuidedChecksScreen from '../src/screens/inventory/GuidedChecksScreen';
import { InventoryProvider, useInventory } from '../src/inventory/InventoryContext';
import { ErrorPanel } from '../src/ui/components';

function GuidedChecksRouteContent() {
  const router = useRouter();
  const focused = useIsFocused();
  const { client, failure } = useInventory();
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Guided checks unavailable" message={failure} onDismiss={() => router.back()} /> : null}</View>;
  return <GuidedChecksScreen client={client} isFocused={focused} onBack={() => router.back()} onStartCheck={(storeProductId, assignmentId) => router.push({ pathname: '/reconciliation', params: { storeProductId, assignmentId } })} />;
}

export default function GuidedChecksRoute() {
  return <InventoryProvider><GuidedChecksRouteContent /></InventoryProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

