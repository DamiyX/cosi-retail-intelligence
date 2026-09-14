import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useCatalogueClient } from '../../../../../src/catalogue/CatalogueContext';
import PackageFormScreen from '../../../../../src/screens/products/PackageFormScreen';

export default function NewPackageRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const client = useCatalogueClient();
  const productId = typeof params.id === 'string' ? params.id : '';
  const detail = client && productId ? client.getProductDetail(productId) : null;
  if (!client || !detail) {
    return null;
  }
  const baseUnit = detail.packages.find((entry) => entry.isBaseUnit);
  return (
    <View style={styles.fill}>
      <Text style={styles.context}>
        {detail.variant.name} · base unit {baseUnit?.name ?? 'unknown'}
      </Text>
      <PackageFormScreen
        client={client}
        storeProductId={detail.product.id}
        baseUnitName={baseUnit?.name ?? 'base units'}
        onSaved={() => router.back()}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  context: { color: '#41534C', fontSize: 14, paddingHorizontal: 16, paddingTop: 12 },
});
