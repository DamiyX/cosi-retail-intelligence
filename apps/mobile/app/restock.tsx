import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation, useRouter } from 'expo-router';

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
  const { client, failure, retryLocalStore } = usePurchases();
  const dirtyRef = useRef(false);
  const discardRef = useRef<() => void>(() => undefined);
  const allowingRef = useRef(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!focused || !dirtyRef.current || allowingRef.current) return;
      event.preventDefault();
      Alert.alert('Discard restock draft?', 'Your unsaved restock details will be cleared.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowingRef.current = true;
            discardRef.current();
            navigation.dispatch(event.data.action);
            allowingRef.current = false;
          },
        },
      ]);
    });
    return unsubscribe;
  }, [focused, navigation]);
  if (!client) {
    return failure ? <ErrorPanel title="Restock unavailable" message={failure} onRetry={retryLocalStore} /> : <MissingStore />;
  }
  return (
    <RestockScreen
      client={client}
      onBack={() => router.back()}
      onOpenReceipt={(purchaseId) => router.push(`/purchases/${purchaseId}`)}
      onQuickAdd={(query) => router.push({ pathname: '/products/new', params: query.trim() ? { name: query.trim() } : {} })}
      onDirtyDraftChange={(dirty, discard) => {
        dirtyRef.current = dirty;
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
