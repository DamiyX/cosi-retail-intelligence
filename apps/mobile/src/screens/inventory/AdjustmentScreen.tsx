import { formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InventoryClient, InventoryReviewProduct } from '../../inventory/client';
import type { BatchProjection } from '../../inventory/batchAllocation';
import type { InventoryAdjustmentReason } from '../../db/repositories';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface AdjustmentScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
  isFocused?: boolean;
  storeProductId?: string;
  groupId?: string;
  reasonCode?: InventoryAdjustmentReason;
}

interface ScreenState {
  products: InventoryReviewProduct[];
  projection: BatchProjection | null;
  failure: string | null;
}

type AdjustmentDirection = 'REMOVE' | 'ADD';

const REASONS: readonly { value: InventoryAdjustmentReason; label: string }[] = [
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'PERSONAL_USE', label: 'Personal use' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'CUSTOMER_RETURN', label: 'Customer return' },
  { value: 'SUPPLIER_RETURN', label: 'Supplier return' },
];

function read(client: InventoryClient, storeProductId: string | undefined): ScreenState {
  try {
    const products = client.listReviewProducts();
    const selected = storeProductId && products.some((product) => product.storeProductId === storeProductId)
      ? storeProductId
      : products[0]?.storeProductId;
    return { products, projection: selected ? client.getBatchProjection(selected) : null, failure: null };
  } catch (error) {
    return { products: [], projection: null, failure: error instanceof Error ? error.message : 'Inventory adjustments could not be read.' };
  }
}

function quantityLabel(value: string): string {
  try {
    const parsed = BigInt(value);
    return parsed <= BigInt(Number.MAX_SAFE_INTEGER) && parsed >= BigInt(Number.MIN_SAFE_INTEGER)
      ? formatQuantityMicros(Number(parsed))
      : `${value} micro-units`;
  } catch {
    return value;
  }
}

function groupLabel(group: BatchProjection['groups'][number]): string {
  const date = group.datePrecision === 'UNKNOWN' ? 'unknown date' : `${group.dateValue} (${group.datePrecision.toLowerCase()})`;
  return `${quantityLabel(group.balanceBaseMicros)} · ${date}`;
}

