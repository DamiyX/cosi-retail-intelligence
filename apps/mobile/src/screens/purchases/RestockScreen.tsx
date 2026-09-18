import { convertPackagesToBase, formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { generateMobileId } from '../../crypto/mobileIds';
import type { PurchasablePackageOption, PurchasableProductHit, PurchasesClient } from '../../purchases/client';
import type { CompletedPurchaseGraph } from '../../purchases/recordPurchase';
import { Field, ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney, parseMajorUnitsToMinor } from '../../ui/money';
import { theme } from '../../ui/theme';

interface RestockScreenProps {
  client: PurchasesClient;
  onBack: () => void;
  onOpenReceipt?: (purchaseId: string) => void;
  onQuickAdd?: (query: string) => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
}

interface SearchState {
  results: PurchasableProductHit[];
  failure: string | null;
}

function readProducts(client: PurchasesClient, query: string): SearchState {
  try {
    return { results: client.searchProducts(query), failure: null };
  } catch {
    return { results: [], failure: 'Products could not be read from this device. Your draft is preserved.' };
  }
}

export default function RestockScreen({
  client,
  onBack,
  onOpenReceipt,
  onQuickAdd,
  onDirtyDraftChange,
}: RestockScreenProps) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>(() => readProducts(client, ''));
  const [selectedProduct, setSelectedProduct] = useState<PurchasableProductHit | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasablePackageOption | null>(null);
  const [quantityText, setQuantityText] = useState('1');
  const [totalCostText, setTotalCostText] = useState('');
  const [errors, setErrors] = useState<{ product?: string; quantity?: string; cost?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [saved, setSaved] = useState<CompletedPurchaseGraph | null>(null);

  const dirty = saved === null && (
    query.trim().length > 0 ||
    selectedProduct !== null ||
    selectedPackage !== null ||
    quantityText !== '1' ||
    totalCostText.trim().length > 0
  );

  const discard = useCallback((): void => {
    setQuery('');
    setSearch(readProducts(client, ''));
    setSelectedProduct(null);
    setSelectedPackage(null);
    setQuantityText('1');
    setTotalCostText('');
    setErrors({});
    setOperationId(null);
    setSaved(null);
  }, [client]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, discard);
  }, [dirty, discard, onDirtyDraftChange]);

  const baseQuantityPreview = useMemo(() => {
    if (!selectedPackage) return null;
    try {
      return formatQuantityMicros(convertPackagesToBase(parseQuantityDecimal(quantityText), selectedPackage.conversionToBaseMicros));
    } catch {
      return null;
    }
  }, [quantityText, selectedPackage]);

  const changeQuery = (text: string): void => {
    setQuery(text);
    setSearch(readProducts(client, text));
    setErrors((current) => ({ ...current, product: undefined, general: undefined }));
  };

  const selectProduct = (hit: PurchasableProductHit): void => {
    setSelectedProduct(hit);
    setSelectedPackage(hit.preferredPackage ?? hit.packages[0] ?? null);
    setErrors((current) => ({ ...current, product: undefined, general: undefined }));
  };

  const submit = (): void => {
    if (submitting) return;
    const nextErrors: typeof errors = {};
    if (!selectedProduct || !selectedPackage) nextErrors.product = 'Choose a product and package.';
    let quantityPackagesMicros: number | null = null;
    try {
      quantityPackagesMicros = parseQuantityDecimal(quantityText);
      if (quantityPackagesMicros <= 0) throw new Error('Quantity must be greater than zero.');
    } catch (error) {
      nextErrors.quantity = error instanceof Error ? error.message : 'Enter a valid quantity.';
    }
    let enteredCostMinor: number | null = null;
    try {
      enteredCostMinor = parseMajorUnitsToMinor(totalCostText, client.storeCurrencyCode);
    } catch (error) {
      nextErrors.cost = error instanceof Error ? error.message : 'Enter a valid total cost.';
    }
    if (Object.keys(nextErrors).length > 0 || !selectedProduct || !selectedPackage || quantityPackagesMicros === null || enteredCostMinor === null) {
      setErrors(nextErrors);
      return;
    }
    const nextOperationId = operationId ?? generateMobileId();
    setOperationId(nextOperationId);
    setSubmitting(true);
    setErrors({});
    try {
      const graph = client.recordPurchase({
        lines: [{
          storeProductId: selectedProduct.storeProductId,
          packageUnitId: selectedPackage.id,
          quantityPackagesMicros,
          costBasis: 'TOTAL',
          enteredCostMinor,
        }],
        operationId: nextOperationId,
      });
      setSaved(graph);
      onDirtyDraftChange?.(false, discard);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Restock could not be saved. Your draft is preserved.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (saved) {
    const item = saved.items[0];
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>Restock saved</Text>
        <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Saved on this device</StatusNote></Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.productNameSnapshot}</Text>
          <Text style={styles.meta}>{formatQuantityMicros(item.quantityPackagesMicros)} {item.packageNameSnapshot}</Text>
          <Text style={styles.meta}>Added {formatQuantityMicros(item.quantityBaseMicros)} base units</Text>
          <Text style={styles.total}>{displayMoney(item.totalPurchaseCostMinor, item.currencyCode)}</Text>
          <Text style={styles.meta}>Purchase price is stored as an exact local snapshot.</Text>
        </View>
        <PrimaryButton title="View receipt" onPress={() => onOpenReceipt?.(saved.purchase.id)} />
        <SecondaryButton title="Record another restock" onPress={discard} />
        <SecondaryButton title="Back" onPress={onBack} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Restock</Text>
      <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Works offline, saved on this device</StatusNote></Text>
      <Field
        label="Search product to restock"
        placeholder="Search product name, SKU, or barcode"
        value={query}
        onChangeText={changeQuery}
        error={errors.product}
        testID="restock-product-search"
      />
      {search.failure ? <ErrorPanel title="Product list unavailable" message={search.failure} onRetry={() => setSearch(readProducts(client, query))} /> : null}
      {search.results.length > 0 && !selectedProduct ? (
        <View style={styles.results}>
          {search.results.map((hit) => (
            <Pressable key={hit.storeProductId} accessibilityRole="button" accessibilityLabel={`Restock ${hit.productName}`} onPress={() => selectProduct(hit)} style={styles.resultRow}>
              <Text style={styles.cardTitle}>{hit.productName}</Text>
              <Text style={styles.meta}>{hit.preferredPackage?.name ?? 'Choose a package'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {search.results.length === 0 && query.trim().length > 0 && !search.failure ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No matching product</Text>
          <Text style={styles.meta}>Add it with a name, then return to this draft.</Text>
          {onQuickAdd ? <SecondaryButton title="Quick Add product" onPress={() => onQuickAdd(query)} /> : null}
        </View>
      ) : null}
      {selectedProduct ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{selectedProduct.productName}</Text>
            <SecondaryButton title="Change" onPress={() => { setSelectedProduct(null); setSelectedPackage(null); }} />
          </View>
          <Text style={styles.sectionLabel}>Package</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {selectedProduct.packages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage?.id;
              return (
                <Pressable key={pkg.id} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} onPress={() => setSelectedPackage(pkg)} style={[styles.packageChip, isSelected && styles.packageChipSelected]}>
                  <Text style={[styles.packageText, isSelected && styles.packageTextSelected]}>{pkg.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Field label="Quantity" value={quantityText} onChangeText={(text) => { setQuantityText(text); setErrors((current) => ({ ...current, quantity: undefined })); }} keyboardType="decimal-pad" error={errors.quantity} hint="Use up to six decimal places." testID="restock-quantity" />
      <Field label={`Total cost (${client.storeCurrencyCode})`} value={totalCostText} onChangeText={(text) => { setTotalCostText(text); setErrors((current) => ({ ...current, cost: undefined })); }} keyboardType="decimal-pad" error={errors.cost} testID="restock-total-cost" />
      {baseQuantityPreview ? <Text style={styles.preview}>Converted base quantity: {baseQuantityPreview}</Text> : null}
      {errors.general ? <Text accessibilityRole="alert" style={styles.generalError}>{errors.general}</Text> : null}
      <PrimaryButton title={submitting ? 'Saving…' : 'Record restock'} onPress={submit} disabled={submitting} accessibilityHint="Saves this restock on the device before any sync." />
      <SecondaryButton title="Cancel" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  cardTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  total: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },
  results: { gap: theme.spacing(2) },
  resultRow: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, minHeight: theme.minTouchTarget, padding: theme.spacing(3), justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(2) },
  sectionLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  packageList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  packageChip: { minHeight: theme.minTouchTarget, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, paddingHorizontal: theme.spacing(3), justifyContent: 'center', backgroundColor: theme.color.raised },
  packageChipSelected: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  packageText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  packageTextSelected: { color: theme.color.raised, fontWeight: '600' },
  preview: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
