import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../../src/catalogue/CatalogueContext';
import { useDatabase } from '../../../../src/db/DatabaseContext';
import { createPersonalPriceClientForActiveContext } from '../../../../src/priceIntelligence';
import ProductDetailScreen from '../../../../src/screens/products/ProductDetailScreen';

export default function ProductDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; saved?: string }>();
  const client = useCatalogueClient();
  const adapter = useDatabase();
  const productId = typeof params.id === 'string' ? params.id : '';
  const priceAccess = useMemo(() => {
    if (!client) return { client: null, failure: null };
    try {
      return { client: createPersonalPriceClientForActiveContext(adapter, client.storeId), failure: null };
    } catch {
      return { client: null, failure: 'Only an active store owner can read personal purchase costs.' };
    }
  }, [adapter, client]);
  // Remount the detail on every focus so package changes made on sibling
  // screens are visible immediately when returning.
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(useCallback(() => setFocusCount((count) => count + 1), []));
  if (!client || productId.length === 0) {
    return null;
  }
  return (
    <View style={styles.fill}>
      <ProductDetailScreen
        key={focusCount}
        client={client}
        productId={productId}
        justSaved={params.saved === '1'}
        priceClient={priceAccess.client}
        priceClientFailure={priceAccess.failure}
        onOpenPriceChanges={() => router.push('/products/price-changes')}
        onBack={() => router.back()}
        onAddPackage={() => router.push(`/products/${productId}/packages/new`)}
        onEditPackage={(packageUnitId) => router.push(`/products/${productId}/packages/${packageUnitId}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
