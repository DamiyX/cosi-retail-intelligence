import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';

import { CatalogueProvider, useCatalogueClient } from '../../../src/catalogue/CatalogueContext';

function MissingStore() {
  return (
    <View style={styles.center}>
      <Text accessibilityRole="header" style={styles.title}>
        No store yet
      </Text>
      <Text style={styles.body}>
        Products belong to a store, and this device has none. Store setup arrives with
        onboarding; nothing was lost.
      </Text>
    </View>
  );
}

function CatalogueGate({ children }: { children: React.ReactNode }) {
  const client = useCatalogueClient();
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
          <Stack.Screen name="new" options={{ title: 'Add product' }} />
          <Stack.Screen name="[id]" options={{ title: 'Product' }} />
        </Stack>
      </CatalogueGate>
    </CatalogueProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, gap: 12, backgroundColor: '#F7F8F5', justifyContent: 'center' },
  title: { color: '#17251F', fontSize: 24, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 16, lineHeight: 24 },
});
