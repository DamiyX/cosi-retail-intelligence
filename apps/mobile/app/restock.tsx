import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import { PurchasesProvider, usePurchases } from '../src/purchases/PurchasesContext';
import RestockScreen from '../src/screens/purchases/RestockScreen';
import { ErrorPanel, Field, PrimaryButton } from '../src/ui/components';
import { theme } from '../src/ui/theme';

function MissingStore() {
  const { setupLocalStore } = usePurchases();
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const setup = (): void => {
    if (!ownerName.trim() || !storeName.trim()) {
      setFailure('Enter your name and store name.');
      return;
    }
    try {
      setupLocalStore(ownerName.trim(), storeName.trim());
    } catch {
      setFailure('Store setup could not be saved on this device. Nothing was changed.');
    }
  };
  return (
    <View style={styles.center}>
      <Field label="Your name" value={ownerName} onChangeText={setOwnerName} />
      <Field label="Store name" value={storeName} onChangeText={setStoreName} />
      {failure ? <ErrorPanel title="Store not created" message={failure} /> : null}
      <PrimaryButton title="Create local store" onPress={setup} />
    </View>
  );
}

function RestockRouteContent() {
  const router = useRouter();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ quickAddProductId?: string }>();
  const { client, failure, retryLocalStore } = usePurchases();
  const discardRef = useRef<() => void>(() => undefined);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  usePreventRemove(focused && dirty && !allowNavigation, ({ data }) => {
    Alert.alert('Discard restock draft?', 'Your unsaved restock details will be cleared.', [
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
  if (!client) {
    return failure ? <ErrorPanel title="Restock unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingStore />;
  }
  return (
    <RestockScreen
      client={client}
      isFocused={focused}
      quickAddProductId={typeof params.quickAddProductId === 'string' ? params.quickAddProductId : undefined}
      onBack={() => router.back()}
      onOpenReceipt={(purchaseId) => router.push(`/purchases/${purchaseId}`)}
      onQuickAdd={(query) => router.push({ pathname: '/products/new', params: query.trim() ? { name: query.trim(), returnTo: 'restock' } : { returnTo: 'restock' } })}
      onDirtyDraftChange={(dirty, discard) => {
        setDirty(dirty);
        discardRef.current = discard;
      }}
    />
  );
}

export default function RestockRoute() {
  return <PurchasesProvider><RestockRouteContent /></PurchasesProvider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas, justifyContent: 'center' },
});
