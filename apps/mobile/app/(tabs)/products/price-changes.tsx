import { useIsFocused, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../src/catalogue/CatalogueContext';
import { useDatabase } from '../../../src/db/DatabaseContext';
import { createPersonalPriceClientForActiveContext } from '../../../src/priceIntelligence';
import PersonalPriceChangesScreen from '../../../src/screens/products/PersonalPriceChangesScreen';

export default function PersonalPriceChangesRoute() {
  const router = useRouter();
  const focused = useIsFocused();
  const catalogueClient = useCatalogueClient();
  const adapter = useDatabase();
  const priceAccess = useMemo(() => {
    if (!catalogueClient) return { client: null, failure: 'An active store is required to read personal purchase costs.' };
    try {
      return {
        client: createPersonalPriceClientForActiveContext(adapter, catalogueClient.storeId),
        failure: null,
      };
    } catch {
      return { client: null, failure: 'Only an active store owner can read personal purchase costs.' };
    }
  }, [adapter, catalogueClient]);

  return (
    <View style={styles.fill}>
      <PersonalPriceChangesScreen
        client={priceAccess.client}
        clientFailure={priceAccess.failure}
        isFocused={focused}
        onOpenProduct={(storeProductId) => router.push(`/products/${storeProductId}`)}
        onOpenPurchaseHistory={() => router.push('/purchase-history')}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
