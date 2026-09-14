import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../src/catalogue/CatalogueContext';
import QuickAddProductScreen from '../../../src/screens/products/QuickAddProductScreen';

export default function QuickAddRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const client = useCatalogueClient();
  if (!client) {
    return null;
  }
  return (
    <View style={styles.fill}>
      <QuickAddProductScreen
        client={client}
        initialName={typeof params.name === 'string' ? params.name : ''}
        onSaved={(productId) => router.replace({ pathname: `/products/${productId}`, params: { saved: '1' } })}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
