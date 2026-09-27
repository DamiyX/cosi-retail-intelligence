import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';

import { CatalogueProvider, useCatalogue } from '../../../src/catalogue/CatalogueContext';
import { ErrorPanel, Field, PrimaryButton } from '../../../src/ui/components';
import { theme } from '../../../src/ui/theme';

function MissingStore() {
  const { setupLocalStore } = useCatalogue();
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
        This creates the local store record needed to save products offline. Account linking arrives later.
      </Text>
      <Field label="Your name" value={ownerName} onChangeText={setOwnerName} testID="setup-owner-name" />
      <Field label="Store name" value={storeName} onChangeText={setStoreName} testID="setup-store-name" />
      {failure ? <ErrorPanel title="Store not created" message={failure} /> : null}
      <PrimaryButton title="Create local store" onPress={setup} />
    </ScrollView>
  );
}

function CatalogueGate({ children }: { children: React.ReactNode }) {
  const { client } = useCatalogue();
  if (!client) {
    return <MissingStore />;
  }
  return <>{children}</>;
}

export default function ProductsLayout() {
  return (
    <CatalogueProvider>
      <CatalogueGate>
        <Stack screenOptions={{ headerTintColor: '#174F46', contentStyle: { backgroundColor: '#F7F8F5' } }}>
          <Stack.Screen name="index" options={{ title: 'Products' }} />
          <Stack.Screen name="price-changes" options={{ title: 'Personal price changes' }} />
          <Stack.Screen name="new" options={{ headerShown: false }} />
          <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
          <Stack.Screen name="[id]/packages/new" options={{ headerShown: false }} />
          <Stack.Screen name="[id]/packages/[packageId]" options={{ headerShown: false }} />
        </Stack>
      </CatalogueGate>
    </CatalogueProvider>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, padding: 24, gap: 12, backgroundColor: theme.color.canvas, justifyContent: 'center' },
  title: { color: theme.color.textPrimary, fontSize: 24, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: 16, lineHeight: 24 },
});
