import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../../src/catalogue/CatalogueContext';
import ProductDetailScreen from '../../../../src/screens/products/ProductDetailScreen';

export default function ProductDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; saved?: string }>();
  const client = useCatalogueClient();
  const productId = typeof params.id === 'string' ? params.id : '';
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
