import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalogueClient } from '../../../src/catalogue/CatalogueContext';
import { useDatabase } from '../../../src/db/DatabaseContext';
import { createPersonalPriceClientForActiveContext } from '../../../src/priceIntelligence';
import PersonalPriceChangesScreen from '../../../src/screens/products/PersonalPriceChangesScreen';

export default function PersonalPriceChangesRoute() {
  const router = useRouter();
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(useCallback(() => setFocusCount((count) => count + 1), []));
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
        key={focusCount}
        client={priceAccess.client}
        clientFailure={priceAccess.failure}
        onOpenProduct={(storeProductId) => router.push(`/products/${storeProductId}`)}
        onOpenPurchaseHistory={() => router.push('/purchase-history')}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
