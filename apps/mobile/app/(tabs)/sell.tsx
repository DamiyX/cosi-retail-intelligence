import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SalesProvider, useSales } from '../../src/sales/SalesContext';
import { useSaleDraftNavigation } from '../../src/sales/SaleDraftNavigationContext';
import { saleDraftExitCopy, type SaleDraftExit } from '../../src/sales/draftExit';
import SellScreen from '../../src/screens/sales/SellScreen';
import { ErrorPanel, Field, PrimaryButton } from '../../src/ui/components';
import { theme } from '../../src/ui/theme';

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

interface BeforeRemoveEvent {
  preventDefault(): void;
  data: { action: unknown };
}

interface SellRouteNavigation {
  addListener(eventName: 'beforeRemove', listener: (event: BeforeRemoveEvent) => void): () => void;
  dispatch(action: unknown): void;
}

function SellContent() {
  const { client, catalogueClient } = useSales();
  const navigation = useNavigation<SellRouteNavigation>();
  const { clearDraft, getDraft, setDraft } = useSaleDraftNavigation();
  const allowNavigationRef = useRef(false);

  const handleDirtyDraftChange = useCallback((draft: SaleDraftExit | null): void => {
    setDraft(draft);
  }, [setDraft]);

  const confirmExit = useCallback(
    (draft: SaleDraftExit, continueNavigation: () => void): void => {
      const copy = saleDraftExitCopy(draft.reason);
      Alert.alert(copy.title, copy.message, [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowNavigationRef.current = true;
            clearDraft();
            draft.discard();
            try {
              continueNavigation();
            } finally {
              allowNavigationRef.current = false;
            }
          },
        },
      ]);
    },
    [clearDraft],
  );

  useEffect(() => {
    const removeBeforeRemoveListener = navigation.addListener('beforeRemove', (event) => {
      if (allowNavigationRef.current) {
        return;
      }
      const draft = getDraft();
      if (!draft) {
        return;
      }
      event.preventDefault();
      confirmExit(draft, () => navigation.dispatch(event.data.action));
    });

    return () => {
      removeBeforeRemoveListener();
    };
  }, [confirmExit, getDraft, navigation]);

  if (!client) {
    return <MissingStore />;
  }
  return (
    <View style={styles.fill}>
      <SellScreen
        client={client}
        catalogueClient={catalogueClient ?? undefined}
        onDirtyDraftChange={handleDirtyDraftChange}
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
