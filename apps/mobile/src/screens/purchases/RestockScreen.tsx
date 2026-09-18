import {
  convertPackagesToBase,
  formatQuantityMicros,
  normalizePurchaseCost,
  parseQuantityDecimal,
  type NormalizedPurchaseCost,
  type PurchaseCostBasis,
} from '@retail/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { generateMobileId } from '../../crypto/mobileIds';
import type { SupplierRow } from '../../db/repositories';
import type { PurchasablePackageOption, PurchasableProductHit, PurchasesClient } from '../../purchases/client';
import type { CompletedPurchaseGraph, RecordPurchaseLineInput } from '../../purchases/recordPurchase';
import { Field, ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney, parseMajorUnitsToMinor } from '../../ui/money';
import { theme } from '../../ui/theme';

interface RestockScreenProps {
  client: PurchasesClient;
  onBack: () => void;
  onOpenReceipt?: (purchaseId: string) => void;
  onQuickAdd?: (query: string) => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
  /** Route focus refreshes reads without remounting and losing the cart draft. */
  isFocused?: boolean;
  /** Product created by contextual Quick Add; select it on return. */
  quickAddProductId?: string;
}

interface SearchState {
  results: PurchasableProductHit[];
  failure: string | null;
}

interface SupplierState {
  rows: SupplierRow[];
  failure: string | null;
}

interface RestockLineDraft {
  id: string;
  product: PurchasableProductHit;
  package: PurchasablePackageOption;
  quantityText: string;
  costText: string;
  basis: PurchaseCostBasis;
}

interface LineValidation {
  quantityPackagesMicros: number;
  enteredCostMinor: number;
  normalized: NormalizedPurchaseCost;
}

type FieldErrors = {
  product?: string;
  quantity?: string;
  cost?: string;
  supplier?: string;
  general?: string;
};

function readProducts(client: PurchasesClient, query: string): SearchState {
  try {
    return { results: client.searchProducts(query), failure: null };
  } catch {
    return { results: [], failure: 'Products could not be read from this device. Your draft is preserved.' };
  }
}

function readSuppliers(client: PurchasesClient): SupplierState {
  try {
    return { rows: client.listSuppliers(), failure: null };
  } catch {
    return { rows: [], failure: 'Suppliers could not be read from this device. Your draft is preserved.' };
  }
}

function validateLineDraft(
  line: Pick<RestockLineDraft, 'package' | 'quantityText' | 'costText' | 'basis'>,
  currencyCode: string,
): { value: LineValidation | null; errors: Pick<FieldErrors, 'quantity' | 'cost'> } {
  const errors: Pick<FieldErrors, 'quantity' | 'cost'> = {};
  let quantityPackagesMicros: number | null = null;
  try {
    quantityPackagesMicros = parseQuantityDecimal(line.quantityText);
    if (quantityPackagesMicros <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }
  } catch (error) {
    errors.quantity = error instanceof Error ? error.message : 'Enter a valid quantity.';
  }
  let enteredCostMinor: number | null = null;
  try {
    enteredCostMinor = parseMajorUnitsToMinor(line.costText, currencyCode);
  } catch (error) {
    errors.cost = error instanceof Error ? error.message : 'Enter a valid cost.';
  }
  if (quantityPackagesMicros === null || enteredCostMinor === null) {
    return { value: null, errors };
  }
  try {
    const quantityBaseMicros = convertPackagesToBase(
      quantityPackagesMicros,
      line.package.conversionToBaseMicros,
    );
    const normalized = normalizePurchaseCost({
      basis: line.basis,
      enteredCostMinor,
      quantityPackagesMicros,
      quantityBaseMicros,
    });
    return { value: { quantityPackagesMicros, enteredCostMinor, normalized }, errors };
  } catch (error) {
    errors.cost = error instanceof Error ? error.message : 'This cost cannot be represented exactly.';
    return { value: null, errors };
  }
}

function toPurchaseLine(line: RestockLineDraft, validation: LineValidation): RecordPurchaseLineInput {
  return {
    storeProductId: line.product.storeProductId,
    packageUnitId: line.package.id,
    quantityPackagesMicros: validation.quantityPackagesMicros,
    costBasis: line.basis,
    enteredCostMinor: validation.enteredCostMinor,
  };
}

