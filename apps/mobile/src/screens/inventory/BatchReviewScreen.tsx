import { formatQuantityMicros, normalizeBatchDate, parseQuantityDecimal, type BatchDateMeaning, type BatchDatePrecision } from '@retail/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InventoryClient, InventoryReviewProduct } from '../../inventory/client';
import type { BatchProjection } from '../../inventory/batchAllocation';
import type { BatchClassificationMode } from '../../inventory/classifyBatches';
import { generateMobileId } from '../../crypto/mobileIds';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface BatchReviewScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
  isFocused?: boolean;
  storeProductId?: string;
}

interface DraftLine {
  id: string;
  quantityText: string;
  datePrecision: BatchDatePrecision;
  dateValue: string;
  dateMeaning: BatchDateMeaning;
  printedBatchNumber: string;
}

interface ScreenState {
  products: InventoryReviewProduct[];
  projection: BatchProjection | null;
  failure: string | null;
}

function read(client: InventoryClient, storeProductId: string | undefined): ScreenState {
  try {
    const products = client.listReviewProducts();
    const selected = storeProductId && products.some((product) => product.storeProductId === storeProductId)
      ? storeProductId
      : products[0]?.storeProductId;
    return { products, projection: selected ? client.getBatchProjection(selected) : null, failure: null };
  } catch (error) {
    return { products: [], projection: null, failure: error instanceof Error ? error.message : 'Inventory review could not be read.' };
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

function dateLabel(line: Pick<DraftLine, 'datePrecision' | 'dateValue' | 'dateMeaning' | 'printedBatchNumber'>): string {
  const date = line.datePrecision === 'UNKNOWN' ? 'Unknown date' : `${line.dateValue} (${line.datePrecision.toLowerCase()})`;
  const meaning = line.dateMeaning === 'UNSPECIFIED' ? '' : ` · ${line.dateMeaning === 'EXPIRY' ? 'expiry' : 'best before'}`;
  const printed = line.printedBatchNumber.trim() ? ` · batch ${line.printedBatchNumber.trim()}` : '';
  return `${date}${meaning}${printed}`;
}

export default function BatchReviewScreen({ client, onBack, onDirtyDraftChange, isFocused = true, storeProductId }: BatchReviewScreenProps) {
  const [state, setState] = useState(() => read(client, storeProductId));
  const [selectedProductId, setSelectedProductId] = useState(storeProductId ?? '');
  const [quantityText, setQuantityText] = useState('1');
  const [datePrecision, setDatePrecision] = useState<BatchDatePrecision>('UNKNOWN');
  const [dateValue, setDateValue] = useState('');
  const [dateMeaning, setDateMeaning] = useState<BatchDateMeaning>('UNSPECIFIED');
  const [printedBatchNumber, setPrintedBatchNumber] = useState('');
  const [mode, setMode] = useState<BatchClassificationMode>(() => state.projection && BigInt(state.projection.unknownResidualBaseMicros) > 0n ? 'UNKNOWN' : 'CORRECTION');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const initialFocusHandledRef = useRef(false);

  const selectedProduct = state.products.find((product) => product.storeProductId === selectedProductId) ?? state.products[0] ?? null;
  const namedGroups = state.projection?.groups.filter((group) => BigInt(group.balanceBaseMicros) > 0n) ?? [];
  const unknownRemaining = state.projection ? BigInt(state.projection.unknownResidualBaseMicros) : 0n;
  const namedTotal = namedGroups.reduce((total, group) => total + BigInt(group.balanceBaseMicros), 0n);
  const canClassifyUnknown = unknownRemaining > 0n;
  const canCorrectGroups = namedGroups.length > 0;
  const dirty = !saved && lines.length > 0;
  const refresh = useCallback(() => {
    const refreshed = read(client, selectedProductId || storeProductId);
    setState(refreshed);
    if (!selectedProductId && refreshed.products[0]) setSelectedProductId(refreshed.products[0].storeProductId);
  }, [client, selectedProductId, storeProductId]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, () => {
      setLines([]);
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

  const resetEditor = (): void => {
    setQuantityText('1');
    setDatePrecision('UNKNOWN');
    setDateValue('');
    setDateMeaning('UNSPECIFIED');
    setPrintedBatchNumber('');
    setError(null);
  };

  const addLine = (): void => {
    try {
      const quantityBaseMicros = parseQuantityDecimal(quantityText);
      if (quantityBaseMicros <= 0) throw new Error('Enter a positive inspected quantity.');
      const normalized = normalizeBatchDate({ precision: datePrecision, value: dateValue, meaning: dateMeaning, printedBatchNumber });
      if (normalized.precision === 'UNKNOWN') throw new Error('Choose a month or date for an inspected group.');
      setLines((current) => [...current, {
        id: generateMobileId(),
        quantityText: String(quantityBaseMicros),
        datePrecision: normalized.precision,
        dateValue: normalized.value ?? '',
        dateMeaning: normalized.meaning,
        printedBatchNumber: normalized.printedBatchNumber ?? '',
      }]);
      resetEditor();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Review facts are invalid.');
    }
  };

  const removeLine = (id: string): void => setLines((current) => current.filter((line) => line.id !== id));

  const submit = (): void => {
    if (!selectedProduct || !state.projection || lines.length === 0 || submitting) {
      setError('Choose a product and add at least one inspected group.');
      return;
    }
    const requested = lines.reduce((total, line) => total + BigInt(line.quantityText), 0n);
    if (mode === 'UNKNOWN' && (!canClassifyUnknown || requested > unknownRemaining)) {
      setError('Inspected groups cannot exceed the unknown stock remaining.');
      return;
    }
    if (mode === 'CORRECTION' && (!canCorrectGroups || requested !== namedTotal)) {
      setError('A corrected breakdown must exactly replace the current named stock.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      client.classifyBatches({
        storeProductId: selectedProduct.storeProductId,
        expectedInventoryWatermark: state.projection.inventoryWatermark,
        expectedBatchWatermark: state.projection.batchWatermark,
        mode,
        groups: lines.map((line) => ({
          quantityBaseMicros: Number(line.quantityText),
          datePrecision: line.datePrecision,
          dateValue: line.dateValue,
          dateMeaning: line.dateMeaning,
          printedBatchNumber: line.printedBatchNumber,
        })),
      });
      setSaved(true);
      setLines([]);
      refresh();
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Classification could not be saved. Your entries are preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const canReview = useMemo(() => selectedProduct !== null && state.projection !== null && (canClassifyUnknown || canCorrectGroups), [canClassifyUnknown, canCorrectGroups, selectedProduct, state.projection]);

  if (state.failure) {
    return <View style={styles.container}><ErrorPanel title="Inventory review unavailable" message={state.failure} onRetry={refresh} onDismiss={onBack} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Review expiry stock</Text>
      <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Classification changes explanation, not total stock</StatusNote></Text>
      {state.products.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>No active products</Text><Text style={styles.meta}>Add a product before reviewing stock.</Text></View> : null}
      {state.products.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Product</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {state.products.map((product) => {
              const selected = product.storeProductId === selectedProduct?.storeProductId;
              return <Pressable key={product.storeProductId} accessibilityRole="radio" accessibilityLabel={`Review ${product.productName}`} accessibilityState={{ checked: selected }} onPress={() => { setSelectedProductId(product.storeProductId); setMode(BigInt(product.unknownResidualBaseMicros) > 0n ? 'UNKNOWN' : 'CORRECTION'); setLines([]); setSaved(false); setError(null); }} style={[styles.packageChip, selected && styles.packageChipSelected]}><Text style={[styles.packageText, selected && styles.packageTextSelected]}>{product.productName}</Text></Pressable>;
            })}
          </View>
          {selectedProduct && state.projection ? (
            <>
              <Text style={styles.meta}>Recorded stock: {quantityLabel(state.projection.inventoryBalanceBaseMicros)}</Text>
              <Text style={styles.meta}>Unknown remaining: {quantityLabel(state.projection.unknownResidualBaseMicros)}</Text>
              {namedGroups.map((group) => <Text key={group.id} style={styles.meta}>Existing group: {quantityLabel(group.balanceBaseMicros)} · {group.datePrecision === 'UNKNOWN' ? 'unknown date' : `${group.dateValue} (${group.datePrecision.toLowerCase()})`}</Text>)}
            </>
          ) : null}
        </View>
      ) : null}
      {canReview && !saved ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Review mode</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {canClassifyUnknown ? <Pressable accessibilityRole="radio" accessibilityLabel="Classify unknown stock" accessibilityState={{ checked: mode === 'UNKNOWN' }} onPress={() => setMode('UNKNOWN')} style={[styles.packageChip, mode === 'UNKNOWN' && styles.packageChipSelected]}><Text style={[styles.packageText, mode === 'UNKNOWN' && styles.packageTextSelected]}>Classify unknown</Text></Pressable> : null}
            {canCorrectGroups ? <Pressable accessibilityRole="radio" accessibilityLabel="Correct recorded breakdown" accessibilityState={{ checked: mode === 'CORRECTION' }} onPress={() => setMode('CORRECTION')} style={[styles.packageChip, mode === 'CORRECTION' && styles.packageChipSelected]}><Text style={[styles.packageText, mode === 'CORRECTION' && styles.packageTextSelected]}>Correct breakdown</Text></Pressable> : null}
          </View>
          <Text style={styles.meta}>{mode === 'CORRECTION' ? `Enter the complete replacement for ${quantityLabel(namedTotal.toString())} named stock. Previous groups stay in history.` : 'Assign part or all of the unknown stock; any remainder stays unknown.'}</Text>
          <Text style={styles.sectionLabel}>Inspected group</Text>
          <Field label="Observed base quantity" value={quantityText} onChangeText={setQuantityText} keyboardType="decimal-pad" testID="batch-review-quantity" />
          <Text style={styles.sectionLabel}>Printed date precision</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {([['UNKNOWN', 'Unknown'], ['MONTH', 'Month'], ['DAY', 'Date']] as const).map(([option, label]) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Review date ${label.toLowerCase()}`} accessibilityState={{ checked: datePrecision === option }} onPress={() => setDatePrecision(option)} style={[styles.packageChip, datePrecision === option && styles.packageChipSelected]}><Text style={[styles.packageText, datePrecision === option && styles.packageTextSelected]}>{label}</Text></Pressable>)}
          </View>
          {datePrecision !== 'UNKNOWN' ? <Field label={datePrecision === 'MONTH' ? 'Printed month (YYYY-MM)' : 'Printed date (YYYY-MM-DD)'} placeholder={datePrecision === 'MONTH' ? 'YYYY-MM' : 'YYYY-MM-DD'} value={dateValue} onChangeText={setDateValue} testID="batch-review-date" /> : null}
          <Text style={styles.sectionLabel}>Date meaning</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {([['UNSPECIFIED', 'Unspecified'], ['EXPIRY', 'Expiry'], ['BEST_BEFORE', 'Best before']] as const).map(([option, label]) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Review meaning ${label.toLowerCase()}`} accessibilityState={{ checked: dateMeaning === option }} onPress={() => setDateMeaning(option)} style={[styles.packageChip, dateMeaning === option && styles.packageChipSelected]}><Text style={[styles.packageText, dateMeaning === option && styles.packageTextSelected]}>{label}</Text></Pressable>)}
          </View>
          <Field label="Printed batch number (optional)" value={printedBatchNumber} onChangeText={setPrintedBatchNumber} maxLength={128} testID="batch-review-number" />
          <PrimaryButton title="Add inspected group" onPress={addLine} disabled={submitting} />
        </View>
      ) : null}
      {lines.length > 0 ? <View style={styles.card}><Text style={styles.sectionLabel}>Pending classification ({lines.length})</Text>{lines.map((line) => <View key={line.id} style={styles.historyRow}><View style={styles.rowBetween}><Text style={styles.cardTitle}>{quantityLabel(line.quantityText)} · {dateLabel(line)}</Text><SecondaryButton title="Remove" onPress={() => removeLine(line.id)} /></View></View>)}<PrimaryButton title={submitting ? 'Saving…' : mode === 'CORRECTION' ? 'Save corrected breakdown' : 'Classify inspected stock'} onPress={submit} disabled={submitting} /></View> : null}
      {saved ? <View style={styles.card}><Text style={styles.cardTitle}>Classification saved</Text><Text style={styles.meta}>The product total and cost were not changed. Reopen review to inspect the remaining unknown stock.</Text><SecondaryButton title="Review another product" onPress={() => { setSaved(false); refresh(); }} /></View> : null}
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
  packageText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  packageTextSelected: { color: theme.color.raised, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(2) },
  historyRow: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
