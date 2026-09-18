import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import { InventoryProvider, useInventory } from '../src/inventory/InventoryContext';
import ReconciliationScreen from '../src/screens/inventory/ReconciliationScreen';
import { ErrorPanel } from '../src/ui/components';

function ReconciliationRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ storeProductId?: string; assignmentId?: string }>();
  const { client, failure } = useInventory();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard stock check draft?', 'Your physical count and note will be cleared; saved evidence remains only when you submit it.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setAllowNavigation(true);
          discardRef.current();
          requestAnimationFrame(() => {
            navigation.dispatch(data.action);
            setAllowNavigation(false);
          });
        },
      },
    ]);
  });
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Stock checks unavailable" message={failure} onDismiss={() => router.back()} /> : null}</View>;
  return <ReconciliationScreen client={client} isFocused={focused} storeProductId={typeof params.storeProductId === 'string' ? params.storeProductId : undefined} assignmentId={typeof params.assignmentId === 'string' ? params.assignmentId : undefined} onBack={() => router.back()} onDirtyDraftChange={(value, discard) => { setDirty(value); discardRef.current = discard; }} />;
}

export default function ReconciliationRoute() {
  return <InventoryProvider><ReconciliationRouteContent /></InventoryProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
