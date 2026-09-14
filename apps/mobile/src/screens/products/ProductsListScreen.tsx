import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CatalogueClient } from '../../catalogue/client';
import type { ProductLifecycleFilter, ProductSearchHit } from '../../db/repositories';
import { EmptyState, ErrorPanel, PrimaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface ProductsListScreenProps {
  client: CatalogueClient;
  initialQuery?: string;
  onAddProduct: (query: string) => void;
  onOpenProduct: (productId: string) => void;
}

interface ListState {
  hits: ProductSearchHit[];
  failure: string | null;
}

function statusLabel(hit: ProductSearchHit): string | null {
  const parts: string[] = [];
  if (hit.isTemporary) {
    parts.push('Temporary');
  }
  if (hit.product.status === 'INACTIVE') {
    parts.push('Inactive');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function ProductsListScreen({
  client,
  initialQuery = '',
  onAddProduct,
  onOpenProduct,
}: ProductsListScreenProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filter] = useState<ProductLifecycleFilter>('ALL');
  const [state, setState] = useState<ListState>(() => load(client, initialQuery, filter));

  const changeQuery = (text: string): void => {
    setQuery(text);
    setState(load(client, text, filter));
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Products
      </Text>
      <Text style={styles.storeLine}>
        {client.storeName} · <StatusNote>Works offline, saved on this device</StatusNote>
      </Text>
      <TextInput
        accessibilityLabel="Search products"
        accessibilityHint="Search by product name, local SKU, or barcode"
        placeholder="Search name, local SKU, or barcode"
        placeholderTextColor={theme.color.textSecondary}
        value={query}
        onChangeText={changeQuery}
        style={styles.search}
      />
      {state.failure !== null ? (
        <ErrorPanel
          title="Product list unavailable"
          message="The product list could not be read from this device. Your products are still stored locally."
          onRetry={() => setState(load(client, query, filter))}
        />
      ) : state.hits.length === 0 ? (
        <EmptyState
          title={query.trim().length > 0 ? 'No matching product' : 'No products yet'}
          body={
            query.trim().length > 0
              ? `Nothing in this store matches "${query.trim()}". Add it with just a name and improve it later.`
              : 'Add your first product with just a name. You can use it right away and add details later.'
          }
          actionTitle="Add product"
          onAction={() => onAddProduct(query)}
        />
      ) : (
        <FlatList
          data={state.hits}
          keyExtractor={(hit) => hit.product.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const label = statusLabel(item);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.variantName}${label ? `, ${label}` : ''}`}
                onPress={() => onOpenProduct(item.product.id)}
                style={styles.row}
              >
                <Text style={styles.rowName}>{item.variantName}</Text>
                {label ? <Text style={styles.rowStatus}>{label}</Text> : null}
                {item.preferredPackageName ? (
                  <Text style={styles.rowMeta}>Sold per {item.preferredPackageName}</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
      <View style={styles.addRow}>
        <PrimaryButton title="Add product" onPress={() => onAddProduct(query)} />
      </View>
    </View>
  );
}

function load(
  client: CatalogueClient,
  query: string,
  filter: ProductLifecycleFilter,
): ListState {
  try {
    return { hits: client.listProducts(query, filter), failure: null };
  } catch (error) {
    return { hits: [], failure: error instanceof Error ? error.message : 'Unknown failure.' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  search: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(3),
    fontSize: theme.fontSize.body,
    color: theme.color.textPrimary,
  },
  list: { gap: theme.spacing(2), paddingBottom: theme.spacing(4) },
  row: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    justifyContent: 'center',
  },
  rowName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  rowStatus: { color: theme.color.statusWarning, fontSize: theme.fontSize.small, fontWeight: '600' },
  rowMeta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  addRow: { paddingBottom: theme.spacing(2) },
});
