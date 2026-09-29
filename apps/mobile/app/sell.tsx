import { useCallback, useRef, useState } from 'react';
import { useIsFocused, useLocalSearchParams, useNavigation } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SalesProvider, useSales } from '../src/sales/SalesContext';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';
import { saleDraftExitCopy, type SaleDraftExit } from '../src/sales/draftExit';
import SellScreen from '../src/screens/sales/SellScreen';
import { ErrorPanel, Field, PrimaryButton } from '../src/ui/components';
import { theme } from '../src/ui/theme';

function MissingStore() {
  const { setupLocalStore } = useSales();
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
    <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>
        Set up this store
      </Text>
      <Text style={styles.body}>
        This creates the local store record needed to record sales offline.
      </Text>
      <Field label="Your name" value={ownerName} onChangeText={setOwnerName} testID="setup-owner-name" />
      <Field label="Store name" value={storeName} onChangeText={setStoreName} testID="setup-store-name" />
      {failure ? <ErrorPanel title="Store not created" message={failure} /> : null}
      <PrimaryButton title="Create local store" onPress={setup} />
    </ScrollView>
  );
}

function LocalStoreUnavailable({ failure, onRetry }: { failure: string; onRetry: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
      <ErrorPanel title="Local store unavailable" message={failure} onRetry={onRetry} />
    </ScrollView>
  );
}

function SellContent() {
  const { availability, catalogueClient, client, failure, retryLocalStore } = useSales();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ scan?: string }>();
  const draftRef = useRef<SaleDraftExit | null>(null);
  const [dirty, setDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const handleDirtyDraftChange = useCallback((draft: SaleDraftExit | null) => {
    draftRef.current = draft;
    setDirty(draft !== null);
  }, []);
  usePreventRemove(isFocused && dirty && !allowNavigation, ({ data }) => {
    const draft = draftRef.current;
    if (!draft) return;
    const copy = saleDraftExitCopy(draft.reason);
    Alert.alert(copy.title, copy.message, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => {
        setAllowNavigation(true);
        draft.discard();
        requestAnimationFrame(() => {
          navigation.dispatch(data.action);
          setAllowNavigation(false);
        });
      } },
    ]);
  });
  if (availability === 'failure') {
    return <LocalStoreUnavailable failure={failure ?? 'The local store is unavailable.'} onRetry={retryLocalStore} />;
  }
  if (!client) {
    return <MissingStore />;
  }
  return (
    <View style={styles.fill}>
      <SellScreen
        client={client}
        catalogueClient={catalogueClient ?? undefined}
        onDirtyDraftChange={handleDirtyDraftChange}
        isFocused={isFocused}
        initialScan={params.scan === '1'}
      />
    </View>
  );
}

export default function SellRoute() {
  return (
    <SalesProvider>
      <SellContent />
    </SalesProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flexGrow: 1,
    padding: theme.spacing(6),
    gap: theme.spacing(3),
    backgroundColor: theme.color.canvas,
    justifyContent: 'center',
  },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
});