export default function RestockScreen({
  client,
  onBack,
  onOpenReceipt,
  onQuickAdd,
  onDirtyDraftChange,
  isFocused = true,
  quickAddProductId,
}: RestockScreenProps) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>(() => readProducts(client, ''));
  const [suppliers, setSuppliers] = useState<SupplierState>(() => readSuppliers(client));
  const [selectedProduct, setSelectedProduct] = useState<PurchasableProductHit | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasablePackageOption | null>(null);
  const [quantityText, setQuantityText] = useState('1');
  const [costText, setCostText] = useState('');
  const [basis, setBasis] = useState<PurchaseCostBasis>('TOTAL');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lines, setLines] = useState<RestockLineDraft[]>([]);
  const [supplierMode, setSupplierMode] = useState<'NONE' | 'EXISTING' | 'NEW'>('NONE');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [saved, setSaved] = useState<CompletedPurchaseGraph | null>(null);
  const handledQuickAddIdRef = useRef<string | null>(null);
  const initialFocusHandledRef = useRef(false);

  const dirty = saved === null && (
    query.trim().length > 0 ||
    selectedProduct !== null ||
    selectedPackage !== null ||
    quantityText !== '1' ||
    costText.trim().length > 0 ||
    lines.length > 0 ||
    supplierMode !== 'NONE' ||
    newSupplierName.trim().length > 0
  );

  const discard = useCallback((): void => {
    setQuery('');
    setSearch(readProducts(client, ''));
    setSuppliers(readSuppliers(client));
    setSelectedProduct(null);
    setSelectedPackage(null);
    setQuantityText('1');
    setCostText('');
    setBasis('TOTAL');
    setEditingLineId(null);
    setLines([]);
    setSupplierMode('NONE');
    setSelectedSupplierId(null);
    setNewSupplierName('');
    setErrors({});
    setOperationId(null);
    setSaved(null);
  }, [client]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, discard);
  }, [dirty, discard, onDirtyDraftChange]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (!initialFocusHandledRef.current) {
      initialFocusHandledRef.current = true;
      return;
    }
    // Focus is an external navigation event; refresh only the durable reads so
    // the in-memory cart/editor/supplier draft remains untouched.
    setSearch(readProducts(client, query));
    setSuppliers(readSuppliers(client));
  }, [client, isFocused, query]);

  useEffect(() => {
    if (!isFocused || !quickAddProductId || handledQuickAddIdRef.current === quickAddProductId) {
      return;
    }
    const refreshed = readProducts(client, '');
    setSearch(refreshed);
    if (refreshed.failure) {
      return;
    }
    const hit = refreshed.results.find((product) => product.storeProductId === quickAddProductId);
    if (!hit) {
      return;
    }
    handledQuickAddIdRef.current = quickAddProductId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
    setSelectedProduct(hit);
    setSelectedPackage(hit.preferredPackage ?? hit.packages[0] ?? null);
    setErrors((current) => ({ ...current, product: undefined, general: undefined }));
  }, [client, isFocused, quickAddProductId]);

  const editorValidation = useMemo(() => {
    if (!selectedPackage) {
      return { value: null, errors: {} as Pick<FieldErrors, 'quantity' | 'cost'> };
    }
    return validateLineDraft({ package: selectedPackage, quantityText, costText, basis }, client.storeCurrencyCode);
  }, [basis, client.storeCurrencyCode, costText, quantityText, selectedPackage]);

  const cartTotalMinor = useMemo<number | null>(() => {
    let total = 0n;
    for (const line of lines) {
      const validation = validateLineDraft(line, client.storeCurrencyCode).value;
      if (validation) total += BigInt(validation.normalized.totalCostMinor);
    }
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(total);
  }, [client.storeCurrencyCode, lines]);

  const resetEditor = (): void => {
    setSelectedProduct(null);
    setSelectedPackage(null);
    setQuantityText('1');
    setCostText('');
    setBasis('TOTAL');
    setEditingLineId(null);
    setErrors((current) => ({ ...current, product: undefined, quantity: undefined, cost: undefined, general: undefined }));
  };

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

  const saveLine = (): void => {
    if (submitting) return;
    if (!selectedProduct || !selectedPackage) {
      setErrors((current) => ({ ...current, product: 'Choose a product and package.' }));
      return;
    }
    const validation = validateLineDraft({ package: selectedPackage, quantityText, costText, basis }, client.storeCurrencyCode);
    if (!validation.value) {
      setErrors((current) => ({ ...current, ...validation.errors }));
      return;
    }
    const nextLine: RestockLineDraft = {
      id: editingLineId ?? generateMobileId(),
      product: selectedProduct,
      package: selectedPackage,
      quantityText,
      costText,
      basis,
    };
    setLines((current) => editingLineId
      ? current.map((line) => (line.id === editingLineId ? nextLine : line))
      : [...current, nextLine]);
    setQuery('');
    setSearch(readProducts(client, ''));
    resetEditor();
  };

  const editLine = (line: RestockLineDraft): void => {
    setSelectedProduct(line.product);
    setSelectedPackage(line.package);
    setQuantityText(line.quantityText);
    setCostText(line.costText);
    setBasis(line.basis);
    setEditingLineId(line.id);
    setErrors({});
  };

  const removeLine = (lineId: string): void => {
    setLines((current) => current.filter((line) => line.id !== lineId));
    if (editingLineId === lineId) resetEditor();
  };

  const submit = (): void => {
    if (submitting) return;
    if (lines.length === 0) {
      setErrors((current) => ({ ...current, general: 'Add at least one restock line before saving.' }));
      return;
    }
    if (selectedProduct || costText.trim().length > 0) {
      setErrors((current) => ({ ...current, general: 'Add or update the current line before saving.' }));
      return;
    }
    const validations = lines.map((line) => ({ line, result: validateLineDraft(line, client.storeCurrencyCode) }));
    const invalid = validations.find((entry) => !entry.result.value);
    if (invalid) {
      editLine(invalid.line);
      setErrors({ ...invalid.result.errors, general: 'Review this restock line before saving.' });
      return;
    }
    if (supplierMode === 'EXISTING' && !selectedSupplierId) {
      setErrors({ supplier: 'Choose an active supplier or select No supplier.' });
      return;
    }
    if (supplierMode === 'NEW' && newSupplierName.trim().length === 0) {
      setErrors({ supplier: 'Enter a supplier name or select No supplier.' });
      return;
    }
    const nextOperationId = operationId ?? generateMobileId();
    setOperationId(nextOperationId);
    setSubmitting(true);
    setErrors({});
    try {
      const graph = client.recordPurchase({
        lines: validations.map((entry) => toPurchaseLine(entry.line, entry.result.value!)),
        supplierId: supplierMode === 'EXISTING' ? selectedSupplierId : null,
        supplierName: supplierMode === 'NEW' ? newSupplierName.trim() : null,
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
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>Restock saved</Text>
        <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Saved on this device</StatusNote></Text>
        {saved.supplier ? <Text style={styles.meta}>Supplier: {saved.supplier.name}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase receipt</Text>
          {saved.items.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Text style={styles.cardTitle}>{item.productNameSnapshot}</Text>
              <Text style={styles.meta}>{formatQuantityMicros(item.quantityPackagesMicros)} {item.packageNameSnapshot} · {formatQuantityMicros(item.quantityBaseMicros)} base units</Text>
              <Text style={styles.meta}>{item.costBasis === 'UNIT' ? 'Unit cost' : 'Total cost'}: {displayMoney(item.enteredCostMinor, item.currencyCode)}</Text>
              <Text style={styles.meta}>Line total: {displayMoney(item.totalPurchaseCostMinor, item.currencyCode)}</Text>
            </View>
          ))}
          <Text style={styles.total}>{displayMoney(saved.purchase.totalAmountMinor, saved.purchase.currencyCode)}</Text>
          <Text style={styles.meta}>Purchase prices are stored as exact local snapshots.</Text>
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
      {search.results.length === 0 && query.trim().length > 0 && !search.failure && !selectedProduct ? (
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
            <SecondaryButton title="Change" onPress={resetEditor} />
          </View>
          <Text style={styles.sectionLabel}>Purchase package</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {selectedProduct.packages.map((pkg) => {
              const isSelected = pkg.id === selectedPackage?.id;
              return (
                <Pressable key={pkg.id} accessibilityRole="radio" accessibilityLabel={pkg.name} accessibilityState={{ checked: isSelected }} onPress={() => setSelectedPackage(pkg)} style={[styles.packageChip, isSelected && styles.packageChipSelected]}>
                  <Text style={[styles.packageText, isSelected && styles.packageTextSelected]}>{pkg.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionLabel}>Cost basis</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {(['TOTAL', 'UNIT'] as const).map((option) => {
              const isSelected = basis === option;
              return (
                <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option === 'TOTAL' ? 'Total cost' : 'Unit cost'} accessibilityState={{ checked: isSelected }} onPress={() => setBasis(option)} style={[styles.packageChip, isSelected && styles.packageChipSelected]}>
                  <Text style={[styles.packageText, isSelected && styles.packageTextSelected]}>{option === 'TOTAL' ? 'Total cost' : 'Unit cost'}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Quantity" value={quantityText} onChangeText={(text) => { setQuantityText(text); setErrors((current) => ({ ...current, quantity: undefined, general: undefined })); }} keyboardType="decimal-pad" error={errors.quantity} hint="Use up to six decimal places." testID="restock-quantity" />
          <Field label={`${basis === 'TOTAL' ? 'Total' : 'Unit'} cost (${client.storeCurrencyCode})`} value={costText} onChangeText={(text) => { setCostText(text); setErrors((current) => ({ ...current, cost: undefined, general: undefined })); }} keyboardType="decimal-pad" error={errors.cost} testID={basis === 'TOTAL' ? 'restock-total-cost' : 'restock-unit-cost'} />
          {editorValidation.value ? (
            <View style={styles.preview}>
              <Text style={styles.meta}>Converted base quantity: {formatQuantityMicros(convertPackagesToBase(editorValidation.value.quantityPackagesMicros, selectedPackage!.conversionToBaseMicros))}</Text>
              <Text style={styles.meta}>Line total: {displayMoney(editorValidation.value.normalized.totalCostMinor, client.storeCurrencyCode)}</Text>
              <Text style={styles.meta}>Normalized base cost: {editorValidation.value.normalized.baseUnitCost.numerator}/{editorValidation.value.normalized.baseUnitCost.denominator} minor units per base unit</Text>
            </View>
          ) : null}
          <PrimaryButton title={editingLineId ? 'Update line' : 'Add line'} onPress={saveLine} disabled={submitting} />
        </View>
      ) : null}

      {lines.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Restock lines ({lines.length})</Text>
          {lines.map((line) => {
            const validation = validateLineDraft(line, client.storeCurrencyCode).value;
            return (
              <View key={line.id} style={styles.historyRow}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{line.product.productName}</Text>
                  <View style={styles.actionRow}>
                    <SecondaryButton title="Edit" onPress={() => editLine(line)} />
                    <SecondaryButton title="Remove" onPress={() => removeLine(line.id)} />
                  </View>
                </View>
                <Text style={styles.meta}>{line.quantityText} {line.package.name} · {line.basis === 'UNIT' ? 'unit' : 'total'} cost {line.costText || '—'}</Text>
                {validation ? <Text style={styles.meta}>Line total: {displayMoney(validation.normalized.totalCostMinor, client.storeCurrencyCode)}</Text> : <Text style={styles.generalError}>Review this line before saving.</Text>}
              </View>
            );
          })}
          <Text style={styles.total}>Running total: {cartTotalMinor === null ? 'Unavailable; review line costs' : displayMoney(cartTotalMinor, client.storeCurrencyCode)}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Supplier (optional)</Text>
        <View style={styles.packageList} accessibilityRole="radiogroup">
          {([
            ['NONE', 'No supplier'],
            ['EXISTING', 'Choose supplier'],
            ['NEW', 'Create supplier'],
          ] as const).map(([option, label]) => {
            const selected = supplierMode === option;
            return (
              <Pressable key={option} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} onPress={() => { setSupplierMode(option); setSelectedSupplierId(null); setErrors((current) => ({ ...current, supplier: undefined })); }} style={[styles.packageChip, selected && styles.packageChipSelected]}>
                <Text style={[styles.packageText, selected && styles.packageTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {supplierMode === 'EXISTING' ? (
          suppliers.failure ? <ErrorPanel title="Supplier list unavailable" message={suppliers.failure} onRetry={() => setSuppliers(readSuppliers(client))} /> : suppliers.rows.filter((supplier) => supplier.status === 'ACTIVE').length === 0 ? <Text style={styles.meta}>No active supplier yet. Create one explicitly or continue without one.</Text> : (
            <View style={styles.packageList} accessibilityRole="radiogroup">
              {suppliers.rows.filter((supplier) => supplier.status === 'ACTIVE').map((supplier) => {
                const selected = selectedSupplierId === supplier.id;
                return <Pressable key={supplier.id} accessibilityRole="radio" accessibilityLabel={`Supplier ${supplier.name}`} accessibilityState={{ checked: selected }} onPress={() => setSelectedSupplierId(supplier.id)} style={[styles.packageChip, selected && styles.packageChipSelected]}><Text style={[styles.packageText, selected && styles.packageTextSelected]}>{supplier.name}</Text></Pressable>;
              })}
            </View>
          )
        ) : null}
        {supplierMode === 'NEW' ? (
          <>
            <Field label="New supplier name" value={newSupplierName} onChangeText={(text) => { setNewSupplierName(text); setErrors((current) => ({ ...current, supplier: undefined })); }} error={errors.supplier} maxLength={200} testID="restock-supplier-name" />
            <Text style={styles.meta}>Duplicate names remain separate store-private suppliers.</Text>
          </>
        ) : null}
        {supplierMode === 'EXISTING' && errors.supplier ? <Text accessibilityRole="alert" style={styles.generalError}>{errors.supplier}</Text> : null}
      </View>

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
  actionRow: { flexDirection: 'row', gap: theme.spacing(2), flexWrap: 'wrap' },
  sectionLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  packageList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  packageChip: { minHeight: theme.minTouchTarget, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, paddingHorizontal: theme.spacing(3), justifyContent: 'center', backgroundColor: theme.color.raised },
  packageChipSelected: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  packageText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  packageTextSelected: { color: theme.color.raised, fontWeight: '600' },
  preview: { backgroundColor: theme.color.canvas, borderRadius: theme.radius.field, padding: theme.spacing(3), gap: theme.spacing(1) },
  historyRow: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
