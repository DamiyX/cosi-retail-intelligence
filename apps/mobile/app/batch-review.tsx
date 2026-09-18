import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import { InventoryProvider, useInventory } from '../src/inventory/InventoryContext';
import BatchReviewScreen from '../src/screens/inventory/BatchReviewScreen';
import { ErrorPanel } from '../src/ui/components';

function BatchReviewRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ storeProductId?: string }>();
  const { client, failure } = useInventory();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard review draft?', 'Your pending inspected groups will be cleared.', [
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
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Inventory review unavailable" message={failure} onDismiss={() => router.back()} /> : null}</View>;
  return <BatchReviewScreen client={client} isFocused={focused} storeProductId={typeof params.storeProductId === 'string' ? params.storeProductId : undefined} onBack={() => router.back()} onDirtyDraftChange={(value, discard) => { setDirty(value); discardRef.current = discard; }} />;
}

export default function BatchReviewRoute() {
  return <InventoryProvider><BatchReviewRouteContent /></InventoryProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
