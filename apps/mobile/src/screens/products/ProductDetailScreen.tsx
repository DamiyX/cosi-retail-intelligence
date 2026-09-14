import { formatQuantityMicros } from '@retail/domain';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CatalogueClient, ProductDetail } from '../../catalogue/client';
import { ErrorPanel, SecondaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface ProductDetailScreenProps {
  client: CatalogueClient;
  productId: string;
  justSaved?: boolean;
  onBack: () => void;
}

interface DetailState {
  detail: ProductDetail | null;
  failure: string | null;
}

function load(client: CatalogueClient, productId: string): DetailState {
  try {
    return { detail: client.getProductDetail(productId), failure: null };
  } catch (error) {
    return { detail: null, failure: error instanceof Error ? error.message : 'Unknown failure.' };
  }
}

/**
 * M2-01 product detail: identity, temporary marker, packages with exact
 * conversions, and the honest local save state. Identity editing lands in
 * M2-02, package management in M2-03, lifecycle actions in M2-04.
 */
export default function ProductDetailScreen({
  client,
  productId,
  justSaved = false,
  onBack,
}: ProductDetailScreenProps) {
  const [state, setState] = useState<DetailState>(() => load(client, productId));

  return (
    <View style={styles.container}>
      {state.failure !== null || state.detail === null ? (
        <ErrorPanel
          title="Product unavailable"
          message="This product could not be read from the device."
          onRetry={() => setState(load(client, productId))}
          onDismiss={onBack}
        />
      ) : (
        <View style={styles.body}>
          <Text accessibilityRole="header" style={styles.title}>
            {state.detail.variant.name}
          </Text>
          {state.detail.product.isTemporary ? (
            <Text style={styles.temporary}>
              Temporary — an incomplete record you can use now and improve later.
            </Text>
          ) : null}
          {justSaved ? (
            <Text style={styles.saved}>Saved on this device. It has not been sent anywhere.</Text>
          ) : (
            <StatusNote>Saved on this device</StatusNote>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identity</Text>
            <Text style={styles.line}>
              Local SKU: {state.detail.product.localSku ?? 'Not set'}
            </Text>
            <Text style={styles.line}>
              Status: {state.detail.product.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Packages</Text>
            {state.detail.packages.map((packageUnit) => (
              <Text key={packageUnit.id} style={styles.line}>
                {packageUnit.isBaseUnit ? 'Base unit: ' : ''}{packageUnit.name}
                {packageUnit.isBaseUnit
                  ? ''
                  : ` — 1 ${packageUnit.name} = ${formatQuantityMicros(packageUnit.conversionToBaseMicros)} base units`}
              </Text>
            ))}
          </View>
          <SecondaryButton title="Back to products" onPress={onBack} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(4), backgroundColor: theme.color.canvas },
  body: { gap: theme.spacing(3) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  temporary: { color: theme.color.statusWarning, fontSize: theme.fontSize.body, fontWeight: '600' },
  saved: { color: theme.color.actionPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  section: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  sectionTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  line: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 26 },
});
