import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useCatalogueClient } from '../../../../../src/catalogue/CatalogueContext';
import PackageFormScreen from '../../../../../src/screens/products/PackageFormScreen';

export default function EditPackageRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; packageId?: string }>();
  const client = useCatalogueClient();
  const productId = typeof params.id === 'string' ? params.id : '';
  const packageId = typeof params.packageId === 'string' ? params.packageId : '';
  const detail = client && productId ? client.getProductDetail(productId) : null;
  const packageUnit = detail?.packages.find((entry) => entry.id === packageId) ?? null;
  if (!client || !detail || !packageUnit) {
    return null;
  }
  const baseUnit = detail.packages.find((entry) => entry.isBaseUnit);
  return (
    <View style={styles.fill}>
      <Text style={styles.context}>
        {detail.variant.name} · {packageUnit.name}
      </Text>
      <PackageFormScreen
        client={client}
        storeProductId={detail.product.id}
        baseUnitName={baseUnit?.name ?? 'base units'}
        packageUnit={packageUnit}
        setting={detail.settings.find((entry) => entry.packageUnitId === packageUnit.id) ?? null}
        onSaved={() => router.back()}
        onDeactivated={() => router.back()}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  context: { color: '#41534C', fontSize: 14, paddingHorizontal: 16, paddingTop: 12 },
});
