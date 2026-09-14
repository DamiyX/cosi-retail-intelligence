import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../src/catalogue/CatalogueContext';
import ProductsListScreen from '../../../src/screens/products/ProductsListScreen';

export default function ProductsIndexRoute() {
  const router = useRouter();
  const client = useCatalogueClient();
  if (!client) {
    return null;
  }
  return (
    <View style={styles.fill}>
      <ProductsListScreen
        client={client}
        onAddProduct={(query) =>
          router.push({ pathname: '/products/new', params: query.trim() ? { name: query.trim() } : {} })
        }
        onOpenProduct={(productId) => router.push(`/products/${productId}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