export default function AdjustmentScreen({ client, onBack, onDirtyDraftChange, isFocused = true, storeProductId, groupId: initialGroupId, reasonCode: initialReasonCode }: AdjustmentScreenProps) {
  const [state, setState] = useState(() => read(client, storeProductId));
  const [selectedProductId, setSelectedProductId] = useState(storeProductId ?? '');
  const [direction, setDirection] = useState<AdjustmentDirection>('REMOVE');
  const [reasonCode, setReasonCode] = useState<InventoryAdjustmentReason>(initialReasonCode ?? 'EXPIRED');
  const [quantityText, setQuantityText] = useState('1');
  const [groupId, setGroupId] = useState<string | null>(initialGroupId ?? null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const initialFocusHandledRef = useRef(false);

  const selectedProduct = state.products.find((product) => product.storeProductId === selectedProductId) ?? state.products[0] ?? null;
  const positiveGroups = state.projection?.groups.filter((group) => BigInt(group.balanceBaseMicros) > 0n) ?? [];
  const unknownResidual = state.projection ? BigInt(state.projection.unknownResidualBaseMicros) : 0n;
  const reasonAllowsAdd = reasonCode === 'CORRECTION' || reasonCode === 'CUSTOMER_RETURN';
  const dirty = !saved && (quantityText !== '1' || note.trim().length > 0 || groupId !== null || direction !== 'REMOVE' || reasonCode !== 'EXPIRED');

  const refresh = useCallback(() => {
    const refreshed = read(client, selectedProductId || storeProductId);
    setState(refreshed);
    if (!selectedProductId && refreshed.products[0]) setSelectedProductId(refreshed.products[0].storeProductId);
  }, [client, selectedProductId, storeProductId]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, () => {
      setQuantityText('1');
      setGroupId(null);
      setNote('');
      setError(null);
      setSaved(false);
    });
  }, [dirty, onDirtyDraftChange]);

  useEffect(() => {
    if (!isFocused) return undefined;
    if (!initialFocusHandledRef.current) {
      initialFocusHandledRef.current = true;
      return undefined;
    }
    const frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [isFocused, refresh]);

  const submit = (): void => {
    if (!selectedProduct || !state.projection || submitting) {
      setError('Choose a product before recording an adjustment.');
      return;
    }
    try {
      const quantityBaseMicros = parseQuantityDecimal(quantityText);
      if (quantityBaseMicros <= 0) throw new Error('Enter a positive adjustment quantity.');
      if (direction === 'REMOVE' && groupId) {
        const group = positiveGroups.find((candidate) => candidate.id === groupId);
        if (!group || BigInt(quantityBaseMicros) > BigInt(group.balanceBaseMicros)) {
          throw new Error('The selected group does not have enough recorded remainder.');
        }
      }
      setSubmitting(true);
      setError(null);
      client.recordAdjustment({
        storeProductId: selectedProduct.storeProductId,
        expectedInventoryWatermark: state.projection.inventoryWatermark,
        expectedBatchWatermark: state.projection.batchWatermark,
        quantityBaseDeltaMicros: direction === 'REMOVE' ? -quantityBaseMicros : quantityBaseMicros,
        groupId,
        reasonCode,
        note,
      });
      setSaved(true);
      refresh();
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Adjustment could not be saved. Your entries are preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const canRecord = useMemo(() => selectedProduct !== null && state.projection !== null, [selectedProduct, state.projection]);

  if (state.failure) {
    return <View style={styles.container}><ErrorPanel title="Adjustments unavailable" message={state.failure} onRetry={refresh} onDismiss={onBack} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Record stock adjustment</Text>
      <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Every change creates an inventory event</StatusNote></Text>
      {state.products.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>No active products</Text><Text style={styles.meta}>Add a product before recording stock changes.</Text></View> : null}
      {state.products.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Product</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {state.products.map((product) => {
              const selected = product.storeProductId === selectedProduct?.storeProductId;
              return <Pressable key={product.storeProductId} accessibilityRole="radio" accessibilityLabel={`Adjust ${product.productName}`} accessibilityState={{ checked: selected }} onPress={() => { setSelectedProductId(product.storeProductId); setGroupId(null); setSaved(false); setError(null); }} style={[styles.packageChip, selected && styles.packageChipSelected]}><Text style={[styles.packageText, selected && styles.packageTextSelected]}>{product.productName}</Text></Pressable>;
            })}
          </View>
          {selectedProduct && state.projection ? <><Text style={styles.meta}>Recorded stock: {quantityLabel(state.projection.inventoryBalanceBaseMicros)}</Text><Text style={styles.meta}>Unknown/unallocated: {quantityLabel(state.projection.unknownResidualBaseMicros)}</Text></> : null}
        </View>
      ) : null}
      {canRecord && !saved ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Change</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            <Pressable accessibilityRole="radio" accessibilityLabel="Remove stock" accessibilityState={{ checked: direction === 'REMOVE' }} onPress={() => { setDirection('REMOVE'); setGroupId(null); }} style={[styles.packageChip, direction === 'REMOVE' && styles.packageChipSelected]}><Text style={[styles.packageText, direction === 'REMOVE' && styles.packageTextSelected]}>Remove stock</Text></Pressable>
            <Pressable accessibilityRole="radio" accessibilityLabel="Add stock" accessibilityState={{ checked: direction === 'ADD', disabled: !reasonAllowsAdd }} disabled={!reasonAllowsAdd} onPress={() => { setDirection('ADD'); setGroupId(null); }} style={[styles.packageChip, direction === 'ADD' && styles.packageChipSelected, !reasonAllowsAdd && styles.packageChipDisabled]}><Text style={[styles.packageText, direction === 'ADD' && styles.packageTextSelected, !reasonAllowsAdd && styles.packageTextDisabled]}>Add stock</Text></Pressable>
          </View>
          <Text style={styles.sectionLabel}>Reason</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {REASONS.map((reason) => <Pressable key={reason.value} accessibilityRole="radio" accessibilityLabel={`Adjustment reason ${reason.label}`} accessibilityState={{ checked: reasonCode === reason.value }} onPress={() => { setReasonCode(reason.value); if (reason.value !== 'CORRECTION' && reason.value !== 'CUSTOMER_RETURN') setDirection('REMOVE'); }} style={[styles.packageChip, reasonCode === reason.value && styles.packageChipSelected]}><Text style={[styles.packageText, reasonCode === reason.value && styles.packageTextSelected]}>{reason.label}</Text></Pressable>)}
          </View>
          <Field label="Base quantity" value={quantityText} onChangeText={setQuantityText} keyboardType="decimal-pad" testID="adjustment-quantity" />
          {direction === 'REMOVE' && positiveGroups.length > 0 ? <>
            <Text style={styles.sectionLabel}>Recorded source (optional)</Text>
            <View style={styles.packageList} accessibilityRole="radiogroup">
              {unknownResidual > 0n ? <Pressable accessibilityRole="radio" accessibilityLabel="Adjust unknown stock" accessibilityState={{ checked: groupId === null }} onPress={() => setGroupId(null)} style={[styles.packageChip, groupId === null && styles.packageChipSelected]}><Text style={[styles.packageText, groupId === null && styles.packageTextSelected]}>Unknown/unallocated</Text></Pressable> : null}
              {positiveGroups.map((group) => <Pressable key={group.id} accessibilityRole="radio" accessibilityLabel={`Adjust group ${group.id}`} accessibilityState={{ checked: groupId === group.id }} onPress={() => setGroupId(group.id)} style={[styles.packageChip, groupId === group.id && styles.packageChipSelected]}><Text style={[styles.packageText, groupId === group.id && styles.packageTextSelected]}>{groupLabel(group)}</Text></Pressable>)}
            </View>
          </> : null}
          <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={500} testID="adjustment-note" />
          <PrimaryButton title={submitting ? 'Saving…' : 'Record adjustment'} onPress={submit} disabled={submitting} />
        </View>
      ) : null}
      {saved ? <View style={styles.card}><Text style={styles.cardTitle}>Adjustment saved</Text><Text style={styles.meta}>Stock, batch explanation, cost coverage, and the pending sync envelope were recorded together.</Text><SecondaryButton title="Record another" onPress={() => { setSaved(false); setQuantityText('1'); setGroupId(null); setNote(''); setError(null); refresh(); }} /></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.generalError}>{error}</Text> : null}
      <SecondaryButton title="Back" onPress={onBack} />
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
  sectionLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  packageList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  packageChip: { minHeight: theme.minTouchTarget, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, paddingHorizontal: theme.spacing(3), justifyContent: 'center', backgroundColor: theme.color.raised },
  packageChipSelected: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  packageChipDisabled: { opacity: 0.5 },
  packageText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  packageTextSelected: { color: theme.color.raised, fontWeight: '600' },
  packageTextDisabled: { color: theme.color.textSecondary },
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
