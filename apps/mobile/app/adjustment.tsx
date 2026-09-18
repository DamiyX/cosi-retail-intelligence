import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import { InventoryProvider, useInventory } from '../src/inventory/InventoryContext';
import AdjustmentScreen from '../src/screens/inventory/AdjustmentScreen';
import type { InventoryAdjustmentReason } from '../src/db/repositories';
import { ErrorPanel } from '../src/ui/components';

function AdjustmentRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ storeProductId?: string; groupId?: string; reasonCode?: string }>();
  const { client, failure } = useInventory();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard adjustment draft?', 'Your quantity, reason, and selected group will be cleared.', [
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
  if (!client) return <View style={styles.fill}>{failure ? <ErrorPanel title="Adjustments unavailable" message={failure} onDismiss={() => router.back()} /> : null}</View>;
  const allowedReasons: readonly InventoryAdjustmentReason[] = ['EXPIRED', 'DAMAGED', 'MISSING', 'PERSONAL_USE', 'CORRECTION', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN'];
  const reasonCode = typeof params.reasonCode === 'string' && allowedReasons.includes(params.reasonCode as InventoryAdjustmentReason)
    ? params.reasonCode as InventoryAdjustmentReason
    : undefined;
  return <AdjustmentScreen client={client} isFocused={focused} storeProductId={typeof params.storeProductId === 'string' ? params.storeProductId : undefined} groupId={typeof params.groupId === 'string' ? params.groupId : undefined} reasonCode={reasonCode} onBack={() => router.back()} onDirtyDraftChange={(value, discard) => { setDirty(value); discardRef.current = discard; }} />;
}

export default function AdjustmentRoute() {
  return <InventoryProvider><AdjustmentRouteContent /></InventoryProvider>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
