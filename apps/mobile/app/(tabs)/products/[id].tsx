import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../src/catalogue/CatalogueContext';
import ProductDetailScreen from '../../../src/screens/products/ProductDetailScreen';

export default function ProductDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; saved?: string }>();
  const client = useCatalogueClient();
  const productId = typeof params.id === 'string' ? params.id : '';
  if (!client || productId.length === 0) {
    return null;
  }
  return (
    <View style={styles.fill}>
      <ProductDetailScreen
        client={client}
        productId={productId}
        justSaved={params.saved === '1'}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
